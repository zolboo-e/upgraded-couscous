# Turbo Monorepo Rules

## Package Structure

```
upgraded-couscous/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Hono.js backend
└── packages/
    ├── ui/           # Shared React components
    ├── db/           # Drizzle ORM schema & client
    ├── tailwind-config/
    ├── typescript-config/
    └── biome-config/
```

## Dependency Rules

### Internal Packages (MUST FOLLOW)

- Use workspace protocol: `"@repo/ui": "workspace:*"`
- Import with `@repo/` prefix: `import { Button } from "@repo/ui"`
- NEVER duplicate code that exists in shared packages

### External Dependencies

- Add to root `package.json` only if used by multiple packages
- Add to specific package if used only there
- Keep versions consistent across packages

## Turbo Task Pipeline

Defined in `turbo.json`:

```json
{
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"outputs": [".next/**", "dist/**"]
		},
		"dev": {
			"persistent": true,
			"cache": false
		},
		"lint": {
			"dependsOn": ["^build"]
		}
	}
}
```

## Common Commands

```bash
# Development
pnpm dev              # Start all dev servers

# Building
pnpm build            # Build all packages
pnpm build --filter=web  # Build only web app

# Linting
pnpm lint             # Lint all packages
pnpm format           # Format all files

# Database
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema (dev only)
```

## Adding New Packages

1. Create directory in `packages/` or `apps/`
2. Add `package.json` with `@repo/` name
3. Extend shared configs:

```json
{
	"name": "@repo/new-package",
	"extends": "@repo/typescript-config/library.json"
}
```

4. Add to consuming packages' dependencies
5. Run `pnpm install`

## Shared Configurations

### TypeScript

- Extend from `@repo/typescript-config`
- Use `base.json` for libraries
- Use `nextjs.json` for Next.js apps
- Use `node.json` for Node.js apps

### Biome

- Root `biome.json` extends `@repo/biome-config`
- Consistent formatting across all packages

### Tailwind

- Import from `@repo/tailwind-config/globals.css`
- Share color schemes and design tokens

## Performance Tips

- Use `turbo prune` for Docker builds
- Enable remote caching for CI
- Use `--filter` to build specific packages
- Check `turbo run build --dry` to see task graph

## Troubleshooting

### "Module not found" for @repo packages

```bash
pnpm install
pnpm build
```

### Type errors in shared packages

1. Build the dependency first: `pnpm build --filter=@repo/db`
2. Restart TypeScript server in IDE

### Cache issues

```bash
turbo clean
pnpm build
```
