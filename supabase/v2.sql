-- =====================================================================
-- Rénovio v2 — à exécuter APRÈS mise-en-relation.sql
-- Signature en deux temps, messagerie + visite, avenants, abonnements artisans.
-- Compatible avec la v1 (les anciennes fonctions restent en place).
-- Aucun règlement client → artisan ne passe par l'appli.
-- =====================================================================

-- ---------- Nouveaux statuts ----------
-- offre : envoyee → choisie (client a choisi, sans engagement) → confirmee (devis définitif après visite) → acceptee (signé)
alter table offres drop constraint if exists offres_statut_check;
alter table offres add constraint offres_statut_check
  check (statut in ('envoyee', 'choisie', 'confirmee', 'acceptee', 'refusee', 'retiree', 'retractee'));
alter table offres add column if not exists lignes_initiales jsonb;
alter table offres add column if not exists total_ttc_initial numeric(12,2);
alter table offres add column if not exists choisie_le timestamptz;
alter table offres add column if not exists confirmee_le timestamptz;
alter table offres add column if not exists retractee_le timestamptz;

-- demande : en_cours = un artisan est choisi, visite / devis définitif en attente
alter table demandes drop constraint if exists demandes_statut_check;
alter table demandes add constraint demandes_statut_check
  check (statut in ('brouillon', 'ouverte', 'fermee', 'en_cours', 'attribuee', 'annulee'));

-- L'artisan choisi reçoit les coordonnées dès le choix (pour la visite)
create or replace function demandes_attribuees_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select demande_id from offres where artisan_id = auth.uid() and statut in ('choisie', 'confirmee', 'acceptee');
$$;

-- ---------- Abonnements artisans ----------
alter table artisans add column if not exists abonnement text not null default 'gratuit';
alter table artisans drop constraint if exists artisans_abonnement_check;
alter table artisans add constraint artisans_abonnement_check check (abonnement in ('gratuit', 'essentiel', 'pro', 'illimite'));
alter table artisans add column if not exists abonnement_fin timestamptz;
alter table artisans add column if not exists stripe_customer_id text;
alter table artisans add column if not exists stripe_subscription_id text;

-- L'artisan ne peut changer ni sa vérification, ni son statut, ni son abonnement
create or replace function protege_artisan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not est_admin() and coalesce(current_setting('request.jwt.claims', true)::json->>'role', '') <> 'service_role' then
    if tg_op = 'INSERT' then
      new.verifie := false; new.statut := 'actif'; new.abonnement := 'gratuit'; new.abonnement_fin := null;
      new.stripe_customer_id := null; new.stripe_subscription_id := null;
    else
      new.verifie := old.verifie; new.statut := old.statut; new.abonnement := old.abonnement; new.abonnement_fin := old.abonnement_fin;
      new.stripe_customer_id := old.stripe_customer_id; new.stripe_subscription_id := old.stripe_subscription_id;
    end if;
  end if;
  return new;
end $$;

-- Offres par mois selon la formule (null = illimité)
create or replace function quota_offres(p text) returns int language sql immutable as $$
  select case p when 'gratuit' then 3 when 'essentiel' then 10 when 'pro' then 30 else null end;
$$;

create or replace function mon_quota() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'abonnement', a.abonnement, 'fin', a.abonnement_fin,
    'quota', quota_offres(a.abonnement),
    'utilise', (select count(*) from offres o where o.artisan_id = a.id and o.created_at >= date_trunc('month', now()))
  ) from artisans a where a.id = auth.uid();
$$;

-- Totaux d'un devis (calculés côté serveur)
create or replace function totaux_devis(p_lignes jsonb, p_franchise boolean, out ht numeric, out tva numeric)
language sql immutable as $$
  select coalesce(sum(s.base), 0), coalesce(sum(round(s.base * s.taux / 100, 2)), 0) from (
    select case when p_franchise then 0 else coalesce((l->>'vat_rate')::numeric, 0) end as taux,
           sum(round(coalesce((l->>'qty')::numeric, 0) * coalesce((l->>'unit_price')::numeric, 0), 2)) as base
    from jsonb_array_elements(p_lignes) l where coalesce(l->>'kind', '') <> 'section' group by 1
  ) s;
$$;

