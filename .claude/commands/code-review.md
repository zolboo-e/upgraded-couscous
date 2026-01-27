# Command: /code-review

## Overview

Initiates comprehensive code review with security, quality, and performance checks.

## Usage

```
/code-review [file or directory]
```

Without arguments, reviews recent changes:

```
/code-review
```

## Workflow

### Phase 1: Identify Changes

```bash
git diff --name-only HEAD~1
git diff HEAD~1
```

### Phase 2: Security Review (Critical)

Check for:

- Hardcoded credentials
- SQL injection risks
- XSS vulnerabilities
- Missing input validation
- Insecure dependencies
- Authentication bypasses

### Phase 3: Quality Review (High)

Check for:

- Function complexity (>50 lines)
- File size (>800 lines)
- Nesting depth (>4 levels)
- Error handling coverage
- Console.log statements
- TypeScript strict compliance

### Phase 4: Performance Review (Medium)

Check for:

- N+1 database queries
- Unnecessary re-renders
- Missing memoization
- Large bundle imports
- Inefficient algorithms

### Phase 5: Best Practices (Medium)

Check for:

- Naming conventions
- Documentation coverage
- Accessibility compliance
- Biome formatting
- Magic numbers

## Output Format

```markdown
## Code Review Summary

### Files Reviewed
- file1.ts
- file2.tsx

### Security Issues
- [CRITICAL] Description - file:line

### Quality Issues
- [HIGH] Description - file:line

### Performance Issues
- [MEDIUM] Description - file:line

### Recommendations
- Suggestion for improvement

### Verdict: ✅ Approve | ⚠️ Warning | ❌ Block
```

## Approval Criteria

### ✅ Approve

- No critical or high issues
- All security checks pass

### ⚠️ Warning

- Medium issues present
- Requires follow-up

### ❌ Block

- Critical security issues
- High priority unaddressed

## Related

- **Agent**: `code-reviewer` for detailed review
- **Agent**: `security-reviewer` for security focus
- **Command**: `/build-fix` if issues found
