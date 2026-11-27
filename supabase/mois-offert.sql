-- « Pas de client, pas de facture » (27/11/2026)
-- À chaque renouvellement d'abonnement (facture Stripe « subscription_cycle »), si l'artisan n'a été choisi
-- par aucun client pendant la période écoulée ET a envoyé au moins 3 offres sur cette période,
-- la mensualité suivante est offerte (coupon 100 % appliqué à la facture par le webhook Stripe).

create table if not exists mois_offerts (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references artisans(id) on delete cascade,
  invoice_id text not null unique,
  debut timestamptz not null,
  fin timestamptz not null,
  offres int not null,
  created_at timestamptz default now()
);
alter table mois_offerts enable row level security;
drop policy if exists mois_offerts_r on mois_offerts;
create policy mois_offerts_r on mois_offerts for select using (artisan_id = auth.uid() or est_admin());

create or replace function verifier_mois_offert(p_customer text, p_debut timestamptz, p_fin timestamptz, p_invoice text) returns boolean
language plpgsql security definer set search_path = public as $$
declare a artisans; nb_offres int; nb_clients int;
begin
  select * into a from artisans where stripe_customer_id = p_customer;
  if not found then return false; end if;
  if exists (select 1 from mois_offerts where invoice_id = p_invoice) then return true; end if;
  select count(*) into nb_offres from offres where artisan_id = a.id and created_at >= p_debut and created_at < p_fin;
  select count(*) into nb_clients from offres where artisan_id = a.id and credit is not null and credit_le >= p_debut and credit_le < p_fin;
  if nb_clients > 0 or nb_offres < 3 then return false; end if;
  insert into mois_offerts (artisan_id, invoice_id, debut, fin, offres) values (a.id, p_invoice, p_debut, p_fin, nb_offres);
  perform notifier(a.id, 'mois_offert', '🎁 Ce mois-ci est offert',
    'Aucun client ne vous a choisi le mois dernier malgré vos ' || nb_offres || ' offres : comme promis, vous ne payez pas votre abonnement ce mois-ci. Pas de client, pas de facture.',
    '/artisan/abonnement', 'mois_offert:' || p_invoice, interval '100 years');
  return true;
end $$;
revoke execute on function verifier_mois_offert(text, timestamptz, timestamptz, text) from public, anon, authenticated;
