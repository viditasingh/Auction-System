from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import json
import logging

logger = logging.getLogger(__name__)


class AuctionConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time auction updates.
    Clients can join an auction group to receive live updates.
    """

    async def connect(self):
        """Handle WebSocket connection"""
        self.user = self.scope["user"]
        self.rfq_id = self.scope['url_route']['kwargs'].get('rfq_id')

        if not self.rfq_id:
            await self.close()
            return

        # Verify user has access to this RFQ
        has_access = await self.verify_rfq_access()
        if not has_access:
            await self.close()
            return

        self.group_name = f'auction_{self.rfq_id}'

        # Join the auction group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"User {self.user} connected to auction {self.rfq_id}")

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
        logger.info(f"User {self.user} disconnected from auction {self.rfq_id}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'ping':
                # Respond to ping to keep connection alive
                await self.send(text_data=json.dumps({'type': 'pong'}))

            elif message_type == 'subscribe':
                # Client requesting subscription to updates
                await self.send(text_data=json.dumps({
                    'type': 'subscribed',
                    'rfq_id': str(self.rfq_id),
                    'message': 'Successfully subscribed to auction updates'
                }))

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
        except Exception as e:
            logger.error(f"Error in receive: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))

    async def auction_message(self, event):
        """
        Receive message from auction group and forward to WebSocket.
        This is triggered by group_send calls.
        """
        message = event['message']
        await self.send(text_data=json.dumps(message))

    @database_sync_to_async
    def verify_rfq_access(self):
        """Verify user has access to view this RFQ"""
        from .models import RFQ
        try:
            rfq = RFQ.objects.get(id=self.rfq_id)
            # Allow access if user created the RFQ or is a superuser
            return self.user.is_superuser or self.user == rfq.created_by or self.user.is_authenticated
        except RFQ.DoesNotExist:
            return False


class AuctionActivityConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time auction activity (bids, extensions, etc).
    Provides live feed of auction events.
    """

    async def connect(self):
        """Handle WebSocket connection"""
        self.user = self.scope["user"]
        self.group_name = 'auction_activity'

        # Join the global auction activity group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"User {self.user} connected to auction activity feed")

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        logger.info(f"User {self.user} disconnected from auction activity feed")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)

            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))

    async def activity_message(self, event):
        """Receive activity message from group"""
        message = event['message']
        await self.send(text_data=json.dumps(message))
