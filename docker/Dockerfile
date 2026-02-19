# Stage 1: Build frontend
FROM node:22-slim AS frontend-build
WORKDIR /app

COPY shared/ shared/
COPY frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci

COPY frontend/ frontend/
RUN cd frontend && npm run build


# Stage 2: Production
FROM node:22-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/ src/
COPY shared/ shared/
COPY tsconfig.json ./
COPY --from=frontend-build /app/frontend/dist frontend/dist/

ENV NODE_OPTIONS="--experimental-sqlite"
EXPOSE 3001

CMD ["npx", "tsx", "src/server.ts"]
