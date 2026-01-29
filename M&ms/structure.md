# Project Structure & File Guide

This document outlines the directory structure of the project and explains the purpose of key files and directories.

## Directory Tree

```text
M&ms/
├── .env                  # Environment variables (secrets, config)
├── Makefile              # Commands to build/run the project (make all, make fclean)
├── docker-compose.yml    # Orchestration of all services (frontend, backend services, nginx, db, redis)
├── data/                 # Persistent storage for databases
├── nginx/                # API Gateway and Reverse Proxy
│   ├── nginx.conf        # Global Nginx configuration
│   ├── locations.conf    # Route mappings (e.g., /api/auth -> auth-service)
│   └── Dockerfile        # Build instructions for Nginx container
├── frontend/             # React application (Vite)
│   ├── Dockerfile        # specific Dockerfile for frontend
│   ├── vite.config.ts    # Vite configuration (ports, proxy, HMR)
│   ├── tailwind.config.js# Tailwind CSS configuration
│   └── src/
│       ├── App.tsx       # Main application component & Routing
│       ├── components/   # Reusable UI components (Navbar, Footer, etc.)
│       ├── game/         # Game logic (PongEngine, Ball, Paddle classes)
│       ├── pages/        # Route pages (Home, Game, Profile, Settings)
│       │   ├── Chat.tsx  # Chat interface
│       │   └── ...
│       └── services/     # API Client wrappers (fetches data from backend)
└── services/             # Backend Microservices
    ├── auth-service/     # Handles Authentication (Login, JWT, 2FA)
    │   ├── src/
    │   │   ├── index.ts  # Entry point
    │   │   └── routes/   # API endpoints (e.g., /login, /callback)
    │   └── prisma/       # Database schema for Auth
    ├── chat-service/     # Handles Chat & WebSocket functionality
    │   ├── src/
    │   │   └── routes/   # WebSocket & Chat HTTP routes
    │   └── prisma/       # Database schema for Chat
    ├── game-service/     # Handles Matchmaking & Game History
    │   └── src/routes/   # Game API endpoints
    ├── user-service/     # Handles User Profiles & Friend Management
    │   └── src/routes/   # User API endpoints
    └── shared/           # Shared libraries/utilities (likely unused or for common code)
```

## Detailed File Descriptions

### Root Directory
- **`docker-compose.yml`**: Defines the services to run. It spins up containers for the frontend, each backend service, the database (Postgres), Redis (caching/pubsub), and Nginx.
- **`Makefile`**: Provides shortcuts. `make all` runs `docker-compose up`, `make fclean` stops and removes everything.

### Backend (`services/`)
Each folder here is a standalone Node.js (Fastify) application.
- **`auth-service`**: Manages OAuth with Google/42, issues JWT tokens, handles 2FA.
- **`chat-service`**: Manages real-time chat and online game logic via WebSockets.
- **`user-service`**: Manages user data, avatars, friends, and blocking.
- **`game-service`**: Stores match history and manages matchmaking logic.
- **`shared`**: A location for shared Prisma schemas or utility functions (if configured).

### Frontend (`frontend/`)
- **`src/services/`**: These are **client-side** files. They do *not* contain backend logic. Instead, they contain functions to *call* the backend APIs (e.g., `auth.service.ts` has a function `login()` that sends a POST request to `/api/auth/login`).
- **`src/game/`**: Contains the physics engine for the Pong game running in the browser.

### Infrastructure (`nginx/`)
- **`nginx/locations.conf`**: The traffic director. It sends requests starting with `/api/auth` to the `auth-service`, `/api/chat` to `chat-service`, and everything else to the `frontend`.

---

## Suggestion: Separate Backend Folder?

**Current State:**
You essentially **already have** a separate backend folder. The `services/` directory *is* your backend folder. It contains all the server-side logic split into microservices.

**Regarding `frontend/src/services`:**
You might see `services` inside `frontend` and wonder if it belongs there.
- **Verdict**: **YES**, it belongs there.
- **Reason**: The files in `frontend/src/services` (like `auth.service.ts`, `user.service.ts`) are **API Clients**. They run in the user's browser, not on the server. They are responsible for making HTTP requests (using `fetch` or `axios`) to your actual backend in `services/`.
- **Action**: Do **not** move these files to the backend. They are the bridge allowing your frontend to talk to your backend.

**Recommendation:**
- Keep the structure as is. It is a standard Microservices + Frontend Monorepo structure.
- `services/` contains all Server Code.
- `frontend/` contains all Client Code.
