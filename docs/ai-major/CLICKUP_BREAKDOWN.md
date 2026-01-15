# ClickUp Project Structure for AI Major

**Created:** January 14, 2026  
**Project:** Transcendence AI Assistant - Gemini Integration  
**Purpose:** Breakdown of ClickUp folder, lists, tasks, and documentation for tracking implementation  

---

## Folder Structure

```
📁 Transcendence AI Assistant Gemini
│
├── 📋 Overview and Docs
│   ├── 📄 Implementation Plan Document (ClickUp Doc)
│   └── ✅ Tasks for documentation review
│
├── 📋 Backend: Chat Service
│   ├── ✅ Install dependencies (@google/generative-ai, @fastify/rate-limit)
│   ├── ✅ Create Gemini client module (lib/gemini.ts)
│   ├── ✅ Configure rate limiting (lib/rateLimiter.ts)
│   ├── ✅ Extend WebSocket handler with AI message types
│   ├── ✅ Add HTTP endpoints for conversation management
│   └── ✅ Add environment variables and Docker config
│
├── 📋 Database: Prisma
│   ├── ✅ Add AiConversation model to schema
│   ├── ✅ Add AiMessage model to schema
│   ├── ✅ Create and apply migration
│   └── ✅ Regenerate Prisma client
│
├── 📋 Frontend: UI
│   ├── ✅ Create WebSocket client wrapper
│   ├── ✅ Create AI Service (HTTP API wrapper)
│   ├── ✅ Create AI Assistant page component
│   ├── ✅ Update main app navigation
│   ├── ✅ Add HTML markup for AI section
│   └── ✅ Add CSS styles for AI chat UI
│
├── 📋 Nginx and Infra
│   ├── ✅ Verify WebSocket proxy config (already done)
│   ├── ✅ Update docker-compose.yml with env vars
│   └── ✅ Create .env.example documentation
│
└── 📋 Testing and Demo
    ├── ✅ Manual test: Basic conversation
    ├── ✅ Manual test: Stream cancellation
    ├── ✅ Manual test: Rate limiting
    ├── ✅ Manual test: Error handling
    ├── ✅ Manual test: Conversation persistence
    └── ✅ Prepare demo script for evaluation
```

---

## Lists and Tasks Detail

### List 1: Overview and Docs

**Purpose:** Central documentation hub and project overview

#### Task 1.1: Create Implementation Plan Document
- **Description:** Write comprehensive implementation plan in ClickUp Doc
- **Priority:** High
- **Time Estimate:** 30 minutes
- **Acceptance Criteria:**
  - [ ] Doc contains beginner-friendly explanations
  - [ ] Architecture diagram included
  - [ ] All phases documented
  - [ ] Demo script included
- **Checklist:**
  - [ ] Copy content from IMPLEMENTATION_PLAN.md
  - [ ] Format with ClickUp rich text
  - [ ] Add diagrams/images if helpful
  - [ ] Link to related tasks

#### Task 1.2: Review Codebase Analysis
- **Description:** Ensure codebase analysis is accurate and complete
- **Priority:** Medium
- **Time Estimate:** 15 minutes
- **Acceptance Criteria:**
  - [ ] All file paths verified
  - [ ] WebSocket schema documented
  - [ ] JWT patterns identified
- **Dependencies:** None (already complete)

---

### List 2: Backend: Chat Service

**Purpose:** Implement server-side AI streaming and rate limiting

#### Task 2.1: Install Dependencies
- **Description:** Add Gemini SDK and rate limiting plugin to package.json
- **Priority:** High
- **Time Estimate:** 5 minutes
- **Commands:**
  ```bash
  cd services/chat-service
  npm install @google/generative-ai @fastify/rate-limit
  ```
- **Acceptance Criteria:**
  - [ ] `@google/generative-ai` in dependencies
  - [ ] `@fastify/rate-limit` in dependencies
  - [ ] `package-lock.json` updated
- **Files Modified:**
  - `services/chat-service/package.json`