-- Envoi d'offre v2 : vérifie le quota de la formule puis utilise la fonction v1
create or replace function envoyer_offre_v2(p_demande uuid, p_lignes jsonb, p_delai int, p_duree int, p_message text, p_validite int default 30)
returns offres
language plpgsql security definer set search_path = public as $$
declare a artisans; q int; n int;
begin
  select * into a from artisans where id = auth.uid();
  if found and not exists (select 1 from offres where demande_id = p_demande and artisan_id = a.id) then
    q := quota_offres(case when a.abonnement <> 'gratuit' and (a.abonnement_fin is null or a.abonnement_fin > now()) then a.abonnement else 'gratuit' end);
    select count(*) into n from offres where artisan_id = a.id and created_at >= date_trunc('month', now());
    if q is not null and n >= q then
      raise exception 'Limite de % offres ce mois-ci atteinte. Passez à une formule supérieure dans « Abonnement ».', q;
    end if;
  end if;
  return envoyer_offre(p_demande, p_lignes, p_delai, p_duree, p_message, p_validite);
end $$;

-- ---------- Signature en deux temps ----------
-- 1. Le client choisit un artisan, sans engagement
create or replace function choisir_offre(p_offre uuid) returns offres
language plpgsql security definer set search_path = public as $$
declare o offres; d demandes;
begin
  select * into o from offres where id = p_offre for update;
  if not found then raise exception 'Offre introuvable'; end if;
  select * into d from demandes where id = o.demande_id for update;
  if d.client_id <> auth.uid() then raise exception 'Accès refusé'; end if;
  if d.statut not in ('ouverte', 'fermee') then raise exception 'Vous avez déjà choisi un artisan pour cette demande'; end if;
  if o.statut <> 'envoyee' then raise exception 'Cette offre n''est plus disponible'; end if;
  if o.updated_at + make_interval(days => coalesce(o.validite_jours, 30)) < now() then raise exception 'Cette offre a expiré'; end if;
  update offres set statut = 'choisie', choisie_le = now(), updated_at = now() where id = p_offre returning * into o;
  update demandes set statut = 'en_cours' where id = d.id;
  return o;
end $$;

