# SportNexus — Markenrichtlinien (Quellreferenz)

Quelle: `SN_Markenrichtlinien.pdf` · Stand 23.09.2025 · Version 1.0
Betreuung Corporate Design: Designatelier GmbH (branding@designatelier.ch)
Downloads:
- Logos: https://www.designatelier-dev.ch/transfer/sportnexus/logodaten.zip
- Manual: https://www.designatelier-dev.ch/transfer/sportnexus/SN_Markenrichtlinien.pdf

## Markenwerte
verbindend · dynamisch · authentisch · respektvoll · dezentral-regional · vielfältig

## Markenpersönlichkeit (SOLL-Schwerpunkte)
- Natürlichkeit 4.0 — naturnah, frisch, unverbraucht
- Erfolgreich, bekannt, nachhaltig
- Facetten: Fokus „Netzwerk" und Fokus „Sport"

## Logo
Zwei Hauptvarianten — **Logo A** (Standard, repräsentativ) und **Logo B** (alternative Anordnung, Co-Branding/Spezial-Layouts), jeweils mit oder ohne Claim. Zusätzlich **Speziallogo** für plakative Anwendungen (Trikots, Banner, Social Profilbild).

Konstruktion über Bildmarken-Höhe E (Basislinie/Oberlinie); Winkel 80° und 15° leiten sich aus der Bildmarke ab und sind als Gestaltungswinkel wiederverwendbar.

**Schutzzone:** 1E rundum.
**Mindestgrösse:**
- mit Claim: 27 mm / 125 px (Logo A), 35 mm / 160 px (Logo B)
- ohne Claim: 13 mm / 60 px (A), 16 mm / 80 px (B)

**Don'ts:** Amber Glow nur auf weissem/sehr hellem, farbneutralem Hintergrund · nicht verzerren · Farbe nicht ändern · keine Effekte · kein Einsatz in Mustern/Ornamenten · Schutzzone freihalten · nicht direkt auf Bildinhalt beziehen · Kontrast ausreichend · Platzierung nie erzwingen.

## Farben

| Rolle | Name | HEX | RGB | CMYK | Pantone |
|---|---|---|---|---|---|
| Akzent | SN „Amber Glow" | `#C3A75E` | 195-167-94 | 15-30-70-10 | 7509 C / U |
| Sekundär | SN Blau | `#006FB6` | 0-111-182 | 100-45-0-0 | 2194 C / Process Blue U |
| Primär | Schwarz | `#000000` | 0-0-0 | 0-0-0-100 | — |
| Hintergrund | Weiss | `#FFFFFF` | — | — | — |

**SN Blau Abstufungen:** 10 % `#E5F1F8` · 20 % `#CCE2F0` · 40 % `#99C5E2` · 60 % `#66A8D3` · 80 % `#338CC4`
**Schwarz Abstufungen:** 10 % `#ECECEC` · 20 % `#D9D9D9` · 40 % `#B1B1B1` · 60 % `#868686` · 80 % `#575757`

## Schrift

**Hausschrift:**
- Azo Sans (Regular / Medium / Bold / Black) — Überschriften, Lauftext, Bildunterschriften, Tabellen, Grafiken
- Belarius Poster Wide Semibold — Titel, Untertitel, Leadtexte, Akzente, Produktnamen, Zitate

**Büromedien (Fallback ohne Lizenz):**
- Trebuchet MS Regular / Bold — Überschriften, Untertitel, Lauftext, Signaturen

## Bildsprache
Verbindend, dynamisch, authentisch, respektvoll, dezentral-regional, vielfältig.

## Flankierende Gestaltungselemente
- **Key Visual:** flexible Aneinanderreihung der Bildmarke; Speziallogo darf das Key Visual abschliessen, wenn kein anderes SN-Logo daneben steht.
- **Gestaltungswinkel:** 80° und 15° aus der Bildmarke abgeleitet.

## App-Mapping

**Farben** (`app/globals.css`):
- `--accent` = Amber Glow `#C3A75E` (Default)
- `--accent` (Akzent „SN Blau") = `#006FB6`
- `--accent` (Akzent „Schwarz") = `#000000`
- `--bg` = `#FFFFFF`, `--bg-sunken` = `#F4F4F4`
- `--ink` = `#000000`, `--ink-2..4` = SN Schwarz 80/60/40 %
- `--line` / `--line-strong` = SN Schwarz 10/20 %
- Dark Theme: Akzent-Default wechselt auf SN Blau (Amber Glow laut CD nur auf hellem Hintergrund erlaubt)

**Schrift** (`app/layout.tsx`):
- Hausschrift-Ersatz Sans: **Manrope** (Google Fonts; Stand-in für Azo Sans)
- Display-Ersatz: **Bricolage Grotesque** (variable, opsz/wdth; Stand-in für Belarius Poster)
- Mono: JetBrains Mono
- Originalfonts (Azo Sans, Belarius Poster) nicht enthalten — bei vorhandener Lizenz lokal hinzufügen und in `--font-sans` / `--font-display` voranstellen.

**Logos** (`/public`): Hauptlogo + Speziallogo („N") in Color, Schwarz und Weiss (Web-Variante) — bereits CD-konform.

**Akzentpalette UI**: 3 Optionen (Amber Glow, SN Blau, Schwarz) in Tweaks-Panel und Settings — frühere Themes (green/ochre/burgundy/Matchday Orange) wurden entfernt; gespeicherte Altwerte migrieren automatisch auf Default.
