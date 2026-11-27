-- Remboursement de crédit après la visite (27/11/2026)
-- Le client qui renonce après le devis définitif indique un motif :
--  · « trop_cher »          → l'artisan garde la perte du crédit (règle normale)
--  · « demande_inexacte »   → demande de remboursement envoyée à l'admin, qui rend ou refuse le crédit
-- Avant la visite (statut « choisie »), le crédit est toujours rendu automatiquement (inchangé).

create table if not exists remboursements_credit (
  id uuid primary key default gen_random_uuid(),
  offre_id uuid not null unique references offres(id) on delete cascade,
  artisan_id uuid not null references artisans(id) on delete cascade,
  demande_id uuid not null references demandes(id) on delete cascade,
  motif text not null check (motif in ('trop_cher', 'demande_inexacte')),
  precision text,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'rendu', 'refuse', 'sans_objet')),
  created_at timestamptz default now(),
  traite_le timestamptz
);
alter table remboursements_credit enable row level security;
drop policy if exists remb_r on remboursements_credit;
create policy remb_r on remboursements_credit for select using (artisan_id = auth.uid() or est_admin());

drop function if exists renoncer_choix(uuid);
create or replace function renoncer_choix(p_offre uuid, p_motif text default null, p_precision text default null) returns void
language plpgsql security definer set search_path = public as $$
declare o offres; d demandes; a artisans; adm record; st text;
begin
  select * into o from offres where id = p_offre for update;
  select * into d from demandes where id = o.demande_id;
  if d.client_id <> auth.uid() then raise exception 'Accès refusé'; end if;
  if o.statut not in ('choisie', 'confirmee') then raise exception 'Rien à annuler'; end if;
  if coalesce(p_motif, '') not in ('trop_cher', 'demande_inexacte') then p_motif := 'trop_cher'; end if;
  update offres set statut = 'refusee', updated_at = now() where id = p_offre;
  if o.statut = 'choisie' then
    perform rendre_credit(p_offre);
  else
    -- Après la visite : on garde la trace du motif ; demande d'examen si « demande inexacte » et crédit réellement pris
    st := case when p_motif = 'demande_inexacte' and o.credit is not null then 'en_attente' else 'sans_objet' end;
    insert into remboursements_credit (offre_id, artisan_id, demande_id, motif, precision, statut)
      values (p_offre, o.artisan_id, d.id, p_motif, nullif(trim(coalesce(p_precision, '')), ''), st)
      on conflict (offre_id) do nothing;
    if st = 'en_attente' then
      select * into a from artisans where id = o.artisan_id;
      for adm in select id from profils where role = 'admin' loop
        perform notifier(adm.id, 'admin_remboursement', '💳 Crédit à examiner : ' || coalesce(nullif(a.raison_sociale, ''), 'artisan'),
          'Le client a renoncé après la visite : « demande ne correspondant pas à la réalité ». Devis ' || coalesce(o.numero, '') ||
          ' : ' || coalesce(to_char(o.total_ttc_initial, 'FM999G999D00'), '?') || ' € → ' || to_char(o.total_ttc, 'FM999G999D00') || ' € TTC.',
          '/admin', 'admin_remb:' || p_offre || ':' || adm.id, interval '100 years');
      end loop;
    end if;
  end if;
  perform remettre_en_jeu(d.id);
end $$;
revoke all on function renoncer_choix(uuid, text, text) from public, anon;
grant execute on function renoncer_choix(uuid, text, text) to authenticated;

-- Décision de l'admin
create or replace function admin_traiter_remboursement(p_id uuid, p_rendre boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r remboursements_credit; o offres;
begin
  if not est_admin() then raise exception 'Accès refusé'; end if;
  select * into r from remboursements_credit where id = p_id for update;
  if not found or r.statut <> 'en_attente' then raise exception 'Demande déjà traitée'; end if;
  select * into o from offres where id = r.offre_id;
  if p_rendre then perform rendre_credit(r.offre_id); end if;
  update remboursements_credit set statut = case when p_rendre then 'rendu' else 'refuse' end, traite_le = now() where id = p_id;
  perform notifier(r.artisan_id, 'remboursement',
    case when p_rendre then '💳 Votre crédit vous a été rendu' else 'Crédit non remboursé' end,
    case when p_rendre
      then 'Le client a renoncé au devis ' || coalesce(o.numero, '') || ' car sa demande ne correspondait pas à la réalité. Après vérification, votre crédit vous est rendu.'
      else 'Le client a renoncé au devis ' || coalesce(o.numero, '') || ' après la visite. Après vérification, le crédit utilisé n''est pas remboursé.' end,
    '/artisan/demande/' || r.demande_id);
end $$;
revoke all on function admin_traiter_remboursement(uuid, boolean) from public, anon;
grant execute on function admin_traiter_remboursement(uuid, boolean) to authenticated;
