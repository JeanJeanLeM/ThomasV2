-- Migration 040: Vue tasks avec transcription audio visible
-- La colonne transcription de audio_files doit être visible lors des requêtes sur les tâches.
-- On crée une vue qui joint tasks et audio_files pour exposer transcription (sans dupliquer les données).

-- ============================================
-- Vue: tasks avec colonnes de transcription audio
-- ============================================
-- Utilisation: SELECT * FROM tasks_with_audio_transcription
-- ou depuis l'app: .from('tasks_with_audio_transcription').select('*')
-- Les lignes ont toutes les colonnes de tasks + audio_transcription, audio_transcription_language, audio_transcription_confidence.

DROP VIEW IF EXISTS public.tasks_with_audio_transcription;

CREATE VIEW public.tasks_with_audio_transcription AS
SELECT
  t.id,
  t.farm_id,
  t.user_id,
  t.title,
  t.description,
  t.category,
  t.type,
  t.date,
  t.time,
  t.duration_minutes,
  t.status,
  t.priority,
  t.plot_ids,
  t.material_ids,
  t.notes,
  t.number_of_people,
  t.created_at,
  t.updated_at,
  t.action,
  t.plants,
  t.surface_unit_ids,
  t.ai_confidence,
  t.is_active,
  t.quantity_nature,
  t.quantity_type,
  t.quantity_value,
  t.quantity_unit,
  t.quantity_converted_value,
  t.quantity_converted_unit,
  t.audio_file_id,
  t.phytosanitary_product_amm,
  -- Colonnes exposées depuis audio_files (visibles dans la "table" tasks)
  a.transcription AS audio_transcription,
  a.transcription_language AS audio_transcription_language,
  a.transcription_confidence AS audio_transcription_confidence
FROM public.tasks t
LEFT JOIN public.audio_files a ON a.id = t.audio_file_id AND a.is_active = true;

-- RLS: la vue hérite des politiques des tables sous-jacentes (tasks + audio_files).
-- Pour les SELECT, Supabase applique RLS sur tasks donc l'utilisateur ne voit que ses tâches.

COMMENT ON VIEW public.tasks_with_audio_transcription IS 'Vue tasks avec colonnes transcription, transcription_language et transcription_confidence de audio_files (jointure sur audio_file_id). Utiliser cette vue pour afficher la transcription dans les listes/détails de tâches.';

-- Permissions pour l'API Supabase (authenticated = utilisateurs connectés)
GRANT SELECT ON public.tasks_with_audio_transcription TO authenticated;
