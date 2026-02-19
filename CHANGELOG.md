# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Optimized Docker image: switched from `node:22-slim` to `node:22-alpine` and added 3-stage build with TypeScript pre-compilation
- Moved `tsx` and `typescript` to devDependencies (excluded from production image)
- Production container now runs compiled JS (`node dist/src/server.js`) instead of `npx tsx`

## [1.0.0] - 2026-02-19

### Added
- Real-time call monitoring via NFON SSE API
- Dashboard with login and session-based authentication
- Active calls display with caller information and Durchwahl extraction
- Call history with search and filtering
- Extension presence monitoring
- Dark mode support
- Docker multi-platform build support (amd64/arm64)
- SQLite-based call record persistence
