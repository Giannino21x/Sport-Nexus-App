## HubSpot → SportNexus Member-Sync (Konzept)

> Antwort auf Pascals Frage aus Feedback 1: „Berücksichtige Kapitel Automatisierung Memberdaten. Bitte verifizieren, wie dies umgesetzt werden kann."

### Ausgangslage
Pascals Konzept-Dokument beschreibt einen Webflow-Stack mit **Memberstack** für Login + **Make/Zapier** als Automation-Layer. Unsere native App (Next.js + Supabase) macht **Memberstack und Jetboost überflüssig**, weil Auth + CMS + Filter bereits eingebaut sind. Was bleibt, ist der Sync zwischen **HubSpot (Master Data)** und unserer Supabase-DB.

### Architektur (Ziel-Zustand)

```
HubSpot Form/CRM
        │
        │  Webhook: "Erstprüfung abgeschlossen" = TRUE
        ▼
Next.js API-Route  /api/hubspot/member-webhook
        │
        ├──→ Supabase auth.admin.createUser(email, email_confirm: false)
        │        ↳ Supabase versendet Invite-Mail mit Passwort-Setzen-Link
        │
        └──→ Supabase: INSERT public.members
                 (slug, first, last, email, company, role, branch, sub,
                  work, home, sports, mobile, linkedin, since)
                 ↳ auth-Trigger verknüpft auth_id automatisch beim ersten Login
                   (existierender Trigger in 20260420010000_schema_v2.sql:141ff.)
```

### Trigger in HubSpot

**Property:** `is_sportnexus_pruefung_abgeschlossen` (Checkbox, default false).

**Workflow:**
1. Sales/Boris setzt die Property auf TRUE, sobald ein neuer Mitglieder-Kontakt genehmigt ist.
2. HubSpot-Workflow „Member onboarding" feuert einen Webhook an `https://sport-nexus.ch/api/hubspot/member-webhook`.
3. Webhook-Payload enthält Contact-Properties (siehe Field-Mapping unten) + Signatur-Header.

### Field-Mapping HubSpot → SportNexus

| HubSpot Contact Property         | Supabase `members` Spalte | Notiz                                            |
|----------------------------------|--------------------------|--------------------------------------------------|
| `firstname`                      | `first`                  |                                                  |
| `lastname`                       | `last`                   |                                                  |
| `email`                          | `email` + Auth-Email     | Wird auch Login-Adresse                          |
| `company`                        | `company`                |                                                  |
| `jobtitle`                       | `role`                   |                                                  |
| `industry` (Freitext)            | `branch`                 | **Kein Dropdown** — wie Pascal angemerkt hat. Die App akzeptiert seit jüngst beliebige Freitext-Branchen (siehe profile/page.tsx ComboField). |
| `industry_sub`                   | `sub`                    | Optional, Freitext                               |
| `work_city`                      | `work`                   |                                                  |
| `home_city`                      | `home`                   |                                                  |
| `mobilephone`                    | `mobile`                 |                                                  |
| `linkedin_url`                   | `linkedin`               |                                                  |
| `sports_interests` (Multi-Value) | `sports` (text[])        | Kommagetrennt parsen                             |
| `additional_roles`               | `additional`             | Freitext für VR-Mandate etc.                     |
| `member_since`                   | `since`                  | ISO-Date oder TT.MM.JJJJ — wir parsen beides    |

### Code-Skelett (für späteren Build)

