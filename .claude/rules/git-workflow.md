# Git Workflow Rules

## Conventional Commits

Use the format: `type(scope): description`

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes nor adds
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(auth): add login with OAuth
fix(api): handle null response from database
docs(readme): update installation instructions
refactor(ui): extract Button component
test(db): add user creation tests
```

## Branch Naming

Format: `type/short-description`

```bash
feat/user-authentication
fix/login-error-handling
refactor/database-schema
```

## Workflow

1. Create branch from `main`
2. Make changes in small, focused commits
3. Run `pnpm lint && pnpm build` before pushing
4. Create PR with clear description
5. Get review and approval
6. Squash and merge to `main`

## Pre-Commit Checklist

Before committing:

- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] Tests pass (when available)
- [ ] No console.log statements
- [ ] No TODO/FIXME without issue reference

## PR Requirements

- Clear title following conventional commit format
- Description of what changed and why
- Link to related issue (if applicable)
- Screenshots for UI changes
- Test coverage maintained or improved

## Protected Branches

- `main`: Production-ready code
  - Requires PR review
  - Requires passing CI
  - No direct pushes

## Git Commands Quick Reference

```bash
# Create feature branch
git checkout -b feat/my-feature

# Stage and commit
git add .
git commit -m "feat(scope): description"

# Update from main
git fetch origin
git rebase origin/main

# Push and create PR
git push -u origin feat/my-feature
gh pr create --title "feat(scope): description" --body "Description here"
```
