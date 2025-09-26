# Multi-stage Dockerfile for Raspberry Pi-like environment
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ENV NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
ENV NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Build the Next.js application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install only production dependencies for runtime (including electron)
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Install Electron for the correct platform
RUN npm install electron@^35.2.0 --save --platform=linux --arch=x64

# Clean up build cache to reduce image size
RUN npm cache clean --force

# Copy the public folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Install Electron and system dependencies for Raspberry Pi
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    xvfb \
    dbus

# Set environment variables for Electron
ENV ELECTRON_DISABLE_SECURITY_WARNINGS=true
ENV DISPLAY=:99
ENV CHROME_BIN=/usr/bin/chromium-browser

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Create startup script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
