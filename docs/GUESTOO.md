# Guestoo-Integration

Live-Anbindung an die Guestoo-API für Events und Anmeldungen.

## Architektur
- `lib/guestoo.ts` — Server-only Fetch-Client mit Cookie-Auth
- `app/actions/guestoo.ts` — Server Actions (`getEventAttendeesAction`, `syncGuestooIdsAction`)
- `events.guestoo_id` — Verknüpfung unserer Events mit den Guestoo-UUIDs
- Cookies in `.env.local` (`GUESTOO_COOKIE_HEADER`, `GUESTOO_XSRF_TOKEN`)

## API-Endpoints (an `https://app.guestoo.de/proxy/api/`)
- `POST /events/search` — Event-Liste mit Statistiken
- `GET /events/{id}` — Event-Detail
- `POST /events/{id}/visitors/search` — Anmeldungen pro Event
- `GET /agency/current` — Health-Check

## Auth
Bis Guestoo den offiziellen API-Token-Auth (für höhere Tarife) freischaltet, nutzen wir Session-Cookies einer eingeloggten Browser-Session. JSESSIONID läuft typisch ~7 Tage.

### Setup
1. In `.env.local` ergänzen:
   ```
   GUESTOO_LOGIN_EMAIL=<dein Guestoo-Email>
   GUESTOO_LOGIN_PASSWORD=<dein Guestoo-Passwort>
   GUESTOO_AGENCY_ID=66e439d1-dd45-4b2b-a514-cef5e97e4708
   ```
2. Initiale Cookies holen:
   ```
   npm run guestoo:refresh
   ```

### Wartung
| Befehl | Was |
|---|---|
| `npm run guestoo:check` | Prüft, ob Session gültig ist (Exit 0 = ok, 1 = abgelaufen) |
| `npm run guestoo:refresh` | Loggt sich neu ein, schreibt Cookies in `.env.local` |
| `npm run guestoo:sync` | Synchronisiert Events (Mappings, max. Plätze, Adresse, Venue) |

### Cron-Empfehlung
Auf der Dev-Maschine wöchentlich:
```
0 6 * * 1 cd /pfad/zur/app && npm run guestoo:refresh
```
Vercel-Production: nach Refresh die env-Variablen via `vercel env add` aktualisieren oder Vercel API-Token für automatischen Sync hinterlegen.

## Bekannte Felder pro Event in der DB
| Spalte | Quelle |
|---|---|
| `id` | unsere UUID/Slug |
| `guestoo_id` | Guestoo-UUID (von `syncGuestooIdsAction`) |
| `title`, `subtitle`, `date`, `time`, `city` | manuell gepflegt |
| `venue`, `address`, `guests` (max. Plätze) | aus Guestoo synchronisiert |
| `status` | `upcoming` / `past` (lokal) |

Die **aktuelle Anmeldezahl** wird live via `/events/{id}/visitors/search` geholt (kein Persistieren) — siehe `getEventAttendeesAction`.
