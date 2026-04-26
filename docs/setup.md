# Complete Setup Guide

## Prerequisites

Ensure you have installed:

- Python 3.9+
- Node.js 16+
- PostgreSQL 12+
- Redis 6+
- Git

## Initial Setup (First Time Only)

### 1. Database Setup

**Create PostgreSQL database and user:**

```bash
sudo -u postgres psql

# In psql:
CREATE DATABASE auction_system;
CREATE USER auction_user WITH PASSWORD 'your_secure_password';
ALTER ROLE auction_user SET client_encoding TO 'utf8';
ALTER ROLE auction_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE auction_user SET default_transaction_deferrable TO on;
ALTER ROLE auction_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE auction_system TO auction_user;
\q
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env with your credentials
# DATABASE_USER=auction_user
# DATABASE_PASSWORD=your_secure_password
# DATABASE_NAME=auction_system
```

### 3. Run Django Migrations

```bash
python manage.py migrate

# Create superuser for admin access
python manage.py createsuperuser
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

## Running the Application

### Terminal 1: PostgreSQL

```bash
# Make sure PostgreSQL is running
```

### Terminal 2: Redis

```bash
# Make sure Redis is running
redis-server
```

### Terminal 3: Django Backend

```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

### Terminal 4: React Frontend

```bash
cd frontend
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:8000

### Terminal 5: Celery Worker

```bash
cd backend
source venv/bin/activate
celery -A config worker -l info
```
>Note: use ```celery -A config worker -l info --pool=solo``` for local dev

### Terminal 6: Celery Beat

```bash
cd backend
source venv/bin/activate
celery -A config beat -l info
```

## Production Deployment

See root README.md for production deployment instructions.
