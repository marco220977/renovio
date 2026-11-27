-- Fidélité des artisans (27/11/2026)
-- Badge « Partenaire fidèle » (1 an 🥉, 2 ans 🥈, 3 ans et + 🥇) : calculé dans l'appli à partir de la date d'inscription.
-- Crédits d'ancienneté (clients offerts, ajoutés au bonus) : 6 mois → +1, 1 an → +2, puis +3 à chaque anniversaire.
-- Conditions : compte actif (non suspendu), vérifié, hors comptes de test. Chaque palier n'est donné qu'une fois.

create table if not exists fidelite_paliers (
  artisan_id uuid not null references artisans(id) on delete cascade,
  palier text not null,            -- '6m', '1a', '2a', '3a'…
  credits int not null,
  accorde_le timestamptz default now(),
  primary key (artisan_id, palier)
);
alter table fidelite_paliers enable row level security;
drop policy if exists fidelite_r on fidelite_paliers;
create policy fidelite_r on fidelite_paliers for select using (artisan_id = auth.uid() or est_admin());

create or replace function attribuer_credits_fidelite() returns int
language plpgsql security definer set search_path = public as $$
declare a record; mois int; ans int; k int; nb int := 0; p text; c int;
begin
  for a in select * from artisans
    where statut = 'actif' and verifie and not est_test(id) and created_at <= now() - interval '6 months'
  loop
    mois := (extract(year from age(now(), a.created_at)) * 12 + extract(month from age(now(), a.created_at)))::int;
    ans := mois / 12;
    for k in 0..ans loop
      p := case when k = 0 then '6m' else k || 'a' end;
      c := case when k = 0 then 1 when k = 1 then 2 else 3 end;
      continue when k = 0 and mois < 6;
      insert into fidelite_paliers (artisan_id, palier, credits) values (a.id, p, c) on conflict do nothing;
      if found then
        perform set_config('renovio.systeme', '1', true);
        update artisans set bonus_offres = bonus_offres + c where id = a.id;
        perform set_config('renovio.systeme', '', true);
        perform notifier(a.id, 'fidelite',
          case when k = 0 then '🎁 6 mois sur Rénolien : 1 client offert'
               else '🎉 ' || k || ' an' || case when k > 1 then 's' else '' end || ' sur Rénolien : ' || c || ' clients offerts' end,
          'Merci pour votre fidélité ! ' || c || ' client' || case when c > 1 then 's offerts ont' else ' offert a' end ||
          ' été ajouté' || case when c > 1 then 's' else '' end || ' à votre compte : ils seront utilisés quand votre crédit du mois sera épuisé.' ||
          case when k >= 1 then ' Votre badge « Partenaire fidèle » est affiché sur votre vitrine et vos offres.' else '' end,
          '/artisan/abonnement', 'fidelite:' || a.id || ':' || p, interval '100 years');
        nb := nb + 1;
      end if;
    end loop;
  end loop;
  return nb;
end $$;
revoke execute on function attribuer_credits_fidelite() from public, anon, authenticated;

select cron.unschedule('credits-fidelite') where exists (select 1 from cron.job where jobname = 'credits-fidelite');
select cron.schedule('credits-fidelite', '20 8 * * *', 'select attribuer_credits_fidelite()');
