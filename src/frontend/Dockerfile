FROM node:20-alpine as build

# Upgrade OpenSSL to patch CVE-2025-15467, CVE-2025-69419, CVE-2025-69421
RUN apk upgrade --no-cache libcrypto3 libssl3

WORKDIR /app

# Add build argument for API URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./

# Install all dependencies (including dev dependencies) needed for build
RUN npm install

COPY . .

# Run the build (vite is in devDependencies)
RUN npm run build

# Remove dev dependencies to slim down the final image (optional)
RUN npm prune --production

FROM nginx:alpine

# Upgrade OpenSSL to patch CVE-2025-15467, CVE-2025-69419, CVE-2025-69421
RUN apk upgrade --no-cache libcrypto3 libssl3

# Create non-root user for nginx
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /usr/share/nginx/html && \
    chown -R appuser:appuser /var/cache/nginx && \
    chown -R appuser:appuser /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appuser /var/run/nginx.pid

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

# Switch to non-root user
USER appuser

EXPOSE 3000

# Add healthcheck to verify nginx is responding
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]