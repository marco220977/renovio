-- Clics robots (20/11/2026) : les antivirus des messageries pro ouvrent les liens des e-mails dans les 2-3 minutes
-- qui suivent l'envoi. Ces « clics » faussaient les stats (51 sur 59) et bloquaient la relance des prospects concernés.
-- Un clic est compté comme robot s'il arrive moins de 3 minutes après le dernier envoi, ou si le lien est appelé par un robot connu.

alter table prospects add column if not exists email_clic_robot timestamptz;

create or replace function clic_robot(p prospects) returns boolean language sql stable as $$
  select p.email_dernier is not null and now() - p.email_dernier < interval '3 minutes'
$$;

drop function if exists prospect_action(text, text, text);
create or replace function prospect_action(p_siret text, p_jeton text, p_action text, p_robot boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare p prospects;
begin
  select * into p from prospects where siret = p_siret;
  if not found or jeton_prospect(p_siret) <> p_jeton then return null; end if;
  if p_action = 'desinscrire' then
    update prospects set desinscrit = true, statut = case when statut = 'inscrit' then statut else 'pas_interesse' end,
      note = trim(coalesce(note, '') || ' · Désinscrit des e-mails le ' || to_char(now(), 'DD/MM/YYYY')) where siret = p_siret;
  elsif p_action = 'clic' then
    if p_robot or clic_robot(p) then
      update prospects set email_clic_robot = coalesce(email_clic_robot, now()) where siret = p_siret;
    else
      update prospects set email_clic = coalesce(email_clic, now()), statut = case when statut in ('a_contacter', 'contacte') then 'interesse' else statut end where siret = p_siret;
    end if;
  end if;
  return coalesce(p.nom, 'ok');
end $$;
grant execute on function prospect_action(text, text, text, boolean) to anon, authenticated;

create or replace function preinscription_infos(p_siret text, p_jeton text)
returns json language plpgsql security definer set search_path = public as $$
declare p prospects;
begin
  select * into p from prospects where siret = p_siret;
  if not found or jeton_prospect(p_siret) <> p_jeton then return json_build_object('erreur', 'lien'); end if;
  if clic_robot(p) then
    update prospects set email_clic_robot = coalesce(email_clic_robot, now()) where siret = p_siret;
  else
    update prospects set pre_vu = coalesce(pre_vu, now()), email_clic = coalesce(email_clic, now()),
      statut = case when statut in ('a_contacter', 'contacte') then 'interesse' else statut end where siret = p_siret;
  end if;
  if exists (select 1 from artisans where siret = p_siret or left(siret, 9) = p.siren) then
    return json_build_object('deja', true, 'nom', p.nom);
  end if;
  return json_build_object(
    'nom', p.nom, 'dirigeant', p.dirigeant, 'forme', p.forme, 'adresse', p.adresse, 'cp', p.cp, 'ville', p.ville, 'dep', p.dep,
    'email', p.email, 'telephone', p.telephone, 'rge', p.rge, 'creation', p.creation,
    'metiers', metiers_devines(coalesce(p.metier, '') || ' ' || coalesce(p.domaines_rge, '')),
    'departements', case when p.dep is not null then array[p.dep] else '{}'::text[] end);
end $$;

-- Rattrapage : les clics déjà enregistrés moins de 3 minutes après un envoi passent en « robot »
-- (ces prospects redeviennent « contacté » et recevront la relance normalement).
update prospects p set email_clic_robot = p.email_clic, email_clic = null,
  pre_vu = case when p.pre_vu is not null and p.pre_vu - p.email_clic < interval '3 minutes' then null else p.pre_vu end,
  statut = case when p.statut = 'interesse' then 'contacte' else p.statut end
where p.email_clic is not null and p.statut <> 'inscrit'
  and exists (select 1 from prospects_emails e where e.siret = p.siret and e.erreur is null
              and p.email_clic >= e.envoye_le and p.email_clic - e.envoye_le < interval '3 minutes');

-- Stats : clics robots affichés à part
create or replace function stats_ab() returns json language sql stable security definer set search_path = public as $$
  select case when est_admin() then (
    with d as (select coalesce((valeur->>'ab_depuis')::date, '2000-01-01') depuis from reglages where cle = 'prospection'),
    c as (select p.* from prospects p, d where p.email_etape > 0
          and exists (select 1 from prospects_emails e where e.siret = p.siret and e.etape = 1 and e.erreur is null and e.envoye_le >= d.depuis))
    select coalesce(json_object_agg(v, x), '{}') from (
      select coalesce(version, 'A') v, json_build_object(
        'envoyes', count(*),
        'clics', count(*) filter (where email_clic is not null),
        'robots', count(*) filter (where email_clic_robot is not null and email_clic is null),
        'inscrits', count(*) filter (where statut = 'inscrit'),
        'desinscrits', count(*) filter (where desinscrit)) x
      from c group by 1
    ) s) end;
$$;

create or replace function stats_prospection() returns json language sql stable security definer set search_path = public as $$
  select case when est_admin() then json_build_object(
    'reglages', (select valeur from reglages where cle = 'prospection'),
    'avec_email', (select count(*) from prospects where email is not null and not hors_cible),
    'a_envoyer', (select count(*) from prospects where email is not null and not desinscrit and not hors_cible and statut in ('a_contacter','contacte','interesse') and email_etape = 0),
    'envoyes', (select count(*) from prospects_emails where erreur is null),
    'aujourdhui', (select count(*) from prospects_emails where erreur is null and envoye_le >= date_trunc('day', now())),
    'erreurs', (select count(*) from prospects_emails where erreur is not null),
    'clics', (select count(*) from prospects where email_clic is not null),
    'robots', (select count(*) from prospects where email_clic_robot is not null and email_clic is null),
    'desinscrits', (select count(*) from prospects where desinscrit),
    'inscrits', (select count(*) from prospects where statut = 'inscrit' and email_etape > 0),
    'hors_cible', (select count(*) from prospects where hors_cible),
    'cle_brevo', null
  ) end;
$$;
