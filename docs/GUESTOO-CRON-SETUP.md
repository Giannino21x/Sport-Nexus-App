# Guestoo-Anmeldungs-Sync aktivieren (GitHub Actions)

Der automatische Sync (`.github/workflows/guestoo-sync.yml`) läuft alle 6 Stunden
und hält die App-Anmeldungen mit Guestoo synchron. Er braucht **einmalig** ein
paar Secrets. Danach läuft alles hands-off.

## Schritt 1 — Secrets in GitHub hinterlegen
GitHub → Repo **Sport-Nexus-App** → **Settings** → **Secrets and variables** →
**Actions** → **New repository secret**. Diese 5 anlegen:

| Name | Wert |
|---|---|
| `GUESTOO_LOGIN_EMAIL` | Guestoo-Login-E-Mail (am besten ein dedizierter Service-Account) |
| `GUESTOO_LOGIN_PASSWORD` | Guestoo-Passwort |
| `GUESTOO_AGENCY_ID` | `66e439d1-dd45-4b2b-a514-cef5e97e4708` |
| `NEXT_PUBLIC_SUPABASE_URL` | aus `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | aus `.env.local` (geheim halten!) |

## Schritt 2 — Einmal testen
GitHub → **Actions** → **Guestoo Anmeldungs-Sync** → **Run workflow**.
Der Lauf sollte grün sein und am Ende „Fertig: +X Anmeldungen …" zeigen.

## Schritt 3 — fertig
Ab jetzt läuft der Sync automatisch alle 6 h. Die App liest den Anmeldestatus
aus `event_registrations` (geräteübergreifend, für alle Members).

---

## Manuell (ohne GitHub Actions)
Solange die Cookies in `.env.local` gültig sind (~7 Tage nach Login):
```
npm run guestoo:sync-regs            # live
npm run guestoo:sync-regs -- --dry-run
```
Cookies abgelaufen? → `npm run guestoo:refresh` (braucht GUESTOO_LOGIN_EMAIL/
PASSWORD in `.env.local`) oder einmal manuell im Browser bei app.guestoo.de
einloggen und Cookies neu setzen.

## Gut zu wissen
- **Self-Marks bleiben:** Der „Ich bin bereits angemeldet"-Button schreibt
  `source='self'` — der Sync (`source='guestoo'`) fasst diese nie an.
- **Status-Mapping:** Welche Guestoo-Status als „angemeldet" zählen, steuert
  `REGISTERED_STATUSES` (Default `CONFIRMED,APPEARED,ADDED`).
- **Trade-off:** Läuft über die Guestoo-Login-Session (kein bezahltes API).
  Robust, aber falls Guestoo 2FA/CAPTCHA einführt oder die interne API ändert,
  muss der Login-Refresh angepasst werden.
