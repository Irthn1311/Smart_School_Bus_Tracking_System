# Smart School Bus Tracking System

A full-stack school transportation platform for managing routes, vehicles, drivers, students, and **real-time bus tracking** for administrators, drivers, and parents.

## What it does

The system supports the complete trip lifecycle:

```text
Schedule trip
  -> assign route / vehicle / driver
  -> start trip
  -> stream GPS position
  -> track route and student status
  -> notify near-stop / delay events
  -> end trip
  -> review operational reports
```

### Administrator

- Manage buses, drivers, students, routes, and stops
- Schedule and assign trips
- Monitor active trips on a live map
- Review trip status and operational reports

### Driver

- View assigned trips
- Start and end trips
- Update GPS position
- View route, stops, and student information
- Report incidents

### Parent

- Track the assigned school bus
- View live vehicle location
- Receive near-stop and delay notifications

## Architecture

```text
Next.js / React
      |
      | REST + realtime events
      v
Node.js / Express
      |
      +---- Socket.IO
      |
      v
    MySQL
```

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 15, React 19, Tailwind CSS, Radix UI / shadcn, TanStack Query |
| Maps | React Leaflet / Google Maps JavaScript API |
| Backend | Node.js, Express 5 |
| Realtime | Socket.IO |
| Database | MySQL, MySQL2, Sequelize / SQL modules |
| Authentication | JWT, optional Firebase Admin integration |
| Tooling | ESLint, Nodemon, TSX |

## Repository structure

```text
Smart_School_Bus_Tracking_System/
├── ssb-frontend/   frontend application
├── ssb-backend/    REST API and realtime services
├── database/       schema and seed scripts
├── demo/           simulation / demo utilities
├── docs/           requirements and technical documentation
├── reports/        project reports
└── README.md
```

## Run locally

### Requirements

- Node.js 18+
- MySQL
- Git

### Backend

```bash
cd ssb-backend
cp .env.example .env
npm install
npm run dev
```

Configure the database connection and required secrets in `.env` before starting the server.

### Frontend

```bash
cd ssb-frontend
cp env.example .env.local
npm install
npm run dev
```

The default development setup uses the frontend on port 3000 and backend on port 4000.

## Database

The repository includes database scripts for schema initialization and sample data. Review the scripts under `database/` and the backend environment configuration before importing them into a local MySQL instance.

## Project contribution

This was developed as a Software Engineering team project.

**Nguyen Huu Tri — Team Leader, Backend Lead & DevOps**

Other team members contributed across database, realtime services, backend APIs, frontend maps/realtime, authentication, reporting, requirements, and QA.

## Highlights

- Multi-role workflow for administrator, driver, and parent
- Realtime GPS tracking and trip-state updates
- Near-stop and delay notification flows
- Full-stack architecture with separate frontend/backend applications
- Database, documentation, demo utilities, and engineering artifacts kept in one repository