-- Remettre la demande en jeu (client qui renonce, ou artisan qui se retire après visite)
create or replace function remettre_en_jeu(p_demande uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d demandes; n int;
begin
  select * into d from demandes where id = p_demande;
  select count(*) into n from offres where demande_id = p_demande and statut not in ('retiree');
  update demandes set statut = case when d.ferme_le > now() and n < 5 then 'ouverte' else 'fermee' end where id = p_demande;
end $$;
revoke execute on function remettre_en_jeu(uuid) from public, anon, authenticated;

-- Le client renonce à l'artisan choisi (ex : devis définitif trop cher) et peut en choisir un autre
create or replace function renoncer_choix(p_offre uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o offres; d demandes;
begin
  select * into o from offres where id = p_offre for update;
  select * into d from demandes where id = o.demande_id;
  if d.client_id <> auth.uid() then raise exception 'Accès refusé'; end if;
  if o.statut not in ('choisie', 'confirmee') then raise exception 'Rien à annuler'; end if;
  update offres set statut = 'refusee', updated_at = now() where id = p_offre;
  perform remettre_en_jeu(d.id);
end $$;

-- L'artisan retire son offre (avant le choix, ou après la visite s'il ne peut pas faire le chantier)
create or replace function retirer_offre(p_offre uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o offres;
begin
  select * into o from offres where id = p_offre and artisan_id = auth.uid() for update;
  if not found or o.statut not in ('envoyee', 'choisie', 'confirmee') then raise exception 'Impossible de retirer cette offre'; end if;
  update offres set statut = 'retiree', updated_at = now() where id = p_offre;
  if o.statut in ('choisie', 'confirmee') then perform remettre_en_jeu(o.demande_id); end if;
end $$;

-- 2. Après la visite, l'artisan confirme ou ajuste son devis (le devis provisoire est conservé pour comparaison)
create or replace function confirmer_devis(p_offre uuid, p_lignes jsonb, p_delai int, p_duree int, p_message text) returns offres
language plpgsql security definer set search_path = public as $$
declare o offres; a artisans; t record;
begin
  select * into o from offres where id = p_offre and artisan_id = auth.uid() for update;
  if not found then raise exception 'Offre introuvable'; end if;
  if o.statut not in ('choisie', 'confirmee') then raise exception 'Le client ne vous a pas (ou plus) choisi pour cette demande'; end if;
  if jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then raise exception 'Le devis est vide'; end if;
  select * into a from artisans where id = o.artisan_id;
  select * into t from totaux_devis(p_lignes, a.tva_franchise);
  if t.ht <= 0 then raise exception 'Le montant du devis doit être supérieur à 0'; end if;
  update offres set
    lignes_initiales = coalesce(lignes_initiales, lignes), total_ttc_initial = coalesce(total_ttc_initial, total_ttc),
    lignes = p_lignes, total_ht = t.ht, total_tva = t.tva, total_ttc = t.ht + t.tva,
    delai_jours = p_delai, duree_jours = p_duree, message = coalesce(p_message, message),
    statut = 'confirmee', confirmee_le = now(), updated_at = now()
    where id = p_offre returning * into o;
  return o;
end $$;

-- 3. Le client signe le devis définitif
create or replace function accepter_devis(p_offre uuid, p_nom text, p_signature text) returns offres
language plpgsql security definer set search_path = public as $$
declare o offres; d demandes;
begin
  select * into o from offres where id = p_offre for update;
  if not found then raise exception 'Offre introuvable'; end if;
  select * into d from demandes where id = o.demande_id for update;
  if d.client_id <> auth.uid() then raise exception 'Accès refusé'; end if;
  if o.statut <> 'confirmee' then raise exception 'L''artisan n''a pas encore envoyé son devis définitif'; end if;
  if coalesce(trim(p_nom), '') = '' or coalesce(p_signature, '') = '' then raise exception 'Nom et signature obligatoires'; end if;
  update offres set statut = 'acceptee', signe_le = now(), signataire = trim(p_nom), signature = p_signature, updated_at = now()
    where id = p_offre returning * into o;
  update offres set statut = 'refusee', updated_at = now() where demande_id = d.id and id <> p_offre and statut = 'envoyee';
  update demandes set statut = 'attribuee' where id = d.id;
  return o;
end $$;

-- Rétractation du client : 14 jours après la signature (contrat conclu à distance)
create or replace function retracter_devis(p_offre uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o offres; d demandes;
begin
  select * into o from offres where id = p_offre for update;
  select * into d from demandes where id = o.demande_id;
  if d.client_id <> auth.uid() then raise exception 'Accès refusé'; end if;
  if o.statut <> 'acceptee' then raise exception 'Ce devis n''est pas signé'; end if;
  if o.signe_le < now() - interval '14 days' then raise exception 'Le délai de rétractation de 14 jours est dépassé'; end if;
  update offres set statut = 'retractee', retractee_le = now(), updated_at = now() where id = p_offre;
  update demandes set statut = 'annulee' where id = d.id;
  update avenants set statut = 'retire' where offre_id = p_offre and statut = 'propose';
end $$;

-- Écart moyen entre devis provisoires et définitifs, par artisan (pour le score)
create or replace function ecarts_artisans(p_ids uuid[]) returns table (artisan_id uuid, ecart numeric, nb int)
language sql stable security definer set search_path = public as $$
  select o.artisan_id, round(avg(o.total_ttc / o.total_ttc_initial - 1) * 100, 1), count(*)::int
  from offres o
  where o.artisan_id = any(p_ids) and o.total_ttc_initial > 0 and o.statut in ('confirmee', 'acceptee', 'retractee')
  group by o.artisan_id;
$$;

-- ---------- Messagerie et visites ----------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null references demandes(id) on delete cascade,
  artisan_id uuid not null references artisans(id) on delete cascade,
  created_at timestamptz default now(),
  auteur text not null check (auteur in ('client', 'artisan')),
  texte text,
  kind text not null default 'texte' check (kind in ('texte', 'visite')),
  creneau timestamptz,
  visite_statut text check (visite_statut in ('proposee', 'acceptee', 'refusee')),
  lu boolean default false
);
create index if not exists messages_conv_idx on messages(demande_id, artisan_id, created_at);
alter table messages enable row level security;
drop policy if exists messages_r on messages;
create policy messages_r on messages for select using (
  artisan_id = auth.uid() or demande_id in (select mes_demandes_ids()) or est_admin()
);

-- Écrire un message (ou proposer un créneau de visite) : client ↔ artisan ayant une offre active sur la demande
create or replace function envoyer_message(p_demande uuid, p_artisan uuid, p_texte text, p_creneau timestamptz default null)
returns messages
language plpgsql security definer set search_path = public as $$
declare d demandes; o offres; m messages; qui text;
begin
  select * into d from demandes where id = p_demande;
  if not found then raise exception 'Demande introuvable'; end if;
  if d.client_id = auth.uid() then qui := 'client';
  elsif p_artisan = auth.uid() then qui := 'artisan';
  else raise exception 'Accès refusé'; end if;
  select * into o from offres where demande_id = p_demande and artisan_id = p_artisan;
  if not found or o.statut in ('retiree', 'refusee') then raise exception 'Conversation fermée'; end if;
  if p_creneau is null and coalesce(trim(p_texte), '') = '' then raise exception 'Message vide'; end if;
  if p_creneau is not null and p_creneau < now() then raise exception 'Choisissez un créneau dans le futur'; end if;
  insert into messages (demande_id, artisan_id, auteur, texte, kind, creneau, visite_statut)
    values (p_demande, p_artisan, qui, nullif(trim(p_texte), ''),
            case when p_creneau is null then 'texte' else 'visite' end, p_creneau,
            case when p_creneau is null then null else 'proposee' end)
    returning * into m;
  return m;
end $$;

-- Accepter ou refuser un créneau proposé par l'autre
create or replace function repondre_visite(p_message uuid, p_accepte boolean) returns void
language plpgsql security definer set search_path = public as $$
declare m messages; d demandes; moi text;
begin
  select * into m from messages where id = p_message for update;
  if not found or m.kind <> 'visite' or m.visite_statut <> 'proposee' then raise exception 'Créneau introuvable ou déjà traité'; end if;
  select * into d from demandes where id = m.demande_id;
  moi := case when d.client_id = auth.uid() then 'client' when m.artisan_id = auth.uid() then 'artisan' end;
  if moi is null or moi = m.auteur then raise exception 'C''est à l''autre personne de répondre'; end if;
  update messages set visite_statut = case when p_accepte then 'acceptee' else 'refusee' end where id = p_message;
end $$;

-- Marquer comme lus les messages reçus d'une conversation
create or replace function marquer_lus(p_demande uuid, p_artisan uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d demandes;
begin
  select * into d from demandes where id = p_demande;
  if d.client_id = auth.uid() then
    update messages set lu = true where demande_id = p_demande and artisan_id = p_artisan and auteur = 'artisan' and not lu;
  elsif p_artisan = auth.uid() then
    update messages set lu = true where demande_id = p_demande and artisan_id = p_artisan and auteur = 'client' and not lu;
  end if;
end $$;

-- ---------- Avenants (travaux imprévus pendant le chantier) ----------
create table if not exists avenants (
  id uuid primary key default gen_random_uuid(),
  offre_id uuid not null references offres(id) on delete cascade,
  created_at timestamptz default now(),
  numero text,
  motif text not null,
  lignes jsonb not null default '[]',
  total_ht numeric(12,2) default 0,
  total_tva numeric(12,2) default 0,
  total_ttc numeric(12,2) default 0,
  statut text not null default 'propose' check (statut in ('propose', 'accepte', 'refuse', 'retire')),
  signe_le timestamptz,
  signataire text,
  signature text
);
alter table avenants enable row level security;
drop policy if exists avenants_r on avenants;
create policy avenants_r on avenants for select using (
  offre_id in (select id from offres where artisan_id = auth.uid())
  or offre_id in (select id from offres where demande_id in (select mes_demandes_ids()))
  or est_admin()
);

create or replace function proposer_avenant(p_offre uuid, p_motif text, p_lignes jsonb) returns avenants
language plpgsql security definer set search_path = public as $$
declare o offres; a artisans; t record; av avenants; n int;
begin
  select * into o from offres where id = p_offre and artisan_id = auth.uid();
  if not found then raise exception 'Offre introuvable'; end if;
  if o.statut <> 'acceptee' then raise exception 'Un avenant ne peut porter que sur un devis signé'; end if;
  if coalesce(trim(p_motif), '') = '' then raise exception 'Expliquez au client pourquoi ces travaux sont nécessaires'; end if;
  if jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then raise exception 'L''avenant est vide'; end if;
  select * into a from artisans where id = o.artisan_id;
  select * into t from totaux_devis(p_lignes, a.tva_franchise);
  select count(*) into n from avenants where offre_id = p_offre;
  insert into avenants (offre_id, numero, motif, lignes, total_ht, total_tva, total_ttc)
    values (p_offre, o.numero || '-A' || (n + 1), trim(p_motif), p_lignes, t.ht, t.tva, t.ht + t.tva)
    returning * into av;
  return av;
end $$;

create or replace function repondre_avenant(p_avenant uuid, p_accepte boolean, p_nom text default null, p_signature text default null) returns void
language plpgsql security definer set search_path = public as $$
declare av avenants; o offres; d demandes;
begin
  select * into av from avenants where id = p_avenant for update;
  if not found or av.statut <> 'propose' then raise exception 'Avenant introuvable ou déjà traité'; end if;
  select * into o from offres where id = av.offre_id;
  select * into d from demandes where id = o.demande_id;
  if d.client_id <> auth.uid() then raise exception 'Accès refusé'; end if;
  if p_accepte then
    if coalesce(trim(p_nom), '') = '' or coalesce(p_signature, '') = '' then raise exception 'Nom et signature obligatoires'; end if;
    update avenants set statut = 'accepte', signe_le = now(), signataire = trim(p_nom), signature = p_signature where id = p_avenant;
  else
    update avenants set statut = 'refuse' where id = p_avenant;
  end if;
end $$;

create or replace function retirer_avenant(p_avenant uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update avenants set statut = 'retire'
    where id = p_avenant and statut = 'propose' and offre_id in (select id from offres where artisan_id = auth.uid());
  if not found then raise exception 'Impossible de retirer cet avenant'; end if;
end $$;

-- ---------- Droits ----------
revoke execute on function quota_offres(text), mon_quota(), totaux_devis(jsonb, boolean), envoyer_offre_v2(uuid, jsonb, int, int, text, int),
  choisir_offre(uuid), renoncer_choix(uuid), confirmer_devis(uuid, jsonb, int, int, text), accepter_devis(uuid, text, text),
  retracter_devis(uuid), ecarts_artisans(uuid[]), envoyer_message(uuid, uuid, text, timestamptz), repondre_visite(uuid, boolean),
  marquer_lus(uuid, uuid), proposer_avenant(uuid, text, jsonb), repondre_avenant(uuid, boolean, text, text), retirer_avenant(uuid),
  retirer_offre(uuid) from public, anon;
grant execute on function quota_offres(text), mon_quota(), totaux_devis(jsonb, boolean), envoyer_offre_v2(uuid, jsonb, int, int, text, int),
  choisir_offre(uuid), renoncer_choix(uuid), confirmer_devis(uuid, jsonb, int, int, text), accepter_devis(uuid, text, text),
  retracter_devis(uuid), ecarts_artisans(uuid[]), envoyer_message(uuid, uuid, text, timestamptz), repondre_visite(uuid, boolean),
  marquer_lus(uuid, uuid), proposer_avenant(uuid, text, jsonb), repondre_avenant(uuid, boolean, text, text), retirer_avenant(uuid),
  retirer_offre(uuid) to authenticated;
revoke execute on function protege_artisan() from public, anon, authenticated;

-- ---------- Formule offerte pour une durée + offres bonus (ajout du 10/11/2026) ----------
alter table artisans add column if not exists bonus_offres int not null default 0;

-- Formule réellement active (une formule offerte ou payée dont la date est passée = Découverte)
create or replace function formule_active(a artisans) returns text language sql stable as $$
  select case when a.abonnement <> 'gratuit' and (a.abonnement_fin is null or a.abonnement_fin > now()) then a.abonnement else 'gratuit' end;
$$;

-- Protège uniquement les requêtes des utilisateurs de l'appli (pas l'admin, pas Stripe, pas l'éditeur SQL)
create or replace function protege_artisan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('request.jwt.claims', true)::json->>'role', '') in ('authenticated', 'anon')
     and not est_admin() and coalesce(current_setting('renovio.systeme', true), '') <> '1' then
    if tg_op = 'INSERT' then
      new.verifie := false; new.statut := 'actif'; new.abonnement := 'gratuit'; new.abonnement_fin := null;
      new.stripe_customer_id := null; new.stripe_subscription_id := null; new.bonus_offres := 0;
    else
      new.verifie := old.verifie; new.statut := old.statut; new.abonnement := old.abonnement; new.abonnement_fin := old.abonnement_fin;
      new.stripe_customer_id := old.stripe_customer_id; new.stripe_subscription_id := old.stripe_subscription_id;
      new.bonus_offres := old.bonus_offres;
    end if;
  end if;
  return new;
end $$;

create or replace function mon_quota() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'abonnement', formule_active(a), 'fin', case when formule_active(a) <> 'gratuit' then a.abonnement_fin end,
    'quota', quota_offres(formule_active(a)), 'bonus', a.bonus_offres,
    'utilise', (select count(*) from offres o where o.artisan_id = a.id and o.created_at >= date_trunc('month', now()))
  ) from artisans a where a.id = auth.uid();
$$;

-- Les offres bonus servent une fois la limite du mois atteinte
create or replace function envoyer_offre_v2(p_demande uuid, p_lignes jsonb, p_delai int, p_duree int, p_message text, p_validite int default 30)
returns offres
language plpgsql security definer set search_path = public as $$
declare a artisans; q int; n int;
begin
  select * into a from artisans where id = auth.uid();
  if found and not exists (select 1 from offres where demande_id = p_demande and artisan_id = a.id) then
    q := quota_offres(formule_active(a));
    select count(*) into n from offres where artisan_id = a.id and created_at >= date_trunc('month', now());
    if q is not null and n >= q then
      if a.bonus_offres > 0 then
        perform set_config('renovio.systeme', '1', true);
        update artisans set bonus_offres = bonus_offres - 1 where id = a.id;
        perform set_config('renovio.systeme', '', true);
      else
        raise exception 'Limite de % offres ce mois-ci atteinte. Passez à une formule supérieure dans « Abonnement ».', q;
      end if;
    end if;
  end if;
  return envoyer_offre(p_demande, p_lignes, p_delai, p_duree, p_message, p_validite);
end $$;
revoke execute on function formule_active(artisans) from public, anon;
grant execute on function formule_active(artisans) to authenticated;

-- ---------- Suppression de compte, export des données, attestations (ajout du 10/11/2026) ----------
alter table artisans add column if not exists decennale_doc text;

create or replace function supprimer_mon_compte_mer() returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); p profils; a artisans;
begin
  if uid is null then raise exception 'Non connecté'; end if;
  select * into p from profils where id = uid;
  if not found then raise exception 'Profil introuvable'; end if;
  if p.role = 'admin' then raise exception 'Le compte administrateur ne peut pas être supprimé depuis l''appli'; end if;
  if exists (select 1 from demandes where client_id = uid and statut = 'en_cours') then
    raise exception 'Vous avez choisi un artisan pour une demande en cours : renoncez à ce choix ou signez avant de supprimer votre compte.';
  end if;
  select * into a from artisans where id = uid;
  if found then
    if exists (select 1 from offres where artisan_id = uid and statut in ('choisie', 'confirmee')) then
      raise exception 'Un client vous a choisi et attend votre devis définitif : retirez-vous de ce chantier avant de supprimer votre compte.';
    end if;
    if a.stripe_subscription_id is not null and formule_active(a) <> 'gratuit' and coalesce(current_setting('renovio.stripe_annule', true), '') <> '1' then
      raise exception 'Résiliez d''abord votre abonnement (page Abonnement).';
    end if;
  end if;
  delete from auth.users where id = uid;
end $$;
revoke execute on function supprimer_mon_compte_mer() from public, anon;
grant execute on function supprimer_mon_compte_mer() to authenticated;

create or replace function mes_donnees() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'profil', (select row_to_json(p) from profils p where p.id = auth.uid()),
    'entreprise', (select to_jsonb(a) - 'stripe_customer_id' - 'stripe_subscription_id' from artisans a where a.id = auth.uid()),
    'tarifs', (select coalesce(json_agg(t), '[]') from tarifs t where t.artisan_id = auth.uid()),
    'demandes', (select coalesce(json_agg(d), '[]') from demandes d where d.client_id = auth.uid()),
    'coordonnees_demandes', (select coalesce(json_agg(c), '[]') from demande_contacts c where c.demande_id in (select id from demandes where client_id = auth.uid())),
    'offres', (select coalesce(json_agg(o), '[]') from offres o where o.artisan_id = auth.uid() or o.demande_id in (select id from demandes where client_id = auth.uid())),
    'messages', (select coalesce(json_agg(m), '[]') from messages m where m.artisan_id = auth.uid() or m.demande_id in (select id from demandes where client_id = auth.uid())),
    'avis', (select coalesce(json_agg(v), '[]') from avis v where v.client_id = auth.uid() or v.artisan_id = auth.uid()),
    'exporte_le', now()
  );
