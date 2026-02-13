# WebSocket Connection Lifecycle

This document details the WebSocket connection lifecycle between the components: Web (Next.js), Durable Objects (Cloudflare), and Container (Claude Agent SDK).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Cloudflare Edge                                │
│                                                                         │
│  ┌────────┐    ┌────────────┐    ┌────────────┐    ┌─────────────────┐ │
│  │ Worker │───►│  SessionDO │───►│ Sandbox DO │───►│    Container    │ │
│  │(route) │    │  (custom)  │    │ (CF built- │    │   (your app)    │ │
│  └────────┘    └────────────┘    │  in DO)    │    └─────────────────┘ │
│                      │           └────────────┘           │             │
│                      │                 │                  │             │
│               Browser WS          mounts R2          /persistent        │
│              (Hibernation)             │                  │             │
│                                        ▼                  ▼             │
│                                  ┌──────────┐      ┌──────────┐        │
│                                  │    R2    │ ───► │ Container│        │
│                                  │  Bucket  │      │Filesystem│        │
│                                  └──────────┘      └──────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

The system uses a multi-tier architecture:

1. **Web** (Next.js frontend) - User interface and WebSocket client
2. **SessionDO** (Custom Durable Object) - Connection manager, message relay, persistence logic
3. **Sandbox DO** (Cloudflare built-in) - Container lifecycle, process management, R2 mounting
4. **Container** (Claude Agent SDK server) - AI processing with Claude

---

## Durable Objects Architecture

The sandbox worker uses **two Durable Objects**:

### SessionDO (Custom - Your Code)

Your custom DO that handles session-level logic:

| Capability            | Description                                     |
| --------------------- | ----------------------------------------------- |
| Browser WebSocket     | Accepts connections with Hibernation API        |
| Message relay         | Forwards messages between browser and container |
| Message persistence   | Calls API to save messages to database          |
| R2 sync orchestration | Triggers mount/restore/sync via Sandbox DO      |
| Connection status     | Sends `connecting`/`connected` updates          |
| Content accumulation  | Aggregates assistant responses for DB           |

### Sandbox DO (Cloudflare Built-in)

Cloudflare's container runtime DO - **you cannot modify this code**:

```typescript
// This is ALL you can do with Sandbox DO
const sandbox = getSandbox(env.Sandbox, sessionId, options);

sandbox.setEnvVars({ ... });        // Set environment variables
sandbox.mountBucket(...);           // Mount R2 bucket into container
sandbox.startProcess(...);          // Start a process in container
sandbox.exec(...);                  // Execute command in container
sandbox.wsConnect(...);             // WebSocket tunnel to container port
sandbox.destroy();                  // Kill container
```

### Why Both DOs Are Needed

| Need                           | Sandbox DO | SessionDO |
| ------------------------------ | ---------- | --------- |
| Accept browser WebSocket       | ❌         | ✅        |
| Hibernation API                | ❌         | ✅        |
| Custom message handling        | ❌         | ✅        |
| Persist messages to DB         | ❌         | ✅        |
| Accumulate assistant content   | ❌         | ✅        |
| R2 sync logic (rsync commands) | ❌         | ✅        |
| Send connection status updates | ❌         | ✅        |
| Container lifecycle            | ✅         | ❌        |
| Process execution              | ✅         | ❌        |
| R2 bucket mounting             | ✅         | ❌        |

You **cannot** add custom logic to Sandbox DO - it's Cloudflare's code. SessionDO exists to add your application logic on top.

---

## Resilience Components

SessionDO uses three specialized components for reliable message handling and session persistence:

### SyncManager

Orchestrates R2 synchronization with debouncing and recovery.

**File:** `apps/sandbox/src/durable-objects/sync-manager.ts`

| Feature    | Description                                  |
| ---------- | -------------------------------------------- |
| Debounce   | Waits 2s after last request before syncing   |
| Max wait   | Forces sync after 10s regardless of activity |
| Retry      | Exponential backoff (3 attempts, 500ms base) |
| Recovery   | Persists failed sync state to DO storage     |
| Force sync | Immediate sync on browser disconnect         |

**State Machine:**

```
idle → pending → syncing → flushing → idle
                    ↓
                retrying → error (terminal)
```

**Usage:**

