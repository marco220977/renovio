-- Numérotation des devis : DEV-AAAA-0001, propre à chaque artisan, repart à 0001 chaque année.
-- Compteur atomique (pas de doublon même si deux devis partent en même temps,
-- et pas de numéro réutilisé si une offre ou une demande est supprimée).

create table if not exists devis_compteurs (
  artisan_id uuid not null references artisans(id) on delete cascade,
  annee int not null,
  dernier int not null default 0,
  primary key (artisan_id, annee)
);
alter table devis_compteurs enable row level security; -- aucune policy : accès uniquement via les fonctions

create or replace function prochain_numero_devis(p_artisan uuid) returns text
language plpgsql security definer set search_path = public as $$
declare an int := extract(year from now() at time zone 'Europe/Paris')::int; n int;
begin
  insert into devis_compteurs (artisan_id, annee, dernier) values (p_artisan, an, 1)
    on conflict (artisan_id, annee) do update set dernier = devis_compteurs.dernier + 1
    returning dernier into n;
  return 'DEV-' || an || '-' || lpad(n::text, 4, '0');
end $$;
revoke all on function prochain_numero_devis(uuid) from public, anon, authenticated;

-- Anciens numéros D-AAAA-NNNN → DEV-AAAA-NNNN (comptes de test uniquement au 27/11/2026)
update offres set numero = 'DEV-' || substring(numero from 3) where numero like 'D-%';

-- Reprise des compteurs à partir des devis existants
insert into devis_compteurs (artisan_id, annee, dernier)
select artisan_id, split_part(numero, '-', 2)::int, max(split_part(numero, '-', 3)::int)
from offres where numero ~ '^DEV-\d{4}-\d+$' group by 1, 2
on conflict (artisan_id, annee) do update set dernier = greatest(devis_compteurs.dernier, excluded.dernier);

-- envoyer_offre utilise désormais le compteur (patch de la définition en place,
-- pour garder les modifications déjà appliquées par les autres scripts)
do $$
declare def text := pg_get_functiondef('envoyer_offre'::regproc);
  ancien text := $x$'D-' || to_char(now(), 'YYYY') || '-' || lpad((mine + 1)::text, 4, '0')$x$;
begin
  if position('prochain_numero_devis' in def) > 0 then return; end if;
  if position(ancien in def) = 0 then raise exception 'envoyer_offre : numérotation introuvable'; end if;
  execute replace(def, ancien, 'prochain_numero_devis(a.id)');
end $$;
