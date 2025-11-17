# ⚡ SPÉCIFICATIONS TECHNIQUES DÉTAILLÉES - THOMAS V2

## 📋 Vue d'Ensemble

Ce document détaille les spécifications techniques et critères d'acceptation précis pour chaque étape majeure du développement Thomas V2.

---

## 🏗️ ÉTAPE 1: FONDATIONS TECHNIQUES

### 1.1 Configuration Projet Base

#### **Spécifications Techniques:**

```json
{
  "framework": "Expo SDK 50+",
  "language": "TypeScript 5+",
  "bundler": "Metro",
  "package_manager": "npm",
  "node_version": "18+",
  "structure": {
    "src/": {
      "components/": "Composants réutilisables",
      "screens/": "Écrans navigation",
      "services/": "Logique métier",
      "hooks/": "Custom hooks React",
      "utils/": "Utilitaires génériques",
      "types/": "Définitions TypeScript",
      "constants/": "Constantes application"
    },
    "assets/": "Images, fonts, etc.",
    "docs/": "Documentation projet"
  }
}
```

#### **Critères d'Acceptation:**

- [ ] ✅ `npx expo start` démarre sans erreur
- [ ] ✅ TypeScript strict mode activé (0 erreur)
- [ ] ✅ ESLint + Prettier configurés avec règles strictes
- [ ] ✅ Structure dossiers respectée
- [ ] ✅ Git hooks pré-commit fonctionnels
- [ ] ✅ Variables environnement template (.env.example)
- [ ] ✅ README.md avec instructions setup complètes

---

### 1.2 Configuration Supabase

#### **Spécifications Techniques:**

```typescript
interface SupabaseConfig {
  project: {
    region: 'eu-west-1'; // Europe RGPD
    pricing_plan: 'Pro'; // Auth providers + Edge Functions
    database_version: '15+';
  };

  auth: {
    site_url: 'https://app.thomas-assistant.fr';
    jwt_expiry: 86400; // 24h
    refresh_token_rotation: true;
    email_confirm_enabled: true;
    providers: ['google', 'apple', 'email'];
  };

  database: {
    enable_rls: true;
    enable_realtime: true;
    timezone: 'Europe/Paris';
  };

  storage: {
    buckets: ['documents', 'photos', 'exports'];
    max_file_size: '10MB';
    allowed_mime_types: ['image/*', 'application/pdf'];
  };
}
```

#### **Configuration OAuth:**

```sql
-- Google OAuth
UPDATE auth.config SET
  external_google_enabled = true,
  external_google_client_id = 'GOOGLE_CLIENT_ID',
  external_google_secret = 'GOOGLE_SECRET',
  external_google_redirect_uri = 'https://your-project.supabase.co/auth/v1/callback';

-- Apple OAuth
UPDATE auth.config SET
  external_apple_enabled = true,
  external_apple_client_id = 'APPLE_CLIENT_ID',
  external_apple_secret = 'APPLE_SECRET';
```

#### **Critères d'Acceptation:**

- [ ] ✅ Projet Supabase créé et configuré région EU
- [ ] ✅ Auth Google testé avec compte test
- [ ] ✅ Auth Apple testé avec compte test
- [ ] ✅ Auth email + confirmation fonctionnelle
- [ ] ✅ Templates email en français configurés
- [ ] ✅ RLS activé sur toutes les tables
- [ ] ✅ Buckets storage créés avec permissions
- [ ] ✅ SDK Supabase intégré côté mobile
- [ ] ✅ Variables environnement configurées

---

### 1.3 Design System

#### **Spécifications Techniques:**

```typescript
// Design Tokens
export const ThomasDesignTokens = {
  colors: {
    primary: {
      50: '#f0fdf4', // Vert agriculture très clair
      100: '#dcfce7',
      500: '#22c55e', // Vert principal
      600: '#16a34a',
      900: '#14532d',
    },
    secondary: {
      500: '#3b82f6', // Bleu planning
      600: '#2563eb',
    },
    warning: {
      500: '#f59e0b', // Orange observations
      600: '#d97706',
    },
    error: {
      500: '#ef4444', // Rouge traitements
      600: '#dc2626',
    },
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      500: '#6b7280',
      900: '#111827',
    },
  },

  typography: {
    families: {
      sans: 'Inter', // Font principale
      mono: 'JetBrains Mono',
    },
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
    },
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
};
```

