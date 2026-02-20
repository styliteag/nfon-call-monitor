# NFON Call Monitor

> Real-time call monitoring dashboard for NFON phone systems — live calls, extension status & call history with optional CRM contact lookup.

Echtzeit-Anrufüberwachung für NFON-Telefonanlagen. Zeigt eingehende/ausgehende Anrufe als Live-Dashboard mit persistenter Historie und optionaler ProjectFacts-CRM-Integration.

---

## Features

- **Live Call Dashboard** — Eingehende & ausgehende Anrufe in Echtzeit via WebSocket
- **Click-to-Dial** — Anrufe direkt aus dem Dashboard starten: Rufnummer per Drag & Drop auf Extension-Card ziehen oder Zwischenablage-Button nutzen
- **Extension-Status** — Presence-Anzeige aller Nebenstellen
- **Call-Historie** — Persistente Anrufhistorie mit Filter, Suche & Pagination
- **ProjectFacts CRM** — Automatische Kontaktzuordnung per Rufnummer (optional)
- **Phone Number Formatting** — Intelligente Formatierung & Ortsnetzerkennung (5.200+ deutsche Vorwahlen)
- **Dark Mode** — Automatisch oder manuell umschaltbar
- **Docker-ready** — Multi-Stage Build, Production-ready
- **Dashboard Auth** — JWT-basierte Authentifizierung

---

## Architektur

```
NFON CTI API (SSE Stream)         ProjectFacts API
        │                                │
        ▼                                ▼
┌──────────────────────────────────────────────┐
│  Backend (Express)                           │
│  ├─ NFON SSE → CallAggregator → SQLite       │
│  ├─ PF-Cache (15 Min. Refresh)               │
│  ├─ Phone-Utils (Normalisierung, Vorwahlen)  │
│  └─ REST API + Socket.IO                     │
└──────────────────┬───────────────────────────┘
                   │ WebSocket + REST
                   ▼
┌──────────────────────────────────────────────┐
│  Frontend (React 19 + Vite + Tailwind v4)    │
│  ├─ Extension-Cards mit Presence             │
│  ├─ Call-Historie mit Filtern                │
│  ├─ Active-Call-Banner                       │
│  └─ CRM-Kontaktanzeige (Name, Ort, Fuzzy)    │
└──────────────────────────────────────────────┘
```

### Warum ein Backend?

Das Frontend kann **nicht** direkt mit der NFON API kommunizieren:

1. **Credentials** — Login + Token-Refresh brauchen Username/Password. Die dürfen nicht im Browser liegen.
2. **CORS** — Die NFON API erlaubt keine Browser-Requests (keine CORS-Header).
3. **Persistenz** — NFON hat keinen Call-History-Endpoint. Die einzige Datenquelle ist der Live-SSE-Stream. Das Backend bleibt 24/7 verbunden, aggregiert Events zu Call-Records und speichert sie in SQLite. Beim Öffnen des Frontends ist die Historie sofort da.

### Datenfluss

1. **nfon-connector.ts** — Hält die SSE-Verbindung zu NFON offen, reconnected automatisch bei Abbruch
2. **call-aggregator.ts** — Korreliert rohe SSE-Events (start/ring/answer/hangup/end) per UUID zu CallRecords
3. **db.ts** — Persistiert CallRecords in SQLite (Node.js built-in `node:sqlite`)
4. **projectfacts.ts** — Lädt Kontakte aus ProjectFacts, cached im Speicher, Refresh alle 15 Min.
5. **phone-utils.ts** — Normalisiert Rufnummern, erkennt Vorwahlen, formatiert Anzeige
6. **server.ts** — Express-Server leitet Events per Socket.IO an alle Browser-Clients weiter
7. **Frontend** — React-App holt Historie per REST, empfängt Live-Updates per Socket.IO

---

## Setup

```bash
# .env anlegen (Zugangsdaten von NFON)
cp .env.example .env

# Backend-Dependencies
npm install

# Frontend-Dependencies
cd frontend && npm install && cd ..
```

### .env

```bash
# === NFON CTI API (erforderlich) ===
CTI_API_USERNAME=...
CTI_API_PASSWORD=...
# CTI_API_BASE_URL=https://providersupportdata.cloud-cfg.com

# === Kopfnummern / Trunk-Prefixes (optional) ===
# KOPFNUMMERN=4930555789,49030555123
# KOPFNUMMERN_NAME=Berlin,Berlin2

# === Dashboard Auth ===
DASHBOARD_USER=admin
DASHBOARD_PASSWORD_HASH=   # sha256: echo -n 'password' | shasum -a 256
# DASHBOARD_JWT_SECRET=    # stabil über Restarts

# === App ===
# APP_TITLE=NFON Call Monitor
# LOG=debug                   # Verbose logging (Click-to-Dial, SSE, Presence)
# PRESENCE_POLL_INTERVAL=15000  # Presence-Polling in ms (Default: 15000)

# === ProjectFacts CRM (optional) ===
# PF_API_BASE_URL=https://team.stylite.de
# PF_API_DEVICE_ID=
# PF_API_TOKEN=

# === Phone-Klassifizierung (optional, sensible Defaults) ===
# MOBILE_PREFIXES=150,151,152,...
# SPECIAL_PREFIXES=800,1801,1802,...
```

---

## Starten

```bash
# Beide zusammen (Backend + Frontend)
npm run dev

# Oder einzeln:
npm run dev:backend    # Express auf :3001
npm run dev:frontend   # Vite auf :5173

# CLI Monitor (ohne Frontend, nur Terminal-Output)
npm run monitor
```

### Docker

```bash
docker build -f docker/Dockerfile -t nfon-monitor --build-arg VERSION=1.0.0 .
docker run -p 3001:3001 --env-file .env nfon-monitor
```

