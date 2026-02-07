# Build stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy package files (not lockfile to avoid frozen conflicts)
COPY package.json ./

# Install dependencies with Bun
RUN bun install

# Copy source code
COPY . .

# Build the application
RUN bun run nest build auth-api

# Production stage
FROM oven/bun:latest AS production

WORKDIR /app

# Copy package files
COPY package.json ./

# Install only production dependencies
RUN bun install --production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose the port
EXPOSE 3001

# Start the application with Bun
CMD ["bun", "run", "dist/apps/auth-api/main.js"]
