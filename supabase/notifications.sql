-- Notifications (13/11/2026) : e-mail (Brevo) + notification téléphone (Web Push) pour les clients et les artisans.
alter table profils add column if not exists notif_email boolean not null default true;
alter table profils add column if not exists notif_push boolean not null default true;

create table if not exists push_abonnements (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  appareil text,
  created_at timestamptz default now()
);
alter table push_abonnements enable row level security;
drop policy if exists push_moi on push_abonnements;
create policy push_moi on push_abonnements for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists notifications (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  titre text not null,
  texte text,
  lien text,
  cle text,
  created_at timestamptz default now(),
  traite boolean not null default false,
  email_ok boolean,
  push_ok int,
  erreur text
);
create index if not exists notifications_a_traiter on notifications (id) where not traite;
create index if not exists notifications_cle on notifications (cle, created_at);
alter table notifications enable row level security;
drop policy if exists notifications_moi on notifications;
create policy notifications_moi on notifications for select using (user_id = auth.uid() or est_admin());

insert into secrets_internes values ('vapid_public', 'BBGpqiNgkwQORoVJj48YWx1hrpYJ7APT35_OvpuGbyreJ4BACM8BMN2FliqUWCOuSOVbAUcP7vdkQIVdnYEC5vU') on conflict (cle) do update set valeur = excluded.valeur;
insert into secrets_internes values ('vapid_private', '<clé privée VAPID, non versionnée>') on conflict (cle) do update set valeur = excluded.valeur;
insert into secrets_internes values ('cron_notifier', encode(extensions.gen_random_bytes(24), 'hex')) on conflict (cle) do nothing;

-- Réveille la fonction d'envoi (asynchrone : ne ralentit pas l'action de l'utilisateur)
create or replace function reveiller_notifier() returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post('https://gbwtoleofzvmicdjwdwz.supabase.co/functions/v1/notifier', '{}'::jsonb, '{}'::jsonb,
    jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select valeur from secrets_internes where cle = 'cron_notifier')), 60000);
end $$;

