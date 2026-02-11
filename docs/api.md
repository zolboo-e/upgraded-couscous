# API Architecture

Hono.js backend API with Node.js, using Drizzle ORM for database access.

## Directory Structure

```
apps/api/src/
├── server.ts               # HTTP server entry point
├── index.ts                # Main app factory, module composition
├── config/
│   └── env.ts              # Environment validation (Zod)
├── shared/
│   ├── errors/             # Base error class
│   └── middleware/         # Global error handler
├── auth/                   # Authentication module
├── chat/                   # Chat session module
├── organization/           # Organization/company module
├── projects/               # Project management module
├── tasks/                  # Task management module
└── internal/               # Service-to-service endpoints
```

## Module Architecture

Each feature module follows a consistent pattern:

```
/feature
├── index.ts           # Module factory
├── routes.ts          # Route definitions
├── handlers.ts        # Request handlers
├── middleware.ts      # Feature-specific middleware
├── services/          # Business logic
├── repositories/      # Data access layer
├── errors/            # Custom error classes
└── types/             # TypeScript interfaces & Zod schemas
```

## API Endpoints

### Auth (`/auth`)

| Method | Path               | Description                | Auth |
| ------ | ------------------ | -------------------------- | ---- |
| POST   | `/auth/register`   | User registration          | No   |
| POST   | `/auth/login`      | User login                 | No   |
| GET    | `/auth/me`         | Get current user           | Yes  |
| GET    | `/auth/me/company` | Get user with organization | Yes  |

### Chat (`/chat`)

| Method | Path                          | Description                    | Auth |
| ------ | ----------------------------- | ------------------------------ | ---- |
| POST   | `/chat/sessions`              | Create chat session            | Yes  |
| GET    | `/chat/sessions`              | List user's sessions           | Yes  |
| GET    | `/chat/sessions/task/:taskId` | Get or create session for task | Yes  |
| GET    | `/chat/sessions/:id`          | Get session with messages      | Yes  |
| DELETE | `/chat/sessions/:id`          | Delete session                 | Yes  |

### Organization (`/organization`)

| Method | Path                        | Description              | Auth  |
| ------ | --------------------------- | ------------------------ | ----- |
| GET    | `/organization`             | Get organization details | Yes   |
| PATCH  | `/organization`             | Update organization name | Admin |
| POST   | `/organization/members`     | Add member               | Admin |
| PATCH  | `/organization/members/:id` | Update member role       | Admin |
| DELETE | `/organization/members/:id` | Remove member            | Admin |

### Projects (`/projects`)

| Method | Path                  | Description         | Auth |
| ------ | --------------------- | ------------------- | ---- |
| GET    | `/projects`           | List all projects   | Yes  |
| POST   | `/projects`           | Create project      | Yes  |
| GET    | `/projects/:id`       | Get project details | Yes  |
| GET    | `/projects/:id/members` | Get project members | Yes  |

### Tasks (`/projects/:projectId/tasks`)

| Method | Path                                                 | Description     | Auth |
| ------ | ---------------------------------------------------- | --------------- | ---- |
| GET    | `/projects/:projectId/tasks`                         | List tasks      | Yes  |
| POST   | `/projects/:projectId/tasks`                         | Create task     | Yes  |
| GET    | `/projects/:projectId/tasks/:taskId`                 | Get task        | Yes  |
| PATCH  | `/projects/:projectId/tasks/:taskId`                 | Update task     | Yes  |
| DELETE | `/projects/:projectId/tasks/:taskId`                 | Delete task     | Yes  |
| GET    | `/projects/:projectId/tasks/:taskId/assignees`       | Get assignees   | Yes  |
| POST   | `/projects/:projectId/tasks/:taskId/assignees`       | Add assignee    | Yes  |
| DELETE | `/projects/:projectId/tasks/:taskId/assignees/:userId` | Remove assignee | Yes  |

### Internal (`/internal`)

| Method | Path                                     | Description        | Auth          |
| ------ | ---------------------------------------- | ------------------ | ------------- |
| POST   | `/internal/sessions/:sessionId/messages` | Save messages      | Service Token |
| PATCH  | `/internal/tasks/:taskId`                | Update task fields | Service Token |

