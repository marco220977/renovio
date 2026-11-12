-- Offres « en pause » (12/11/2026) : quand l'artisan a utilisé tous ses crédits clients du mois,
-- ses offres en attente sont cachées aux clients et ne prennent plus de place dans les 5 offres de la demande.
-- Elles reviennent dès qu'il a de nouveau un crédit (nouveau mois, formule, client offert, crédit rendu).

alter table offres add column if not exists en_pause boolean not null default false;
alter table offres add column if not exists pause_le timestamptz;

create or replace function artisan_epuise(p_artisan uuid) returns boolean language sql stable security definer set search_path = public as $$
  select quota_clients(formule_active(a)) is not null
     and clients_du_mois(a.id) >= quota_clients(formule_active(a))
     and a.bonus_offres <= 0
  from artisans a where a.id = p_artisan;
$$;

-- Place prise dans les 5 offres d'une demande : toutes sauf retirées et en pause
create or replace function places_prises(p_demande uuid) returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from offres where demande_id = p_demande and statut <> 'retiree' and not en_pause;
$$;

create or replace function remettre_en_jeu(p_demande uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d demandes;
begin
  select * into d from demandes where id = p_demande;
  update demandes set statut = case when d.ferme_le > now() and places_prises(p_demande) < 5 then 'ouverte' else 'fermee' end where id = p_demande;
end $$;

-- Met en pause ou réactive les offres d'un artisan selon ses crédits
create or replace function maj_pause(p_artisan uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o record;
begin
  if coalesce(artisan_epuise(p_artisan), false) then
    for o in update offres set en_pause = true, pause_le = now()
               where artisan_id = p_artisan and statut = 'envoyee' and not en_pause returning demande_id loop
      if (select statut from demandes where id = o.demande_id) in ('ouverte', 'fermee') then perform remettre_en_jeu(o.demande_id); end if;
    end loop;
  else
    for o in select f.id, f.demande_id, f.pause_le from offres f join demandes d on d.id = f.demande_id
               where f.artisan_id = p_artisan and f.en_pause and f.statut = 'envoyee' order by f.created_at loop
      if (select statut from demandes where id = o.demande_id) in ('ouverte', 'fermee') and places_prises(o.demande_id) < 5 then
        -- le temps passé en pause ne compte pas dans la validité de l'offre
        update offres set en_pause = false, pause_le = null, updated_at = updated_at + (now() - coalesce(o.pause_le, now())) where id = o.id;
        if places_prises(o.demande_id) >= 5 then update demandes set statut = 'fermee' where id = o.demande_id and statut = 'ouverte'; end if;
      end if;
    end loop;
  end if;
end $$;

-- Choix d'une offre : impossible si elle est en pause ou si l'artisan n'a plus de crédit (deux clients en même temps)
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
  else
    raise exception 'Cet artisan n''est plus disponible pour le moment. Choisissez une autre offre.';
  end if;
  update offres set credit = c, credit_le = now() where id = p_offre;
  perform maj_pause(a.id);
end $$;

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
  perform maj_pause(o.artisan_id);
end $$;

do $$
declare def text;
begin
  -- choisir_offre / accepter_offre : une offre en pause ne peut pas être choisie
  def := pg_get_functiondef('choisir_offre'::regproc);
  if position('en_pause' in def) = 0 then
    execute replace(def, '  if o.statut <> ''envoyee'' then raise exception ''Cette offre n''''est plus disponible''; end if;',
                         '  if o.statut <> ''envoyee'' or o.en_pause then raise exception ''Cette offre n''''est plus disponible''; end if;');
  end if;
  def := pg_get_functiondef('accepter_offre'::regproc);
  if position('en_pause' in def) = 0 then
    execute replace(def, '  if o.statut <> ''envoyee'' then raise exception ''Cette offre n''''est plus disponible''; end if;',
                         '  if o.statut <> ''envoyee'' or o.en_pause then raise exception ''Cette offre n''''est plus disponible''; end if;');
  end if;
  -- envoyer_offre : les offres en pause ne comptent pas dans les 5
  def := pg_get_functiondef('envoyer_offre'::regproc);
  if position('places_prises' in def) = 0 then
    execute replace(def, 'select count(*) into n from offres where demande_id = p_demande and statut <> ''retiree'';',
                         'n := places_prises(p_demande);');
  end if;
  if position('en_pause' in pg_get_functiondef('choisir_offre'::regproc)) = 0
     or position('en_pause' in pg_get_functiondef('accepter_offre'::regproc)) = 0
     or position('places_prises' in pg_get_functiondef('envoyer_offre'::regproc)) = 0 then
    raise exception 'Mise à jour incomplète des fonctions';
  end if;
end $$;

-- Le client ne voit pas les offres en pause
drop policy if exists offres_r on offres;
create policy offres_r on offres for select using (
  artisan_id = auth.uid() or est_admin()
  or (demande_id in (select mes_demandes_ids()) and not en_pause)
);

-- Changement de formule, client offert, fin d'essai : mise à jour immédiate
create or replace function trg_artisan_pause() returns trigger language plpgsql security definer set search_path = public as $$
begin perform maj_pause(new.id); return new; end $$;
drop trigger if exists trg_artisan_pause on artisans;
create trigger trg_artisan_pause after update of abonnement, abonnement_fin, bonus_offres on artisans for each row execute function trg_artisan_pause();

-- Chaque nuit (nouveau mois, formule expirée) : mise à jour de tous les artisans concernés
create or replace function maj_pauses() returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select distinct artisan_id from offres where statut = 'envoyee' loop perform maj_pause(r.artisan_id); end loop;
end $$;
select cron.unschedule(jobid) from cron.job where jobname = 'maj-pauses';
select cron.schedule('maj-pauses', '5 0 * * *', 'select public.maj_pauses()');

revoke execute on function maj_pause(uuid), maj_pauses(), artisan_epuise(uuid), trg_artisan_pause() from public, anon, authenticated;

create or replace function mon_quota() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'abonnement', formule_active(a), 'fin', case when formule_active(a) <> 'gratuit' then a.abonnement_fin end,
    'quota', quota_clients(formule_active(a)), 'utilise', clients_du_mois(a.id), 'bonus', a.bonus_offres,
    'attente', offres_en_attente(a.id), 'plafond', plafond_attente(formule_active(a)),
    'en_pause', (select count(*) from offres o where o.artisan_id = a.id and o.en_pause and o.statut = 'envoyee'),
    'resilie', a.abonnement_resilie, 'stripe', a.stripe_subscription_id is not null
  ) from artisans a where a.id = auth.uid();
$$;
