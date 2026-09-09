# Contributing to Codeward

First off, thank you for considering contributing to Codeward! 🎉 

Codeward is an autonomous, multi-agent AI code review platform built to eliminate technical debt and catch critical vulnerabilities before code hits production. We welcome contributions from engineers of all backgrounds — whether you're adding a new debt check, improving agent prompts, fixing bugs, or improving documentation.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Repository Structure](#repository-structure)
- [Local Development Setup](#local-development-setup)
- [How to Add a New Debt Check](#how-to-add-a-new-debt-check)
- [Development Workflow](#development-workflow)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs & Requesting Features](#reporting-bugs--requesting-features)

---

## Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to `community@codeward.io`.

---

## Repository Structure

Codeward is organized as a pnpm monorepo:

```text
codeward/
├── apps/
│   ├── api/             # Backend service (Hono.js, Drizzle ORM, BullMQ, Anthropic SDK)
│   ├── web/             # Frontend application & dashboard (React, Vite, Tailwind CSS)
│   └── docs/            # Developer and user documentation
├── docker/
│   ├── sandbox-node/    # Ephemeral container runtime for Node.js analysis
│   └── sandbox-python/  # Ephemeral container runtime for Python analysis
├── legal/               # Privacy policy & terms
└── package.json         # Root monorepo workspace configuration
```

---

## Local Development Setup

### 1. Prerequisites

Ensure you have the following installed locally:
- **Node.js**: `>= 22.0.0`
- **pnpm**: `>= 10.0.0` (`corepack enable pnpm` or `npm install -g pnpm`)
- **Docker**: `>= 24.0.0` (for sandboxes and database containers)
- **PostgreSQL**: `>= 15.0` (with `pgvector` extension)
- **Redis**: `>= 7.0` (for BullMQ queue processing)

### 2. Clone & Install

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/codeward-.git
cd codeward-

# Install dependencies across all packages
pnpm install
```

### 3. Environment Configuration

Copy the sample environment file in `apps/api` and `apps/web`:

```bash
cp .env.example .env.local
```

Configure your local secrets, particularly:
- `ANTHROPIC_API_KEY`: Anthropic API key for Claude agent execution.
- `DATABASE_URL`: PostgreSQL connection string.
- `UPSTASH_REDIS_URL` or local Redis URL.
- `GITHUB_APP_*`: Optional for testing webhook ingestion locally.

### 4. Running the Development Servers

```bash
# Start all services concurrently (API + web dashboard)
pnpm dev

# Or run services individually:
pnpm dev:api   # Hono.js API backend (port 3000)
pnpm dev:web   # Vite React web dashboard (port 5173)
```

---

## How to Add a New Debt Check

One of the most impactful ways to contribute is by adding a new automated debt check to one of the 8 specialized agents:
- **Security Agent**: Vulnerabilities, secrets, CVEs, access controls.
- **Bloat Agent**: Dead code, AST-level duplication, unused dependencies.
- **Broken Code Agent**: Race conditions, unhandled exceptions, memory leaks.
- **Architecture Agent**: N+1 queries, cold start latency, tight coupling.
- **AI-Era Agent**: Prompt injection vectors, RAG drift, model hallucinations.
- **Compliance Agent**: GDPR, EU AI Act, WCAG accessibility.
- **Data & DX Agent**: Pipeline regressions, missing schema types.

### Steps to Implement a New Check:

1. **Open an Issue**: Use our [New Check Proposal Template](.github/ISSUE_TEMPLATE/new_check_proposal.md) describing what the check catches, severity, and tool/methodology.
2. **Define the Check**: Add the check specification and rules in `apps/api/src/agents/`.
3. **Add Deterministic Scanners or Prompts**:
   - For static/deterministic checks: integrate tree-sitter AST queries, grep patterns, or tool integrations (OWASP ZAP, Trivy).
   - For semantic checks: add structured prompt guidelines and few-shot examples for Claude.
4. **Create a Test Fixture**: Add a sample code snippet that should successfully trigger the check and verify the suggested diff/fix.
5. **Update Documentation**: Add the new check to the corresponding agent table in `README.md`.

---

## Development Workflow

1. Create a descriptive branch from `main`:
   ```bash
   git checkout -b feat/add-sql-injection-ast-check
   ```
2. Make your changes and ensure your code is cleanly formatted and typed.
3. Build and test locally:
   ```bash
   pnpm run build:api
   pnpm run build:web
   ```

---

## Commit Message Guidelines

We follow the [Conventional Commits specification](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <subject>
```

### Types:
- `feat`: A new feature or check
- `fix`: A bug fix
- `docs`: Documentation updates
- `style`: Code style changes (formatting, missing semi-colons, etc.)
- `refactor`: Code refactoring without behavioral change
- `test`: Adding or correcting tests
- `chore`: Maintenance tasks, dependency bumps

### Examples:
- `feat(security): add detection for missing tenant_id in multi-tenant queries`
- `fix(web): resolve overflow issue in DiffViewer modal`
- `docs: update self-hosting instructions for Docker Compose`

---

## Pull Request Process

1. Push your branch to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request against the `main` branch of `kelvinmaina01/codeward-`.
3. Complete the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md) with details of your change.
4. Codeward's automated review agents will run on your PR and verify linting, security, and type safety.
5. A maintainer will review your PR, suggest any necessary adjustments, and merge once approved!

---

## Reporting Bugs & Requesting Features

- **Security issues**: Please do **not** file public issues for security vulnerabilities. Follow [SECURITY.md](SECURITY.md).
- **Bug reports**: Use the [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md).
- **Feature ideas**: Propose new ideas using the [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md).

Thank you for helping make codebases cleaner, faster, and more secure with Codeward! 🛡️
