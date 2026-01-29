-- Thomas V2 - Migration 001: Multi-Tenant Farm System
-- Based on existing schema but simplified for V2

-- =============================================
-- 1. FARMS TABLE (Core)
-- =============================================
CREATE TABLE public.farms (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  description TEXT,
  address TEXT,
  postal_code VARCHAR,
  city VARCHAR,
  region VARCHAR,
  country VARCHAR NOT NULL DEFAULT 'France',
  
  -- Farm details
  total_area NUMERIC CHECK (total_area > 0),
  farm_type VARCHAR CHECK (farm_type IN ('maraichage', 'arboriculture', 'grandes_cultures', 'mixte', 'autre')),
  
  -- Owner & status
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 2. FARM MEMBERS (Multi-tenant access)
-- =============================================
CREATE TABLE public.farm_members (
  id SERIAL PRIMARY KEY,
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role system
  role VARCHAR NOT NULL CHECK (role IN ('owner', 'manager', 'employee', 'advisor', 'viewer')),
  
  -- Permissions
  permissions JSONB NOT NULL DEFAULT '{
    "can_edit_farm": false,
    "can_invite_members": false,
    "can_manage_tasks": false,
    "can_view_analytics": false,
    "can_export_data": false
  }'::jsonb,
  
  -- Status & timestamps
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(farm_id, user_id)
);

