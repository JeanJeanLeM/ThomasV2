-- Migration 086: Attachments linked to tasks and observations
-- Stores user-facing photos and GPS locations attached from chat messages or forms.

CREATE TABLE IF NOT EXISTS public.action_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id integer NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,

  record_type character varying NOT NULL
    CHECK (record_type IN ('task', 'observation')),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  observation_id uuid REFERENCES public.observations(id) ON DELETE CASCADE,

  source_chat_message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  source_attachment_id text,

  attachment_type character varying NOT NULL
    CHECK (attachment_type IN ('image', 'location')),

  -- Image metadata
  bucket text,
  storage_path text,
  public_url text,
  file_name text,
  mime_type text,
  file_size integer,
  width integer,
  height integer,

  -- Location metadata
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  altitude double precision,
  address text,
  maps_url text,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT action_attachments_single_record CHECK (
    (record_type = 'task' AND task_id IS NOT NULL AND observation_id IS NULL)
    OR
    (record_type = 'observation' AND observation_id IS NOT NULL AND task_id IS NULL)
  ),
  CONSTRAINT action_attachments_image_fields CHECK (
    attachment_type <> 'image'
    OR
    (bucket IS NOT NULL AND storage_path IS NOT NULL AND public_url IS NOT NULL)
  ),
  CONSTRAINT action_attachments_location_fields CHECK (
    attachment_type <> 'location'
    OR
    (latitude IS NOT NULL AND longitude IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_action_attachments_farm_active
  ON public.action_attachments(farm_id, is_active);

CREATE INDEX IF NOT EXISTS idx_action_attachments_task
  ON public.action_attachments(task_id)
  WHERE task_id IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_action_attachments_observation
  ON public.action_attachments(observation_id)
  WHERE observation_id IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_action_attachments_source_message
  ON public.action_attachments(source_chat_message_id)
  WHERE source_chat_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_action_attachments_source_dedupe
  ON public.action_attachments(
    source_chat_message_id,
    COALESCE(source_attachment_id, ''),
    record_type,
    COALESCE(task_id, observation_id),
    attachment_type
  )
  WHERE source_chat_message_id IS NOT NULL
    AND source_attachment_id IS NOT NULL;

ALTER TABLE public.action_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view action attachments for accessible farms"
  ON public.action_attachments
  FOR SELECT
  USING (
    farm_id IN (
      SELECT id FROM public.farms WHERE owner_id = auth.uid()
      UNION
      SELECT farm_id FROM public.farm_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Farm members can insert action attachments"
  ON public.action_attachments
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND farm_id IN (
      SELECT id FROM public.farms WHERE owner_id = auth.uid()
      UNION
      SELECT farm_id FROM public.farm_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Farm members can update action attachments"
  ON public.action_attachments
  FOR UPDATE
  USING (
    farm_id IN (
      SELECT id FROM public.farms WHERE owner_id = auth.uid()
      UNION
      SELECT farm_id FROM public.farm_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    farm_id IN (
      SELECT id FROM public.farms WHERE owner_id = auth.uid()
      UNION
      SELECT farm_id FROM public.farm_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

COMMENT ON TABLE public.action_attachments IS
  'User-facing photos and GPS locations linked to tasks or observations.';
COMMENT ON COLUMN public.action_attachments.source_chat_message_id IS
  'Original chat message that carried the attachment, when created from chat.';
COMMENT ON COLUMN public.action_attachments.source_attachment_id IS
  'Client-side attachment id from chat_messages.metadata.attachments for dedupe.';
