# Sandbox Architecture

Cloudflare Worker with Durable Objects for WebSocket management and container orchestration.

## Directory Structure

```
apps/sandbox/src/
├── index.ts                    # Worker entry, exports DOs
├── app.ts                      # Hono app with routes
├── config/
│   └── env.ts                  # Configuration constants
├── durable-objects/
│   ├── session-do.ts           # SessionDO (WebSocket + relay)
│   ├── sync-manager.ts         # R2 sync orchestration
│   ├── sync-state-machine.ts   # Sync state transitions
│   ├── failed-sync-recovery.ts # Sync failure persistence
│   ├── message-persistence-queue.ts  # Ordered message persistence
│   └── pending-message-buffer.ts     # Message buffering
├── middleware/
│   ├── auth.ts                 # Bearer token validation
│   └── cors.ts                 # CORS middleware
├── routes/
│   ├── websocket-v2.ts         # WebSocket via SessionDO
│   ├── health.ts               # Health check
│   ├── files.ts                # File listing
│   └── logs.ts                 # Container logs
├── services/
│   ├── jwt.ts                  # JWT validation
│   └── r2-sync.ts              # R2 mount/restore/sync
├── types/
│   └── index.ts                # TypeScript definitions
└── utils/
    └── retry.ts                # Retry with backoff
```

## Durable Objects

### SessionDO (Custom)

Handles browser WebSocket connections with Hibernation API for cost efficiency.

| Capability | Description |
|------------|-------------|
| Browser WebSocket | Accepts connections with hibernation |
| Message relay | Forwards between browser and container |
| Message persistence | Saves messages to API database |
| R2 sync orchestration | Triggers mount/restore/sync |
| Connection status | Sends status updates to browser |
| Content accumulation | Aggregates assistant responses |

### Sandbox DO (Cloudflare Built-in)

Container lifecycle management via `@cloudflare/sandbox` SDK.

| Method | Purpose |
|--------|---------|
| `setEnvVars()` | Set container environment |
| `mountBucket()` | Mount R2 bucket |
| `startProcess()` | Start container process |
| `exec()` | Execute command in container |
| `wsConnect()` | WebSocket tunnel to container |
| `destroy()` | Kill container |

## Routes

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/health` | Health check | No |
| GET | `/ws/v2` | WebSocket via SessionDO | JWT |
| GET | `/files/*` | List persistent files | Bearer |
| GET | `/logs/*` | Container logs | Bearer |

## Middleware

### Auth Middleware (`middleware/auth.ts`)

Validates Bearer token from `Authorization` header against `API_TOKEN` env var.

### JWT Service (`services/jwt.ts`)

Validates JWT for WebSocket v2 route:
- Extracts from header, cookie, or query param
- Verifies with `jose` library (HS256)
- Requires `userId` and `email` in payload

## R2 Storage Integration

**File:** `services/r2-sync.ts`

### Mount

```typescript
mountR2Bucket(sandbox, env)
// Mounts R2 bucket at /persistent
// Waits for mount readiness (polls up to 10x)
```

### Restore

```typescript
restoreSessionFromR2(sandbox, sessionId)
// rsync /persistent/{sessionId}/.claude → /root/.claude
// Restores projects/ and todos/ directories
```

### Sync

```typescript
syncSessionToR2(sandbox, sessionId)
// rsync /root/.claude → /persistent/{sessionId}/.claude
// Syncs projects/ and todos/ directories
```

## Resilience Components

### SyncManager

Orchestrates R2 synchronization with reliability.

| Feature | Description |
|---------|-------------|
| Debounce | 2s wait after last request |
| Max wait | Force sync after 10s |
| Retry | Exponential backoff (3 attempts) |
| Recovery | Persists failures to DO storage |
| Force sync | Immediate sync on disconnect |

**State Machine:** `idle → pending → syncing → flushing → idle`

### MessagePersistenceQueue

Ensures ordered message persistence to API.

| Feature | Description |
|---------|-------------|
| FIFO | Maintains conversation order |
| Retry | Exponential backoff (3 attempts) |
| Non-blocking | Uses `ctx.waitUntil()` |

**Endpoint:** `POST {API_BASE_URL}/internal/sessions/{id}/messages`

### PendingMessageBuffer

Buffers messages when container is disconnected.

| Feature | Description |
|---------|-------------|
| Capacity | Max 100 messages |
| Expiration | 5 minute TTL |
| Ordering | Preserves message order |

## Configuration

**File:** `config/env.ts`

```typescript
R2_CONFIG = {
    bucketName: "claude-sessions",
    mountPath: "/persistent"
};

CONTAINER_CONFIG = {
    port: 8080,
    entrypoint: "bun /workspace/dist/index.js",
    healthTimeout: 30000
};

SANDBOX_CONFIG = {
    sleepAfter: "10m"  // Auto-sleep idle containers
};
```

## Environment Variables

Set via `wrangler secret put`:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `API_TOKEN` | Yes | Bearer token for auth |
| `JWT_SECRET` | Yes | Shared secret with API |
| `CF_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `AWS_ACCESS_KEY_ID` | Yes | R2 credentials |
| `AWS_SECRET_ACCESS_KEY` | Yes | R2 credentials |
| `API_BASE_URL` | Yes | API server URL |
| `INTERNAL_API_TOKEN` | Yes | Service-to-service token |
| `ENVIRONMENT` | No | "production" or "development" |

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/index.ts` | Worker entry, exports SessionDO and Sandbox |
| `src/durable-objects/session-do.ts` | WebSocket handling and message relay |
| `src/durable-objects/sync-manager.ts` | R2 sync with debouncing and recovery |
| `src/services/r2-sync.ts` | R2 mount/restore/sync commands |
| `src/routes/websocket-v2.ts` | JWT validation and DO routing |
| `wrangler.jsonc` | Cloudflare Worker configuration |

## Development

```bash
pnpm dev      # Start local dev server
pnpm deploy   # Deploy to Cloudflare
```

## Related Documentation

- [WebSocket Lifecycle](websocket-lifecycle.md) - Connection flow between components
- [Container Architecture](container.md) - Claude Agent SDK server
