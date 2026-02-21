# Planned Features

Ideen und geplante Erweiterungen fuer den NFON Call Monitor.

---

## Anruf-Statistiken & Reporting

- **Dashboard-Statistiken**: Widgets mit Tages-/Wochen-/Monatsstatistiken (Anzahl Anrufe, durchschnittliche Gespraechsdauer, Erreichbarkeitsquote pro Nebenstelle)
- **Verpasste-Anrufe-Report**: Taeglicher/woechentlicher Report ueber verpasste Anrufe, optional per E-Mail
- **Peak-Hours-Analyse**: Heatmap der Anruflast nach Wochentag und Uhrzeit
- **CSV/Excel-Export**: Anrufhistorie als CSV oder XLSX exportieren (gefiltert oder komplett)

## Benachrichtigungen

- **Browser-Push-Notifications**: Desktop-Benachrichtigung bei eingehenden Anrufen oder verpassten Anrufen
- **Webhook-Integration**: Konfigurierbare Webhooks bei bestimmten Events (verpasster Anruf, langer Anruf, etc.)
- **E-Mail-Alerts**: Benachrichtigung bei X verpassten Anrufen innerhalb von Y Minuten

## Erweitertes Call-Management

- **Anruf-Notizen**: Notizfeld pro Anruf direkt im Dashboard (in SQLite gespeichert)
- **Anruf-Tags/Labels**: Anrufe kategorisieren (z.B. "Rueckruf noetig", "Support", "Vertrieb")
- **Rueckruf-Liste**: Verpasste Anrufe als Rueckruf markieren, mit Erledigt-Status
- **Sammelanschluss-Ansicht**: Gruppierte Darstellung von Anrufen an Sammelanschluesse/Queues

## UI & UX

- **Responsive Mobile-Ansicht**: Optimiertes Layout fuer Smartphones/Tablets
- **Favoriten-Nebenstellen**: Bestimmte Nebenstellen als Favoriten pinnen
- **Benutzerdefinierte Filter-Presets**: Haeufig genutzte Filtereinstellungen speichern und schnell abrufen
- **Keyboard-Shortcuts**: Schnellnavigation per Tastatur (z.B. `/` fuer Suche, `n` fuer naechste Seite)
- **Klingelton/Sound bei Anruf**: Optionaler akustischer Hinweis bei eingehendem Anruf

## Kontakt-Management

- **Lokales Telefonbuch**: Eigenes Adressbuch im Call Monitor, unabhaengig von ProjectFacts
- **Kontakt-Merge**: Mehrere Nummern einem Kontakt zuordnen
- **Anrufhistorie pro Kontakt**: Alle Anrufe eines Kontakts auf einen Blick
- **Weitere CRM-Integrationen**: z.B. HubSpot, Salesforce, Pipedrive Anbindung

## Administration & Multi-User

- **Login pro Agent/Nebenstelle**: Jeder Agent meldet sich mit eigenem Account an und bekommt nur seine zugewiesenen Nebenstellen angezeigt. Click-to-Dial/Drag-Drop nur fuer die eigenen Nebenstellen moeglich.
- **Nebenstellen-Gruppen mit Sichtbarkeitsrechten**: Gruppen definieren, wer welche Nebenstellen (ein- und ausgehende Anrufe) vollstaendig sehen darf. Nicht-berechtigte Benutzer sehen nur anonymisierte Rufnummern.
- **Privacy fuer ausgehende Anrufe**: Ausgehende Anrufe sind nur fuer die eigenen (und per Gruppe berechtigten) Nebenstellen sichtbar. Andere Benutzer sehen diese Anrufe nicht.
- **Benutzer-Status (Praesenz)**: Jeder Extension/User kann seinen Status setzen (Online, Offline, Mittagspause, Homeoffice, Office) - sichtbar fuer alle Benutzer im Dashboard.
- **Benutzerverwaltung**: Mehrere Dashboard-Benutzer mit Rollen (Admin, Viewer)
- **Audit-Log**: Protokoll von Dashboard-Aktionen (Login, Click-to-Dial, etc.)
- **Multi-Standort-Support**: Mehrere NFON-Accounts/Standorte in einem Dashboard

## Technisch / Infrastruktur

- **API-Rate-Limiting**: Schutz gegen Missbrauch der REST-Endpunkte
- **Health-Check-Endpoint**: `/api/health` fuer Monitoring-Tools (Uptime Kuma, etc.)
- **Backup/Restore**: SQLite-Datenbank-Backup per API-Aufruf oder Zeitplan
- **Prometheus-Metriken**: Metriken-Endpoint fuer Grafana-Integration
- **Konfigurierbare Aufbewahrungsdauer**: Anrufe aelter als X Tage automatisch loeschen
