# syntax=docker/dockerfile:1.7

# 1) Dependências
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# 2) Build
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:./build.db
RUN pnpm exec prisma generate
RUN pnpm run build

# 3) Runtime
# Não usa next-standalone porque pnpm + standalone + Prisma é frágil:
# o symlink em node_modules/.prisma quebra na cópia do COPY do Docker.
# Em vez disso copiamos a árvore completa (mais pesado, mas confiável).
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl tini
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/app/data/data.db

# Copia tudo o que é preciso para rodar next start
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

# Diretório que vira volume persistente
RUN mkdir -p /app/data && chown -R node:node /app

USER node
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
# Aplica schema na partida (idempotente) e sobe o Next
CMD ["sh", "-c", "node_modules/.bin/prisma db push --accept-data-loss --skip-generate && node_modules/.bin/next start -H 0.0.0.0 -p 3000"]
