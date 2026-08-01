# -------- Build Stage --------

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

COPY apps ./apps
COPY libs ./libs
COPY scripts ./scripts

RUN npm install

RUN npm run build notification-service

# -------- Production Stage --------

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Installs ONLY production dependencies.
RUN npm install --omit=dev

# Copies compiled output from builder stage:
COPY --from=builder /app/dist ./dist

COPY --from=builder /app/libs ./libs
COPY --from=builder /app/scripts ./scripts

ENV NODE_ENV=production

CMD ["node", "dist/apps/notification-service/main.js"]