// Types de base pour l'application Thomas V2

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Farm {
  id: number;
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
  settings: Record<string, unknown>;
  totalArea?: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FarmMember {
  id: number;
  farmId: number;
  userId: string;
  user?: User; // Populated when needed
  role: UserRole;
  permissions: MemberPermissions;
  isActive: boolean;
  joinedAt: string;
  updatedAt: string;
}

export interface FarmInvitationFarm {
  id: number;
  name: string;
  description?: string;
  farm_type?: string;
}

export interface FarmInvitation {
  id: number;
  farmId: number;
  invitedBy: string;
  email: string;
  role: UserRole;
  message?: string;
  invitationToken: string;
  expiresAt: string;
  status: InvitationStatus;
  acceptedAt?: string;
  acceptedBy?: string;
  createdAt: string;
  updatedAt: string;
  /** Join farms: present when loaded with farm details (e.g. Mes invitations) */
  farms?: FarmInvitationFarm;
}

export type UserRole = 'owner' | 'manager' | 'employee' | 'advisor' | 'viewer';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface MemberPermissions {
  can_edit_farm: boolean;
  can_export_data: boolean;
  can_manage_tasks: boolean;
  can_invite_members: boolean;
  can_view_analytics: boolean;
}

export interface InviteMemberData {
  email: string;
  role: UserRole;
  message?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: AuthError;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface AuthError {
  code: string;
  message: string;
  details?: unknown;
}

// Types pour Thomas IA
export interface AIContext {
  user: User;
  farm: Farm;
  plots: Plot[];
  materials: Material[];
  recentTasks: Task[];
  recentMessages: ChatMessage[];
  seasonalContext: {
    month: number;
    season: 'printemps' | 'été' | 'automne' | 'hiver';
    weatherForecast?: WeatherData;
  };
}

export interface Plot {
  id: number;
  name: string;
  description?: string;
  farmId: number;
  area: number;
  areaUnit: 'm²' | 'hectare' | 'are';
  plotType: string;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: number;
  name: string;
  category: string;
  farmId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  action: string;
  farmId: number;
  plotId?: number;
  materialId?: number;
  duration?: number;
  quantity?: {
    value: number;
    unit: string;
    type: 'surface' | 'volume' | 'nombre' | 'poids';
  };
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  farmId: number;
  metadata?: Record<string, unknown>;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  forecast: string;
}

// Types pour les cultures
export type CultureType = 
  | 'legume_fruit' 
  | 'legume_feuille' 
  | 'legume_racine' 
  | 'cereale' 
  | 'fleur' 
  | 'fruit' 
  | 'legumineuse' 
  | 'aromate';

export type CultureCategory = 'recolte' | 'intrant';

export interface Culture {
  id: number;
  name: string;
  type: CultureType;
  category: CultureCategory;
  description?: string;
  color?: string;
  isCustom: boolean;
  farmId?: number;
  filiere?: string; // Filière professionnelle (Maraîchage, Pépinière, Floriculture, Arboriculture, Grande culture, Tropical)
  createdAt: string;
  updatedAt: string;
}

export interface CultureVariety {
  id: number;
  cultureId: number;
  name: string;
  description?: string;
  typicalWeightKg?: number;
  typicalVolumeL?: number;
  farmId?: number;
  createdAt: string;
  updatedAt: string;
  culture?: Culture; // Populated when needed
}

// Types pour les préférences de cultures utilisateur
export type CultureProfileType = 'maraichage' | 'pepiniere' | 'floriculture' | 'arboriculture' | 'grande_culture' | 'tropical' | 'custom';

export interface UserCulturePreferences {
  id: string;
  userId: string;
  farmId: number;
  profileType: CultureProfileType;
  cultureIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface CultureProfile {
  type: CultureProfileType;
  label: string;
  description: string;
  cultureIds: number[]; // IDs des cultures par défaut
}

// Types pour les contenants
export type ContainerType = 
  | 'caisse' 
  | 'panier' 
  | 'sac' 
  | 'seau' 
  | 'bidon' 
  | 'brouette' 
  | 'pulverisateur' 
  | 'epandeur' 
  | 'autre';

export type ContainerMaterial = 
  | 'plastique' 
  | 'bois' 
  | 'metal' 
  | 'carton' 
  | 'jute' 
  | 'osier' 
  | 'papier' 
  | 'autre';

export interface Container {
  id: number;
  name: string;
  category: CultureCategory; // 'recolte' | 'intrant'
  type: ContainerType;
  description?: string;
  typicalCapacityKg?: number;
  typicalCapacityL?: number;
  material?: ContainerMaterial;
  dimensionsCm?: string;
  color?: string;
  slugs: string[];
  isCustom: boolean;
  farmId?: number;
  createdAt: string;
  updatedAt: string;
}

// Types pour les produits phytosanitaires (E-Phy - Anses)
export interface PhytosanitaryProduct {
  amm: string; // Numéro AMM (Autorisation de Mise sur le Marché) - Identifiant unique
  name: string;
  type_produit: string;
  secondary_names?: string;
  holder?: string; // Titulaire
  commercial_type?: string;
  usage_range?: string;
  authorized_mentions?: string;
  usage_restrictions?: string;
  usage_restrictions_label?: string;
  active_substances?: string;
  functions?: string; // Insecticide, Fongicide, Herbicide, etc.
  formulations?: string;
  authorization_state?: string; // AUTORISE, RETIRE, etc.
  withdrawal_date?: string | null;
  first_authorization_date?: string | null;
  reference_amm?: string | null;
  reference_product_name?: string | null;
  is_custom: boolean; // true si créé par l'utilisateur (non autorisé)
  farm_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface PhytosanitaryUsage {
  id: number;
  amm: string;
  usage_id?: string;
  usage_lib_short?: string;
  target_culture: string; // Culture cible (extrait de "identifiant usage lib court")
  treated_part: string; // Partie traitée (extrait de "identifiant usage lib court")
  target_pest: string; // Bioagresseur (extrait de "identifiant usage lib court")
  decision_date?: string | null;
  cultural_stage_min?: string | null;
  cultural_stage_max?: string | null;
  usage_state?: string;
  retained_dose?: number | null;
  retained_dose_unit?: string | null;
  harvest_delay_days?: number | null;
  harvest_delay_bbch?: string | null;
  max_applications?: number | null;
  end_distribution_date?: string | null;
  end_use_date?: string | null;
  employment_condition?: string | null;
  znt_aquatic_m?: number | null;
  znt_arthropods_m?: number | null;
  znt_plants_m?: number | null;
  authorized_mentions?: string | null;
  min_interval_days?: number | null;
  created_at?: string;
}

export interface UserPhytosanitaryPreferences {
  id: number;
  user_id: string;
  farm_id: number;
  product_amms: string[]; // Liste des AMM sélectionnés par l'utilisateur
  culture_filter: string[]; // Filtres de culture actifs
  function_filter: string[]; // Filtres de fonction actifs (Insecticide, Fongicide, etc.)
  pest_filter?: string[]; // Filtres de ravageur/bioagresseur actifs
  updated_at: string;
}
