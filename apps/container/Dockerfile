# ==================== BASE ====================
FROM docker.io/cloudflare/sandbox:0.7.0 AS base

RUN apt-get update && apt-get install -y rsync && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/root/.local/bin:$PATH"

# ==================== PRUNER ====================
FROM node:22-alpine AS pruner

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
RUN pnpm add -g turbo

WORKDIR /app
COPY . .

# Prune to only @repo/container and its dependencies
RUN turbo prune @repo/container --docker

# ==================== BUILDER ====================
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Install dependencies from pruned lockfile
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=@repo/container

# ==================== RUNNER ====================
FROM base AS runner

WORKDIR /workspace

# Copy built app and production package.json
COPY --from=builder /app/apps/container/dist ./dist
COPY --from=builder /app/apps/container/package.json ./package.json

# Install pnpm and production dependencies
# RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
# RUN bun install --prod
# RUN bun install -g pnpm
# RUN pnpm install --prod

ENV COMMAND_TIMEOUT_MS=300000
EXPOSE 8080
