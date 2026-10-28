-- =====================================================================
--  MANDJI AUTO CLEAN — Migration 0006 : gestion de stock des produits
--  Entrées = achats saisis par la gérante (quantité, contenance, prix, lieu)
--  Sorties = flacons déclarés terminés
--  Accès : gérante et admin uniquement.
-- =====================================================================

-- Produits suivis
create table if not exists produits (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null unique,
  seuil_alerte  integer check (seuil_alerte is null or seuil_alerte >= 0),  -- en flacons
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Achats (entrées de stock)
create table if not exists achats_stock (
  id             uuid primary key default gen_random_uuid(),
  produit_id     uuid not null references produits(id) on delete restrict,
  achete_le      date not null default current_date,
  quantite       integer not null check (quantite > 0),           -- nombre de flacons
  contenance     numeric(8,2) not null check (contenance > 0),    -- par flacon
  unite          text not null check (unite in ('L', 'cl')),
  prix_unitaire  integer not null check (prix_unitaire >= 0),     -- FCFA par flacon
  lieu           text,                                            -- où le produit a été acheté
  saisi_par      uuid default auth.uid() references profils(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_achats_stock_produit on achats_stock (produit_id);
create index if not exists idx_achats_stock_date on achats_stock (achete_le);

-- Sorties (flacons terminés)
create table if not exists sorties_stock (
  id          uuid primary key default gen_random_uuid(),
  produit_id  uuid not null references produits(id) on delete restrict,
  quantite    integer not null default 1 check (quantite > 0),
  contenance  numeric(8,2) not null check (contenance > 0),
  unite       text not null check (unite in ('L', 'cl')),
  sortie_le   timestamptz not null default now(),
  saisi_par   uuid default auth.uid() references profils(id) on delete set null
);
create index if not exists idx_sorties_stock_produit on sorties_stock (produit_id);

-- Empêche de déclarer plus de flacons terminés qu'il n'y en a en stock
-- (comparaison par format, en cl : 1 L = 100 cl)
create or replace function verifier_stock_sortie()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_format_cl numeric := new.contenance * case new.unite when 'L' then 100 else 1 end;
  v_restant   integer;
begin
  select
    coalesce((select sum(quantite) from achats_stock
              where produit_id = new.produit_id
                and contenance * case unite when 'L' then 100 else 1 end = v_format_cl), 0)
  - coalesce((select sum(quantite) from sorties_stock
              where produit_id = new.produit_id
                and contenance * case unite when 'L' then 100 else 1 end = v_format_cl), 0)
  into v_restant;

  if v_restant < new.quantite then
    raise exception 'Stock insuffisant : il reste % flacon(s) de ce format.', v_restant;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_verifier_stock_sortie on sorties_stock;
create trigger trg_verifier_stock_sortie
  before insert on sorties_stock
  for each row execute function verifier_stock_sortie();

-- Sécurité : gérante et admin uniquement
alter table produits      enable row level security;
alter table achats_stock  enable row level security;
alter table sorties_stock enable row level security;

create policy produits_gestionnaire on produits
  for all to authenticated using (est_gestionnaire()) with check (est_gestionnaire());
create policy achats_stock_gestionnaire on achats_stock
  for all to authenticated using (est_gestionnaire()) with check (est_gestionnaire());
create policy sorties_stock_gestionnaire on sorties_stock
  for all to authenticated using (est_gestionnaire()) with check (est_gestionnaire());

-- Produits de départ
insert into produits (nom) values
  ('Nettoyant vitre'),
  ('Nettoyant tableau de bord'),
  ('Shampoing voiture')
on conflict (nom) do nothing;
