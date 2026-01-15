# AI Major - Gemini Streaming Chat Assistant

**Project:** Transcendence AI Integration  
**Major:** LLM System Interface (42 Major)  
**Technology:** Google Gemini Developer API  
**Architecture:** Microservices + WebSocket Streaming  

---

## 🎯 What This Is

This project adds an **AI chatbot assistant** to the Transcendence game platform using **Google Gemini**. Users can have conversations with an AI that responds in real-time, with text appearing word-by-word as the AI generates it (streaming).

### Why This Matters
- **Real-time interaction** feels more natural than waiting for the full response
- **Cost-efficient** using Gemini's free tier (15 requests/minute)
- **Secure** — API keys never exposed to users
- **Persistent** — conversations saved in database
- **Rate-limited** — prevents abuse and cost overruns

---

## 📖 Beginner Concepts

### What is an LLM?
**LLM** = Large Language Model. It's an AI trained on massive amounts of text that can:
- Answer questions
- Have conversations
- Generate creative content
- Help with coding, writing, explaining concepts

**Gemini** is Google's LLM, similar to ChatGPT. We use the Gemini Developer API to integrate it into our app.

### What is an API?
**API** = Application Programming Interface. It's like a menu at a restaurant:
- You (the client) make a request ("I want a burger")
- The kitchen (the server) processes it
- You get a response (your burger)

For Gemini:
- Request: "User's question to the AI"
- Response: "AI's answer"

APIs use **HTTP requests** (like loading a webpage) with special formats (JSON).

### What is Streaming?
**Normal response:** Wait 10 seconds → Get full answer at once  
**Streaming response:** Get words appearing progressively as they're generated

Like typing in a chat app:
```
[Second 1] "Hello"
[Second 2] "Hello, I'm"
[Second 3] "Hello, I'm happy"
[Second 4] "Hello, I'm happy to help!"
```

**Why use streaming?**
- Better user experience (feels responsive)
- Lower perceived latency
- Can show progress for long answers

### What are WebSockets?
**HTTP:** Client asks → Server responds → Connection closes  
**WebSocket:** Client and server keep connection open for two-way communication

Like a phone call (WebSocket) vs sending letters (HTTP).

Perfect for:
- Real-time chat
- Live game updates
- Streaming AI responses

Our architecture:
```
Frontend (browser)
    ↕ WebSocket (stays open)
Chat Service (backend)
    ↕ HTTP Stream (SSE-like)
Gemini API (Google)
```

### What is Rate Limiting?
**Rate limiting** = Restricting how many requests a user can make in a time window

Example:
- User can send 10 AI prompts per 5 minutes
- Exceeding this → Error message "Too many requests"