#### Task 2.2: Create Gemini Client Module
- **Description:** Wrapper for Gemini API with streaming support
- **Priority:** High
- **Time Estimate:** 1 hour
- **File:** `services/chat-service/src/lib/gemini.ts`
- **Acceptance Criteria:**
  - [ ] `getGeminiClient()` function initializes client
  - [ ] `generateContentStream()` handles streaming
  - [ ] Timeout handling implemented
  - [ ] Error mapping (Gemini errors → user messages)
  - [ ] Environment variables used (GEMINI_API_KEY, model, limits)
- **Checklist:**
  - [ ] Import `@google/generative-ai`
  - [ ] Validate GEMINI_API_KEY on init
  - [ ] Implement streaming with async iterator
  - [ ] Add timeout wrapper
  - [ ] Map common errors (429, 500, timeout)
  - [ ] Add TypeScript types for responses
- **Dependencies:** Task 2.1 (install deps)

#### Task 2.3: Configure Rate Limiting
- **Description:** Set up per-user and per-IP rate limiting for AI requests
- **Priority:** High
- **Time Estimate:** 45 minutes
- **File:** `services/chat-service/src/lib/rateLimiter.ts`
- **Acceptance Criteria:**
  - [ ] Per-user limit: 10 req / 5 min (JWT-based)
  - [ ] Per-IP fallback: 5 req / 5 min
  - [ ] Redis storage configured
  - [ ] Custom error response builder
- **Checklist:**
  - [ ] Import Redis client
  - [ ] Create `aiRateLimitConfig` object
  - [ ] Implement `keyGenerator` (JWT.id or IP)
  - [ ] Set max, timeWindow from env
  - [ ] Add `errorResponseBuilder`
  - [ ] Export config for use in routes
- **Dependencies:** Task 2.1

#### Task 2.4: Extend WebSocket Handler with AI Message Types
- **Description:** Add routing for aiPrompt, aiCancel events
- **Priority:** High
- **Time Estimate:** 2 hours
- **File:** `services/chat-service/src/routes/websocket.ts`
- **Acceptance Criteria:**
  - [ ] Message type router added (switch statement)
  - [ ] `handleAiPrompt` function implemented
  - [ ] `handleAiCancel` function implemented
  - [ ] Rate limiting applied before processing
  - [ ] Ownership verification (conversation.userId === JWT.id)
  - [ ] Streaming chunks sent as `aiDelta` events
  - [ ] Final message persisted and `aiDone` sent
  - [ ] Errors caught and `aiError` sent
- **Checklist:**
  - [ ] Add message router in `connection.on('message')`
  - [ ] Validate prompt payload (exists, length <4000)
  - [ ] Check rate limit (manual or via decorator)
  - [ ] Load/create conversation
  - [ ] Verify user owns conversation
  - [ ] Save user message to DB
  - [ ] Call `geminiClient.generateContentStream()`
  - [ ] Loop chunks and send `aiDelta` per chunk
  - [ ] Accumulate full response text
  - [ ] Save assistant message to DB
  - [ ] Send `aiDone` with messageId and token count
  - [ ] Handle cancellation (abort stream)
  - [ ] Error handling with user-safe messages
- **Dependencies:** Task 2.2, 2.3

#### Task 2.5: Add HTTP Endpoints for Conversation Management
- **Description:** REST API for listing, creating, deleting conversations
- **Priority:** Medium
- **Time Estimate:** 1.5 hours
- **File:** `services/chat-service/src/routes/ai.ts` (new file)
- **Endpoints:**
  - GET `/api/chat/ai/conversations` → List user conversations
  - GET `/api/chat/ai/conversations/:id` → Get messages
  - POST `/api/chat/ai/conversations` → Create new conversation
  - DELETE `/api/chat/ai/conversations/:id` → Delete conversation
  - PATCH `/api/chat/ai/conversations/:id` → Update title
