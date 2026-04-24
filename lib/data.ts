export type Member = {
  id: string;
  dbId?: string;
  isAdmin?: boolean;
  first: string;
  last: string;
  company: string;
  role: string;
  extra: string;
  branch: string;
  sub: string;
  work: string;
  home: string;
  offer: string;
  sports: string[];
  search: string;
  since: string;
  email: string;
  mobile: string;
  web: string;
  bio: string;
  color: string;
  avatarUrl?: string;
  linkedin?: string;
};

export type EventSpeaker = { name: string; role: string };
export type EventAgendaItem = { t: string; l: string };

export type SnEvent = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  city: string;
  venue: string;
  address: string;
  guests: number;
  status: "upcoming" | "past";
  featured?: boolean;
  desc: string;
  img: string;
  speakers: EventSpeaker[];
  agenda: EventAgendaItem[];
  long: string;
};

export const BRANCHES: Record<string, string[]> = {
  "Finanzen": ["Asset Management", "Banking", "Versicherung", "Private Equity", "FinTech"],
  "Technologie": ["Software", "AI & Data", "Cloud", "Cybersecurity", "Hardware"],
  "Industrie": ["Maschinenbau", "Logistik", "Bau", "Energie", "Chemie"],
  "Consulting": ["Strategie", "Organisation", "M&A", "Nachhaltigkeit", "HR"],
  "Marketing & Media": ["Agentur", "PR", "Produktion", "Publishing", "Events"],
  "Legal & Tax": ["Wirtschaftsrecht", "Steuern", "Compliance", "Notariat"],
  "Sport & Health": ["Vereinsmanagement", "Sportmedizin", "Physiotherapie", "Nutrition", "Equipment"],
  "Real Estate": ["Investment", "Entwicklung", "Verwaltung", "Makler"],
};

export const CITIES = ["Zürich", "Basel", "Bern", "Luzern", "Zug", "St. Gallen", "Genf", "Winterthur", "Lausanne", "Lugano"];

// Swiss cities (Gemeinden) for autocomplete. Sorted alphabetically, German names.
// Free text remains allowed — this is just a suggestion list.
export const LOCATIONS: string[] = [
  "Aarau",
  "Adliswil",
  "Allschwil",
  "Arbon",
  "Baar",
  "Baden",
  "Basel",
  "Bellinzona",
  "Bern",
  "Bettlach",
  "Biel/Bienne",
  "Binningen",
  "Brig-Glis",
  "Bülach",
  "Burgdorf",
  "Chur",
  "Davos",
  "Dietikon",
  "Dübendorf",
  "Emmen",
  "Frauenfeld",
  "Freiburg",
  "Genf",
  "Gossau",
  "Grenchen",
  "Herisau",
  "Horgen",
  "Illnau-Effretikon",
  "Interlaken",
  "Kloten",
  "Köniz",
  "Kreuzlingen",
  "Kriens",
  "Küsnacht",
  "La Chaux-de-Fonds",
  "Lancy",
  "Langenthal",
  "Lausanne",
  "Liestal",
  "Locarno",
  "Lugano",
  "Luzern",
  "Lyss",
  "Martigny",
  "Meyrin",
  "Monthey",
  "Montreux",
  "Morges",
  "Münchenstein",
  "Münsingen",
  "Muttenz",
  "Neuchâtel",
  "Nyon",
  "Oberwil",
  "Olten",
  "Opfikon",
  "Pratteln",
  "Pully",
  "Rapperswil-Jona",
  "Regensdorf",
  "Reinach",
  "Renens",
  "Riehen",
  "Romanshorn",
  "Rüti",
  "Schaffhausen",
  "Schlieren",
  "Sierre",
  "Sion",
  "Solothurn",
  "Spiez",
  "St. Gallen",
  "Stäfa",
  "Steffisburg",
  "Thalwil",
  "Thônex",
  "Thun",
  "Uster",
  "Vernier",
  "Volketswil",
  "Wädenswil",
  "Wallisellen",
  "Wettingen",
  "Wetzikon",
  "Wil",
  "Winterthur",
  "Wohlen",
  "Yverdon-les-Bains",
  "Zollikon",
  "Zug",
  "Zürich",
];
export const ROLES = ["CEO", "Managing Partner", "CFO", "Co-Founder", "Head of Sales", "Investor", "CMO", "General Manager", "Gründer", "COO", "Head of Digital", "Partner", "VP Business Development", "Principal"];
export const SPORTS = ["Golf", "Tennis", "Skifahren", "Handball", "Fussball", "Radfahren", "Laufen", "Segeln", "Squash", "Reiten", "Basketball", "Eishockey", "Padel", "Triathlon", "Yoga", "Klettern"];