#### **Composants Base Requis:**

```typescript
// Components obligatoires
interface DesignSystemComponents {
  Button: {
    variants: ['primary', 'secondary', 'ghost', 'danger'];
    sizes: ['sm', 'md', 'lg'];
    states: ['default', 'loading', 'disabled'];
  };

  Input: {
    types: ['text', 'email', 'password', 'number', 'textarea'];
    states: ['default', 'error', 'success', 'disabled'];
    features: ['label', 'helper', 'error_message'];
  };

  Card: {
    variants: ['default', 'elevated', 'outlined'];
    padding: ['sm', 'md', 'lg'];
  };

  Modal: {
    sizes: ['sm', 'md', 'lg', 'full'];
    positions: ['center', 'bottom'];
  };

  Header: {
    variants: ['default', 'transparent', 'elevated'];
    features: ['title', 'back_button', 'actions'];
  };
}
```

#### **Critères d'Acceptation:**

- [ ] ✅ NativeWind (Tailwind) configuré et fonctionnel
- [ ] ✅ Design tokens définis et exportés
- [ ] ✅ Tous les composants base implémentés
- [ ] ✅ Storybook configuré avec tous les composants
- [ ] ✅ Tests visuels automatisés
- [ ] ✅ Support dark mode (optionnel v1)
- [ ] ✅ Accessibilité a11y conforme
- [ ] ✅ Documentation composants complète

---

## 🔐 ÉTAPE 2: SYSTÈME D'AUTHENTIFICATION

### 2.1 Service Auth Unifié

#### **Spécifications Techniques:**

```typescript
interface AuthService {
  // Méthodes principales
  signInWithEmail(email: string, password: string): Promise<AuthResult>;
  signInWithGoogle(): Promise<AuthResult>;
  signInWithApple(): Promise<AuthResult>;
  signUp(email: string, password: string, profile: UserProfile): Promise<AuthResult>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;

  // Gestion session
  getCurrentUser(): Promise<User | null>;
  getSession(): Promise<Session | null>;
  refreshSession(): Promise<Session>;

  // État auth
  onAuthStateChanged(callback: (user: User | null) => void): () => void;

  // Offline support
  cacheCredentials(user: User, session: Session): Promise<void>;
  getCachedUser(): Promise<User | null>;
  clearCache(): Promise<void>;
}

interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: AuthError;
}

interface AuthError {
  code: string;
  message: string;
  details?: any;
}
```

#### **Gestion Session Persistante:**

```typescript
interface SessionConfig {
  storage: 'secure_storage'; // Expo SecureStore
  auto_refresh: true;
  refresh_threshold: 3600; // 1h avant expiration
  max_retry_attempts: 3;
  offline_duration: 604800; // 7 jours
}
```

#### **Critères d'Acceptation:**

- [ ] ✅ Auth email + password fonctionnelle
- [ ] ✅ Auth Google OAuth opérationnelle
- [ ] ✅ Auth Apple Sign In opérationnelle
- [ ] ✅ Sessions persistantes 30 jours
- [ ] ✅ Refresh automatique des tokens
- [ ] ✅ Gestion offline 7 jours
- [ ] ✅ Gestion erreurs avec messages français
- [ ] ✅ Tests unitaires coverage >90%
- [ ] ✅ Logs détaillés pour debugging

---

### 2.2 Interface Authentification

#### **Spécifications UI/UX:**

```typescript
interface AuthScreens {
  WelcomeScreen: {
    elements: ['logo', 'tagline', 'cta_buttons'];
    buttons: ['Se connecter', 'Créer un compte'];
    style: 'moderne, agriculture, confiance';
  };

  SignInScreen: {
    fields: ['email', 'password'];
    actions: ['sign_in', 'forgot_password', 'social_auth'];
    validation: 'temps_real';
    keyboard_type: 'email-address';
  };

  SignUpScreen: {
    fields: ['first_name', 'last_name', 'email', 'password', 'confirm_password'];
    validation: {
      password: '8+ chars, 1 number, 1 special';
      email: 'format_valid';
      names: 'required';
    };
  };

  ForgotPasswordScreen: {
    fields: ['email'];
    flow: 'email_sent → instructions → return_signin';
  };
}
```

