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
  { id: "ev-may26-zh", title: "SportNexus Lunch Zürich", subtitle: "Talk mit Roger Federer Foundation", date: "2026-05-12", time: "11:30 – 14:00", city: "Zürich", venue: "Widder Hotel", address: "Rennweg 7, 8001 Zürich", guests: 70, status: "upcoming", featured: true, desc: "Über Philanthropie im Sport — wie aus einer Karriere eine Bewegung wird. Moderation: Andrea Vetsch.", img: "https://cdn.prod.website-files.com/68d390b6028a7796367f36b3/699dac7587d29f125390fc74_NEXUS_ZUERICH_IBIY_36.jpg", speakers: [{ name: "Roger Federer Foundation", role: "Keynote" }, { name: "Andrea Vetsch", role: "Moderation" }], agenda: [{ t: "11:30", l: "Empfang & Apéro" }, { t: "12:15", l: "Talk & Q&A" }, { t: "13:00", l: "Lunch & Networking" }, { t: "14:00", l: "Abschluss" }], long: "Philanthropie als Fortsetzung der sportlichen Karriere. Wie Stiftungsarbeit professionell aufgestellt wird, welche Hebel wirklich zählen, und was Unternehmer davon lernen können — im persönlichen Gespräch mit der Roger Federer Foundation." },
  { id: "ev-jun26-bs", title: "SportNexus Lunch Basel", subtitle: "Andy Egli: Trainer-Leben", date: "2026-06-04", time: "11:30 – 14:00", city: "Basel", venue: "Atlantis Basel", address: "Klosterberg 13, 4051 Basel", guests: 65, status: "upcoming", desc: "Vom Nati-Spieler zum Trainer — was Führung im Fussball mit Führung im Unternehmen zu tun hat.", img: "https://cdn.prod.website-files.com/68d390b6028a7796367f36b3/699da8d8b55537cfb726d358_A7401670.jpg", speakers: [{ name: "Andy Egli", role: "Ex-Nati-Spieler & Trainer" }], agenda: [{ t: "11:30", l: "Empfang" }, { t: "12:15", l: "Talk" }, { t: "13:00", l: "Lunch" }, { t: "14:00", l: "Ende" }], long: "Vom Stammspieler der Nati zur Seitenlinie — Andy Egli über die Psychologie des Gewinnens, den Umgang mit Niederlagen, und warum Führungskräfte im Unternehmen oft die gleichen Themen haben wie Trainer auf dem Platz." },
  { id: "ev-sep26-zg", title: "SportNexus Dinner Zug", subtitle: "Unternehmer-Dinner", date: "2026-09-18", time: "18:30 – 23:00", city: "Zug", venue: "Parkhotel Zug", address: "Industriestrasse 14, 6300 Zug", guests: 40, status: "upcoming", desc: "Exklusives Abend-Format: 40 Unternehmer, ein langer Tisch, vier Gänge.", img: "https://cdn.prod.website-files.com/68d390b6028a7796367f36b3/69b148832365b2d645660b2a_SportNexus-Ma%CC%88rz26-KMEDIA-DSC02089-A.jpg", speakers: [{ name: "Thema", role: "Nachfolge im Familienunternehmen" }], agenda: [{ t: "18:30", l: "Apéro" }, { t: "19:30", l: "Dinner & Gespräche" }, { t: "22:00", l: "Digestif" }], long: "Ein Abend, ein langer Tisch, 40 Unternehmer. Wir öffnen den Raum für echte Gespräche — ohne Agenda-Druck, ohne Bühne. Nur zwei kuratierte Impulse zwischen den Gängen." },
  { id: "ev-nov26-zh", title: "SportNexus Year End Zürich", subtitle: "Jahres-Get-Together", date: "2026-11-26", time: "17:00 – 22:00", city: "Zürich", venue: "Dolder Grand", address: "Kurhausstrasse 65, 8032 Zürich", guests: 120, status: "upcoming", desc: "Das Year-End der Community. Talks, Aperitif, Dinner — und die Vorschau auf 2027.", img: "https://cdn.prod.website-files.com/68d390b6028a7796367f36b3/699dae3f5dc68642ba59b47b_BF105291.jpg", speakers: [{ name: "SportNexus Gründerteam", role: "Jahresrückblick" }, { name: "Gastredner", role: "TBA" }], agenda: [{ t: "17:00", l: "Check-in & Apéro" }, { t: "18:00", l: "Jahresrückblick" }, { t: "18:45", l: "Keynote" }, { t: "19:30", l: "Dinner" }, { t: "22:00", l: "Ausklang" }], long: "Das Year-End-Event bringt die gesamte Community unter einem Dach zusammen. Rückblick auf das Jahr, Ausblick auf 2027, und ein Abend, der in Erinnerung bleibt. Dresscode: Business Smart." },
  { id: "ev-mar26-zh", title: "SportNexus Lunch Zürich", subtitle: "Andy Schmid & Pascal Jenny", date: "2026-03-03", time: "11:30 – 14:00", city: "Zürich", venue: "Restaurant Metropol", address: "Fraumünsterstrasse 12, 8001 Zürich", guests: 70, status: "past", desc: "Pokal, National-Trainer und 70 Teilnehmende. Die zwei Aushängeschilder des Schweizer Handballs im Talk.", img: "https://cdn.prod.website-files.com/68d390b6028a7796367f36b3/69b148832365b2d645660b2a_SportNexus-Ma%CC%88rz26-KMEDIA-DSC02089-A.jpg", speakers: [{ name: "Andy Schmid", role: "Handball-Legende" }, { name: "Pascal Jenny", role: "Nationaltrainer" }], agenda: [], long: "Eine leistungsorientierte Wohlfühloase, grosse Ziele und ein Team auf dem Weg zur Weltspitze. 70 Teilnehmende, Pokal auf dem Tisch." },
  { id: "ev-jan26-zh", title: "SportNexus Lunch Zürich", subtitle: "Daniel & Jonas Kalt", date: "2026-01-22", time: "11:30 – 14:00", city: "Zürich", venue: "Baur au Lac", address: "Talstrasse 1, 8001 Zürich", guests: 68, status: "past", desc: "Vater und Sohn über Wahrscheinlichkeiten — im Sport und an den Finanzmärkten.", img: "https://cdn.prod.website-files.com/68d390b6028a7796367f36b3/699dae3f5dc68642ba59b47b_BF105291.jpg", speakers: [{ name: "Daniel Kalt", role: "UBS Chief Economist" }, { name: "Jonas Kalt", role: "Profi-Sportler" }], agenda: [], long: "Daniel und Sohn Jonas über Wahrscheinlichkeiten — im Sport und an den Finanzmärkten. Ein Dialog zwischen zwei Generationen und zwei Welten, die näher beieinander liegen als man denkt." },
];

export const ME_ID = "anna-keller";
export function getMe(): Member {
  return MEMBERS.find((m) => m.id === ME_ID)!;
}
