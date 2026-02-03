FROM docker.io/cloudflare/sandbox:0.7.0

# Install strace for debugging
RUN apt-get update && apt-get install -y rsync && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI globally
RUN curl -fsSL https://claude.ai/install.sh | bash

# Add to PATH
ENV PATH="/root/.local/bin:$PATH"

# Install runtime dependencies in /workspace
WORKDIR /workspace
RUN bun install hono @hono/node-server ws @anthropic-ai/claude-agent-sdk @upstash/redis

# Copy server files
COPY container/server.ts /workspace/server.ts

ENV COMMAND_TIMEOUT_MS=300000
EXPOSE 8080