#### **Messages Français:**

```typescript
export const AUTH_MESSAGES_FR = {
  errors: {
    invalid_credentials: 'Email ou mot de passe incorrect',
    email_not_confirmed: 'Veuillez confirmer votre email avant de vous connecter',
    user_not_found: 'Aucun compte trouvé avec cet email',
    weak_password:
      'Le mot de passe doit contenir au moins 8 caractères, 1 chiffre et 1 caractère spécial',
    email_already_used: 'Cet email est déjà utilisé',
    google_auth_cancelled: 'Connexion Google annulée',
    apple_auth_failed: 'Échec de la connexion Apple',
    network_error: 'Problème de connexion, vérifiez votre réseau',
  },

  success: {
    signup_complete: 'Compte créé ! Vérifiez votre email pour confirmer',
    password_reset_sent: 'Email de réinitialisation envoyé',
    signin_success: 'Connexion réussie, bienvenue !',
    signout_success: 'Déconnexion réussie',
  },
};
```

#### **Critères d'Acceptation:**

- [ ] ✅ Design respecte le design system
- [ ] ✅ Navigation fluide entre écrans
- [ ] ✅ Validation temps réel des champs
- [ ] ✅ Messages d'erreur français contextuels
- [ ] ✅ Loading states pendant auth
- [ ] ✅ Support clavier externe (tablettes)
- [ ] ✅ Tests E2E pour tous les flows
- [ ] ✅ Responsive mobile + tablette

---

## 🏡 ÉTAPE 3: SYSTÈME MULTI-FERMES

### 3.1 Base de Données Fermes

#### **Schema SQL Complet:**

```sql
-- Table fermes principales
CREATE TABLE farms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) >= 2),
  description TEXT,
  address JSONB DEFAULT '{}', -- Structure address française
  farm_type TEXT DEFAULT 'maraichage' CHECK (farm_type IN ('maraichage', 'arboriculture', 'grandes_cultures', 'autre')),
  settings JSONB DEFAULT '{}',
  total_area DECIMAL(10,2), -- Surface totale en m²

  -- Ownership
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_name CHECK (name ~ '^[a-zA-ZÀ-ÿ0-9 \-'']+$')
);

-- Table membres fermes
CREATE TABLE farm_members (
  id SERIAL PRIMARY KEY,
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role management
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Manager', 'Employee')),
  permissions JSONB DEFAULT '[]', -- Array permissions spécifiques

  -- Status
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(farm_id, user_id)
);

-- Table invitations fermes
CREATE TABLE farm_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Invitation details
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Manager', 'Employee')),
  message TEXT,

  -- Security
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_invitations ENABLE ROW LEVEL SECURITY;

-- Politique: utilisateur voit ses fermes
CREATE POLICY "Users can view their farms" ON farms
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid() AND is_active = true)
  );

-- Politique: seul owner peut modifier ferme
CREATE POLICY "Only owners can update farms" ON farms
  FOR UPDATE USING (owner_id = auth.uid());

-- Index performance
CREATE INDEX idx_farms_owner ON farms(owner_id);
CREATE INDEX idx_farm_members_user ON farm_members(user_id);
CREATE INDEX idx_farm_members_farm ON farm_members(farm_id);
CREATE INDEX idx_invitations_email ON farm_invitations(email);
CREATE INDEX idx_invitations_token ON farm_invitations(token);
```

#### **Triggers et Fonctions:**

```sql
-- Function: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger: farms updated_at
CREATE TRIGGER update_farms_updated_at
  BEFORE UPDATE ON farms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: auto-add owner as member
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO farm_members (farm_id, user_id, role, is_active)
  VALUES (NEW.id, NEW.owner_id, 'Owner', true);
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger: owner auto-member
CREATE TRIGGER add_owner_as_member_trigger
  AFTER INSERT ON farms
  FOR EACH ROW EXECUTE FUNCTION add_owner_as_member();
```

#### **Critères d'Acceptation:**

- [ ] ✅ Toutes les tables créées sans erreur
- [ ] ✅ RLS configuré et testé pour chaque table
- [ ] ✅ Contraintes de données respectées
- [ ] ✅ Triggers fonctionnels (owner auto-member)
- [ ] ✅ Index créés et performances validées
- [ ] ✅ Seeds de données test chargées
- [ ] ✅ Tests sécurité multi-tenant passés