$$;
revoke execute on function mes_donnees() from public, anon;
grant execute on function mes_donnees() to authenticated;

insert into storage.buckets (id, name, public) values ('attestations', 'attestations', false) on conflict (id) do nothing;
drop policy if exists attestations_i on storage.objects;
create policy attestations_i on storage.objects for insert to authenticated
  with check (bucket_id = 'attestations' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists attestations_u on storage.objects;
create policy attestations_u on storage.objects for update to authenticated
  using (bucket_id = 'attestations' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists attestations_r on storage.objects;
create policy attestations_r on storage.objects for select to authenticated
  using (bucket_id = 'attestations' and ((storage.foldername(name))[1] = auth.uid()::text or est_admin()));
drop policy if exists attestations_d on storage.objects;
create policy attestations_d on storage.objects for delete to authenticated
  using (bucket_id = 'attestations' and (storage.foldername(name))[1] = auth.uid()::text);

alter table artisans add column if not exists abonnement_resilie boolean not null default false;
create or replace function mon_quota() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'abonnement', formule_active(a), 'fin', case when formule_active(a) <> 'gratuit' then a.abonnement_fin end,
    'quota', quota_offres(formule_active(a)), 'bonus', a.bonus_offres, 'resilie', a.abonnement_resilie,
    'stripe', a.stripe_subscription_id is not null,
    'utilise', (select count(*) from offres o where o.artisan_id = a.id and o.created_at >= date_trunc('month', now()))
  ) from artisans a where a.id = auth.uid();
$$;

-- ---------- Parrainage entre artisans (ajout du 10/11/2026) ----------
-- Filleul : 3 offres bonus à l'inscription. Parrain : 5 offres bonus à la 1re offre envoyée par le filleul.


alter table artisans add column if not exists code_parrain text unique;
alter table artisans add column if not exists parrain_id uuid references artisans(id) on delete set null;
alter table artisans add column if not exists parrainage_recompense boolean not null default false;

create or replace function nouveau_code_parrain() returns text language plpgsql set search_path = public, extensions as $$
declare c text;
begin
  loop
    c := upper(translate(substr(encode(gen_random_bytes(6), 'base64'), 1, 6), '+/=0O1IL', 'XYZ2Q3JK'));
    exit when not exists (select 1 from artisans where code_parrain = c);
  end loop;
  return c;
end $$;
create or replace function artisan_code_parrain() returns trigger language plpgsql as $$
begin
  if new.code_parrain is null then new.code_parrain := nouveau_code_parrain(); end if;
  return new;
end $$;
drop trigger if exists trg_code_parrain on artisans;
create trigger trg_code_parrain before insert on artisans for each row execute function artisan_code_parrain();
update artisans set code_parrain = nouveau_code_parrain() where code_parrain is null;

create or replace function nom_parrain(p_code text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(raison_sociale), ''), 'un artisan Rénovio') from artisans where code_parrain = upper(trim(p_code)) and statut = 'actif';
$$;
grant execute on function nom_parrain(text) to anon, authenticated;

