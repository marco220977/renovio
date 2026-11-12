-- Formule 2 (12/11/2026) : l'artisan paie au client qui le choisit, plus à l'offre envoyée.
--  Crédits « clients par mois » : Découverte 1, Essentiel 4, Pro 12, Illimité sans limite.
--  Offres en attente en même temps : 5, 15, 40, sans limite.
--  Crédit consommé quand le client choisit l'offre, rendu si le client renonce avant la visite.

alter table offres add column if not exists credit text check (credit in ('quota', 'bonus', 'hors_quota'));
alter table offres add column if not exists credit_le timestamptz;

create or replace function quota_clients(p text) returns int language sql immutable as $$
  select case p when 'gratuit' then 1 when 'essentiel' then 4 when 'pro' then 12 else null end;
$$;
create or replace function plafond_attente(p text) returns int language sql immutable as $$
  select case p when 'gratuit' then 5 when 'essentiel' then 15 when 'pro' then 40 else null end;
$$;
-- Ancienne fonction gardée pour compatibilité : renvoie désormais le quota de clients
create or replace function quota_offres(p text) returns int language sql immutable as $$ select quota_clients(p) $$;

create or replace function clients_du_mois(p_artisan uuid) returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from offres where artisan_id = p_artisan and credit in ('quota', 'hors_quota') and credit_le >= date_trunc('month', now());
$$;
create or replace function offres_en_attente(p_artisan uuid) returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from offres o join demandes d on d.id = o.demande_id
  where o.artisan_id = p_artisan and o.statut = 'envoyee' and d.statut in ('ouverte', 'fermee')
    and o.updated_at + make_interval(days => coalesce(o.validite_jours, 30)) > now();
$$;

-- Avant une nouvelle offre : plafond d'offres en attente + crédits clients restants
create or replace function controle_envoi(a artisans) returns void language plpgsql stable security definer set search_path = public as $$
declare f text := formule_active(a); q int := quota_clients(f); p int := plafond_attente(f);
begin
  if p is not null and offres_en_attente(a.id) >= p then
    raise exception 'Vous avez déjà % offres en attente de réponse (maximum de votre formule). Attendez une réponse ou passez à une formule supérieure dans « Abonnement ».', p;
  end if;
  if q is not null and clients_du_mois(a.id) >= q and a.bonus_offres <= 0 then
    raise exception 'Limite de votre formule atteinte : % client(s) ce mois-ci. Passez à une formule supérieure dans « Abonnement » ou attendez le mois prochain.', q;
  end if;
end $$;

-- Le client choisit l'artisan : un crédit est consommé (quota du mois, sinon bonus, sinon noté hors quota)
create or replace function consommer_credit(p_offre uuid) returns void language plpgsql security definer set search_path = public as $$
declare o offres; a artisans; q int; c text;
begin
  select * into o from offres where id = p_offre for update;
  if o.credit is not null then return; end if;
  select * into a from artisans where id = o.artisan_id for update;
  q := quota_clients(formule_active(a));
  if q is null or clients_du_mois(a.id) < q then c := 'quota';
  elsif a.bonus_offres > 0 then
    c := 'bonus';
    perform set_config('renovio.systeme', '1', true);
    update artisans set bonus_offres = bonus_offres - 1 where id = a.id;
    perform set_config('renovio.systeme', '', true);
  else c := 'hors_quota';
  end if;
  update offres set credit = c, credit_le = now() where id = p_offre;
end $$;

-- Le client renonce avant la visite : le crédit est rendu
create or replace function rendre_credit(p_offre uuid) returns void language plpgsql security definer set search_path = public as $$
declare o offres;
begin
  select * into o from offres where id = p_offre for update;
  if o.credit = 'bonus' then
    perform set_config('renovio.systeme', '1', true);
    update artisans set bonus_offres = bonus_offres + 1 where id = o.artisan_id;
    perform set_config('renovio.systeme', '', true);
  end if;
  update offres set credit = null, credit_le = null where id = p_offre;
end $$;
revoke execute on function controle_envoi(artisans), consommer_credit(uuid), rendre_credit(uuid), clients_du_mois(uuid), offres_en_attente(uuid) from public, anon, authenticated;

