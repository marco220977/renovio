-- Prospection artisans (12/11/2026) : entreprises du bâtiment créées depuis moins de 2 ans en Île-de-France,
-- tirées du répertoire Sirene (INSEE, via public.opendatasoft.com), enrichies des contacts publiés au registre RGE (ADEME).
-- Visible uniquement par l'administrateur. Mise à jour automatique chaque lundi.

create extension if not exists pg_net;

create table if not exists prospects (
  siret text primary key,
  siren text,
  nom text,
  dirigeant text,
  naf text,
  metier text,
  adresse text,
  cp text,
  ville text,
  dep text,
  creation date,
  effectif text,
  forme text,
  rge boolean not null default false,
  telephone text,
  email text,
  statut text not null default 'a_contacter' check (statut in ('a_contacter', 'contacte', 'interesse', 'inscrit', 'pas_interesse')),
  note text,
  vu_le timestamptz default now(),
  maj_le timestamptz default now()
);
create index if not exists prospects_dep on prospects (dep);
create index if not exists prospects_metier on prospects (metier);
alter table prospects enable row level security;
drop policy if exists prospects_admin on prospects;
create policy prospects_admin on prospects for all using (est_admin()) with check (est_admin());

create table if not exists prospects_requetes (id bigint primary key, source text, dep text, cree_le timestamptz default now(), traite boolean default false);
alter table prospects_requetes enable row level security;

create or replace function naf_metier(c text) returns text language sql immutable as $$
  select case c
    when '43.22A' then 'Plomberie' when '43.22B' then 'Chauffage / clim' when '43.21A' then 'Électricité'
    when '43.99C' then 'Maçonnerie' when '41.20A' then 'Construction maisons' when '43.31Z' then 'Plâtrerie'
    when '43.29A' then 'Isolation' when '43.34Z' then 'Peinture / vitrerie' when '43.33Z' then 'Carrelage / sols'
    when '43.32A' then 'Menuiserie bois-PVC' when '43.32B' then 'Menuiserie métal / serrurerie' when '43.91A' then 'Charpente'
    when '43.91B' then 'Couverture' when '43.12A' then 'Terrassement' when '43.39Z' then 'Finitions / multiservice'
    when '43.29B' then 'Autres installations' when '43.99A' then 'Étanchéité / façade' else c end
$$;

-- 1. Envoie les requêtes (une par département + registre RGE)
create or replace function prospects_demander() returns int language plpgsql security definer set search_path = public, extensions as $$
declare d text; id bigint; n int := 0;
  base text := 'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/economicref-france-sirene-v3/exports/json';
  champs text := 'siret,siren,denominationunitelegale,nomunitelegale,prenomusuelunitelegale,prenom1unitelegale,enseigne1etablissement,denominationusuelleetablissement,activiteprincipaleetablissement,numerovoieetablissement,indicerepetitionetablissement,typevoieetablissement,libellevoieetablissement,codepostaletablissement,libellecommuneetablissement,codedepartementetablissement,datecreationunitelegale,trancheeffectifsunitelegale,categoriejuridiqueunitelegale';
  w text;
