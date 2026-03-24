FROM node:22.14-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
# Placeholder env vars so Turbopack doesn't inline as undefined at build time
# Railway overrides these with real values at runtime
ENV NEXTAUTH_SECRET=build-placeholder
ENV NEXTAUTH_URL=http://localhost:3000
ENV TELEGRAM_BOT_TOKEN=build-placeholder
ENV TELEGRAM_ADMIN_CHAT_IDS=build-placeholder
ENV TELEGRAM_WEBHOOK_SECRET=build-placeholder
RUN npm run build

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000
CMD ["sh", "/app/scripts/start.sh"]
