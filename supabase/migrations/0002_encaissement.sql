-- =====================================================================
--  MANDJI AUTO CLEAN — Migration 0002 : encaissement
--  À exécuter dans : Supabase > SQL Editor > Run
--
--  Ce script est « rejouable » : il ne casse rien si une partie existe
--  déjà (if not exists partout).
-- =====================================================================


-- =====================================================================
-- A. RATTRAPAGE — éléments déjà utilisés par le code mais absents de
--    la migration 0001. S'ils existent déjà dans ta base, rien ne change.
-- =====================================================================

-- Profils du personnel (1 ligne par compte Supabase Auth)
create table if not exists profils (
  id           uuid primary key references auth.users(id) on delete cascade,
  nom_complet  text not null,
  role         text not null default 'laveur',   -- laveur | gerante | admin
  actif        boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table profils enable row level security;

-- Policy de lecture uniquement si aucune policy n'existe encore sur profils
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'profils') then
    create policy "staff_lecture_profils" on profils
      for select to authenticated using (true);
  end if;
end $$;

-- Colonnes de suivi du lavage sur les réservations
alter table reservations add column if not exists laveur_id                uuid references profils(id) on delete set null;
alter table reservations add column if not exists debut_lavage             timestamptz;
alter table reservations add column if not exists fin_lavage               timestamptz;
alter table reservations add column if not exists vehicule_marque          text;
alter table reservations add column if not exists vehicule_couleur         text;
alter table reservations add column if not exists vehicule_immatriculation text;


-- =====================================================================
-- B. ENCAISSEMENT
-- =====================================================================

-- Qui a encaissé (traçabilité)
alter table encaissements add column if not exists encaisse_par uuid references profils(id) on delete set null;

-- Un seul encaissement par réservation (évite les doubles clics / doublons)
create unique index if not exists uniq_encaissement_reservation
  on encaissements (reservation_id)
  where reservation_id is not null;

-- ---------------------------------------------------------------------
-- Fonction d'encaissement : tout se fait en UNE transaction.
--  - vérifie que l'utilisateur est gérante ou admin (actif)
--  - enregistre les prestations réalisées avec le prix du catalogue
--  - enregistre le paiement
--  Le montant peut être inférieur au total (remise), jamais négatif.
-- ---------------------------------------------------------------------
create or replace function encaisser_reservation(
  p_reservation_id  uuid,
  p_prestation_ids  uuid[],
  p_montant         integer,
  p_mode            text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from profils
    where id = auth.uid() and actif and role in ('gerante', 'admin')
  ) then
    raise exception 'Seules la gérante et l''admin peuvent encaisser.';
  end if;

  if p_mode not in ('especes', 'mobile_money', 'virement', 'carte') then
    raise exception 'Mode de paiement invalide.';
  end if;

  if p_montant is null or p_montant < 0 then
    raise exception 'Montant invalide.';
  end if;

  if coalesce(array_length(p_prestation_ids, 1), 0) = 0 then
    raise exception 'Sélectionnez au moins une prestation.';
  end if;

  if not exists (
    select 1 from reservations
    where id = p_reservation_id and statut = 'terminee'
  ) then
    raise exception 'Ce lavage n''est pas terminé.';
  end if;

  if exists (select 1 from encaissements where reservation_id = p_reservation_id) then
    raise exception 'Ce lavage a déjà été encaissé.';
  end if;

  -- Prestations réalisées (prix figé = prix du catalogue à cet instant)
  delete from reservation_prestations where reservation_id = p_reservation_id;

  insert into reservation_prestations (reservation_id, prestation_id, prix_applique, quantite)
  select p_reservation_id, p.id, p.prix, 1
  from prestations p
  where p.id = any (p_prestation_ids);

  -- Paiement
  insert into encaissements (reservation_id, montant, mode_paiement, encaisse_par)
  values (p_reservation_id, p_montant, p_mode, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function encaisser_reservation(uuid, uuid[], integer, text) to authenticated;

-- =====================================================================
--  FIN DE LA MIGRATION 0002
-- =====================================================================
