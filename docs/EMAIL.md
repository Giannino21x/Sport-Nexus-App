# Email-Notifications

Send-Path: bei jeder neuen Nachricht im Memberbereich erhält der Empfänger eine E-Mail mit Sender-Profil, Kontaktdaten (sofern freigegeben) und einem Link zurück in die App.

## Architektur
- `lib/email.ts` — Nodemailer/SMTP-Client + HTML-Template `newMessageEmail`
- `app/actions/messages.ts` — `notifyRecipient` ist fire-and-forget (`void`), blockiert den Send-Action-Flow nicht
- Empfänger-Adresse: aus `members.email`
- Sender-Profil: Vor-/Nachname, Rolle, Firma, Branche, Arbeitsort + (falls freigegeben) E-Mail/Mobile/LinkedIn

## Setup

Wir nutzen Hostpoint-SMTP — dieselben Credentials wie Supabase Auth für Passwort-Reset-Mails. In `.env.local` (lokal) bzw. Vercel-Environment (Production) setzen:

```
SMTP_HOST=asmtp.mail.hostpoint.ch
SMTP_PORT=587
SMTP_USER=no-reply@sport-nexus.ch            # Hostpoint-Mailbox (nur Auth!)
SMTP_PASS=<Mailbox-Passwort von no-reply@sport-nexus.ch>
SMTP_FROM=SportNexus <no-reply@sportnexus.ch>
APP_URL=https://sport-nexus-app.vercel.app   # für Reply-/Profil-Links in der Mail
```

**WICHTIG — zwei verschiedene Domains:** Die Hostpoint-Mailbox heisst
`no-reply@sport-nexus.ch` (mit Bindestrich), aber als **Absender (From) muss
`no-reply@sportnexus.ch`** (ohne Bindestrich) verwendet werden. `sport-nexus.ch`
ist **nicht registriert** (NXDOMAIN) — Gmail & Co. verwerfen Mails von nicht
existierenden Absenderdomains komplett (kein Bounce, kein Spam-Ordner).
Verifiziert 2026-06-12 per A/B-Test an ein Google-Workspace-Postfach: alter
Absender verworfen, neuer Absender landet im Posteingang. `sportnexus.ch` hat
gültige SPF- (`redirect=spf.mail.hostpoint.ch`) und DMARC-Records, beides passt
zum Versand über Hostpoint. Gleiches gilt für die Supabase-Auth-Mails
(`smtp_admin_email` in der Auth-Config = `no-reply@sportnexus.ch`).

**Supabase-Auth-Config-Falle:** Ein `PATCH /v1/projects/<ref>/config/auth` mit
nur *einem* `smtp_*`-Feld nullt die übrigen SMTP-Felder — immer den kompletten
SMTP-Block mitschicken (host, port, user, pass, admin_email, sender_name,
max_frequency, external_email_enabled).

Port 587 nutzt STARTTLS (`requireTLS: true`), Port 465 implicit TLS (`secure: true`). Beides funktioniert mit Hostpoint.

## Test

```
node scripts/test-smtp.mjs
```

Verbindet, verifiziert Auth + TLS und schickt eine Test-Mail an `info@space-media.ch`. Exit-Code 0 = ok.

## Verhalten ohne Passwort

Wenn `SMTP_PASS` fehlt, läuft `sendEmail` als no-op und loggt im Dev-Mode den Versandversuch in der Konsole. Das `sendMessageAction` funktioniert weiterhin — die Nachricht wird in der DB gespeichert, nur die E-Mail bleibt aus.

## Template
- Betreff: `Neue Nachricht von <Vorname Nachname>`
- Body: Begrüssung, Sender-Name + Rolle/Firma, Nachricht-Preview (max. 400 Zeichen, HTML-escaped), CTA-Button „Antworten in der App", zweiter Button „Profil ansehen"
- Plain-Text-Fallback für Clients ohne HTML

## Features fehlen / Später
- User-Präferenz „E-Mail-Notifications aus" (`members.email_notifications`)
- Rate-Limit (z. B. nicht mehr als 1 E-Mail pro Stunde pro Konversation)
- Daily-Digest statt Pro-Nachricht
