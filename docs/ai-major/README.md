# Transcendence AI Major - README

**Project:** AI Assistant with Gemini Streaming  
**Status:** Ready for Implementation  
**Date:** January 14, 2026  

---

## 📁 Documentation Structure

This folder contains all documentation for implementing the LLM system interface major using Google Gemini API.

### Files

1. **README.md** (this file)
   - Quick overview and navigation
   
2. **CODEBASE_ANALYSIS.md**
   - Detailed analysis of existing architecture
   - File paths, patterns, and integration points
   - ~1000 lines of findings
   
3. **IMPLEMENTATION_PLAN.md**
   - Beginner-friendly implementation guide
   - Architecture diagrams and data models
   - Step-by-step instructions for all phases
   - Test plan and demo script
   
4. **CLICKUP_BREAKDOWN.md**
   - ClickUp project structure
   - Task list with dependencies and time estimates
   - 28 tasks across 6 lists
   - ~17 hours total estimated effort

---

## 🎯 What We're Building

An **AI chat assistant** integrated into the Transcendence pong game platform that:

- Streams responses from Google Gemini in real-time (word-by-word)
- Uses existing WebSocket infrastructure (chat-service)
- Persists conversations in SQLite via Prisma
- Enforces rate limiting (10 requests per 5 minutes per user)
- Handles errors gracefully with user-friendly messages
- Keeps API keys secure (server-side only)

---

## 🏗️ Architecture Quick View

```
Browser (Vite/TS)
    ↓ WebSocket (wss://localhost:8443/api/chat/ws)
Nginx (TLS + Proxy)
    ↓
Chat Service (Fastify)
    ↓ Rate Limiting + JWT Auth
Gemini API (Google)
    ↓ HTTP Streaming
Database (SQLite + Prisma)
```

---

## 📚 Key Concepts for Beginners

All technical concepts explained in **IMPLEMENTATION_PLAN.md**, including:
- What is an LLM and Gemini
- What is an API and streaming
- What are WebSockets
- What is rate limiting and why it matters
- What is Prisma and database migrations

---

## 📋 Implementation Overview

### Phase 1: Backend (Chat Service)
- Install Gemini SDK (`@google/generative-ai`)
- Create Gemini client wrapper with streaming
- Add rate limiting plugin (`@fastify/rate-limit`)
- Extend WebSocket handler for AI message types
- Add HTTP endpoints for conversation management

**Files Created/Modified:**
- `services/chat-service/package.json`
- `services/chat-service/src/lib/gemini.ts` (new)
- `services/chat-service/src/lib/rateLimiter.ts` (new)
- `services/chat-service/src/routes/websocket.ts` (modified)
- `services/chat-service/src/routes/ai.ts` (new)

### Phase 2: Database (Prisma)
- Add `AiConversation` model (user conversations)
- Add `AiMessage` model (user/assistant messages)
- Create migration and apply to SQLite
- Regenerate Prisma client

**Files Modified:**
- `services/shared/prisma/schema.prisma`

### Phase 3: Frontend (Vite + TypeScript)
- Create WebSocket client wrapper (reusable)
- Create AI service for HTTP API calls
- Build AI Assistant page with streaming UI
- Update main app navigation
- Add HTML markup and CSS styles

**Files Created/Modified:**
- `frontend/src/ts/services/WebSocketClient.ts` (new)
- `frontend/src/ts/services/AiService.ts` (new)
- `frontend/src/ts/pages/AiAssistant.ts` (new)
- `frontend/src/ts/app.ts` (modified)
- `frontend/src/index.html` (modified)
- `frontend/src/ts/css/styles.css` (modified)

### Phase 4: Configuration
- Add environment variables (GEMINI_API_KEY, etc.)
- Update docker-compose.yml
- Create .env.example
- Verify nginx config (already correct)

**Files Modified:**
- `docker-compose.yml`
- `.env.example`

---

## ⏱️ Time Estimates

| Phase | Hours | Tasks |
|-------|-------|-------|
| Backend | 6.5h | 6 tasks |
| Database | 1h | 5 tasks |
| Frontend | 6h | 6 tasks |
| Config | 0.5h | 3 tasks |
| Testing | 2h | 6 tasks |
| Docs | 0.75h | 2 tasks |
| **Total** | **16.75h** | **28 tasks** |

*Add ~50% buffer for debugging = ~25 hours total*

---

## 🚦 Getting Started

### Prerequisites
1. Obtain Gemini API key: https://aistudio.google.com/apikey
2. Ensure services running: `docker-compose up -d`
3. Verify database accessible: `ls -la data/pong.db`

### Implementation Order
1. Read **IMPLEMENTATION_PLAN.md** (beginner-friendly guide)
2. Review **CODEBASE_ANALYSIS.md** (understand existing code)
3. Follow **CLICKUP_BREAKDOWN.md** task order
4. Execute tasks phase-by-phase (backend → database → frontend → config → test)

