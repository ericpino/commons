FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/api apps/api
COPY scripts scripts
RUN npm run build -w apps/api
RUN npm prune --omit=dev --ignore-scripts
USER node
EXPOSE 4000
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=12 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["npm", "run", "start", "-w", "apps/api"]
