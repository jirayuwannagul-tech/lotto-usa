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
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0"]
