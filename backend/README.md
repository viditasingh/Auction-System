# British Auction RFQ System

## Backend Setup

### Prerequisites

- Python 3.9+
- PostgreSQL
- Redis

### Installation

1. **Create and activate virtual environment:**

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**

```bash
pip install -r requirements.txt
```

3. **Create .env file:**

```bash
cp .env.example .env
# Update .env with your database and Redis credentials
```

4. **Run migrations:**

```bash
python manage.py migrate
```

5. **Create superuser:**

```bash
python manage.py createsuperuser
```

6. **Start the development server:**

```bash
python manage.py runserver
```

### Running Celery

In a new terminal:

```bash
celery -A config worker -l info
```

To run Celery Beat (for periodic tasks):

```bash
celery -A config beat -l info
```

### Running with Daphne (Django Channels)

```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

## Frontend Setup

See `frontend/README.md` for frontend setup instructions.

## API Documentation

Base URL: `http://localhost:8000/api/`

### Endpoints

#### RFQs

- `GET /rfqs/` - List all RFQs
- `POST /rfqs/` - Create new RFQ
- `GET /rfqs/{id}/` - Get RFQ details
- `PUT /rfqs/{id}/` - Update RFQ
- `DELETE /rfqs/{id}/` - Delete RFQ
- `POST /rfqs/{id}/activate/` - Activate RFQ
- `POST /rfqs/{id}/close/` - Close RFQ
- `GET /rfqs/{id}/bids/` - Get all bids for RFQ
- `GET /rfqs/{id}/events/` - Get auction events
- `GET /rfqs/{id}/extension-history/` - Get extension history
- `GET /rfqs/{id}/statistics/` - Get auction statistics

#### Bids

- `GET /bids/` - List all bids
- `POST /bids/` - Submit new bid
- `GET /bids/{id}/` - Get bid details

#### Events

- `GET /events/` - List auction events

#### Extension History

- `GET /extension-history/` - List extension history

## WebSocket Connections

### Auction Updates

```
ws://localhost:8000/ws/auction/{rfq_id}/
```

### Auction Activity Feed

```
ws://localhost:8000/ws/auction-activity/
```

## Database Schema

See `docs/schema.md` for detailed database schema.

## Architecture

See `docs/architecture.md` for system architecture overview.
