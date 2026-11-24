-- Attestation RC Pro (facultative) : déposée par l'artisan, lue par l'IA (action « attestation_rcpro »).
-- Le badge « RC Pro » s'affiche tant que l'attestation lue est valable et sans alerte bloquante.
alter table artisans add column if not exists rcpro_doc text;
alter table artisans add column if not exists rcpro_fin date;
alter table artisans add column if not exists rcpro_analyse jsonb;

-- L'artisan ne peut modifier ni l'analyse ni la date lue par l'IA ; un nouveau document efface l'ancienne analyse
create or replace function protege_artisan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::json->>'role' in ('authenticated', 'anon')
     and not est_admin() and coalesce(current_setting('renovio.systeme', true), '') <> '1' then
    if tg_op = 'INSERT' then
      new.verifie := false; new.statut := 'actif'; new.abonnement := 'gratuit'; new.abonnement_fin := null;
      new.stripe_customer_id := null; new.stripe_subscription_id := null; new.bonus_offres := 0;
      new.parrain_id := null; new.parrainage_recompense := false; new.code_parrain := nouveau_code_parrain(); new.offre_lancement := false;
      new.decennale_analyse := null; new.rge := false; new.rge_details := null; new.tentatives_contournement := 0; new.fondateur := false;
      new.rcpro_analyse := null; new.rcpro_fin := null;
    else
      new.verifie := old.verifie; new.statut := old.statut; new.abonnement := old.abonnement; new.abonnement_fin := old.abonnement_fin;
      new.stripe_customer_id := old.stripe_customer_id; new.stripe_subscription_id := old.stripe_subscription_id;
      new.bonus_offres := old.bonus_offres; new.parrain_id := old.parrain_id;
      new.parrainage_recompense := old.parrainage_recompense; new.code_parrain := old.code_parrain; new.offre_lancement := old.offre_lancement;
      new.decennale_analyse := old.decennale_analyse; new.rge := old.rge; new.rge_details := old.rge_details; new.tentatives_contournement := old.tentatives_contournement; new.fondateur := old.fondateur;
      if new.rcpro_doc is distinct from old.rcpro_doc then
        new.rcpro_analyse := null; new.rcpro_fin := null;
      else
        new.rcpro_analyse := old.rcpro_analyse; new.rcpro_fin := old.rcpro_fin;
      end if;
    end if;
  end if;
  return new;
end $$;
