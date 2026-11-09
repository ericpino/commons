FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/api apps/api
RUN npm run build -w apps/api
RUN npm prune --omit=dev --ignore-scripts
USER node
CMD ["npm", "run", "start", "-w", "apps/api"]
