-- Migration 032: Ajout du filtre ravageur aux préférences phytosanitaires
-- Date: 2026-01-22

-- Ajouter la colonne pest_filter pour filtrer par ravageur/bioagresseur
ALTER TABLE public.user_phytosanitary_preferences
ADD COLUMN IF NOT EXISTS pest_filter TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Commentaire pour documentation
COMMENT ON COLUMN public.user_phytosanitary_preferences.pest_filter IS 
    'Filtres de ravageurs/bioagresseurs sélectionnés par l''utilisateur';