---

### 3.2 Services Fermes

#### **Spécifications Service:**

```typescript
interface FarmService {
  // CRUD Fermes
  createFarm(data: CreateFarmData): Promise<Farm>;
  getFarm(id: number): Promise<Farm>;
  getUserFarms(userId: string): Promise<Farm[]>;
  updateFarm(id: number, data: UpdateFarmData): Promise<Farm>;
  deleteFarm(id: number): Promise<void>;

  // Gestion membres
  inviteMember(
    farmId: number,
    email: string,
    role: UserRole,
    message?: string
  ): Promise<Invitation>;
  acceptInvitation(token: string): Promise<FarmMember>;
  removeMember(farmId: number, userId: string): Promise<void>;
  updateMemberRole(farmId: number, userId: string, role: UserRole): Promise<FarmMember>;

  // Permissions
  checkPermission(farmId: number, userId: string, action: string): Promise<boolean>;
  getUserRole(farmId: number, userId: string): Promise<UserRole>;
}

interface CreateFarmData {
  name: string;
  description?: string;
  farmType: 'maraichage' | 'arboriculture' | 'grandes_cultures' | 'autre';
  address: {
    street?: string;
    city: string;
    postalCode: string;
    department: string;
    region: string;
  };
}

interface InvitationService {
  sendInvitation(invitation: Invitation): Promise<void>;
  generateInvitationToken(): string;
  validateInvitationToken(token: string): Promise<boolean>;
  expireInvitation(id: string): Promise<void>;
}
```

#### **Système Permissions:**

```typescript
const ROLE_PERMISSIONS = {
  Owner: [
    'farm:read',
    'farm:update',
    'farm:delete',
    'members:read',
    'members:invite',
    'members:remove',
    'members:update_role',
    'plots:create',
    'plots:read',
    'plots:update',
    'plots:delete',
    'materials:create',
    'materials:read',
    'materials:update',
    'materials:delete',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'observations:create',
    'observations:read',
    'observations:update',
    'observations:delete',
  ],

  Manager: [
    'farm:read',
    'members:read',
    'members:invite',
    'plots:create',
    'plots:read',
    'plots:update',
    'materials:create',
    'materials:read',
    'materials:update',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'observations:create',
    'observations:read',
    'observations:update',
  ],

  Employee: [
    'farm:read',
    'members:read',
    'plots:read',
    'materials:read',
    'tasks:create',
    'tasks:read',
    'tasks:update:own',
    'observations:create',
    'observations:read',
  ],
};
```

#### **Critères d'Acceptation:**

- [ ] ✅ Tous les services CRUD fonctionnels
- [ ] ✅ Système invitations email opérationnel
- [ ] ✅ Permissions respectées selon rôles
- [ ] ✅ Gestion erreurs avec messages français
- [ ] ✅ Cache local fermes utilisateur
- [ ] ✅ Tests unitaires coverage >85%
- [ ] ✅ Performance <500ms toutes opérations

---

## 🤖 ÉTAPE 5: IA THOMAS (DÉTAILS TECHNIQUES)

### 5.1 Service IA Unifié

#### **Architecture Service:**

```typescript
interface ThomasAIService {
  // Configuration
  config: {
    model: 'gpt-4o-mini';
    max_tokens: 2000;
    temperature: 0.3;
    language: 'fr';
    fallback_enabled: true;
  };

  // Méthodes principales
  analyzeMessage(
    message: string,
    context: AIContext,
    type: 'general' | 'task' | 'observation' | 'planning'
  ): Promise<AIResponse>;

  generatePrompt(type: PromptType, context: AIContext): string;
  processResponse(response: OpenAIResponse, type: ResponseType): ProcessedAIResponse;

  // Cache et performance
  getCachedResponse(key: string): Promise<AIResponse | null>;
  setCachedResponse(key: string, response: AIResponse): Promise<void>;

  // Fallback offline
  getLocalResponse(message: string, type: string): LocalResponse;
}

interface AIContext {
  user: User;
  farm: Farm;
  plots: Plot[];
  surfaceUnits: SurfaceUnit[];
  materials: Material[];
  conversions: ConversionUnit[];
  recentTasks: Task[];
  recentMessages: ChatMessage[];
  seasonalContext: {
    month: number;
    season: 'printemps' | 'été' | 'automne' | 'hiver';
    weatherForecast?: WeatherData;
  };
}
```

