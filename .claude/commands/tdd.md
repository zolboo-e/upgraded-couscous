# Command: /tdd

## Overview

Initiates test-driven development workflow following the RED → GREEN → REFACTOR cycle.

## Usage

```
/tdd [feature description]
```

## Workflow

### Phase 1: Interface Definition

1. Clarify requirements with user
2. Define types and interfaces
3. Create test file structure

### Phase 2: RED - Write Failing Tests

1. Write test cases covering:
   - Happy path
   - Edge cases
   - Error conditions
2. Run tests to confirm they fail
3. Verify tests fail for the RIGHT reason

```bash
pnpm test -- --run
```

### Phase 3: GREEN - Minimal Implementation

1. Write minimum code to pass tests
2. Focus on making tests green, not perfect code
3. Run tests after each change

```bash
pnpm test -- --run
```

### Phase 4: REFACTOR - Improve Quality

1. Improve code structure
2. Remove duplication
3. Improve naming
4. Keep tests green throughout

```bash
pnpm test -- --run
```

### Phase 5: Coverage Verification

1. Check coverage meets 80% minimum
2. Add tests for uncovered paths

```bash
pnpm test -- --coverage
```

## Key Principles

### MUST DO

- Write test FIRST before implementation
- Verify test fails before coding
- Keep implementation minimal
- Refactor only after tests pass
- Maintain 80%+ coverage

### MUST NOT

- Implement before writing tests
- Skip running tests between changes
- Write excessive code in one step
- Test implementation details
- Ignore failing tests

## Coverage Requirements

| Area | Minimum |
|------|---------|
| Overall | 80% |
| Auth/Security | 100% |
| Core Business Logic | 100% |
| Database Operations | 100% |

## Related

- **Agent**: `tdd-guide` for detailed assistance
- **Agent**: `e2e-runner` for Playwright tests
- **Command**: `/code-review` after completion