begin
  if not (est_admin() or coalesce(current_setting('request.jwt.claims', true), '') in ('', '{}')) then raise exception 'Accès refusé'; end if;
  foreach d in array array['75','77','91','92','93','94','95'] loop
    w := format('datecreationunitelegale >= date''%s'' and etatadministratifunitelegale = "Active" and statutdiffusionunitelegale = "O" and etatadministratifetablissement = "Actif" and codedepartementetablissement = "%s" and activiteprincipaleetablissement in ("43.22A","43.22B","43.21A","43.99C","41.20A","43.31Z","43.29A","43.34Z","43.33Z","43.32A","43.32B","43.91A","43.91B","43.12A","43.39Z","43.29B","43.99A")',
                to_char(current_date - interval '2 years', 'YYYY-MM-DD'), d);
    select net.http_get(base || '?select=' || champs || '&where=' || replace(replace(replace(replace(replace(w, '%', '%25'), ' ', '%20'), '"', '%22'), '''', '%27'), '>', '%3E'), timeout_milliseconds => 120000) into id;
    insert into prospects_requetes (id, source, dep) values (id, 'sirene', d); n := n + 1;
    select net.http_get('https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines?size=10000&select=siret,telephone,email&qs=' || 'code_postal:' || d || '*', timeout_milliseconds => 120000) into id;
    insert into prospects_requetes (id, source, dep) values (id, 'rge', d); n := n + 1;
  end loop;
  return n;
end $$;

-- 2. Intègre les réponses reçues
create or replace function prospects_integrer() returns json language plpgsql security definer set search_path = public, extensions as $$
declare r record; resp record; ajout int := 0; rge int := 0; erreurs int := 0;
begin
  if not (est_admin() or coalesce(current_setting('request.jwt.claims', true), '') in ('', '{}')) then raise exception 'Accès refusé'; end if;
  for r in select * from prospects_requetes where not traite order by source desc loop  -- sirene avant rge
    select status_code, content into resp from net._http_response where id = r.id;
    if not found then continue; end if;
    if resp.status_code <> 200 then erreurs := erreurs + 1; update prospects_requetes set traite = true where id = r.id; continue; end if;
    if r.source = 'sirene' then
      insert into prospects as p (siret, siren, nom, dirigeant, naf, metier, adresse, cp, ville, dep, creation, effectif, forme, vu_le, maj_le)
      select x->>'siret', x->>'siren',
        coalesce(nullif(x->>'denominationunitelegale', ''), nullif(x->>'enseigne1etablissement', ''), nullif(x->>'denominationusuelleetablissement', ''),
                 trim(coalesce(x->>'prenomusuelunitelegale', x->>'prenom1unitelegale', '') || ' ' || coalesce(x->>'nomunitelegale', ''))),
        case when x->>'categoriejuridiqueunitelegale' = '1000' then initcap(trim(coalesce(x->>'prenomusuelunitelegale', x->>'prenom1unitelegale', '') || ' ' || coalesce(x->>'nomunitelegale', ''))) end,
        x->>'activiteprincipaleetablissement', naf_metier(x->>'activiteprincipaleetablissement'),
        initcap(trim(concat_ws(' ', x->>'numerovoieetablissement', x->>'indicerepetitionetablissement', x->>'typevoieetablissement', x->>'libellevoieetablissement'))),
        x->>'codepostaletablissement', initcap(x->>'libellecommuneetablissement'), x->>'codedepartementetablissement',
        (x->>'datecreationunitelegale')::date, x->>'trancheeffectifsunitelegale',
        case x->>'categoriejuridiqueunitelegale' when '1000' then 'EI' when '5499' then 'SARL' when '5498' then 'EURL' when '5710' then 'SAS' when '5720' then 'SASU' else x->>'categoriejuridiqueunitelegale' end,
        now(), now()
      from jsonb_array_elements(replace(resp.content, '\u0000', '')::jsonb) x
      where x->>'siret' is not null and coalesce(x->>'codepostaletablissement', '') !~* 'nd' and coalesce(x->>'nomunitelegale', '') <> '[ND]'
      on conflict (siret) do update set nom = excluded.nom, dirigeant = excluded.dirigeant, naf = excluded.naf, metier = excluded.metier,
        adresse = excluded.adresse, cp = excluded.cp, ville = excluded.ville, effectif = excluded.effectif, vu_le = now();
      get diagnostics ajout = row_count;
    else
      update prospects p set rge = true,
        telephone = coalesce(nullif(x->>'telephone', ''), p.telephone), email = coalesce(nullif(lower(x->>'email'), ''), p.email)
      from jsonb_array_elements(replace(resp.content, '\u0000', '')::jsonb->'results') x
      where p.siret = x->>'siret';
      get diagnostics rge = row_count;
    end if;
    update prospects_requetes set traite = true where id = r.id;
  end loop;
  -- Déjà inscrits sur Rénolien
  update prospects p set statut = 'inscrit' where statut <> 'inscrit' and exists (select 1 from artisans a where a.siret = p.siret or left(a.siret, 9) = p.siren);
  return json_build_object('prospects', (select count(*) from prospects), 'avec_contact', (select count(*) from prospects where telephone is not null or email is not null), 'erreurs', erreurs);
end $$;
revoke execute on function prospects_demander(), prospects_integrer() from public, anon;
grant execute on function prospects_demander(), prospects_integrer() to authenticated;

select cron.unschedule(jobid) from cron.job where jobname in ('prospects-demander', 'prospects-integrer');
select cron.schedule('prospects-demander', '0 4 * * 1', 'select public.prospects_demander()');
select cron.schedule('prospects-integrer', '15 4 * * 1', 'select public.prospects_integrer()');