#### **Système de Prompts:**

```typescript
// Prompt Template System
export const PROMPT_TEMPLATES = {
  SYSTEM_BASE: `
Tu es Thomas, l'assistant IA agricole français spécialisé pour les maraîchers.

CONTEXTE FERME:
- Ferme: {{farm.name}} ({{farm.type}})
- Parcelles: {{plots.names}}
- Matériel: {{materials.names}}
- Saison: {{season}} {{current_month}}

STYLE DE RÉPONSE:
- Français agricole professionnel mais amical
- Tutoiement naturel 
- Suggestions concrètes et actionables
- Questions de clarification si nécessaire

CAPACITÉS:
- Analyser descriptions travaux agricoles français
- Créer tâches automatiquement avec données précises
- Reconnaître parcelles/matériel par noms/descriptions
- Calculator durées depuis expressions temporelles
- Convertir quantités selon habitudes utilisateur
`,

  TASK_ANALYSIS: `
Analyse ce message de maraîcher et extrais les tâches agricoles réalisées.

MESSAGE: "{{user_message}}"

INSTRUCTIONS EXTRACTION:
1. Action principale (verbe français): planter, récolter, arroser, bêcher, etc.
2. Cultures mentionnées (noms français): tomate, carotte, salade, etc.
3. Durée de travail (expressions temporelles): "2h", "toute la matinée", "rapidement"
4. Quantités EXPLICITES uniquement: "10 plants", "2 caisses", "5 rangs" 
5. Parcelles par reconnaissance naturelle: "serre 1", "tunnel", "plein champ"
6. Unités surface contextuelle: "planche 3" dans contexte parcelle
7. Matériel utilisé: "motoculteur", "arrosoir", "serfouette"

DONNÉES FERME DISPONIBLES:
{{farm_context_data}}

RETOUR JSON OBLIGATOIRE:
{
  "taches_detectees": [
    {
      "action": "verbe_francais",
      "cultures": ["liste_cultures_francaises"],
      "duree_minutes": nombre_entier,
      "quantite": {
        "valeur": nombre,
        "unite": "unite_francaise",
        "type": "surface|volume|nombre|poids"
      },
      "parcelles_matchees": [id_parcelles],
      "unites_surface_matchees": [id_unites],
      "materiel_matche": [id_materiel],
      "notes_contexte": "observations_supplementaires",
      "confiance_analyse": 0.0_a_1.0
    }
  ],
  "clarifications_necessaires": ["questions_si_ambigu"],
  "suggestions_validation": ["corrections_possibles"]
}
`,
};
```

#### **Système de Cache Intelligent:**

```typescript
interface AICache {
  // Cache stratégique
  cacheStrategy: {
    common_patterns: {
      duration: '7 days';
      patterns: ["j'ai planté", "j'ai récolté", "j'ai arrosé"];
    };

    context_dependent: {
      duration: '24 hours';
      key_factors: ['farm_id', 'season', 'recent_activities'];
    };

    user_specific: {
      duration: '3 days';
      factors: ['user_expressions', 'farm_vocabulary'];
    };
  };

  // Performance targets
  performance: {
    cache_hit_rate: '>60%';
    response_time_cached: '<100ms';
    response_time_api: '<3s';
  };
}
```

#### **Critères d'Acceptation:**

- [ ] ✅ Service IA fonctionnel avec GPT-4o-mini
- [ ] ✅ Prompts français natifs optimisés
- [ ] ✅ Context management ferme intégré
- [ ] ✅ Cache intelligent >60% hit rate
- [ ] ✅ Fallback local pour patterns simples
- [ ] ✅ Gestion erreurs robuste
- [ ] ✅ Performance <3s réponse IA
- [ ] ✅ Tests avec données réelles agricoles françaises
- [ ] ✅ Monitoring coûts OpenAI

---

## 📱 ÉTAPE 6: INTERFACES UTILISATEUR

### 6.2 Écran Calendrier (Hub Central)

#### **Spécifications Interface:**

