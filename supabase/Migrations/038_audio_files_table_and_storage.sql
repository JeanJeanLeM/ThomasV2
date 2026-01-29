-- Migration 038: Support Audio Files - Table et Storage
-- Date: 2026-01-12
-- Description: 
--   1. Mettre à jour le bucket photos pour autoriser les formats audio
--   2. Créer la table audio_files pour stocker les métadonnées des fichiers audio
--   3. Ajouter une colonne audio_file_id dans tasks pour lier les tâches aux fichiers audio

-- ============================================
-- 1. Mettre à jour le bucket photos pour autoriser les formats audio
-- ============================================

-- Mettre à jour les types MIME autorisés pour inclure les formats audio
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- Images existantes
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'image/gif',
  -- Formats audio
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/opus'
]
WHERE id = 'photos';

-- Si le bucket n'existe pas, le créer avec tous les formats
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  false,
  26214400, -- 25MB (augmenté pour les fichiers audio)
  ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/webp', 
    'image/gif',
    'audio/webm',
    'audio/mp4',
    'audio/m4a',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/opus'
  ]
)
ON CONFLICT (id) DO UPDATE
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'image/gif',
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/opus'
],
file_size_limit = 26214400; -- 25MB

-- ============================================
-- 2. Créer la table audio_files
-- ============================================

-- Créer la table seulement si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'audio_files'
  ) THEN
    CREATE TABLE public.audio_files (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      farm_id integer NOT NULL,
      user_id uuid NOT NULL,
      
      -- Informations du fichier
      file_name character varying NOT NULL,
      file_path character varying NOT NULL,
      file_size bigint NOT NULL,
      mime_type character varying NOT NULL,
      duration_seconds integer, -- Durée en secondes (si disponible)
      
      -- Métadonnées de transcription
      transcription text, -- Texte transcrit via Whisper API
      transcription_language character varying(10) DEFAULT 'fr',
      transcription_confidence numeric(5,2), -- Score de confiance (0-100)
      
      -- Lien avec le message chat (optionnel)
      chat_message_id uuid,
      
      -- Statut
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      
      CONSTRAINT audio_files_pkey PRIMARY KEY (id),
      CONSTRAINT audio_files_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE,
      CONSTRAINT audio_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
      CONSTRAINT audio_files_chat_message_id_fkey FOREIGN KEY (chat_message_id) REFERENCES public.chat_messages(id) ON DELETE SET NULL
    );

    -- Ajouter les contraintes CHECK séparément
    ALTER TABLE public.audio_files
    ADD CONSTRAINT audio_files_file_size_check CHECK (file_size > 0 AND file_size <= 26214400); -- Max 25MB

    ALTER TABLE public.audio_files
    ADD CONSTRAINT audio_files_duration_check CHECK (duration_seconds IS NULL OR duration_seconds >= 0);

    ALTER TABLE public.audio_files
    ADD CONSTRAINT audio_files_transcription_confidence_check CHECK (transcription_confidence IS NULL OR (transcription_confidence >= 0 AND transcription_confidence <= 100));
  ELSE
    -- La table existe déjà, ajouter les colonnes manquantes
    -- Colonne duration_seconds
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'audio_files' 
      AND column_name = 'duration_seconds'
    ) THEN
      ALTER TABLE public.audio_files ADD COLUMN duration_seconds integer;
    END IF;

    -- Colonne transcription
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'audio_files' 
      AND column_name = 'transcription'
    ) THEN
      ALTER TABLE public.audio_files ADD COLUMN transcription text;
    END IF;

    -- Colonne transcription_language
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'audio_files' 
      AND column_name = 'transcription_language'
    ) THEN
      ALTER TABLE public.audio_files ADD COLUMN transcription_language character varying(10) DEFAULT 'fr';
    END IF;

    -- Colonne transcription_confidence
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'audio_files' 
      AND column_name = 'transcription_confidence'
    ) THEN
      ALTER TABLE public.audio_files ADD COLUMN transcription_confidence numeric(5,2);
    END IF;

    -- Colonne chat_message_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'audio_files' 
      AND column_name = 'chat_message_id'
    ) THEN
      ALTER TABLE public.audio_files ADD COLUMN chat_message_id uuid;
      
      -- Ajouter la clé étrangère si elle n'existe pas
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'audio_files_chat_message_id_fkey'
      ) THEN
        ALTER TABLE public.audio_files
        ADD CONSTRAINT audio_files_chat_message_id_fkey 
        FOREIGN KEY (chat_message_id) 
        REFERENCES public.chat_messages(id) 
        ON DELETE SET NULL;
      END IF;
    END IF;

    -- Ajouter les contraintes CHECK seulement si elles n'existent pas
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND constraint_name = 'audio_files_file_size_check'
    ) THEN
      ALTER TABLE public.audio_files
      ADD CONSTRAINT audio_files_file_size_check CHECK (file_size > 0 AND file_size <= 26214400);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND constraint_name = 'audio_files_duration_check'
    ) THEN
      ALTER TABLE public.audio_files
      ADD CONSTRAINT audio_files_duration_check CHECK (duration_seconds IS NULL OR duration_seconds >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND constraint_name = 'audio_files_transcription_confidence_check'
    ) THEN
      ALTER TABLE public.audio_files
      ADD CONSTRAINT audio_files_transcription_confidence_check CHECK (transcription_confidence IS NULL OR (transcription_confidence >= 0 AND transcription_confidence <= 100));
    END IF;
  END IF;
