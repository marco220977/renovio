-- =====================================================================
-- Rénovio — mise en relation clients / artisans
-- À exécuter dans Supabase (SQL Editor) APRÈS schema.sql.
-- Tables séparées de l'ancienne appli devis (companies, documents…), qui ne sont pas touchées.
-- =====================================================================

-- ---------- Profils (client / artisan / admin) ----------
create table if not exists profils (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  role text not null default 'client' check (role in ('client', 'artisan', 'admin')),
  nom text,
  telephone text,
  email text
);

-- ---------- Artisans (fiche entreprise) ----------
create table if not exists artisans (
  id uuid primary key references profils(id) on delete cascade,
  created_at timestamptz default now(),
  raison_sociale text,
  forme text,
  siret text,
  adresse text,
  cp text,
  ville text,
  telephone text,
  email text,
  metiers text[] not null default '{}',
  departements text[] not null default '{}',
  decennale text,               -- assureur + n° de contrat
  decennale_fin date,
  rge boolean default false,
  tva_franchise boolean default false,  -- franchise en base (art. 293 B du CGI)
  presentation text,
  verifie boolean default false,        -- coché par l'admin après contrôle SIRET + décennale
  statut text not null default 'actif' check (statut in ('actif', 'suspendu'))
);

-- ---------- Tarifs de l'artisan (base du devis IA) ----------
create table if not exists tarifs (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null default auth.uid() references artisans(id) on delete cascade,
  created_at timestamptz default now(),
  metier text,
  categorie text default 'Prestation',
  libelle text not null,
  description text,
  unite text default 'u',
  prix_ht numeric(12,2) not null default 0,
  tva numeric(5,2) not null default 10
);
create index if not exists tarifs_artisan_idx on tarifs(artisan_id);

-- ---------- Demandes de travaux ----------
create table if not exists demandes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references profils(id) on delete cascade,
  created_at timestamptz default now(),
  titre text,
  description text not null,
  reponses jsonb not null default '[]',   -- [{question, reponse}]
  cahier jsonb,                           -- cahier des charges généré par l'IA
  metiers text[] not null default '{}',
  cp text not null,
  ville text,
  departement text not null,
  delai text default 'dans 1 à 3 mois',  -- urgent | dans le mois | dans 1 à 3 mois | pas pressé
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  photos text[] not null default '{}',   -- chemins dans le stockage « demandes »
  statut text not null default 'brouillon' check (statut in ('brouillon', 'ouverte', 'fermee', 'attribuee', 'annulee')),
  publiee_le timestamptz,
  ferme_le timestamptz
);
create index if not exists demandes_dep_idx on demandes(departement, statut);

-- Coordonnées du client : visibles seulement par lui et par l'artisan retenu
create table if not exists demande_contacts (
  demande_id uuid primary key references demandes(id) on delete cascade,
  nom text,
  telephone text,
  email text,
  adresse text
);

-- ---------- Offres (une seule par artisan et par demande, cachée aux autres) ----------
create table if not exists offres (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null references demandes(id) on delete cascade,
  artisan_id uuid not null references artisans(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  numero text,
  lignes jsonb not null default '[]',    -- [{kind?, label, description, qty, unit, unit_price, vat_rate}]
  total_ht numeric(12,2) default 0,
  total_tva numeric(12,2) default 0,
  total_ttc numeric(12,2) default 0,
  delai_jours int,                        -- délai avant démarrage
  duree_jours int,                        -- durée estimée du chantier
  message text,
  validite_jours int default 30,
  statut text not null default 'envoyee' check (statut in ('envoyee', 'acceptee', 'refusee', 'retiree')),
  modifiee boolean default false,
  signe_le timestamptz,
  signataire text,
  signature text,
  unique (demande_id, artisan_id)
);

-- ---------- Avis ----------
create table if not exists avis (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null unique references demandes(id) on delete cascade,
  artisan_id uuid not null references artisans(id) on delete cascade,
  client_id uuid not null default auth.uid() references profils(id) on delete cascade,
  created_at timestamptz default now(),
  note int not null check (note between 1 and 5),
  commentaire text
);

-- =====================================================================
-- Fonctions d'aide (security definer = évite les boucles de règles RLS)
-- =====================================================================
create or replace function est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profils where id = auth.uid() and role = 'admin');
$$;

