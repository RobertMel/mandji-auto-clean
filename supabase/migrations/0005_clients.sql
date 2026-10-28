-- =====================================================================
--  MANDJI AUTO CLEAN — Migration 0005 : fiches clients
--  Les clients sont identifiés par leur téléphone, stocké au format
--  international en chiffres seuls (ex : 24106140807, 33612345678).
-- =====================================================================

-- Un téléphone = un client
create unique index if not exists uniq_clients_telephone on clients (telephone);


-- ---------------------------------------------------------------------
-- Trouve le client par son téléphone, ou le crée.
-- Un client créé sans nom s'appelle « Sans nom » (renommable dans sa fiche) ;
-- si un nom arrive plus tard, il remplace « Sans nom ».
-- ---------------------------------------------------------------------
create or replace function trouver_ou_creer_client(p_telephone text, p_nom text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_nom text := nullif(trim(p_nom), '');
begin
  if nullif(trim(p_telephone), '') is null then
    return null;
  end if;

  select id into v_id from clients where telephone = p_telephone;

  if v_id is null then
    insert into clients (nom, telephone)
    values (coalesce(v_nom, 'Sans nom'), p_telephone)
    returning id into v_id;
  elsif v_nom is not null then
    update clients set nom = v_nom where id = v_id and nom = 'Sans nom';
  end if;

  return v_id;
end;
$$;


-- ---------------------------------------------------------------------
-- Trouve le véhicule du client (même plaque, ou même marque + couleur
-- quand il n'y a pas de plaque), ou le crée.
-- ---------------------------------------------------------------------
create or replace function trouver_ou_creer_vehicule(
  p_client_id uuid, p_marque text, p_couleur text, p_immat text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_marque  text := nullif(trim(p_marque), '');
  v_couleur text := nullif(trim(p_couleur), '');
  v_immat   text := upper(nullif(trim(p_immat), ''));
begin
  if p_client_id is null or (v_marque is null and v_immat is null) then
    return null;
  end if;

  if v_immat is not null then
    select id into v_id from vehicules
    where client_id = p_client_id
      and upper(replace(immatriculation, ' ', '')) = replace(v_immat, ' ', '')
    limit 1;
  else
    select id into v_id from vehicules
    where client_id = p_client_id
      and immatriculation is null
      and lower(marque) = lower(v_marque)
      and coalesce(lower(couleur), '') = coalesce(lower(v_couleur), '')
    limit 1;
  end if;

  if v_id is null then
    insert into vehicules (client_id, marque, couleur, immatriculation)
    values (p_client_id, v_marque, v_couleur, v_immat)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;


-- ---------------------------------------------------------------------
-- Enregistrement d'un véhicule dans la file d'attente (gérante/admin),
-- avec rattachement au client si un téléphone est donné.
-- ---------------------------------------------------------------------
create or replace function enregistrer_vehicule(
  p_marque     text,
  p_couleur    text,
  p_immat      text,
  p_note       text,
  p_client_nom text,
  p_telephone  text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_client   uuid;
  v_vehicule uuid;
  v_resa     uuid;
  v_marque   text := nullif(trim(p_marque), '');
  v_couleur  text := nullif(trim(p_couleur), '');
  v_immat    text := upper(nullif(trim(p_immat), ''));
  v_nom      text := nullif(trim(p_client_nom), '');
  v_tel      text := nullif(trim(p_telephone), '');
  v_notes    text;
begin
  if not est_gestionnaire() then
    raise exception 'Réservé à la gérante et à l''admin.';
  end if;

  v_client   := trouver_ou_creer_client(v_tel, v_nom);
  v_vehicule := trouver_ou_creer_vehicule(v_client, v_marque, v_couleur, v_immat);

  -- Libellé affiché dans la file : « Toyota blanc AB-123 — Emma — note »
  v_notes := nullif(concat_ws(' — ',
               nullif(concat_ws(' ', v_marque, v_couleur, v_immat), ''),
               v_nom,
               nullif(trim(p_note), '')), '');

  insert into reservations (
    statut, canal, notes, client_id, vehicule_id, telephone_client,
    vehicule_marque, vehicule_couleur, vehicule_immatriculation
  ) values (
    'en_attente', 'sur_place', coalesce(v_notes, 'Véhicule'), v_client, v_vehicule, v_tel,
    v_marque, v_couleur, v_immat
  ) returning id into v_resa;

  return v_resa;
end;
$$;


-- ---------------------------------------------------------------------
-- Depuis le reçu : le numéro saisi rattache la réservation à un client
-- (et le véhicule au client) si ce n'était pas déjà fait.
-- ---------------------------------------------------------------------
create or replace function associer_client_reservation(
  p_reservation_id uuid, p_telephone text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_resa   reservations%rowtype;
  v_client uuid;
  v_veh    uuid;
begin
  if not est_gestionnaire() then
    raise exception 'Réservé à la gérante et à l''admin.';
  end if;

  select * into v_resa from reservations where id = p_reservation_id;
  if not found then
    raise exception 'Réservation introuvable.';
  end if;

  v_client := coalesce(v_resa.client_id, trouver_ou_creer_client(p_telephone, null));
  v_veh := coalesce(
    v_resa.vehicule_id,
    trouver_ou_creer_vehicule(v_client, v_resa.vehicule_marque,
                              v_resa.vehicule_couleur, v_resa.vehicule_immatriculation)
  );

  update reservations
  set client_id = v_client,
      vehicule_id = v_veh,
      telephone_client = p_telephone
  where id = p_reservation_id;

  return v_client;
end;
$$;


-- Droits : comptes connectés uniquement
revoke execute on function trouver_ou_creer_client(text, text) from public, anon;
revoke execute on function trouver_ou_creer_vehicule(uuid, text, text, text) from public, anon;
revoke execute on function enregistrer_vehicule(text, text, text, text, text, text) from public, anon;
revoke execute on function associer_client_reservation(uuid, text) from public, anon;
grant execute on function trouver_ou_creer_client(text, text) to authenticated;
grant execute on function trouver_ou_creer_vehicule(uuid, text, text, text) to authenticated;
grant execute on function enregistrer_vehicule(text, text, text, text, text, text) to authenticated;
grant execute on function associer_client_reservation(uuid, text) to authenticated;
