from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RFQViewSet, BidViewSet, AuctionEventViewSet,
    ExtensionHistoryViewSet
)

router = DefaultRouter()
router.register(r'rfqs', RFQViewSet, basename='rfq')
router.register(r'bids', BidViewSet, basename='bid')
router.register(r'events', AuctionEventViewSet, basename='event')
router.register(r'extension-history', ExtensionHistoryViewSet, basename='extension-history')

app_name = 'auction_system'

urlpatterns = [
    path('', include(router.urls)),
]
