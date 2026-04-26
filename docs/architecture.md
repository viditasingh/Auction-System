# System Architecture

## High-Level Overview

The British Auction RFQ system is a four-tier distributed application:

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                         │
│              - Auction listing & details views                   │
│              - RFQ creation form                                 │
│              - Real-time WebSocket updates                       │
└────────────────┬──────────────────────────────────┬──────────────┘
                 │ HTTP (REST API)                  │ WebSocket
                 ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│            Django REST + Django Channels Layer                   │
│  ┌──────────────────┐          ┌──────────────────┐              │
│  │  REST Endpoints  │          │  WebSocket       │              │
│  │  - CRUD ops      │          │  Consumers       │              │
│  │  - Validation    │          │  - Auction       │              │
│  │  - Pagination    │          │  - Activity Feed │              │
│  └──────────────────┘          └──────────────────┘              │
│          │                              │                        │
│          └──────────────┬───────────────┘                        │
│                         │                                        │
│                  Triggers Celery Tasks                           │
└─────────────────┬───────────────────────────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    ▼                           ▼
┌──────────────────────┐   ┌──────────────────────┐
│  Celery Worker Pool  │   │   Django ORM         │
│                      │   │  (Synchronous Read)  │
│ - evaluate_auction   │   └──────────┬───────────┘
│ - update_rankings    │              │
│ - check_and_close    │              ▼
│                      │   ┌──────────────────────┐
│ Broadcasts via       │   │   PostgreSQL         │
│ Channel Layer        │   │   Primary Datastore  │
└──────────┬───────────┘   └──────────────────────┘
           │
           ▼
    ┌──────────────────────┐
    │   Redis              │
    │ - Celery Broker      │
    │ - Channel Layer      │
    │ - Cache              │
    └──────────────────────┘
```

## Component Breakdown

### 1. Frontend (React + Vite)

**Role**: User interface for auction management

**Key Pages**:

- `AuctionListPage`: Browse all RFQs with status filtering
- `AuctionDetailPage`: View auction details, bids, events, extensions
- `CreateRFQPage`: Create new RFQ with auction configuration
- `Navbar`: Navigation and branding

**Features**:

- Real-time updates via WebSocket
- Responsive design (mobile-first)
- Status filtering and search
- Auction statistics dashboard

**Technology Stack**:

- React 18 (functional components, hooks)
- React Router v6 (client-side routing)
- Axios (HTTP client)
- Tailwind CSS (utility-first styling)
- Lucide React (icons)
- date-fns (date formatting)

### 2. Django REST API Layer

**Role**: Business logic and data management

**Components**:

#### ViewSets (CRUD Operations)

- `RFQViewSet`: RFQ management (create, list, detail, activate, close)
- `BidViewSet`: Bid submission and listing
- `AuctionEventViewSet`: Event log (read-only)
- `ExtensionHistoryViewSet`: Extension tracking (read-only)

#### Serializers (Data Validation & Transformation)

- `RFQCreateSerializer`: Validates RFQ timing constraints
- `BidCreateSerializer`: Validates bid submission timing
- `RFQListSerializer`: Simplified RFQ listing view
- `RFQDetailSerializer`: Full RFQ with related data

#### Key Endpoints:

```
POST   /api/rfqs/                    - Create new RFQ
GET    /api/rfqs/                    - List all RFQs
GET    /api/rfqs/{id}/               - Get RFQ details
POST   /api/rfqs/{id}/activate/      - Activate RFQ
POST   /api/rfqs/{id}/close/         - Close RFQ
GET    /api/rfqs/{id}/statistics/    - Get statistics

POST   /api/bids/                    - Submit new bid
GET    /api/bids/                    - List bids
```

### 3. Celery Task Worker

**Role**: Asynchronous auction extension logic (CORE BUSINESS LOGIC)

**Key Tasks**:

#### `evaluate_auction_extension(rfq_id, bid_id)`

The heart of the system - evaluates if a new bid triggers auction extension.

```
Logic Flow:
1. Get RFQ and its auction config
2. Check if bid is within trigger window
3. Based on trigger_type, determine if extension should happen:
   - 'bid': Any bid in window = extend
   - 'rank_change': Bid causes rank change = extend
   - 'l1_change': Bid becomes new L1 = extend
4. If should extend:
   - Calculate new close time
   - Ensure it doesn't exceed forced_close_time
   - Update auction.current_close_time
   - Create ExtensionHistory record
   - Create AuctionEvent
   - Broadcast via WebSocket
5. Return result with extension details
```

#### `update_bid_rankings(rfq_id)`

Recomputes ranking for all bids in an RFQ (based on total_charges ascending).

#### `check_and_close_auction(rfq_id)`

Periodic task (runs via Celery Beat) to check if auctions should close.

**Retry Strategy**: All tasks retry up to 3 times on failure with exponential backoff

**Broadcasting**: Uses `broadcast_auction_update()` helper to send WebSocket messages

### 4. Django Channels (WebSocket)

**Role**: Real-time bidirectional communication

**Consumers**:

#### `AuctionConsumer`

- Route: `ws://localhost:8000/ws/auction/{rfq_id}/`
- Purpose: Real-time updates for specific auction
- Events: bid_received, extended, closed, rankings_updated
- Authentication: Required

