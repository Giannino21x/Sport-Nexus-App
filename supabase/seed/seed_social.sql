-- Seed sample messages, notifications, posts — addressed to Anna Keller

-- Helpers: lookup member IDs by slug
do $$
declare
  anna uuid := (select id from public.members where slug = 'anna-keller');
  marco uuid := (select id from public.members where slug = 'marco-fischer');
  sophie uuid := (select id from public.members where slug = 'sophie-meier');
  julia uuid := (select id from public.members where slug = 'julia-brunner');
  pascal uuid := (select id from public.members where slug = 'pascal-zingg');
  tim uuid := (select id from public.members where slug = 'tim-rothen');
  reto uuid := (select id from public.members where slug = 'reto-oberli');
  nina uuid := (select id from public.members where slug = 'nina-schmid');
  patricia uuid := (select id from public.members where slug = 'patricia-wyss');
begin
  -- Messages (conversations with Anna)
  insert into public.messages (sender_id, recipient_id, body, created_at) values
    (marco, anna, 'Hi Anna! Danke für den Kontakt letzte Woche beim Lunch — war ein spannender Talk.', now() - interval '1 day 2 hours'),
    (anna, marco, 'Absolut, Andy Schmid hat was ausgelöst. Ich dachte an deine Suche nach Co-Investoren — wir sollten uns austauschen.', now() - interval '1 day 1 hour'),
    (marco, anna, 'Sehr gerne. Hast du Zeit nächste Woche für einen kurzen Call?', now() - interval '6 hours'),
    (anna, marco, 'Dienstag 10:00 oder Mittwoch 16:00?', now() - interval '5 hours'),
    (marco, anna, 'Perfekt, dann sehen wir uns beim Lunch in Zürich!', now() - interval '2 hours'),
    (sophie, anna, 'Hast du Zeit nächste Woche für einen kurzen Austausch?', now() - interval '1 day'),
    (julia, anna, 'Danke für die Vorstellung — Termin ist gebucht.', now() - interval '3 days'),
    (pascal, anna, 'Spannend! Ich schicke dir das Deck.', now() - interval '5 days'),
    (tim, anna, 'Gerne, ich melde mich Anfang nächster Woche.', now() - interval '7 days');

  -- Notifications for Anna
  insert into public.notifications (member_id, kind, title, preview, unread, created_at) values
    (anna, 'users', 'Marco Fischer hat dein Profil angesehen', '', true, now() - interval '12 minutes'),
    (anna, 'message', 'Neue Nachricht von Sophie Meier', 'Hast du Zeit nächste Woche?', true, now() - interval '2 hours'),
    (anna, 'calendar', 'Erinnerung: SportNexus Lunch Zürich', 'In 3 Tagen · Widder Hotel', true, now() - interval '6 hours'),
    (anna, 'sparkle', '3 neue Matchmaking-Vorschläge', '', false, now() - interval '1 day'),
    (anna, 'trophy', 'Joël Aebi ist der Community beigetreten', '', false, now() - interval '2 days');

  -- Posts (Community Feed)
  insert into public.posts (author_id, body, kind, tag, meta, likes, replies, created_at) values
    (marco, 'Wir haben heute unseren neuen Wachstumsfonds geclosed — 120 Mio. für Schweizer KMU. Freue mich auf die ersten Deals.', 'deal', '', 'Helvetia Partners · Fonds III', 11, 2, now() - interval '3 hours'),
    (patricia, 'Suche Series-A Lead-Investor für AI-Drug-Discovery. Ticket 5–10 Mio. Happy to connect — insbesondere mit Life-Science-Fokus.', 'search', 'Suche', '', 18, 3, now() - interval '1 day'),
    (reto, 'Neue Podcast-Folge live: Alex Frei im Talk über Führung, Käse und Basel. Hört''s euch an.', 'share', 'Podcast', '', 8, 4, now() - interval '2 days'),
    (nina, 'War ein fantastischer Lunch in Zürich — Danke an alle 70 Gäste! Nächstes Treffen: 12. Mai im Widder Hotel.', 'event', 'Event', '', 24, 5, now() - interval '3 days');

  -- Event registrations for Anna on upcoming events
  insert into public.event_registrations (event_id, member_id) values
    ('ev-may26-zh', anna),
    ('ev-jun26-bs', anna);
end $$;
