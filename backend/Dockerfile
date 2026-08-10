# ==========================================
# Stage 1: Build & Install Dependencies
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./

# Install ALL dependencies (including dev tools if you use TypeScript)
RUN npm ci

# Copy the rest of your application code
COPY . .

# If you use TypeScript, uncomment the line below:
# RUN npm run build

# Prune devDependencies to keep the production image minimal
RUN npm prune --production

# ==========================================
# Stage 2: Production Execution
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Security: Run as a non-root user built into Alpine
USER node

# Copy only runtime dependencies and source code from builder stage
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app ./

EXPOSE 5000

# Start Node directly (allows clean SIGTERM handling)
CMD ["node", "server.js"]