```ts
// app/api/hubspot/member-webhook/route.ts
export async function POST(req: Request) {
  // 1. Signatur prüfen (HubSpot v3 HMAC SHA-256 mit HUBSPOT_WEBHOOK_SECRET)
  if (!verifyHubspotSignature(req)) return new Response("forbidden", { status: 403 });

  const payload = await req.json();
  const contact = payload.properties;

  // 2. Supabase Admin-Client (Service Role)
  const admin = adminClient();

  // 3. Auth-User anlegen (inviteUserByEmail = Magic Link + Passwort-Set-Flow)
  const { data: user, error: authErr } = await admin.auth.admin.inviteUserByEmail(contact.email, {
    redirectTo: `${APP_URL}/auth/callback?next=/reset-password`,
  });
  if (authErr && !authErr.message.includes("already")) return new Response(authErr.message, { status: 500 });

  // 4. Members-Row anlegen (auth-Trigger linkt auth_id bei erstem Login automatisch)
  const { error: insErr } = await admin.from("members").insert({
    slug: slugify(`${contact.firstname}-${contact.lastname}`),
    first: contact.firstname,
    last: contact.lastname,
    email: contact.email,
    company: contact.company ?? "",
    role: contact.jobtitle ?? "",
    branch: contact.industry ?? "",
    sub: contact.industry_sub ?? "",
    work: contact.work_city ?? "",
    home: contact.home_city ?? "",
    mobile: contact.mobilephone ?? "",
    linkedin: contact.linkedin_url ?? "",
    sports: (contact.sports_interests ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
    additional: contact.additional_roles ?? "",
    since: parseSince(contact.member_since),
  });
  if (insErr && !insErr.message.includes("duplicate")) return new Response(insErr.message, { status: 500 });

  return Response.json({ ok: true });
}
```

### Rückrichtung (SportNexus → HubSpot)
Pascals offene Frage: „Braucht es bei Datenveränderungen im Memberstack durch Member eine Rückschnittstelle ins Hubspot und eine automatische Datenänderung oder kann dies vorerst vernachlässigt werden?"

**Empfehlung für MVP: vernachlässigen.** Begründung:
- Member werden im MVP wenige Felder selbst ändern (Bio, Suche, Sportinteressen, Profilbild, Banner-Farbe — alles Felder, die HubSpot nicht trackt).
- Die in HubSpot relevanten Felder (Firma, Rolle, Branche, E-Mail) ändern sich selten und werden vom Sales-Team manuell synchronisiert.
- Sobald sich das ändert (z.B. Member ändern Firma häufig), bauen wir einen Supabase-Trigger → HubSpot-API-Call. Schema: `members.updated_at` ist bereits indexiert.

**Trade-off:** ohne Rückrichtung ist HubSpot die "halbe" Source of Truth. Member-eigene Anpassungen sind in unserer DB, aber nicht in HubSpot. Für Sales/Reporting reicht das, solange das Sales-Team die Master-Daten via App-Login regelmäßig prüft.

### Status & Nächste Schritte
- [x] Konzept dokumentiert (dieses File)
- [x] Profile akzeptiert Freitext-Branchen (commit a6b608d + Folge-Commit)
- [ ] HubSpot-Webhook-Endpoint `/api/hubspot/member-webhook` — noch nicht gebaut, erst nach Pricing-Entscheid (Webflow-Lösung vs. native App)
- [ ] HubSpot-Property `is_sportnexus_pruefung_abgeschlossen` anlegen — Boris/Pascal
- [ ] Field-Mapping in HubSpot mit Sales-Team verifizieren (welche Properties existieren in eurem HubSpot bereits, welche sind neu?)

### Offene Punkte für die Pascal-Demo
- HubSpot-Mapping: was ist heute in HubSpot bereits gepflegt? Sind die Property-Namen (`firstname`, `lastname`, `industry`) Standard oder habt ihr Custom-Namen?
- Invite-Mail vs. Magic Link: Supabase kann beides. Empfehlung: Magic Link (Member klickt → setzt Passwort), kein zusätzliches SMTP-Setup nötig (läuft über Resend, das schon konfiguriert ist).
- Rate-Limit: HubSpot-Webhooks können in Spitzen feuern. Wenn wir mehr als 100/min erwarten, brauchen wir eine Queue (Vercel KV oder Supabase Edge Queue) — für Member-Onboarding (eher selten) reicht der direkte Webhook.
