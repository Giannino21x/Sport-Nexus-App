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
| `npm run guestoo:sync-regs` | Synchronisiert **Anmeldungen** → `event_registrations` (E-Mail-Match, `--dry-run` möglich) |

## Anmeldungs-Sync (Member ↔ Guestoo-Verbindung)
`scripts/guestoo-sync-registrations.mjs` zieht pro Event die Teilnehmer aus
Guestoo und ordnet sie über die **E-Mail** unseren Members zu → schreibt
`public.event_registrations` mit `source = 'guestoo'`. Manuelle Self-Marks
(`source = 'self'`, „Ich bin bereits angemeldet"-Button) bleiben unangetastet;
der Sync gleicht nur seine eigenen Einträge ab (inkl. Abmeldungen entfernen).
Die App liest den Anmeldestatus ausschliesslich aus `event_registrations`
(geräteübergreifend) — sie ruft dafür Guestoo nicht live auf.

**Automatik:** `.github/workflows/guestoo-sync.yml` läuft alle 6 h auf GitHub
Actions: Headless-Login (frische Cookies, ~7 Tage gültig) → Event-Stammdaten-Sync
(`guestoo:sync`, aktualisiert Venue/Adresse/Plätze) → Anmeldungs-Sync.
Benötigte Repo-Secrets: `GUESTOO_LOGIN_EMAIL`, `GUESTOO_LOGIN_PASSWORD`,
`GUESTOO_AGENCY_ID`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
Welche Guestoo-Status als „angemeldet" zählen, steuert `REGISTERED_STATUSES`
(Default `CONFIRMED,APPEARED,ADDED`).

### Cron-Empfehlung
Auf der Dev-Maschine wöchentlich:
```
0 6 * * 1 cd /pfad/zur/app && npm run guestoo:refresh
```
Vercel-Production: nach Refresh die env-Variablen via `vercel env add` aktualisieren oder Vercel API-Token für automatischen Sync hinterlegen.

### Fehler "Guestoo-Credentials fehlen" auf der Live-App
Tritt auf, wenn `GUESTOO_COOKIE_HEADER` und/oder `GUESTOO_XSRF_TOKEN` auf der Zielumgebung nicht gesetzt sind. Vorgehen:

1. Lokal `npm run guestoo:refresh` ausführen → schreibt frische Werte in `.env.local`.
2. Die beiden Variablen kopieren und in Vercel hinterlegen:
   - **Vercel → Project sport-nexus-app → Settings → Environment Variables**
   - Beide Variablen für **Production** (und optional Preview) hinzufügen.
3. **Redeploy auslösen** (Trigger Deploy oder neuen Push) — Env-Updates greifen nicht bei laufenden Functions.
4. Auf `/events/{id}` die "Wer kommt"-Liste prüfen — sollte jetzt Anmeldungen anzeigen.

Die Cookie-Session läuft alle ~7 Tage ab — danach Schritt 1–3 wiederholen oder den Cron auf einer Dev-Maschine laufen lassen, die per Vercel-API-Token die Env-Variablen automatisch nachzieht.

## Bekannte Felder pro Event in der DB
| Spalte | Quelle |
|---|---|
| `id` | unsere UUID/Slug |
| `guestoo_id` | Guestoo-UUID (von `syncGuestooIdsAction`) |
| `title`, `subtitle`, `date`, `time`, `city` | manuell gepflegt |
| `venue`, `address`, `guests` (max. Plätze) | aus Guestoo synchronisiert (Cron, alle 6 h) |
| `status` | `upcoming` / `past` (lokal) |

Die **aktuelle Anmeldezahl** wird live via `/events/{id}/visitors/search` geholt (kein Persistieren) — siehe `getEventAttendeesAction`.
