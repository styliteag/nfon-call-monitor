# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.4] - 2026-02-22

### Improved
- **Extension Cards** — Hover-Effekt für Status-Punkte (Line, Presence, Agent): Vergrößerung, sanfte Animation und Pointer-Cursor
- **Agent-Status Tooltip** — zeigt jetzt "Agent: On/Off" statt "Angemeldet/Abgemeldet"

## [1.5.3] - 2026-02-22

### Added
- **Footer** — neuer Footer im Layout mit Copyright (Stylite AG), Links zu GitHub-Repo und Blog, Server-Uptime (via `/api/health`, aktualisiert jede Minute) und App-Version

## [1.5.2] - 2026-02-21

### Added
- **Auto-Update-Banner** — informiert Benutzer mit offener Session wenn eine neue Version deployed wurde
  - Frontend pollt alle 60 Sekunden `/api/version` und vergleicht mit der initialen Version
  - Blaues Banner mit "Jetzt aktualisieren"-Button erscheint bei Versionswechsel
- **Cache-Control für index.html** — `no-cache` Header verhindert dass der Browser eine veraltete `index.html` aus dem Cache lädt

### Fixed
- TypeScript-Build-Fehler im Docker: `UserStatusValue`-Typ in Layout Props und fehlender `renotify`-Typ in Notification API

## [1.5.1] - 2026-02-21

## [1.5.0] - 2026-02-21

### Added
- **Health-Check-Endpoint** — `GET /api/health` (ohne Auth) liefert Server-Status für Monitoring-Tools (Uptime Kuma, etc.)
  - `200 ok` wenn NFON SSE verbunden, `503 degraded` wenn nicht
  - Enthält `version`, `uptime`, `nfonConnected`, `socketClients`
- **Tägliches Datenbank-Backup** — automatisches SQLite-Backup jeden Tag um 02:00 Uhr
  - Backups werden im selben Verzeichnis wie die DB gespeichert (`backups/calls-YYYY-MM-DD.db`)
  - Im Docker-Setup landen sie im bestehenden Volume (`/app/data/backups/`)
  - Alte Backups werden automatisch bereinigt (Standard: 7 Tage, konfigurierbar via `BACKUP_KEEP_DAYS`)
- **Konfigurierbare Aufbewahrungsdauer** — Anrufe älter als X Tage werden täglich automatisch gelöscht
  - Standard: 60 Tage, konfigurierbar via `RETENTION_DAYS`
  - Purge läuft täglich um 02:00 nach dem Backup (Backup enthält noch alle Daten)
- **"Echt verpasst"-Filter** — neuer Status-Filter der Gruppenrufe beruecksichtigt
  - Bei Sammelruf (z.B. "Zentral") gilt ein Anruf nur als verpasst wenn KEINE Nebenstelle angenommen hat
  - Korrelation ueber Call-ID (`id NOT IN (SELECT id FROM calls WHERE status = 'answered')`)
- **Prometheus-Metriken** — `GET /api/metrics` mit Basic Auth fuer Grafana-Integration
  - Metriken: `nfon_up`, `nfon_uptime_seconds`, `nfon_websocket_clients`, `nfon_active_calls`, `nfon_extensions_total`, `nfon_calls_total{status=...}`, `nfon_memory_bytes{type=...}`
  - Aktivierung via `METRICS_USER` und `METRICS_PASS` Env-Variablen (deaktiviert wenn nicht gesetzt)
- **Browser-Push-Notifications** — Desktop-Benachrichtigungen fuer eingehende und verpasste Anrufe
  - Glocken-Icon im Header zum Ein-/Ausschalten
  - Zeigt Anrufer und Nebenstelle in der Notification
  - Einstellung wird in localStorage gespeichert
- **"Meine Extension"-Auswahl** — Benutzer kann seine eigene Nebenstelle im Header setzen
  - Notifications werden nur fuer die eigene Nebenstelle angezeigt
  - Auswahl wird in localStorage gespeichert (persistent ueber Sessions)