**Why?**
- Prevent abuse (spam, DDoS attacks)
- Control costs (Gemini has usage limits)
- Fair usage (one user can't hog resources)

Implementation:
- Track requests per user ID (from JWT)
- Store counts in Redis (fast in-memory database)
- Reset counter after time window expires

### What is Prisma?
**Prisma** = Database tool that makes it easy to:
1. Define data models (like creating a form: User has name, email, etc.)
2. Query database (fetch users, create messages)
3. Migrate schema (update database structure safely)

Instead of writing SQL:
```sql
SELECT * FROM users WHERE id = 5;
```

You write TypeScript:
```typescript
const user = await prisma.user.findUnique({ where: { id: 5 } });
```

**Migrations** = Version control for database structure
- Write schema changes (add AiConversation table)
- Run `prisma migrate dev`
- Database updates automatically
- Can roll back if needed

---

## 🏗️ Architecture

### High-Level Flow

```
┌─────────────┐
│   Browser   │  User types "What is pong?"
│  (Vite/TS)  │  Sends aiPrompt via WebSocket
└──────┬──────┘
       │ WS: wss://localhost:8443/api/chat/ws
       │
┌──────▼──────┐
│    Nginx    │  TLS termination + proxy
│   Gateway   │  Upgrades connection, forwards
└──────┬──────┘
       │
┌──────▼──────────┐
│  Chat Service   │  Validates JWT, checks rate limit
│   (Fastify)     │  Forwards prompt to Gemini
└──────┬──────────┘
       │ HTTP POST with streaming
       │
┌──────▼──────────┐
│  Gemini API     │  Generates response chunk by chunk
│   (Google)      │  Returns: "Pong" "is" "a" "classic" "game..."
└─────────────────┘
       │
       ▼
Chat Service buffers chunks → Sends aiDelta events → Browser displays
```

### Data Flow (Detailed)

**Step 1: User sends prompt**
```json
{
  "type": "aiPrompt",
  "conversationId": 5,  // optional
  "prompt": "What is pong?"
}
```

**Step 2: Chat service validates**
- Decode JWT → Get user ID (e.g., 42)
- Check rate limit: Has user 42 made <10 requests in last 5 min?
- Validate prompt length: <4000 chars?
- Load or create conversation

**Step 3: Call Gemini**
```typescript
const stream = await gemini.generateContentStream({
  model: 'gemini-1.5-flash',
  prompt: 'What is pong?'
});
```

**Step 4: Stream chunks to browser**
```
Gemini chunk: "Pong"     → WS: { type: 'aiDelta', delta: 'Pong' }
Gemini chunk: " is a"    → WS: { type: 'aiDelta', delta: ' is a' }
Gemini chunk: " classic" → WS: { type: 'aiDelta', delta: ' classic' }
...
```

**Step 5: Persist and finalize**
- Save user message to DB
- Concatenate all chunks
- Save assistant message to DB
- Send `aiDone` with message ID

**Step 6: Error handling**
- Timeout? → Send `aiError` with code 'TIMEOUT'
- Rate limited? → Send `aiError` with code 'RATE_LIMITED'
- Invalid API key? → Send `aiError` with code 'SERVICE_UNAVAILABLE'

### Component Breakdown

| Component | Responsibility |
|-----------|----------------|
| **Frontend (Vite)** | UI, send prompts, display streaming text |
| **Nginx** | TLS, proxy WebSocket to chat-service |
| **Chat Service** | JWT auth, rate limit, Gemini integration, WS server |
| **Gemini API** | Generate AI responses |
| **Prisma + SQLite** | Store conversations and messages |
| **Redis** | Rate limit counters |

---

## 🗄️ Database Schema

### New Models

```prisma
model User {
  // ... existing fields ...
  aiConversations AiConversation[] @relation("UserAiConversations")
}

model AiConversation {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  title     String   @default("New Conversation")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user     User         @relation("UserAiConversations", fields: [userId], references: [id], onDelete: Cascade)
  messages AiMessage[]

  @@index([userId])
  @@index([updatedAt])  // for sorting by recent
  @@map("ai_conversations")
}

model AiMessage {
  id             Int      @id @default(autoincrement())
  conversationId Int      @map("conversation_id")
  role           String   // 'user' or 'assistant'
  content        String
  tokens         Int?     // optional token count
  createdAt      DateTime @default(now()) @map("created_at")

  conversation AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])  // efficient message ordering
  @@map("ai_messages")
}
```

**Relations:**
- One User has many AiConversations
- One AiConversation has many AiMessages
- Delete conversation → Delete all messages (Cascade)

**Indexes:**
- `userId` → Fast lookup of user's conversations
- `updatedAt` → Sort conversations by recent activity
- `conversationId, createdAt` → Efficient message ordering

### Migration Commands

```bash
cd services/shared/prisma
npx prisma migrate dev --name add_ai_models
npx prisma generate
```

This creates:
- `migrations/YYYYMMDDHHmmss_add_ai_models/migration.sql`
- Updates Prisma client types

---

## 📚 Implementation Plan

### Phase 1: Backend Foundation (Chat Service)

#### 1.1 Install Dependencies
```bash
cd services/chat-service
npm install @google/generative-ai @fastify/rate-limit
```

**@google/generative-ai**: Official Gemini SDK  
**@fastify/rate-limit**: Rate limiting plugin for Fastify

#### 1.2 Create Gemini Client (`src/lib/gemini.ts`)

**Purpose:** Wrapper for Gemini API calls with streaming support

**Key Features:**
- Initialize client with API key from env
- Stream content generation
- Handle timeouts
- Error mapping (Gemini errors → user-friendly messages)

**Environment Variables:**
```env
GEMINI_API_KEY=your-key-here          # REQUIRED
GEMINI_MODEL=gemini-1.5-flash         # or gemini-1.5-pro
AI_MAX_INPUT_CHARS=4000
AI_MAX_OUTPUT_TOKENS=2048
AI_REQUEST_TIMEOUT_MS=30000
```

**Example Usage:**
```typescript
const client = getGeminiClient();
const stream = await client.generateContentStream('Hello!');

for await (const chunk of stream) {
  console.log(chunk.text);
}
```

#### 1.3 Configure Rate Limiting (`src/lib/rateLimiter.ts`)

**Strategy:**
- Per-user (JWT.id): 10 requests / 5 minutes
- Per-IP (fallback): 5 requests / 5 minutes
- Store in Redis for distributed limiting

**Configuration:**
```typescript
export const aiRateLimitConfig = {
  max: parseInt(process.env.AI_RATE_LIMIT_MAX || '10'),
  timeWindow: parseInt(process.env.AI_RATE_LIMIT_WINDOW || '300000'), // 5 min
  redis: redisClient,
  keyGenerator: (req) => {
    const user = req.user as JwtPayload | undefined;
    return user ? `ai:${user.id}` : `ai:ip:${req.ip}`;
  },
  errorResponseBuilder: () => ({
    type: 'aiError',
    error: 'Too many AI requests. Please wait before trying again.',
    code: 'RATE_LIMITED',
    retryAfter: 300  // seconds
  })
};
```

#### 1.4 Extend WebSocket Handler (`src/routes/websocket.ts`)

**Add Message Type Router:**
```typescript
connection.on('message', async (data: Buffer) => {
  const message = JSON.parse(data.toString());
  
  switch (message.type) {
    case 'aiPrompt':
      await handleAiPrompt(connection, userId, message);
      break;
    case 'aiCancel':
      await handleAiCancel(connection, userId, message);
      break;
    default:
      console.log('Unknown message type:', message.type);
  }
});
```

**handleAiPrompt Flow:**
1. Validate payload (prompt exists, length <4000)
2. Check rate limit (reject if exceeded)
3. Load or create conversation
4. Verify ownership (conversation.userId === JWT.id)
5. Save user message to DB
6. Stream Gemini response:
   - Buffer chunks
   - Send `aiDelta` per chunk
   - Accumulate full text
7. Save assistant message to DB
8. Send `aiDone` with messageId and tokens

**handleAiCancel Flow:**
1. Find active stream for user+conversation
2. Abort stream (stop Gemini request)
3. Send confirmation or ignore if no active stream

**Error Handling:**
```typescript
try {
  // ... streaming logic
} catch (err) {
  if (err.message.includes('timeout')) {
    sendWsError(connection, conversationId, 'Request timed out', 'TIMEOUT');
  } else if (err.status === 429) {
    sendWsError(connection, conversationId, 'Gemini rate limit', 'EXTERNAL_RATE_LIMIT');
  } else {
    sendWsError(connection, conversationId, 'Unexpected error', 'INTERNAL_ERROR');
  }
  logger.error('AI prompt error:', err);
}
```

#### 1.5 Add HTTP Endpoints (`src/routes/ai.ts`)

**Purpose:** REST API for managing conversations (not required for streaming, but useful)

**Endpoints:**
- `GET /api/chat/ai/conversations` → List user's conversations
- `GET /api/chat/ai/conversations/:id` → Get messages in conversation
- `POST /api/chat/ai/conversations` → Create new conversation
- `DELETE /api/chat/ai/conversations/:id` → Delete conversation
- `PATCH /api/chat/ai/conversations/:id` → Update title

**Authentication:** All require JWT (preHandler: authenticate)

**Example:**
```typescript
fastify.get('/conversations', { preHandler: [authenticate] }, async (req, reply) => {
  const user = req.user as JwtPayload;
  const conversations = await prisma.aiConversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 1  // just first message for preview
      }
    }
  });
  return reply.send({ conversations });
});
```

---

### Phase 2: Database Schema Migration

#### 2.1 Update Schema

File: `services/shared/prisma/schema.prisma`

Add models (see Database Schema section above)

#### 2.2 Run Migration

```bash
cd services/shared/prisma
npx prisma migrate dev --name add_ai_conversations_and_messages
```

This generates SQL:
```sql
CREATE TABLE "ai_conversations" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'New Conversation',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE "ai_messages" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "conversation_id" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "tokens" INTEGER,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE
);

CREATE INDEX "ai_conversations_user_id_idx" ON "ai_conversations"("user_id");
CREATE INDEX "ai_conversations_updated_at_idx" ON "ai_conversations"("updated_at");
CREATE INDEX "ai_messages_conversation_id_created_at_idx" ON "ai_messages"("conversation_id", "created_at");
```

#### 2.3 Regenerate Prisma Client

```bash
npx prisma generate
```

This updates TypeScript types in `node_modules/@prisma/client`

#### 2.4 Verify in Services

Ensure all services reference shared schema:
- Chat service: already does (imports from lib/prisma.ts)
- Other services: no changes needed

---

### Phase 3: Frontend Implementation

#### 3.1 Create WebSocket Client (`src/ts/services/WebSocketClient.ts`)

**Purpose:** Reusable WS wrapper with reconnection, event handling

**Features:**
- Auto-reconnect on disconnect
- Event emitter pattern
- JWT token from localStorage
- Connection state tracking

**Example:**
```typescript
class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Function[]>();

  connect(token: string) {
    this.ws = new WebSocket(`wss://localhost:8443/api/chat/ws?token=${token}`);
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.emit(msg.type, msg);
    };
  }

  send(type: string, payload: object) {
    this.ws?.send(JSON.stringify({ type, ...payload }));
  }

  on(type: string, callback: Function) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type)!.push(callback);
  }

  private emit(type: string, data: any) {
    this.listeners.get(type)?.forEach(cb => cb(data));
  }
}
```

#### 3.2 Create AI Service (`src/ts/services/AiService.ts`)

**Purpose:** HTTP API wrapper for conversation management

**Methods:**
```typescript
class AiService {
  private baseUrl = '/api/chat/ai';

