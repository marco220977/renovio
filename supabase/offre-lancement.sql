-- Offre de lancement : les 50 premiers artisans inscrits reçoivent 2 mois de formule illimitée.
alter table artisans add column if not exists offre_lancement boolean not null default false;
insert into reglages (cle, valeur) values ('offre_lancement', '{"actif": true, "places": 50, "formule": "illimite", "jours": 60}') on conflict (cle) do nothing;

create or replace function offre_lancement_nouvel_artisan() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb; n int;
begin
  select valeur into r from reglages where cle = 'offre_lancement' for update;  -- verrou : pas de 51e place en cas d'inscriptions simultanées
  if r is null or not coalesce((r->>'actif')::boolean, false) then return new; end if;
  select count(*) into n from artisans where offre_lancement;
  if n >= coalesce((r->>'places')::int, 0) then return new; end if;
  perform set_config('renovio.systeme', '1', true);
  update artisans set offre_lancement = true, abonnement = r->>'formule',
    abonnement_fin = greatest(coalesce(abonnement_fin, now()), now() + make_interval(days => (r->>'jours')::int))
    where id = new.id;
  perform set_config('renovio.systeme', '', true);
  return new;
end $$;
drop trigger if exists trg_offre_lancement on artisans;
create trigger trg_offre_lancement after insert on artisans for each row execute function offre_lancement_nouvel_artisan();
revoke execute on function offre_lancement_nouvel_artisan() from public, anon, authenticated;

-- Places restantes, lisible par tout le monde (pages publiques)
create or replace function places_lancement() returns int
language sql stable security definer set search_path = public as $$
  select case when coalesce((r.valeur->>'actif')::boolean, false)
    then greatest(0, coalesce((r.valeur->>'places')::int, 0) - (select count(*)::int from artisans where offre_lancement)) else 0 end
  from reglages r where r.cle = 'offre_lancement'
$$;
grant execute on function places_lancement() to anon, authenticated;

-- Protection de la colonne offre_lancement
create or replace function protege_artisan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('request.jwt.claims', true)::json->>'role', '') in ('authenticated', 'anon')
     and not est_admin() and coalesce(current_setting('renovio.systeme', true), '') <> '1' then
    if tg_op = 'INSERT' then
      new.verifie := false; new.statut := 'actif'; new.abonnement := 'gratuit'; new.abonnement_fin := null;
      new.stripe_customer_id := null; new.stripe_subscription_id := null; new.bonus_offres := 0;
      new.parrain_id := null; new.parrainage_recompense := false; new.code_parrain := nouveau_code_parrain(); new.offre_lancement := false;
    else
      new.verifie := old.verifie; new.statut := old.statut; new.abonnement := old.abonnement; new.abonnement_fin := old.abonnement_fin;
      new.stripe_customer_id := old.stripe_customer_id; new.stripe_subscription_id := old.stripe_subscription_id;
      new.bonus_offres := old.bonus_offres; new.parrain_id := old.parrain_id;
      new.parrainage_recompense := old.parrainage_recompense; new.code_parrain := old.code_parrain; new.offre_lancement := old.offre_lancement;
    end if;
  end if;
  return new;
end $$;
