-- =====================================================================
--  MANDJI AUTO CLEAN — Migration 0009 : lavages réalisés hors site
--  La gérante / l'admin enregistre après coup un lavage déjà fait et payé,
--  à la date choisie : réservation terminée + prestations (avec part du
--  laveur) + encaissement, en une seule opération.
-- =====================================================================

create or replace function enregistrer_lavage_externe(
  p_date            timestamptz,  -- date et heure de réalisation
  p_laveur_id       uuid,         -- laveur qui a réalisé le lavage (peut être null)
  p_prestation_ids  uuid[],
  p_montant         integer,      -- montant encaissé (FCFA)
  p_mode            text,         -- mode de paiement
  p_vehicule        text,         -- description libre du véhicule (facultatif)
  p_client_nom      text,         -- facultatif
  p_telephone       text,         -- format international, facultatif
  p_note            text          -- facultatif
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
  if p_mode not in ('especes', 'mobile_money', 'virement', 'carte') then
    raise exception 'Mode de paiement invalide.';
  end if;
  if p_laveur_id is not null and not exists (
    select 1 from profils where id = p_laveur_id and role = 'laveur'
  ) then
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

  insert into encaissements (reservation_id, montant, mode_paiement, encaisse_par, paye_le)
  values (v_resa, p_montant, p_mode, auth.uid(), p_date)
  returning id into v_enc;

  return v_enc;
end;
$$;

revoke execute on function enregistrer_lavage_externe(timestamptz, uuid, uuid[], integer, text, text, text, text, text) from public, anon;
grant execute on function enregistrer_lavage_externe(timestamptz, uuid, uuid[], integer, text, text, text, text, text) to authenticated;
