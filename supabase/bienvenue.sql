-- Bienvenue des artisans (13/11/2026)
-- 1) E-mail + notification de bienvenue à l'artisan dès que sa fiche a un SIRET (une seule fois)
-- 2) Notification aux administrateurs à chaque nouvelle entreprise inscrite
-- 3) Notification à l'artisan quand l'admin le marque « Vérifié »

create or replace function bienvenue_artisan(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a record; l record; fin text; adm record;
begin
  select * into a from artisans where id = p_id;
  if a.id is null or a.siret is null then return; end if;
  if exists (select 1 from notifications where cle = 'bienvenue:' || a.id) then return; end if;
  select (valeur->>'actif')::boolean actif, (valeur->>'fin')::date fin into l from reglages where cle = 'lancement';
  fin := case when extract(day from l.fin) = 1 then '1er' else extract(day from l.fin)::text end || ' ' ||
    (array['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'])[extract(month from l.fin)] ||
    ' ' || extract(year from l.fin);

  perform notifier(a.id, 'bienvenue', 'Bienvenue sur Rénolien, ' || coalesce(nullif(a.raison_sociale, ''), 'et merci') || ' 🎉',
    'Bonjour,' || E'\n\n' ||
    'Merci d''avoir rejoint Rénolien parmi les premiers ! Je suis Marco, plombier-chauffagiste et fondateur de la plateforme : en ce début d''aventure, chaque inscription compte énormément pour moi.' || E'\n\n' ||
    case when a.fondateur and coalesce(l.actif, false)
      then '🚀 Vous êtes membre fondateur : Rénolien est 100 % gratuit et illimité pour vous jusqu''au ' || fin || ', puis vous gardez -30 % à vie sur toutes les formules.' || E'\n\n'
      else '' end ||
    'Pour bien démarrer :' || E'\n' ||
    '1. Activez les notifications sur votre téléphone (bandeau en haut de votre espace) pour être prévenu dès qu''une demande arrive.' || E'\n' ||
    '2. Renseignez vos tarifs : vos devis seront préremplis en 1 clic.' || E'\n' ||
    '3. Ajoutez une courte présentation de votre entreprise dans votre profil : les clients y sont sensibles.' || E'\n\n' ||
    'Une question, une idée ? Répondez simplement à cet e-mail, je lis tout personnellement.' || E'\n\n' ||
    'Marco' || E'\n' || 'Fondateur de Rénolien',
    '/artisan', 'bienvenue:' || a.id, interval '100 years');

  for adm in select id from profils where role = 'admin' loop
    perform notifier(adm.id, 'admin_inscription', '🎉 Nouvel artisan : ' || coalesce(nullif(a.raison_sociale, ''), 'entreprise') || coalesce(' · ' || nullif(a.ville, ''), ''),
      coalesce(array_to_string(a.metiers, ', '), '') || coalesce(' · départements ' || array_to_string(a.departements, ', '), '') ||
      case when a.rge then ' · RGE' else '' end || '. Pensez à vérifier sa fiche et son attestation décennale.',
      '/admin', 'admin_inscr:' || a.id || ':' || adm.id, interval '100 years');
  end loop;
end $$;
revoke execute on function bienvenue_artisan(uuid) from public, anon, authenticated;

create or replace function trg_bienvenue_artisan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.siret is not null and (tg_op = 'INSERT' or old.siret is null) then
    perform bienvenue_artisan(new.id);
  end if;
  if tg_op = 'UPDATE' and new.verifie and not coalesce(old.verifie, false) then
    perform notifier(new.id, 'verifie', '✅ Votre profil est vérifié',
      'Bonne nouvelle : votre entreprise a été vérifiée par l''équipe Rénolien. Le badge « ✔ Vérifié » s''affiche maintenant à côté de votre nom sur vos offres, ce qui rassure les clients.',
      '/artisan', 'verifie:' || new.id, interval '1 day');
  end if;
  return null;
end $$;

drop trigger if exists trg_bienvenue on artisans;
create trigger trg_bienvenue after insert or update of siret, verifie on artisans
  for each row execute function trg_bienvenue_artisan();
