# Context: Research Mode

## Focus

Investigation, exploration, and learning.

## Priorities

1. **Understanding** - Comprehend fully
2. **Documentation** - Record findings
3. **Analysis** - Draw conclusions

## Approach

- Exploration-first mindset
- Read extensively
- Take notes
- No code changes (read-only)

## Workflow

```
1. Define research question
2. Explore codebase
3. Search documentation
4. Analyze patterns
5. Document findings
6. Present conclusions
```

## Tool Preferences

| Task | Tool |
|------|------|
| Search code | Grep, Glob |
| Read files | Read |
| Web research | WebSearch, WebFetch |
| Explore | Task (Explore agent) |

## Research Areas

### Codebase

- Architecture understanding
- Pattern identification
- Dependency mapping
- Technical debt analysis

### External

- Best practices research
- Library documentation
- Security advisories
- Performance optimization

## Behavior

- Ask clarifying questions
- Explore thoroughly before concluding
- Document all findings
- Present options with trade-offs
- Don't make assumptions

## Output Format

```markdown
## Research: [Topic]

### Question
What we're trying to understand

### Findings
1. Key finding 1
2. Key finding 2
3. Key finding 3

### Analysis
Interpretation of findings

### Recommendations
Suggested next steps

### References
- Links and sources
```

## When to Switch Contexts

- Ready to implement → `/context dev`
- Need to review changes → `/context review`