#### `AuctionActivityConsumer`

- Route: `ws://localhost:8000/ws/auction-activity/`
- Purpose: Global activity feed for all auctions
- Events: All auction activity across system
- Authentication: Required

**Broadcasting**:

```python
channel_layer.group_send(
    f'auction_{rfq_id}',
    {
        'type': 'auction_message',
        'message': {...}
    }
)
```

### 5. Database Layer (PostgreSQL)

**Role**: Persistent data storage

**Key Tables**:

- `rfq`: RFQ definition and status
- `auction`: Auction configuration and state
- `bid`: Supplier bids with ranking
- `auction_event`: Activity audit log
- `extension_history`: Extension tracking

**Indexing Strategy**:

- Composite indexes on frequently filtered/sorted columns
- UNIQUE index on `rfq.reference_id`
- BTREE index on `bid.total_charges` for rapid L1 lookups

### 6. Redis

**Role**: In-memory data store with dual purpose

**Uses**:

- **Celery Broker**: Task queue for async job execution
- **Channel Layer**: Real-time message broadcasting for WebSocket
- **Optional Cache**: Session storage and cache

**Configuration**:

```python
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/1'
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': { 'hosts': [('localhost', 6379)] }
    }
}
```

## Data Flow: Bid Submission & Extension

### Sequence Diagram

```
Client (Frontend)
   │
   ├─ POST /api/bids/ (new bid)
   │
   └──→ Django REST API (BidViewSet.create)
        │
        ├─ Validate bid (timing, charges)
        ├─ Create Bid in DB
        ├─ Create AuctionEvent (bid_received)
        │
        ├─ Trigger Celery Task 1: update_bid_rankings(rfq_id)
        │    └─ Update Bid.rank for all bids
        │    └─ Broadcast: rankings_updated
        │
        ├─ Trigger Celery Task 2: evaluate_auction_extension(rfq_id, bid_id)
        │    ├─ Check if bid in trigger_window
        │    ├─ Evaluate trigger condition based on trigger_type
        │    │
        │    ├─ IF triggered:
        │    │    ├─ Update Auction.current_close_time
        │    │    ├─ Create ExtensionHistory
        │    │    ├─ Create AuctionEvent (extended)
        │    │    └─ Broadcast: auction_extended (via Channel Layer)
        │    │         │
        │    │         └──→ Connected WebSocket Clients
        │    │              (render extension notification)
        │    │
        │    └─ ELSE: Return (not_triggered)
        │
        └─ Return 201 Created + BidSerializer

Real-time Updates (WebSocket):
   Connected clients on ws://localhost:8000/ws/auction/{rfq_id}/
   receive auction_extended message with:
   - old_close_time
   - new_close_time
   - trigger_reason
   - extension_count
```

## Error Handling & Resilience

### At API Boundary

- Request validation (timing, charges constraints)
- User permission checks
- Rate limiting (potential)

### In Celery Tasks

- Try-catch all external operations
- Task retries with exponential backoff (max 3)
- Dead letter queue for persistent failures
- Comprehensive logging

### WebSocket

- Graceful disconnect handling
- Automatic reconnection attempts (client-side)
- Message acknowledgment

## Deployment Architecture

### Development

```
Single Server:
- Django dev server (port 8000)
- Vite dev server (port 5173)
- PostgreSQL
- Redis
- Celery worker (same process or separate)
```

### Production

```
Multiple Servers:
┌──────────────┐
│  Load        │
│  Balancer    │
└────┬─────┬──┘
     │     │
     ▼     ▼
┌─────────────────┐
│ Django/Daphne   │ × N instances
│ (ASGI)          │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────────────┐  ┌──────────────┐
│ PostgreSQL   │  │ Redis Cluster │
│ (Primary +   │  │ (Replicated)  │
│  Replicas)   │  └──────────────┘
└──────────────┘

Separate:
┌──────────────────┐
│ Celery Workers   │ × M workers
│ (Beat Scheduler) │
└──────────────────┘

┌──────────────────┐
│ Static Files     │
│ (CDN / S3)       │
└──────────────────┘
```

## Performance Considerations

### Database

- Indexes on filter/sort columns
- Connection pooling
- Read replicas for reporting

### Celery

- Worker process pool matching CPU cores
- Task routing for different priority levels
- Dead letter queue monitoring

### WebSocket

- Connection limits per server
- Message batching for bulk updates
- Heartbeat/ping-pong to detect stale connections

### Frontend

- Code splitting and lazy loading
- Asset minification and caching
- Efficient re-rendering with React hooks
- Debouncing search/filter inputs

## Security

### Authentication

- Django session-based or JWT tokens
- CORS configuration for frontend origin
- CSRF protection on state-changing endpoints

### Authorization

- Object-level permissions (RFQ creator can modify)
- View-level permission checks
- Safe defaults (deny unless explicitly allowed)

### Data Validation

- Serializer validation on all inputs
- Type checking and constraint validation
- SQL injection prevention via ORM

### WebSocket Security

- Authenticated connections only
- Message validation
- Rate limiting on message frequency