  async getConversations() {
    const res = await fetch(`${this.baseUrl}/conversations`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  }

  async getMessages(conversationId: number) {
    const res = await fetch(`${this.baseUrl}/conversations/${conversationId}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  }

  async createConversation(title?: string) {
    const res = await fetch(`${this.baseUrl}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ title })
    });
    return res.json();
  }
}
```

#### 3.3 Create AI Assistant Page (`src/ts/pages/AiAssistant.ts`)

**Purpose:** UI logic for AI chat interface

**Components:**
- Conversation list (sidebar)
- Message history (main area)
- Prompt input (bottom)
- Streaming text renderer
- Stop button

**State Management:**
```typescript
class AiAssistantPage {
  private currentConversation: number | null = null;
  private messages: Array<{ role: string, content: string }> = [];
  private streaming: boolean = false;
  private currentStreamBuffer: string = '';

  async initialize() {
    await this.loadConversations();
    this.setupWebSocket();
    this.attachEventHandlers();
  }

  private setupWebSocket() {
    wsClient.on('aiDelta', (data) => {
      this.currentStreamBuffer += data.delta;
      this.renderStreamingMessage(this.currentStreamBuffer);
    });

    wsClient.on('aiDone', (data) => {
      this.streaming = false;
      this.finalizeMessage(data.messageId);
      this.currentStreamBuffer = '';
    });

    wsClient.on('aiError', (data) => {
      this.streaming = false;
      this.showError(data.error, data.code);
    });
  }

