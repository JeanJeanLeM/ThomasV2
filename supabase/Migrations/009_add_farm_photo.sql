-- Migration 009: Ajouter le champ photo aux fermes
-- Date: 2025-11-20

-- Ajouter le champ photo_url à la table farms
ALTER TABLE public.farms 
ADD COLUMN photo_url text;

-- Ajouter un commentaire pour documenter le champ
COMMENT ON COLUMN public.farms.photo_url IS 'URL de la photo de la ferme (stockée dans Supabase Storage ou URL externe)';

-- Optionnel: Ajouter une contrainte pour valider que c'est une URL valide
-- ALTER TABLE public.farms 
-- ADD CONSTRAINT farms_photo_url_check 
-- CHECK (photo_url IS NULL OR photo_url ~* '^https?://.*');