- **Acceptance Criteria:**
  - [ ] All endpoints require JWT authentication
  - [ ] Ownership verified for read/update/delete
  - [ ] Proper HTTP status codes (200, 201, 401, 403, 404)
  - [ ] Conversations ordered by `updatedAt` DESC
- **Checklist:**
  - [ ] Create new route file
  - [ ] Import Prisma client and authenticate hook
  - [ ] Implement GET conversations (with message preview)
  - [ ] Implement GET conversation/:id (full messages)
  - [ ] Implement POST conversation (create)
  - [ ] Implement DELETE conversation (ownership check)
  - [ ] Implement PATCH conversation (update title)
  - [ ] Register routes in `src/index.ts`
- **Dependencies:** None (uses existing Prisma models after Task 3)

#### Task 2.6: Add Environment Variables and Docker Config
- **Description:** Configure env vars for Gemini API and limits
- **Priority:** High
- **Time Estimate:** 20 minutes
- **Files Modified:**
  - `docker-compose.yml`
  - `.env.example`
  - `services/chat-service/Dockerfile` (if needed)
- **Environment Variables:**
  ```env
  GEMINI_API_KEY=<key>
  GEMINI_MODEL=gemini-1.5-flash
  AI_MAX_INPUT_CHARS=4000
  AI_MAX_OUTPUT_TOKENS=2048
  AI_REQUEST_TIMEOUT_MS=30000
  AI_RATE_LIMIT_MAX=10
  AI_RATE_LIMIT_WINDOW=300000
  ```
- **Acceptance Criteria:**
  - [ ] Env vars added to chat-service in docker-compose.yml
  - [ ] .env.example documented
  - [ ] .gitignore includes .env
  - [ ] No secrets committed to git
- **Checklist:**
  - [ ] Update docker-compose.yml chat-service environment section
  - [ ] Create/update .env.example
  - [ ] Verify .gitignore excludes .env
  - [ ] Test with `docker-compose config` (shows interpolated values)
- **Dependencies:** None

---

### List 3: Database: Prisma

**Purpose:** Add AI conversation and message models to schema

#### Task 3.1: Add AiConversation Model to Schema
- **Description:** Define conversation model with user relation
- **Priority:** High
- **Time Estimate:** 20 minutes
- **File:** `services/shared/prisma/schema.prisma`
- **Model Definition:**
  ```prisma
  model AiConversation {
    id        Int      @id @default(autoincrement())
    userId    Int      @map("user_id")
    title     String   @default("New Conversation")
    createdAt DateTime @default(now()) @map("created_at")
    updatedAt DateTime @updatedAt @map("updated_at")
    
    user     User         @relation("UserAiConversations", fields: [userId], references: [id], onDelete: Cascade)
    messages AiMessage[]
    
    @@index([userId])
    @@index([updatedAt])
    @@map("ai_conversations")
  }
  ```
- **Acceptance Criteria:**
  - [ ] Model added to schema
  - [ ] User relation defined
  - [ ] Indexes on userId and updatedAt
  - [ ] Cascade delete configured
- **Checklist:**
  - [ ] Open schema file
  - [ ] Add model below existing models
  - [ ] Define fields with correct types
  - [ ] Add relation to User
  - [ ] Add indexes
  - [ ] Use snake_case mapping
- **Dependencies:** None

#### Task 3.2: Add AiMessage Model to Schema
- **Description:** Define message model with conversation relation
- **Priority:** High
- **Time Estimate:** 15 minutes
- **File:** `services/shared/prisma/schema.prisma`
- **Model Definition:**
  ```prisma
  model AiMessage {
    id             Int      @id @default(autoincrement())
    conversationId Int      @map("conversation_id")
    role           String   // 'user' or 'assistant'
    content        String
    tokens         Int?
    createdAt      DateTime @default(now()) @map("created_at")
    
    conversation AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
    
    @@index([conversationId, createdAt])
    @@map("ai_messages")
  }
  ```
- **Acceptance Criteria:**
  - [ ] Model added to schema
  - [ ] Conversation relation defined
  - [ ] Composite index on conversationId + createdAt
  - [ ] Cascade delete configured
