FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM deps AS build-api
COPY apps/api apps/api
RUN npm run build -w apps/api && npm prune --omit=dev --ignore-scripts

FROM deps AS build-web
ARG API_URL=http://api:4000
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_URL=${API_URL}
COPY apps/web apps/web
RUN npm run build -w apps/web && npm prune --omit=dev --ignore-scripts

FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build-api /app/package*.json ./
COPY --from=build-api /app/node_modules ./node_modules
COPY --from=build-api /app/apps/api/package.json ./apps/api/package.json
COPY --from=build-api /app/apps/api/dist ./apps/api/dist
COPY --from=build-api /app/apps/api/prisma ./apps/api/prisma
COPY --from=build-api /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY scripts ./scripts
USER node
EXPOSE 4000
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=12 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["npm", "run", "start", "-w", "apps/api"]

FROM node:22-alpine AS web
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build-web /app/package*.json ./
COPY --from=build-web /app/node_modules ./node_modules
COPY --from=build-web /app/apps/web/package.json ./apps/web/package.json
COPY --from=build-web /app/apps/web/next.config.mjs ./apps/web/next.config.mjs
COPY --from=build-web /app/apps/web/.next ./apps/web/.next
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=12 \
  CMD wget -qO- http://127.0.0.1:3000/ > /dev/null || exit 1
CMD ["npm", "run", "start", "-w", "apps/web"]

