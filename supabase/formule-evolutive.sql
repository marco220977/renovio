-- Formule évolutive et clients pris en avance (27/11/2026)
-- · Plus de mise en pause : une offre envoyée reste visible jusqu'à son expiration.
-- · Un client qui choisit un artisan sans crédit est toujours servi : le crédit est pris « en avance » (dette).
-- · Tant qu'il a une avance, l'artisan ne peut pas envoyer de nouvelle offre.
-- · L'avance se rembourse automatiquement : crédits du mois suivant, clients offerts, ou passage à une formule supérieure.
-- · Formule évolutive (option acceptée par l'artisan abonné) : après un dépassement, passage automatique
--   à la formule supérieure le 1er du mois suivant (Stripe, via /api/abonnement/evolution).

alter table offres drop constraint if exists offres_credit_check;
alter table offres add constraint offres_credit_check check (credit in ('quota', 'bonus', 'hors_quota', 'avance'));

alter table artisans add column if not exists dette int not null default 0;                -- clients pris en avance non remboursés
alter table artisans add column if not exists credits_reserves int not null default 0;     -- crédits du mois déjà utilisés pour rembourser l'avance
alter table artisans add column if not exists reserve_mois date;                           -- mois concerné par credits_reserves
alter table artisans add column if not exists formule_evolutive boolean not null default false;
alter table artisans add column if not exists montee_prevue text;                          -- formule à appliquer le 1er du mois

-- Ces colonnes ne sont modifiables que par le système ou l'admin
create or replace function protege_artisan_credits() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::json->>'role' in ('authenticated', 'anon')
     and not est_admin() and coalesce(current_setting('renovio.systeme', true), '') <> '1' then
    if tg_op = 'INSERT' then
      new.dette := 0; new.credits_reserves := 0; new.reserve_mois := null; new.formule_evolutive := false; new.montee_prevue := null;
    else
      new.dette := old.dette; new.credits_reserves := old.credits_reserves; new.reserve_mois := old.reserve_mois;
      new.formule_evolutive := old.formule_evolutive; new.montee_prevue := old.montee_prevue;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protege_artisan_credits on artisans;
create trigger protege_artisan_credits before insert or update on artisans for each row execute function protege_artisan_credits();

create or replace function formule_suivante(p text) returns text language sql immutable as $$
  select case p when 'gratuit' then 'essentiel' when 'essentiel' then 'pro' when 'pro' then 'illimite' else null end;
$$;

-- Clients du mois = clients choisis ce mois-ci + crédits du mois utilisés pour rembourser une avance
create or replace function clients_du_mois(p_artisan uuid) returns int language sql stable security definer set search_path = public as $$
  select (select count(*)::int from offres where artisan_id = p_artisan and credit in ('quota', 'hors_quota') and credit_le >= date_trunc('month', now()))
       + coalesce((select credits_reserves from artisans where id = p_artisan and reserve_mois = date_trunc('month', now())::date), 0);
$$;

-- Plus de mise en pause des offres
create or replace function artisan_epuise(p_artisan uuid) returns boolean language sql stable as $$ select false $$;

-- Rembourse l'avance avec les crédits libres du mois, puis avec les clients offerts
create or replace function rembourser_dette(p_artisan uuid) returns void language plpgsql security definer set search_path = public as $$
declare a artisans; q int; libre int; r int; rb int; mois date := date_trunc('month', now())::date;
begin
  select * into a from artisans where id = p_artisan for update;
  if not found or a.dette <= 0 then return; end if;
  q := quota_clients(formule_active(a));
  libre := case when q is null then a.dette else greatest(0, q - clients_du_mois(a.id)) end;
  r := least(a.dette, libre);
  rb := least(a.dette - r, greatest(a.bonus_offres, 0));
  perform set_config('renovio.systeme', '1', true);
  update artisans set dette = dette - r - rb, bonus_offres = bonus_offres - rb,
    credits_reserves = case when reserve_mois = mois then credits_reserves else 0 end + r, reserve_mois = mois
    where id = a.id;
  perform set_config('renovio.systeme', '', true);
  if a.dette - r - rb = 0 then
    perform notifier(a.id, 'avance_remboursee', '✅ Vous pouvez de nouveau envoyer des offres',
      'Les clients pris en avance sont remboursés. Vous pouvez répondre à de nouvelles demandes.', '/artisan', null, null);
  end if;
end $$;

-- Changement de formule ou nouveaux clients offerts : on rembourse l'avance tout de suite
create or replace function dette_apres_maj() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform rembourser_dette(new.id);
  return null;
end $$;
drop trigger if exists dette_apres_maj on artisans;
create trigger dette_apres_maj after update of abonnement, abonnement_fin, bonus_offres on artisans for each row
  when (new.dette > 0 and (new.abonnement is distinct from old.abonnement or new.abonnement_fin is distinct from old.abonnement_fin or new.bonus_offres > old.bonus_offres))
  execute function dette_apres_maj();

-- Choix d'une offre : quota du mois, sinon client offert, sinon avance (le client est toujours servi)
create or replace function consommer_credit(p_offre uuid) returns void language plpgsql security definer set search_path = public as $$
declare o offres; a artisans; f text; q int; c text; nxt text; nom text;
begin
  select * into o from offres where id = p_offre for update;
  if o.credit is not null then return; end if;
  select * into a from artisans where id = o.artisan_id for update;
  f := formule_active(a); q := quota_clients(f);
  perform set_config('renovio.systeme', '1', true);
  if q is null or clients_du_mois(a.id) < q then c := 'quota';
  elsif a.bonus_offres > 0 then
    c := 'bonus';
    update artisans set bonus_offres = bonus_offres - 1 where id = a.id;
  else
    c := 'avance';
    nxt := formule_suivante(f);
    nom := case nxt when 'essentiel' then 'Essentiel' when 'pro' then 'Pro' when 'illimite' then 'Illimité' end;
    update artisans set dette = dette + 1,
      montee_prevue = case when a.formule_evolutive and a.stripe_subscription_id is not null then nxt else montee_prevue end
      where id = a.id;
    perform notifier(a.id, 'avance', '🎉 Un client de plus vous a choisi !',
      'Vous avez dépassé les clients inclus dans votre formule ce mois-ci : ce client est pris en avance sur le mois prochain. ' ||
      case when a.formule_evolutive and a.stripe_subscription_id is not null and nxt is not null
        then 'Formule évolutive : vous passerez automatiquement en ' || nom || ' le 1er du mois prochain.'
        when nxt is not null then 'Passez en ' || nom || ' pour avoir plus de clients chaque mois et continuer à envoyer des offres.'
        else '' end ||
      ' Tant que l''avance n''est pas remboursée, vous ne pouvez pas envoyer de nouvelle offre (vos offres déjà envoyées restent visibles).',
      '/artisan/abonnement', 'avance:' || p_offre, interval '100 years');
  end if;
  perform set_config('renovio.systeme', '', true);
  update offres set credit = c, credit_le = now() where id = p_offre;
end $$;

-- Crédit rendu (client qui renonce avant la visite, ou décision de l'admin)
create or replace function rendre_credit(p_offre uuid) returns void language plpgsql security definer set search_path = public as $$
declare o offres;
begin
  select * into o from offres where id = p_offre for update;
  perform set_config('renovio.systeme', '1', true);
  if o.credit = 'bonus' then
    update artisans set bonus_offres = bonus_offres + 1 where id = o.artisan_id;
  elsif o.credit = 'avance' then
    update artisans set dette = greatest(dette - 1, 0) where id = o.artisan_id and dette > 0;
  end if;
  perform set_config('renovio.systeme', '', true);
  update offres set credit = null, credit_le = null where id = p_offre;
end $$;

-- Nouvelle offre : bloquée tant qu'il reste une avance
create or replace function controle_envoi(a artisans) returns void language plpgsql stable security definer set search_path = public as $$
declare f text := formule_active(a); q int := quota_clients(f); p int := plafond_attente(f);
begin
  if a.dette > 0 then
    raise exception 'Vous avez % client(s) pris en avance. Vous pourrez envoyer de nouvelles offres le mois prochain, ou dès maintenant en passant à une formule supérieure dans « Abonnement ».', a.dette;
  end if;
  if p is not null and offres_en_attente(a.id) >= p then
    raise exception 'Vous avez déjà % offres en attente de réponse (maximum de votre formule). Attendez une réponse ou passez à une formule supérieure dans « Abonnement ».', p;
  end if;
  if q is not null and clients_du_mois(a.id) >= q and a.bonus_offres <= 0 then
    raise exception 'Limite de votre formule atteinte : % client(s) ce mois-ci. Passez à une formule supérieure dans « Abonnement » ou attendez le mois prochain.', q;
  end if;
end $$;

-- Option « formule évolutive » choisie par l'artisan
create or replace function definir_formule_evolutive(p boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('renovio.systeme', '1', true);
  update artisans set formule_evolutive = coalesce(p, false), montee_prevue = case when coalesce(p, false) then montee_prevue end where id = auth.uid();
  perform set_config('renovio.systeme', '', true);
end $$;

create or replace function mon_quota() returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'abonnement', formule_active(a), 'fin', case when formule_active(a) <> 'gratuit' then a.abonnement_fin end,
    'quota', quota_clients(formule_active(a)), 'utilise', clients_du_mois(a.id), 'bonus', a.bonus_offres,
    'attente', offres_en_attente(a.id), 'plafond', plafond_attente(formule_active(a)),
    'en_pause', 0, 'dette', a.dette, 'evolutive', a.formule_evolutive, 'montee', a.montee_prevue,
    'resilie', a.abonnement_resilie, 'stripe', a.stripe_subscription_id is not null,
    'fondateur', a.fondateur, 'lancement', coalesce(lancement_en_cours(), false),
    'lancement_fin', (select valeur->>'fin' from reglages where cle = 'lancement'),
    'remise', (select (valeur->>'remise')::int from reglages where cle = 'lancement')
  ) from artisans a where a.id = auth.uid();
$$;

-- 1er du mois : remboursement des avances puis montées de formule (Stripe)
insert into secrets_internes values ('cron_evolution', encode(extensions.gen_random_bytes(24), 'hex')) on conflict (cle) do nothing;
create or replace function debut_mois_credits() returns void language plpgsql security definer set search_path = public, extensions as $$
declare r record;
begin
  for r in select id from artisans where dette > 0 loop perform rembourser_dette(r.id); end loop;
  if exists (select 1 from artisans where montee_prevue is not null and formule_evolutive and stripe_subscription_id is not null) then
    perform net.http_post('https://www.renolien.fr/api/abonnement/evolution', '{}'::jsonb, '{}'::jsonb,
      jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select valeur from secrets_internes where cle = 'cron_evolution')), 60000);
  end if;
end $$;

revoke execute on function rembourser_dette(uuid), debut_mois_credits(), consommer_credit(uuid), rendre_credit(uuid), controle_envoi(artisans), clients_du_mois(uuid) from public, anon, authenticated;
grant execute on function definir_formule_evolutive(boolean) to authenticated;

select cron.unschedule('debut-mois-credits') where exists (select 1 from cron.job where jobname = 'debut-mois-credits');
select cron.schedule('debut-mois-credits', '10 0 1 * *', 'select debut_mois_credits()');

-- Réactive les offres mises en pause avec l'ancien système
do $$ declare r record; begin
  for r in select distinct artisan_id from offres where en_pause and statut = 'envoyee' loop perform maj_pause(r.artisan_id); end loop;
end $$;