---

## ProjectFacts CRM-Integration

Die ProjectFacts-Integration ist **optional** — ohne Konfiguration funktioniert alles, nur ohne Kontaktnamen.

### Funktionsweise

1. **Cache-Aufbau** — Beim Start lädt das Backend alle Kontakte mit Telefonnummern aus ProjectFacts (paginiert, max. 10 parallele Requests)
2. **Auto-Refresh** — Der Cache wird alle 15 Minuten automatisch aktualisiert
3. **Dreistufige Zuordnung** bei eingehenden/ausgehenden Anrufen:

| Stufe | Methode | Beispiel |
|-------|---------|---------|
| 1 | **Exakte Suche** — Nummer exakt im Cache | `+49 6251 82755` → "Mustermann GmbH" |
| 2 | **Fuzzy Match** — Endziffern entfernen (nur Festnetz, max. 3 Stellen) | `+49 6251 82755-23` → "Mustermann GmbH?" |
| 3 | **Fallback** — Ortsnetz/Typ-Label aus Vorwahl-DB | `+49 6251 ...` → *Heppenheim* |

### Anzeige im Frontend

- **Exakter Match** — Kontaktname in Blau
- **Fuzzy Match** — Kontaktname + `?` bis `???` (je nach entfernten Ziffern)
- **Nur Ort** — Stadtname in Amber/Kursiv
- **Unbekannt** — Formatierte Rufnummer

---

## Tech-Stack

| Komponente | Technologie |
|---|---|
| Backend | Express, Socket.IO, Node.js built-in SQLite |
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Echtzeit | Socket.IO (WebSocket) |
| Datenbank | SQLite (WAL-Modus, Datei `calls.db`) |
| NFON-Anbindung | SSE (Server-Sent Events) |
| CRM | ProjectFacts REST API (optional) |
| Auth | JWT (Dashboard-Login) |
| Deployment | Docker (Multi-Stage Build, Node 22 Alpine) |

---

## Dateistruktur

```
├── docker/Dockerfile             # Multi-Stage Production Build
├── shared/types.ts               # Gemeinsame TypeScript-Interfaces
├── src/
│   ├── auth.ts                   # NFON Login + Token-Refresh
│   ├── api.ts                    # NFON API-Aufrufe
│   ├── server.ts                 # Express + Socket.IO
│   ├── db.ts                     # SQLite Schema + CRUD
│   ├── call-aggregator.ts        # SSE-Events → CallRecords
│   ├── nfon-connector.ts         # SSE-Verbindung + Reconnect
│   ├── projectfacts.ts           # PF-Cache, Kontakt-Lookup
│   ├── phone-utils.ts            # Normalisierung, Vorwahlen, Formatierung
│   ├── dashboard-auth.ts         # JWT Auth Middleware
│   ├── monitor.ts                # Standalone CLI-Monitor
│   └── routes/
│       ├── calls.ts              # GET /api/calls
│       ├── extensions.ts         # GET /api/extensions
│       ├── auth.ts               # POST /api/auth/login
│       ├── pf.ts                 # GET/POST /api/pf/lookup
│       └── click-to-dial.ts     # POST/DELETE /api/click-to-dial
└── frontend/
    └── src/
        ├── App.tsx
        ├── hooks/                # useSocket, useCalls, useExtensions, usePfContacts
        ├── components/           # Dashboard, CallHistoryTable, ExtensionCards, ...
        └── lib/                  # API-Client, Formatter
```

---

## API

### REST

| Endpoint | Beschreibung |
|---|---|
| `POST /api/auth/login` | Dashboard-Login (JWT) |
| `GET /api/version` | App-Version & Titel |
| `GET /api/calls?page=1&pageSize=50&extension=20&status=missed&direction=inbound&dateFrom=...&dateTo=...` | Anrufhistorie (paginiert, gefiltert) |
| `GET /api/extensions` | Extension-Liste mit Presence |
| `GET /api/pf/lookup?number=...` | Einzelner Kontakt-Lookup |
| `POST /api/pf/lookup-batch` | Batch-Lookup (`{ numbers: [...] }`) |
| `POST /api/click-to-dial` | Click-to-Dial (`{ extension, target }`) → 202 |
| `DELETE /api/click-to-dial/:uuid` | Laufenden Anruf abbrechen → 204 |

### Socket.IO Events

| Event | Richtung | Beschreibung |
|---|---|---|
| `active-calls` | Server → Client | Aktive Calls bei Verbindung |
| `extensions` | Server → Client | Extension-Liste + Presence |
| `call:new` | Server → Client | Neuer Anruf erkannt |
| `call:updated` | Server → Client | Anruf-Status geändert |
| `nfon:connected` | Server → Client | SSE-Verbindung steht |
| `nfon:disconnected` | Server → Client | SSE-Verbindung unterbrochen |

---

## NFON API Docs

- [CTI API](https://github.com/NFON-AG/CTI-API)
- [API Explorer](https://nfon-ag.github.io/Service-Portal-API-Specification/net/nfon/portal/api/Api.html)
- [Service Portal API](https://github.com/NFON-AG/Service-Portal-API)

### Bekannte Einschränkungen

- **Keine Call-History API** — Weder CTI noch Service Portal API bieten historische Anrufdaten. Der Live-SSE-Stream ist die einzige Quelle.
- **Keine Gruppenanrufe** — *"Functions such as group calls, skill-based calls or queues are currently not supported."*
- **Kein Gruppen-Feld** — Events enthalten nur eine einzelne Extension-Nummer.
- **Zentrale (Ext. 0)** — Vermutlich als Frontdesk-Service konfiguriert; deren Anrufe tauchen ggf. nicht im SSE-Stream auf.