```typescript
// Request debounced sync (non-blocking)
this.ctx.waitUntil(this.syncManager.requestSync());

// Force immediate sync (on disconnect)
this.ctx.waitUntil(this.syncManager.forceSync());

// Attempt recovery from previous failed sync
const recovered = await this.syncManager.attemptRecovery();
```

### MessagePersistenceQueue

Ensures ordered, reliable message persistence to the API.

**File:** `apps/sandbox/src/durable-objects/message-persistence-queue.ts`

| Feature      | Description                                    |
| ------------ | ---------------------------------------------- |
| Ordering     | FIFO processing maintains conversation order   |
| Retry        | Exponential backoff (3 attempts, 500ms base)   |
| Non-blocking | Uses `ctx.waitUntil()` for async persistence   |
| Tracking     | Returns `messageId` for each persisted message |

**Usage:**

```typescript
// Initialize with session ID
this.persistenceQueue.initialize(sessionId);

// Enqueue message (non-blocking, returns messageId)
this.ctx.waitUntil(this.persistenceQueue.enqueue("user", content));
const messageId = await this.persistenceQueue.enqueue(
  "assistant",
  content,
  metadata,
);
```

### PendingMessageBuffer

Buffers messages when container is disconnected or sleeping.

**File:** `apps/sandbox/src/durable-objects/pending-message-buffer.ts`

| Feature    | Description                                           |
| ---------- | ----------------------------------------------------- |
| Capacity   | Max 100 messages (drops oldest when full)             |
| Expiration | Auto-prunes messages older than 5 minutes             |
| Ordering   | Preserves message order for replay                    |
| Types      | Supports user messages, permission responses, answers |

**Message Lifecycle:**

```
Browser message → Container disconnected?
                        │
        ┌───────────────┴───────────────┐
        │ No                            │ Yes
        ▼                               ▼
Forward to container          Add to PendingMessageBuffer
                                        │
                              Trigger container restart
                                        │
                              drainPendingMessages()
                                        │
                              Forward all to container
```

---

## Hibernation API

### What It Does

The Hibernation API allows Durable Objects to "sleep" between WebSocket messages, reducing costs dramatically.

### Cost Model

| Billing Type            | When            | Cost                                   |
| ----------------------- | --------------- | -------------------------------------- |
| **Without Hibernation** | Wall-clock time | Billed entire duration WS is connected |
| **With Hibernation**    | CPU time only   | Billed only when processing messages   |

### How It Works

```typescript
// Traditional approach - DO stays awake continuously
ws.addEventListener("message", handler);  // ❌ Billed for wall-clock time

// Hibernation approach - DO can sleep between messages
this.ctx.acceptWebSocket(server);         // ✅ Billed per-event (CPU time)

// Instead of event listeners, implement these methods:
async webSocketMessage(ws, message) { }   // Called when message arrives
async webSocketClose(ws) { }              // Called on disconnect
```

### Session Recovery with WebSocket Tags

DO state is lost during hibernation. WebSocket tags preserve the session ID:

```typescript
// On WebSocket accept - store sessionId in tags
this.ctx.acceptWebSocket(server, [this.sessionId]);

// On wake from hibernation - restore sessionId from tags
async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    this.browserWs = ws;  // Restore WebSocket reference

    // Restore sessionId from tags if lost during hibernation
    if (!this.sessionId) {
        const tags = this.ctx.getTags(ws);
        if (tags.length > 0) {
            this.sessionId = tags[0];
        }
    }
    // ... handle message
}
```

This pattern is used in `webSocketMessage`, `webSocketClose`, and `webSocketError` handlers.

### Cost Timeline

```
User sends message     → Container starts, both DOs billed
User reads response    → Container WS keeps SessionDO awake
10 min idle            → Container sleeps, WS closes
User still on page     → SessionDO hibernates, near-zero cost ✅
User sends new message → Container restarts, cycle repeats
```

### Limitation

While the container WebSocket is connected, SessionDO **cannot fully hibernate**:

```typescript
// This event listener keeps SessionDO awake
this.containerWs.addEventListener("message", async (event) => {
  await this.handleContainerMessage(event.data);
});
```

The 10-minute container sleep timeout (`sleepAfter: "10m"`) is the key cost optimization - once the container sleeps and closes its WebSocket, SessionDO can hibernate.

### Cost Comparison

