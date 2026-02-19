# NFON Call Monitor

Echtzeit-Anrufüberwachung für NFON-Telefonanlagen. Zeigt eingehende/ausgehende Anrufe als Live-Dashboard mit persistenter Historie.

## Architektur

```
NFON CTI API (SSE Stream)
        │
        ▼
┌─────────────────────────┐
│  Backend (Express)      │
│  - NFON SSE → Events   │
│  - CallAggregator       │
│  - SQLite Persistenz    │
│  - REST API + Socket.IO │
└────────┬────────────────┘
         │ WebSocket + REST
         ▼
┌─────────────────────────┐
│  Frontend (React+Vite)  │
│  - Extension-Status     │
│  - Call-Historie Tabelle│
│  - Echtzeit-Updates     │
└─────────────────────────┘
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
4. **server.ts** — Express-Server leitet Events per Socket.IO an alle Browser-Clients weiter
5. **Frontend** — React-App holt Historie per REST, empfängt Live-Updates per Socket.IO

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

```
CTI_API_USERNAME=...
CTI_API_PASSWORD=...
CTI_API_BASE_URL=https://providersupportdata.cloud-cfg.com
```

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

## Tech-Stack

| Komponente | Technologie |
|---|---|
| Backend | Express, Socket.IO, Node.js built-in SQLite |
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Echtzeit | Socket.IO (WebSocket) |
| Datenbank | SQLite (WAL-Modus, Datei `calls.db`) |
| NFON-Anbindung | SSE (Server-Sent Events) |

## Dateistruktur

```
├── shared/types.ts           # Gemeinsame TypeScript-Interfaces
├── src/
│   ├── auth.ts               # NFON Login + Token-Refresh
│   ├── api.ts                # NFON API-Aufrufe
│   ├── server.ts             # Express + Socket.IO
│   ├── db.ts                 # SQLite Schema + CRUD
│   ├── call-aggregator.ts    # SSE-Events → CallRecords
│   ├── nfon-connector.ts     # SSE-Verbindung + Reconnect
│   ├── monitor.ts            # Standalone CLI-Monitor
│   └── routes/
│       ├── calls.ts          # GET /api/calls
│       └── extensions.ts     # GET /api/extensions
└── frontend/
    └── src/
        ├── App.tsx
        ├── hooks/             # useSocket, useCalls, useExtensions
        ├── components/        # Layout, CallHistoryTable, ExtensionCards, ...
        └── lib/               # API-Client, Formatter
```

## API

### REST

- `GET /api/calls?page=1&pageSize=50&extension=20&status=missed&direction=inbound&dateFrom=...&dateTo=...`
- `GET /api/extensions`

### Socket.IO Events

| Event | Richtung | Beschreibung |
|---|---|---|
| `active-calls` | Server → Client | Aktive Calls bei Verbindung |
| `extensions` | Server → Client | Extension-Liste + Presence |
| `call:new` | Server → Client | Neuer Anruf erkannt |
| `call:updated` | Server → Client | Anruf-Status geändert |
| `nfon:connected` | Server → Client | SSE-Verbindung steht |
| `nfon:disconnected` | Server → Client | SSE-Verbindung unterbrochen |

## NFON API Docs

- CTI API: https://github.com/NFON-AG/CTI-API
- API Explorer: https://nfon-ag.github.io/Service-Portal-API-Specification/net/nfon/portal/api/Api.html
- Service Portal API: https://github.com/NFON-AG/Service-Portal-API


## NFON Einschränkungen

  Weder die CTI API noch die Service Portal API bieten Endpunkte für historische Anrufdaten (CDR/Call Logs).

  CTI API - Einschränkungen

  - GET /extensions/phone/calls ist ein reiner Echtzeit-SSE-Stream — keine vergangenen Events
  - Gruppenanrufe sind explizit nicht unterstützt:
  "Functions such as group calls, skill-based calls or queues are currently not supported."
  - Es gibt kein Gruppen-Feld im Event-Schema — nur eine einzelne Extension-Nummer

  Service Portal API - Nur Konfiguration

  - Hat volle CRUD-Endpoints für group-services, queue-services, skill-services und frontdesk-services
  - Man kann Gruppen, ihre Mitglieder und ihre Inbound-Rufnummern auslesen
  - Aber: Null Call-History/CDR-Endpoints (in allen 380 Postman-Requests nichts gefunden)

  Zur Zentrale (Extension 0)

  Die "Zentrale" ist vermutlich als frontdesk-service konfiguriert (eigener Endpoint in der Service Portal API). Wenn sie kein reguläres Phone-Extension mit einem einzelnen Gerät ist, tauchen ihre Anrufe wahrscheinlich nicht im CTI
  SSE-Stream auf.