create or replace function mes_filleuls() returns table (raison_sociale text, inscrit_le timestamptz, recompense boolean)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(a.raison_sociale), ''), 'Artisan'), a.created_at, a.parrainage_recompense
  from artisans a where a.parrain_id = auth.uid() order by a.created_at desc;
$$;
revoke execute on function mes_filleuls() from public, anon;
grant execute on function mes_filleuls() to authenticated;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare cid uuid; inv invitations%rowtype; t text[]; r text; par uuid;
begin
  if new.raw_user_meta_data->>'app' = 'mer' then
    r := case when new.raw_user_meta_data->>'role' = 'artisan' then 'artisan' else 'client' end;
    insert into profils (id, role, nom, telephone, email)
      values (new.id, r, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone', new.email)
      on conflict (id) do nothing;
    if r = 'artisan' then
      select coalesce(array_agg(x), '{}') into t
        from jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'trades', '[]'::jsonb)) x;
      select id into par from artisans where code_parrain = upper(trim(coalesce(new.raw_user_meta_data->>'parrain', ''))) and statut = 'actif';
      insert into artisans (id, raison_sociale, email, telephone, metiers, parrain_id, bonus_offres)
        values (new.id, new.raw_user_meta_data->>'company_name', new.email, new.raw_user_meta_data->>'phone', t,
                par, case when par is not null then 3 else 0 end)
        on conflict (id) do nothing;
    end if;
    return new;
  end if;
  if new.raw_user_meta_data ? 'invite_token' then
    select * into inv from invitations
      where token = (new.raw_user_meta_data->>'invite_token')::uuid and accepted_at is null
        and lower(email) = lower(new.email);
    if found then
      insert into members (user_id, company_id, role, full_name, email)
        values (new.id, inv.company_id, inv.role, coalesce(new.raw_user_meta_data->>'full_name', inv.full_name), new.email);
      update invitations set accepted_at = now() where id = inv.id;
      return new;
    end if;
  end if;
  select coalesce(array_agg(x), '{}') into t
    from jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'trades', '[]'::jsonb)) x;
  insert into companies (name, email, trades)
    values (coalesce(new.raw_user_meta_data->>'company_name', 'Mon entreprise'), new.email, t)
    returning id into cid;
  insert into members (user_id, company_id, role, full_name, email)
    values (new.id, cid, 'owner', new.raw_user_meta_data->>'full_name', new.email);
  perform seed_catalog(cid);
  return new;
