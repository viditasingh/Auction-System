from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from django_filters.rest_framework import DjangoFilterBackend

from .models import RFQ, Auction, Bid, AuctionEvent, ExtensionHistory
from .serializers import (
    RFQListSerializer, RFQDetailSerializer, RFQCreateSerializer,
    AuctionSerializer, BidSerializer, BidCreateSerializer,
    AuctionEventSerializer, ExtensionHistorySerializer
)
from .tasks import evaluate_auction_extension, update_bid_rankings, check_and_close_auction


class RFQViewSet(viewsets.ModelViewSet):
    """ViewSet for RFQ management"""
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'created_by']
    search_fields = ['reference_id', 'name']
    ordering_fields = ['created_at', 'bid_close_time']
    ordering = ['-created_at']

    def get_queryset(self):
        return RFQ.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return RFQCreateSerializer
        elif self.action == 'retrieve':
            return RFQDetailSerializer
        else:
            return RFQListSerializer

    @action(detail=True, methods=['get'])
    def bids(self, request, pk=None):
        """Get all bids for an RFQ"""
        rfq = self.get_object()
        bids = rfq.bids.all()
        serializer = BidSerializer(bids, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        """Get auction events for an RFQ"""
        rfq = self.get_object()
        events = rfq.events.all()
        serializer = AuctionEventSerializer(events, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def extension_history(self, request, pk=None):
        """Get extension history for an RFQ"""
        rfq = self.get_object()
        history = rfq.extension_history.all()
        serializer = ExtensionHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate an RFQ for bidding"""
        rfq = self.get_object()

        if rfq.status != 'draft':
            return Response(
                {'error': 'RFQ must be in draft status to activate'},
                status=status.HTTP_400_BAD_REQUEST
            )

        rfq.status = 'active'
        rfq.save()

        # Initialize auction current_close_time
        if hasattr(rfq, 'auction'):
            rfq.auction.current_close_time = rfq.bid_close_time
            rfq.auction.save()

        # Update rankings for any existing bids
        if rfq.bids.exists():
            update_bid_rankings(str(rfq.id))

        serializer = self.get_serializer(rfq)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Manually close an RFQ"""
        rfq = self.get_object()

        if rfq.status not in ['active', 'draft']:
            return Response(
                {'error': 'RFQ is already closed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        rfq.status = 'closed'
        rfq.save()

        serializer = self.get_serializer(rfq)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get auction statistics"""
        rfq = self.get_object()
        bids = rfq.bids.all()

        stats = {
            'total_bids': bids.count(),
            'lowest_bid': None,
            'highest_bid': None,
            'average_total_charges': 0,
            'extension_count': 0,
            'total_suppliers': bids.values('supplier').distinct().count(),
        }

        if bids.exists():
            first_bid = bids.first()
            last_bid = bids.last()
            avg = bids.values('total_charges').aggregate(
                avg=models.Avg('total_charges')
            )['avg']

            stats['lowest_bid'] = {
                'id': str(first_bid.id),
                'supplier': first_bid.supplier.get_full_name(),
                'total_charges': float(first_bid.total_charges)
            }
            stats['highest_bid'] = {
                'id': str(last_bid.id),
                'supplier': last_bid.supplier.get_full_name(),
                'total_charges': float(last_bid.total_charges)
            }
            stats['average_total_charges'] = float(avg) if avg else 0

        if hasattr(rfq, 'auction'):
            stats['extension_count'] = rfq.auction.extension_count

        return Response(stats)


class BidViewSet(viewsets.ModelViewSet):
    """ViewSet for Bid management"""
    permission_classes = [AllowAny]
    serializer_class = BidSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['rfq', 'supplier']
    ordering_fields = ['total_charges', 'created_at']
    ordering = ['total_charges', 'created_at']

    def get_queryset(self):
        return Bid.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return BidCreateSerializer
        return BidSerializer

    def create(self, request, *args, **kwargs):
        """Create a new bid with auction extension evaluation"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create the bid (ranking is updated in serializer)
        bid = serializer.save()

        # Evaluate auction extension asynchronously
        evaluate_auction_extension.delay(str(bid.rfq_id), str(bid.id))

        # Create bid event
        AuctionEvent.objects.create(
            rfq=bid.rfq,
            event_type='bid_received',
            bid=bid,
            description=f"Bid received from {bid.supplier.get_full_name() or bid.supplier.username} - ${bid.total_charges}",
            metadata={
                'carrier_name': bid.carrier_name,
                'total_charges': str(bid.total_charges)
            }
        )

        return Response(
            BidSerializer(bid).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        """Update a bid and recalculate rankings if charges changed"""
        response = super().update(request, *args, **kwargs)

        # Recalculate rankings for this RFQ
        bid = self.get_object()
        update_bid_rankings(str(bid.rfq_id))

        return response

    def partial_update(self, request, *args, **kwargs):
        """Partial update a bid and recalculate rankings if charges changed"""
        response = super().partial_update(request, *args, **kwargs)

        # Recalculate rankings for this RFQ
        bid = self.get_object()
        update_bid_rankings(str(bid.rfq_id))

        return response


class AuctionEventViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing auction events (read-only)"""
    permission_classes = [IsAuthenticated]
    serializer_class = AuctionEventSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['rfq', 'event_type']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return AuctionEvent.objects.all()


class ExtensionHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing extension history (read-only)"""
    permission_classes = [IsAuthenticated]
    serializer_class = ExtensionHistorySerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['rfq', 'trigger_reason']
    ordering_fields = ['extended_at']
    ordering = ['-extended_at']

    def get_queryset(self):
        return ExtensionHistory.objects.all()
