-- =========================================================
-- RÉNOVIO — Schéma Supabase complet (à coller dans SQL Editor > Run, puis catalogue.sql)
-- Multi-entreprises : chaque utilisateur appartient à une entreprise,
-- la sécurité (RLS) empêche toute fuite de données entre entreprises.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- Entreprises ----------
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null default 'Mon entreprise',
  legal_form text default 'EI',            -- EI, EURL, SARL, SAS...
  siret text,
  vat_number text,                         -- TVA intracommunautaire
  vat_exempt boolean default false,        -- franchise en base (art. 293 B du CGI)
  rcs text,                                -- RCS / RM
  capital text,
  address text,
  zip text,
  city text,
  phone text,
  email text,
  iban text,
  bic text,
  insurance text,                          -- assurance décennale : assureur + n° + zone
  logo_url text,
  payment_terms_days int default 30,
  late_penalty_rate text default '3 fois le taux d''intérêt légal',
  quote_validity_days int default 30,
  footer_note text,
  -- abonnement SaaS
  plan text default 'trial',               -- trial | pro | canceled
  trial_ends_at timestamptz default (now() + interval '14 days'),
  stripe_customer_id text,
  stripe_subscription_id text
);

-- ---------- Membres (utilisateur -> entreprise) ----------
create table if not exists members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  role text default 'owner',
  full_name text,
  created_at timestamptz default now()
);

create or replace function my_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from members where user_id = auth.uid()
$$;

-- Création automatique de l'entreprise à l'inscription
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  insert into companies (name, email)
    values (coalesce(new.raw_user_meta_data->>'company_name', 'Mon entreprise'), new.email)
    returning id into cid;
  insert into members (user_id, company_id, full_name)
    values (new.id, cid, new.raw_user_meta_data->>'full_name');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Clients ----------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default my_company_id() references companies(id) on delete cascade,
  created_at timestamptz default now(),
  type text default 'particulier',         -- particulier | professionnel
  name text not null,
  email text,
  phone text,
  address text,
  zip text,
  city text,
  siret text,
  notes text
);

-- ---------- Catalogue ----------
create table if not exists catalog_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default my_company_id() references companies(id) on delete cascade,
  created_at timestamptz default now(),
  category text default 'Prestation',
  label text not null,
  description text,
  unit text default 'u',
  unit_price numeric(12,2) not null default 0,  -- HT
  vat_rate numeric(5,2) not null default 10,
  cost_price numeric(12,2) default 0            -- prix d'achat (pour la marge)
);

-- ---------- Compteurs de numérotation (sans trou, par an) ----------
create table if not exists counters (
  company_id uuid references companies(id) on delete cascade,
  kind text,          -- D (devis) | F (facture) | A (avoir)
  year int,
  value int default 0,
  primary key (company_id, kind, year)
);

create or replace function next_number(p_kind text) returns text
language plpgsql security definer set search_path = public as $$
declare cid uuid := my_company_id(); y int := extract(year from now()); v int;
begin
  if cid is null then raise exception 'not authenticated'; end if;
  insert into counters (company_id, kind, year, value) values (cid, p_kind, y, 1)
    on conflict (company_id, kind, year) do update set value = counters.value + 1
    returning value into v;
  return p_kind || '-' || y || '-' || lpad(v::text, 4, '0');
end $$;

