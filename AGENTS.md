# AGENTS.md — NFON Call Monitor

Projektkontext und Konventionen für AI-Agenten.

## Architektur-Überblick

Zwei-Tier-Architektur: Node.js-Backend als Proxy/Aggregator, React-Frontend als Dashboard.

**Das Frontend spricht NICHT direkt mit NFON.** Gründe:
- NFON API hat keine CORS-Header → Browser-Requests werden geblockt
- Credentials (Username/Password) dürfen nicht im Browser liegen
- NFON hat keinen Call-History-Endpoint → Backend muss den Live-SSE-Stream mitschneiden und in SQLite persistieren

### Datenfluss

```
NFON SSE → nfon-connector.ts → call-aggregator.ts → db.ts (SQLite)
                                       │
                                       ▼
                              Socket.IO → React Frontend
                              REST API  → React Frontend
```

## Technologie-Entscheidungen

| Entscheidung | Begründung |
|---|---|
| `node:sqlite` statt `better-sqlite3` | Native Modul kompiliert nicht auf Node v25 (fehlendes `<climits>`) |
| SQLite statt Postgres/MySQL | Kein externer DB-Server nötig, Single-File, ausreichend für diesen Use-Case |
| Socket.IO statt plain WebSocket | Auto-Reconnect, Room-Support, Fallback auf Polling |
| Tailwind CSS v4 | Utility-First, kein separater CSS-Build-Step mit `@tailwindcss/vite` |
| Dark Mode via class-Strategie | `@custom-variant dark (&:where(.dark, .dark *))` in `index.css`, Toggle in `useDarkMode` hook, localStorage-persistiert |

## Projektstruktur

```
shared/types.ts              # Interfaces die Backend + Frontend teilen
src/                         # Backend (Express + NFON-Anbindung)
  auth.ts                    # NICHT ÄNDERN — Login + Token-Refresh funktioniert
  api.ts                     # NICHT ÄNDERN — API-Aufrufe funktionieren
  monitor.ts                 # Standalone CLI-Tool, unabhängig vom Server
  server.ts                  # Express + Socket.IO Einstiegspunkt
  db.ts                      # SQLite mit node:sqlite (DatabaseSync)
  call-aggregator.ts         # Korreliert SSE-Events per UUID zu CallRecords
  nfon-connector.ts          # SSE-Verbindung, Reconnect, Extension-Loading
  routes/calls.ts            # GET /api/calls (paginiert + Filter)
  routes/extensions.ts       # GET /api/extensions
frontend/                    # React + Vite + Tailwind
  src/hooks/                 # useSocket, useCalls, useExtensions, useDarkMode
  src/components/            # UI-Komponenten (alle mit dark: Varianten)
  src/lib/                   # API-Client, Formatter
```

## Workflow-Regeln

- **Immer CHANGELOG.md updaten vor dem Commit** — Einträge in die `[Unreleased]` Section schreiben
- **Commit mit `--no-gpg-sign`** — 1Password Signing Agent macht Probleme

## Konventionen

- **Sprache**: Code auf Englisch, UI-Texte auf Deutsch
- **TypeScript**: Strict mode, shared types in `shared/types.ts`
- **Backend**: CommonJS package (`"type": "commonjs"`), ausgeführt mit `tsx`
- **Frontend**: ESM (`"type": "module"`), Vite + React 19
- **SQLite named params**: `:name` Syntax (Node.js built-in), NICHT `@name` (better-sqlite3)
- **Ports**: Backend 3001, Frontend Dev 5173 (Vite proxy für `/api` und `/socket.io`)
- **Dark Mode**: Alle neuen Komponenten müssen `dark:` Varianten haben
- **tsx -e**: Top-level await geht nicht (CJS), `require('./src/foo.ts')` statt `import './src/foo.js'`

## NFON Call States

SSE-Events haben ein `state`-Feld mit diesem Lifecycle:

```
start → dial → ring → answer → bridge → hangup → end
```

- **Angenommen**: `answer` oder `bridge` wurde erreicht → CallStatus "answered"
- **Verpasst**: `end` ohne `answer` → Status basiert auf `error`-Feld:
  - `timeout` / `cancel` → "missed"
  - `busy` → "busy"
  - `reject` → "rejected"

## NFON API Presence-Werte

Die `/v1/extensions/phone/states` API liefert pro Extension **zwei Status-Felder**:
- `presence`: `"available"` oder `"offline"` (NICHT "online"!)
- `line`: `"idle"`, `"offline"`, `"busy"`, `"ringing"`

Beide werden als farbige Punkte auf den Extension-Cards angezeigt (links=Line, rechts=Presence).
Die Card-Umrandung richtet sich nach dem Line-Status.

**Achtung**: Bei mehreren Endgeräten pro Extension kann `presence` "offline" sein, obwohl der User erreichbar ist. Das ist eine NFON-Eigenheit.

## NFON CTI API Referenz

Die vollständige API-Dokumentation (Endpoints, Schemas, Beispiele) liegt in:
[CTI-API.md](CTI-API.md) — Quelle: https://github.com/NFON-AG/CTI-API

Kurzübersicht der Endpoints:
- `POST /v1/login` — Access Token erstellen
- `PUT /v1/login` — Access Token refreshen
- `GET /v1/extensions/phone/data` — Extension-Konfiguration
- `GET /v1/extensions/phone/states` — Leitungsstatus (SSE oder JSON-Snapshot)
- `GET /v1/extensions/phone/calls` — Call-Events streamen (SSE)
- `POST /v1/extensions/phone/calls` — Anruf starten (Click-to-Dial)
- `DELETE /v1/extensions/phone/calls/{uuid}` — Anruf beenden

## Wichtige Einschränkungen

- NFON hat **keinen Call-History-Endpoint** — Historie wird nur aus dem Live-Stream aufgebaut
- Ein Anruf kann auf **mehreren Extensions** erscheinen (Composite PK: `id + extension`)
- Gruppenanrufe werden noch nicht unterstützt
- Token-Refresh läuft alle 4 Minuten automatisch (`auth.ts`)
- SSE-Reconnect bei Verbindungsabbruch nach 5 Sekunden
- Extension-Presence wird adaptiv gepollt (3s/15s/30s/60s je nach Aktivität)
