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

/** Template de tâche récurrente (dates relatives, ex: tous les samedis nov–fév) */
export type RecurringTaskCategory = 'production' | 'marketing' | 'administratif' | 'general';
export type RecurringTaskFrequencyType = 'weekly' | 'biweekly' | 'monthly';

export interface RecurringTaskTemplate {
  id: string;
  farm_id: number;
  name: string;
  duration_minutes: number;
  action?: string;
  category: RecurringTaskCategory;
  culture?: string;
  number_of_people: number;
  plot_ids: number[];
  surface_unit_ids: number[];
  material_ids: number[];
  notes?: string;
  start_month: number;
  end_month: number;
  start_day?: number;
  end_day?: number;
  is_permanent: boolean;
  day_of_week: number;
  frequency_type: RecurringTaskFrequencyType;
  frequency_interval: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  speech_aliases?: string[]; // Alias phonétiques pour la correction dictée Web Speech
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

// === Facturation (ventes, achats, clients, fournisseurs) ===

export interface SellerInfo {
  id: string;
  farm_id: number;
  user_id?: string | null;
  company_name: string;
  legal_status?: 'EI' | 'EARL' | 'GAEC' | 'SCEA' | 'SARL' | 'SAS' | 'Other' | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  siret?: string | null;
  siren?: string | null;
  vat_number?: string | null;
  email?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  vat_not_applicable?: boolean;
  created_at: string;
  updated_at: string;
}

/** Une adresse additionnelle (ex. livraison) pour un client */
export interface CustomerAddress {
  label: string;
  address: string;
  postal_code: string;
  city: string;
}

export interface Customer {
  id: string;
  farm_id: number;
  company_name: string;
  contact_name?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  siret?: string | null;
  siren?: string | null;
  vat_number?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  delivery_addresses?: CustomerAddress[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  farm_id: number;
  company_name: string;
  contact_name?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  siret?: string | null;
  siren?: string | null;
  vat_number?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  farm_id: number;
  name: string;
  description?: string | null;
  culture_id?: number | null;
  unit: string;
  default_price_ht?: number | null;
  default_vat_rate?: number | null;
  listing_status?: 'draft' | 'listed' | 'archived' | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductSalePrice {
  id: string;
  product_id: string;
  farm_id: number;
  canal_de_vente: string;
  prix: number;
  unite_prix: string;
  pourcentage_vente: number;
  valid_week_start?: number | null;
  valid_week_end?: number | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';
export type InvoiceDocumentType = 'invoice' | 'delivery_note' | 'invoice_with_delivery';
export type InvoiceDirection = 'outgoing' | 'incoming';

export interface Invoice {
  id: string;
  farm_id: number;
  user_id: string;
  invoice_number: string;
  document_type: InvoiceDocumentType;
  direction: InvoiceDirection;
  customer_id?: string | null;
  supplier_id?: string | null;
  invoice_date: string;
  delivery_date?: string | null;
  delivery_location?: string | null;
  payment_due_date?: string | null;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  status: InvoiceStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price_ht: number;
  vat_rate: number;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  line_order: number;
  notes?: string | null;
}

// === Analyse IA de factures (contrat partagé web ↔ mobile) ===

/**
 * Charge category values matching the charges_fixes.categorie DB constraint.
 */
export type ChargeCategory =
  | 'pots'
  | 'plaques_semis'
  | 'baches'
  | 'etiquetage'
  | 'irrigation'
  | 'protection'
  | 'substrats'
  | 'autre';

/**
 * A single line returned by the AI invoice analysis endpoint.
 * Mirrors the InvoiceAIOutput.lines[] schema from the web backend.
 */
export interface InvoiceAILine {
  product_name: string;
  quantity: number;
  unit: string;
  unit_price_ht: number;
  vat_rate: number;
  /** true → record in charges_fixes after ingestion */
  is_charge: boolean;
  charge_category?: ChargeCategory | null;
  /** Packaging: e.g. box of 100 pots */
  quantity_per_package?: number | null;
  base_unit?: string | null;
  /** true → record in semences after ingestion */
  is_semence?: boolean;
  culture?: string | null;
  variete?: string | null;
  pmg?: number | null;
  graines_par_sachet?: number | null;
  lot_numero?: string | null;
  date_peremption?: string | null;
  notes?: string | null;
}

/**
 * Full response from POST /api/ai/analyze-invoice
 * (web backend + Supabase Edge Function equivalent).
 */
export interface InvoiceAIOutput {
  original_text: string;
  confidence: number;
  invoice: {
    direction: InvoiceDirection;
    invoice_number?: string | null;
    invoice_date?: string | null;
    delivery_date?: string | null;
    payment_due_date?: string | null;
    /** populated for direction=incoming */
    supplier_name?: string | null;
    /** populated for direction=outgoing */
    customer_name?: string | null;
    notes?: string | null;
  };
  lines: InvoiceAILine[];
}

/**
 * Payload consumed by the ingestion service (ingestInvoice).
 * The mobile passes this after user confirms the AI preview.
 */
export interface InvoiceIngestPayload {
  farmId: number;
  userId: string;
  aiOutput: InvoiceAIOutput;
  /** 'message' | 'invoice_scan' */
  source: 'message' | 'invoice_scan';
  /** Pass to update an existing invoice instead of creating */
  existingInvoiceId?: string;
}

// === Communauté (conseiller / animateur) ===

export type CommunityStatus = 'active' | 'inactive' | 'archived';
export type CommunityJoinPolicy = 'open' | 'approval_required' | 'invite_only';
export type CommunityRole = 'admin' | 'advisor' | 'farmer';
export type CommunityInvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';
export type CommunityJoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface Community {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  region: string | null;
  department: string | null;
  country: string;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  logo_url: string | null;
  status: CommunityStatus;
  join_policy: CommunityJoinPolicy;
  requires_approval: boolean;
  max_members: number | null;
  join_message: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface CommunityMemberProfile {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: CommunityRole;
  is_active: boolean;
  notes: string | null;
  joined_at: string;
  updated_at: string;
  profile?: CommunityMemberProfile;
  farm?: { id: number; name: string } | null;
}

export interface CommunityInvitation {
  id: string;
  community_id: string;
  invited_by: string;
  email: string;
  role: CommunityRole;
  invitation_token: string;
  status: CommunityInvitationStatus;
  message: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityJoinRequest {
  id: string;
  community_id: string;
  user_id: string;
  role: CommunityRole;
  message: string | null;
  status: CommunityJoinRequestStatus;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}
