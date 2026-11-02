-- =====================================================================
--  MANDJI AUTO CLEAN — Migration 0010
--  1. Clients « entreprise » (paient en fin de mois)
--  2. Factures à régler : un encaissement peut être « à venir » (non payé)
--     puis confirmé plus tard (date et mode de paiement)
--  3. Suivi « client prévenu » quand le lavage est terminé
-- =====================================================================

-- 1. Clients entreprise
alter table clients add column if not exists entreprise boolean not null default false;

-- 3. Client prévenu (message « votre véhicule est prêt » envoyé)
alter table reservations add column if not exists client_prevenu_le timestamptz;

-- 2. Factures à régler
alter table encaissements add column if not exists statut text not null default 'paye';
alter table encaissements add column if not exists echeance date;
alter table encaissements alter column paye_le drop not null;
alter table encaissements alter column paye_le drop default;
alter table encaissements alter column mode_paiement drop not null;
alter table encaissements alter column mode_paiement drop default;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'encaissements_statut_coherent') then
    alter table encaissements add constraint encaissements_statut_coherent check (
      (statut = 'paye' and paye_le is not null and mode_paiement is not null)
      or (statut = 'a_venir')
    );
  end if;
end $$;

create index if not exists idx_encaissements_statut on encaissements (statut);

-- ---------------------------------------------------------------------
-- Encaissement : payé tout de suite, ou facture à régler (fin de mois)
-- ---------------------------------------------------------------------
drop function if exists encaisser_reservation(uuid, uuid[], integer, text);

