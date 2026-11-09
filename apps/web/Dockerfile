FROM node:22-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/web apps/web
ENV API_URL=http://api:4000
RUN npm run build -w apps/web
RUN npm prune --omit=dev --ignore-scripts
USER node
CMD ["npm", "run", "start", "-w", "apps/web"]