export const MEMBERS: Member[] = [
  { id: "anna-keller", first: "Anna", last: "Keller", company: "ClimateTech AG", role: "CEO", extra: "SportNexus Co-Founder", branch: "Technologie", sub: "AI & Data", work: "Zürich", home: "Basel", offer: "ERP-System Abacus, Climate Reporting", sports: ["Golf", "Tennis"], search: "Co-Founder, Kunden", since: "01.01.2026", email: "anna@climatetech.ch", mobile: "+41 79 758 35 22", web: "climatetech.ch", bio: "CEO einer Climate-Tech-Firma in Zürich. Passioniert über Netto-Null-Strategien und disziplinierten Sport.", color: "#C7916A" },
  { id: "marco-fischer", first: "Marco", last: "Fischer", company: "Helvetia Partners", role: "Managing Partner", extra: "VR Alpine Equity", branch: "Finanzen", sub: "Private Equity", work: "Zürich", home: "Zug", offer: "Buy-out Capital, Wachstumsfinanzierung", sports: ["Skifahren", "Tennis", "Radfahren"], search: "Co-Investoren, Deal Flow", since: "15.02.2024", email: "m.fischer@helvetia-partners.ch", mobile: "+41 79 412 88 01", web: "helvetia-partners.ch", bio: "20 Jahre PE-Erfahrung. Investiere in Schweizer Mittelstand.", color: "#6B8AA8" },
  { id: "sophie-meier", first: "Sophie", last: "Meier", company: "Nordlicht Design", role: "Gründerin", extra: "Beirätin Swiss Design Council", branch: "Marketing & Media", sub: "Agentur", work: "Zürich", home: "Zürich", offer: "Brand Strategy, Identity Design", sports: ["Laufen", "Yoga"], search: "B2B-Kunden, Partner Motion Design", since: "10.06.2025", email: "sophie@nordlicht.design", mobile: "", web: "nordlicht.design", bio: "", color: "#A67A9E" },
  { id: "david-huber", first: "David", last: "Huber", company: "Huber Immobilien", role: "CEO", extra: "", branch: "Real Estate", sub: "Entwicklung", work: "Basel", home: "Basel", offer: "Projektentwicklung Nordwestschweiz", sports: ["Golf", "Skifahren"], search: "Kapitalgeber für Projekt BS-Nord", since: "22.09.2024", email: "david@huber-immo.ch", mobile: "+41 61 222 40 10", web: "huber-immo.ch", bio: "Dritte Generation im Familienunternehmen. 40+ Projekte in der Nordwestschweiz.", color: "#7A9B7A" },
  { id: "julia-brunner", first: "Julia", last: "Brunner", company: "Brunner Legal", role: "Partner", extra: "Lehrbeauftragte UZH", branch: "Legal & Tax", sub: "Wirtschaftsrecht", work: "Zürich", home: "Zürich", offer: "M&A, Gesellschaftsrecht", sports: ["Tennis", "Segeln"], search: "Mandate Tech-Startups", since: "03.03.2025", email: "j.brunner@brunner-legal.ch", mobile: "+41 44 567 22 11", web: "brunner-legal.ch", bio: "Partnerin, spezialisiert auf Tech-M&A.", color: "#B8876B" },
  { id: "lukas-baumann", first: "Lukas", last: "Baumann", company: "Baumann Industries", role: "CFO", extra: "", branch: "Industrie", sub: "Maschinenbau", work: "Winterthur", home: "Zürich", offer: "Präzisionsteile Automotive", sports: ["Radfahren", "Handball"], search: "Zulieferer Asia", since: "18.11.2024", email: "l.baumann@baumann-ind.ch", mobile: "", web: "baumann-ind.ch", bio: "", color: "#6B8AA8" },
  { id: "nina-schmid", first: "Nina", last: "Schmid", company: "NS Consulting", role: "Gründerin", extra: "VR-Mandate", branch: "Consulting", sub: "Strategie", work: "Zürich", home: "Luzern", offer: "Strategische Beratung Family Offices", sports: ["Golf", "Skifahren", "Reiten"], search: "Neue Mandate, Sparring-Partner", since: "05.01.2024", email: "nina@ns-consulting.ch", mobile: "+41 79 123 45 67", web: "ns-consulting.ch", bio: "Ehemals McKinsey. Heute eigene Boutique für Family Offices.", color: "#A67A9E" },
  { id: "pascal-zingg", first: "Pascal", last: "Zingg", company: "Zingg Ventures", role: "Investor", extra: "Business Angel Schweiz", branch: "Finanzen", sub: "FinTech", work: "Zug", home: "Zug", offer: "Seed Capital, Advisory FinTech", sports: ["Skifahren", "Triathlon"], search: "B2B SaaS Deals CHF 500k+", since: "12.07.2024", email: "pascal@zingg-ventures.com", mobile: "+41 79 888 12 00", web: "zingg-ventures.com", bio: "Ex-CFO, jetzt Business Angel mit 20+ Investments in FinTech und SaaS.", color: "#C7916A" },
  { id: "laura-weber", first: "Laura", last: "Weber", company: "Weber & Co.", role: "CEO", extra: "", branch: "Sport & Health", sub: "Vereinsmanagement", work: "Bern", home: "Bern", offer: "Professionalisierung Amateursport-Vereine", sports: ["Handball", "Laufen"], search: "Sponsoren, Vereins-Partner", since: "28.04.2025", email: "laura@weber-sport.ch", mobile: "+41 31 300 80 22", web: "weber-sport.ch", bio: "", color: "#7A9B7A" },
  { id: "reto-oberli", first: "Reto", last: "Oberli", company: "Oberli Media", role: "Gründer", extra: "Podcast-Host 'Swiss Founders'", branch: "Marketing & Media", sub: "Produktion", work: "Zürich", home: "Zürich", offer: "Video-Content, Executive Storytelling", sports: ["Klettern", "Radfahren"], search: "Corporate-Content-Kunden", since: "14.09.2025", email: "reto@oberli-media.ch", mobile: "", web: "oberli-media.ch", bio: "Host des Schweizer Unternehmer-Podcasts. 80+ Folgen.", color: "#B8876B" },
  { id: "simone-gerber", first: "Simone", last: "Gerber", company: "Gerber Pharma Group", role: "COO", extra: "", branch: "Industrie", sub: "Chemie", work: "Basel", home: "Basel", offer: "CDMO-Services, Biopharma Manufacturing", sports: ["Tennis", "Yoga"], search: "Europäische Distributionspartner", since: "02.02.2024", email: "s.gerber@gerberpharma.com", mobile: "+41 61 444 22 10", web: "gerberpharma.com", bio: "Operations-Lead einer der führenden Schweizer Biopharma-Gruppen.", color: "#6B8AA8" },
  { id: "tim-rothen", first: "Tim", last: "Rothen", company: "BlueCloud Systems", role: "Co-Founder", extra: "", branch: "Technologie", sub: "Cloud", work: "Zürich", home: "Winterthur", offer: "Schweizer Cloud-Infrastruktur (souverän)", sports: ["Basketball", "Squash"], search: "Public-Sector-Kunden", since: "20.10.2025", email: "tim@bluecloud.ch", mobile: "+41 79 456 78 90", web: "bluecloud.ch", bio: "", color: "#A67A9E" },
  { id: "carla-roth", first: "Carla", last: "Roth", company: "Roth Family Office", role: "Principal", extra: "Stiftungsrätin", branch: "Finanzen", sub: "Asset Management", work: "Genf", home: "Genf", offer: "Family Office, Impact Investments", sports: ["Segeln", "Reiten"], search: "Impact Deals Europa", since: "09.05.2024", email: "c.roth@rothfo.ch", mobile: "", web: "rothfo.ch", bio: "Zweite Generation, Fokus Impact und Sustainable Investing.", color: "#7A9B7A" },
  { id: "felix-moser", first: "Felix", last: "Moser", company: "Moser AG", role: "Geschäftsführer", extra: "", branch: "Industrie", sub: "Logistik", work: "Basel", home: "Basel", offer: "Kontraktlogistik Rheinhäfen", sports: ["Radfahren", "Fussball"], search: "E-Commerce-Kunden", since: "25.06.2024", email: "felix@moser-ag.ch", mobile: "+41 61 313 99 10", web: "moser-ag.ch", bio: "", color: "#C7916A" },
  { id: "eva-gisler", first: "Eva", last: "Gisler", company: "Gisler Marketing", role: "CMO", extra: "Board Member Werbewoche", branch: "Marketing & Media", sub: "Agentur", work: "Zürich", home: "Zug", offer: "B2B-Marketing, Account-Based Marketing", sports: ["Tennis", "Yoga", "Skifahren"], search: "Tech-Kunden", since: "30.11.2024", email: "eva@gisler-marketing.ch", mobile: "+41 79 234 56 78", web: "gisler-marketing.ch", bio: "Führt eine der bekanntesten B2B-Agenturen der Deutschschweiz.", color: "#A67A9E" },
  { id: "martin-schneider", first: "Martin", last: "Schneider", company: "Schneider Legal", role: "Partner", extra: "", branch: "Legal & Tax", sub: "Steuern", work: "Zürich", home: "Zürich", offer: "Steuerberatung HNWI und Unternehmer", sports: ["Golf"], search: "Struktur-Mandate", since: "17.08.2025", email: "m.schneider@schneider-legal.ch", mobile: "", web: "schneider-legal.ch", bio: "", color: "#6B8AA8" },
  { id: "patricia-wyss", first: "Patricia", last: "Wyss", company: "Wyss Biotech", role: "Co-Founder", extra: "Wissenschaftlerin ETH", branch: "Technologie", sub: "AI & Data", work: "Zürich", home: "Zürich", offer: "Drug Discovery mit AI", sports: ["Laufen", "Klettern"], search: "Series-A Investoren", since: "08.10.2025", email: "patricia@wyssbio.com", mobile: "+41 44 633 12 34", web: "wyssbio.com", bio: "ETH-Spin-off. Lab-to-Market für präklinische AI-Tools.", color: "#B8876B" },
  { id: "andreas-kunz", first: "Andreas", last: "Kunz", company: "Kunz Architektur", role: "Inhaber", extra: "SIA-Mitglied", branch: "Real Estate", sub: "Entwicklung", work: "Luzern", home: "Luzern", offer: "Nachhaltige Gewerbeimmobilien", sports: ["Skifahren", "Segeln"], search: "Bauherren Zentralschweiz", since: "14.12.2024", email: "a.kunz@kunz-arch.ch", mobile: "", web: "kunz-arch.ch", bio: "", color: "#7A9B7A" },
  { id: "sarah-ziegler", first: "Sarah", last: "Ziegler", company: "Ziegler & Partner", role: "Senior Partner", extra: "", branch: "Consulting", sub: "M&A", work: "Zürich", home: "Zürich", offer: "Verkaufsseitige M&A-Beratung KMU", sports: ["Golf", "Tennis"], search: "Mandanten Nachfolge-Situationen", since: "11.03.2024", email: "sarah@ziegler-partner.ch", mobile: "+41 44 789 01 23", web: "ziegler-partner.ch", bio: "20+ verkaufte Unternehmen in 10 Jahren.", color: "#C7916A" },
  { id: "joel-aebi", first: "Joël", last: "Aebi", company: "Aebi Sports", role: "CEO", extra: "Ex-Profi-Handballer", branch: "Sport & Health", sub: "Equipment", work: "Bern", home: "Bern", offer: "Team-Equipment, Club-Ausstattung", sports: ["Handball", "Fussball", "Tennis"], search: "Vereine & Schulen", since: "22.05.2025", email: "joel@aebi-sports.ch", mobile: "+41 31 555 67 89", web: "aebi-sports.ch", bio: "Von der Platte in die Geschäftsleitung. Ausrüster für 200+ Schweizer Vereine.", color: "#A67A9E" },
  { id: "melanie-koch", first: "Melanie", last: "Koch", company: "Koch Events", role: "Gründerin", extra: "", branch: "Marketing & Media", sub: "Events", work: "Zürich", home: "Zürich", offer: "Corporate Events, VIP-Hospitality", sports: ["Reiten", "Skifahren"], search: "Neue Venues in Zürich", since: "03.07.2024", email: "melanie@koch-events.ch", mobile: "", web: "koch-events.ch", bio: "", color: "#B8876B" },
  { id: "raphael-vogt", first: "Raphael", last: "Vogt", company: "Vogt Energy", role: "CEO", extra: "", branch: "Industrie", sub: "Energie", work: "St. Gallen", home: "St. Gallen", offer: "Solar-Großanlagen Ostschweiz", sports: ["Radfahren", "Segeln", "Laufen"], search: "Gewerbe-Kunden", since: "19.01.2025", email: "r.vogt@vogt-energy.ch", mobile: "+41 71 233 44 55", web: "vogt-energy.ch", bio: "Energiewende praktisch — von der Idee zur fertigen Anlage.", color: "#6B8AA8" },
  { id: "lea-fankhauser", first: "Lea", last: "Fankhauser", company: "Fankhauser Law", role: "Partner", extra: "", branch: "Legal & Tax", sub: "Compliance", work: "Zürich", home: "Zürich", offer: "FINMA, AML, Bank-Compliance", sports: ["Yoga", "Tennis"], search: "Bank-Mandate", since: "27.02.2025", email: "lea@fankhauser-law.ch", mobile: "+41 44 111 22 33", web: "fankhauser-law.ch", bio: "", color: "#7A9B7A" },
  { id: "stefan-meyer", first: "Stefan", last: "Meyer", company: "Meyer Capital", role: "Managing Director", extra: "", branch: "Finanzen", sub: "Banking", work: "Zürich", home: "Zürich", offer: "Corporate Banking, KMU-Finanzierung", sports: ["Golf", "Skifahren"], search: "Wachstums-KMU", since: "16.04.2024", email: "s.meyer@meyer-capital.ch", mobile: "", web: "meyer-capital.ch", bio: "", color: "#C7916A" },
  { id: "noemi-portmann", first: "Noémi", last: "Portmann", company: "Portmann AI", role: "Co-Founder", extra: "Forbes 30U30", branch: "Technologie", sub: "AI & Data", work: "Lausanne", home: "Lausanne", offer: "Document-AI für Banken", sports: ["Klettern", "Laufen"], search: "Schweizer Privatbanken", since: "06.10.2025", email: "noemi@portmann-ai.com", mobile: "+41 21 888 99 00", web: "portmann-ai.com", bio: "EPFL-Spin-off. Wir erkennen in Dokumenten, was Compliance-Teams suchen.", color: "#A67A9E" },
  { id: "thomas-leuenberger", first: "Thomas", last: "Leuenberger", company: "Leuenberger VR", role: "Verwaltungsrat", extra: "Mehrere Mandate", branch: "Consulting", sub: "Organisation", work: "Bern", home: "Bern", offer: "VR-Mandate, Governance-Beratung", sports: ["Skifahren", "Golf"], search: "VR-Mandate KMU", since: "11.11.2024", email: "t.leuenberger@leuenberger-vr.ch", mobile: "+41 31 444 55 66", web: "leuenberger-vr.ch", bio: "", color: "#B8876B" },
  { id: "miriam-keller", first: "Miriam", last: "Keller", company: "Keller Kommunikation", role: "Gründerin", extra: "", branch: "Marketing & Media", sub: "PR", work: "Zürich", home: "Zürich", offer: "Krisen-PR, Executive Communications", sports: ["Tennis", "Laufen"], search: "C-Level-Kunden", since: "23.08.2024", email: "miriam@keller-kom.ch", mobile: "", web: "keller-kom.ch", bio: "25 Jahre PR-Erfahrung. Früher Bahnhofstrasse, heute Netzwerk.", color: "#6B8AA8" },
  { id: "beat-sommer", first: "Beat", last: "Sommer", company: "Sommer Construction", role: "CEO", extra: "", branch: "Industrie", sub: "Bau", work: "Zug", home: "Zug", offer: "Hochbau Innerschweiz", sports: ["Fussball", "Radfahren"], search: "Architekten-Partnerschaften", since: "01.12.2025", email: "beat@sommer-bau.ch", mobile: "+41 41 233 44 00", web: "sommer-bau.ch", bio: "", color: "#7A9B7A" },
  { id: "anja-reber", first: "Anja", last: "Reber", company: "Reber Physio", role: "Inhaberin", extra: "Ex-Nationalteam Leichtathletik", branch: "Sport & Health", sub: "Physiotherapie", work: "Zürich", home: "Zürich", offer: "Sportphysio für Executives", sports: ["Laufen", "Triathlon", "Yoga"], search: "Corporate-Wellness-Kooperationen", since: "04.02.2025", email: "anja@reber-physio.ch", mobile: "+41 44 333 22 11", web: "reber-physio.ch", bio: "Von der 400m-Bahn in die eigene Praxis. Ich behandle die, die trotz Kalender trainieren.", color: "#A67A9E" },
  { id: "christian-winter", first: "Christian", last: "Winter", company: "Winter Trading", role: "CEO", extra: "", branch: "Finanzen", sub: "Asset Management", work: "Zürich", home: "Küsnacht", offer: "Quant-Strategien, Systematic Trading", sports: ["Segeln", "Skifahren"], search: "Institutionelle Allokatoren", since: "29.06.2024", email: "c.winter@winter-trading.com", mobile: "", web: "winter-trading.com", bio: "", color: "#C7916A" },
  { id: "vanessa-lang", first: "Vanessa", last: "Lang", company: "Lang Nutrition", role: "Gründerin", extra: "", branch: "Sport & Health", sub: "Nutrition", work: "Zürich", home: "Zürich", offer: "Performance-Nutrition Coaching", sports: ["Triathlon", "Laufen", "Klettern"], search: "Executive-Coaching-Kunden", since: "15.09.2024", email: "vanessa@lang-nutrition.ch", mobile: "+41 79 333 11 22", web: "lang-nutrition.ch", bio: "Ich arbeite mit CEOs, die trainieren wie Athleten und essen wie Büroarbeiter.", color: "#B8876B" },
  { id: "michael-zollinger", first: "Michael", last: "Zollinger", company: "Zollinger Holding", role: "Inhaber", extra: "Mehrere Beteiligungen", branch: "Finanzen", sub: "Private Equity", work: "Zürich", home: "Zürich", offer: "Beteiligungskapital 1-5 Mio", sports: ["Golf", "Tennis", "Skifahren"], search: "Traditionsfirmen Nachfolge", since: "08.01.2024", email: "m.zollinger@zollinger-holding.ch", mobile: "+41 44 255 88 99", web: "zollinger-holding.ch", bio: "Unternehmerfamilie in dritter Generation. Beteiligungen an 12 Schweizer KMU.", color: "#6B8AA8" },
];