  async sendPrompt(prompt: string) {
    if (!this.currentConversation) {
      const conv = await aiService.createConversation();
      this.currentConversation = conv.id;
    }

    this.streaming = true;
    wsClient.send('aiPrompt', {
      conversationId: this.currentConversation,
      prompt
    });

    this.addMessage('user', prompt);
    this.currentStreamBuffer = '';
  }

  cancelStream() {
    wsClient.send('aiCancel', {
      conversationId: this.currentConversation
    });
    this.streaming = false;
  }
}
```

#### 3.4 Update Main App (`src/ts/app.ts`)

**Add AI Section:**
```typescript
type SectionType = 'welcome' | 'game' | 'leaderboard' | 'profile' | 'chat' | 'settings' | 'ai-assistant';

// In navigation setup
const navAi = document.getElementById('nav-ai');
navAi?.addEventListener('click', () => showSection('ai-assistant'));
```

#### 3.5 Add HTML Markup (`src/index.html`)

**Add to navigation:**
```html
<nav>
  <!-- existing items -->
  <button id="nav-ai">AI Assistant</button>
</nav>
```

**Add section:**
```html
<section id="ai-assistant" class="hidden">
  <div class="ai-layout">
    <aside class="ai-sidebar">
      <h3>Conversations</h3>
      <button id="new-conversation">New Chat</button>
      <div id="conversation-list"></div>
    </aside>
    
    <main class="ai-main">
      <div id="ai-messages"></div>
      <div class="ai-input-container">
        <textarea id="ai-prompt" placeholder="Ask me anything..."></textarea>
        <button id="ai-send">Send</button>
        <button id="ai-stop" class="hidden">Stop</button>
      </div>
    </main>
  </div>
