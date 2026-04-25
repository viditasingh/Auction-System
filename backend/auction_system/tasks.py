from celery import shared_task
from django.utils import timezone
from django.db.models import Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

from .models import RFQ, Auction, Bid, AuctionEvent, ExtensionHistory

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def evaluate_auction_extension(self, rfq_id, bid_id):
    """
    Evaluate if auction should be extended when a new bid is received.
    This is the core business logic for auction extension.
    """
    try:
        rfq = RFQ.objects.get(id=rfq_id)
        bid = Bid.objects.get(id=bid_id)
        auction = rfq.auction

        current_time = timezone.now()

        # Initialize current_close_time if not set
        if auction.current_close_time is None:
            auction.current_close_time = rfq.bid_close_time

        # Check if within trigger window
        if not auction.should_extend(current_time):
            logger.info(f"Bid {bid_id} not in trigger window for {rfq_id}")
            return {'extended': False, 'reason': 'not_in_trigger_window'}

        # Determine trigger reason based on auction configuration
        trigger_reason = None
        should_extend = False

        if auction.trigger_type == 'bid':
            # Extend on any bid in trigger window
            trigger_reason = 'bid'
            should_extend = True

        elif auction.trigger_type == 'rank_change':
            # Check if bid caused any rank change
            if bid_caused_rank_change(rfq, bid):
                trigger_reason = 'rank_change'
                should_extend = True

        elif auction.trigger_type == 'l1_change':
            # Check if bid changed the L1 (lowest bidder)
            if bid_changed_l1(rfq, bid):
                trigger_reason = 'l1_change'
                should_extend = True

        if should_extend and auction.can_extend():
            # Perform the extension
            old_close_time = auction.current_close_time
            new_close_time = old_close_time + timezone.timedelta(
                minutes=auction.extension_duration_mins
            )

            # Ensure we don't exceed forced close time
            if new_close_time > rfq.forced_close_time:
                new_close_time = rfq.forced_close_time

            auction.current_close_time = new_close_time
            auction.last_extension_at = current_time
            auction.extension_count += 1
            auction.save()

            # Create extension history record
            ext_history = ExtensionHistory.objects.create(
                rfq=rfq,
                prev_close_time=old_close_time,
                new_close_time=new_close_time,
                trigger_reason=trigger_reason,
                trigger_bid=bid,
                duration_mins=auction.extension_duration_mins
            )

            # Create event log
            AuctionEvent.objects.create(
                rfq=rfq,
                event_type='extended',
                bid=bid,
                description=f"Auction extended by {auction.extension_duration_mins} minutes due to {trigger_reason}",
                metadata={
                    'old_close_time': old_close_time.isoformat(),
                    'new_close_time': new_close_time.isoformat(),
                    'trigger_reason': trigger_reason,
                    'extension_id': str(ext_history.id)
                }
            )

            # Broadcast extension event via WebSocket
            broadcast_auction_update(rfq_id, {
                'type': 'auction_extended',
                'old_close_time': old_close_time.isoformat(),
                'new_close_time': new_close_time.isoformat(),
                'trigger_reason': trigger_reason,
                'extension_count': auction.extension_count
            })

            logger.info(f"Auction {rfq_id} extended due to {trigger_reason}")
            return {
                'extended': True,
                'reason': trigger_reason,
                'old_close_time': old_close_time.isoformat(),
                'new_close_time': new_close_time.isoformat()
            }

        return {
            'extended': False,
            'reason': 'trigger_not_met' if not should_extend else 'cannot_extend'
        }

    except RFQ.DoesNotExist:
        logger.error(f"RFQ {rfq_id} not found")
        return {'error': 'RFQ not found'}
    except Exception as exc:
        logger.error(f"Error evaluating auction extension: {exc}")
        raise self.retry(exc=exc, countdown=5)


