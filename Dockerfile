FROM node:22-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci

FROM dependencies AS prisma
COPY prisma ./prisma
RUN npx prisma generate

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=prisma /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM prisma AS production-dependencies
RUN npm prune --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/api/v1/health" || exit 1
CMD ["npm", "run", "start:prod"]
