# Coding Style Rules

## Biome Formatting (MUST FOLLOW)

- **Indentation**: Use tabs for code, 2 spaces for JSON
- **Quotes**: Always use double quotes
- **Semicolons**: Always use semicolons
- **Line Width**: Maximum 100 characters per line
- Run `pnpm format` to auto-format all files

## File Organization

- **MANY SMALL FILES > FEW LARGE FILES**
- Typical file: 200-400 lines
- Maximum file size: 800 lines
- Organize by feature/domain, not by type
- High cohesion, low coupling

## Function Guidelines

- Maximum function length: 50 lines
- Maximum nesting depth: 4 levels
- Single responsibility per function
- Use descriptive names (verb + noun)

## Immutability (CRITICAL)

- ALWAYS create new objects, NEVER mutate
- Use spread operators for object updates
- Use `map`, `filter`, `reduce` instead of mutating loops

```typescript
// BAD
user.name = "new name";

// GOOD
const updatedUser = { ...user, name: "new name" };
```

## TypeScript Strict Mode

- NEVER use `any` - use `unknown` and narrow types
- NEVER use non-null assertion (`!`) without validation
- ALWAYS define return types for functions
- ALWAYS use strict null checks

## Error Handling

- ALWAYS use try-catch for risky operations
- Provide meaningful error messages with context
- Never swallow errors silently
- Use custom error classes for domain errors

## Prohibited Practices

- NO `console.log` in production code (use proper logging)
- NO hardcoded values (use constants or env vars)
- NO commented-out code (delete it, git has history)
- NO unused imports or variables (Biome will catch these)

## Quality Checklist

Before completing any task, verify:

- [ ] Code is readable with clear naming
- [ ] Functions are under 50 lines
- [ ] Files are under 800 lines
- [ ] Nesting depth is under 4 levels
- [ ] All errors are properly handled
- [ ] No debug statements or hardcoded values
- [ ] Immutable patterns are used consistently
- [ ] TypeScript types are properly defined
