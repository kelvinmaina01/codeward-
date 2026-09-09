# Security Policy

The Codeward team takes the security and integrity of our software and user data seriously. Because Codeward executes code analysis and handles git webhooks, maintaining strict isolation and security standards is fundamental to everything we build.

---

## Supported Versions

Only the latest release and the current active development branch receive security updates and patches:

| Version | Supported          |
| ------- | ------------------ |
| 1.x / `main` | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, pull requests, or Discord discussions.**

Instead, please report vulnerabilities directly to our security team via email:

📧 **security@codeward.io**

### What to include in your report:
- A clear description of the vulnerability, including type (e.g., SSRF, RCE, token leakage, auth bypass).
- Steps to reproduce or a minimal proof-of-concept (POC).
- Affected components (e.g., `apps/api`, `docker/sandbox-*`, `apps/web`).
- Any potential impact on users, infrastructure, or third-party repositories.
- (Optional) Suggested remediation or patch.

### Our Commitment:
- **Acknowledgement**: We will acknowledge receipt of your vulnerability report within **48 hours**.
- **Assessment**: We will confirm the issue, determine its severity using CVSS metrics, and keep you informed of our progress.
- **Fix & Disclosure**: We will prepare and deploy a patch promptly. Once the fix is released, we will coordinate public disclosure and credit you appropriately (unless you prefer anonymity).

---

## Sandbox Security & Isolation Notes

For researchers analyzing our ephemeral sandboxes:
- Sandboxes are run in isolated containers/microVMs without persistent root access or network bridges into internal databases.
- Network access during analysis runs is disabled or strictly monitored.
- We welcome reports demonstrating escape vulnerabilities or unauthorized credential access within the execution pipeline.

Thank you for helping keep Codeward and our community safe! 🛡️