| Scenario               | Without Hibernation | With Current Design |
| ---------------------- | ------------------- | ------------------- |
| User actively chatting | Billed              | Billed              |
| User reading (< 10min) | Billed              | Billed              |
| User idle (> 10min)    | **Billed**          | **Near-zero** ✅    |
| Tab open overnight     | **Very expensive**  | **Cheap** ✅        |

---

## Phase 1: Connection Initiation (Web → DO)

### 1.1 Token Acquisition

The browser first requests a short-lived JWT token for authentication.

**File:** `apps/web/src/lib/api/chat.ts`

```typescript
export async function getWsToken(): Promise<string | null> {
  const response = await fetch(`${API_BASE_URL}/auth/ws-token`, {
    method: "GET",
    credentials: "include",
  });
  const data = await response.json();
  return data.data.token;
}
```

### 1.2 WebSocket Creation

**File:** `apps/web/src/components/chat/chat-detail.tsx` (lines 232-246)

```typescript
const connectWebSocket = async (): Promise<void> => {
  const token = await getWsToken();
  const wsUrl = `${SANDBOX_WS_URL}/ws/v2?sessionId=${sessionId}&token=${token}`;
  const ws = new WebSocket(wsUrl);
  wsRef.current = ws;
  setServerStatus("connecting");
};
```

### 1.3 Route Handler (Cloudflare Worker)

The Worker verifies the JWT and forwards to the Durable Object.

**File:** `apps/sandbox/src/routes/websocket-v2.ts` (lines 14-68)

```typescript
export const websocketV2Route = new Hono<AppEnv>().get("/", async (c) => {
  // JWT Token Validation
  const token = extractToken(c.req.raw);
  const user = await verifyJWT(token, c.env.JWT_SECRET);

  // Get SessionDO Instance
  const sessionId = c.req.query("sessionId");
  const doId = c.env.SessionDO.idFromName(sessionId);
  const sessionDo = c.env.SessionDO.get(doId);

  // Forward to Durable Object
  return sessionDo.fetch(doRequest);
});
```

### 1.4 DO WebSocket Acceptance

The Durable Object accepts the WebSocket using the Hibernation API for cost efficiency.

**File:** `apps/sandbox/src/durable-objects/session-do.ts` (lines 58-70)

```typescript
private handleWebSocketUpgrade(url: URL): Response {
	this.sessionId = url.searchParams.get("sessionId") ?? "default";

	const pair = new WebSocketPair();
	const [client, server] = Object.values(pair);

	this.ctx.acceptWebSocket(server); // Hibernation API
	this.browserWs = server;

	return new Response(null, { status: 101, webSocket: client });
}
```

---

## Phase 2: Container Startup (DO → Container)

### 2.1 Browser Sends "start" Message

**File:** `apps/web/src/components/chat/chat-detail.tsx` (lines 252-262)

```typescript
ws.addEventListener("open", () => {
  setServerStatus("connected");
  ws.send(
    JSON.stringify({
      type: "start",
      sessionId,
      ...(session?.systemPrompt && { systemPrompt: session.systemPrompt }),
      // Optional: link session to a task for MCP tool access
      ...(taskId && { taskId }),
      ...(projectId && { projectId }),
    }),
  );
});
```

### 2.2 DO Receives & Starts Container

**File:** `apps/sandbox/src/durable-objects/session-do.ts`

The `startContainer()` sequence:

```
1. Initialize persistence queue with session ID
           │
2. Send "connection_status: connecting" to browser
           │
3. Create Sandbox instance (sleepAfter: 10m)
           │
4. Set environment variables:
   • ANTHROPIC_API_KEY
   • AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
   • ENVIRONMENT
           │
5. [PRODUCTION] Mount R2 bucket at /persistent
   │   └─► Wait for mount readiness (poll up to 10x @ 500ms)
   │
   ├─► Initialize SyncManager with sandbox + DO storage
   │
   ├─► Attempt recovery from previous failed sync
   │   └─► If recovered: send "session_status: sync_recovered"
   │
   └─► Restore session from R2:
       └─► rsync /persistent/{sessionId}/.claude → /root/.claude
           │
6. Start process: "bun /workspace/dist/index.js"
           │
7. Wait for port 8080 (health check at /health, timeout 30s)
           │
8. Create WebSocket to container:
   const wsResponse = await this.sandbox.wsConnect(request, 8080);
   this.containerWs = wsResponse.webSocket;
           │
9. Send "connection_status: connected" to browser
           │
10. Forward "start" message to container
           │
11. Drain pending messages (if any queued during container sleep)
           │
12. Keep DO alive while container connected via ctx.waitUntil()
```

