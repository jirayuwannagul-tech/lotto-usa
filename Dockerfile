FROM node:22.14-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && echo 'Starting Next.js...' && node_modules/.bin/next start -p ${PORT:-3000} -H 0.0.0.0"]
