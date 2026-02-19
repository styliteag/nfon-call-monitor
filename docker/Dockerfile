ARG VERSION=unknown

# Stage 1: Build frontend
FROM node:22-slim AS frontend-build
ARG VERSION
WORKDIR /app

COPY shared/ shared/
COPY frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci

COPY frontend/ frontend/
ENV VITE_APP_VERSION=$VERSION
RUN cd frontend && npm run build


# Stage 2: Production
FROM node:22-slim
ARG VERSION
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/ src/
COPY shared/ shared/
COPY tsconfig.json ./
COPY VERSION ./
COPY --from=frontend-build /app/frontend/dist frontend/dist/

ENV NODE_OPTIONS="--experimental-sqlite"
ENV APP_VERSION=$VERSION
EXPOSE 3001

CMD ["npx", "tsx", "src/server.ts"]