---

## Phase 3: Message Relay (Bidirectional)

### 3.1 User Message Flow (Browser → Container)

**File:** `apps/sandbox/src/durable-objects/session-do.ts`

```
Browser sends: { type: "message", content: "Hello" }
      │
      ▼
SessionDO.webSocketMessage()
      │
      ├─► Persist to database via MessagePersistenceQueue (non-blocking)
      │
      └─► Container connected?
              │
      ┌───────┴───────┐
      │ Yes           │ No
      ▼               ▼
Forward to      Queue in PendingMessageBuffer
container             │
                Trigger startContainer()
                      │
                drainPendingMessages()
```

**Container Sleep Handling:**

When the container has slept (10min idle timeout), messages are queued and the container is restarted:

```typescript
if (this.containerWs?.readyState === WebSocket.OPEN) {
  this.containerWs.send(msg);
} else {
  // Container has slept - queue message and restart
  this.pendingMessages.add(msg, data.type);
  await this.startContainer({ sessionId: this.sessionId });
}
```

This applies to user messages, permission responses, and ask_user answers.

### 3.2 Container Processing

**File:** `apps/container/src/handlers/message-handlers.ts` (lines 98-118)

```typescript
export function handleUserMessage(
  ws: WebSocket,
  message: IncomingMessage,
  deps: MessageHandlerDeps,
): void {
  const { sessions, sessionQueue, logger } = deps;

  const session = sessions.get(ws);
  if (!session) {
    sendMessage(
      ws,
      { type: "error", message: "Session not initialized" },
      logger,
    );
    return;
  }

  if (message.content) {
    sessionQueue.enqueue(
      ws,
      createUserMessage(message.content, session.sessionId ?? ""),
    );
  }
}
```

When `taskId` is present in the `start` message, the container creates an MCP task tool server that allows Claude to update task fields (title, description, details) via the internal API.

The container also handles `permission_response` and `ask_user_answer` messages from the browser, routing them through `PermissionRegistry` and `QuestionRegistry` respectively to resolve pending tool permission and question Promises in the Claude SDK.

The message queue feeds an async generator that the Claude SDK consumes:

**File:** `apps/container/src/session/message-queue.ts`

```typescript
// Consumer: Infinite async generator
async *consume(ws: WebSocket): AsyncGenerator<SDKUserMessage> {
	while (!this.closed.has(ws)) {
		const queue = this.queues.get(ws);
		const msg = queue?.shift();
		if (msg !== undefined) {
			yield msg;
		} else {
			// Wait for next message
			const nextMsg = await new Promise<SDKUserMessage>((resolve) => {
				this.resolvers.set(ws, resolve);
			});
			yield nextMsg;
		}
	}
}
```

### 3.3 Response Flow (Container → Browser)

**File:** `apps/container/src/handlers/claude-processor.ts` (lines 10-62)

```typescript
export async function processClaudeMessages(
  ws: WebSocket,
  claudeQuery: AsyncIterable<SDKMessage>,
  sessionId: string | null,
  logger: Logger,
  syncSession: (sessionId: string | null) => Promise<void>,
): Promise<void> {
  for await (const message of claudeQuery) {
    if (ws.readyState !== WebSocket.OPEN) {
      break;
    }

    // Forward raw SDK message for real-time display
    sendMessage(ws, { type: "sdk_message", message }, logger);

    // Handle result message for completion
    if (message.type === "result") {
      await syncSession(sessionId);
      sendMessage(
        ws,
        {
          type: "done",
          metadata: {
            tokensUsed:
              (message.usage?.input_tokens ?? 0) +
              (message.usage?.output_tokens ?? 0),
            stopReason: message.subtype,
          },
        },
        logger,
      );
    }
  }
}
```

### 3.4 DO Message Relay

**File:** `apps/sandbox/src/durable-objects/session-do.ts` (lines 305-384)

