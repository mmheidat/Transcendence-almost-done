# Codebase Analysis for AI Major Implementation

**Date:** January 14, 2026  
**Repository:** Transcendence-almost-done  
**Purpose:** Document existing architecture for Gemini LLM integration

---

## Executive Summary

The codebase uses a Fastify-based microservice architecture with:
- 4 services: auth-service, user-service, game-service, chat-service
- Shared Prisma SQLite database (`/app/data/pong.db`)
- JWT authentication with @fastify/jwt
- WebSocket support in chat-service via @fastify/websocket
- Redis pub/sub for real-time messaging
- Nginx reverse proxy with TLS termination

**Key Finding:** Chat-service already has WebSocket infrastructure and JWT verification. We will extend it to handle AI streaming without major architectural changes.

---

## 1. Chat Service WebSocket Implementation

### File: `services/chat-service/src/routes/websocket.ts`

**Current Architecture:**
- WebSocket endpoint: `/api/chat/ws?token=<JWT>`
- Token verification at connection time
- Client registry: `Map<userId, Set<WebSocket>>`
- Redis subscription for `chat:message` channel
- Message broadcasting to connected clients

**Message Flow:**
```
Client connects → JWT verification → Register in clients Map
Redis pub → Parse message → Send to target user's WebSocket clients
```

**Current Message Schema (Inbound):**
```typescript
// Generic JSON message (no strict schema yet)
connection.on('message', (data: Buffer) => {
    const message = JSON.parse(data.toString());
    console.log(`Received from ${userId}:`, message);
});
```

**Current Message Schema (Outbound):**
```typescript
{
    type: 'new_message',
    from: number,
    content: string,
    messageId: number
}
```

**Key Code Patterns:**
- Connection close on invalid token (4001, 4002 codes)
- Client cleanup on disconnect
- No explicit opcode/event routing yet (just logs incoming messages)

**AI Integration Point:**
We will add message type routing:
- `aiPrompt` → trigger Gemini streaming
- `aiCancel` → abort ongoing stream
- Outbound: `aiDelta`, `aiDone`, `aiError`

---

## 2. JWT Verification and Authentication

### File: `services/chat-service/src/lib/jwt.ts`

**JWT Registration:**
```typescript
await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
});
```

**Authenticate Hook:**
```typescript
export async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.code(401).send({ error: 'Unauthorized' });
    }
}

export interface JwtPayload {
    id: number;
    email: string;
    username: string;
}
```

**Usage:**
- HTTP routes: `{ preHandler: [authenticate] }`
- WebSocket: Manual `fastify.jwt.verify(token)` in connection handler

**AI Usage:**
- Decode JWT to get user ID for conversation ownership
- Apply rate limiting per user ID (from JWT.id)

---

## 3. Prisma Client Instantiation

### File: `services/chat-service/src/lib/prisma.ts` (inferred, not read yet)

**Pattern in other services (user-service):**
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export default prisma;
```

**Database URL:**
- Environment variable: `DATABASE_URL=file:/app/data/pong.db`
- Shared schema at `services/shared/prisma/schema.prisma`
- Each service copies schema or references shared one

**Current Schema Models:**
- User (with 2FA, OAuth, online status)
- Game (player scores, winner)
- Friend (relationships with status)
- Message (sender, receiver, content, read status)

**AI Integration:**
We will add:
- `AiConversation` (user, title, createdAt, updatedAt)
- `AiMessage` (conversation, role, content, tokens, timestamp)

---

## 4. Current WebSocket Message Schema

### Analyzed from: `services/chat-service/src/routes/websocket.ts` and `messages.ts`

**Inbound (Client → Server):**
- No strict schema enforced yet
- Expected: JSON string with arbitrary structure
- Current implementation just logs the message

**Outbound (Server → Client):**
```typescript
{
    type: 'new_message',
    from: number,        // sender user ID
    content: string,     // message text
    messageId: number    // database record ID
}
```

**Proposed AI Event Schema:**

**Client → Server:**
```typescript
// Start AI prompt
{
    type: 'aiPrompt',
    conversationId?: number,  // optional, create new if missing
    prompt: string,           // user message (max 4000 chars)
}

// Cancel ongoing AI stream
{
    type: 'aiCancel',
    conversationId: number
}
```

**Server → Client:**
```typescript
// Streaming chunk
{
    type: 'aiDelta',
    conversationId: number,
    delta: string,          // partial text chunk
    messageId?: number      // if final message persisted
}

// Stream complete
{
    type: 'aiDone',
    conversationId: number,
    messageId: number,      // final message ID in DB
    totalTokens: number
}

