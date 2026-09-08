// Kickoff-Versand der Einladungsmail an alle Members (Pascal, 2026-09-08:
// «am Eventtag um 14 Uhr», also 17.09.2026 14:00 Europe/Zurich, damit sich die
// Members auf dem Rückweg vom 12. SportNexus-Lunch Basel einloggen können).
//
// Läuft im GitHub-Workflow kickoff-mail.yml (Cron 12:00 UTC = 14:00 MESZ) und
// ist absichtlich mehrfach abgesichert, damit nie versehentlich 100+ Mails
// rausgehen:
//   1. scripts/kickoff.json muss "armed": true haben (Giannino scharfstellt,
//      sobald die Ausschlussliste von Pascal/Boris/Fabio da ist).
//   2. Der Lauf sendet nur innerhalb des Fensters [send_at, send_at + window_min].
//      Ein zu früher oder verspäteter Cron-Lauf tut nichts.
//   3. Ohne --live nur Dry-Run (zeigt die Kandidaten, schickt nichts).
//
//   node scripts/kickoff-send.mjs            # Dry-Run: Kandidaten + Fenster prüfen
//   node scripts/kickoff-send.mjs --live     # echter Versand (nur wenn armed + im Fenster)
//   node scripts/kickoff-send.mjs --live --now   # Fenster ignorieren (manueller Versand)
//
// Der eigentliche Versand ist scripts/hubspot-onboard.mjs mit --reinvite
// (alle Members sind seit dem Import vom 21.07. schon angelegt, ohne
// --reinvite würde jeder als «bereits onboarded» übersprungen) und
// --skip-active (wer sich schon eingeloggt hat, kennt die App).

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const cfg = JSON.parse(readFileSync("scripts/kickoff.json", "utf8"));
const LIVE = process.argv.includes("--live");
const NOW = process.argv.includes("--now");

const sendAt = new Date(cfg.send_at);
const windowMs = (cfg.window_min ?? 120) * 60_000;
const now = new Date();
const inWindow = now >= sendAt && now <= new Date(sendAt.getTime() + windowMs);

console.log(`Kickoff-Versand: geplant ${sendAt.toISOString()} (Fenster ${cfg.window_min ?? 120} min), jetzt ${now.toISOString()}`);
console.log(`armed=${cfg.armed}  imFenster=${inWindow}  live=${LIVE}${NOW ? "  (--now: Fenster ignoriert)" : ""}`);
console.log(`Ausgeschlossen (${cfg.exclude.length}): ${cfg.exclude.join(", ") || "–"}\n`);

if (LIVE && !cfg.armed) {
  console.log("Nicht scharf (armed=false) – nichts verschickt.");
  process.exit(0);
}
if (LIVE && !inWindow && !NOW) {
  console.log("Ausserhalb des Versandfensters – nichts verschickt.");
  process.exit(0);
}

const args = [
  "scripts/hubspot-onboard.mjs",
  `--status=${cfg.status}`,
  "--reinvite",
  "--skip-active",
  ...(cfg.exclude.length ? [`--exclude=${cfg.exclude.join(",")}`] : []),
  ...(LIVE ? ["--live"] : []),
];
console.log(`> node ${args.join(" ")}\n`);
const r = spawnSync(process.execPath, args, { stdio: "inherit" });
process.exit(r.status ?? 1);
