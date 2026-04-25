from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/auction/(?P<rfq_id>[0-9a-f-]+)/$', consumers.AuctionConsumer.as_asgi()),
    re_path(r'ws/auction-activity/$', consumers.AuctionActivityConsumer.as_asgi()),
]
