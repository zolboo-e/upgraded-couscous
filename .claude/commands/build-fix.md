# Command: /build-fix

## Overview

Diagnoses and fixes build errors in the Turbo monorepo.

## Usage

```
/build-fix
```

## Workflow

### Phase 1: Run Build

```bash
pnpm build 2>&1
```

### Phase 2: Categorize Errors

- **TypeScript**: Type errors, import errors
- **Next.js**: Build/compile errors
- **Turbo**: Pipeline errors, cache issues
- **pnpm**: Workspace resolution errors

### Phase 3: Diagnose

1. Read error messages
2. Locate source files
3. Identify root cause
4. Check dependencies

### Phase 4: Fix

1. Apply minimal fix
2. Re-run build
3. Repeat if needed

### Phase 5: Verify

```bash
pnpm build
pnpm lint
```

## Common Fixes

### Module Not Found

```bash
pnpm install
pnpm build --filter=@repo/[package]
```

### Type Errors

1. Check expected vs actual types
2. Add proper type annotations
3. Update type definitions

### Cache Issues

```bash
turbo clean
pnpm build
```

### Workspace Issues

1. Check `pnpm-workspace.yaml`
2. Verify package names
3. Run `pnpm install`

## Error Reference

| Error | Quick Fix |
|-------|-----------|
| TS2307 Module not found | `pnpm install && pnpm build` |
| TS2345 Type mismatch | Fix types |
| Next.js build error | Check imports and exports |
| Turbo pipeline fail | Fix upstream package first |
| Cache corruption | `turbo clean` |

## Related

- **Agent**: `build-error-resolver` for complex errors
- **Command**: `/code-review` after fixes
