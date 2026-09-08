# Eigene Domain: app.sportnexus.ch

Stand 2026-09-08. Ziel: keine `vercel.app`-Adresse mehr in Mails, Folien und im Browser.

## Was schon gemacht ist

- `app.sportnexus.ch` ist dem Vercel-Projekt `sport-nexus-app` (Team space-media) zugewiesen.
- Supabase Auth `uri_allow_list` enthält `https://app.sportnexus.ch/**` (zusätzlich zur alten Adresse).
- Code-Fallbacks und Doku zeigen auf die neue Domain; die Env-Variable `APP_URL` bleibt bis zur DNS-Umstellung auf der alten.

## Was noch fehlt: ein DNS-Eintrag bei Hostpoint

Die Nameserver von `sportnexus.ch` liegen bei Hostpoint (ns.hostpoint.ch). Wer das Hostpoint-Kontrollpanel von SportNexus hat, legt unter DNS für `sportnexus.ch` an:

| Typ | Name | Wert | TTL |
|---|---|---|---|
| A | `app` | `76.76.21.21` | Standard |

Alternativ ein CNAME `app` → `cname.vercel-dns.com`. Vercel prüft automatisch und stellt das Zertifikat aus (wenige Minuten bis eine Stunde).

Prüfen: `npx vercel domains inspect app.sportnexus.ch` muss «Valid Configuration» zeigen, dann `https://app.sportnexus.ch/login` im Browser.

## Umstellung, sobald die Domain erreichbar ist

```
node scripts/switch-domain.mjs          # prüft
node scripts/switch-domain.mjs --apply  # Supabase site_url, Vercel APP_URL + Redeploy, GitHub-Secret, .env.local
```

Danach: Test-Mail schicken (`node scripts/hubspot-onboard.mjs --test-mail=info@space-media.ch`) und prüfen, dass der Login-Button auf `app.sportnexus.ch` zeigt.

## Bewusst NICHT umgeleitet

`sport-nexus-app.vercel.app` bleibt parallel aktiv. Die Store-Apps (iOS/Android, Repo `sport-nexus-desktop`) laden diese URL fest. Eine Umleitung würde in der nativen Hülle als externer Link in Safari/Chrome aufgehen. Reihenfolge für später: 1. neue URL in der Capacitor-Konfiguration, 2. Store-Update, 3. erst dann die alte Domain in Vercel auf die neue umleiten.
