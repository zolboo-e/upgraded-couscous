# upgraded-couscous

Claude Code based personal task management service.

Full-stack TypeScript monorepo using Turbo.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Hono.js with Node.js
- **Database**: Drizzle ORM + Neon PostgreSQL
- **Tools**: pnpm 10.28.2, Turbo 2.7, Biome 2.3, TypeScript 5.9
- **Sandbox**: Cloudflare (for Claude Code CLI)

## Commands

```bash
pnpm dev          # Start all dev servers
pnpm build        # Build all packages
pnpm lint         # Lint with Biome
pnpm format       # Format with Biome
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Run migrations
pnpm db:push      # Push schema to database
pnpm dlx shadcn@latest add <component>  # Add shadcn/ui component
```

## Structure

- `apps/web` - Next.js frontend (uses @repo/ui, @repo/db)
- `apps/api` - Hono.js API server (uses @repo/db)
- `apps/sandbox` - Cloudflare Workers container running Claude Agent SDK WebSocket server
- `packages/ui` - Shared React components
- `packages/db` - Drizzle ORM schema and client
- `packages/tailwind-config` - Shared Tailwind config
- `packages/typescript-config` - Shared TS configs
- `packages/biome-config` - Shared Biome config

## Code Style (Biome)

- Indent: tabs (spaces for JSON)
- Quotes: double
- Semicolons: always
- Line width: 100

## Environment

Copy `.env.example` to `.env` and set `DATABASE_URL`.

## Sandbox Environment

Set via `wrangler secret put` for Cloudflare Worker:

- `ANTHROPIC_API_KEY` - Claude API key
- `API_TOKEN` - Bearer token for sandbox authentication
- `CF_ACCOUNT_ID` - Cloudflare account ID (set in wrangler.jsonc vars, then override with secret)
- `AWS_ACCESS_KEY_ID` - R2 access key
- `AWS_SECRET_ACCESS_KEY` - R2 secret key
- `API_BASE_URL` - Base URL of the API server (e.g. `https://api.example.com`)
- `INTERNAL_API_TOKEN` - Shared token for container-to-API auth (must match API's `INTERNAL_API_TOKEN`)

### Session Resumption

Sessions persist across container restarts via R2:

1. **First connection**: Creates session with database UUID as Claude session ID
2. **After response**: Syncs `~/.claude` to R2 bucket (`/persistent/${sessionId}/.claude`)
3. **Reconnection**: Restores from R2, uses `resume` option to continue session

## Documentation

- [Web App Architecture](docs/web-app.md) - Next.js frontend structure, components, and API integration
- [API Architecture](docs/api.md) - Hono.js backend structure, endpoints, and middleware
- [Sandbox Architecture](docs/sandbox.md) - Cloudflare Worker, Durable Objects, and R2 integration
- [Container Architecture](docs/container.md) - Claude Agent SDK server running in sandbox
- [WebSocket Lifecycle](docs/websocket-lifecycle.md) - Detailed connection lifecycle between Web, Durable Object, and Container
