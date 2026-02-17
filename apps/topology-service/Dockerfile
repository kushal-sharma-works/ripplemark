# Multi-stage build for Topology Service

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies (including dev dependencies for building)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev --legacy-peer-deps

# Stage 2: Production
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health/liveness', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Switch to non-root user
USER nestjs

# Start the application
CMD ["node", "dist/main"]
