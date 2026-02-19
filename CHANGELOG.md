# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Reorganized call history table columns: Zeit, Extension, Status, Verbindung, Dauer
- Merged Richtung, Anrufer, and Angerufen into single "Verbindung" column showing `Anrufer → Angerufen` with colored direction arrow

## [1.1.0] - 2026-02-19

### Added
- Extension cards show active call details: caller/callee number, direction arrow (↙/↗), and live duration timer
- Last state change timestamp displayed as relative time ("gerade", "5 Min", "2 Std") on idle extensions
- Extensions sorted numerically by extension number
- Inline answer delay (+Ns) shown next to start time in call history, matching time font size
- Inline end reason shown next to status badge in call history
- Configurable page size selector (5, 10, 20, 30, 50, 100) above call history table
- Pagination controls moved above table for easier access

### Changed
- Extension card line dot uses yellow for ringing, red for busy (previously both red)

### Fixed
- `currentCallId` field in ExtensionInfo was never populated — active calls now correctly merge into extension list

## [1.0.1] - 2026-02-19

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