-- ---------- Documents (devis / factures / avoirs) ----------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default my_company_id() references companies(id) on delete cascade,
  created_at timestamptz default now(),
  kind text not null check (kind in ('quote','invoice','credit')),
  number text,                      -- attribué à la création (devis) ou à l'émission (facture)
  status text not null default 'draft',
  -- quote: draft | sent | signed | refused | invoiced
  -- invoice: draft | issued | paid | canceled
  client_id uuid references clients(id) on delete set null,
  client_snapshot jsonb,            -- copie figée du client au moment de l'émission
  title text,
  site_address text,                -- adresse du chantier
  issue_date date default current_date,
  due_date date,
  valid_until date,
  lines jsonb not null default '[]',-- [{label, description, qty, unit, unit_price, vat_rate}]
  discount_pct numeric(5,2) default 0,
  deposit_pct numeric(5,2) default 0, -- acompte demandé
  total_ht numeric(12,2) default 0,
  total_vat numeric(12,2) default 0,
  total_ttc numeric(12,2) default 0,
  notes text,
  -- signature
  public_token uuid default gen_random_uuid(),
  signed_at timestamptz,
  signer_name text,
  signature_data text,              -- image PNG base64
  signer_ip text,
  -- liens
  source_quote_id uuid references documents(id) on delete set null,
  paid_at timestamptz,
  payment_method text
);
create unique index if not exists documents_number_uniq on documents(company_id, number) where number is not null;

-- Une facture émise ne peut plus être modifiée (obligation légale) — seulement payée/annulée
create or replace function protect_issued_invoice() returns trigger
language plpgsql as $$
begin
  if old.kind in ('invoice','credit') and old.status <> 'draft' then
    if new.lines is distinct from old.lines
       or new.total_ttc is distinct from old.total_ttc
       or new.number is distinct from old.number
       or new.client_snapshot is distinct from old.client_snapshot then
      raise exception 'Facture émise : modification interdite. Faites un avoir.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_invoice on documents;
create trigger trg_protect_invoice before update on documents
  for each row execute function protect_issued_invoice();

create or replace function prevent_issued_delete() returns trigger
language plpgsql as $$
begin
  if old.kind in ('invoice','credit') and old.status <> 'draft' then
    raise exception 'Une facture émise ne peut pas être supprimée.';
  end if;
  return old;
end $$;
drop trigger if exists trg_prevent_delete on documents;
create trigger trg_prevent_delete before delete on documents
  for each row execute function prevent_issued_delete();

-- ---------- Interventions (planning) ----------
create table if not exists interventions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default my_company_id() references companies(id) on delete cascade,
  created_at timestamptz default now(),
  client_id uuid references clients(id) on delete set null,
  document_id uuid references documents(id) on delete set null,
  title text not null,
  address text,
  starts_at timestamptz not null,
  duration_min int default 120,
  technician text,
  status text default 'planned',    -- planned | done | canceled
  notes text,
  equipment jsonb                   -- infos plaque chaudière scannée
);

-- ---------- RLS ----------
alter table companies enable row level security;
alter table members enable row level security;
alter table clients enable row level security;
alter table catalog_items enable row level security;
alter table documents enable row level security;
alter table interventions enable row level security;
alter table counters enable row level security;

drop policy if exists company_rw on companies;
create policy company_rw on companies for all
  using (id = my_company_id()) with check (id = my_company_id());

drop policy if exists members_r on members;
create policy members_r on members for select using (company_id = my_company_id());

do $$ declare t text; begin
  foreach t in array array['clients','catalog_items','documents','interventions'] loop
    execute format('drop policy if exists tenant_rw on %I', t);
    execute format('create policy tenant_rw on %I for all using (company_id = my_company_id()) with check (company_id = my_company_id())', t);
  end loop;
end $$;

-- Empêche un utilisateur de s'attribuer lui-même l'abonnement "pro"
create or replace function protect_plan() returns trigger
language plpgsql as $$
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::json->>'role',
              current_setting('request.jwt.claim.role', true)) = 'authenticated' then
    new.plan := old.plan;
    new.trial_ends_at := old.trial_ends_at;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_plan on companies;
create trigger trg_protect_plan before update on companies
  for each row execute function protect_plan();

-- ---------- Accès public pour la signature du devis (lien envoyé au client) ----------
create or replace function get_public_quote(p_token uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'doc', to_json(d.*) ,
    'company', json_build_object('name', c.name, 'address', c.address, 'zip', c.zip, 'city', c.city,
       'phone', c.phone, 'email', c.email, 'siret', c.siret, 'vat_number', c.vat_number,
       'vat_exempt', c.vat_exempt, 'logo_url', c.logo_url, 'insurance', c.insurance,
       'legal_form', c.legal_form, 'rcs', c.rcs, 'capital', c.capital, 'iban', c.iban, 'bic', c.bic,
       'payment_terms_days', c.payment_terms_days, 'late_penalty_rate', c.late_penalty_rate, 'footer_note', c.footer_note)
  )
  from documents d join companies c on c.id = d.company_id
  where d.public_token = p_token and d.kind = 'quote'