create or replace function encaisser_reservation(
  p_reservation_id  uuid,
  p_prestation_ids  uuid[],
  p_montant         integer,
  p_mode            text,
  p_differe         boolean default false,  -- true = facture à régler plus tard
  p_echeance        date default null       -- par défaut : fin du mois
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
  if not p_differe and (p_mode is null or p_mode not in ('especes', 'mobile_money', 'virement', 'carte')) then
    raise exception 'Mode de paiement invalide.';
  end if;
  if p_montant is null or p_montant < 0 then
    raise exception 'Montant invalide.';
  end if;
  if coalesce(array_length(p_prestation_ids, 1), 0) = 0 then
    raise exception 'Sélectionnez au moins une prestation.';
  end if;
  if not exists (select 1 from reservations where id = p_reservation_id and statut = 'terminee') then
    raise exception 'Ce lavage n''est pas terminé.';
  end if;
  if exists (select 1 from encaissements where reservation_id = p_reservation_id) then
    raise exception 'Ce lavage a déjà été encaissé ou facturé.';
  end if;

  delete from reservation_prestations where reservation_id = p_reservation_id;

  insert into reservation_prestations (reservation_id, prestation_id, prix_applique, quantite, part_laveur)
  select p_reservation_id, p.id, p.prix, 1, coalesce(p.part_laveur, 0)
  from prestations p
  where p.id = any (p_prestation_ids);

  if p_differe then
    insert into encaissements (reservation_id, montant, statut, echeance, encaisse_par)
    values (
      p_reservation_id, p_montant, 'a_venir',
      coalesce(p_echeance, (date_trunc('month', now() at time zone 'Africa/Libreville') + interval '1 month - 1 day')::date),
      auth.uid()
    )
    returning id into v_id;
  else
    insert into encaissements (reservation_id, montant, statut, mode_paiement, paye_le, encaisse_par)
    values (p_reservation_id, p_montant, 'paye', p_mode, now(), auth.uid())
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke execute on function encaisser_reservation(uuid, uuid[], integer, text, boolean, date) from public, anon;
grant execute on function encaisser_reservation(uuid, uuid[], integer, text, boolean, date) to authenticated;

-- ---------------------------------------------------------------------
-- Confirmer le paiement d'une ou plusieurs factures (ex. fin de mois)
-- ---------------------------------------------------------------------
create or replace function confirmer_paiements(
  p_encaissement_ids  uuid[],
  p_mode              text,
  p_paye_le           timestamptz default now()
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_nb integer;
begin
  if not est_gestionnaire() then
    raise exception 'Seules la gérante et l''admin peuvent confirmer un paiement.';
  end if;
  if p_mode is null or p_mode not in ('especes', 'mobile_money', 'virement', 'carte') then
    raise exception 'Mode de paiement invalide.';
  end if;
  if p_paye_le is null or p_paye_le > now() + interval '1 hour' then
    raise exception 'La date de paiement doit être aujourd''hui ou dans le passé.';
  end if;

  update encaissements
  set statut = 'paye', mode_paiement = p_mode, paye_le = p_paye_le
  where id = any (p_encaissement_ids) and statut = 'a_venir';
  get diagnostics v_nb = row_count;
  return v_nb;
end;
$$;

revoke execute on function confirmer_paiements(uuid[], text, timestamptz) from public, anon;
grant execute on function confirmer_paiements(uuid[], text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------
-- Lavage hors site : peut aussi être facturé en fin de mois
-- ---------------------------------------------------------------------
drop function if exists enregistrer_lavage_externe(timestamptz, uuid, uuid[], integer, text, text, text, text, text);

create or replace function enregistrer_lavage_externe(
  p_date            timestamptz,
  p_laveur_id       uuid,
  p_prestation_ids  uuid[],
  p_montant         integer,
  p_mode            text,
  p_vehicule        text,
  p_client_nom      text,
  p_telephone       text,
  p_note            text,
  p_differe         boolean default false,
  p_echeance        date default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_client  uuid;
  v_resa    uuid;
  v_enc     uuid;
  v_notes   text;
  v_total   integer;
begin
  if not est_gestionnaire() then
    raise exception 'Seules la gérante et l''admin peuvent enregistrer un lavage.';
  end if;
  if p_date is null or p_date > now() + interval '1 hour' then
    raise exception 'La date doit être aujourd''hui ou dans le passé.';
  end if;
  if coalesce(array_length(p_prestation_ids, 1), 0) = 0 then
    raise exception 'Sélectionnez au moins une prestation.';
  end if;
  if not p_differe and (p_mode is null or p_mode not in ('especes', 'mobile_money', 'virement', 'carte')) then
    raise exception 'Mode de paiement invalide.';
  end if;
  if p_laveur_id is not null and not exists (select 1 from profils where id = p_laveur_id and role = 'laveur') then
    raise exception 'Laveur inconnu.';
  end if;

  select coalesce(sum(prix), 0) into v_total from prestations where id = any (p_prestation_ids);
  if p_montant is null or p_montant < 0 or p_montant > v_total then
    raise exception 'Montant invalide (entre 0 et % FCFA).', v_total;
  end if;

  v_client := trouver_ou_creer_client(nullif(trim(p_telephone), ''), p_client_nom);

  v_notes := nullif(concat_ws(' — ',
               nullif(trim(p_vehicule), ''),
               nullif(trim(p_client_nom), ''),
               nullif(trim(p_note), '')), '');

  insert into reservations (
    statut, canal, notes, client_id, telephone_client, laveur_id,
    date_rdv, debut_lavage, fin_lavage, created_at
  ) values (
    'terminee', 'hors_site', coalesce(v_notes, 'Lavage hors site'), v_client,
    nullif(trim(p_telephone), ''), p_laveur_id,
    p_date, p_date, p_date, p_date
  ) returning id into v_resa;

  insert into reservation_prestations (reservation_id, prestation_id, prix_applique, quantite, part_laveur)
  select v_resa, p.id, p.prix, 1, coalesce(p.part_laveur, 0)
  from prestations p
  where p.id = any (p_prestation_ids);

  if p_differe then
    insert into encaissements (reservation_id, montant, statut, echeance, encaisse_par)
    values (
      v_resa, p_montant, 'a_venir',
      coalesce(p_echeance, (date_trunc('month', p_date at time zone 'Africa/Libreville') + interval '1 month - 1 day')::date),
      auth.uid()
    )
    returning id into v_enc;
  else
    insert into encaissements (reservation_id, montant, statut, mode_paiement, paye_le, encaisse_par)
    values (v_resa, p_montant, 'paye', p_mode, p_date, auth.uid())
    returning id into v_enc;
  end if;

  return v_enc;
end;
$$;

revoke execute on function enregistrer_lavage_externe(timestamptz, uuid, uuid[], integer, text, text, text, text, text, boolean, date) from public, anon;
grant execute on function enregistrer_lavage_externe(timestamptz, uuid, uuid[], integer, text, text, text, text, text, boolean, date) to authenticated;
