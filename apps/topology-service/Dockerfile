# Multi-stage build for Topology Service

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

RUN npm ci --legacy-peer-deps

COPY src ./src

RUN npm run build
RUN npm prune --omit=dev --legacy-peer-deps

FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
	CMD node -e "require('http').get('http://localhost:3001/health/liveness', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

USER nestjs

CMD ["node", "dist/main"]