export const EVENTS: SnEvent[] = [
  { id: "ev-apr26-zh-coffee", title: "SportNexus Coffee Connect Zürich", subtitle: "Netzwerken bei einer Tasse Kaffee", date: "2026-04-28", time: "07:30 – 09:00", city: "Zürich", venue: "Alferano Store", address: "Zürich", guests: 7, status: "upcoming", featured: true, desc: "Entspanntes Morgen-Networking bei einer Tasse Kaffee.", img: "https://events.guestoo.de/proxy/api/asset/14ffd81f-8133-45e0-b0fa-cb9bf669783a.png?x=1775588079962", speakers: [], agenda: [{ t: "07:30", l: "Kaffee & Ankommen" }, { t: "09:00", l: "Abschluss" }], long: "Starte deinen Tag mit Members aus dem SportNexus-Kreis. Kein Programm, keine Agenda — Kaffee, ein paar bekannte und ein paar neue Gesichter." },
  { id: "ev-apr26-bs-coffee", title: "SportNexus Coffee Connect Basel", subtitle: "Netzwerken bei einer Tasse Kaffee", date: "2026-04-28", time: "07:30 – 09:00", city: "Basel", venue: "Kaffeemacher Café Bahnhof SBB", address: "Bahnhof SBB, Basel", guests: 28, status: "upcoming", desc: "Entspanntes Morgen-Networking bei einer Tasse Kaffee.", img: "https://events.guestoo.de/proxy/api/asset/10cef4e0-c60f-4f77-8417-4d6ab098a7cf.png?x=1775586614775", speakers: [], agenda: [{ t: "07:30", l: "Kaffee & Ankommen" }, { t: "09:00", l: "Abschluss" }], long: "Basler Ausgabe des Coffee Connect — direkt am Bahnhof SBB. Ideal vor dem Arbeitstag, kurz und unkompliziert." },
  { id: "ev-may26-zh-lunch", title: "9. SportNexus-Lunch Zürich", subtitle: "Kerstin Kündig & Felix Rübel", date: "2026-05-07", time: "11:30 – 14:00", city: "Zürich", venue: "Santa Lucia Teatro", address: "Zürich", guests: 35, status: "upcoming", desc: "Lunch-Talk mit Kerstin Kündig und Felix Rübel im Santa Lucia Teatro.", img: "https://events.guestoo.de/proxy/api/asset/69e8738b-85ca-4825-b3cf-b46acb6cca8e.jpg?x=1770121460019", speakers: [{ name: "Kerstin Kündig", role: "Gast" }, { name: "Felix Rübel", role: "Gast" }], agenda: [{ t: "11:30", l: "Empfang" }, { t: "12:15", l: "Talk" }, { t: "13:00", l: "Lunch" }, { t: "14:00", l: "Abschluss" }], long: "Die neunte Ausgabe des SportNexus-Lunches in Zürich. Kerstin Kündig und Felix Rübel im Gespräch — Einblicke aus Sport und Unternehmertum in kurzen Impulsen, danach Lunch und Networking am Tisch." },
  { id: "ev-may26-padel", title: "1. Padel-Memberturnier", subtitle: "SportNexus x Padelwerk", date: "2026-05-27", time: "16:30 – 23:30", city: "Münchenstein", venue: "Padelwerk Münchenstein", address: "Münchenstein", guests: 18, status: "upcoming", desc: "Erstes Memberturnier auf dem Court — Padel, Apéro und Abendessen.", img: "https://events.guestoo.de/proxy/api/asset/de52057d-671a-4de9-9ec2-5cd6f64446c1.png?x=1775588852493", speakers: [], agenda: [{ t: "16:30", l: "Check-in & Aufwärmen" }, { t: "17:00", l: "Turnierrunden" }, { t: "20:00", l: "Apéro & Dinner" }, { t: "23:30", l: "Ausklang" }], long: "Die erste Padel-Ausgabe für Members. In Kooperation mit Padelwerk Münchenstein: lockeres Turnier, Apéro zwischen den Matches, gemeinsames Abendessen im Anschluss. Alle Levels willkommen." },
  { id: "ev-jun26-bs-lunch", title: "10. SportNexus-Lunch Basel", subtitle: "Alessandra Keller & Stefan Pfister", date: "2026-06-02", time: "11:30 – 14:00", city: "Basel", venue: "Atlantis Basel", address: "Klosterberg 13, 4051 Basel", guests: 47, status: "upcoming", desc: "Lunch-Talk mit Alessandra Keller und Stefan Pfister im Atlantis Basel.", img: "https://events.guestoo.de/proxy/api/asset/3d4e4a52-d2f0-4a93-8cbb-854018d4c4fd.jpg?x=1770121924314", speakers: [{ name: "Alessandra Keller", role: "Gast" }, { name: "Stefan Pfister", role: "Gast" }], agenda: [{ t: "11:30", l: "Empfang" }, { t: "12:15", l: "Talk" }, { t: "13:00", l: "Lunch" }, { t: "14:00", l: "Abschluss" }], long: "Die zehnte Ausgabe des SportNexus-Lunches — dieses Mal in Basel. Alessandra Keller und Stefan Pfister im Doppel-Talk, anschliessend Lunch und Networking im Atlantis." },
  { id: "ev-sep26-golf", title: "SportNexus Golfevent", subtitle: "2er Scramble & Einführung für Nicht-Golfer", date: "2026-09-24", time: "16:30 – 22:00", city: "Frick", venue: "Golf Fricktal", address: "Frick", guests: 42, status: "upcoming", desc: "Plauschturnier und Golfeinführung — für Golfer und Nicht-Golfer. Nicht-Golfer starten erst um 18:30 Uhr.", img: "https://events.guestoo.de/proxy/api/asset/d54252f6-ae3f-41b8-aeda-986a5fd9cb69.png?x=1773603620108", speakers: [], agenda: [{ t: "16:30", l: "Start Turnier (Golfer)" }, { t: "18:30", l: "Start Einführung (Nicht-Golfer)" }, { t: "20:00", l: "Apéro & Dinner" }, { t: "22:00", l: "Abschluss" }], long: "Offenes Format für alle Members: 2er-Scramble-Plauschturnier für Golfer ab 16:30 Uhr, parallel eine Golfeinführung für Nicht-Golfer ab 18:30 Uhr. Gemeinsamer Apéro und Abendessen im Clubhaus." },
  { id: "ev-mar26-zh", title: "SportNexus Lunch Zürich", subtitle: "Andy Schmid & Pascal Jenny", date: "2026-03-03", time: "11:30 – 14:00", city: "Zürich", venue: "Restaurant Metropol", address: "Fraumünsterstrasse 12, 8001 Zürich", guests: 70, status: "past", desc: "Pokal, National-Trainer und 70 Teilnehmende. Die zwei Aushängeschilder des Schweizer Handballs im Talk.", img: "https://cdn.prod.website-files.com/68d390b6028a7796367f36b3/69b148832365b2d645660b2a_SportNexus-Ma%CC%88rz26-KMEDIA-DSC02089-A.jpg", speakers: [{ name: "Andy Schmid", role: "Handball-Legende" }, { name: "Pascal Jenny", role: "Nationaltrainer" }], agenda: [], long: "Eine leistungsorientierte Wohlfühloase, grosse Ziele und ein Team auf dem Weg zur Weltspitze. 70 Teilnehmende, Pokal auf dem Tisch." },
  { id: "ev-jan26-zh", title: "SportNexus Lunch Zürich", subtitle: "Daniel & Jonas Kalt", date: "2026-01-22", time: "11:30 – 14:00", city: "Zürich", venue: "Baur au Lac", address: "Talstrasse 1, 8001 Zürich", guests: 68, status: "past", desc: "Vater und Sohn über Wahrscheinlichkeiten — im Sport und an den Finanzmärkten.", img: "https://cdn.prod.website-files.com/68d390b6028a7796367f36b3/699dae3f5dc68642ba59b47b_BF105291.jpg", speakers: [{ name: "Daniel Kalt", role: "UBS Chief Economist" }, { name: "Jonas Kalt", role: "Profi-Sportler" }], agenda: [], long: "Daniel und Sohn Jonas über Wahrscheinlichkeiten — im Sport und an den Finanzmärkten. Ein Dialog zwischen zwei Generationen und zwei Welten, die näher beieinander liegen als man denkt." },
];

export const ME_ID = "anna-keller";
export function getMe(): Member {
  return MEMBERS.find((m) => m.id === ME_ID)!;
}