### Quick Start Commands
```bash
# Install backend dependencies
cd services/chat-service
npm install @google/generative-ai @fastify/rate-limit

# Run database migration
cd services/shared/prisma
npx prisma migrate dev --name add_ai_models
npx prisma generate

# Set environment variables
cp .env.example .env
# Edit .env and add GEMINI_API_KEY

# Restart services
docker-compose down
docker-compose up -d

# Test
open https://localhost:8443
```

---

## 🔐 Security Checklist

- [x] API key stored in environment variable (never committed)
- [x] API key only accessed server-side (never sent to frontend)
- [x] JWT authentication required for all AI requests
- [x] User can only access own conversations (ownership verification)
- [x] Rate limiting prevents abuse (10 req/5min per user)
- [x] Input validation (max prompt length: 4000 chars)
- [x] Error messages sanitized (no stack traces to user)

---

## 📊 Data Model Summary

### AiConversation
- `id` (int, PK)
- `userId` (int, FK → User)
- `title` (string, default "New Conversation")
- `createdAt`, `updatedAt` (timestamps)
- Relations: User (belongsTo), AiMessage[] (hasMany)

### AiMessage
- `id` (int, PK)
- `conversationId` (int, FK → AiConversation)
- `role` (string, 'user' or 'assistant')
- `content` (string)
- `tokens` (int, optional)
- `createdAt` (timestamp)
- Relations: AiConversation (belongsTo)

---

## 🧪 Testing Strategy

### Manual Tests (see IMPLEMENTATION_PLAN.md for details)
1. Basic conversation (streaming, context)
2. Stream cancellation (stop button)
3. Rate limiting (exceed limit, wait, retry)
4. Error handling (invalid token, timeout, bad API key)
5. Persistence (reload page, data remains)

### Demo Script
10-minute evaluation demo covering:
- Architecture explanation
- Code walkthrough
- Live streaming demo
- Rate limiting demonstration
- Database inspection
- Security features

---

## 📞 Support and Troubleshooting

### Common Issues

**"Invalid API key"**
- Verify `GEMINI_API_KEY` in `.env`
- Check key validity at https://aistudio.google.com/apikey
- Ensure key loaded: `docker-compose config | grep GEMINI`

**"WebSocket connection failed"**
- Check JWT token in localStorage
- Verify nginx config (WS upgrade headers)
- Check chat-service logs: `docker logs transcendence-chat-service`

**"Rate limit not working"**
- Verify Redis running: `docker exec -it transcendence-redis redis-cli ping`
- Check rate limit keys: `redis-cli KEYS "ai:*"`

**"Database migration failed"**
- Stop services before migration
- Check SQLite permissions: `ls -la data/pong.db`
- Manual rollback: `prisma migrate resolve --rolled-back <name>`

---

## 🎓 Learning Resources

- [Gemini API Docs](https://ai.google.dev/tutorials/get_started_node)
- [Streaming Guide](https://ai.google.dev/api/generate-content#v1beta.models.streamGenerateContent)
- [Fastify WebSocket](https://github.com/fastify/fastify-websocket)
- [Prisma Schema Reference](https://www.prisma.io/docs/concepts/components/prisma-schema)

---

## ✅ Success Criteria

Implementation complete when:
- [x] User can send prompt and receive streamed response
- [x] User can cancel in-progress stream
- [x] Conversations persist across browser sessions
- [x] Rate limiting prevents >10 requests per 5 min
- [x] Errors show user-friendly messages (no crashes)
- [x] API key never exposed to frontend
- [x] JWT enforces user ownership of conversations
- [x] Demo executable in <10 minutes

---

## 📂 File Paths Reference

**Backend:**
- Chat service: `services/chat-service/`
- Gemini client: `services/chat-service/src/lib/gemini.ts`
- Rate limiter: `services/chat-service/src/lib/rateLimiter.ts`
- WS handler: `services/chat-service/src/routes/websocket.ts`
- AI routes: `services/chat-service/src/routes/ai.ts`

**Database:**
- Schema: `services/shared/prisma/schema.prisma`
- Migrations: `services/shared/prisma/migrations/`

**Frontend:**
- WS client: `frontend/src/ts/services/WebSocketClient.ts`
- AI service: `frontend/src/ts/services/AiService.ts`
- AI page: `frontend/src/ts/pages/AiAssistant.ts`
- Main app: `frontend/src/ts/app.ts`
- HTML: `frontend/src/index.html`
- CSS: `frontend/src/ts/css/styles.css`

**Config:**
- Docker Compose: `docker-compose.yml`
- Nginx: `nginx/nginx.conf`
- Env example: `.env.example`

**Docs:**
- All documentation: `docs/ai-major/`

---

## 🎯 Next Actions

After reading this README:

1. **Understand the plan:** Read IMPLEMENTATION_PLAN.md thoroughly
2. **Review existing code:** Skim CODEBASE_ANALYSIS.md
3. **Set up ClickUp:** Use CLICKUP_BREAKDOWN.md to create project structure
4. **Start implementing:** Follow task order in ClickUp
5. **Test incrementally:** Don't wait until end to test
6. **Prepare demo:** Practice demo script before evaluation

---

**Ready to build! 🚀**

For questions or clarifications, review the detailed docs or check troubleshooting section.
