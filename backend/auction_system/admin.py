from django.contrib import admin
from .models import RFQ, Auction, Bid, AuctionEvent, ExtensionHistory


@admin.register(RFQ)
class RFQAdmin(admin.ModelAdmin):
    list_display = ['reference_id', 'name', 'status', 'bid_close_time', 'forced_close_time', 'created_at']
    list_filter = ['status', 'created_at', 'bid_close_time']
    search_fields = ['reference_id', 'name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'reference_id', 'name', 'created_by')
        }),
        ('Timing', {
            'fields': ('bid_start_time', 'bid_close_time', 'forced_close_time', 'pickup_date')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Auction)
class AuctionAdmin(admin.ModelAdmin):
    list_display = ['rfq', 'trigger_type', 'trigger_window_mins', 'extension_duration_mins', 'extension_count']
    list_filter = ['trigger_type', 'created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('RFQ', {
            'fields': ('rfq',)
        }),
        ('Extension Configuration', {
            'fields': ('trigger_type', 'trigger_window_mins', 'extension_duration_mins')
        }),
        ('Current State', {
            'fields': ('current_close_time', 'last_extension_at', 'extension_count')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ['rfq', 'supplier', 'carrier_name', 'total_charges', 'rank', 'created_at']
    list_filter = ['rfq', 'supplier', 'created_at']
    search_fields = ['rfq__reference_id', 'supplier__username', 'carrier_name']
    readonly_fields = ['id', 'total_charges', 'rank', 'created_at', 'updated_at']
    fieldsets = (
        ('RFQ & Supplier', {
            'fields': ('rfq', 'supplier', 'rank')
        }),
        ('Bid Details', {
            'fields': ('carrier_name', 'freight_charges', 'origin_charges', 'destination_charges', 'total_charges')
        }),
        ('Quote Terms', {
            'fields': ('transit_time_days', 'quote_validity_days')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(AuctionEvent)
class AuctionEventAdmin(admin.ModelAdmin):
    list_display = ['rfq', 'event_type', 'bid', 'created_at']
    list_filter = ['event_type', 'rfq', 'created_at']
    search_fields = ['rfq__reference_id', 'description']
    readonly_fields = ['id', 'created_at']
    fieldsets = (
        ('Event Info', {
            'fields': ('rfq', 'event_type', 'bid')
        }),
        ('Details', {
            'fields': ('description', 'metadata')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ExtensionHistory)
class ExtensionHistoryAdmin(admin.ModelAdmin):
    list_display = ['rfq', 'trigger_reason', 'duration_mins', 'prev_close_time', 'new_close_time', 'extended_at']
    list_filter = ['trigger_reason', 'rfq', 'extended_at']
    search_fields = ['rfq__reference_id']
    readonly_fields = ['id', 'extended_at']
    fieldsets = (
        ('RFQ & Trigger', {
            'fields': ('rfq', 'trigger_reason', 'trigger_bid')
        }),
        ('Extension Details', {
            'fields': ('prev_close_time', 'new_close_time', 'duration_mins')
        }),
        ('Metadata', {
            'fields': ('id', 'extended_at'),
            'classes': ('collapse',)
        }),
    )