### Health

| Method | Path      | Description                |
| ------ | --------- | -------------------------- |
| GET    | `/health` | Returns `{ status: "ok" }` |

## Middleware

### Global Middleware

Applied to all routes in `src/index.ts`:

- `logger()` - Request/response logging
- `cors()` - CORS with origin from `FRONTEND_URL`
- `errorHandler` - Global error handling

### Auth Middleware (`src/auth/middleware/`)

Validates JWT Bearer token from `Authorization` header. Sets context:

- `userId`, `userEmail`, `sessionToken`

### Admin Middleware (`src/organization/middleware/`)

Checks user membership and role. Sets context:

- `companyId`, `isAdmin`

### Internal Service Middleware (`src/internal/middleware.ts`)

Validates `X-Service-Token` header against `INTERNAL_API_TOKEN`.

## Error Handling

Base error class with HTTP status codes and error codes:

| Error                      | Status | Module       |
| -------------------------- | ------ | ------------ |
| `InvalidCredentialsError`  | 401    | auth         |
| `EmailAlreadyExistsError`  | 409    | auth         |
| `InvalidSessionError`      | 401    | auth         |
| `SessionNotFoundError`     | 404    | chat         |
| `UnauthorizedAccessError`  | 403    | chat         |
| `ForbiddenError`           | 403    | organization |
| `MemberNotFoundError`      | 404    | organization |
| `ProjectNotFoundError`     | 404    | projects     |
| `NoCompanyMembershipError` | 403    | projects     |
| `TaskNotFoundError`        | 404    | tasks        |
| `TaskAccessDeniedError`    | 403    | tasks        |

Error response format:

```json
{ "error": { "code": "ERROR_CODE", "message": "Description" } }
```

## Authentication

- **Password hashing**: bcrypt with 12 salt rounds
- **Token format**: JWT with HS256, 7-day expiration
- **Token payload**: `userId`, `email`, `name`, `iat`, `exp`

## Database Integration

Uses `@repo/db` workspace package with Drizzle ORM and Neon PostgreSQL.

Tables accessed:

- `users` - User accounts
- `companies` - Organizations
- `companyMembers` - User-company relationships
- `projects` - Projects within companies
- `projectMembers` - User-project relationships
- `tasks` - Tasks within projects
- `taskAssignees` - User-task assignments
- `sessions` - Chat sessions
- `messages` - Chat messages
- `sessionProjects` - Session-to-project links
- `sessionTasks` - Session-to-task links

## Environment Variables

| Variable             | Required | Description                                  |
| -------------------- | -------- | -------------------------------------------- |
| `DATABASE_URL`       | Yes      | PostgreSQL connection string                 |
| `JWT_SECRET`         | Yes      | 32+ char secret for JWT                      |
| `PORT`               | No       | Server port (default: 3001)                  |
| `NODE_ENV`           | No       | Environment (default: development)           |
| `FRONTEND_URL`       | No       | CORS origin (default: http://localhost:3000) |
| `SANDBOX_WS_URL`     | No       | Sandbox WebSocket URL                        |
| `SANDBOX_API_TOKEN`  | No       | Sandbox API token (32+ chars)                |
| `INTERNAL_API_TOKEN` | No       | Service-to-service token (32+ chars)         |

## Key Files Reference

| File                                     | Purpose                                       |
| ---------------------------------------- | --------------------------------------------- |
| `src/index.ts`                           | App factory, exports `AppType` for RPC client |
| `src/server.ts`                          | HTTP server on port 3001                      |
| `src/config/env.ts`                      | Zod environment validation                    |
| `src/shared/middleware/error-handler.ts` | Global error handling                         |
| `src/auth/utils/jwt.ts`                  | JWT sign/verify utilities                     |
| `src/auth/utils/password.ts`             | bcrypt password utilities                     |

## Development

```bash
pnpm dev    # Start with hot reload on port 3001
pnpm build  # Build with tsup
pnpm start  # Run production server
```

## Type Safety

Exports `AppType` for Hono RPC client in frontend:

```typescript
import type { AppType } from "@repo/api";
import { hc } from "hono/client";

const client = hc<AppType>("http://localhost:3001");
```
