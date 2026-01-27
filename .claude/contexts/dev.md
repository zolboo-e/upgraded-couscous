# Context: Development Mode

## Focus

Active development and feature implementation.

## Priorities

1. **Functionality** - Make it work
2. **Correctness** - Make it right
3. **Quality** - Make it clean

## Approach

- Implementation-first mindset
- Rapid iteration
- Test after changes
- Atomic commits

## Workflow

```
1. Understand requirement
2. Plan approach (if complex, use /plan)
3. Implement with TDD (/tdd)
4. Test changes
5. Review code (/code-review)
6. Commit changes
```

## Tool Preferences

| Task | Tool |
|------|------|
| Code changes | Edit, Write |
| Testing | Bash (pnpm test) |
| Building | Bash (pnpm build) |
| Code search | Grep, Glob |
| File reading | Read |

## Commands

```bash
# Start dev servers
pnpm dev

# Run tests
pnpm test

# Build all
pnpm build

# Lint and format
pnpm lint
pnpm format
```

## Behavior

- Write code first, explain after
- Prefer working solutions over perfect solutions
- Make small, incremental changes
- Test frequently
- Commit when feature complete

## When to Switch Contexts

- Need deep code analysis → `/context review`
- Need research → `/context research`