-- =============================================
-- 3. FARM INVITATIONS
-- =============================================
CREATE TABLE public.farm_invitations (
  id SERIAL PRIMARY KEY,
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Invitation details
  email VARCHAR NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  role VARCHAR NOT NULL CHECK (role IN ('manager', 'employee', 'advisor', 'viewer')),
  message TEXT,
  
  -- Token & expiry
  invitation_token VARCHAR NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Status tracking
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 4. PROFILES (Enhanced from old schema)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  email VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  full_name VARCHAR GENERATED ALWAYS AS (
    CASE 
      WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
      THEN first_name || ' ' || last_name
      ELSE COALESCE(first_name, last_name, email)
    END
  ) STORED,
  
  -- Profile details
  avatar_url TEXT,
  phone VARCHAR,
  bio TEXT,
  profession VARCHAR,
  
  -- Settings
  language VARCHAR NOT NULL DEFAULT 'fr',
  timezone VARCHAR DEFAULT 'Europe/Paris',
  
  -- Preferences
  notification_preferences JSONB NOT NULL DEFAULT '{
    "email_notifications": true,
    "push_notifications": true,
    "marketing_emails": false,
    "task_reminders": true,
    "farm_invitations": true
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 5. PLOTS (Simplified from old schema)
-- =============================================
CREATE TABLE public.plots (
  id SERIAL PRIMARY KEY,
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  
  -- Plot details
  name VARCHAR NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  code VARCHAR, -- Optional short code
  type VARCHAR NOT NULL CHECK (type IN (
    'serre_plastique', 'serre_verre', 'plein_champ', 'tunnel', 
    'hydroponique', 'pepiniere', 'autre'
  )),
  
  -- Dimensions
  length NUMERIC CHECK (length > 0),
  width NUMERIC CHECK (width > 0),
  surface_area NUMERIC GENERATED ALWAYS AS (
    CASE WHEN length IS NOT NULL AND width IS NOT NULL 
    THEN length * width 
    ELSE NULL END
  ) STORED,
  
  -- Details
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 6. MATERIALS (Simplified from old schema)
-- =============================================
CREATE TABLE public.materials (
  id SERIAL PRIMARY KEY,
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  
  -- Material details
  name VARCHAR NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  category VARCHAR NOT NULL CHECK (category IN (
    'tracteurs', 'outils_tracteur', 'outils_manuels', 
    'materiel_marketing', 'petit_equipement', 'autre'
  )),
  
  -- Optional details
  model VARCHAR,
  brand VARCHAR,
  description TEXT,
  
  -- Financial
  cost NUMERIC CHECK (cost >= 0),
  purchase_date DATE,
  supplier VARCHAR,
  
  -- Status
  condition_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 7. TASKS (Core from old schema, simplified)
-- =============================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Task details
  title VARCHAR NOT NULL CHECK (char_length(title) >= 2 AND char_length(title) <= 200),
  description TEXT,
  
  -- Classification
  category VARCHAR CHECK (category IN ('production', 'marketing', 'administratif', 'general')),
  type VARCHAR CHECK (type IN ('tache', 'observation', 'commentaire', 'question', 'autre')),
  
  -- Scheduling
  date DATE NOT NULL,
  time TIME,
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  
  -- Status & Priority
  status VARCHAR NOT NULL DEFAULT 'en_attente' CHECK (status IN (
    'en_attente', 'en_cours', 'terminee', 'annulee', 'archivee'
  )),
  priority VARCHAR NOT NULL DEFAULT 'moyenne' CHECK (priority IN (
    'basse', 'moyenne', 'haute', 'urgente'
  )),
  
  -- Relations
  plot_ids INTEGER[] DEFAULT '{}',
  material_ids INTEGER[] DEFAULT '{}',
  
  -- Additional info
  notes TEXT,
  number_of_people INTEGER DEFAULT 1 CHECK (number_of_people > 0),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 8. INDEXES FOR PERFORMANCE
-- =============================================

-- Farms
CREATE INDEX idx_farms_owner_id ON public.farms(owner_id);
CREATE INDEX idx_farms_active ON public.farms(is_active) WHERE is_active = true;

-- Farm Members
CREATE INDEX idx_farm_members_farm_id ON public.farm_members(farm_id);
CREATE INDEX idx_farm_members_user_id ON public.farm_members(user_id);
CREATE INDEX idx_farm_members_active ON public.farm_members(farm_id, is_active) WHERE is_active = true;

-- Farm Invitations
CREATE INDEX idx_farm_invitations_farm_id ON public.farm_invitations(farm_id);
CREATE INDEX idx_farm_invitations_email ON public.farm_invitations(email);
CREATE INDEX idx_farm_invitations_token ON public.farm_invitations(invitation_token);
CREATE INDEX idx_farm_invitations_status ON public.farm_invitations(status) WHERE status = 'pending';

-- Plots
CREATE INDEX idx_plots_farm_id ON public.plots(farm_id);
CREATE INDEX idx_plots_active ON public.plots(farm_id, is_active) WHERE is_active = true;

-- Materials
CREATE INDEX idx_materials_farm_id ON public.materials(farm_id);
CREATE INDEX idx_materials_active ON public.materials(farm_id, is_active) WHERE is_active = true;

-- Tasks
CREATE INDEX idx_tasks_farm_id ON public.tasks(farm_id);
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_date ON public.tasks(farm_id, date);
CREATE INDEX idx_tasks_status ON public.tasks(farm_id, status);

-- =============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 10. RLS POLICIES
-- =============================================

-- FARMS: Users can only see farms they own or are members of
CREATE POLICY "Users can view their farms" ON public.farms
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    id IN (
      SELECT farm_id FROM public.farm_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create farms" ON public.farms
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their farms" ON public.farms
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their farms" ON public.farms
  FOR DELETE USING (owner_id = auth.uid());

-- FARM_MEMBERS: Users can see members of their farms
CREATE POLICY "Users can view farm members" ON public.farm_members
  FOR SELECT USING (
    farm_id IN (
      SELECT id FROM public.farms WHERE owner_id = auth.uid()
      UNION
      SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Farm owners can manage members" ON public.farm_members
  FOR ALL USING (
    farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
  );

-- FARM_INVITATIONS: Users can see invitations for their farms
CREATE POLICY "Users can view farm invitations" ON public.farm_invitations
  FOR SELECT USING (
    invited_by = auth.uid() OR
    farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
  );

CREATE POLICY "Farm owners can manage invitations" ON public.farm_invitations
  FOR ALL USING (
    farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
  );

-- PROFILES: Users can see their own profile and profiles of farm members
CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR
    id IN (
      SELECT fm.user_id FROM public.farm_members fm
      JOIN public.farm_members my_farms ON fm.farm_id = my_farms.farm_id
      WHERE my_farms.user_id = auth.uid() AND my_farms.is_active = true
    )
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- PLOTS: Users can see plots of their farms
CREATE POLICY "Users can view farm plots" ON public.plots
  FOR SELECT USING (
    farm_id IN (
      SELECT id FROM public.farms WHERE owner_id = auth.uid()
      UNION
      SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Farm members can manage plots" ON public.plots
  FOR ALL USING (
    farm_id IN (
      SELECT id FROM public.farms WHERE owner_id = auth.uid()
      UNION
      SELECT farm_id FROM public.farm_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- MATERIALS: Users can see materials of their farms
CREATE POLICY "Users can view farm materials" ON public.materials
  FOR SELECT USING (
    farm_id IN (
      SELECT id FROM public.farms WHERE owner_id = auth.uid()
      UNION
      SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Farm members can manage materials" ON public.materials
  FOR ALL USING (
    farm_id IN (
      SELECT id FROM public.farms WHERE owner_id = auth.uid()
      UNION
      SELECT farm_id FROM public.farm_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- TASKS: Users can see tasks of their farms
CREATE POLICY "Users can view farm tasks" ON public.tasks
  FOR SELECT USING (
    farm_id IN (
      SELECT id FROM public.farms WHERE owner_id = auth.uid()
      UNION
      SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Farm members can manage tasks" ON public.tasks
  FOR ALL USING (
    farm_id IN (
      SELECT id FROM public.farms WHERE owner_id = auth.uid()
      UNION
      SELECT farm_id FROM public.farm_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =============================================
-- 11. FUNCTIONS FOR PERMISSIONS
-- =============================================

-- Function to check if user has specific permission on farm
CREATE OR REPLACE FUNCTION public.user_has_farm_permission(
  p_farm_id INTEGER,
  p_permission TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is farm owner (has all permissions)
  IF EXISTS (
    SELECT 1 FROM public.farms 
    WHERE id = p_farm_id AND owner_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific permission for farm member
  RETURN EXISTS (
    SELECT 1 FROM public.farm_members fm
    WHERE fm.farm_id = p_farm_id 
      AND fm.user_id = auth.uid()
      AND fm.is_active = true
      AND (fm.permissions->p_permission)::boolean = true
  );
END;
$$;

-- Function to get user's farms
CREATE OR REPLACE FUNCTION public.get_user_farms()
RETURNS TABLE (
  farm_id INTEGER,
  farm_name VARCHAR,
  role VARCHAR,
  is_owner BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id as farm_id,
    f.name as farm_name,
    CASE WHEN f.owner_id = auth.uid() THEN 'owner'::varchar ELSE fm.role END as role,
    f.owner_id = auth.uid() as is_owner
  FROM public.farms f
  LEFT JOIN public.farm_members fm ON f.id = fm.farm_id AND fm.user_id = auth.uid()
  WHERE f.owner_id = auth.uid() 
     OR (fm.user_id = auth.uid() AND fm.is_active = true);
END;
$$;

-- =============================================
-- 12. TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON public.farms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_farm_members_updated_at BEFORE UPDATE ON public.farm_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_farm_invitations_updated_at BEFORE UPDATE ON public.farm_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plots_updated_at BEFORE UPDATE ON public.plots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 13. SEED DATA FOR TESTING
-- =============================================

-- Note: Seed data is in separate file supabase/seeds/001_test_data.sql
-- It should be executed after users are created via Supabase Auth
-- and their real UUIDs are available

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

COMMENT ON TABLE public.farms IS 'Fermes - Entité principale du système multi-tenant';
COMMENT ON TABLE public.farm_members IS 'Membres des fermes avec rôles et permissions';
COMMENT ON TABLE public.farm_invitations IS 'Invitations pour rejoindre une ferme';
COMMENT ON TABLE public.profiles IS 'Profils utilisateurs étendus';
COMMENT ON TABLE public.plots IS 'Parcelles/Serres des fermes';
COMMENT ON TABLE public.materials IS 'Matériel et équipements des fermes';
COMMENT ON TABLE public.tasks IS 'Tâches et observations des fermes';
