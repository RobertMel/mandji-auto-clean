-- =====================================================================
--  MANDJI AUTO CLEAN — Migration 0004 : fonctions de rôle privées
--  Appliquée sur Supabase le 28/10/2026.
--  mon_role() et est_gestionnaire() ne sont plus appelables sans être
--  connecté (inutiles pour un visiteur anonyme).
-- =====================================================================
revoke execute on function public.mon_role() from public, anon;
revoke execute on function public.est_gestionnaire() from public, anon;
grant execute on function public.mon_role() to authenticated;
grant execute on function public.est_gestionnaire() to authenticated;
