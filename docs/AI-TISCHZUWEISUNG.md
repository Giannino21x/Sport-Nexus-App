## AI-gestützte Tischzuweisung (Konzept)

> Antwort auf Pascals Idee aus Feedback 2: „Um den manuellen Aufwand zu reduzieren, wäre es spannend zu wissen, ob man mittels der bisherigen Tischzuweisungen (x PDFs), den Tischwünschen der Members in der App und manuellen Wünschen der Founders die Tischzuweisung AI unterstützt generieren kann."

### Kurzantwort
Ja, technisch gut machbar. Wir kombinieren drei Inputs (historische PDFs, App-Tischwünsche, Founder-Constraints), schicken sie strukturiert an Claude/GPT, und bekommen einen Tischplan als Vorschlag zurück. Mit 1–2 Iterationsrunden ("zu viele Founders an Tisch 3, bitte verteilen") ist der Plan in <10 Minuten produktiv.

### Architektur (3 Phasen)

**Phase 1 — Daten konsolidieren** (einmalig pro Event)
```
Inputs
├── Members aus Supabase           (Branche, Rolle, Wohnort, Interessen)
├── Anmeldungen aus Guestoo        (wer kommt überhaupt?)
├── Tischwünsche aus App           (table_wishes-Table — bereits gebaut)
├── Historische PDFs (alte Pläne)  → manuell oder per OCR in JSON konvertieren
└── Founder-Wünsche                (freier Text vom Founder, z.B. "X und Y unbedingt nicht zusammen")
```

**Phase 2 — Plan generieren** (Claude/GPT-API)
- Tische: 8–10 Personen pro Tisch (Annahme; konfigurierbar)
- Prompt enthält: Member-Liste mit Profilen, Tischwünsche (hard preference), Constraints (hard rule), historische Konstellationen (soft signal: "saßen letztes Mal zusammen → diesmal mischen")
- Output: JSON mit `[{ tisch: 1, members: ["slug1", "slug2", ...] }, ...]`
- Zusätzlich Reasoning pro Tisch: warum diese Zusammensetzung?

**Phase 3 — Iteration** (Mensch im Loop)
- Admin sieht den Vorschlag in `/admin/seating-plan/{event-id}`
- Drag-and-drop von Members zwischen Tischen
- Feedback-Button "Erneut generieren mit Notizen" → schickt aktuellen Stand + Notiz zurück an die AI

### Datenmodell (zukünftig)

```sql
-- Geplant, nicht implementiert:
create table seating_plans (
  id uuid primary key,
  event_id uuid references events(id),
  generated_at timestamptz,
  generated_by_ai boolean,
  notes text  -- Founder-Constraints / Iteration-Feedback
);

create table seating_tables (
  id uuid primary key,
  plan_id uuid references seating_plans(id),
  table_number int,
  reasoning text  -- AI-generierte Begründung pro Tisch
);

create table seating_assignments (
  id uuid primary key,
  table_id uuid references seating_tables(id),
  member_id uuid references members(id),
  source text  -- 'ai' | 'manual' | 'wish-fulfilled' | 'constraint-respected'
);
```

### Prompt-Skelett

```
Du planst die Tischzuweisung für ein SportNexus-Networking-Dinner.

EVENT
- Datum: 25.06.2026, Zürich
- ~80 Anmeldungen, 10 Tische à 8 Personen

MEMBERS (JSON-Liste mit Profil-Highlights)
[{ "slug":"anna-keller", "first":"Anna", "last":"Keller", "branch":"Finanzen", "company":"ClimateTech AG", "role":"CEO" }, ...]

TISCHWÜNSCHE (hard preference — wenn möglich erfüllen)
- Anna Keller möchte Pascal Messerli kennenlernen
- Mischa Holenstein möchte Felix Wolfensberger kennenlernen
...

CONSTRAINTS (hard rule — muss respektiert werden)
- Boris und Oliver sollen je einen Tisch moderieren (also nicht zusammen)
- Founder-Verteilung: max. 1 Founder pro Tisch

HISTORISCHE KONSTELLATIONEN (soft — diesmal eher mischen)
- Tisch 1 Q1/2026: Anna, Boris, Mischa, ...

OUTPUT
JSON-Array { tische: [{ nr: 1, members: [...], begründung: "..." }, ...] }
```

### Tooling-Optionen

| Variante | Aufwand | Qualität | Wann sinnvoll? |
|----------|---------|----------|----------------|
| Claude API direkt aus der App (`@anthropic-ai/sdk`) | 1–2 Tage | Hoch | Default-Pfad; tightes Coupling mit unseren Daten |
| OpenAI Assistants API mit Function-Calling | 2–3 Tage | Hoch | Wenn wir Tools (z.B. "moveMember") modellieren wollen |
| Lokale OR-Tools (kein AI) | 3–5 Tage | Mittel (deterministisch) | Wenn Reproduzierbarkeit > Kreativität wichtig wird |

**Empfehlung:** Claude API direkt — der gleiche Stack wie SportNexus-App, kein zusätzlicher Vendor. Cost: ~$0.05–0.20 pro Plan-Generierung mit Sonnet 4.6.

### Build-Vorschlag (sequenziell, falls Pascal grünes Licht gibt)

1. **PDF-Import**: bestehende Tischpläne als PDF einsammeln, manuell oder per OCR in `seating_history.jsonl` strukturieren (1× Aufwand).
2. **Plan-Generator**: Server-Action `generateSeatingPlan(eventId, founderNotes)` → ruft Claude API → speichert in `seating_plans`.
3. **Admin-UI**: `/admin/seating-plan/{event-id}` mit Tisch-Grid + Drag-Drop (HTML5 Drag-API oder dnd-kit-Bibliothek).
4. **Iteration-Loop**: Notes-Feld + "Erneut generieren"-Button.
5. **Export**: Tischplan als PDF (für Tischkarten beim Event) — html2pdf oder serverseitig via Puppeteer/Browserless.

**Geschätzter Aufwand für MVP (ohne PDF-Import):** ~3 Arbeitstage.

### Datenschutz / Privacy
- Member-Daten an Anthropic/OpenAI gesendet: Namen + Firma + Rolle + öffentlich sichtbare Interessen — keine E-Mail/Mobile/Bio.
- Anthropic/OpenAI haben Zero-Retention-Optionen (Standard bei Enterprise) — wir würden bei Production diese aktivieren, damit kein Training auf Member-Daten.
- Tischwünsche bleiben in der App sichtbar nur für Admins (siehe `table_wishes` RLS in Migration `20260511000000_table_wishes.sql`).

### Status
- [x] `table_wishes`-Tabelle + UI (gebaut, F2-Idee abgehakt)
- [ ] PDF-Historie sammeln — Boris/Pascal müssen 3–5 alte Tischpläne als Referenz liefern
- [ ] Pricing/Go-Entscheid mit Pascal nach Mittwochs-Demo
- [ ] MVP-Build (~3 Tage)