- **Checklist:**
  - [ ] Add model below AiConversation
  - [ ] Define fields
  - [ ] Add relation to AiConversation
  - [ ] Add composite index
  - [ ] Use snake_case mapping
- **Dependencies:** Task 3.1

#### Task 3.3: Update User Model with AI Relation
- **Description:** Add aiConversations relation to User model
- **Priority:** High
- **Time Estimate:** 5 minutes
- **File:** `services/shared/prisma/schema.prisma`
- **Change:**
  ```prisma
  model User {
    // ... existing fields ...
    aiConversations AiConversation[] @relation("UserAiConversations")
  }
  ```
- **Acceptance Criteria:**
  - [ ] Relation added to User model
  - [ ] Relation name matches AiConversation definition
- **Dependencies:** Task 3.1

#### Task 3.4: Create and Apply Migration
- **Description:** Generate SQL migration and apply to database
- **Priority:** High
- **Time Estimate:** 10 minutes
- **Commands:**
  ```bash
  cd services/shared/prisma
  npx prisma migrate dev --name add_ai_models
  ```
- **Acceptance Criteria:**
  - [ ] Migration file created in `migrations/` folder
  - [ ] Migration applied to SQLite database
  - [ ] No errors during migration
  - [ ] Tables created: ai_conversations, ai_messages
- **Checklist:**
  - [ ] Stop services if running
  - [ ] Run migration command
  - [ ] Review generated SQL
  - [ ] Verify migration success
  - [ ] Check database with `sqlite3 ../../data/pong.db ".schema ai_conversations"`
- **Dependencies:** Task 3.1, 3.2, 3.3

#### Task 3.5: Regenerate Prisma Client
- **Description:** Update TypeScript types for new models
- **Priority:** High
- **Time Estimate:** 5 minutes
- **Command:**
  ```bash
  cd services/shared/prisma
  npx prisma generate
  ```
- **Acceptance Criteria:**
  - [ ] Prisma client regenerated
  - [ ] TypeScript types include AiConversation and AiMessage
  - [ ] No build errors in services
- **Checklist:**
  - [ ] Run generate command
  - [ ] Verify types in `node_modules/@prisma/client`
  - [ ] Test import in chat-service: `import { AiConversation } from '@prisma/client'`
- **Dependencies:** Task 3.4

---

### List 4: Frontend: UI

**Purpose:** Build AI chat interface with streaming support

#### Task 4.1: Create WebSocket Client Wrapper
- **Description:** Reusable WS client with reconnection and event handling
- **Priority:** High
- **Time Estimate:** 1 hour
- **File:** `frontend/src/ts/services/WebSocketClient.ts` (new file)
- **Acceptance Criteria:**
  - [ ] Class with connect, send, on methods
  - [ ] Auto-reconnect on disconnect
  - [ ] Event emitter pattern for message types
  - [ ] Connection state tracking (connecting, connected, disconnected)
  - [ ] JWT token passed in query param
- **Checklist:**
  - [ ] Create new file
  - [ ] Define WebSocketClient class
  - [ ] Implement connect(token) method
  - [ ] Implement send(type, payload) method
  - [ ] Implement on(type, callback) for listeners
  - [ ] Handle onopen, onmessage, onerror, onclose
  - [ ] Add reconnection logic with exponential backoff
  - [ ] Export singleton instance
- **Dependencies:** None

#### Task 4.2: Create AI Service (HTTP API Wrapper)
- **Description:** Service class for conversation management API
- **Priority:** Medium
- **Time Estimate:** 45 minutes
- **File:** `frontend/src/ts/services/AiService.ts` (new file)
- **Methods:**
  - `getConversations()` → GET /api/chat/ai/conversations
  - `getMessages(conversationId)` → GET /api/chat/ai/conversations/:id
  - `createConversation(title?)` → POST /api/chat/ai/conversations
  - `deleteConversation(conversationId)` → DELETE /api/chat/ai/conversations/:id
  - `updateConversation(conversationId, title)` → PATCH /api/chat/ai/conversations/:id
