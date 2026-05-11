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
SMTP_USER=no-reply@sport-nexus.ch
SMTP_PASS=<Mailbox-Passwort von no-reply@sport-nexus.ch>
SMTP_FROM=SportNexus <no-reply@sport-nexus.ch>
APP_URL=https://sport-nexus-app.vercel.app   # für Reply-/Profil-Links in der Mail
```

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
