-- Vitrine publique des artisans (/pro/<slug>) et photos de réalisations (25/11/2026)

-- 1) Adresse de la vitrine : slug unique tiré du nom et de la ville
alter table artisans add column if not exists slug text;
create unique index if not exists artisans_slug on artisans (slug);

create or replace function slugifier(t text) returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(translate(coalesce(t, ''),
    'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖòóôõöÙÚÛÜùúûüÝýÿŒœÆæ''',
    'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOoooooUUUUuuuuYyyOoAa-')), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function slug_artisan() returns trigger language plpgsql security definer set search_path = public as $$
declare base text; s text; i int := 1;
begin
  -- Calculé une seule fois (l'adresse de la vitrine ne change pas si l'artisan modifie son nom)
  if new.slug is null or new.slug = '' or (new.slug ~ '^artisan(-[0-9]+)?$' and coalesce(new.raison_sociale, '') <> '') then
    base := left(slugifier(regexp_replace(coalesce(new.raison_sociale, 'artisan'), '\s*\(.*\)\s*', ' ', 'g') || ' ' || coalesce(new.ville, '')), 70);
    if base = '' or coalesce(trim(new.raison_sociale), '') = '' then base := 'artisan'; end if;
    s := base;
    while exists (select 1 from artisans where slug = s and id <> new.id) loop i := i + 1; s := base || '-' || i; end loop;
    new.slug := s;
  end if;
  return new;
end $$;
drop trigger if exists trg_slug_artisan on artisans;
create trigger trg_slug_artisan before insert or update of slug, raison_sociale, ville on artisans for each row execute function slug_artisan();
update artisans set slug = null where slug is null; -- déclenche le calcul pour les artisans existants

-- 2) Photos de réalisations : 12 maximum, publiées après validation de l'administrateur
create table if not exists realisations (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null default auth.uid() references artisans(id) on delete cascade,
  created_at timestamptz not null default now(),
  chemin text not null,
  avant text,
  legende text check (char_length(legende) <= 120),
  metier text,
  ville text check (char_length(ville) <= 60),
  ordre int not null default 0,
  statut text not null default 'attente' check (statut in ('attente', 'publiee', 'refusee')),
  motif text,
  certifie boolean not null default false check (certifie)
);
create index if not exists realisations_artisan on realisations (artisan_id, ordre);
alter table realisations enable row level security;

drop policy if exists realisations_r on realisations;
create policy realisations_r on realisations for select using (statut = 'publiee' or artisan_id = auth.uid() or est_admin());
drop policy if exists realisations_i on realisations;
create policy realisations_i on realisations for insert to authenticated with check (artisan_id = auth.uid() and exists (select 1 from artisans where id = auth.uid()));
drop policy if exists realisations_u on realisations;
create policy realisations_u on realisations for update to authenticated using (artisan_id = auth.uid() or est_admin());
drop policy if exists realisations_d on realisations;
create policy realisations_d on realisations for delete to authenticated using (artisan_id = auth.uid() or est_admin());

-- L'artisan ne choisit pas le statut : toute photo nouvelle ou modifiée repasse « en attente » ; 12 photos maximum
create or replace function protege_realisation() returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if est_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if (select count(*) from realisations where artisan_id = new.artisan_id) >= 12 then
      raise exception 'Vous avez déjà 12 photos : supprimez-en une pour en ajouter une autre.';
    end if;
    if new.chemin not like new.artisan_id::text || '/%' or (new.avant is not null and new.avant not like new.artisan_id::text || '/%') then
      raise exception 'Photo invalide';
    end if;
    new.statut := 'attente'; new.motif := null;
    for a in select id from profils where role = 'admin' loop
      perform notifier(a.id, 'admin', '📷 Photos de réalisations à valider', 'Un artisan a ajouté des photos à sa vitrine.', '/admin', 'photos:' || new.artisan_id, interval '1 hour');
    end loop;
  else
    new.artisan_id := old.artisan_id; new.chemin := old.chemin; new.avant := old.avant; new.certifie := old.certifie;
    if new.legende is distinct from old.legende or new.ville is distinct from old.ville or new.metier is distinct from old.metier then
      new.statut := 'attente'; new.motif := null;
    else
      new.statut := old.statut; new.motif := old.motif;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_protege_realisation on realisations;
create trigger trg_protege_realisation before insert or update on realisations for each row execute function protege_realisation();