- **Acceptance Criteria:**
  - [ ] All methods use fetch API
  - [ ] JWT token included in Authorization header
  - [ ] Error handling for network failures
  - [ ] Response JSON parsing
- **Checklist:**
  - [ ] Create new file
  - [ ] Define AiService class
  - [ ] Implement each method
  - [ ] Add helper for Authorization header
  - [ ] Handle 401 (redirect to login)
  - [ ] Export singleton instance
- **Dependencies:** None (uses standard fetch)

#### Task 4.3: Create AI Assistant Page Component
- **Description:** Main UI logic for AI chat interface
- **Priority:** High
- **Time Estimate:** 2.5 hours
- **File:** `frontend/src/ts/pages/AiAssistant.ts` (new file)
- **Features:**
  - Conversation list sidebar
  - Message history display
  - Prompt input with send button
  - Streaming text renderer
  - Stop button for cancellation
  - Loading and error states
- **Acceptance Criteria:**
  - [ ] Initialize method loads conversations
  - [ ] WebSocket listeners for aiDelta, aiDone, aiError
  - [ ] sendPrompt method validates and sends aiPrompt
  - [ ] cancelStream method sends aiCancel
  - [ ] UI updates in real-time as chunks arrive
  - [ ] Conversation switching loads message history
- **Checklist:**
  - [ ] Create new file
  - [ ] Define AiAssistantPage class
  - [ ] Add state properties (currentConversation, messages, streaming, streamBuffer)
  - [ ] Implement initialize() method
  - [ ] Implement loadConversations()
  - [ ] Implement selectConversation(id)
  - [ ] Implement sendPrompt(prompt)
  - [ ] Implement cancelStream()
  - [ ] Add WS listeners (aiDelta, aiDone, aiError)
  - [ ] Implement renderConversations()
  - [ ] Implement renderMessages()
  - [ ] Implement renderStreamingMessage(buffer)
  - [ ] Implement showError(message, code)
  - [ ] Export init function
- **Dependencies:** Task 4.1, 4.2

#### Task 4.4: Update Main App Navigation
- **Description:** Add AI Assistant to navigation and section routing
- **Priority:** High
- **Time Estimate:** 20 minutes
- **File:** `frontend/src/ts/app.ts`
- **Changes:**
  - Add 'ai-assistant' to SectionType union
  - Add nav button listener
  - Import and initialize AiAssistantPage
- **Acceptance Criteria:**
  - [ ] 'ai-assistant' section type added
  - [ ] Nav button listener attached
  - [ ] showSection('ai-assistant') works
  - [ ] AI page initializes on first view
- **Checklist:**
  - [ ] Update SectionType type definition
  - [ ] Import AiAssistantPage
  - [ ] Add nav listener: `navAi?.addEventListener('click', () => showSection('ai-assistant'))`
  - [ ] Call AiAssistantPage.initialize() in showSection when section === 'ai-assistant'
- **Dependencies:** Task 4.3

#### Task 4.5: Add HTML Markup for AI Section
- **Description:** Add navigation button and AI chat section HTML
- **Priority:** High
- **Time Estimate:** 30 minutes
- **File:** `frontend/src/index.html`
- **Elements:**
  - Nav button: `<button id="nav-ai">AI Assistant</button>`
  - Section: `<section id="ai-assistant" class="hidden">`
  - Sidebar: conversation list + new chat button
  - Main area: messages container + input form
- **Acceptance Criteria:**
  - [ ] Nav button in navigation bar
  - [ ] AI section with proper structure
  - [ ] All IDs match JavaScript references
  - [ ] Initially hidden with `class="hidden"`
