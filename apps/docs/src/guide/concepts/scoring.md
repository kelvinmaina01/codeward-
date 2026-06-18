# The Debt Scoring Model

Codeward evaluates code using a rigorous quantitative scoring model. Every PR starts with a perfect score of 100, and points are deducted for each piece of debt introduced.

## The Formula

The final score is a weighted average of the findings from the 12 analyzer agents.

- **Critical Findings:** Automatic score of 0. The PR is hard-blocked.
- **High Findings:** -15 points each.
- **Medium Findings:** -5 points each.
- **Low Findings:** -1 point each.

## Thresholds

If the final `weightedScore` falls below your repository's configured `securityMinScore` (default 80), the Orchestrator will mark the GitHub check run as **Failed** and request changes.