- **Benutzer-Status (Praesenz)** — jeder Benutzer kann seinen Status setzen, sichtbar fuer alle
  - Presets: Online, Office, Homeoffice, Mittagspause, Offline
  - Freitext-Statusnachricht (max 100 Zeichen)
  - Farbige Badges auf den ExtensionCards (gruen/blau/gelb/grau)
  - Status wird in SQLite gespeichert (persistent ueber Neustarts)
  - Echtzeit-Broadcast an alle Clients via Socket.IO
  - `POST /api/extensions/status` Endpoint
  - Datum und Uhrzeit der letzten Statusaenderung auf der ExtensionCard (z.B. "Heute 14:32")
  - Status "–" (none) zum Zuruecksetzen — ExtensionCard zeigt dann keinen Status an

### Changed
- **ConnectionStatus** nach rechts verschoben und "Online" in "Verbunden" umbenannt
- **"Meine Extension"-Dropdown** nach Extension-Nummer sortiert
- **PLANNED-FEATURES.md** — Roadmap-Dokument mit geplanten Features

## [1.4.11] - 2026-02-21

### Added
- **Server-Downtime-Erkennung** — beim Start prüft der Server wie lange er offline war und erstellt einen Eintrag in der Anrufliste
  - Heartbeat-Timestamp wird alle 60s in die DB geschrieben (`server_heartbeat`-Tabelle)
  - Bei Downtime >= 2 Minuten erscheint ein System-Eintrag mit Info-Icon und Dauer in der Call-History
  - Neuer `system`-Status für CallRecord mit eigenem Badge und spezieller Zeilen-Darstellung

## [1.4.10] - 2026-02-21

### Changed
- "Zeit" column now shows **Heute** / **Gestern** instead of the numeric date for today and yesterday

## [1.4.9] - 2026-02-20

### Fixed
- Agent on/off dial code events (`*87`/`**87`) are no longer hidden from the call log

### Changed
- NFON function codes reference added to `server.ts` and `.env.example` (link to NFON docs)
- `SPECIAL_NUMBERS` example in `.env.example` now lists all fixed NFON dial codes

## [1.4.8] - 2026-02-20

### Added
- **Agent queue status tracking** — third status dot (blue) on extension cards shows whether an agent is logged into the queue
  - Tracks `*87` (Agent On) and `**87` (Agent Off) dial codes from SSE events
  - Status persisted in SQLite — survives server restarts
  - Configurable via `AGENT_ON_CODE` / `AGENT_OFF_CODE` env vars (defaults: `*87` / `**87`)

## [1.4.7] - 2026-02-20

### Changed
- Structured logging: new `src/log.ts` module with `info`/`warn`/`error`/`debug` levels and timestamps
- Default output reduced to startup, errors, and warnings only — set `LOG=debug` for full event details
- All SSE events, call state transitions, presence polling, and Socket.IO activity now behind `LOG=debug`

### Fixed
- Ring group calls: cancel ringing on all extensions when one answers, even across different NFON UUIDs (cascaded ring groups)
- Call history: deduplicate entries by (id, extension) when NFON re-rings the same extension, preventing duplicate React keys and stale "Klingelt" display
- Zentrale calls now show "Z-0" instead of "Z-Z" (Durchwahl "0" no longer replaced with Standort name)

## [1.4.6] - 2026-02-20

## [1.4.5] - 2026-02-20

### Fixed
- Docker multi-platform build: use host platform for build stages to avoid QEMU arm64 crashes

## [1.4.4] - 2026-02-20

### Added
- Internal extension numbers in call history show extension name with "(intern)" label (e.g. "Michael Seifert (intern) 52")
- **Configurable special numbers** — `SPECIAL_NUMBERS` env var maps short codes to labels (e.g. `*55:Primär,*87:Agent On,**87:Agent Off`)

## [1.4.3] - 2026-02-20

### Changed
- Extension cards show formatted phone number alongside CRM contact name

### Fixed
- Presence polling overwrote active call data on extension cards (cards went gray during calls)
- Outbound calls regressed from "active" back to "ringing" because NFON sends `dial`/`ring` after `caller-answer`

## [1.4.2] - 2026-02-20

### Changed
- **Adaptive presence polling** — polling rate adjusts automatically based on activity:
  - Event in last 30s → every 3s
  - Event in last 5min → every 15s
  - Event in last 1hr → every 30s
  - Idle → every 60s
- **projectfacts cache refresh** — address book reload interval changed from 15 minutes to 1 hour

### Fixed
- Extension cards now update immediately when a call starts, changes, or ends (previously only updated on next presence poll)

### Removed
- `PRESENCE_POLL_INTERVAL` environment variable (replaced by adaptive polling)

