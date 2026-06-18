# GitHub App Integration

Codeward is designed to integrate natively into your GitHub workflow as a GitHub App. It intercepts pull requests, runs sandbox analysis, and reports directly in the PR timeline.

## How the GitHub App Works

1. **Webhook Subscriptions:** Codeward listens to `pull_request` (opened, synchronize) and `check_suite` events.
2. **Check Runs:** For every push, Codeward creates a new Check Run in GitHub. This check run is what blocks merging if you have branch protection rules enabled.
3. **Inline Comments:** The Guardian Agent leverages the GitHub API to post inline comments exactly on the line of code where a vulnerability or bloat was detected.

## Setting Up

1. Install the Codeward GitHub App from the Marketplace.
2. Select which repositories the app can access.
3. Configure your branch protection rules to require the "Codeward Guardian" status check to pass before merging.
