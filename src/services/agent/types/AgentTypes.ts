/**
 * Types de base pour le système Thomas Agent IA
 * Basé sur les patterns Anthropic pour agents autonomes
 */

// ============================================================================
// TYPES AGENT CORE
// ============================================================================

export interface AgentContext {
  user: {
    id: string;
    name: string;
    farm_id: number;
  };
  farm: FarmContext;
  analysis_id?: string; // ID de l'analyse en cours
  session_id: string;
  availableTools: string[];
}

export interface FarmContext {
  id: number;
  name: string;
  plots: PlotWithDetails[];
  materials: MaterialWithKeywords[];
  conversions: UserConversionWithAliases[];
  phytosanitary_products: string[]; // Noms des produits phytosanitaires de l'utilisateur
  preferences: AIPreferences;
}

export interface PlotWithDetails {
  id: number;
  name: string;
  type: string;
  aliases: string[];
  llm_keywords: string[];
  surface_units: SurfaceUnitWithDetails[];
  is_active: boolean;
}

export interface SurfaceUnitWithDetails {
  id: number;
  plot_id: number;
  name: string;
  type: string;
  aliases: string[];
  llm_keywords: string[];
  is_active: boolean;
}

export interface MaterialWithKeywords {
  id: number;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  llm_keywords: string[];
  is_active: boolean;
}

export interface UserConversionWithAliases {
  id: string;
  container_name: string;
  crop_name: string;
  conversion_value: number;
  conversion_unit: string;
  slugs: string[];
  description?: string;
  is_active: boolean;
}

export interface AIPreferences {
  language: string;
  auto_categorization: boolean;
  confidence_threshold: number;
  fallback_enabled: boolean;
}

// ============================================================================
// TYPES TOOL SYSTEM
// ============================================================================

export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameters;
  execute(params: any, context: AgentContext): Promise<ToolResult>;
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ParameterDefinition>;
  required: string[];
}

export interface ParameterDefinition {
  type: string;
  description: string;
  enum?: string[];
  items?: ParameterDefinition;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  suggestions?: string[];
  recovery_suggestions?: string[];
  confidence?: number;
}

export interface ToolPlan {
  tool_name: string;
  confidence: number;
  parameters: Record<string, any>;
  reasoning: string;
}

// ============================================================================
// TYPES MATCHING SERVICES  
// ============================================================================

export interface PlotMatch {
  plot: PlotWithDetails;
  surface_units?: SurfaceUnitWithDetails[];
  confidence: number;
  match_type: 'exact' | 'partial' | 'fuzzy' | 'alias' | 'keyword' | 'surface_unit_direct' | 'surface_unit_alias';
}

export interface MaterialMatch {
  material: MaterialWithKeywords;
  confidence: number;
  match_method: 'exact' | 'partial' | 'brand_model' | 'fuzzy' | 'llm_keyword' | 'category' | 'none';
}

export interface QuantityMention {
  value: number;
  unit: string;
  item?: string; // "courgettes", "tomates"
  raw_text: string;
}

export interface ConvertedQuantity {
  original: QuantityMention;
  converted: {
    value: number;
    unit: string;
  };
  confidence: number;
  source: 'user_conversion' | 'standard' | 'estimated' | 'no_conversion' | 'test';
  conversion_details?: {
    conversion_id: string;
    factor: number;
    description?: string;
  };
  suggestions?: string[];
}

// ============================================================================
// TYPES PIPELINE & RESPONSES
// ============================================================================

export interface MessageIntent {
  intent: 'observation_creation' | 'task_done' | 'task_planned' | 'harvest' | 'help' | 'management' | 'unclear';
  confidence: number;
  reasoning: string;
  entities_detected: string[];
}

export interface AgentResponse {
  type: 'conversational' | 'actions' | 'error';
  content: string;
  actions: AgentAction[];
  success: boolean;
  error?: string;
  suggestions?: string[];
  processing_time_ms?: number;
  confidence?: number;
}

export interface AgentAction {
  id: string;
  type: 'observation' | 'task_done' | 'task_planned' | 'help';
  title: string;
  data: Record<string, any>;
  confidence: number;
  status: 'created' | 'pending' | 'failed';
}

// ============================================================================
// TYPES DATABASE (MAPPING)
// ============================================================================

export interface ChatAnalyzedAction {
  id: string;
  analysis_id: string;
  action_type: 'task_done' | 'task_planned' | 'observation' | 'harvest' | 'help';
  action_data: Record<string, any>;
  matched_entities: Record<string, any>;
  confidence_score: number;
  status: 'pending' | 'validated' | 'executed' | 'failed';
  created_record_id?: string;
  created_record_type?: 'task' | 'observation';
  error_message?: string;
  created_at: string;
  executed_at?: string;
}

export interface ChatMessageAnalysis {
  id: string;
  session_id: string;
  message_id: string;
  user_message: string;
  analysis_result: Record<string, any>;
  confidence_score: number;
  processing_time_ms: number;
  model_used: string;
  created_at: string;
}

export interface ChatPrompt {
  id: string;
  name: string;
  content: string;
  examples: any[];
  version: string;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ChatAgentExecution {
  id: string;
  session_id: string;
  user_id: string;
  farm_id: number;
  message: string;
  intent_detected: string;
  tools_used: string[];
  execution_steps: any[];
  final_response: string;
  processing_time_ms: number;
  success: boolean;
  error_message?: string;
  created_at: string;
}

// ============================================================================
// TYPES ERRORS & FALLBACKS
// ============================================================================

export interface AgentError {
  type: 'parcelle_not_found' | 'conversion_error' | 'tool_error' | 'openai_error' | 'database_error' | 'validation_error' | 'unknown';
  message: string;
  context?: Record<string, any>;
  recovery_suggestions?: string[];
}

export interface FallbackResponse {
  content: string;
  suggestions: string[];
  canRetry: boolean;
}

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const OBSERVATION_CATEGORIES = [
  'ravageurs',
  'maladies', 
  'physiologie',
  'sol',
  'météo',
  'autre'
] as const;

export const TASK_PRIORITIES = [
  'basse',
  'moyenne', 
  'haute',
  'urgente'
] as const;

export const SEVERITY_LEVELS = [
  'low',
  'medium',
  'high',
  'critical'
] as const;

export const MATERIAL_CATEGORIES = [
  'tracteurs',
  'outils_tracteur',
  'outils_manuels',
  'materiel_marketing',
  'petit_equipement',
  'autre'
] as const;

export const PLOT_TYPES = [
  'serre_plastique',
  'serre_verre', 
  'plein_champ',
  'tunnel',
  'hydroponique',
  'pepiniere',
  'autre'
] as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ObservationCategory = typeof OBSERVATION_CATEGORIES[number];
export type TaskPriority = typeof TASK_PRIORITIES[number];
export type SeverityLevel = typeof SEVERITY_LEVELS[number];  
export type MaterialCategory = typeof MATERIAL_CATEGORIES[number];
export type PlotType = typeof PLOT_TYPES[number];