</section>
```

#### 3.6 Add Styles (`src/ts/css/styles.css`)

**AI-specific styles:**
```css
.ai-layout {
  display: flex;
  height: 100%;
}

.ai-sidebar {
  width: 250px;
  border-right: 1px solid #ccc;
  overflow-y: auto;
}

.ai-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

#ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.ai-message {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 8px;
}

.ai-message.user {
  background: #e3f2fd;
  text-align: right;
}

.ai-message.assistant {
  background: #f5f5f5;
}

.ai-message.streaming {
  opacity: 0.8;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.ai-input-container {
  padding: 15px;
  border-top: 1px solid #ccc;
  display: flex;
  gap: 10px;
}

#ai-prompt {
  flex: 1;
  resize: vertical;
  min-height: 60px;
}

#ai-stop {
  background: #f44336;
  color: white;
}
```

---

### Phase 4: Configuration and Environment

#### 4.1 Update Docker Compose (`docker-compose.yml`)

**Add env vars to chat-service:**
```yaml
services:
  chat-service:
    build: ./services/chat-service
    environment:
      - DATABASE_URL=file:/app/data/pong.db
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GEMINI_MODEL=gemini-1.5-flash
      - AI_MAX_INPUT_CHARS=4000
      - AI_MAX_OUTPUT_TOKENS=2048
      - AI_REQUEST_TIMEOUT_MS=30000
      - AI_RATE_LIMIT_MAX=10
      - AI_RATE_LIMIT_WINDOW=300000
    volumes:
      - ./data:/app/data
    depends_on:
      - redis
```

#### 4.2 Create .env.example

```env
# JWT
JWT_SECRET=your-secret-key-change-this

# Gemini API
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-flash

# AI Limits
AI_MAX_INPUT_CHARS=4000
AI_MAX_OUTPUT_TOKENS=2048
AI_REQUEST_TIMEOUT_MS=30000
AI_RATE_LIMIT_MAX=10
AI_RATE_LIMIT_WINDOW=300000
```

#### 4.3 Update .gitignore

```
.env
```

**Never commit API keys!**

---

## 🧪 Testing Plan

### Manual Testing

#### Test 1: Basic AI Conversation
1. Start services: `make up` (or `docker-compose up`)
2. Open browser: `https://localhost:8443`
3. Log in with test user
4. Navigate to "AI Assistant"
5. Type: "Hello, who are you?"
6. Verify:
   - Message appears in chat (user side)
   - AI response streams word-by-word
   - Response finishes with checkmark or indicator
7. Send follow-up: "Tell me about Pong game"
8. Verify conversation context maintained

#### Test 2: Streaming Cancellation
1. Send long prompt: "Write a 500-word essay about game development"
2. Wait 2 seconds
3. Click "Stop" button
4. Verify:
   - Streaming stops
   - Partial response visible
   - No error message (graceful stop)

#### Test 3: Rate Limiting
1. Send 10 AI prompts rapidly (within 1 minute)
2. On 11th prompt, verify:
   - Error message: "Too many requests"
   - Error code displayed (if shown in UI)
   - Suggestion to wait
3. Wait 5 minutes
4. Send prompt again → Should succeed

#### Test 4: Error Handling
1. **Invalid token:**
   - Clear JWT from localStorage
   - Try sending prompt → Should see auth error
2. **Timeout:**
   - Reduce `AI_REQUEST_TIMEOUT_MS` to 1000
   - Send complex prompt → Should timeout
3. **Invalid API key:**
   - Set wrong `GEMINI_API_KEY`
   - Send prompt → Should see "Service unavailable"

#### Test 5: Conversation Persistence
1. Create conversation, send 3 messages
2. Close browser tab
3. Reopen, navigate to AI Assistant
4. Verify:
   - Conversation still in list
   - Messages loaded correctly
   - Can continue conversation

### Automated Testing (Optional)

**Integration Tests (Vitest + Supertest):**
```typescript
describe('AI Chat Service', () => {
  it('should create conversation and stream response', async () => {
    const ws = new WebSocket('wss://localhost:8443/api/chat/ws?token=...');
    
    ws.send(JSON.stringify({
      type: 'aiPrompt',
      prompt: 'Hello'
    }));

    const deltas: string[] = [];
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'aiDelta') deltas.push(msg.delta);
      if (msg.type === 'aiDone') {
        expect(deltas.length).toBeGreaterThan(0);
        expect(deltas.join('')).toContain('hello');
      }
    };
  });
});
```