end $$;

create or replace function envoyer_offre_v2(p_demande uuid, p_lignes jsonb, p_delai int, p_duree int, p_message text, p_validite int default 30)
returns offres
language plpgsql security definer set search_path = public as $$
declare a artisans; q int; n int; o offres;
begin
  select * into a from artisans where id = auth.uid();
  if found and not exists (select 1 from offres where demande_id = p_demande and artisan_id = a.id) then
    q := quota_offres(formule_active(a));
    select count(*) into n from offres where artisan_id = a.id and created_at >= date_trunc('month', now());
    if q is not null and n >= q then
      if a.bonus_offres > 0 then
        perform set_config('renovio.systeme', '1', true);
        update artisans set bonus_offres = bonus_offres - 1 where id = a.id;
        perform set_config('renovio.systeme', '', true);
      else
        raise exception 'Limite de % offres ce mois-ci atteinte. Passez à une formule supérieure dans « Abonnement ».', q;
      end if;
    end if;
  end if;
  o := envoyer_offre(p_demande, p_lignes, p_delai, p_duree, p_message, p_validite);
  if a.parrain_id is not null and not a.parrainage_recompense then
    perform set_config('renovio.systeme', '1', true);
    update artisans set bonus_offres = bonus_offres + 5 where id = a.parrain_id;
    update artisans set parrainage_recompense = true where id = a.id;
    perform set_config('renovio.systeme', '', true);
  end if;
  return o;
