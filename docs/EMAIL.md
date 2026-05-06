# Email-Notifications

Send-Path: bei jeder neuen Nachricht im Memberbereich erhält der Empfänger eine E-Mail mit Sender-Profil und einem Link zurück in die App.

## Architektur
- `lib/email.ts` — Resend-Client + HTML-Template `newMessageEmail`
- `app/actions/messages.ts` — `notifyRecipient` ist fire-and-forget (`void`), blockiert den Send-Action-Flow nicht
- Empfänger-Adresse: aus `members.email`
- Sender-Profil: Vor-/Nachname, Rolle, Firma, Slug für Profil-Link

## Setup

In `.env.local` ergänzen:
```
RESEND_API_KEY=re_…           # https://resend.com/api-keys
RESEND_FROM=SportNexus <no-reply@sport-nexus.ch>
APP_URL=https://sport-nexus.ch
```

Domain bei Resend verifizieren (DNS-Records hinterlegen), sonst landen Mails im Spam. Free-Tier reicht: 100 Mails/Tag, 3000/Monat.

## Verhalten ohne Key

Wenn `RESEND_API_KEY` fehlt (z. B. lokal), läuft `sendEmail` als no-op und loggt im Dev-Mode den Versandversuch in der Konsole. Das `sendMessageAction` selbst funktioniert weiterhin — die Nachricht wird gespeichert, nur die E-Mail bleibt aus.

## Template
- Betreff: `Neue Nachricht von <Vorname Nachname>`
- Body: Begrüssung, Sender-Name + Rolle/Firma, Nachricht-Preview (max. 400 Zeichen, HTML-escaped), CTA-Button „Antworten in der App", zweiter Button „Profil ansehen"
- Plain-Text-Fallback für Clients ohne HTML

## Features fehlen / Später
- User-Präferenz „E-Mail-Notifications aus" (`members.email_notifications`)
- Rate-Limit (z. B. nicht mehr als 1 E-Mail pro Stunde pro Konversation)
- Daily-Digest statt Pro-Nachricht
