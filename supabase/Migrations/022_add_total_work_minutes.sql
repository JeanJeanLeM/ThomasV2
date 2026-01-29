-- Migration: Ajouter le temps de travail total (durée × nombre de personnes)
-- Date: 2024-11-25

-- Ajouter la colonne total_work_minutes à la table tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS total_work_minutes integer 
GENERATED ALWAYS AS (duration_minutes * COALESCE(number_of_people, 1)) STORED;

-- Commentaire explicatif
COMMENT ON COLUMN public.tasks.total_work_minutes IS 'Temps de travail total en minutes (duration_minutes × number_of_people). Calculé automatiquement.';

-- Vérification
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('duration_minutes', 'number_of_people', 'total_work_minutes')
ORDER BY ordinal_position;