end $$;

create or replace function protege_artisan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('request.jwt.claims', true)::json->>'role', '') in ('authenticated', 'anon')
     and not est_admin() and coalesce(current_setting('renovio.systeme', true), '') <> '1' then
    if tg_op = 'INSERT' then
      new.verifie := false; new.statut := 'actif'; new.abonnement := 'gratuit'; new.abonnement_fin := null;
      new.stripe_customer_id := null; new.stripe_subscription_id := null; new.bonus_offres := 0;
      new.parrain_id := null; new.parrainage_recompense := false; new.code_parrain := nouveau_code_parrain();
    else
      new.verifie := old.verifie; new.statut := old.statut; new.abonnement := old.abonnement; new.abonnement_fin := old.abonnement_fin;
      new.stripe_customer_id := old.stripe_customer_id; new.stripe_subscription_id := old.stripe_subscription_id;
      new.bonus_offres := old.bonus_offres; new.parrain_id := old.parrain_id;
      new.parrainage_recompense := old.parrainage_recompense; new.code_parrain := old.code_parrain;
    end if;
  end if;
  return new;
end $$;

-- ---------- Essais offerts par l'admin (ajout du 11/11/2026) ----------
create table if not exists reglages (
  cle text primary key,
  valeur jsonb not null,
  maj_le timestamptz default now()
);
alter table reglages enable row level security;
drop policy if exists reglages_admin on reglages;
create policy reglages_admin on reglages for all using (est_admin()) with check (est_admin());
insert into reglages (cle, valeur) values ('essai_auto', '{"actif": false, "formule": "pro", "jours": 30}') on conflict (cle) do nothing;

