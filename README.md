# WaterLab Demo (NTSuisse Mirror)

Modern full-stack showcase inspired by the Eawag / NTSuisse project. It combines a React + TypeScript + Tailwind UI with a Node.js + Express backend that serves local data, Swiss water analytics, and aggregated water news.

## Project Structure

```
ntsuisse-demo/
├── client/          # React 18 + TypeScript + Tailwind frontend (Vite)
└── server/          # Express backend with sql.js (SQLite) + external data routers
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, React Leaflet
- **Backend:** Node.js, Express, sql.js, node-fetch, rss-parser
- **Data sources:** Basel Open Data (Socrata API), local CSV snapshot, UN Water RSS feed (extensible)
- **Tooling:** ESLint, TypeScript strict mode, Vite dev tooling

## Features

### Frontend
- Responsive layout with theme-aware color system and Tailwind utility classes
- Pages: `About`, `Dashboard` (analytics + map), `Data` (CRUD management)
- Water dashboard with station selector, summary cards, and interactive map using Leaflet
- Live “Water News” widget consuming backend RSS aggregation with thumbnail support
- Data management page showcasing CRUD operations with form, list, and optimistic UX touches

### Backend
- Modular Express server split into:
  - `/routes/news.js` – fetches + caches RSS feeds, rewrites media URLs, serves `/api/news`
  - `/routes/water.js` – merges Socrata live data and local CSV fallback, serves `/api/water/*`
  - `/db/index.js` – initialises sql.js database and exposes query helpers
- REST CRUD endpoints under `/api/data`
- sqlite database persisted to `server/database.sqlite`
- Detailed logging + graceful degradation when upstream feeds fail

## Setup & Development

### Install dependencies
```bash
npm run install:all        # installs both client and server packages
```

_or manually_
```bash
cd server && npm install
cd ../client && npm install
```

### Run local environment
```bash
npm run dev                # concurrently starts server (5001) and client (3000)
```

Run individually if desired:
```bash
cd server && npm run dev   # http://localhost:5001
cd client && npm run dev   # http://localhost:3000
```

### Available scripts
- `npm run install:all` – installs deps in both workspaces
- `npm run dev` – concurrently run backend + frontend (root script)
- `npm run lint` (client/server respectively) – run ESLint/TS checks
- `cd client && npm test` – executes Jest + React Testing Library suite

### Testing
Frontend tests run with Jest and React Testing Library. Example workflow:
```bash
cd client
npm test          # run once
npm test -- --watch # optional watch mode
```
Tests cover UI wiring (e.g., `Header`) and data logic (e.g., `useWaterMapData`). Extend by placing `*.test.tsx` files under `src/`.

## API Surface

### CRUD (`/api/data`)
- `GET /api/data` – list all items (sorted by `createdAt` DESC)
- `GET /api/data/:id` – fetch single item by ID
- `POST /api/data` – create `{ name, description }`
- `PUT /api/data/:id` – update existing item
- `DELETE /api/data/:id` – remove item

### Water analytics (`/api/water`)
- `GET /api/water/stations` – merged station list with source metadata
- `GET /api/water/stations/:id` – measurements for a station with source tag (`opendata.bs.ch`, `local-snapshot`, etc.)

### News (`/api/news`)
- `GET /api/news` – cached array of water-related news articles (title, link, date, summary, image, source)

## Data Sources & Fallbacks
- **Basel Open Data (Socrata)** – primary live measurements for supported stations
- **Local CSV (`server/data/water_latest.csv`)** – fallback snapshot for offline/demo mode
- **UN Water RSS feed** – live news headlines (router designed for easy feed expansion)

## Verification Checklist
- [ ] Backend `npm run dev` starts without errors (port 5001)
- [ ] Frontend `npm run dev` serves app on port 3000
- [ ] Dashboard loads station list and measurements (Socrata → CSV fallback)
- [ ] Map renders markers with tooltips and color coding
- [ ] About page shows live Water News with thumbnails
- [ ] CRUD operations (create, update, delete) succeed via `/api/data`

## Notes
- sql.js keeps the database in memory and writes to `database.sqlite` after each mutation
- If Socrata or RSS sources fail, the backend logs a warning and falls back gracefully
- Tailwind warnings about `@tailwind` directives are expected unless stylelint is configured accordingly

