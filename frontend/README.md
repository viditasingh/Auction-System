# British Auction RFQ Frontend

React + Vite application for the British Auction RFQ system.

## Features

- Real-time auction listing with live updates
- Detailed auction view with bid history and activity log
- Create new RFQ with customizable auction configuration
- Extension history tracking
- Responsive design with Tailwind CSS
- WebSocket support for real-time updates

## Prerequisites

- Node.js 16+
- npm or yarn

## Installation

1. **Install dependencies:**

```bash
npm install
```

2. **Create .env file:**

```bash
cp .env.example .env
```

3. **Update environment variables** if needed

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Build

```bash
npm run build
```

## Project Structure

```
src/
├── api/
│   └── client.js          # API client with axios
├── components/
│   └── Navbar.jsx         # Navigation bar
├── pages/
│   ├── AuctionListPage.jsx     # List all auctions
│   ├── AuctionDetailPage.jsx   # Auction details with bids
│   ├── CreateRFQPage.jsx       # Create new RFQ
│   └── NotFoundPage.jsx        # 404 page
├── App.jsx                # Main app component with routing
├── main.jsx               # React entry point
└── index.css              # Global styles
```

## API Integration

The frontend communicates with the Django backend via REST API. See `api/client.js` for available endpoints.

### Environment Variables

- `VITE_API_URL` - API base URL (default: http://localhost:8000/api)
- `VITE_WS_URL` - WebSocket URL (default: ws://localhost:8000/ws)

## Styling

- Tailwind CSS for utility-first styling
- Custom CSS classes for common components
- Responsive design with mobile-first approach

## Icons

Using Lucide React for icons:

- Eye, Plus, Menu, X, AlertCircle, Loader, TrendingDown, ChevronLeft

## WebSocket Support

Ready for real-time updates via Django Channels. WebSocket consumers defined in backend will push live auction updates.
