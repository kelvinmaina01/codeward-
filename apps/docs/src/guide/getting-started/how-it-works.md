# How it Works

Codeward integrates directly with your GitHub repository to provide autonomous code reviews.

1. **Webhook Trigger:** When you push code, GitHub sends a webhook to Codeward.
2. **Sandbox Creation:** Codeward provisions a secure, ephemeral Firecracker microVM.
3. **Repository Clone:** Your code is cloned securely into the sandbox.
4. **Agent Analysis:** 15 AI agents run in parallel, analyzing security, bloat, architecture, and more.
5. **Report Generation:** The Guardian Agent compiles the findings and posts them as inline comments and PR reviews on GitHub.
6. **Sandbox Destruction:** The microVM is immediately destroyed, ensuring your code is never persisted.