- **Checklist:**
  - [ ] Add nav button to navigation
  - [ ] Create section with id="ai-assistant"
  - [ ] Add sidebar div with id="ai-sidebar"
  - [ ] Add conversation list div with id="conversation-list"
  - [ ] Add new chat button with id="new-conversation"
  - [ ] Add main area div with id="ai-main"
  - [ ] Add messages container with id="ai-messages"
  - [ ] Add input form with textarea, send, stop buttons
  - [ ] Verify all IDs match TypeScript selectors
- **Dependencies:** None

#### Task 4.6: Add CSS Styles for AI Chat UI
- **Description:** Style AI assistant page for clean, modern look
- **Priority:** Medium
- **Time Estimate:** 45 minutes
- **File:** `frontend/src/ts/css/styles.css`
- **Styles Needed:**
  - Layout: flexbox for sidebar + main area
  - Sidebar: fixed width, scrollable conversation list
  - Messages: alternating user/assistant styling
  - Streaming animation: pulse effect
  - Input area: sticky bottom, textarea + buttons
  - Responsive: mobile-friendly layout
- **Acceptance Criteria:**
  - [ ] Layout works on desktop and mobile
  - [ ] User and assistant messages visually distinct
  - [ ] Streaming animation visible
  - [ ] Input area always accessible
  - [ ] Scrollable message history
- **Checklist:**
  - [ ] Add `.ai-layout` with flexbox
  - [ ] Style `.ai-sidebar` (width, border, overflow)
  - [ ] Style `.ai-main` (flex: 1, flex-direction: column)
  - [ ] Style `#ai-messages` (overflow-y, padding)
  - [ ] Add `.ai-message` base styles
  - [ ] Add `.ai-message.user` (right-aligned, blue bg)
  - [ ] Add `.ai-message.assistant` (left-aligned, gray bg)
  - [ ] Add `.ai-message.streaming` with pulse animation
  - [ ] Style `.ai-input-container` (sticky bottom, flex)
  - [ ] Style textarea and buttons
  - [ ] Add media query for mobile (<768px)
- **Dependencies:** Task 4.5 (HTML structure)

---

### List 5: Nginx and Infra

**Purpose:** Configure infrastructure and environment

#### Task 5.1: Verify WebSocket Proxy Config
- **Description:** Confirm nginx already proxies WS correctly
- **Priority:** Low
- **Time Estimate:** 10 minutes
- **File:** `nginx/nginx.conf`
- **Check:**
  - Upgrade header passed
  - Connection header set to "upgrade"
  - Proxy to chat-service:3004
- **Acceptance Criteria:**
  - [ ] Existing config supports WebSocket
  - [ ] No changes needed (already correct)
- **Checklist:**
  - [ ] Review nginx.conf `/api/chat/` location
  - [ ] Verify `proxy_set_header Upgrade $http_upgrade`
  - [ ] Verify `proxy_set_header Connection "upgrade"`
  - [ ] Test WS connection manually
- **Dependencies:** None (informational task)

#### Task 5.2: Update docker-compose.yml with Env Vars
- **Description:** Add Gemini and AI config to chat-service
- **Priority:** High
- **Time Estimate:** 15 minutes
- **File:** `docker-compose.yml`
- **Environment Variables:** (see Task 2.6)
- **Acceptance Criteria:**
  - [ ] All AI env vars added
  - [ ] Variables reference .env file
  - [ ] No secrets hardcoded
- **Checklist:**
  - [ ] Open docker-compose.yml
  - [ ] Find chat-service section
  - [ ] Add GEMINI_API_KEY=${GEMINI_API_KEY}
  - [ ] Add other AI env vars with defaults
  - [ ] Save and test with `docker-compose config`
- **Dependencies:** None

#### Task 5.3: Create .env.example Documentation
- **Description:** Document all environment variables
- **Priority:** Medium
- **Time Estimate:** 10 minutes
- **File:** `.env.example` (root directory)
- **Content:**
  - JWT_SECRET
  - GEMINI_API_KEY (with instructions to get key)
  - All AI config vars with defaults
- **Acceptance Criteria:**
  - [ ] All variables documented
  - [ ] Instructions for obtaining Gemini API key
  - [ ] Sensible defaults provided