// Stream error
{
    type: 'aiError',
    conversationId: number,
    error: string,          // safe user-facing message
    code?: string           // e.g., 'RATE_LIMITED', 'TIMEOUT'
}
```

---

## 5. Nginx Routing and WebSocket Upgrade

### File: `nginx/nginx.conf`

**Chat Service Proxy:**
```nginx
location /api/chat/ {
    proxy_pass http://chat_service/api/chat/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Key Details:**
- Already configured for WebSocket upgrade
- Upgrade header passed through
- Connection header set to "upgrade"
- No additional proxy configuration needed for AI streaming

**Upstream:**
```nginx
upstream chat_service {
    server chat-service:3004;
}
```

**SSL Termination:**
- Nginx handles TLS (cert.pem, key.pem)
- Backend services communicate over HTTP in Docker network

**AI Integration Impact:**
- **No changes required** to nginx config
- AI prompts use same `/api/chat/ws` endpoint
- Message type routing happens at application layer

---

## 6. Error Handling Patterns

### File: `services/chat-service/src/routes/messages.ts`

**HTTP Error Responses:**
```typescript
// Empty message validation
if (!content || content.trim().length === 0) {
    return reply.code(400).send({ error: 'Message cannot be empty' });
}

// JWT verification failure (from authenticate hook)
reply.code(401).send({ error: 'Unauthorized' });
```

**WebSocket Errors:**
```typescript
// Invalid token
connection.close(4001, 'No token provided');
connection.close(4002, 'Invalid token');

// Message parse error
connection.on('message', (data: Buffer) => {
    try {
        const message = JSON.parse(data.toString());
    } catch (err) {
        console.error('Invalid message format');
        // No explicit error response to client yet
    }
});
```

**Logging:**
```typescript
console.log(`WebSocket connected: user ${userId}`);
console.error('Failed to process chat message:', err);
```

**AI Error Handling Requirements:**
- Map Gemini API errors to user-safe messages
- Never expose GEMINI_API_KEY or internal error details
- Send `aiError` event over WS (not close connection)
- Log full error server-side for debugging
- Handle:
  - Rate limit (429) → 'Too many requests, please wait'
  - Timeout → 'Request took too long, try again'
  - Invalid API key → 'Service unavailable'
  - Network error → 'Connection failed, retry'
  - Malformed response → 'Unexpected response format'

---

## 7. Rate Limiting (Current State)

**Status:** No rate limiting currently implemented in chat-service

**Dependencies Available:**
- Package.json does NOT include `@fastify/rate-limit`

**Redis Available:**
- Redis client already initialized (services/chat-service/src/lib/redis.ts)
- URL: `redis://redis:6379`

**AI Rate Limiting Requirements:**
1. Install `@fastify/rate-limit` in chat-service
2. Configure global limit (optional, for all endpoints)
3. Configure AI-specific limit (strict):
   - Per-user: 10 requests per 5 minutes (JWT-based)
   - Fallback per-IP: 5 requests per 5 minutes (unauthenticated fallback)
4. Store state in Redis for distributed rate limiting
5. On limit exceeded:
   - Send `aiError` with code `RATE_LIMITED`
   - HTTP 429 (if REST API added later)

**Implementation Approach:**
```typescript
await fastify.register(rateLimit, {
    global: false,  // don't apply to all routes
    redis: redisClient,
    keyGenerator: (request) => {
        const user = request.user as JwtPayload | undefined;
        return user ? `ai-rate-${user.id}` : `ai-rate-ip-${request.ip}`;
    },
    max: 10,
    timeWindow: '5 minutes',
    skipOnError: true  // don't block on Redis errors
});
```

---

## 8. Docker and Environment Variables

### File: `services/chat-service/Dockerfile`

**Current Setup:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install
COPY src ./src/
EXPOSE 3004
CMD ["npm", "run", "dev"]
```

**Current Env Vars (from code analysis):**
- `PORT` (default: 3004)
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (default: '7d')
- `DATABASE_URL` (file:/app/data/pong.db)
- `REDIS_URL` (default: redis://redis:6379)
- `FRONTEND_URL` (default: https://localhost:8443)

**New Env Vars for AI:**
```env
GEMINI_API_KEY=<your-key>              # REQUIRED
GEMINI_MODEL=gemini-1.5-flash          # default model
AI_MAX_INPUT_CHARS=4000                # max prompt length
AI_MAX_OUTPUT_TOKENS=2048              # max response tokens
AI_REQUEST_TIMEOUT_MS=30000            # 30 second timeout
AI_RATE_LIMIT_MAX=10                   # requests per window
AI_RATE_LIMIT_WINDOW=300000            # 5 minutes in ms
```

**Docker Compose Integration:**
- Add env vars to `docker-compose.yml` under `chat-service`
- Use `.env` file or secrets management
- Never commit GEMINI_API_KEY to git

---

## 9. Frontend Architecture

### Files Analyzed:
- `frontend/src/ts/app.ts` (main app logic)
- `frontend/src/ts/services/AuthService.ts`
- `frontend/src/ts/services/ProfileService.ts`
- `frontend/src/ts/services/SocialService.ts`

**Current Architecture:**
- Single-page application (SPA) with section navigation
- No framework (vanilla TypeScript)
- Services use fetch API for HTTP calls
- No WebSocket client implementation found yet (TODO comment in app.ts)

**Navigation Pattern:**
```typescript
type SectionType = 'welcome' | 'game' | 'leaderboard' | 'profile' | 'chat' | 'settings';

function showSection(section: SectionType, addToHistory: boolean = true): void {
    // Hide all sections, show target section
    // Push to browser history
}

navChat?.addEventListener('click', () => showSection('chat'));
```

**Service Pattern (AuthService example):**
```typescript
class AuthService {
    private baseUrl = '/api/auth';
    
    async login(credentials) {
        const response = await fetch(`${this.baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        return response.json();
    }
}
```

**AI Frontend Requirements:**
1. Create new service: `frontend/src/ts/services/AiService.ts`
2. Create WebSocket client wrapper (reusable for chat + AI)
3. Create new section: 'ai-assistant'
4. Add navigation button in main nav
5. Implement streaming UI:
   - Text input for prompt
   - Streaming text display (append chunks progressively)
   - Stop button (sends aiCancel)
   - Loading spinner
   - Error display
   - Conversation history (load from API)

---

## 10. Prisma Schema Structure and Patterns

### File: `services/shared/prisma/schema.prisma`

**Generator and Datasource:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**Naming Conventions:**
- camelCase in code
- snake_case in database (via @map)
- Relation fields named with Model name (e.g., `sender User`)
- Table names lowercase with @map (e.g., `@@map("users")`)

**Common Patterns:**
```prisma
model User {
  id Int @id @default(autoincrement())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  messagesSent Message[] @relation("MessagesSent")
  
  @@index([email])
  @@map("users")
}
```

**AI Schema Design:**
```prisma
model AiConversation {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  title     String   @default("New Conversation")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user     User         @relation("UserAiConversations", fields: [userId], references: [id])
  messages AiMessage[]

  @@index([userId])
  @@map("ai_conversations")
}

model AiMessage {
  id             Int      @id @default(autoincrement())
  conversationId Int      @map("conversation_id")
  role           String   // 'user' or 'assistant'
  content        String
  tokens         Int?     // token count (if available)
  createdAt      DateTime @default(now()) @map("created_at")

  conversation AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@map("ai_messages")
}
```

**Migration Pattern:**
```bash
# In services/shared/prisma/
prisma migrate dev --name add_ai_models
prisma generate
```

---

## 11. Identified Gaps and Decisions

### Gaps:
1. **No WebSocket client in frontend** → Must implement from scratch
2. **No rate limiting library** → Add @fastify/rate-limit to chat-service
3. **No streaming handling** → Implement Gemini stream → WS chunk forwarding
4. **No AI-specific error types** → Define error codes and messages
5. **No conversation UI** → Build new AI assistant page

### Decisions:
1. **Reuse existing WS endpoint** (`/api/chat/ws`) with new message types
2. **Store conversations in SQLite** (not Redis) for persistence
3. **Use Gemini 1.5 Flash** (fast, cost-effective for streaming)
4. **Per-user rate limiting** (JWT-based) with IP fallback
5. **Server-side Gemini calls only** (never expose API key to frontend)
6. **Graceful degradation** (show errors, allow retry, don't crash service)

---

## 12. File Paths Summary

**Backend Files to Modify:**
- `services/chat-service/package.json` (add dependencies)
- `services/chat-service/src/routes/websocket.ts` (add AI message handlers)
- `services/chat-service/src/index.ts` (register rate limit, AI routes if needed)
- `services/shared/prisma/schema.prisma` (add AI models)

**Backend Files to Create:**
- `services/chat-service/src/lib/gemini.ts` (Gemini client wrapper)
- `services/chat-service/src/lib/rateLimiter.ts` (rate limit config)
- `services/chat-service/src/routes/ai.ts` (HTTP endpoints for conversations)

**Frontend Files to Modify:**
- `frontend/src/ts/app.ts` (add 'ai-assistant' section, nav button)
- `frontend/src/index.html` (add AI assistant section HTML)

**Frontend Files to Create:**
- `frontend/src/ts/services/AiService.ts` (AI API client)
- `frontend/src/ts/services/WebSocketClient.ts` (WS wrapper)
- `frontend/src/ts/pages/AiAssistant.ts` (AI UI logic)

**Documentation Files:**
- `docs/ai-major/README.md` (overview)
- `docs/ai-major/IMPLEMENTATION_PLAN.md` (detailed plan)
- `docs/ai-major/CLICKUP_BREAKDOWN.md` (ClickUp structure)

**Configuration Files:**
- `docker-compose.yml` (add GEMINI_API_KEY env var)
- `.env.example` (document new env vars)

---

## Next Steps

1. ✅ Analysis complete
2. → Write beginner-friendly implementation plan
3. → Create ClickUp project structure
4. → Implement backend changes
5. → Implement frontend changes
6. → Test and validate

**Estimated LOC:**
- Backend: ~600 lines (Gemini client, WS handlers, rate limit, Prisma operations)
- Frontend: ~400 lines (WS client, AI page, service layer)
- Schema: ~30 lines (2 models)
- Total: ~1000 lines + documentation