```typescript
private async handleContainerMessage(msg: string): Promise<void> {
	const data = JSON.parse(msg);

	// Accumulate assistant content for persistence
	if (data.type === "sdk_message" && data.message?.type === "assistant") {
		const content = data.message.message?.content;
		this.assistantContent += textContent;
	}

	// On completion, persist and send messageId
	if (data.type === "done") {
		if (this.assistantContent) {
			const messageId = await this.persistMessage("assistant", this.assistantContent, data.metadata);
			this.browserWs.send(JSON.stringify({
				type: "done",
				messageId,
				metadata: data.metadata,
			}));
		}

		// Non-blocking R2 sync in production
		if (isProduction(this.env) && this.sandbox && this.sessionId) {
			this.ctx.waitUntil(this.syncToR2());
		}

		this.assistantContent = "";
		return;
	}

	// Forward all other messages to browser
	this.browserWs.send(msg);
}
```

---

## Phase 4: Session Persistence

### 4.1 Storage Locations

| Location                       | Data       | Purpose              |
| ------------------------------ | ---------- | -------------------- |
| PostgreSQL                     | Messages   | Chat history         |
| Container `/root/.claude/`     | SDK state  | Active session       |
| R2 `/persistent/{id}/.claude/` | SDK state  | Session resumption   |
| DO Storage                     | Sync state | Failed sync recovery |

### 4.2 R2 Sync Operations

**File:** `apps/sandbox/src/services/r2-sync.ts`

**Restore (on container start):**

```
/persistent/{sessionId}/.claude/projects  →  /root/.claude/projects
/persistent/{sessionId}/.claude/todos     →  /root/.claude/todos
```

**Sync (after each response - debounced):**

```
/root/.claude/projects  →  /persistent/{sessionId}/.claude/projects
/root/.claude/todos     →  /persistent/{sessionId}/.claude/todos
```

### 4.3 Sync Strategy

Syncing uses the SyncManager for reliability:

```
Container sends "done" message
      │
      ▼
SyncManager.requestSync() (debounced)
      │
      ├─► Wait 2s for more "done" messages (batch)
      │
      └─► After 2s quiet OR 10s max wait:
              │
              ▼
          performSync() with retry
              │
              ├─► Success: Clear failed sync state
              │
              └─► Failure: Persist to DO storage for recovery
```

**Force Sync on Disconnect:**

```typescript
// In webSocketClose handler
if (isProduction(this.env) && this.sandbox && this.sessionId) {
  this.ctx.waitUntil(this.syncManager.forceSync());
}
```

### 4.4 Message Persistence

Messages are persisted via MessagePersistenceQueue for ordered delivery:

```typescript
// User message (non-blocking)
this.ctx.waitUntil(this.persistenceQueue.enqueue("user", content));

// Assistant message (returns messageId for browser)
const messageId = await this.persistenceQueue.enqueue(
  "assistant",
  this.assistantContent,
  data.metadata,
);
```

The queue ensures:

- **Ordering**: Messages persist in conversation order (FIFO)
- **Reliability**: Retry with exponential backoff (3 attempts)
- **Non-blocking**: Uses `ctx.waitUntil()` for async operation

### 4.5 Failed Sync Recovery

If a sync fails after all retries, the state is persisted to DO storage:

```typescript
// On next container start
const recovered = await this.syncManager.attemptRecovery();
if (recovered) {
  this.sendSessionStatus("sync_recovered");
}
```

This ensures session state is eventually synchronized even after failures.

---

## Phase 5: Connection Closure & Reconnection

### 5.1 Browser Disconnect

```
Browser closes WebSocket
      │
      ▼
SessionDO.webSocketClose()
      │
      ├─► this.browserWs = null
      │
      └─► Container continues (sleepAfter: 10m idle timeout)
```

### 5.2 Container Sleep

```
Container idle for 10 minutes
      │
      ▼
Cloudflare suspends container
      │
      └─► Session state preserved in R2
```

### 5.3 Reconnection Flow

```
Browser reconnects
      │
      ▼
startContainer()
      │
      ├─► Mount R2 bucket
      │
      ├─► Restore from R2
      │
      └─► query({ resume: sessionId })
             │
             └─► Claude SDK loads existing session state
```

**File:** `apps/container/src/handlers/message-handlers.ts` (lines 21-93)