- **Checklist:**
  - [ ] Create or update .env.example
  - [ ] Add comment explaining each variable
  - [ ] Add link to Gemini API key signup
  - [ ] Note which vars are required vs optional
- **Dependencies:** None

---

### List 6: Testing and Demo

**Purpose:** Validate functionality and prepare evaluation demo

#### Task 6.1: Manual Test - Basic Conversation
- **Description:** End-to-end test of AI chat functionality
- **Priority:** High
- **Time Estimate:** 15 minutes
- **Test Steps:**
  1. Start services
  2. Log in as test user
  3. Navigate to AI Assistant
  4. Send prompt: "Hello, who are you?"
  5. Verify streaming response
  6. Send follow-up: "Tell me about Pong"
  7. Verify context maintained
- **Acceptance Criteria:**
  - [ ] Messages sent successfully
  - [ ] Responses stream word-by-word
  - [ ] Conversation persisted in DB
  - [ ] No errors in console
- **Dependencies:** All backend and frontend tasks complete

#### Task 6.2: Manual Test - Stream Cancellation
- **Description:** Test stop button functionality
- **Priority:** High
- **Time Estimate:** 10 minutes
- **Test Steps:**
  1. Send long prompt: "Write 500-word essay on game dev"
  2. Wait 2 seconds
  3. Click "Stop" button
  4. Verify stream stops
  5. Check partial response visible
- **Acceptance Criteria:**
  - [ ] Stream stops immediately
  - [ ] Partial text displayed
  - [ ] No error message
  - [ ] Can send new prompt after stop
- **Dependencies:** Task 6.1

#### Task 6.3: Manual Test - Rate Limiting
- **Description:** Test rate limit enforcement
- **Priority:** High
- **Time Estimate:** 10 minutes
- **Test Steps:**
  1. Send 10 prompts rapidly
  2. Attempt 11th prompt
  3. Verify error message
  4. Wait 5 minutes
  5. Send prompt again
  6. Verify success
- **Acceptance Criteria:**
  - [ ] Rate limit kicks in after 10 requests
  - [ ] Error message displayed
  - [ ] Redis key visible: `redis-cli GET ai:1`
  - [ ] Limit resets after time window
- **Dependencies:** Task 6.1

#### Task 6.4: Manual Test - Error Handling
- **Description:** Test error scenarios
- **Priority:** Medium
- **Time Estimate:** 20 minutes
- **Test Scenarios:**
  1. Invalid JWT (clear localStorage)
  2. Timeout (reduce timeout env var)
  3. Invalid API key (wrong GEMINI_API_KEY)
  4. Network error (throttle connection)
- **Acceptance Criteria:**
  - [ ] Each error shows user-friendly message
  - [ ] No stack traces visible to user
  - [ ] Server logs contain full error details
  - [ ] Service doesn't crash
- **Dependencies:** Task 6.1

#### Task 6.5: Manual Test - Conversation Persistence
- **Description:** Test data persistence across sessions
- **Priority:** Medium
- **Time Estimate:** 10 minutes
- **Test Steps:**
  1. Create conversation, send 3 messages
  2. Close browser tab
  3. Reopen, navigate to AI Assistant
  4. Verify conversation in list
  5. Click conversation
  6. Verify messages loaded
  7. Send new message
  8. Verify conversation continues
- **Acceptance Criteria:**
  - [ ] Conversations persist
  - [ ] Messages loaded correctly
  - [ ] Can resume conversation
  - [ ] Database entries correct
- **Dependencies:** Task 6.1

#### Task 6.6: Prepare Demo Script for Evaluation
- **Description:** Finalize demo script with talking points
- **Priority:** High
- **Time Estimate:** 30 minutes
- **Output:** Demo section in IMPLEMENTATION_PLAN.md (already written)
- **Checklist:**
  - [ ] Review demo script
  - [ ] Practice demo flow (10 min target)
  - [ ] Prepare test prompts
  - [ ] Prepare DevTools views (WS frames, Redis)
  - [ ] Prepare database query examples
  - [ ] Anticipate evaluation questions
