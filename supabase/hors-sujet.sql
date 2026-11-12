create extension if not exists pgcrypto with schema extensions;
create table if not exists secrets_internes (cle text primary key, valeur text not null);
alter table secrets_internes enable row level security;
revoke all on secrets_internes from anon, authenticated;
insert into secrets_internes values ('ia_signature', '<secret généré, non versionné>') on conflict (cle) do nothing;

alter table demandes add column if not exists ia_signature text;
alter table demandes add column if not exists masquee boolean not null default false;

-- Publication : la description doit avoir été validée par l'IA comme une demande de travaux
create or replace function publier_demande(p_id uuid) returns demandes
language plpgsql security definer set search_path = public, extensions as $$
declare d demandes; s text;
begin
  select * into d from demandes where id = p_id and client_id = auth.uid() for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if d.statut <> 'brouillon' then raise exception 'Cette demande est déjà publiée'; end if;
  if d.cahier is null then raise exception 'Le cahier des charges n''est pas encore prêt'; end if;
  select valeur into s from secrets_internes where cle = 'ia_signature';
  if d.ia_signature is null or d.ia_signature <> encode(hmac(convert_to(d.description, 'UTF8'), convert_to(s, 'UTF8'), 'sha256'), 'hex') then
    raise exception 'Votre demande ne semble pas concerner des travaux. Rénolien sert à trouver un artisan pour vos travaux : décrivez ce que vous voulez faire chez vous, puis relancez l''analyse.';
  end if;
  if coalesce(array_length(d.metiers, 1), 0) = 0 then raise exception 'Choisissez au moins un métier'; end if;
  if not exists (select 1 from demande_contacts c where c.demande_id = p_id and coalesce(c.telephone, c.email, '') <> '') then
    raise exception 'Ajoutez un téléphone ou un e-mail de contact';
  end if;
  update demandes set statut = 'ouverte', publiee_le = now(),
    ferme_le = now() + case when d.delai = 'urgent' then interval '48 hours' else interval '72 hours' end
    where id = p_id returning * into d;
  return d;
end $$;

-- Demandes masquées (signalées ou masquées par l'admin) : invisibles des artisans
create or replace function demande_visible_artisan(d demandes) returns boolean
language sql stable security definer set search_path = public as $$
  select d.statut = 'ouverte' and d.ferme_le > now() and not d.masquee and exists (
    select 1 from artisans a
    where a.id = auth.uid() and a.statut = 'actif'
      and d.departement = any(a.departements)
      and d.metiers && a.metiers
  );
$$;

create table if not exists signalements (
  demande_id uuid references demandes(id) on delete cascade,
  artisan_id uuid references artisans(id) on delete cascade,
  motif text,
  created_at timestamptz default now(),
  primary key (demande_id, artisan_id)
);
alter table signalements enable row level security;
drop policy if exists signalements_r on signalements;
create policy signalements_r on signalements for select using (artisan_id = auth.uid() or est_admin());

create or replace function signaler_demande(p_demande uuid, p_motif text default 'hors_sujet') returns int
language plpgsql security definer set search_path = public as $$
declare d demandes; n int;
begin
  select * into d from demandes where id = p_demande;
  if not found or not (demande_visible_artisan(d) or p_demande in (select mes_offres_demandes_ids())) then raise exception 'Demande introuvable'; end if;
  insert into signalements (demande_id, artisan_id, motif) values (p_demande, auth.uid(), left(coalesce(p_motif, 'hors_sujet'), 200)) on conflict do nothing;
  select count(*) into n from signalements where demande_id = p_demande;
  if n >= 2 then update demandes set masquee = true where id = p_demande; end if;
  return n;
end $$;

create or replace function admin_masquer_demande(p_demande uuid, p_masquee boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not est_admin() then raise exception 'Accès refusé'; end if;
  update demandes set masquee = p_masquee where id = p_demande;
end $$;
revoke execute on function admin_masquer_demande(uuid, boolean), signaler_demande(uuid, text) from public, anon;
grant execute on function admin_masquer_demande(uuid, boolean), signaler_demande(uuid, text) to authenticated;
