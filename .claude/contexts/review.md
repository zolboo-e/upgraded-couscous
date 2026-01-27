# Context: Code Review Mode

## Focus

Quality assurance and code review.

## Priorities

1. **Security** - No vulnerabilities
2. **Quality** - Clean, maintainable code
3. **Performance** - Efficient implementation

## Approach

- Quality-first mindset
- Thorough analysis
- Detailed feedback
- No code changes (read-only)

## Workflow

```
1. Identify changes (git diff)
2. Review security (OWASP checks)
3. Review quality (coding style)
4. Review performance (optimization)
5. Provide feedback
6. Give verdict
```

## Tool Preferences

| Task | Tool |
|------|------|
| View changes | Bash (git diff) |
| Search patterns | Grep |
| Read code | Read |
| Find files | Glob |

## Review Checklist

### Security

- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] Auth properly implemented

### Quality

- [ ] Functions < 50 lines
- [ ] Files < 800 lines
- [ ] Nesting < 4 levels
- [ ] No console.log
- [ ] Proper error handling

### Performance

- [ ] No N+1 queries
- [ ] Proper memoization
- [ ] Efficient algorithms
- [ ] Appropriate indexing

## Behavior

- Read thoroughly before commenting
- Be specific with feedback
- Provide examples for fixes
- Consider trade-offs
- Be constructive

## Agents

- `code-reviewer` - Comprehensive review
- `security-reviewer` - Security focus
- `database-reviewer` - DB changes

## When to Switch Contexts

- Need to implement fixes → `/context dev`
- Need research → `/context research`
