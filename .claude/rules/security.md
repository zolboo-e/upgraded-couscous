# Security Rules

## CRITICAL: Never Commit Secrets

- NO hardcoded API keys, passwords, or tokens
- NO credentials in code or comments
- NO .env files in git (use .env.example as template)
- ALWAYS use environment variables for sensitive data

```typescript
// BAD
const apiKey = "sk-1234567890";

// GOOD
const apiKey = process.env.API_KEY;
```

## Environment Variables

- Store in `.env` file (gitignored)
- Document required vars in `.env.example`
- Validate presence at startup
- Use Zod for environment validation

```typescript
import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().url(),
	API_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
```

## Input Validation (OWASP Top 10)

### SQL Injection Prevention

- ALWAYS use Drizzle ORM parameterized queries
- NEVER concatenate user input into SQL

```typescript
// BAD - SQL Injection vulnerable
db.execute(`SELECT * FROM users WHERE email = '${email}'`);

// GOOD - Drizzle ORM handles escaping
db.select().from(users).where(eq(users.email, email));
```

### XSS Prevention

- React escapes by default - don't bypass it
- NEVER use `dangerouslySetInnerHTML` with user input
- Sanitize any HTML that must be rendered

### CSRF Protection

- Use CSRF tokens for state-changing operations
- Validate Origin/Referer headers
- Use SameSite cookies

## Authentication & Authorization

- Hash passwords with bcrypt (cost factor 12+)
- Use secure session management
- Implement rate limiting on auth endpoints
- Enforce strong password requirements

## Next.js Security Headers

Configure in `next.config.ts`:

```typescript
const securityHeaders = [
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-XSS-Protection", value: "1; mode=block" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];
```

## API Security (Hono)

- Validate all request bodies with Zod
- Implement rate limiting middleware
- Use CORS with specific origins (not `*`)
- Log security-relevant events

## Security Checklist

Before any deployment:

- [ ] No secrets in code or logs
- [ ] All user input validated
- [ ] SQL queries use ORM/parameterization
- [ ] Authentication properly implemented
- [ ] HTTPS enforced in production
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Error messages don't leak sensitive info