-- Ajoute une notification (p_cle + p_delai : pas de doublon dans ce délai)
create or replace function notifier(p_user uuid, p_type text, p_titre text, p_texte text, p_lien text,
  p_cle text default null, p_delai interval default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  if p_cle is not null and p_delai is not null and exists (
    select 1 from notifications where cle = p_cle and created_at > now() - p_delai) then return; end if;
  insert into notifications (user_id, type, titre, texte, lien, cle) values (p_user, p_type, p_titre, p_texte, p_lien, p_cle);
  perform reveiller_notifier();
end $$;
revoke execute on function notifier(uuid, text, text, text, text, text, interval), reveiller_notifier() from public, anon, authenticated;

create or replace function eur_txt(n numeric) returns text language sql immutable as $$
  select replace(replace(to_char(coalesce(n, 0), 'FM999G999G990D00'), ',', ' '), '.', ',') || ' €'
$$;

-- 1. Nouvelle demande publiée → artisans du secteur et du métier
create or replace function notif_demande() returns trigger language plpgsql security definer set search_path = public as $$
declare a record; t text := coalesce(nullif(new.titre, ''), 'Nouveau projet');
begin
  if new.statut = 'ouverte' and old.statut = 'brouillon' and not new.masquee then
    for a in select id from artisans where statut = 'actif' and new.departement = any(departements) and new.metiers && metiers
               and id <> new.client_id and not coalesce(artisan_epuise(id), false) loop
      perform notifier(a.id, 'demande', '🔔 Nouvelle demande : ' || t,
        coalesce(new.ville, '') || ' (' || new.cp || '). Répondez avant le ' || to_char(new.ferme_le at time zone 'Europe/Paris', 'DD/MM à HH24"h"MI') || '.',
        '/artisan/demande/' || new.id);
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists trg_notif_demande on demandes;
create trigger trg_notif_demande after update of statut on demandes for each row execute function notif_demande();

-- 2. Offres : nouvelle offre, choix, devis définitif, signature, rétractation, renoncement
create or replace function notif_offre() returns trigger language plpgsql security definer set search_path = public as $$
declare d demandes; nom text; t text;
begin
  select * into d from demandes where id = new.demande_id;
  select coalesce(raison_sociale, 'Un artisan') into nom from artisans where id = new.artisan_id;
  t := coalesce(nullif(d.titre, ''), 'votre projet');
  if tg_op = 'INSERT' then
    perform notifier(d.client_id, 'offre', '📩 Nouvelle offre pour « ' || t || ' »',
      nom || ' vous propose un devis de ' || eur_txt(new.total_ttc) || ' TTC. Comparez les offres et choisissez sans engagement.',
      '/client/demande/' || d.id);
  elsif new.statut is distinct from old.statut then
    if new.statut = 'choisie' then
      perform notifier(new.artisan_id, 'choix', '🎉 Un client vous a choisi',
        'Pour « ' || t || ' » (' || coalesce(d.ville, d.cp) || '). Ses coordonnées sont disponibles : contactez-le pour organiser la visite.',
        '/artisan/demande/' || d.id);
    elsif new.statut = 'confirmee' then
      perform notifier(d.client_id, 'devis', '📝 Devis définitif reçu',
        nom || ' vous a envoyé son devis définitif pour « ' || t || ' » : ' || eur_txt(new.total_ttc) || ' TTC. Vous pouvez le signer en ligne.',
        '/client/demande/' || d.id);
    elsif new.statut = 'acceptee' then
      perform notifier(new.artisan_id, 'signe', '✍️ Devis signé !',
        'Le client a signé votre devis pour « ' || t || ' » (' || eur_txt(new.total_ttc) || ' TTC).', '/artisan/demande/' || d.id);
    elsif new.statut = 'retractee' then
      perform notifier(new.artisan_id, 'retractation', '↩️ Rétractation du client',
        'Le client s''est rétracté pour « ' || t || ' ».', '/artisan/demande/' || d.id);
    elsif new.statut = 'refusee' and old.statut in ('choisie', 'confirmee') then
      perform notifier(new.artisan_id, 'renoncement', 'Le client a renoncé',
        'Le client ne donne pas suite pour « ' || t || ' ».' || case when old.statut = 'choisie' then ' Votre crédit client vous a été rendu.' else '' end,
        '/artisan/demande/' || d.id);
    elsif new.statut = 'refusee' and old.statut = 'envoyee' then
      perform notifier(new.artisan_id, 'non_retenue', 'Offre non retenue',
        'Le client a choisi une autre offre pour « ' || t || ' ». Merci pour votre réponse.', '/artisan/offres');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_notif_offre on offres;
create trigger trg_notif_offre after insert or update of statut on offres for each row execute function notif_offre();

-- 3. Messages et visites (pas plus d'une alerte par conversation toutes les 10 minutes pour les messages)
create or replace function notif_message() returns trigger language plpgsql security definer set search_path = public as $$
declare d demandes; dest uuid; lien text; nom text;
begin
  select * into d from demandes where id = new.demande_id;
  if new.auteur = 'client' then dest := new.artisan_id; lien := '/artisan/demande/' || d.id; nom := 'Le client';
  else dest := d.client_id; lien := '/client/demande/' || d.id; select coalesce(raison_sociale, 'L''artisan') into nom from artisans where id = new.artisan_id; end if;
  if tg_op = 'INSERT' then
    if new.kind = 'visite' then
      perform notifier(dest, 'visite', '📅 Proposition de visite',
        nom || ' propose une visite le ' || to_char(new.creneau at time zone 'Europe/Paris', 'DD/MM à HH24"h"MI') || '. Acceptez ou refusez dans l''appli.', lien);
    else
      perform notifier(dest, 'message', '💬 Nouveau message de ' || nom,
        left(coalesce(new.texte, ''), 140), lien, 'msg:' || new.demande_id || ':' || new.artisan_id || ':' || dest, interval '10 minutes');
    end if;
  elsif new.kind = 'visite' and new.visite_statut is distinct from old.visite_statut and new.visite_statut in ('acceptee', 'refusee') then
    -- la réponse va à celui qui a proposé
    if new.auteur = 'client' then dest := d.client_id; lien := '/client/demande/' || d.id;
    else dest := new.artisan_id; lien := '/artisan/demande/' || d.id; end if;
    perform notifier(dest, 'visite', case when new.visite_statut = 'acceptee' then '✅ Visite confirmée' else '❌ Visite refusée' end,
      'Créneau du ' || to_char(new.creneau at time zone 'Europe/Paris', 'DD/MM à HH24"h"MI') ||
      case when new.visite_statut = 'acceptee' then '.' else ' : proposez un autre créneau dans l''appli.' end, lien);
  end if;
  return new;
end $$;
drop trigger if exists trg_notif_message on messages;
create trigger trg_notif_message after insert or update of visite_statut on messages for each row execute function notif_message();

-- 4. Avenants
create or replace function notif_avenant() returns trigger language plpgsql security definer set search_path = public as $$
declare o offres; d demandes;
begin
  select * into o from offres where id = new.offre_id;
  select * into d from demandes where id = o.demande_id;
  if tg_op = 'INSERT' then
    perform notifier(d.client_id, 'avenant', '➕ Avenant à valider',
      'Travaux supplémentaires proposés : ' || coalesce(new.motif, '') || ' (' || eur_txt(new.total_ttc) || ' TTC).', '/client/demande/' || d.id);
  elsif new.statut is distinct from old.statut and new.statut in ('accepte', 'refuse') then
    perform notifier(o.artisan_id, 'avenant', case when new.statut = 'accepte' then '✍️ Avenant signé' else 'Avenant refusé' end,
      coalesce(new.motif, ''), '/artisan/demande/' || d.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_notif_avenant on avenants;
create trigger trg_notif_avenant after insert or update of statut on avenants for each row execute function notif_avenant();

-- 5. Décennale bientôt expirée (30 j, 7 j, jour J) — chaque matin
create or replace function notif_decennales() returns void language plpgsql security definer set search_path = public as $$
declare a record; j int;
begin
  for a in select id, decennale_fin_effective(x) fin from artisans x where decennale_fin_effective(x) is not null loop
    j := a.fin - current_date;
    if j in (30, 7, 0) then
      perform notifier(a.id, 'decennale', '⏰ Votre assurance décennale ' || case when j = 0 then 'expire aujourd''hui' else 'expire dans ' || j || ' jours' end,
        'Envoyez votre nouvelle attestation dans votre profil pour garder le badge « Vérifié ».', '/artisan/profil', 'dec:' || a.id || ':' || j, interval '2 days');
    end if;
  end loop;
end $$;
revoke execute on function notif_decennales() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname in ('notif-decennales', 'notifier-rattrapage');
select cron.schedule('notif-decennales', '0 8 * * *', 'select public.notif_decennales()');
-- Rattrapage : relance l'envoi s'il reste des notifications en attente
select cron.schedule('notifier-rattrapage', '*/10 * * * *', $c$select public.reveiller_notifier() where exists (select 1 from public.notifications where not traite and created_at < now() - interval '2 minutes')$c$);

-- Clé publique pour l'abonnement aux notifications du téléphone
create or replace function cle_push() returns text language sql stable security definer set search_path = public as $$
  select valeur from secrets_internes where cle = 'vapid_public';
$$;
grant execute on function cle_push() to authenticated;

-- La prospection partage le quota Brevo (300/jour) : 50 par jour au démarrage
update reglages set valeur = valeur || '{"par_jour": 50}' where cle = 'prospection';