$$;

create or replace function sign_public_quote(p_token uuid, p_name text, p_signature text, p_ip text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update documents set status = 'signed', signed_at = now(), signer_name = p_name,
    signature_data = p_signature, signer_ip = p_ip
  where public_token = p_token and kind = 'quote' and status in ('draft','sent');
  return found;
end $$;

grant execute on function get_public_quote(uuid) to anon, authenticated;
grant execute on function sign_public_quote(uuid, text, text, text) to anon, authenticated;
grant execute on function next_number(text) to authenticated;

-- ---------- Stockage des logos ----------
insert into storage.buckets (id, name, public) values ('logos', 'logos', true)
  on conflict (id) do nothing;
drop policy if exists logos_upload on storage.objects;
create policy logos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = my_company_id()::text);
drop policy if exists logos_update on storage.objects;
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = my_company_id()::text);

-- ---------- V1.1 : photo du signataire ----------
alter table documents add column if not exists signer_photo text;
create or replace function sign_public_quote(p_token uuid, p_name text, p_signature text, p_photo text, p_ip text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update documents set status = 'signed', signed_at = now(), signer_name = p_name,
    signature_data = p_signature, signer_photo = p_photo, signer_ip = p_ip
  where public_token = p_token and kind = 'quote' and status in ('draft','sent');
  return found;
end $$;
grant execute on function sign_public_quote(uuid, text, text, text, text) to anon, authenticated;

-- ---------- V1.2 : suivi des envois ----------
alter table documents add column if not exists sent_at timestamptz;
alter table documents add column if not exists sent_to text;

-- ---------- V1.3 : module entretien (contrats + attestations) ----------
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default my_company_id() references companies(id) on delete cascade,
  created_at timestamptz default now(), number text, status text not null default 'draft',
  client_id uuid references clients(id) on delete set null, client_snapshot jsonb, site_address text,
  equipment jsonb not null default '{}', start_date date default current_date, duration_months int default 12,
  period_months int default 12, tacit_renewal boolean default true, price_ht numeric(12,2) default 0,
  vat_rate numeric(5,2) default 10, includes text, excludes text, options text, notes text, next_visit_date date,
  signed_at timestamptz, signer_name text, signature_data text, signer_photo text, signed_on_site boolean default true,
  sent_at timestamptz, sent_to text, renewal_notice_at timestamptz
);
create unique index if not exists contracts_number_uniq on contracts(company_id, number) where number is not null;
create table if not exists maintenance_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default my_company_id() references companies(id) on delete cascade,
  created_at timestamptz default now(), number text, status text not null default 'draft',
  contract_id uuid references contracts(id) on delete set null, client_id uuid references clients(id) on delete set null,
  client_snapshot jsonb, site_address text, equipment jsonb not null default '{}', visit_date date default current_date,
  technician text, checklist jsonb not null default '[]', measures jsonb not null default '{}', observations text,
  advice text, improvements text, replacement text, next_visit_date date, signed_at timestamptz, signer_name text,
  signature_data text, sent_at timestamptz, sent_to text
);
create unique index if not exists reports_number_uniq on maintenance_reports(company_id, number) where number is not null;
alter table contracts enable row level security;
alter table maintenance_reports enable row level security;
create policy tenant_rw on contracts for all using (company_id = my_company_id()) with check (company_id = my_company_id());
create policy tenant_rw on maintenance_reports for all using (company_id = my_company_id()) with check (company_id = my_company_id());

