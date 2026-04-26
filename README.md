# British Auction RFQ System

A comprehensive real-time auction and RFQ (Request for Quotation) management system built with Django backend and React frontend. This platform enables seamless bidding, price discovery, and auction management with live updates.

## Features

### Core Functionality
- **Real-time Auction Management** - Live auction listing with instant updates via WebSocket
- **RFQ Creation & Management** - Create and manage requests for quotation with customizable parameters
- **Bid Submission & Tracking** - Real-time bid history and comprehensive activity logs
- **Extension History Tracking** - Monitor auction extension history and duration changes
- **Auction Statistics** - Detailed analytics and insights for each auction
- **Event Logging** - Complete audit trail of all auction events

### Technical Highlights
- **Responsive Design** - Fully responsive interface optimized for desktop, tablet, and mobile devices
- **Real-time Updates** - WebSocket support via Django Channels for live data synchronization
- **RESTful API** - Complete REST API for seamless backend-frontend integration
- **Asynchronous Tasks** - Celery integration for background job processing and scheduled tasks
- **Modern UI/UX** - Built with React and Tailwind CSS for a clean, intuitive user experience

## Documentation

The docs folder contains comprehensive documentation for the project:

- **Architecture** - System design and component architecture documentation
- **Database Schema** - Detailed database schema and relationships
- **Setup Guide** - Complete setup and deployment instructions


## Project Structure

```
.
├── README.md                 # Main project README
├── backend/                  # Django backend application
│   ├── auction_system/       # Main Django app
│   ├── config/               # Django configuration
│   ├── manage.py             # Django management script
│   └── requirements.txt       # Python dependencies
├── frontend/                 # React + Vite frontend application
│   ├── src/                  # React source code
│   │   ├── api/              # API client
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom React hooks
│   │   └── utils/            # Utility functions
│   ├── package.json          # Node dependencies
│   └── vite.config.js        # Vite configuration
└── docs/                     # Project documentation
```

## Quick Start

### Prerequisites

- **Backend:** Python 3.9+, PostgreSQL, Redis
- **Frontend:** Node.js 16+, npm or yarn

### Backend Setup

See [backend/README.md](backend/README.md) for detailed backend setup instructions.

Quick start:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

### Frontend Setup

See [frontend/README.md](frontend/README.md) for detailed frontend setup instructions.

Quick start:
```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`
The backend API will be available at `http://localhost:8000/api`

## API Overview

The backend provides a comprehensive REST API for auction management:

### Main Endpoints

**RFQs**
- `GET /api/rfqs/` - List all RFQs
- `POST /api/rfqs/` - Create new RFQ
- `GET /api/rfqs/{id}/` - Get RFQ details
- `PUT /api/rfqs/{id}/` - Update RFQ
- `DELETE /api/rfqs/{id}/` - Delete RFQ
- `POST /api/rfqs/{id}/activate/` - Activate RFQ
- `POST /api/rfqs/{id}/close/` - Close RFQ
- `GET /api/rfqs/{id}/bids/` - Get all bids for RFQ
- `GET /api/rfqs/{id}/events/` - Get auction events
- `GET /api/rfqs/{id}/extension-history/` - Get extension history
- `GET /api/rfqs/{id}/statistics/` - Get auction statistics

**Bids**
- `GET /api/bids/` - List all bids
- `POST /api/bids/` - Submit new bid
- `GET /api/bids/{id}/` - Get bid details

**Events & History**
- `GET /api/events/` - List events
- `GET /api/extension-history/` - List extensions

For complete API documentation, see [backend/README.md](backend/README.md).

## Technology Stack

### Backend
- **Framework:** Django 4.x
- **Database:** PostgreSQL
- **Cache/Queue:** Redis
- **Task Queue:** Celery with Celery Beat
- **Real-time:** Django Channels (WebSocket)
- **API:** Django REST Framework
- **WebSocket:** daphne ASGI server

### Frontend
- **Framework:** React 18+
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Routing:** React Router

## Environment Configuration

### Backend (.env)
```
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:password@localhost/auction_db
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=localhost,127.0.0.1
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
```

## Key Features Breakdown

### Auction Management
- Create RFQs with specific parameters
- Activate auctions with custom duration
- Track bid history in real-time
- Monitor extension history
- View comprehensive auction statistics
- Automatic event logging

### Real-time Updates
- WebSocket connection for live auction updates
- Instant bid notifications
- Live participant tracking
- Real-time price changes

### Responsive Design
- Mobile-first responsive layout
- Touch-friendly interface for mobile devices
- Optimized views for tablet and desktop
- Accessible UI components

## Future Scope

### Authentication & Authorization
- **Role-based Access Control (RBAC)** - Implement granular permission system for different user roles
- **Role-wise Authentication** - Separate login flows and access levels for:
  - **Sellers** - Manage RFQs, view bids, analytics dashboard
  - **Buyers** - Browse auctions, submit bids, bid management
  - **Admins** - System administration, user management, audit logs
  - **Observers** - Read-only access to auctions (optional)

### Seller Dashboard & Tools
- Comprehensive seller dashboard with:
  - RFQ creation and management interface
  - Bid analysis and comparison tools
  - Performance metrics and analytics
  - Buyer relationship management
  - Invoice and payment tracking
  - Communication portal with buyers

### Buyer Portal & Features
- Advanced buyer features:
  - Auction search and filtering with advanced criteria
  - Bid history and strategy tracking
  - Favorites and saved auctions
  - Price comparison and trend analysis
  - Notification preferences and alerts
  - Order management and tracking
  - Transaction history

### Admin Dashboard
- Comprehensive admin panel with:
  - User management and role assignment
  - Auction moderation and oversight
  - System monitoring and analytics
  - Reporting and audit logs
  - Content management
  - Configuration management

### Enhanced Functionality
- **Email Notifications** - Bid confirmations, auction updates, winner notifications
- **SMS Alerts** - Critical auction notifications via SMS
- **Payment Gateway Integration** - Secure payment processing for auctions
- **Document Management** - File uploads, contract management, invoicing
- **Advanced Search & Filtering** - Full-text search, complex filters, saved searches
- **Recommendation Engine** - AI-powered auction recommendations for buyers
- **Analytics & Reporting** - Detailed reports for sellers and admins

### Performance & Scalability
- **Caching Strategy** - Redis caching for frequently accessed data
- **Database Optimization** - Query optimization and indexing
- **CDN Integration** - Content delivery network for static assets
- **Load Balancing** - Multi-instance deployment strategy
- **Monitoring & Logging** - Comprehensive logging and monitoring system

## Documentation Files

- [Backend README](backend/README.md) - Backend setup and API documentation
- [Frontend README](frontend/README.md) - Frontend setup and component documentation

---