```typescript
// Check if session exists on disk
const sessionExists = message.sessionId
  ? await checkSessionExists(message.sessionId, execFn, logger)
  : false;

// Start Claude query with session ID and resume flag
const claudeQuery = query({
  prompt: promptGenerator,
  options: {
    model,
    systemPrompt: message.systemPrompt,
    extraArgs:
      !sessionExists && message.sessionId
        ? { "session-id": message.sessionId } // New session
        : undefined,
    resume: sessionExists ? message.sessionId : undefined, // Restore session
  },
});
```

---

## Message Types Reference

### Incoming (Browser → DO → Container)

| Type                  | Description                 |
| --------------------- | --------------------------- |
| `start`               | Initialize session          |
| `message`             | User chat message           |
| `permission_response` | Tool permission decision    |
| `ask_user_answer`     | Answer to Claude's question |
| `close`               | Graceful disconnect         |

### Outgoing (Container → DO → Browser)

| Type                      | Description                                                |
| ------------------------- | ---------------------------------------------------------- |
| `sdk_message`             | Raw Claude SDK messages                                    |
| `stream_start`            | Begin streaming response                                   |
| `chunk`                   | Streaming text chunk                                       |
| `stream_end`              | End streaming response                                     |
| `done`                    | Response complete (includes messageId)                     |
| `error`                   | Error message                                              |
| `connection_status`       | Sandbox status (`connecting`, `connected`, `disconnected`) |
| `session_status`          | Restore/sync progress (see table below)                    |
| `tool_permission_request` | Request permission for tool                                |
| `ask_user_question`       | Claude asking user a question                              |
| `agent_status`            | Agent processing status ("pending")                        |
| `task_updated`            | Task fields updated by agent (taskId, title, etc.)         |
| `memory_stats`            | Container memory usage                                     |

### Session Status Values

The `session_status` message reports restore and sync progress:

| Status            | Description                         |
| ----------------- | ----------------------------------- |
| `restore_started` | Beginning R2 restore process        |
| `restoring`       | Rsync restore in progress           |
| `restored`        | Successfully restored from R2       |
| `restore_skipped` | No R2 data or development mode      |
| `restore_failed`  | Restore operation failed            |
| `sync_recovered`  | Recovered from previous failed sync |

---

## Sequence Diagram

### Normal Flow

```
Browser          Worker        SessionDO        Sandbox DO       Container
   │               │               │                │                │
   │  GET /ws/v2   │               │                │                │
   │──────────────►│               │                │                │
   │               │  Verify JWT   │                │                │
   │               │  Forward      │                │                │
   │               │──────────────►│                │                │
   │               │               │  Accept WS     │                │
   │◄──────────────┼───────────────│  (+ tags)      │                │
   │  101 Upgrade  │               │                │                │
   │               │               │                │                │
   │ {type:"start"}│               │                │                │
   │───────────────┼──────────────►│                │                │
   │               │               │  getSandbox()  │                │
   │               │               │───────────────►│                │
   │               │               │                │  mountBucket() │
   │               │               │                │  waitForMount()│
   │               │               │  attemptRecovery()              │
   │◄──────────────┼───────────────│ {sync_recovered?}              │
   │               │               │  restoreFromR2()               │
   │◄──────────────┼───────────────│ {restoring}    │                │
   │◄──────────────┼───────────────│ {restored}     │                │
   │               │               │                │  startProcess()│
   │               │               │                │───────────────►│
   │               │               │  wsConnect()   │                │
   │               │               │───────────────►│                │
   │               │               │                │ tunnel to 8080 │
   │               │               │◄───────────────│                │ WS ready
   │◄──────────────┼───────────────│ {connecting}   │                │
   │◄──────────────┼───────────────│ {connected}    │                │
   │               │               │ {type:"start"} │                │
   │               │               │────────────────┼───────────────►│
   │               │               │                │                │
   │{type:"message"}               │                │                │
   │───────────────┼──────────────►│                │                │
   │               │               │  Queue persist │                │
   │               │               │────────────────┼───────────────►│
   │               │               │                │                │ Claude
   │               │               │                │                │ processes
   │               │               │  {sdk_message} │                │
   │◄──────────────┼───────────────│◄───────────────┼────────────────│
   │               │               │                │                │
   │               │               │  {type:"done"} │                │
   │               │               │◄───────────────┼────────────────│
   │               │               │  Persist asst  │                │
   │               │               │  requestSync() │                │
   │               │               │  (debounced)   │                │
   │◄──────────────┼───────────────│ {done,msgId}   │                │
   │               │               │                │                │
```