- **Acceptance Criteria:**
  - [ ] Demo script complete
  - [ ] Can execute demo in <10 minutes
  - [ ] All features demonstrated
- **Dependencies:** All testing tasks complete

---

## ClickUp Document Content

**Document Title:** AI Major Implementation Plan

**Location:** In "Overview and Docs" list

**Content:** Full text of IMPLEMENTATION_PLAN.md with:
- Beginner explanations
- Architecture diagram
- Data model details
- Implementation phases
- Test plan
- Demo script

**Purpose:** Central reference for all team members and evaluators

---

## Task Dependencies Visualization

```
Phase 1: Documentation
├─ Task 1.1: Create Implementation Plan Doc
└─ Task 1.2: Review Codebase Analysis

Phase 2: Backend (parallel after deps installed)
├─ Task 2.1: Install Dependencies
│   ├─> Task 2.2: Create Gemini Client
│   └─> Task 2.3: Configure Rate Limiting
│       └─> Task 2.4: Extend WebSocket Handler
├─ Task 2.5: Add HTTP Endpoints (parallel)
└─ Task 2.6: Add Environment Variables (parallel)

Phase 3: Database (sequential)
├─ Task 3.1: Add AiConversation Model
├─ Task 3.2: Add AiMessage Model
├─ Task 3.3: Update User Model
├─ Task 3.4: Create and Apply Migration
└─ Task 3.5: Regenerate Prisma Client

Phase 4: Frontend (parallel after client created)
├─ Task 4.1: Create WebSocket Client
│   └─> Task 4.3: Create AI Assistant Page
│       ├─> Task 4.4: Update Main App Navigation
│       └─> Task 4.5: Add HTML Markup
│           └─> Task 4.6: Add CSS Styles
└─ Task 4.2: Create AI Service (parallel)

Phase 5: Infra (parallel)
├─ Task 5.1: Verify WebSocket Config
├─ Task 5.2: Update docker-compose
└─ Task 5.3: Create .env.example

Phase 6: Testing (sequential, after all implementation)
├─ Task 6.1: Manual Test - Basic Conversation
├─ Task 6.2: Manual Test - Stream Cancellation
├─ Task 6.3: Manual Test - Rate Limiting
├─ Task 6.4: Manual Test - Error Handling
├─ Task 6.5: Manual Test - Persistence
└─ Task 6.6: Prepare Demo Script
```

---

## Time Estimates Summary

| List | Total Hours | Tasks |
|------|-------------|-------|
| Overview and Docs | 0.75h | 2 |
| Backend: Chat Service | 6.5h | 6 |
| Database: Prisma | 1h | 5 |
| Frontend: UI | 6h | 6 |
| Nginx and Infra | 0.5h | 3 |
| Testing and Demo | 2h | 6 |
| **TOTAL** | **16.75h** | **28** |

**Note:** Estimates assume familiarity with stack. Add 50% buffer for debugging and learning.

---

## Priority Breakdown

| Priority | Count | Focus Area |
|----------|-------|------------|
| High | 18 | Core functionality, critical path |
| Medium | 8 | Polish, documentation, nice-to-have |
| Low | 2 | Verification, informational |

**Critical Path (High Priority):**
1. Install deps
2. Create Gemini client
3. Configure rate limiting
4. Extend WS handler
5. Add Prisma models
6. Run migration
7. Create frontend WS client
8. Create AI page
9. Update nav
10. Add HTML
11. Add env vars
12. Test basic functionality

---

## Success Metrics

After completing all tasks:
- [ ] User can have streaming AI conversation
- [ ] Rate limiting prevents abuse
- [ ] Conversations persisted and loadable
- [ ] Errors handled gracefully
- [ ] No secrets exposed
- [ ] Demo executable in <10 minutes
- [ ] All acceptance criteria met
- [ ] Zero critical bugs

---

**End of ClickUp Breakdown**