-- ---------- V1.4 : suivi de chantier avec photos ----------
create table if not exists chantiers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default my_company_id() references companies(id) on delete cascade,
  created_at timestamptz default now(), title text not null, status text not null default 'planned',
  client_id uuid references clients(id) on delete set null, client_snapshot jsonb,
  document_id uuid references documents(id) on delete set null, address text, start_date date, end_date date,
  notes text, cover_path text
);
create table if not exists chantier_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default my_company_id() references companies(id) on delete cascade,
  chantier_id uuid not null references chantiers(id) on delete cascade, created_at timestamptz default now(),
  author text, tag text default 'pendant', text text, photos jsonb not null default '[]'
);
alter table chantiers enable row level security;
alter table chantier_entries enable row level security;
create policy tenant_rw on chantiers for all using (company_id = my_company_id()) with check (company_id = my_company_id());
create policy tenant_rw on chantier_entries for all using (company_id = my_company_id()) with check (company_id = my_company_id());
insert into storage.buckets (id, name, public) values ('chantiers', 'chantiers', false) on conflict (id) do nothing;
create policy chantiers_read on storage.objects for select to authenticated using (bucket_id = 'chantiers' and (storage.foldername(name))[1] = my_company_id()::text);
create policy chantiers_insert on storage.objects for insert to authenticated with check (bucket_id = 'chantiers' and (storage.foldername(name))[1] = my_company_id()::text);
create policy chantiers_delete on storage.objects for delete to authenticated using (bucket_id = 'chantiers' and (storage.foldername(name))[1] = my_company_id()::text);


-- ---------- V1.5 : quitus (PV de réception) et SAV ----------
create table if not exists receptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default my_company_id() references companies(id) on delete cascade,
  created_at timestamptz default now(),
  number text,
  status text not null default 'draft',
  chantier_id uuid references chantiers(id) on delete set null,
  document_id uuid references documents(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  client_snapshot jsonb,
  address text,
  works text,
  works_end_date date,
  reception_date date default current_date,
  with_reserves boolean default false,
  reserves jsonb not null default '[]',
  notes text,
  signed_at timestamptz,
  signer_name text,
  signature_data text,
  signer_photo text,
  company_signer text,
  reserves_lifted_at timestamptz,
  sent_at timestamptz,
  sent_to text
);
create unique index if not exists receptions_number_uniq on receptions(company_id, number) where number is not null;

create table if not exists sav_tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default my_company_id() references companies(id) on delete cascade,
  created_at timestamptz default now(),
  number text,
  status text not null default 'open',
  priority text default 'normal',
  origin text default 'Téléphone',
  client_id uuid references clients(id) on delete set null,
  client_snapshot jsonb,
  address text,
  equipment jsonb not null default '{}',
  contract_id uuid references contracts(id) on delete set null,
  chantier_id uuid references chantiers(id) on delete set null,
  warranty text default 'hors_garantie',
  problem text,
  scheduled_at timestamptz,
  technician text,
  diagnosis text,
  actions text,
  parts text,
  billable boolean default false,
  photos jsonb not null default '[]',
  resolved_at timestamptz,
  signed_at timestamptz,
  signer_name text,
  signature_data text,
  document_id uuid references documents(id) on delete set null,
  sent_at timestamptz,
  sent_to text
);
create unique index if not exists sav_number_uniq on sav_tickets(company_id, number) where number is not null;

alter table receptions enable row level security;
alter table sav_tickets enable row level security;
create policy tenant_rw on receptions for all using (company_id = my_company_id()) with check (company_id = my_company_id());
create policy tenant_rw on sav_tickets for all using (company_id = my_company_id()) with check (company_id = my_company_id());

-- ---------- V1.6 : désabonnement et suppression de compte ----------
alter table companies add column if not exists cancel_at timestamptz;

create or replace function prevent_issued_delete() returns trigger
language plpgsql as $$
begin
  if current_setting('app.deleting_account', true) = 'on' then return old; end if;
  if old.kind in ('invoice','credit') and old.status <> 'draft' then
    raise exception 'Une facture émise ne peut pas être supprimée.';
  end if;
  return old;
end $$;

