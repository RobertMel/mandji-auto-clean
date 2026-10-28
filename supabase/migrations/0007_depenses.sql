-- =====================================================================
--  MANDJI AUTO CLEAN — Migration 0007 : dépenses (compta)
--  Toutes les dépenses hors achats de produits (ceux-ci sont dans
--  achats_stock et sont repris automatiquement dans la compta).
--  Accès : gérante et admin uniquement.
-- =====================================================================

create table if not exists depenses (
  id             uuid primary key default gen_random_uuid(),
  depense_le     date not null default current_date,
  categorie      text not null check (categorie in (
                   'salaires', 'eau', 'electricite', 'loyer', 'carburant',
                   'materiel', 'entretien', 'taxes', 'autre')),
  libelle        text not null,
  montant        integer not null check (montant > 0),          -- FCFA
  mode_paiement  text not null default 'especes'
                   check (mode_paiement in ('especes', 'mobile_money', 'virement', 'carte')),
  saisi_par      uuid default auth.uid() references profils(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_depenses_date on depenses (depense_le);

alter table depenses enable row level security;

create policy depenses_gestionnaire on depenses
  for all to authenticated using (est_gestionnaire()) with check (est_gestionnaire());
