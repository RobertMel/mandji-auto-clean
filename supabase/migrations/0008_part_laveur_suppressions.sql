-- =====================================================================
--  MANDJI AUTO CLEAN — Migration 0008
--  1. Part du laveur sur chaque prestation (grille Mandji)
--  2. Suppression d'un lavage (même encaissé) par la gérante / l'admin
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PART DU LAVEUR
-- ---------------------------------------------------------------------

-- Part reversée au laveur pour chaque prestation du catalogue (FCFA).
-- null = pas encore définie (comptée 0, signalée dans le tableau de bord).
alter table prestations
  add column if not exists part_laveur integer check (part_laveur is null or part_laveur >= 0);

-- Grille Mandji (prix de la prestation -> part du laveur)
update prestations set part_laveur = case prix
    when 2000  then 1000
    when 3000  then 1000
    when 5000  then 2000
    when 6500  then 2000
    when 7000  then 3000
    when 10000 then 5000
    when 15000 then 5000
    when 20000 then 5000
    when 30000 then 10000
  end
where part_laveur is null;

-- Part figée au moment de l'encaissement (comme le prix) : changer la grille
-- plus tard ne modifie pas ce qui a déjà été payé.
alter table reservation_prestations
  add column if not exists part_laveur integer not null default 0 check (part_laveur >= 0);

-- Lavages déjà encaissés : part reprise du catalogue actuel
update reservation_prestations rp
set part_laveur = coalesce(p.part_laveur, 0)
from prestations p
where p.id = rp.prestation_id and rp.part_laveur = 0;

-- L'encaissement enregistre désormais aussi la part du laveur
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
  if not est_gestionnaire() then
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

  delete from reservation_prestations where reservation_id = p_reservation_id;

  insert into reservation_prestations (reservation_id, prestation_id, prix_applique, quantite, part_laveur)
  select p_reservation_id, p.id, p.prix, 1, coalesce(p.part_laveur, 0)
  from prestations p
  where p.id = any (p_prestation_ids);

  insert into encaissements (reservation_id, montant, mode_paiement, encaisse_par)
  values (p_reservation_id, p_montant, p_mode, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. SUPPRESSION D'UN LAVAGE
--    Supprime le lavage, ses prestations et son encaissement (qui sort
--    donc de la compta), en une seule opération.
-- ---------------------------------------------------------------------
create or replace function supprimer_lavage(p_reservation_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not est_gestionnaire() then
    raise exception 'Seules la gérante et l''admin peuvent supprimer un lavage.';
  end if;

  if not exists (select 1 from reservations where id = p_reservation_id) then
    raise exception 'Lavage introuvable (déjà supprimé ?).';
  end if;

  delete from encaissements where reservation_id = p_reservation_id;
  delete from reservations where id = p_reservation_id;  -- prestations liées : cascade
end;
$$;

revoke execute on function supprimer_lavage(uuid) from public, anon;
grant execute on function supprimer_lavage(uuid) to authenticated;
