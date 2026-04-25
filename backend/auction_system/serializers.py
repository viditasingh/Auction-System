from rest_framework import serializers
from django.utils import timezone
from .models import RFQ, Auction, Bid, AuctionEvent, ExtensionHistory


class AuctionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Auction
        fields = [
            'id', 'rfq', 'trigger_window_mins', 'extension_duration_mins',
            'trigger_type', 'current_close_time', 'last_extension_at',
            'extension_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_close_time', 'extension_count']


class BidSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.get_full_name', read_only=True)

    class Meta:
        model = Bid
        fields = [
            'id', 'rfq', 'supplier', 'supplier_name', 'carrier_name',
            'freight_charges', 'origin_charges', 'destination_charges',
            'total_charges', 'transit_time_days', 'quote_validity_days',
            'rank', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_charges', 'rank', 'created_at', 'updated_at']


class AuctionEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuctionEvent
        fields = [
            'id', 'rfq', 'event_type', 'bid', 'description',
            'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ExtensionHistorySerializer(serializers.ModelSerializer):
    trigger_bid_details = BidSerializer(source='trigger_bid', read_only=True)

    class Meta:
        model = ExtensionHistory
        fields = [
            'id', 'rfq', 'prev_close_time', 'new_close_time',
            'trigger_reason', 'trigger_bid', 'trigger_bid_details',
            'extended_at', 'duration_mins'
        ]
        read_only_fields = ['id', 'extended_at']


class RFQListSerializer(serializers.ModelSerializer):
    """Simplified serializer for RFQ listing"""
    lowest_bid = serializers.SerializerMethodField()
    auction_config = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = RFQ
        fields = [
            'id', 'reference_id', 'name', 'status', 'status_display',
            'bid_start_time', 'bid_close_time', 'forced_close_time',
            'lowest_bid', 'auction_config', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_lowest_bid(self, obj):
        """Get the lowest bid for this RFQ"""
        lowest = obj.bids.order_by('total_charges').first()
        if lowest:
            return BidSerializer(lowest).data
        return None

    def get_auction_config(self, obj):
        """Get auction configuration if exists"""
        if hasattr(obj, 'auction'):
            return AuctionSerializer(obj.auction).data
        return None


class RFQDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for RFQ with all related data"""
    bids = BidSerializer(many=True, read_only=True)
    auction = AuctionSerializer(read_only=True)
    events = AuctionEventSerializer(many=True, read_only=True)
    extension_history = ExtensionHistorySerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = RFQ
        fields = [
            'id', 'reference_id', 'name', 'created_by', 'created_by_name',
            'bid_start_time', 'bid_close_time', 'forced_close_time',
            'pickup_date', 'status', 'status_display', 'auction', 'bids',
            'events', 'extension_history', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RFQCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new RFQ with auction config"""
    trigger_window_mins = serializers.IntegerField(default=10, min_value=1)
    extension_duration_mins = serializers.IntegerField(default=5, min_value=1)
    trigger_type = serializers.ChoiceField(choices=Auction.TRIGGER_TYPE_CHOICES, default='bid')

    class Meta:
        model = RFQ
        fields = [
            'reference_id', 'name', 'bid_start_time', 'bid_close_time',
            'forced_close_time', 'pickup_date', 'trigger_window_mins',
            'extension_duration_mins', 'trigger_type'
        ]

    def validate(self, data):
        """Validate RFQ timing constraints"""
        bid_close = data['bid_close_time']
        forced_close = data['forced_close_time']
        bid_start = data['bid_start_time']

        if bid_close >= forced_close:
            raise serializers.ValidationError(
                "Forced close time must be after bid close time"
            )
        if bid_start >= bid_close:
            raise serializers.ValidationError(
                "Bid close time must be after bid start time"
            )

        return data

    def create(self, validated_data):
        """Create RFQ with associated auction config"""
        trigger_window = validated_data.pop('trigger_window_mins')
        extension_duration = validated_data.pop('extension_duration_mins')
        trigger_type = validated_data.pop('trigger_type')
        # Set a default user or None for now
        if self.context['request'].user and self.context['request'].user.is_authenticated:
            validated_data['created_by'] = self.context['request'].user
        else:
            validated_data['created_by'] = None  # Or get a default user

        rfq = RFQ.objects.create(**validated_data)

        # Create associated auction configuration
        Auction.objects.create(
            rfq=rfq,
            trigger_window_mins=trigger_window,
            extension_duration_mins=extension_duration,
            trigger_type=trigger_type,
            current_close_time=rfq.bid_close_time
        )

        return rfq


class BidCreateSerializer(serializers.ModelSerializer):
    """Serializer for submitting new bids"""
    supplier_name = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = Bid
        fields = [
            'rfq', 'carrier_name', 'freight_charges', 'origin_charges',
            'destination_charges', 'transit_time_days', 'quote_validity_days',
            'supplier_name'
        ]

    def validate(self, data):
        """Validate bid submission"""
        rfq = data['rfq']
        current_time = timezone.now()

        # Check if RFQ is still active for bidding
        if rfq.status not in ['active']:
            raise serializers.ValidationError(
                "RFQ is not active for bidding"
            )

        # Check if we're within bidding window
        if current_time < rfq.bid_start_time:
            raise serializers.ValidationError(
                "Bidding has not started yet"
            )

        # Get current close time
        auction = rfq.auction if hasattr(rfq, 'auction') else None
        close_time = auction.current_close_time if auction else rfq.bid_close_time

        if current_time > close_time:
            raise serializers.ValidationError(
                "Bidding window has closed"
            )

        # Validate charges are positive
        if data['freight_charges'] < 0 or data['origin_charges'] < 0 or data['destination_charges'] < 0:
            raise serializers.ValidationError(
                "Charges must be positive values"
            )

        return data

    def create(self, validated_data):
        """Create bid and set supplier"""
        from django.contrib.auth.models import User

        # Extract supplier_name from validated_data (not context)
        supplier_name = validated_data.pop('supplier_name', 'Anonymous Bidder')
        username = supplier_name.lower().replace(' ', '_')

        # Get or create user with supplier name
        user, created = User.objects.get_or_create(
            username=username,
            defaults={'first_name': supplier_name.split()[0] if ' ' in supplier_name else supplier_name}
        )

        validated_data['supplier'] = user
        bid = super().create(validated_data)

        # Update rankings for this RFQ immediately
        from .tasks import update_bid_rankings
        update_bid_rankings(str(bid.rfq_id))

        return bid