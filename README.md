# NTSuisse Demo

A full-stack application with React + TypeScript + Tailwind frontend and Node + Express + SQLite backend.

## Project Structure

```
ntsuisse-demo/
├── client/          # React + TypeScript + Tailwind frontend
└── server/          # Node + Express + SQLite backend
```

## Setup

### Quick Start (Recommended)

1. Install all dependencies:
```bash
npm run install:all
```

2. Start both server and client:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5001`
- Frontend on `http://localhost:3000`

### Individual Setup

#### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:5001`

#### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Features

- **Frontend**: React 18 with TypeScript, styled with Tailwind CSS
- **Backend**: Node.js with Express and SQLite database
- **API**: RESTful endpoints for CRUD operations
- **Real Data**: Stores and displays data from SQLite database

## API Endpoints

- `GET /api/data` - Get all items
- `GET /api/data/:id` - Get single item
- `POST /api/data` - Create new item
- `PUT /api/data/:id` - Update item
- `DELETE /api/data/:id` - Delete item

