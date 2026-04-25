from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator
import uuid

class RFQ(models.Model):
    """Request for Quotation model"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('closed', 'Closed'),
        ('force_closed', 'Force Closed'),
        ('awarded', 'Awarded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_id = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_rfqs')

    bid_start_time = models.DateTimeField()
    bid_close_time = models.DateTimeField()
    forced_close_time = models.DateTimeField()
    pickup_date = models.DateField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rfq'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference_id']),
            models.Index(fields=['status']),
            models.Index(fields=['bid_close_time']),
        ]

    def __str__(self):
        return f"{self.reference_id} - {self.name}"


class Auction(models.Model):
    """British Auction configuration model"""
    TRIGGER_TYPE_CHOICES = [
        ('bid', 'Bid Received'),
        ('rank_change', 'Any Rank Change'),
        ('l1_change', 'L1 Rank Change'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rfq = models.OneToOneField(RFQ, on_delete=models.CASCADE, related_name='auction')

    # Extension configuration
    trigger_window_mins = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1)],
        help_text="Minutes before close time to start monitoring"
    )
    extension_duration_mins = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1)],
        help_text="Minutes to extend auction when triggered"
    )
    trigger_type = models.CharField(
        max_length=20,
        choices=TRIGGER_TYPE_CHOICES,
        default='bid',
        help_text="What type of activity triggers extension"
    )

    # Current state
    current_close_time = models.DateTimeField(null=True, blank=True)
    last_extension_at = models.DateTimeField(null=True, blank=True)
    extension_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'auction'

    def __str__(self):
        return f"Auction for {self.rfq.reference_id}"

    def should_extend(self, current_time):
        """Check if extension conditions are met"""
        if self.current_close_time is None:
            self.current_close_time = self.rfq.bid_close_time

        # Check if within trigger window
        time_to_close = (self.current_close_time - current_time).total_seconds() / 60
        return 0 <= time_to_close <= self.trigger_window_mins

    def can_extend(self):
        """Check if auction can still be extended"""
        if self.current_close_time is None:
            self.current_close_time = self.rfq.bid_close_time

        proposed_close = self.current_close_time + timezone.timedelta(minutes=self.extension_duration_mins)
        return proposed_close <= self.rfq.forced_close_time


class Bid(models.Model):
    """Bid/Quote submitted by suppliers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name='bids')
    supplier = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bids')

    # Bid details
    carrier_name = models.CharField(max_length=255)
    freight_charges = models.DecimalField(max_digits=15, decimal_places=2)
    origin_charges = models.DecimalField(max_digits=15, decimal_places=2)
    destination_charges = models.DecimalField(max_digits=15, decimal_places=2)
    total_charges = models.DecimalField(max_digits=15, decimal_places=2, editable=False)

    transit_time_days = models.IntegerField()
    quote_validity_days = models.IntegerField()

    # Ranking
    rank = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bid'
        ordering = ['total_charges', 'created_at']
        indexes = [
            models.Index(fields=['rfq', '-created_at']),
            models.Index(fields=['supplier']),
            models.Index(fields=['total_charges']),
        ]

    def save(self, *args, **kwargs):
        self.total_charges = self.freight_charges + self.origin_charges + self.destination_charges
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Bid by {self.supplier} for {self.rfq.reference_id} - ${self.total_charges}"


class AuctionEvent(models.Model):
    """Event log for auction activities"""
    EVENT_TYPES = [
        ('bid_received', 'Bid Received'),
        ('rank_changed', 'Rank Changed'),
        ('l1_changed', 'L1 Changed'),
        ('extended', 'Auction Extended'),
        ('closed', 'Auction Closed'),
        ('force_closed', 'Auction Force Closed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES, db_index=True)

    bid = models.ForeignKey(Bid, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'auction_event'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['rfq', '-created_at']),
            models.Index(fields=['event_type']),
        ]

    def __str__(self):
        return f"{self.event_type} - {self.rfq.reference_id}"


class ExtensionHistory(models.Model):
    """Track all auction extensions"""
    TRIGGER_REASONS = [
        ('bid', 'Bid Received in Trigger Window'),
        ('rank_change', 'Rank Change in Trigger Window'),
        ('l1_change', 'L1 Rank Change in Trigger Window'),
        ('manual', 'Manual Extension'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name='extension_history')

    prev_close_time = models.DateTimeField()
    new_close_time = models.DateTimeField()
    trigger_reason = models.CharField(max_length=20, choices=TRIGGER_REASONS)

    trigger_bid = models.ForeignKey(Bid, on_delete=models.SET_NULL, null=True, blank=True)
    extended_at = models.DateTimeField(auto_now_add=True, db_index=True)
    duration_mins = models.IntegerField()

    class Meta:
        db_table = 'extension_history'
        ordering = ['-extended_at']
        indexes = [
            models.Index(fields=['rfq', '-extended_at']),
        ]

    def __str__(self):
        return f"Extension for {self.rfq.reference_id} at {self.extended_at}"