### Container Sleep & Reconnection Flow

```
Browser          SessionDO        Sandbox DO       Container
   │                │                │                │
   │ (Container sleeps after 10min idle)             │
   │                │                │◄───────────────│ sleep
   │                │◄───────────────│ WS close       │
   │◄───────────────│ {disconnected} │                │
   │                │                │                │
   │ {type:"message"}               │                │
   │───────────────►│                │                │
   │                │ Queue message  │                │
   │                │ (PendingBuffer)│                │
   │                │                │                │
   │                │ startContainer()               │
   │                │───────────────►│                │
   │                │                │  wake/restart │
   │                │                │───────────────►│
   │                │  wsConnect()   │                │
   │                │───────────────►│                │
   │                │◄───────────────│                │ WS ready
   │◄───────────────│ {connected}    │                │
   │                │                │                │
   │                │ drainPending() │                │
   │                │────────────────┼───────────────►│ queued msg
   │                │                │                │
```

### Browser Disconnect Flow

```
Browser          SessionDO        Sandbox DO       Container
   │                │                │                │
   │ close WS       │                │                │
   │───────────────►│                │                │
   │                │ webSocketClose()               │
   │                │ forceSync()    │                │
   │                │───────────────►│                │
   │                │                │ rsync to R2   │
   │                │                │                │
   │                │ browserWs=null │                │
   │                │ (hibernates)   │                │
   │                │                │                │
```

---

## Key Files

| Component | File                                                            | Purpose                         |
| --------- | --------------------------------------------------------------- | ------------------------------- |
| Web       | `apps/web/src/components/chat/chat-detail.tsx`                  | WebSocket client                |
| Web       | `apps/web/src/lib/api/chat.ts`                                  | API helpers & token             |
| Sandbox   | `apps/sandbox/src/routes/websocket-v2.ts`                       | Route handler                   |
| Sandbox   | `apps/sandbox/src/durable-objects/session-do.ts`                | SessionDO (custom)              |
| Sandbox   | `apps/sandbox/src/durable-objects/sync-manager.ts`              | Debounced R2 sync with recovery |
| Sandbox   | `apps/sandbox/src/durable-objects/message-persistence-queue.ts` | Ordered message persistence     |
| Sandbox   | `apps/sandbox/src/durable-objects/pending-message-buffer.ts`    | Message buffering during sleep  |
| Sandbox   | `@cloudflare/sandbox`                                           | Sandbox DO (CF built-in)        |
| Sandbox   | `apps/sandbox/src/services/r2-sync.ts`                          | R2 sync commands                |
| Container | `apps/container/src/index.ts`                                   | Server entry                    |
| Container | `apps/container/src/handlers/message-handlers.ts`               | Message dispatch                |
| Container | `apps/container/src/handlers/claude-processor.ts`               | SDK processing                  |
| Container | `apps/container/src/session/message-queue.ts`                   | Async message queue             |

---

## Configuration

### Wrangler Bindings

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "Sandbox", // Cloudflare's Container DO
        "class_name": "Sandbox",
      },
      {
        "name": "SessionDO", // Your custom DO
        "class_name": "SessionDO",
      },
      {
        "name": "TaskRunDO", // Autonomous task execution DO
        "class_name": "TaskRunDO",
      },
    ],
  },
  "r2_buckets": [
    {
      "binding": "claude_sessions",
      "bucket_name": "claude-sessions",
    },
  ],
}
```

### SessionDO Config

```typescript
SANDBOX_CONFIG = {
  sleepAfter: "10m", // Auto-sleep after idle
};

CONTAINER_CONFIG = {
  port: 8080,
  healthPath: "/health",
  startTimeout: 30000,
  entrypoint: "bun /workspace/dist/index.js",
};

R2_CONFIG = {
  bucketName: "claude-sessions",
  mountPath: "/persistent",
};
```

### Authentication Chain

1. **Browser → API**: Session cookie (from login)
2. **Browser → Sandbox Worker**: Short-lived JWT token in query params
3. **Sandbox Worker**: `verifyJWT(token, JWT_SECRET)`
4. **SessionDO → Sandbox DO**: Internal (same Worker, no auth needed)
5. **Sandbox DO → Container**: Internal routing (Cloudflare network)
6. **SessionDO → API**: `X-Service-Token` header for message persistence