END $$;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_audio_files_farm_id ON public.audio_files(farm_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_user_id ON public.audio_files(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_chat_message_id ON public.audio_files(chat_message_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_created_at ON public.audio_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_files_is_active ON public.audio_files(is_active) WHERE is_active = true;

-- ============================================
-- 3. Ajouter la colonne audio_file_id dans tasks
-- ============================================

-- Ajouter la colonne si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks' 
    AND column_name = 'audio_file_id'
  ) THEN
    ALTER TABLE public.tasks
    ADD COLUMN audio_file_id uuid;
    
    -- Ajouter la contrainte de clé étrangère seulement si elle n'existe pas
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND constraint_name = 'tasks_audio_file_id_fkey'
    ) THEN
      ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_audio_file_id_fkey 
      FOREIGN KEY (audio_file_id) 
      REFERENCES public.audio_files(id) 
      ON DELETE SET NULL;
    END IF;
    
    -- Index pour améliorer les performances
    CREATE INDEX IF NOT EXISTS idx_tasks_audio_file_id ON public.tasks(audio_file_id);
  END IF;
END $$;

-- ============================================
-- 4. Ajouter la colonne audio_file_id dans observations (optionnel)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'observations' 
    AND column_name = 'audio_file_id'
  ) THEN
    ALTER TABLE public.observations
    ADD COLUMN audio_file_id uuid;
    
    -- Ajouter la contrainte de clé étrangère seulement si elle n'existe pas
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND constraint_name = 'observations_audio_file_id_fkey'
    ) THEN
      ALTER TABLE public.observations
      ADD CONSTRAINT observations_audio_file_id_fkey 
      FOREIGN KEY (audio_file_id) 
      REFERENCES public.audio_files(id) 
      ON DELETE SET NULL;
    END IF;
    
    -- Index pour améliorer les performances
    CREATE INDEX IF NOT EXISTS idx_observations_audio_file_id ON public.observations(audio_file_id);
  END IF;
END $$;

-- ============================================
-- 5. Politiques RLS pour audio_files
-- ============================================

-- Activer RLS sur la table
ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;

-- Politique SELECT: Les utilisateurs peuvent voir les fichiers audio de leurs fermes
DROP POLICY IF EXISTS "audio_files_select_policy" ON public.audio_files;
CREATE POLICY "audio_files_select_policy" ON public.audio_files
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.farm_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.farm_id = audio_files.farm_id
    AND fm.is_active = true
  )
);

-- Politique INSERT: Les utilisateurs peuvent créer des fichiers audio dans leurs fermes
DROP POLICY IF EXISTS "audio_files_insert_policy" ON public.audio_files;
CREATE POLICY "audio_files_insert_policy" ON public.audio_files
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.farm_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.farm_id = audio_files.farm_id
    AND fm.is_active = true
  )
);

-- Politique UPDATE: Les utilisateurs peuvent modifier leurs propres fichiers audio
DROP POLICY IF EXISTS "audio_files_update_policy" ON public.audio_files;
CREATE POLICY "audio_files_update_policy" ON public.audio_files
FOR UPDATE USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.farm_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.farm_id = audio_files.farm_id
    AND fm.is_active = true
  )
);

-- Politique DELETE: Les utilisateurs peuvent supprimer leurs propres fichiers audio
DROP POLICY IF EXISTS "audio_files_delete_policy" ON public.audio_files;
CREATE POLICY "audio_files_delete_policy" ON public.audio_files
FOR DELETE USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.farm_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.farm_id = audio_files.farm_id
    AND fm.is_active = true
  )
);

-- ============================================
-- 6. Fonction pour mettre à jour updated_at automatiquement
-- ============================================

CREATE OR REPLACE FUNCTION public.update_audio_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_audio_files_updated_at ON public.audio_files;
CREATE TRIGGER trigger_update_audio_files_updated_at
BEFORE UPDATE ON public.audio_files
FOR EACH ROW
EXECUTE FUNCTION public.update_audio_files_updated_at();

-- ============================================
-- 7. Commentaires pour documentation
-- ============================================

COMMENT ON TABLE public.audio_files IS 'Table pour stocker les métadonnées des fichiers audio enregistrés via le chat';
COMMENT ON COLUMN public.audio_files.file_path IS 'Chemin complet dans le bucket storage (ex: chat/16/audio/1768222086268_471f95iispx.webm)';
COMMENT ON COLUMN public.audio_files.transcription IS 'Texte transcrit depuis l''audio via Whisper API';
COMMENT ON COLUMN public.audio_files.duration_seconds IS 'Durée de l''enregistrement en secondes (si disponible)';
COMMENT ON COLUMN public.audio_files.chat_message_id IS 'Lien optionnel avec le message chat qui contient l''audio';

COMMENT ON COLUMN public.tasks.audio_file_id IS 'Lien vers le fichier audio associé à cette tâche (si créée depuis un message vocal)';
COMMENT ON COLUMN public.observations.audio_file_id IS 'Lien vers le fichier audio associé à cette observation (si créée depuis un message vocal)';

-- ============================================
-- 8. Message de confirmation
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 038 terminée avec succès';
    RAISE NOTICE '   - Bucket photos mis à jour avec formats audio';
    RAISE NOTICE '   - Table audio_files créée';
    RAISE NOTICE '   - Colonnes audio_file_id ajoutées dans tasks et observations';
    RAISE NOTICE '   - Politiques RLS configurées';
END $$;
