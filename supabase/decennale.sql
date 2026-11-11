-- Contrôle des attestations décennales : analyse par l'IA + badge retiré à l'expiration.
alter table artisans add column if not exists decennale_analyse jsonb;

-- Fin de validité retenue : celle lue par l'IA sur l'attestation, sinon celle saisie par l'artisan
create or replace function decennale_fin_effective(a artisans) returns date language sql stable as $$
  select coalesce(nullif(a.decennale_analyse->>'date_fin', '')::date, a.decennale_fin::date)
$$;

-- L'artisan ne peut pas modifier l'analyse lui-même
create or replace function protege_artisan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('request.jwt.claims', true)::json->>'role', '') in ('authenticated', 'anon')
     and not est_admin() and coalesce(current_setting('renovio.systeme', true), '') <> '1' then
    if tg_op = 'INSERT' then
      new.verifie := false; new.statut := 'actif'; new.abonnement := 'gratuit'; new.abonnement_fin := null;
      new.stripe_customer_id := null; new.stripe_subscription_id := null; new.bonus_offres := 0;
      new.parrain_id := null; new.parrainage_recompense := false; new.code_parrain := nouveau_code_parrain(); new.offre_lancement := false;
      new.decennale_analyse := null;
    else
      new.verifie := old.verifie; new.statut := old.statut; new.abonnement := old.abonnement; new.abonnement_fin := old.abonnement_fin;
      new.stripe_customer_id := old.stripe_customer_id; new.stripe_subscription_id := old.stripe_subscription_id;
      new.bonus_offres := old.bonus_offres; new.parrain_id := old.parrain_id;
      new.parrainage_recompense := old.parrainage_recompense; new.code_parrain := old.code_parrain; new.offre_lancement := old.offre_lancement;
      new.decennale_analyse := old.decennale_analyse;
    end if;
  end if;
  return new;
end $$;

-- Chaque jour : badge « Vérifié » retiré si l'assurance a expiré
create or replace function retirer_badges_expires() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update artisans a set verifie = false,
    decennale_analyse = coalesce(a.decennale_analyse, '{}'::jsonb) || jsonb_build_object('badge_retire_le', now(), 'badge_retire_motif', 'Assurance décennale expirée')
    where a.verifie and decennale_fin_effective(a) < current_date;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function retirer_badges_expires() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'retirer-badges-expires';
select cron.schedule('retirer-badges-expires', '15 3 * * *', 'select public.retirer_badges_expires()');
