-- Prospection déclenchée par une vraie demande (25/11/2026) :
-- quand un client publie une demande et que moins de 3 artisans inscrits peuvent y répondre,
-- les entreprises prospects du même département et du même métier reçoivent un e-mail
-- « Un client cherche un plombier à Créteil » (fonction prospection-mail, paramètre demande_id).

alter table prospects_emails add column if not exists demande_id uuid;
create index if not exists prospects_emails_envoye on prospects_emails (siret, envoye_le);

-- Motif de recherche (sur le métier Sirene ou les domaines RGE) pour chaque métier Rénolien
create or replace function metier_motif(m text) returns text language sql immutable as $$
  select case m
    when 'plomberie' then 'plomb|sanitaire|chauffe-eau|thermodyn'
    when 'chauffage' then 'chauff|pompe|clim|chaudi|po[eê]le|thermodyn'
    when 'electricite' then '[ée]lectri|photovolta'
    when 'maconnerie' then 'ma[cç]on|construction'
    when 'platrerie' then 'pl[aâ]tr'
    when 'isolation' then 'isol'
    when 'peinture' then 'peint'
    when 'carrelage' then 'carrel|sols'
    when 'sols' then 'carrel|sols'
    when 'menuiserie' then 'menuis|fen[eê]tre|volet'
    when 'couverture' then 'couvert|charpente|toiture'
    when 'facade' then 'fa[cç]ade|[ée]tanch|murs par l.ext'
    when 'agencement' then 'plomb|carrel|finitions|multiservice'
    when 'exterieur' then 'terrass|ma[cç]on'
    when 'multiservice' then 'finitions|multiservice'
  end
$$;

-- Prospects à contacter pour une demande : même département, métier correspondant, e-mail connu,
-- pas désinscrit, pas déjà inscrit, rien reçu depuis 3 jours, jamais contacté pour cette demande. Même ville d'abord.
create or replace function prospects_pour_demande(p_demande uuid, p_limite int default 25)
returns setof prospects language sql stable security definer set search_path = public as $$
  select p.* from prospects p, demandes d
  where d.id = p_demande and p.dep = d.departement and p.email is not null
    and not p.desinscrit and not p.hors_cible and p.statut in ('a_contacter', 'contacte', 'interesse')
    and coalesce(p.metier, '') || ' ' || coalesce(p.domaines_rge, '') !~* 'architect|audit|[ée]tude'
    and exists (select 1 from unnest(d.metiers) m where coalesce(p.metier, '') || ' ' || coalesce(p.domaines_rge, '') ~* metier_motif(m))
    and not exists (select 1 from prospects_emails e where e.siret = p.siret and (e.envoye_le > now() - interval '3 days' or e.demande_id = p_demande))
  order by (p.cp = d.cp) desc, p.rge desc, p.creation desc nulls last
  limit p_limite
$$;
revoke execute on function prospects_pour_demande(uuid, int) from public, anon, authenticated;

-- Appel de la fonction d'envoi (même jeton que la prospection quotidienne)
create or replace function lancer_prospection_demande(p_demande uuid) returns bigint
language sql security definer set search_path = public, extensions as $$
  select net.http_post('https://gbwtoleofzvmicdjwdwz.supabase.co/functions/v1/prospection-mail',
    jsonb_build_object('demande_id', p_demande), '{}'::jsonb,
    jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select valeur from secrets_internes where cle = 'cron_prospection')),
    140000);
$$;
revoke execute on function lancer_prospection_demande(uuid) from public, anon, authenticated;

-- À la publication : moins de 3 artisans inscrits pour cette demande → prospection ciblée (jamais pour les comptes de test)
create or replace function prospection_sur_demande() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if new.statut = 'ouverte' and old.statut = 'brouillon' and not new.masquee and not est_test(new.client_id) then
    select count(*) into n from artisans a where a.statut = 'actif' and new.departement = any(a.departements)
      and new.metiers && a.metiers and not est_test(a.id);
    if n < 3 then perform lancer_prospection_demande(new.id); end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_prospection_demande on demandes;
create trigger trg_prospection_demande after update of statut on demandes for each row execute function prospection_sur_demande();