create or replace function mon_quota() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'abonnement', formule_active(a), 'fin', case when formule_active(a) <> 'gratuit' then a.abonnement_fin end,
    'quota', quota_clients(formule_active(a)), 'utilise', clients_du_mois(a.id), 'bonus', a.bonus_offres,
    'attente', offres_en_attente(a.id), 'plafond', plafond_attente(formule_active(a)),
    'resilie', a.abonnement_resilie, 'stripe', a.stripe_subscription_id is not null
  ) from artisans a where a.id = auth.uid();
$$;

-- Nouvelle offre : contrôle du plafond et des crédits (s'applique aussi à l'ancienne version de l'appli)
do $$
declare def text := pg_get_functiondef('envoyer_offre'::regproc);
begin
  if position('controle_envoi' in def) = 0 then
    def := replace(def, '  select count(*) into n from offres where demande_id = p_demande and statut <> ''retiree'';',
                        '  perform controle_envoi(a);' || chr(10) || '  select count(*) into n from offres where demande_id = p_demande and statut <> ''retiree'';');
    if position('controle_envoi' in def) = 0 then raise exception 'envoyer_offre : point d''insertion introuvable'; end if;
    execute def;
  end if;
end $$;

create or replace function envoyer_offre_v2(p_demande uuid, p_lignes jsonb, p_delai int, p_duree int, p_message text, p_validite int default 30)
returns offres
language plpgsql security definer set search_path = public as $$
declare a artisans; o offres;
begin
  select * into a from artisans where id = auth.uid();
  o := envoyer_offre(p_demande, p_lignes, p_delai, p_duree, p_message, p_validite);
  -- Parrainage : le parrain gagne 2 clients offerts à la 1re offre de son filleul
  if a.parrain_id is not null and not a.parrainage_recompense then
    perform set_config('renovio.systeme', '1', true);
    update artisans set bonus_offres = bonus_offres + 2 where id = a.parrain_id;
    update artisans set parrainage_recompense = true where id = a.id;
    perform set_config('renovio.systeme', '', true);
  end if;
  return o;
end $$;

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
  update offres set statut = 'choisie', choisie_le = now(), updated_at = now() where id = p_offre;
  update demandes set statut = 'en_cours' where id = d.id;
  perform consommer_credit(p_offre);
  select * into o from offres where id = p_offre;
  return o;
end $$;

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
  update offres set statut = 'acceptee', signe_le = now(), signataire = trim(p_nom), signature = p_signature, updated_at = now() where id = p_offre;
  update offres set statut = 'refusee', updated_at = now() where demande_id = d.id and id <> p_offre and statut = 'envoyee';
  update demandes set statut = 'attribuee' where id = d.id;
  perform consommer_credit(p_offre);
  select * into o from offres where id = p_offre;
  return o;
end $$;

create or replace function renoncer_choix(p_offre uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o offres; d demandes;
begin
  select * into o from offres where id = p_offre for update;
  select * into d from demandes where id = o.demande_id;
  if d.client_id <> auth.uid() then raise exception 'Accès refusé'; end if;
  if o.statut not in ('choisie', 'confirmee') then raise exception 'Rien à annuler'; end if;
  update offres set statut = 'refusee', updated_at = now() where id = p_offre;
  -- Avant la visite (devis définitif pas encore envoyé) : l'artisan récupère son crédit
  if o.statut = 'choisie' then perform rendre_credit(p_offre); end if;
  perform remettre_en_jeu(d.id);
end $$;

-- Parrainage : le filleul reçoit 1 client offert (au lieu de 3 offres)
do $$
declare def text := pg_get_functiondef('handle_new_user'::regproc);
begin
  if position('then 3 else 0' in def) > 0 then execute replace(def, 'then 3 else 0', 'then 1 else 0'); end if;
end $$;

-- Bonus existants convertis : 3 offres ≈ 1 client
select set_config('renovio.systeme', '1', true);
update artisans set bonus_offres = ceil(bonus_offres / 3.0) where bonus_offres > 0;