-- ---------- V2 : multi-métiers ----------
-- Métiers de l'entreprise (identifiants de lib/trades.ts)
alter table companies add column if not exists trades text[] not null default '{}';
-- Métier d'origine d'un article (filtre du catalogue)
alter table catalog_items add column if not exists trade text;

-- Catalogue de référence, commun à toutes les entreprises (rempli par catalogue.sql)
create table if not exists starter_catalog (
  id serial primary key,
  trade text not null,
  category text not null,
  label text not null,
  description text,
  unit text not null default 'u',
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 10,
  cost_price numeric(12,2) default 0
);
alter table starter_catalog enable row level security;
drop policy if exists starter_read on starter_catalog;
create policy starter_read on starter_catalog for select to authenticated using (true);

-- Ajoute à l'entreprise les articles de ses métiers (sans doublon, sans toucher aux prix existants)
create or replace function seed_catalog_items(cid uuid, p_trades text[] default null) returns int
language plpgsql security definer set search_path = public as $$
declare n int; t text[];
begin
  t := coalesce(p_trades, (select trades from companies where id = cid), '{}');
  insert into catalog_items (company_id, trade, category, label, description, unit, unit_price, vat_rate, cost_price)
  select distinct on (lower(s.label)) cid, s.trade, s.category, s.label, s.description, s.unit, s.unit_price, s.vat_rate, s.cost_price
  from starter_catalog s
  where (s.trade = 'commun' or s.trade = any(t))
    and not exists (select 1 from catalog_items i where i.company_id = cid and lower(i.label) = lower(s.label))
  order by lower(s.label), s.id;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function seed_catalog(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform seed_catalog_items(cid);
end $$;

-- ---------- V1.8 : rôles superviseur / technicien ----------
alter table members add column if not exists email text;

create or replace function my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from members where user_id = auth.uid()
$$;
create or replace function is_supervisor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('owner','supervisor') from members where user_id = auth.uid()), false)
$$;

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default my_company_id() references companies(id) on delete cascade,
  created_at timestamptz default now(),
  email text not null,
  full_name text,
  role text not null default 'technician' check (role in ('supervisor','technician')),
  token uuid not null default gen_random_uuid(),
  accepted_at timestamptz,
  sent_at timestamptz
);
alter table invitations enable row level security;
create policy sup_rw on invitations for all
  using (company_id = my_company_id() and is_supervisor())
  with check (company_id = my_company_id() and is_supervisor());

