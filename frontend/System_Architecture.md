# System Architecture — CoveStack

## High-Level Design

CoveStack is a full-stack, real-time web application designed to support structured collaboration for small teams.

It uses a modular backend split into:
- Python (FastAPI) for RESTful APIs and auth
- Node.js (Fastify + Socket.io) for real-time collaboration (chat, notes)

## Architecture Components

### Frontend
- **React + TypeScript + TailwindCSS**
- Routed UI with protected routes
- Zustand for global state
- Axios for API calls
- Socket.io client for realtime

### Backend (REST API)
- **FastAPI (Python)**
- User authentication via OAuth2
- JWT-based session handling
- Workspace + Task + Notes APIs

### Realtime Service
- **Fastify + Socket.io**
- Uses Redis pub-sub
- Supports live messaging and collaborative editing

### Database
- **PostgreSQL** (via Prisma)
- Core tables: `users`, `workspaces`, `tasks`, `notes`, `messages`, `plugins`

### Caching / Pub-Sub
- **Redis**
- Shared between Python and Node services

### Auth
- OAuth2 login (Google or GitHub)
- JWT access token (with refresh strategy)
- Role-based permissions (admin, member)

### Deployment & DevOps
- Docker containers for frontend and backend
- GitHub Actions for CI/CD pipeline
- Hosted on:
  - AWS EC2 → backend services
  - AWS S3 + CloudFront → frontend static site
  - AWS RDS → PostgreSQL



## Key Design Priorities
- Scalable real-time collaboration (via Socket.io + Redis)
- Separation of concerns between REST API and realtime engine
- Simple deployment pipeline with Docker + GitHub Actions
- Role-based access control per workspace

