---
name: New Debt Check Proposal
about: Propose a new automated code debt or security check for Codeward's 8 agents
title: '[CHECK] <Name of the Proposed Check>'
labels: ['check-proposal', 'debt-check']
assignees: ''
---

## Summary
Briefly describe what this check detects and why it is critical or valuable.

## Target Agent
Which agent should run this check?
- [ ] Security Agent
- [ ] Bloat Agent
- [ ] Broken Code Agent
- [ ] Architecture Agent
- [ ] AI-Era Agent
- [ ] Compliance Agent
- [ ] Data & DX Agent

## Check Severity
- [ ] 🔴 Critical (Blocks merge by default)
- [ ] 🟡 High
- [ ] 🟠 Medium
- [ ] 🔵 Low / Informational

## Detection Strategy
How will this check detect the issue?
- [ ] Tree-sitter AST scanning (Language-agnostic AST query)
- [ ] Deterministic CLI tool (e.g. ZAP, Trivy, truffleHog, k6)
- [ ] Ephemeral execution probing (firing sandbox requests, checking HTTP responses)
- [ ] LLM Semantic Analysis (Claude prompt with structured output)

## Example Scenario

### Bad Pattern (Should trigger this check):
```typescript
// Add sample vulnerable or bloated code snippet here
```

### Good Pattern / Recommended Fix:
```typescript
// Add the corrected code or suggested diff here
```

## Additional References
Links to CVE, OWASP guidelines, blog posts, or research documentation related to this check.
