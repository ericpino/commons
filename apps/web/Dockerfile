FROM node:22-alpine
WORKDIR /app
ARG API_URL=http://api:4000
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_URL=${API_URL}
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/web apps/web
RUN npm run build -w apps/web
RUN npm prune --omit=dev --ignore-scripts
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=12 \
  CMD wget -qO- http://127.0.0.1:3000/ > /dev/null || exit 1
CMD ["npm", "run", "start", "-w", "apps/web"]
