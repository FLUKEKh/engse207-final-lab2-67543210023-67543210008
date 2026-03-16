FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# Use npm install when package-lock.json is not present (CI requires a lockfile)
RUN npm install --omit=dev --no-audit --no-fund
COPY src/ ./src/
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3003/api/logs/health || exit 1
CMD ["node", "src/index.js"]