```typescript
interface CalendarScreen {
  views: {
    day: {
      layout: 'timeline_hours';
      time_range: '06:00-20:00';
      slot_duration: 30; // minutes
      display_elements: ['tasks', 'observations', 'treatments', 'experiments'];
    };

    week: {
      layout: 'grid_7_days';
      compact_mode: true;
      scrollable: 'horizontal';
    };

    month: {
      layout: 'grid_calendar';
      show_dots: true; // Indicators for activity
      quick_overview: true;
    };
  };

  color_coding: {
    completed_tasks: '#22c55e'; // Vert
    planned_tasks: '#3b82f6'; // Bleu
    observations: '#f59e0b'; // Orange
    treatments: '#ef4444'; // Rouge
    experiments: '#8b5cf6'; // Violet
  };

  interactions: {
    tap_event: 'open_detail_modal';
    long_press: 'quick_edit_menu';
    swipe_left: 'mark_complete';
    swipe_right: 'reschedule';
    pull_refresh: 'sync_data';
  };
}
```

#### **Quick Actions:**

```typescript
interface QuickActions {
  floating_action_button: {
    primary: 'open_thomas_chat';
    secondary: ['add_quick_task', 'note_observation', 'voice_message_thomas'];
  };

  header_actions: ['filter_by_type', 'search_activities', 'export_period'];

  contextual_actions: {
    today_view: ['weather_info', 'daily_summary'];
    week_view: ['week_planning', 'workload_balance'];
    month_view: ['monthly_stats', 'seasonal_planning'];
  };
}
```

#### **Intégrations Données:**

```typescript
interface CalendarDataIntegration {
  data_sources: {
    tasks: 'SELECT * FROM tasks WHERE farm_id = ? AND date BETWEEN ? AND ?';
    observations: 'SELECT * FROM observations WHERE farm_id = ? AND date BETWEEN ? AND ?';
    planned_tasks: 'SELECT * FROM planned_tasks WHERE farm_id = ? AND scheduled_date BETWEEN ? AND ?';
    treatments: 'SELECT * FROM treatments WHERE farm_id = ? AND application_date BETWEEN ? AND ?';
  };

  real_time_updates: {
    via: 'supabase_realtime';
    tables: ['tasks', 'observations', 'planned_tasks'];
    update_strategy: 'incremental_sync';
  };

  offline_support: {
    cache_duration: '30 days';
    sync_strategy: 'conflict_resolution_last_write_wins';
    offline_indicators: true;
  };
}
```

#### **Critères d'Acceptation:**

- [ ] ✅ 3 vues (jour/semaine/mois) fluides
- [ ] ✅ Codes couleur respectés et cohérents
- [ ] ✅ Interactions gestuelles fonctionnelles
- [ ] ✅ Quick actions accessibles et intuitives
- [ ] ✅ Performance <1s chargement vue
- [ ] ✅ Sync temps réel opérationnelle
- [ ] ✅ Support offline complet
- [ ] ✅ Responsive mobile + tablette
- [ ] ✅ Tests E2E toutes interactions

---

## 🎯 MÉTRIQUES DE PERFORMANCE GLOBALES

### **Benchmarks Techniques:**

```typescript
interface PerformanceBenchmarks {
  startup_time: '<2s'; // Premier écran visible
  navigation_time: '<300ms'; // Transition entre écrans
  api_response_time: '<1s'; // Requêtes Supabase
  ai_response_time: '<3s'; // Réponse Thomas
  offline_sync_time: '<10s'; // Sync après retour online

  memory_usage: '<150MB'; // Usage mémoire iOS/Android
  battery_impact: 'minimal'; // Pas de drain batterie

  error_rate: '<1%'; // Taux d'erreur global
  crash_rate: '<0.1%'; // Stabilité application
}
```

### **Métriques Qualité:**

```typescript
interface QualityMetrics {
  test_coverage: {
    unit_tests: '>85%';
    integration_tests: '>70%';
    e2e_tests: '100% flows critiques';
  };

  code_quality: {
    typescript_strict: '0 erreurs';
    eslint_warnings: '<10';
    complexity_score: '<15 par fonction';
  };

  accessibility: {
    wcag_compliance: 'AA level';
    screen_reader_support: 'complet';
    keyboard_navigation: 'fonctionnel';
  };
}
```

---

**🎯 VALIDATION FINALE**: Application Thomas V2 respectant 100% des spécifications techniques avec métriques de performance validées sur devices réels iOS et Android.
