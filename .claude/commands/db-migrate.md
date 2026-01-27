# Command: /db-migrate

## Overview

Manages Drizzle ORM database migrations for Neon PostgreSQL.

## Usage

```
/db-migrate [action]
```

Actions:

- `generate` - Generate migration from schema changes
- `run` - Run pending migrations
- `push` - Push schema directly (dev only)
- `status` - Check migration status

## Workflow

### Generate Migration

After modifying schema in `packages/db/src/schema/`:

```bash
pnpm db:generate
```

This creates a migration file in `packages/db/drizzle/`.

### Review Migration

1. Read generated SQL
2. Check for data safety
3. Verify backwards compatibility
4. Plan rollback strategy

### Run Migration

```bash
pnpm db:migrate
```

### Push Schema (Development Only)

For rapid iteration in development:

```bash
pnpm db:push
```

**Warning**: This bypasses migrations and directly syncs schema. Only use in development.

## Safety Checklist

Before running migrations:

- [ ] Migration reviewed for correctness
- [ ] No destructive changes without backup
- [ ] Backwards compatible (can rollback)
- [ ] Tested in development environment
- [ ] Database backed up (production)

## Schema Change Examples

### Add Column

```typescript
// Safe: nullable column
export const users = pgTable("users", {
	// existing columns...
	newColumn: text("new_column"), // nullable by default
});
```

### Add Required Column

```typescript
// Step 1: Add nullable column
newColumn: text("new_column"),

// Step 2: Backfill data
// Step 3: Make NOT NULL in separate migration
newColumn: text("new_column").notNull(),
```

### Rename Column

```typescript
// NOT SAFE - causes data loss
// Instead: add new column, migrate data, drop old column
```

### Add Index

```typescript
// Safe: can be added anytime
export const users = pgTable(
	"users",
	{ /* columns */ },
	(table) => ({
		emailIdx: index("users_email_idx").on(table.email),
	})
);
```

## Rollback Strategy

1. Keep rollback SQL for each migration
2. Test rollback in development
3. Have database backup before production migrations

## Related

- **Agent**: `database-reviewer` for schema review
- **Package**: `@repo/db` for schema definitions