create or replace function mes_demandes_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from demandes where client_id = auth.uid();
$$;

create or replace function mes_offres_demandes_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select demande_id from offres where artisan_id = auth.uid();
$$;

create or replace function demandes_attribuees_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select demande_id from offres where artisan_id = auth.uid() and statut = 'acceptee';
$$;

-- Demande ouverte qui correspond aux métiers et départements de l'artisan connecté
create or replace function demande_visible_artisan(d demandes) returns boolean
language sql stable security definer set search_path = public as $$
  select d.statut = 'ouverte' and d.ferme_le > now() and exists (
    select 1 from artisans a
    where a.id = auth.uid() and a.statut = 'actif'
      and d.departement = any(a.departements)
      and d.metiers && a.metiers
  );
$$;

-- =====================================================================
-- Sécurité (RLS)
-- =====================================================================
alter table profils enable row level security;
alter table artisans enable row level security;
alter table tarifs enable row level security;
alter table demandes enable row level security;
alter table demande_contacts enable row level security;
alter table offres enable row level security;
alter table avis enable row level security;

-- Profils : chacun le sien
drop policy if exists profils_r on profils;
create policy profils_r on profils for select using (id = auth.uid() or est_admin());
drop policy if exists profils_i on profils;
create policy profils_i on profils for insert with check (id = auth.uid() and role in ('client', 'artisan'));
drop policy if exists profils_u on profils;
create policy profils_u on profils for update using (id = auth.uid())
  with check (id = auth.uid() and role in ('client', 'artisan'));

-- Artisans : fiche publique pour les utilisateurs connectés, modifiable par son propriétaire
drop policy if exists artisans_r on artisans;
create policy artisans_r on artisans for select to authenticated using (true);
drop policy if exists artisans_i on artisans;
create policy artisans_i on artisans for insert with check (id = auth.uid());
drop policy if exists artisans_u on artisans;
create policy artisans_u on artisans for update using (id = auth.uid() or est_admin()) with check (id = auth.uid() or est_admin());

-- L'artisan ne peut pas se « vérifier » ni se réactiver lui-même
create or replace function protege_artisan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not est_admin() then
    if tg_op = 'INSERT' then
      new.verifie := false; new.statut := 'actif';
    else
      new.verifie := old.verifie; new.statut := old.statut;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_protege_artisan on artisans;
create trigger trg_protege_artisan before insert or update on artisans
  for each row execute function protege_artisan();

-- Tarifs : privés à l'artisan
drop policy if exists tarifs_rw on tarifs;
create policy tarifs_rw on tarifs for all using (artisan_id = auth.uid()) with check (artisan_id = auth.uid());

-- Demandes
drop policy if exists demandes_r on demandes;
create policy demandes_r on demandes for select using (
  client_id = auth.uid()
  or demande_visible_artisan(demandes)
  or id in (select mes_offres_demandes_ids())
  or est_admin()
);
drop policy if exists demandes_i on demandes;
create policy demandes_i on demandes for insert with check (client_id = auth.uid() and statut = 'brouillon');
drop policy if exists demandes_u on demandes;
create policy demandes_u on demandes for update using (client_id = auth.uid() and statut = 'brouillon')
  with check (client_id = auth.uid() and statut = 'brouillon');
drop policy if exists demandes_d on demandes;
create policy demandes_d on demandes for delete using (client_id = auth.uid() and statut = 'brouillon');