-- Stockage public des photos (lecture par tous, écriture dans son propre dossier)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('realisations', 'realisations', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
drop policy if exists realisations_up on storage.objects;
create policy realisations_up on storage.objects for insert to authenticated
  with check (bucket_id = 'realisations' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists realisations_del on storage.objects;
create policy realisations_del on storage.objects for delete to authenticated
  using (bucket_id = 'realisations' and ((storage.foldername(name))[1] = auth.uid()::text or est_admin()));

-- 3) Données publiques de la vitrine (rien de privé : pas de téléphone, d'e-mail ni d'adresse)
-- Visible par tous si l'artisan est vérifié et actif ; sinon seulement par lui-même (aperçu) et l'administrateur.
create or replace function vitrine(p_slug text) returns json language plpgsql stable security definer set search_path = public as $$
declare a artisans; res json;
begin
  select * into a from artisans where slug = p_slug;
  if not found or a.statut <> 'actif' then return null; end if;
  if not (a.verifie or coalesce(a.id = auth.uid(), false) or est_admin()) then return null; end if;
  select json_build_object(
    'id', a.id, 'slug', a.slug, 'raison_sociale', a.raison_sociale, 'forme', a.forme, 'ville', a.ville, 'cp', a.cp,
    'metiers', a.metiers, 'departements', a.departements, 'presentation', a.presentation, 'membre_depuis', a.created_at,
    'verifie', a.verifie, 'siret', length(regexp_replace(coalesce(a.siret, ''), '\D', '', 'g')) = 14, 'rge', a.rge, 'fondateur', a.fondateur,
    'decennale_analyse', case when a.decennale_analyse is not null then json_build_object('date_fin', a.decennale_analyse->>'date_fin') end,
    'decennale_fin', a.decennale_fin,
    'rcpro_analyse', case when a.rcpro_analyse is not null then json_build_object('valide', (a.rcpro_analyse->>'valide')::boolean, 'date_fin', a.rcpro_analyse->>'date_fin') end,
    'rcpro_fin', a.rcpro_fin,
    'apercu', not a.verifie, 'test', est_test(a.id),
    'note', (select round(avg(note)::numeric, 1) from avis where artisan_id = a.id),
    'nb_avis', (select count(*) from avis where artisan_id = a.id),
    'avis', (select coalesce(json_agg(x order by x.created_at desc), '[]') from (
      select v.note, v.commentaire, v.created_at, d.ville, d.titre from avis v join demandes d on d.id = v.demande_id
      where v.artisan_id = a.id order by v.created_at desc limit 20) x),
    'chantiers', (select count(*) from offres where artisan_id = a.id and statut = 'acceptee'),
    'realisations', (select coalesce(json_agg(json_build_object('id', r.id, 'chemin', r.chemin, 'avant', r.avant, 'legende', r.legende, 'metier', r.metier, 'ville', r.ville)
      order by r.ordre, r.created_at), '[]') from realisations r where r.artisan_id = a.id and r.statut = 'publiee')
  ) into res;
  return res;
end $$;
grant execute on function vitrine(text) to anon, authenticated;

-- Vitrines publiques (plan du site, listes par ville)
create or replace function vitrines_publiques() returns table (slug text, raison_sociale text, ville text, cp text, metiers text[], departements text[], rge boolean, maj timestamptz)
language sql stable security definer set search_path = public as $$
  select a.slug, a.raison_sociale, a.ville, a.cp, a.metiers, a.departements, a.rge,
         greatest(a.created_at, (select max(created_at) from realisations r where r.artisan_id = a.id and r.statut = 'publiee'))
  from artisans a where a.verifie and a.statut = 'actif' and a.slug is not null and not est_test(a.id)
$$;
grant execute on function vitrines_publiques() to anon, authenticated;

-- 4) « Demander un devis à cet artisan » : l'artisan invité est prévenu en priorité
alter table demandes add column if not exists artisan_invite uuid references artisans(id) on delete set null;

create or replace function notif_demande() returns trigger language plpgsql security definer set search_path = public as $$
declare a record; t text := coalesce(nullif(new.titre, ''), 'Nouveau projet');
begin
  if new.statut = 'ouverte' and old.statut = 'brouillon' and not new.masquee then
    for a in select id from artisans where statut = 'actif' and new.departement = any(departements) and new.metiers && metiers
               and id <> new.client_id and not coalesce(artisan_epuise(id), false)
               and est_test(id) = est_test(new.client_id)
             order by (id = new.artisan_invite) desc loop
      if a.id = new.artisan_invite then
        perform notifier(a.id, 'demande', '⭐ Un client vous a choisi depuis votre vitrine : ' || t,
          coalesce(new.ville, '') || ' (' || new.cp || '). Il souhaite votre devis : répondez avant le ' || to_char(new.ferme_le at time zone 'Europe/Paris', 'DD/MM à HH24"h"MI') || '.',
          '/artisan/demande/' || new.id);
      else
        perform notifier(a.id, 'demande', '🔔 Nouvelle demande : ' || t,
          coalesce(new.ville, '') || ' (' || new.cp || '). Répondez avant le ' || to_char(new.ferme_le at time zone 'Europe/Paris', 'DD/MM à HH24"h"MI') || '.',
          '/artisan/demande/' || new.id);
      end if;
    end loop;
  end if;
  return new;
end $$;
