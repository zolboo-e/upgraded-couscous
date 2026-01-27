# Command: /plan

## Overview

Initiates feature planning with the architect agent before implementation.

## Usage

```
/plan [feature description]
```

## Workflow

### Phase 1: Requirements Gathering

1. Clarify feature requirements
2. Identify constraints
3. Define success criteria
4. Document user stories

### Phase 2: Architecture Analysis

1. Review existing codebase structure
2. Identify impacted packages
3. Map dependencies
4. Assess current patterns

### Phase 3: Design Proposal

1. Component breakdown
2. API contract design
3. Database schema changes
4. Package boundaries

### Phase 4: Trade-off Analysis

1. Evaluate options
2. Document pros/cons
3. Consider alternatives
4. Migration strategy

### Phase 5: ADR Creation

Create Architecture Decision Record:

```markdown
# ADR-XXX: [Title]

## Status
Proposed

## Context
[Background and motivation]

## Decision
[What we're doing]

## Consequences
[Impact of decision]

## Alternatives
[Other options considered]
```

### Phase 6: Implementation Plan

1. Task breakdown
2. Dependency order
3. Estimated effort
4. Testing strategy

## Output

1. **ADR Document**: Architecture decision record
2. **Task List**: Ordered implementation tasks
3. **File List**: Files to create/modify
4. **Test Plan**: Testing approach

## User Options

After plan presentation:

- **Approve**: Proceed with implementation
- **Modify**: Adjust the plan
- **Reject**: Start over with different approach

## Related

- **Agent**: `architect` for detailed design
- **Command**: `/tdd` for implementation
- **Command**: `/code-review` after implementation