-- Coordonnées
drop policy if exists contacts_r on demande_contacts;
create policy contacts_r on demande_contacts for select using (
  demande_id in (select mes_demandes_ids()) or demande_id in (select demandes_attribuees_ids()) or est_admin()
);
drop policy if exists contacts_w on demande_contacts;
create policy contacts_w on demande_contacts for all using (demande_id in (select mes_demandes_ids()))
  with check (demande_id in (select mes_demandes_ids()));

-- Offres : l'artisan voit les siennes, le client voit celles de ses demandes. Écriture uniquement par les fonctions ci-dessous.
drop policy if exists offres_r on offres;
create policy offres_r on offres for select using (
  artisan_id = auth.uid() or demande_id in (select mes_demandes_ids()) or est_admin()
);

-- Avis
drop policy if exists avis_r on avis;
create policy avis_r on avis for select to authenticated using (true);
drop policy if exists avis_i on avis;
create policy avis_i on avis for insert with check (
  client_id = auth.uid()
  and exists (select 1 from demandes d where d.id = demande_id and d.client_id = auth.uid() and d.statut = 'attribuee')
  and exists (select 1 from offres o where o.demande_id = avis.demande_id and o.artisan_id = avis.artisan_id and o.statut = 'acceptee')
);

-- Note moyenne publique par artisan
create or replace view artisans_notes with (security_invoker = true) as
  select artisan_id, round(avg(note)::numeric, 1) as note, count(*)::int as nb_avis from avis group by artisan_id;