## [1.4.1] - 2026-02-20

### Added
- **Name search**: When projectfacts is active, the search field also matches PF contact names (not just phone numbers and extension names)
- **Copy to clipboard**: Small copy icon on each phone number (appears on hover), copies formatted number with green checkmark confirmation

### Changed
- Search placeholder updated to "Nummer oder Name suchen…"

## [1.4.0] - 2026-02-20

### Fixed
- Status column too narrow — widened from 120px to 180px to fit badge + end reason without overflow

### Added
- **Click-to-Dial** — Initiate outgoing calls directly from the dashboard
  - Drag & drop any phone number onto an extension card to call
  - Clipboard button on each extension card — reads clipboard and initiates call
  - Inline confirmation dialog on the card (replaces browser `confirm()`)
  - Success/error feedback overlay on the card
- **Backend API**: `POST /api/click-to-dial` (initiate call), `DELETE /api/click-to-dial/:uuid` (cancel call)
- **Debug logging** — Set `LOG=debug` in `.env` to enable verbose logging for Click-to-Dial requests, SSE raw events, and presence changes
- **Configurable presence polling** — `PRESENCE_POLL_INTERVAL` in `.env` (in ms, default: 15s, was 30s)
- Generic `apiPost` and `apiDelete` functions in backend API layer

### Fixed
- Call aggregator now recognizes NFON-specific SSE states: `caller-dial`, `caller-ring` → ringing; `caller-answer` → active. Outgoing calls no longer stuck on "ringing"
- Presence polling only logs and emits on actual presence/line changes (ignores timestamp-only updates)
- Phone number sanitization for Click-to-Dial: strips spaces, dashes, parentheses; validates digits-only; normalizes `0...` → `49...` and `+49...` → `49...`

## [1.3.2] - 2026-02-20

## [1.3.1] - 2026-02-20

### Fixed
- Docker build failure: replaced ESM-only `import.meta.url` with CommonJS `__dirname` in phone-utils.ts
- Runtime crash: copy german-area-codes.json to dist/ during Docker build (tsc doesn't copy non-TS files)

## [1.3.0] - 2026-02-20

### Added
- **projectfacts Integration**: Optional [projectfacts](https://www.projectfacts.de/) phone number lookup — contact names shown in blue next to phone numbers
- **City lookup**: German landline numbers display the city name (e.g. "Bensheim") based on 5,200+ area codes from Bundesnetzagentur
- **Phone type labels**: Mobile numbers labeled "Mobil", special numbers labeled "Sonderrufnummer" (amber italic)
- **Fuzzy matching**: For German landline numbers, tries removing up to 3 trailing digits to find projectfacts matches (shown with "?" indicators)
- **Phone formatting**: Numbers displayed as `+49 6251 555` with proper area code / mobile prefix spacing
- **Standort display**: Called numbers show office name, e.g. `ZBens-20` instead of just `20`
- Batch projectfacts lookup endpoint (`POST /api/pf/lookup-batch`) for efficient frontend resolution
- Frontend `usePfContacts` hook with client-side caching

### Changed
- Verbindung column uses larger font size (matching Dauer column)
- Caller column widened to 320px for better readability with contact names

### Configuration
- `PF_API_BASE_URL`, `PF_API_DEVICE_ID`, `PF_API_TOKEN` — projectfacts connection (optional, all features except contact names work without it)
- `MOBILE_PREFIXES` — mobile prefixes excluded from fuzzy matching (sensible defaults built in)
- `SPECIAL_PREFIXES` — special number prefixes excluded from fuzzy matching (sensible defaults built in)

## [1.2.1] - 2026-02-19

### Added
- Search field in call history filters to search by phone number (caller, callee) or extension name
- Server-side LIKE search across caller, callee, and extension_name columns

## [1.2.0] - 2026-02-19

### Changed
- Reorganized call history table columns: Zeit, Extension, Status, Dauer, Verbindung
- Merged Richtung, Anrufer, and Angerufen into single "Verbindung" column showing `Anrufer → Angerufen` with grid-aligned arrows
- Arrow color now matches call status (green/red/orange/yellow/blue)
- End reason (cancel, stale, etc.) displayed as rounded yellow badge
- Fixed-width table layout with tighter padding for compact rows
- Arrow always points right (caller → callee); direction shown via tooltip

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