create or replace function get_invitation(p_token uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('email', i.email, 'full_name', i.full_name, 'role', i.role, 'company', c.name, 'logo_url', c.logo_url, 'accepted', i.accepted_at is not null)
  from invitations i join companies c on c.id = i.company_id where i.token = p_token
$$;
grant execute on function get_invitation(uuid) to anon, authenticated;

-- Inscription : rejoint l'entreprise si invitation valide, sinon crée l'entreprise avec ses métiers et son catalogue
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare cid uuid; inv invitations%rowtype; t text[];
begin
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

create or replace function set_member_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_supervisor() then raise exception 'Réservé au superviseur'; end if;
  if p_role not in ('supervisor','technician') then raise exception 'Rôle invalide'; end if;
  update members set role = p_role
    where user_id = p_user and company_id = my_company_id() and role <> 'owner';
end $$;

create or replace function remove_member(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not is_supervisor() then raise exception 'Réservé au superviseur'; end if;
  if p_user = auth.uid() then raise exception 'Vous ne pouvez pas vous retirer vous-même'; end if;
  if not exists (select 1 from members where user_id = p_user and company_id = my_company_id() and role <> 'owner') then
    raise exception 'Membre introuvable';
  end if;
  delete from auth.users where id = p_user;
end $$;

create or replace function update_my_name(p_name text) returns void
language sql security definer set search_path = public as $$
  update members set full_name = p_name where user_id = auth.uid()
$$;

grant execute on function set_member_role(uuid, text) to authenticated;
grant execute on function remove_member(uuid) to authenticated;
grant execute on function update_my_name(text) to authenticated;

create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); cid uuid; r text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select company_id, role into cid, r from public.members where user_id = uid;
  if cid is not null and r = 'owner' then
    if exists (select 1 from public.companies where id = cid and plan = 'pro' and stripe_subscription_id is not null and cancel_at is null) then
      raise exception 'Résiliez d''abord votre abonnement (page Abonnement).';
    end if;
    perform set_config('app.deleting_account', 'on', true);
    delete from auth.users where id in (select user_id from public.members where company_id = cid and user_id <> uid);
    delete from public.companies where id = cid;
  end if;
  delete from auth.users where id = uid;
end $$;
revoke execute on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;

alter table interventions add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table sav_tickets add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table maintenance_reports add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table chantiers add column if not exists team uuid[] default '{}';

-- Droits par rôle
alter policy tenant_rw on documents using (company_id = my_company_id() and is_supervisor()) with check (company_id = my_company_id() and is_supervisor());
alter policy tenant_rw on contracts using (company_id = my_company_id() and is_supervisor()) with check (company_id = my_company_id() and is_supervisor());
create policy tech_read on contracts for select using (company_id = my_company_id());
alter policy tenant_rw on catalog_items using (company_id = my_company_id() and is_supervisor()) with check (company_id = my_company_id() and is_supervisor());
create policy tech_read on catalog_items for select using (company_id = my_company_id());
alter policy company_rw on companies using (id = my_company_id() and is_supervisor()) with check (id = my_company_id() and is_supervisor());
create policy member_read on companies for select using (id = my_company_id());

create or replace function next_number(p_kind text) returns text
language plpgsql security definer set search_path = public as $$
declare cid uuid := my_company_id(); y int := extract(year from now()); v int;
begin
  if cid is null then raise exception 'not authenticated'; end if;
  if p_kind in ('D','F','A','C') and not is_supervisor() then raise exception 'Réservé au superviseur'; end if;
  insert into counters (company_id, kind, year, value) values (cid, p_kind, y, 1)
    on conflict (company_id, kind, year) do update set value = counters.value + 1
    returning value into v;
  return p_kind || '-' || y || '-' || lpad(v::text, 4, '0');
end $$;

-- Bouton « compléter mon catalogue » : métiers de l'entreprise, ou ceux passés en paramètre
create or replace function complete_my_catalog(p_trades text[] default null) returns int
language plpgsql security definer set search_path = public as $$
declare cid uuid := my_company_id();
begin
  if cid is null or not is_supervisor() then raise exception 'Réservé au superviseur'; end if;
  return seed_catalog_items(cid, p_trades);
end $$;
revoke execute on function seed_catalog_items(uuid, text[]) from public, anon, authenticated;
revoke execute on function seed_catalog(uuid) from public, anon, authenticated;
grant execute on function complete_my_catalog(text[]) to authenticated;

create or replace function report_done_update_contract() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') and new.contract_id is not null and new.next_visit_date is not null then
    update contracts set next_visit_date = new.next_visit_date where id = new.contract_id and company_id = new.company_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_report_done on maintenance_reports;
create trigger trg_report_done after update on maintenance_reports
  for each row execute function report_done_update_contract();

-- ---------- Sécurité : droits d'exécution des fonctions ----------
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function report_done_update_contract() from public, anon, authenticated;
revoke execute on function complete_my_catalog(text[]) from public, anon;
revoke execute on function is_supervisor() from public, anon;
revoke execute on function my_company_id() from public, anon;
revoke execute on function my_role() from public, anon;
revoke execute on function next_number(text) from public, anon;
revoke execute on function remove_member(uuid) from public, anon;
revoke execute on function set_member_role(uuid, text) from public, anon;
revoke execute on function update_my_name(text) from public, anon;
revoke execute on function sign_public_quote(uuid, text, text, text) from public, anon, authenticated;
grant execute on function is_supervisor() to authenticated;
grant execute on function my_company_id() to authenticated;
grant execute on function my_role() to authenticated;
alter function prevent_issued_delete() set search_path = public;
alter function protect_plan() set search_path = public;
alter function protect_issued_invoice() set search_path = public;
