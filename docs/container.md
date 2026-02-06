# Container Architecture

WebSocket server running Claude Agent SDK inside Cloudflare sandbox containers.

## Directory Structure

```
apps/container/src/
├── index.ts                    # Server entry point
├── config/
│   └── env.ts                  # Environment configuration
├── handlers/
│   ├── message-handlers.ts     # WebSocket message routing
│   └── claude-processor.ts     # Claude SDK message processing
├── websocket/
│   └── send.ts                 # WebSocket send utility
├── session/
│   ├── message-queue.ts        # Per-session async message queue
│   ├── message-factory.ts      # SDK message creation
│   └── session-check.ts        # Session existence verification
├── services/
│   ├── logger.ts               # Logger with telemetry
│   ├── telemetry.ts            # Upstash Redis client
│   ├── memory-monitor.ts       # Memory stats monitoring
│   └── sync.ts                 # R2 session sync
├── shutdown/
│   └── graceful-shutdown.ts    # Graceful shutdown handler
└── types/
    └── index.ts                # TypeScript definitions
```

## WebSocket Server

**File:** `src/index.ts`

- HTTP server with Hono on port 8080
- WebSocket server on root path
- Health check at `/health`
- Signal handlers for graceful shutdown (SIGTERM, SIGINT)

## Message Protocol

### Incoming (Browser → Container)

| Type | Description |
|------|-------------|
| `start` | Initialize Claude query |
| `message` | User chat message |
| `permission_response` | Tool permission decision |
| `ask_user_answer` | Answer to Claude's question |
| `close` | Graceful disconnect |

### Outgoing (Container → Browser)

| Type | Description |
|------|-------------|
| `sdk_message` | Raw Claude SDK messages |
| `stream_start` | Begin streaming |
| `chunk` | Text content chunk |
| `stream_end` | End streaming |
| `done` | Response complete with metadata |
| `error` | Error message |
| `memory_stats` | Memory usage (heap, RSS) |

## Claude Agent SDK Integration

**Dependency:** `@anthropic-ai/claude-agent-sdk`

```typescript
const claudeQuery = query({
    prompt: promptGenerator,  // Async generator of user messages
    options: {
        model: CLAUDE_MODEL,
        systemPrompt: message.systemPrompt,
        extraArgs: { "session-id": sessionId },  // New session
        resume: sessionId,                        // Resume existing
    },
});
```

### Session Handling

| Scenario | SDK Options |
|----------|-------------|
| New session | `extraArgs: { "session-id": id }` |
| Resume session | `resume: id` |

Session existence checked by looking for files in `/root/.claude/`.

## Message Handling Pipeline

### SessionMessageQueue

Per-WebSocket async generator for message flow.

```typescript
// Producer: Enqueue user messages
sessionQueue.enqueue(ws, userMessage);

// Consumer: Claude SDK consumes via async generator
for await (const message of sessionQueue.consume(ws)) {
    // SDK processes message
}
```

### Processing Flow

```
WebSocket message
      │
      ▼
handleMessage() routes by type
      │
      ├─► "start" → handleStart()
      │              └─► Initialize queue + Claude query
      │
      └─► "message" → handleUserMessage()
                      └─► sessionQueue.enqueue()
                              │
                              ▼
                      Claude SDK processes
                              │
                              ▼
                      processClaudeMessages()
                              │
                              ▼
                      sendMessage() to browser
```

## Session Persistence

**File:** `src/services/sync.ts`

After Claude completes a response, syncs session to R2:

```typescript
// Sync directories to R2 persistent storage
rsync /root/.claude/projects → /persistent/{sessionId}/.claude/projects
rsync /root/.claude/todos → /persistent/{sessionId}/.claude/todos
```

Only runs in production mode.

## Graceful Shutdown

**File:** `src/shutdown/graceful-shutdown.ts`

On SIGTERM/SIGINT:

1. Close all WebSocket connections (1s timeout each)
2. Clean up sessions and sync to R2
3. Log to Upstash telemetry
4. Close WebSocket server, then HTTP server
5. Force exit after 8s timeout

## Services

### Logger

Writes to console and `/tmp/server.log`. Optionally pushes to Upstash Redis.

### Telemetry

Upstash Redis integration for observability:
- `sandbox:server:logs` - Server logs
- `sandbox:shutdown:logs` - Shutdown events

### Memory Monitor

Sends memory stats to client every 1000ms:
- `heapUsed`, `heapTotal`, `rss`, `external` (in MB)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_MODEL` | `claude-sonnet-4-20250514` | Claude model ID |
| `ENVIRONMENT` | - | "production" enables R2 sync |
| `UPSTASH_REDIS_URL` | - | Telemetry endpoint (optional) |
| `UPSTASH_REDIS_TOKEN` | - | Telemetry auth (optional) |

## Configuration

**File:** `src/config/env.ts`

```typescript
SERVER_CONFIG = {
    port: 8080,
    logFile: "/tmp/server.log"
};

SYNC_CONFIG = {
    basePath: "/persistent",
    localPath: "/root/.claude",
    directories: ["projects", "todos"]
};
```

## Docker Build

**File:** `Dockerfile`

Multi-stage build:

1. **Base**: Cloudflare sandbox v0.7.0 + rsync + Claude CLI
2. **Pruner**: Turbo prune for container dependencies
3. **Builder**: Install deps and build with tsup
4. **Runner**: Copy artifacts to `/workspace`

**Port:** 8080
**Command timeout:** 300000ms (5 minutes)

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/index.ts` | Server initialization |
| `src/handlers/message-handlers.ts` | WebSocket message routing |
| `src/handlers/claude-processor.ts` | SDK message processing |
| `src/session/message-queue.ts` | Async message queue |
| `src/services/sync.ts` | R2 session persistence |
| `src/shutdown/graceful-shutdown.ts` | Graceful shutdown |
| `Dockerfile` | Container build configuration |

## Development

```bash
pnpm dev      # Start with hot reload
pnpm build    # Build with tsup
```

## Related Documentation

- [WebSocket Lifecycle](websocket-lifecycle.md) - Connection flow between components
- [Sandbox Architecture](sandbox.md) - Cloudflare Worker orchestration
