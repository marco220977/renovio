-- SIRET : format contrôlé (clé de Luhn), un seul compte par SIRET, offre de lancement une seule fois par SIRET.
create or replace function siret_valide(p text) returns boolean language plpgsql immutable as $$
declare s text := regexp_replace(coalesce(p, ''), '\D', '', 'g'); t int := 0; d int;
begin
  if length(s) <> 14 then return false; end if;
  if left(s, 9) = '356000000' then  -- La Poste : règle particulière
    for i in 1..14 loop t := t + substr(s, i, 1)::int; end loop;
    return t % 5 = 0;
  end if;
  for i in 1..14 loop
    d := substr(s, i, 1)::int;
    if i % 2 = 1 then d := d * 2; if d > 9 then d := d - 9; end if; end if;
    t := t + d;
  end loop;
  return t % 10 = 0;
end $$;

update artisans set siret = nullif(regexp_replace(siret, '\D', '', 'g'), '') where siret is distinct from nullif(regexp_replace(siret, '\D', '', 'g'), '');

create or replace function controle_siret() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.siret := nullif(regexp_replace(coalesce(new.siret, ''), '\D', '', 'g'), '');
  if new.siret is not null and (tg_op = 'INSERT' or new.siret is distinct from old.siret) then
    if not siret_valide(new.siret) then
      raise exception 'SIRET invalide : vérifiez les 14 chiffres (ils figurent sur votre extrait Kbis ou avis de situation INSEE).';
    end if;
    if exists (select 1 from artisans where siret = new.siret and id <> new.id) then
      raise exception 'Ce SIRET est déjà utilisé par un autre compte Rénolien. Si c''est une erreur, écrivez-nous à renolien.contact@gmail.com.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_controle_siret on artisans;
create trigger trg_controle_siret before insert or update of siret on artisans for each row execute function controle_siret();
revoke execute on function controle_siret() from public, anon, authenticated;

create unique index if not exists artisans_siret_unique on artisans (siret) where siret is not null;

-- Historique des SIRET ayant déjà bénéficié de l'offre de lancement (survit à la suppression du compte)
create table if not exists sirets_lancement (
  siret text primary key,
  artisan_id uuid,
  created_at timestamptz default now()
);
alter table sirets_lancement enable row level security;
drop policy if exists sirets_lancement_admin on sirets_lancement;
create policy sirets_lancement_admin on sirets_lancement for select using (est_admin());

create or replace function siret_offre_lancement() returns trigger
language plpgsql security definer set search_path = public as $$
declare deja uuid;
begin
  if new.offre_lancement and new.siret is not null then
    insert into sirets_lancement (siret, artisan_id) values (new.siret, new.id) on conflict (siret) do nothing;
    select artisan_id into deja from sirets_lancement where siret = new.siret;
    if deja is distinct from new.id then
      -- Ce SIRET a déjà profité de l'offre (ancien compte supprimé) : on retire l'avantage
      perform set_config('renovio.systeme', '1', true);
      update artisans set offre_lancement = false,
        abonnement = case when stripe_subscription_id is null then 'gratuit' else abonnement end,
        abonnement_fin = case when stripe_subscription_id is null then null else abonnement_fin end
        where id = new.id;
      perform set_config('renovio.systeme', '', true);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_siret_offre_lancement on artisans;
create trigger trg_siret_offre_lancement after insert or update of siret on artisans for each row execute function siret_offre_lancement();
revoke execute on function siret_offre_lancement() from public, anon, authenticated;

insert into sirets_lancement (siret, artisan_id) select siret, id from artisans where offre_lancement and siret is not null on conflict do nothing;