create or replace function offrir_essai(p_ids uuid[], p_formule text, p_jours int) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not est_admin() then raise exception 'Réservé à l''administrateur'; end if;
  if p_formule not in ('essentiel', 'pro', 'illimite') then raise exception 'Formule inconnue'; end if;
  if p_jours is null or p_jours < 1 or p_jours > 730 then raise exception 'Durée entre 1 et 730 jours'; end if;
  update artisans a set abonnement = p_formule, abonnement_fin = now() + make_interval(days => p_jours), abonnement_resilie = false
    where a.id = any(p_ids) and not (a.stripe_subscription_id is not null and formule_active(a) <> 'gratuit');
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function offrir_essai(uuid[], text, int) from public, anon;
grant execute on function offrir_essai(uuid[], text, int) to authenticated;

create or replace function essai_auto_nouvel_artisan() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  select valeur into r from reglages where cle = 'essai_auto';
  if r is not null and (r->>'actif')::boolean and r->>'formule' in ('essentiel', 'pro', 'illimite') and coalesce((r->>'jours')::int, 0) > 0 then
    perform set_config('renovio.systeme', '1', true);
    update artisans set abonnement = r->>'formule', abonnement_fin = now() + make_interval(days => (r->>'jours')::int) where id = new.id;
    perform set_config('renovio.systeme', '', true);
  end if;
  return new;
end $$;
drop trigger if exists trg_essai_auto on artisans;
create trigger trg_essai_auto after insert on artisans for each row execute function essai_auto_nouvel_artisan();
revoke execute on function essai_auto_nouvel_artisan() from public, anon, authenticated;