---

## 🚀 Demo Script for Evaluation

### Preparation
1. Ensure `.env` has valid `GEMINI_API_KEY`
2. Start services: `make up` or `docker-compose up -d`
3. Verify all services healthy:
   - `curl http://localhost:3004/health`
4. Clear browser cache/cookies
5. Open DevTools (Network tab, filter WS)

### Demo Flow

**Part 1: Show Architecture (2 min)**
1. Open `IMPLEMENTATION_PLAN.md` in editor
2. Highlight architecture diagram
3. Explain: "Frontend connects via WebSocket to chat-service, which streams from Gemini"

**Part 2: Show Code (3 min)**
1. **Gemini Client:**
   - Open `services/chat-service/src/lib/gemini.ts`
   - Show `generateContentStream` function
2. **WebSocket Handler:**
   - Open `services/chat-service/src/routes/websocket.ts`
   - Show `handleAiPrompt` case in message router
3. **Database Schema:**
   - Open `services/shared/prisma/schema.prisma`
   - Show `AiConversation` and `AiMessage` models

**Part 3: Live Demo (5 min)**
1. **Initial conversation:**
   - Navigate to AI Assistant page
   - Show empty state / conversation list
   - Type: "Explain the Pong game rules in simple terms"
   - **Point out:** Text appearing progressively
   - Show DevTools: WS frames with `aiDelta` events
2. **Follow-up (context):**
   - Ask: "What strategies help beginners win?"
   - **Point out:** AI remembers we're talking about Pong
3. **Stream cancellation:**
   - Ask: "Write a 1000-word history of video games"
   - Wait 3 seconds
   - Click "Stop"
   - **Point out:** Stream stops gracefully
4. **Rate limiting:**
   - Spam click "Send" 10+ times
   - **Point out:** Error message after limit
   - Show Redis key: `redis-cli GET ai:1` (rate limit counter)
5. **Persistence:**
   - Refresh browser
   - **Point out:** Conversation history loaded
   - Show database: `sqlite3 data/pong.db "SELECT * FROM ai_conversations;"`

**Part 4: Error Handling (2 min)**
1. Open DevTools Console
2. Simulate network error (throttle to offline in DevTools)
3. Send prompt
4. **Point out:** Error handling (reconnection attempt, user message)
5. Restore network → Send prompt → Works

**Part 5: Security (1 min)**
1. Open DevTools Network tab
2. Show WS messages
3. **Point out:** No API key visible in frontend
4. Show backend logs: `docker logs transcendence-chat-service`
5. **Point out:** API key only in server-side logs (if at all)

### Questions to Anticipate

**Q: Why use WebSockets instead of HTTP streaming?**
A: WebSockets allow bidirectional communication (send prompts, cancel streams) and reuse connection for multiple requests. HTTP Server-Sent Events are one-way.

**Q: How do you prevent API key leaks?**
A: API key stored as environment variable, only accessed server-side. Frontend never receives it. Nginx proxies all requests.

**Q: What if Gemini API is down?**
A: Errors caught, mapped to user-friendly messages. Service degrades gracefully—chat still works, just AI unavailable.

**Q: How do you handle concurrent requests?**
A: Each user's stream tracked separately in memory Map. Rate limiting prevents abuse. Redis ensures limits work across multiple service instances.

**Q: Can users see each other's conversations?**
A: No. Every query checks `conversation.userId === JWT.id`. Prisma WHERE clauses enforce ownership.

---

## ✅ Acceptance Criteria

### Functionality
- [x] User can send prompt and receive streamed AI response
- [x] User can cancel in-progress stream
- [x] Conversations persisted in database
- [x] Conversation history loaded on page load
- [x] Multiple conversations supported (user can create new chats)

### Performance
- [x] First chunk arrives <2 seconds after prompt sent
- [x] UI remains responsive during streaming
- [x] Rate limiting prevents more than 10 requests per 5 min

### Security
- [x] GEMINI_API_KEY never exposed to frontend
- [x] JWT required for all AI requests
- [x] User can only access own conversations
- [x] Input validated (max length, no XSS)