@shared_task(bind=True, max_retries=3)
def update_bid_rankings(self, rfq_id):
    """
    Update bid rankings based on total charges.
    Should be called after each new bid.
    """
    try:
        rfq = RFQ.objects.get(id=rfq_id)

        # Get all bids sorted by total_charges
        bids = rfq.bids.order_by('total_charges')

        previous_l1 = None
        for idx, bid in enumerate(bids, 1):
            old_rank = bid.rank
            bid.rank = idx
            bid.save(update_fields=['rank'])

            if idx == 1 and previous_l1 is None:
                previous_l1 = bid

        # Broadcast ranking update
        broadcast_auction_update(rfq_id, {
            'type': 'rankings_updated',
            'bids': list(bids.values('id', 'rank', 'total_charges'))
        })

        logger.info(f"Rankings updated for RFQ {rfq_id}")
        return {'status': 'success', 'bid_count': bids.count()}

    except RFQ.DoesNotExist:
        logger.error(f"RFQ {rfq_id} not found")
        return {'error': 'RFQ not found'}
    except Exception as exc:
        logger.error(f"Error updating bid rankings: {exc}")
        raise self.retry(exc=exc, countdown=5)


@shared_task(bind=True, max_retries=3)
def check_and_close_auction(self, rfq_id):
    """
    Check if auction should be closed based on current time.
    Should be called periodically by Celery Beat.
    """
    try:
        rfq = RFQ.objects.get(id=rfq_id)
        auction = rfq.auction
        current_time = timezone.now()

        if rfq.status not in ['active', 'draft']:
            return {'status': 'already_closed'}

        # Determine close reason
        if auction.current_close_time is None:
            auction.current_close_time = rfq.bid_close_time

        if current_time >= rfq.forced_close_time:
            # Force close
            rfq.status = 'force_closed'
            close_reason = 'force_closed'
            event_type = 'force_closed'

        elif current_time >= auction.current_close_time:
            # Normal close
            rfq.status = 'closed'
            close_reason = 'closed'
            event_type = 'closed'

        else:
            return {'status': 'not_time_yet'}

        rfq.save()

        # Create closing event
        AuctionEvent.objects.create(
            rfq=rfq,
            event_type=event_type,
            description=f"Auction {close_reason}",
            metadata={'closed_at': current_time.isoformat()}
        )

        # Broadcast closure
        broadcast_auction_update(rfq_id, {
            'type': 'auction_closed',
            'reason': close_reason,
            'closed_at': current_time.isoformat()
        })

        logger.info(f"Auction {rfq_id} {close_reason}")
        return {'status': close_reason}

    except RFQ.DoesNotExist:
        logger.error(f"RFQ {rfq_id} not found")
        return {'error': 'RFQ not found'}
    except Exception as exc:
        logger.error(f"Error checking auction closure: {exc}")
        raise self.retry(exc=exc, countdown=5)


def bid_caused_rank_change(rfq, new_bid):
    """Check if new bid caused any rank change"""
    old_bids = rfq.bids.exclude(id=new_bid.id).order_by('total_charges')

    # Check if new bid would change any existing bid's rank
    for idx, bid in enumerate(old_bids, 1):
        if new_bid.total_charges < bid.total_charges:
            # New bid is cheaper, so it will change rankings
            return True

    return len(old_bids) > 0  # New bid changes the ranking if there are existing bids


def bid_changed_l1(rfq, new_bid):
    """Check if new bid changed the L1 (lowest bidder)"""
    current_l1 = rfq.bids.exclude(id=new_bid.id).order_by('total_charges').first()

    if current_l1 is None:
        # No existing bids, so new bid is L1
        return True

    # Check if new bid is cheaper than current L1
    return new_bid.total_charges < current_l1.total_charges


def broadcast_auction_update(rfq_id, message):
    """Broadcast auction update to all connected WebSocket clients"""
    try:
        channel_layer = get_channel_layer()
        group_name = f'auction_{rfq_id}'

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'auction_message',
                'message': message
            }
        )
    except Exception as e:
        logger.error(f"Error broadcasting update: {e}")
