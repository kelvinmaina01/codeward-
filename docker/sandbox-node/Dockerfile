FROM node:20-slim

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

# Copy Security Scanners from official images (multi-stage build)
COPY --from=aquasec/trivy:0.48.3 /usr/local/bin/trivy /usr/local/bin/trivy
COPY --from=trufflesecurity/trufflehog:latest /usr/bin/trufflehog /usr/local/bin/trufflehog

WORKDIR /app

# The entrypoint will be overridden by the runner.ts
CMD ["sleep", "infinity"]
