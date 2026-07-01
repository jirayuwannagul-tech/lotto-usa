FROM node:22.14-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Placeholder env vars — Railway overrides at runtime
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV NEXTAUTH_SECRET=build-placeholder
ENV NEXTAUTH_URL=http://localhost:3000
ENV TELEGRAM_BOT_TOKEN=build-placeholder
ENV TELEGRAM_ADMIN_CHAT_IDS=build-placeholder
ENV TELEGRAM_WEBHOOK_SECRET=build-placeholder
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV TZ=America/Los_Angeles

RUN mkdir -p /data && chmod 777 /data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["sh", "/app/scripts/start.sh"]
