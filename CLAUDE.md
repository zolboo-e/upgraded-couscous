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
```

## Structure

- `apps/web` - Next.js frontend (uses @repo/ui, @repo/db)
- `apps/api` - Hono.js API server (uses @repo/db)
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
