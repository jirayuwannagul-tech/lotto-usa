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
RUN npm run build

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0"]