-- =====================================================================
-- Actions (fonctions appelées par l'appli)
-- =====================================================================

-- Publier une demande : ouverte 72 h (48 h si urgent)
create or replace function publier_demande(p_id uuid) returns demandes
language plpgsql security definer set search_path = public as $$
declare d demandes;
begin
  select * into d from demandes where id = p_id and client_id = auth.uid() for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if d.statut <> 'brouillon' then raise exception 'Cette demande est déjà publiée'; end if;
  if d.cahier is null then raise exception 'Le cahier des charges n''est pas encore prêt'; end if;
  if coalesce(array_length(d.metiers, 1), 0) = 0 then raise exception 'Choisissez au moins un métier'; end if;
  if not exists (select 1 from demande_contacts c where c.demande_id = p_id and coalesce(c.telephone, c.email, '') <> '') then
    raise exception 'Ajoutez un téléphone ou un e-mail de contact';
  end if;
  update demandes set statut = 'ouverte', publiee_le = now(),
    ferme_le = now() + case when d.delai = 'urgent' then interval '48 hours' else interval '72 hours' end
    where id = p_id returning * into d;
  return d;
end $$;

-- Annuler une demande
create or replace function annuler_demande(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update demandes set statut = 'annulee'
    where id = p_id and client_id = auth.uid() and statut in ('brouillon', 'ouverte', 'fermee');
  if not found then raise exception 'Impossible d''annuler cette demande'; end if;
  update offres set statut = 'refusee', updated_at = now() where demande_id = p_id and statut = 'envoyee';
end $$;

-- Envoyer (ou modifier une seule fois) son offre
create or replace function envoyer_offre(p_demande uuid, p_lignes jsonb, p_delai int, p_duree int, p_message text, p_validite int default 30)
returns offres
language plpgsql security definer set search_path = public as $$
declare
  a artisans; d demandes; o offres; n int; mine int;
  ht numeric := 0; tva numeric := 0; r record;
begin
  select * into a from artisans where id = auth.uid();
  if not found then raise exception 'Complétez d''abord votre profil artisan'; end if;
  if a.statut <> 'actif' then raise exception 'Votre compte artisan est suspendu'; end if;
  if coalesce(length(regexp_replace(a.siret, '\D', '', 'g')), 0) <> 14 then raise exception 'Renseignez votre SIRET (14 chiffres) dans votre profil'; end if;
  if coalesce(a.decennale, '') = '' or (a.decennale_fin is not null and a.decennale_fin < current_date) then
    raise exception 'Renseignez une attestation décennale valide dans votre profil';
  end if;
  if jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then raise exception 'Le devis est vide'; end if;

  select * into d from demandes where id = p_demande for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if d.statut <> 'ouverte' or d.ferme_le <= now() then raise exception 'Cette demande n''accepte plus d''offres'; end if;
  if not (d.departement = any(a.departements) and d.metiers && a.metiers) then raise exception 'Cette demande est hors de votre zone ou de vos métiers'; end if;

  -- Totaux calculés ici (le client ne peut pas les fausser)
  for r in
    select round(coalesce((l->>'qty')::numeric, 0) * coalesce((l->>'unit_price')::numeric, 0), 2) as base
    from jsonb_array_elements(p_lignes) l where coalesce(l->>'kind', '') <> 'section'
  loop
    ht := ht + r.base;
  end loop;
  select coalesce(sum(round(s.base * s.taux / 100, 2)), 0) into tva from (
    select case when a.tva_franchise then 0 else coalesce((l->>'vat_rate')::numeric, 0) end as taux,
           sum(round(coalesce((l->>'qty')::numeric, 0) * coalesce((l->>'unit_price')::numeric, 0), 2)) as base
    from jsonb_array_elements(p_lignes) l where coalesce(l->>'kind', '') <> 'section' group by 1
  ) s;
  if ht <= 0 then raise exception 'Le montant du devis doit être supérieur à 0'; end if;

  select * into o from offres where demande_id = p_demande and artisan_id = a.id;
  if found then
    if o.statut <> 'envoyee' then raise exception 'Cette offre ne peut plus être modifiée'; end if;
    if o.modifiee then raise exception 'Vous avez déjà modifié votre offre une fois'; end if;
    update offres set lignes = p_lignes, total_ht = ht, total_tva = tva, total_ttc = ht + tva,
      delai_jours = p_delai, duree_jours = p_duree, message = p_message, validite_jours = coalesce(p_validite, 30),
      modifiee = true, updated_at = now()
      where id = o.id returning * into o;
    return o;
  end if;

  select count(*) into n from offres where demande_id = p_demande and statut <> 'retiree';
  if n >= 5 then raise exception 'Cette demande a déjà reçu 5 offres'; end if;
  select count(*) into mine from offres where artisan_id = a.id;
  insert into offres (demande_id, artisan_id, numero, lignes, total_ht, total_tva, total_ttc, delai_jours, duree_jours, message, validite_jours)
    values (p_demande, a.id, 'D-' || to_char(now(), 'YYYY') || '-' || lpad((mine + 1)::text, 4, '0'),
            p_lignes, ht, tva, ht + tva, p_delai, p_duree, p_message, coalesce(p_validite, 30))
    returning * into o;
  if n + 1 >= 5 then update demandes set statut = 'fermee' where id = p_demande; end if;
  return o;
end $$;

-- Retirer son offre (avant le choix du client)
create or replace function retirer_offre(p_offre uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update offres set statut = 'retiree', updated_at = now()
    where id = p_offre and artisan_id = auth.uid() and statut = 'envoyee';
  if not found then raise exception 'Impossible de retirer cette offre'; end if;
end $$;

-- Le client accepte et signe une offre
create or replace function accepter_offre(p_offre uuid, p_nom text, p_signature text) returns offres
language plpgsql security definer set search_path = public as $$
declare o offres; d demandes;
begin
  select * into o from offres where id = p_offre for update;
  if not found then raise exception 'Offre introuvable'; end if;
  select * into d from demandes where id = o.demande_id for update;
  if d.client_id <> auth.uid() then raise exception 'Accès refusé'; end if;
  if d.statut not in ('ouverte', 'fermee') then raise exception 'Cette demande est déjà attribuée ou annulée'; end if;
  if o.statut <> 'envoyee' then raise exception 'Cette offre n''est plus disponible'; end if;
  if o.updated_at + make_interval(days => coalesce(o.validite_jours, 30)) < now() then raise exception 'Cette offre a expiré'; end if;
  if coalesce(trim(p_nom), '') = '' or coalesce(p_signature, '') = '' then raise exception 'Nom et signature obligatoires'; end if;
  update offres set statut = 'acceptee', signe_le = now(), signataire = trim(p_nom), signature = p_signature, updated_at = now()
    where id = p_offre returning * into o;
  update offres set statut = 'refusee', updated_at = now() where demande_id = d.id and id <> p_offre and statut = 'envoyee';
  update demandes set statut = 'attribuee' where id = d.id;
  return o;
end $$;

-- Charger les tarifs de départ (catalogue Rénovio) selon les métiers de l'artisan
create or replace function charger_tarifs_depart() returns int
language plpgsql security definer set search_path = public as $$
declare a artisans; n int;
begin
  select * into a from artisans where id = auth.uid();
  if not found then raise exception 'Profil artisan introuvable'; end if;
  insert into tarifs (artisan_id, metier, categorie, libelle, description, unite, prix_ht, tva)
    select a.id, s.trade, s.category, s.label, s.description, s.unit, s.unit_price, s.vat_rate
    from starter_catalog s
    where (s.trade = any(a.metiers) or s.trade = 'commun')
      and not exists (select 1 from tarifs t where t.artisan_id = a.id and t.libelle = s.label);
  get diagnostics n = row_count;
  return n;
end $$;

-- =====================================================================
-- Inscription : un compte créé depuis la nouvelle appli (métadonnée app = 'mer')
-- reçoit un profil client ou artisan au lieu d'une entreprise de l'ancienne appli devis.
-- =====================================================================
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare cid uuid; inv invitations%rowtype; t text[]; r text;
begin
  if new.raw_user_meta_data->>'app' = 'mer' then
    r := case when new.raw_user_meta_data->>'role' = 'artisan' then 'artisan' else 'client' end;
    insert into profils (id, role, nom, telephone, email)
      values (new.id, r, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone', new.email)
      on conflict (id) do nothing;
    if r = 'artisan' then
      select coalesce(array_agg(x), '{}') into t
        from jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'trades', '[]'::jsonb)) x;
      insert into artisans (id, raison_sociale, email, telephone, metiers)
        values (new.id, new.raw_user_meta_data->>'company_name', new.email, new.raw_user_meta_data->>'phone', t)
        on conflict (id) do nothing;
    end if;
    return new;
  end if;

  -- Ancienne appli devis (inchangé)
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

-- =====================================================================
-- Stockage des photos de demandes
-- =====================================================================
insert into storage.buckets (id, name, public) values ('demandes', 'demandes', false)
  on conflict (id) do nothing;

drop policy if exists demandes_photos_i on storage.objects;
create policy demandes_photos_i on storage.objects for insert to authenticated
  with check (bucket_id = 'demandes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists demandes_photos_d on storage.objects;
create policy demandes_photos_d on storage.objects for delete to authenticated
  using (bucket_id = 'demandes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists demandes_photos_r on storage.objects;
create policy demandes_photos_r on storage.objects for select to authenticated
  using (bucket_id = 'demandes');

-- Fonctions accessibles aux utilisateurs connectés uniquement
revoke execute on function publier_demande(uuid), annuler_demande(uuid), envoyer_offre(uuid, jsonb, int, int, text, int),
  retirer_offre(uuid), accepter_offre(uuid, text, text), charger_tarifs_depart() from public, anon;
grant execute on function publier_demande(uuid), annuler_demande(uuid), envoyer_offre(uuid, jsonb, int, int, text, int),
  retirer_offre(uuid), accepter_offre(uuid, text, text), charger_tarifs_depart() to authenticated;
revoke execute on function est_admin(), mes_demandes_ids(), mes_offres_demandes_ids(), demandes_attribuees_ids(), demande_visible_artisan(demandes) from public, anon;
grant execute on function est_admin(), mes_demandes_ids(), mes_offres_demandes_ids(), demandes_attribuees_ids(), demande_visible_artisan(demandes) to authenticated;
revoke execute on function protege_artisan() from public, anon, authenticated;
