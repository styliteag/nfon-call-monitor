ARG VERSION=unknown

# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
ARG VERSION
WORKDIR /app

COPY shared/ shared/
COPY frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci

COPY frontend/ frontend/
ENV VITE_APP_VERSION=$VERSION
RUN cd frontend && npm run build

# Stage 2: Build backend
FROM node:22-alpine AS backend-build
WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.build.json ./
COPY shared/ shared/
COPY src/ src/
RUN npm ci && npm run build

# Stage 3: Production
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=backend-build /app/dist dist/
COPY --from=frontend-build /app/frontend/dist frontend/dist/
COPY VERSION ./

ARG VERSION
ENV NODE_OPTIONS="--experimental-sqlite"
ENV APP_VERSION=$VERSION
EXPOSE 3001

CMD ["node", "dist/src/server.js"]
