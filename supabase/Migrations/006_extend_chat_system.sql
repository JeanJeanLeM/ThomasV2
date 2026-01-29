-- Migration: Extension du système de chat pour support privé/partagé
-- Extends existing chat_sessions and chat_messages tables

-- 1. Étendre chat_sessions pour les chats privés/partagés
ALTER TABLE public.chat_sessions 
ADD COLUMN is_shared boolean DEFAULT false,
ADD COLUMN description text,
ADD COLUMN last_message_at timestamp with time zone DEFAULT now(),
ADD COLUMN archived_at timestamp with time zone,
ADD COLUMN updated_at timestamp with time zone DEFAULT now();

-- 2. Créer table pour les participants aux chats
CREATE TABLE public.chat_participants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    role character varying NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at timestamp with time zone DEFAULT now(),
    last_read_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    UNIQUE(chat_session_id, user_id)
);

-- 3. Étendre chat_messages pour métadonnées
ALTER TABLE public.chat_messages 
ADD COLUMN metadata jsonb DEFAULT '{}',
ADD COLUMN edited_at timestamp with time zone,
ADD COLUMN reply_to_id uuid REFERENCES public.chat_messages(id);

-- 4. Index pour performance
CREATE INDEX idx_chat_sessions_farm_user ON public.chat_sessions(farm_id, user_id);
CREATE INDEX idx_chat_sessions_shared ON public.chat_sessions(farm_id, is_shared) WHERE is_shared = true;
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id, is_active);
CREATE INDEX idx_chat_participants_session ON public.chat_participants(chat_session_id, is_active);
CREATE INDEX idx_chat_messages_session_created ON public.chat_messages(session_id, created_at DESC);

-- 5. RLS (Row Level Security) Policies
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat sessions: utilisateur peut voir ses propres chats ou ceux partagés où il est participant
CREATE POLICY "Users can view their own chats and shared chats they participate in"
ON public.chat_sessions FOR SELECT
USING (
    user_id = auth.uid() 
    OR 
    (is_shared = true AND id IN (
        SELECT chat_session_id 
        FROM public.chat_participants 
        WHERE user_id = auth.uid() AND is_active = true
    ))
);

-- Chat sessions: utilisateur peut créer des chats dans ses fermes
CREATE POLICY "Users can create chats in their farms"
ON public.chat_sessions FOR INSERT
WITH CHECK (
    farm_id IN (
        SELECT farm_id 
        FROM public.farm_members 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- Chat sessions: utilisateur peut modifier ses propres chats ou chats partagés où il est admin
CREATE POLICY "Users can update their own chats or shared chats they admin"
ON public.chat_sessions FOR UPDATE
USING (
    user_id = auth.uid()
    OR
    (is_shared = true AND id IN (
        SELECT chat_session_id 
        FROM public.chat_participants 
        WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    ))
);

-- Chat participants: utilisateur peut voir les participants des chats où il participe
CREATE POLICY "Users can view participants of chats they participate in"
ON public.chat_participants FOR SELECT
USING (
    chat_session_id IN (
        SELECT id FROM public.chat_sessions 
        WHERE user_id = auth.uid() 
        OR id IN (
            SELECT chat_session_id 
            FROM public.chat_participants 
            WHERE user_id = auth.uid() AND is_active = true
        )
    )
);

-- Chat participants: admins peuvent gérer les participants
CREATE POLICY "Chat admins can manage participants"
ON public.chat_participants FOR ALL
USING (
    chat_session_id IN (
        SELECT chat_session_id 
        FROM public.chat_participants 
        WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    )
);

-- Chat messages: utilisateur peut voir les messages des chats où il participe
CREATE POLICY "Users can view messages from chats they participate in"
ON public.chat_messages FOR SELECT
USING (
    session_id IN (
        SELECT id FROM public.chat_sessions 
        WHERE user_id = auth.uid()
        OR id IN (
            SELECT chat_session_id 
            FROM public.chat_participants 
            WHERE user_id = auth.uid() AND is_active = true
        )
    )
);

-- Chat messages: utilisateur peut envoyer des messages dans les chats où il participe
CREATE POLICY "Users can send messages in chats they participate in"
ON public.chat_messages FOR INSERT
WITH CHECK (
    session_id IN (
        SELECT id FROM public.chat_sessions 
        WHERE user_id = auth.uid()
        OR id IN (
            SELECT chat_session_id 
            FROM public.chat_participants 
            WHERE user_id = auth.uid() AND is_active = true
        )
    )
);

-- 6. Fonctions pour automatisation
CREATE OR REPLACE FUNCTION update_chat_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_sessions 
    SET 
        last_message_at = NEW.created_at,
        message_count = message_count + 1,
        updated_at = now()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_session_last_message
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_session_last_message();

-- 7. Fonction pour créer un chat avec le créateur comme participant
CREATE OR REPLACE FUNCTION create_chat_with_creator()
RETURNS TRIGGER AS $$
BEGIN
    -- Si c'est un chat partagé, ajouter le créateur comme admin
    IF NEW.is_shared = true THEN
        INSERT INTO public.chat_participants (chat_session_id, user_id, role)
        VALUES (NEW.id, NEW.user_id, 'admin');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_chat_with_creator
    AFTER INSERT ON public.chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION create_chat_with_creator();

-- 8. Vue pour faciliter les requêtes de chats avec participants
CREATE OR REPLACE VIEW chat_sessions_with_info AS
SELECT 
    cs.*,
    (
        SELECT content 
        FROM public.chat_messages 
        WHERE session_id = cs.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) as last_message_content,
    (
        SELECT COUNT(*) 
        FROM public.chat_participants 
        WHERE chat_session_id = cs.id AND is_active = true
    ) as participant_count,
    (
        SELECT COALESCE(json_agg(
            json_build_object(
                'user_id', cp.user_id,
                'role', cp.role,
                'joined_at', cp.joined_at,
                'last_read_at', cp.last_read_at
            )
        ), '[]'::json)
        FROM public.chat_participants cp
        WHERE cp.chat_session_id = cs.id AND cp.is_active = true
    ) as participants
FROM public.chat_sessions cs;

-- Commentaire pour la vue
COMMENT ON VIEW chat_sessions_with_info IS 'Vue enrichie des sessions de chat avec informations des participants et derniers messages';


