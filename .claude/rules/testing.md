# Testing Rules

## Coverage Requirements

- **Minimum**: 80% test coverage for all code
- **100% Required** for:
  - Authentication and authorization logic
  - Security-sensitive code
  - Core business logic
  - Financial calculations (if any)

## Test Types

### Unit Tests (Vitest)

- Test individual functions and components
- Mock external dependencies
- Fast execution, run frequently
- Location: `*.test.ts` or `*.spec.ts` alongside source

### Integration Tests (Vitest)

- Test API endpoints with database
- Test component interactions
- Use test database (not production)
- Location: `__tests__/integration/`

### E2E Tests (Playwright)

- Test critical user flows
- Run against staging environment
- Location: `e2e/` directory

## Test-Driven Development (TDD)

Follow the RED → GREEN → REFACTOR cycle:

1. **RED**: Write a failing test first
2. **GREEN**: Write minimal code to pass the test
3. **REFACTOR**: Improve code while keeping tests green

```bash
# Run tests
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

## Testing Patterns

### React Components (React Testing Library)

```typescript
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

test("renders button with text", () => {
	render(<Button>Click me</Button>);
	expect(screen.getByRole("button")).toHaveTextContent("Click me");
});
```

### API Endpoints (Hono)

```typescript
import { app } from "./index";

test("GET /health returns 200", async () => {
	const res = await app.request("/health");
	expect(res.status).toBe(200);
});
```

### Database Operations (Drizzle)

```typescript
import { createDb } from "@repo/db";

test("creates user successfully", async () => {
	const db = createDb(process.env.TEST_DATABASE_URL!);
	const user = await db.insert(users).values({ email: "test@example.com" }).returning();
	expect(user[0].email).toBe("test@example.com");
});
```

## When Tests Fail

1. Consult the `tdd-guide` agent
2. Ensure tests are independent (no shared state)
3. Verify mocks are accurate
4. Fix implementation, NOT the test (unless test is wrong)

## Available Agents

- **tdd-guide**: Proactive TDD assistance
- **e2e-runner**: Playwright E2E test execution
