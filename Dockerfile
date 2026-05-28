# ============================================================
# PRODUCTION DOCKERFILE — Multi-stage build
# Stage 1: Build the React/Vite app
# Stage 2: Serve with Nginx (Alpine)
# ============================================================

# ── Stage 1: Node builder ───────────────────────────────────
FROM node:20-alpine AS builder

LABEL maintainer="devops@yourcompany.com"
LABEL stage="builder"

# Security: run as non-root during build
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy dependency manifests first (layer cache optimisation)
COPY package*.json ./

# Install ALL deps (including devDeps needed for build)
RUN npm ci --frozen-lockfile

# Copy source
COPY . .

# Build production bundle
ARG VITE_APP_VERSION=1.0.0
ARG VITE_BUILD_DATE
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_BUILD_DATE=$VITE_BUILD_DATE

RUN npm run build

# ── Stage 2: Nginx production server ────────────────────────
FROM nginx:1.27-alpine AS production

LABEL maintainer="devops@yourcompany.com"
LABEL stage="production"
LABEL org.opencontainers.image.title="DevOps Dashboard"
LABEL org.opencontainers.image.description="Production-ready React application"
LABEL org.opencontainers.image.vendor="YourCompany"

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/app.conf /etc/nginx/conf.d/app.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx cache dirs and set permissions
RUN mkdir -p /var/cache/nginx/client_temp \
             /var/cache/nginx/proxy_temp \
             /var/cache/nginx/fastcgi_temp \
             /var/cache/nginx/uwsgi_temp \
             /var/cache/nginx/scgi_temp \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/run/nginx.pid

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

# Run as non-root
USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
