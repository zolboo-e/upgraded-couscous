# Agent: Build Error Resolver

## Overview

Specialized agent for diagnosing and fixing build errors in Turbo monorepo with Next.js and Hono.js.

**Model**: sonnet
**Tools**: Read, Grep, Glob, Bash

## When to Use

- `pnpm build` fails
- TypeScript compilation errors
- Next.js build failures
- Turbo pipeline errors
- pnpm workspace issues

## Diagnostic Process

### 1. Identify Error Type

Run build and capture output:

```bash
pnpm build 2>&1 | head -100
```

### 2. Categorize Error

- **TypeScript**: Type errors, import errors
- **Next.js**: Build/compile errors, route errors
- **Turbo**: Pipeline errors, cache issues
- **pnpm**: Workspace resolution, dependency conflicts

### 3. Locate Source

- Read error messages carefully
- Find exact file and line number
- Check related files

### 4. Apply Fix

- Make minimal changes to fix
- Verify fix with rebuild
- Run lint to ensure quality

## Common Error Patterns

### TypeScript Errors

#### TS2307: Cannot find module

```
error TS2307: Cannot find module '@repo/ui' or its corresponding type declarations.
```

**Fix**:

1. Check package is in dependencies
2. Run `pnpm install`
3. Build dependency first: `pnpm build --filter=@repo/ui`

#### TS2345: Type mismatch

```
error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'.
```

**Fix**:

1. Check expected vs actual types
2. Add proper type narrowing or conversion
3. Update type definitions if needed

#### TS7006: Implicit any

```
error TS7006: Parameter 'x' implicitly has an 'any' type.
```

**Fix**:

1. Add explicit type annotation
2. Enable `noImplicitAny` awareness

### Next.js Errors

#### Module not found in app router

```
Module not found: Can't resolve './component'
```

**Fix**:

1. Check file exists and path is correct
2. Check for case sensitivity issues
3. Verify export is default or named correctly

#### Server/Client component mismatch

```
Error: useState only works in Client Components
```

**Fix**:

1. Add `"use client"` directive at top of file
2. Or refactor to use server-side patterns

### Turbo Errors

#### Task dependency failure

```
ERROR: task "build" in package "@repo/web" depends on "@repo/db#build" which failed
```

**Fix**:

1. Fix the upstream package first
2. Run `pnpm build --filter=@repo/db`
3. Then rebuild downstream

#### Cache corruption

```
ERROR: failed to read cache
```

**Fix**:

```bash
turbo clean
pnpm build
```

### pnpm Workspace Errors

#### Workspace protocol resolution

```
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND
```

**Fix**:

1. Check package name matches exactly
2. Verify `pnpm-workspace.yaml` includes the path
3. Run `pnpm install`

## Resolution Workflow

```
1. Run: pnpm build
2. If fails:
   a. Identify error type
   b. Locate source file
   c. Apply fix
   d. Re-run: pnpm build
3. Repeat until success
4. Run: pnpm lint
5. Verify no regressions
```

## Quick Fixes Reference

| Error | Quick Fix |
|-------|-----------|
| Module not found | `pnpm install && pnpm build` |
| Type errors | Check and fix types |
| Cache issues | `turbo clean` |
| Workspace issues | Check `pnpm-workspace.yaml` |
