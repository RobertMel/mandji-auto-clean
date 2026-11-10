-- =====================================================================
--  MANDJI AUTO CLEAN — Migration 0012 : retrouver un client par sa plaque
--  « lc469 », « LC-469-AA » ou « LC 469 AA » trouvent le même véhicule :
--  on compare les plaques sans espaces, tirets ni points, en majuscules.
-- =====================================================================

create or replace function plaque_normalisee(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(upper(coalesce(p, '')), '[^A-Z0-9]', '', 'g')
$$;

create or replace function chercher_par_plaque(p_plaque text)
returns table (
  vehicule_id      uuid,
  immatriculation  text,
  marque           text,
  couleur          text,
  client_id        uuid,
  nom              text,
  prenom           text,
  telephone        text,
  entreprise       boolean,
  passages         bigint,
  dernier_passage  timestamptz
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_q text := plaque_normalisee(p_plaque);
begin
  if not est_gestionnaire() then
    raise exception 'Réservé à la gérante et à l''admin.';
  end if;
  if length(v_q) < 3 then
    return;
  end if;

  return query
  select v.id, v.immatriculation, v.marque, v.couleur,
         c.id, c.nom, c.prenom, c.telephone, coalesce(c.entreprise, false),
         (select count(*) from reservations r where r.vehicule_id = v.id),
         (select max(r.created_at) from reservations r where r.vehicule_id = v.id)
  from vehicules v
  left join clients c on c.id = v.client_id
  where plaque_normalisee(v.immatriculation) like '%' || v_q || '%'
  order by (plaque_normalisee(v.immatriculation) = v_q) desc,
           (plaque_normalisee(v.immatriculation) like v_q || '%') desc,
           (select max(r.created_at) from reservations r where r.vehicule_id = v.id) desc nulls last
  limit 6;
end;
$$;

revoke execute on function chercher_par_plaque(text) from public, anon;
grant execute on function chercher_par_plaque(text) to authenticated;
