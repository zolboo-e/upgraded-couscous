# Web App Architecture

Next.js 16 frontend application with React 19 and Tailwind CSS 4.

## Directory Structure

```
apps/web/src/
├── app/                    # Next.js App Router pages
│   ├── (public)/           # Public pages (homepage)
│   ├── (guest)/            # Auth pages (login, register)
│   ├── (protected)/        # Authenticated routes
│   └── api/proxy/          # API proxy route
├── components/
│   ├── auth/               # Login, register, logout
│   ├── chat/               # Chat UI (20+ components)
│   ├── organization/       # Member management
│   └── layout/             # Header, navigation
├── lib/
│   ├── api/                # Hono RPC client
│   ├── actions/            # Server actions
│   └── validations/        # Zod schemas
└── globals.css
```

## Routes

| Path            | Route Group | Component    | Auth        |
| --------------- | ----------- | ------------ | ----------- |
| `/`             | (public)    | HomePage     | No          |
| `/login`        | (guest)     | LoginForm    | No          |
| `/register`     | (guest)     | RegisterForm | No          |
| `/chats`        | (protected) | ChatList     | Yes         |
| `/chats/[id]`   | (protected) | ChatDetail   | Yes         |
| `/organization` | (protected) | MemberList   | Yes (Admin) |

Route groups control layouts:

- `(public)` - Minimal layout
- `(guest)` - Redirect to /chats if authenticated
- `(protected)` - Requires auth, includes Header

## Key Components

### Chat System (`components/chat/`)

| Component                    | Purpose                                       |
| ---------------------------- | --------------------------------------------- |
| `chat-detail.tsx`            | Main chat interface with WebSocket connection |
| `chat-list.tsx`              | List of user's chat sessions                  |
| `chat-input.tsx`             | Message input with submit handling            |
| `chat-message.tsx`           | Individual message display                    |
| `tool-permission-dialog.tsx` | Tool permission request modal                 |
| `ask-user-question.tsx`      | Claude question with options                  |
| `connection-status-bar.tsx`  | WebSocket connection indicator                |
| `session-restore-status.tsx` | Session recovery notifications                |

### Authentication (`components/auth/`)

| Component           | Purpose                   |
| ------------------- | ------------------------- |
| `login-form.tsx`    | Login with email/password |
| `register-form.tsx` | New user registration     |
| `logout-button.tsx` | Session logout            |

### Organization (`components/organization/`)

| Component                  | Purpose                      |
| -------------------------- | ---------------------------- |
| `member-list.tsx`          | Organization members display |
| `add-member-dialog.tsx`    | Invite new member            |
| `edit-member-dialog.tsx`   | Update member role           |
| `remove-member-dialog.tsx` | Remove member confirmation   |

## API Integration

### Hono RPC Client (`lib/api/client.ts`)

Typed client with automatic auth handling:

```typescript
import { api } from "@/lib/api/client";

// Server components: calls API directly with Bearer token
// Client components: routes through /api/proxy

const response = await api.chats.$get();
const data = await response.json();
```

### Server Actions (`lib/actions/`)

- `auth.ts` - `getCurrentUser()`, `login()`, `logout()`
- `organization.ts` - `getOrganization()`, member management

### API Proxy (`app/api/proxy/[...path]/route.ts`)

Proxies client-side requests to backend API, forwarding session cookie as Bearer token.

## WebSocket Connection

Chat connects directly to Sandbox Worker (not through API):

1. **Get token**: Server action fetches WebSocket auth token
2. **Connect**: Client connects to `NEXT_PUBLIC_SANDBOX_WS_URL`
3. **Authenticate**: Sends token in WebSocket open message
4. **Stream**: Receives Claude responses as streaming messages

Connection states: `connecting` → `connected` → `disconnected`

Session restoration notifies user when reconnecting to existing session.

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001    # Backend API
NEXT_PUBLIC_SANDBOX_WS_URL=wss://...         # Sandbox WebSocket
```

## Key Files Reference

| File                               | Purpose                                |
| ---------------------------------- | -------------------------------------- |
| `app/(protected)/layout.tsx`       | Auth guard for protected routes        |
| `components/chat/chat-detail.tsx`  | Main chat logic and WebSocket handling |
| `lib/api/client.ts`                | Hono RPC client configuration          |
| `lib/actions/auth.ts`              | Authentication server actions          |
| `app/api/proxy/[...path]/route.ts` | API proxy for client requests          |

## Patterns

### Forms

**MUST use `@tanstack/react-form`** for all forms with Zod validation schemas from `lib/validations/`.

#### Standard Pattern

```typescript
import { useForm } from "@tanstack/react-form";
import { loginSchema } from "@/lib/validations/auth";

const form = useForm({
  defaultValues: { email: "", password: "" },
  onSubmit: async ({ value }) => {
    const result = await serverAction(value);
    if (result.error) {
      setError(result.error);
    }
  },
});
```

#### Field Validation

```typescript
<form.Field
	name="email"
	validators={{
		onChange: loginSchema.shape.email,
	}}
>
	{(field) => (
		<div className="space-y-2">
			<Label htmlFor={field.name}>Email</Label>
			<Input
				id={field.name}
				value={field.state.value}
				onChange={(e) => field.handleChange(e.target.value)}
				onBlur={field.handleBlur}
			/>
			{field.state.meta.errors.length > 0 && (
				<p className="text-sm text-destructive">{field.state.meta.errors[0]?.toString()}</p>
			)}
		</div>
	)}
</form.Field>
```

#### Submit Button State

```typescript
<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
	{([canSubmit, isSubmitting]) => (
		<Button type="submit" disabled={!canSubmit || isSubmitting}>
			{isSubmitting ? "Submitting..." : "Submit"}
		</Button>
	)}
</form.Subscribe>
```

#### Reference Implementations

- `components/auth/login-form.tsx` - Login with email/password
- `components/auth/register-form.tsx` - Registration with validation

### UI Components

Imports from `@repo/ui` (shadcn/ui based). Add new components with:

```bash
pnpm dlx shadcn@latest add <component>
```

### Icons

Uses `lucide-react` for all icons.