### Error Handling
- [x] Timeout errors shown to user
- [x] Rate limit errors shown with retry guidance
- [x] Network errors trigger reconnection
- [x] Invalid API key doesn't crash service

### Code Quality
- [x] TypeScript types for all message schemas
- [x] Prisma migrations applied without data loss
- [x] No hardcoded secrets in code
- [x] Error logging includes context (user ID, conversation ID)

### Documentation
- [x] README explains architecture
- [x] Code comments for complex logic
- [x] Environment variables documented in .env.example

---

## 📦 File Checklist

### Backend
- [x] `services/chat-service/package.json` (add deps)
- [x] `services/chat-service/src/lib/gemini.ts` (Gemini client)
- [x] `services/chat-service/src/lib/rateLimiter.ts` (rate limit config)
- [x] `services/chat-service/src/routes/websocket.ts` (add AI handlers)
- [x] `services/chat-service/src/routes/ai.ts` (HTTP endpoints)
- [x] `services/shared/prisma/schema.prisma` (add models)

### Frontend
- [x] `frontend/src/ts/services/WebSocketClient.ts` (WS wrapper)
- [x] `frontend/src/ts/services/AiService.ts` (AI HTTP API)
- [x] `frontend/src/ts/pages/AiAssistant.ts` (AI page logic)
- [x] `frontend/src/ts/app.ts` (add nav + section)
- [x] `frontend/src/index.html` (add markup)
- [x] `frontend/src/ts/css/styles.css` (add styles)

### Configuration
- [x] `docker-compose.yml` (add env vars)
- [x] `.env.example` (document vars)
- [x] `.gitignore` (exclude .env)

### Documentation
- [x] `docs/ai-major/README.md` (overview)
- [x] `docs/ai-major/IMPLEMENTATION_PLAN.md` (this file)
- [x] `docs/ai-major/CODEBASE_ANALYSIS.md` (analysis)
- [x] `docs/ai-major/CLICKUP_BREAKDOWN.md` (ClickUp structure)

---

## 🎓 Learning Resources

### Gemini API
- [Gemini API Quickstart](https://ai.google.dev/tutorials/get_started_node)
- [Streaming Documentation](https://ai.google.dev/api/generate-content#v1beta.models.streamGenerateContent)
- [Rate Limits](https://ai.google.dev/pricing)

### WebSockets
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Fastify WebSocket Plugin](https://github.com/fastify/fastify-websocket)

### Prisma
- [Prisma Schema](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

### Rate Limiting
- [Fastify Rate Limit](https://github.com/fastify/fastify-rate-limit)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)

---

## 🐛 Troubleshooting

### Issue: "Invalid API key" error
**Solution:**
1. Verify `GEMINI_API_KEY` in `.env`
2. Check API key validity at https://aistudio.google.com/apikey
3. Ensure environment variable loaded: `docker-compose config | grep GEMINI`

### Issue: WebSocket connection fails
**Solution:**
1. Check JWT token in localStorage
2. Verify nginx routing: `curl -i -N -H "Upgrade: websocket" https://localhost:8443/api/chat/ws`
3. Check chat-service logs: `docker logs transcendence-chat-service`

### Issue: Rate limit not working
**Solution:**
1. Verify Redis connection: `docker exec -it transcendence-redis redis-cli ping`
2. Check rate limit key: `redis-cli KEYS "ai:*"`
3. Ensure rate limit registered in Fastify: Check startup logs

### Issue: Streaming very slow
**Solution:**
1. Switch model to `gemini-1.5-flash` (faster than pro)
2. Reduce `maxOutputTokens` parameter
3. Check network latency to Gemini API

### Issue: Database migration fails
**Solution:**
1. Check SQLite file permissions: `ls -la data/pong.db`
2. Ensure no services writing during migration
3. Manual rollback: `prisma migrate resolve --rolled-back <migration-name>`

---

## 📝 Next Steps After Implementation

1. **Optimize prompts:** Add system instructions for better responses
2. **Add features:**
   - Conversation titles auto-generated from first message
   - Export conversation as markdown
   - Share conversation (public link)
3. **Monitor usage:**
   - Log token consumption
   - Track rate limit hits
   - Alert on high error rates
4. **Scale considerations:**
   - If >1000 users, consider Gemini 1.5 Pro for quality
   - Implement conversation archiving (delete old convos)
   - Add caching for common queries

---

**End of Implementation Plan**
