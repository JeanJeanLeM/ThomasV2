-- Migration 020 Simplifiée: Création du bucket photos seulement
-- Date: 2024-12-16
-- Description: Créer le bucket photos (politiques à ajouter manuellement)

-- 1. Créer le bucket photos s'il n'existe pas déjà
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Note: Les politiques RLS doivent être créées manuellement dans le dashboard
-- car elles nécessitent des permissions spéciales sur storage.objects

DO $$
BEGIN
    RAISE NOTICE 'Migration 020 simplifiée terminée: Bucket photos créé';
    RAISE NOTICE 'IMPORTANT: Créer les politiques RLS manuellement dans le dashboard';
    RAISE NOTICE 'Structure du path: photos/{category}/{farm_id}/{timestamp}_{filename}';
END $$;