FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    postgresql-client \
    jq \
    tar \
    gzip \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install global security tools manually to avoid script failures
# (Mocking them for local execution engine testing)
RUN echo '#!/bin/sh\necho "Trivy Mock Scan Output"' > /usr/local/bin/trivy && chmod +x /usr/local/bin/trivy
RUN echo '#!/bin/sh\necho "TruffleHog Mock Scan Output"' > /usr/local/bin/trufflehog && chmod +x /usr/local/bin/trufflehog

WORKDIR /app

# The entrypoint will be overridden by the runner.ts
CMD ["sleep", "infinity"]
