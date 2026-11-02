-- =====================================================================
--  MANDJI AUTO CLEAN — Migration 0011 : nom affiché des laveurs
--  Les comptes restent « Laveur 1 » à « Laveur 5 » ; la gérante peut
--  noter qui occupe chaque case (ex. « Karin ») pour s'y retrouver.
-- =====================================================================

alter table profils add column if not exists surnom text;

-- La table profils n'est modifiable que par l'admin (règle existante) :
-- cette fonction permet aussi à la gérante de changer UNIQUEMENT le
-- surnom d'un compte laveur, rien d'autre.
create or replace function definir_surnom_laveur(p_laveur_id uuid, p_surnom text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not est_gestionnaire() then
    raise exception 'Seules la gérante et l''admin peuvent nommer les laveurs.';
  end if;
  if not exists (select 1 from profils where id = p_laveur_id and role = 'laveur') then
    raise exception 'Ce compte n''est pas un compte laveur.';
  end if;
  if length(coalesce(p_surnom, '')) > 40 then
    raise exception 'Nom trop long (40 caractères maximum).';
  end if;

  update profils set surnom = nullif(trim(p_surnom), '') where id = p_laveur_id;
end;
$$;

revoke execute on function definir_surnom_laveur(uuid, text) from public, anon;
grant execute on function definir_surnom_laveur(uuid, text) to authenticated;
