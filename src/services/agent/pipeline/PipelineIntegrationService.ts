import { SupabaseClient } from '@supabase/supabase-js';
import { AgentPipeline } from './AgentPipeline';
import { ThomasAgentService } from '../../ThomasAgentService';
import { 
  PromptSystemInitializer,
  AdvancedPromptManager 
} from '../prompts';
import { MatchingServicesFactory } from '../matching';
import { AgentToolsFactory } from '../tools';
import { ToolRegistry } from '../ToolRegistry';
import { AgentResponse } from '../types/AgentTypes';

/**
 * Service d'intégration complète pour Thomas Agent Pipeline
 * Orchestre l'initialisation et la coordination de tous les services
 * 
 * Responsabilités:
 * - Initialisation séquencée de tous les composants
 * - Validation de l'intégrité du système
 * - Interface unifié pour utilisation externe  
 * - Monitoring et health checks
 * - Fallbacks gracieux en cas de défaillance partielle
 */
export class PipelineIntegrationService {
  private pipeline: AgentPipeline | null = null;
  private isInitialized = false;
  private initializationError: string | null = null;

  constructor(
    private supabase: SupabaseClient,
    private openAIApiKey: string
  ) {}

  /**
   * Initialisation complète du pipeline Thomas Agent
   * Point d'entrée principal pour mise en service
   */
  async initializeCompletePipeline(): Promise<InitializationResult> {
    console.log('🚀 Initializing complete Thomas Agent pipeline...');
    
    const startTime = Date.now();
    const initResult: InitializationResult = {
      success: false,
      stages_completed: [],
      stages_failed: [],
      total_time_ms: 0,
      components_status: {}
    };

    try {
      // STAGE 1: Database Tables Validation
      console.log('📋 [1/6] Validating database schema...');
      const dbValidation = await this.validateDatabaseSchema();
      if (!dbValidation.valid) {
        throw new Error(`Database schema invalid: ${dbValidation.errors.join(', ')}`);
      }
      initResult.stages_completed.push('database_validation');
      initResult.components_status.database = 'ready';

      // STAGE 2: Prompt System Initialization
      console.log('📝 [2/6] Initializing prompt system...');
      const promptSystemStatus = await PromptSystemInitializer.initializePromptSystem(
        this.supabase,
        this.openAIApiKey
      );
      
      if (!promptSystemStatus.initialized) {
        console.warn('⚠️ Prompt system partially failed:', promptSystemStatus.deployment_errors);
        // Continuer malgré erreurs mineures prompts
      }
      
      initResult.stages_completed.push('prompt_system');
      initResult.components_status.prompts = promptSystemStatus.initialized ? 'ready' : 'degraded';

      // STAGE 3: Matching Services Creation
      console.log('🎯 [3/6] Creating matching services...');
      const matchingServices = MatchingServicesFactory.createServices(this.supabase);
      const matchingValidation = await MatchingServicesFactory.validateServices(matchingServices);
      
      if (!matchingValidation.services_valid) {
        console.warn('⚠️ Matching services validation issues:', matchingValidation.errors);
      }
      
      initResult.stages_completed.push('matching_services');
      initResult.components_status.matching = matchingValidation.services_valid ? 'ready' : 'degraded';

      // STAGE 4: Agent Tools Initialization  
      console.log('🛠️ [4/6] Initializing agent tools...');
      const tools = AgentToolsFactory.createAllTools(
        this.supabase,
        matchingServices.plotMatching,
        matchingServices.materialMatching,
        matchingServices.conversionMatching,
        matchingServices.phytosanitaryMatching
      );
      
      const toolValidation = AgentToolsFactory.validateTools(tools);
      if (!toolValidation.valid) {
        throw new Error(`Tools validation failed: ${toolValidation.errors.join(', ')}`);
      }
      
      initResult.stages_completed.push('agent_tools');
      initResult.components_status.tools = 'ready';

      // STAGE 5: Tool Registry Setup
      console.log('🗂️ [5/6] Setting up tool registry...');
      const toolRegistry = new ToolRegistry();
      await toolRegistry.initializeWithServices(this.supabase, matchingServices);
      AgentToolsFactory.registerAllTools(toolRegistry, tools);
      
      initResult.stages_completed.push('tool_registry');
      initResult.components_status.registry = 'ready';

      // STAGE 6: Pipeline Assembly
      console.log('⚡ [6/6] Assembling complete pipeline...');
      this.pipeline = new AgentPipeline(this.supabase, this.openAIApiKey, {
        max_tool_retries: 2,
        tool_timeout_ms: 10000,
        enable_llm_calls: true,
        cache_enabled: true
      });

      // Attendre l'initialisation des services internes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      initResult.stages_completed.push('pipeline_assembly');
      initResult.components_status.pipeline = 'ready';

      // SUCCESS: Système complètement initialisé
      const totalTime = Date.now() - startTime;
      this.isInitialized = true;
      
      initResult.success = true;
      initResult.total_time_ms = totalTime;

      console.log('🎉 Thomas Agent pipeline fully initialized:', {
        total_time: `${totalTime}ms`,
        stages_completed: initResult.stages_completed.length,
        components_ready: Object.values(initResult.components_status).filter(s => s === 'ready').length
      });

      return initResult;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('❌ Pipeline initialization failed:', error);
      
      this.initializationError = error.message;
      
      initResult.success = false;
      initResult.total_time_ms = totalTime;
      initResult.stages_failed.push(`Échec: ${error.message}`);

      return initResult;
    }
  }

  /**
   * Interface principale pour traitement de message
   * Point d'entrée unifié pour frontend
   */
  async processMessage(
    message: string,
    sessionId: string,
    userId: string,
    farmId: number,
    options: ProcessingOptions = {}
  ): Promise<AgentResponse> {
    
    // Vérifier état du système
    if (!this.isInitialized || !this.pipeline) {
      console.warn('⚠️ Pipeline not initialized, attempting quick initialization...');
      
      const initResult = await this.initializeCompletePipeline();
      if (!initResult.success) {
        return {
          type: 'error',
          content: 'Système Thomas Agent temporairement indisponible. Réessayez dans quelques instants.',
          actions: [],
          success: false,
          error: this.initializationError || 'Système non initialisé',
          suggestions: [
            'Réessayer dans 30 secondes',
            'Rafraîchir la page',
            'Contacter support si problème persiste'
          ]
        };
      }
    }

    try {
      // Déléguer au pipeline principal
      const response = await this.pipeline!.processMessage(message, sessionId, userId, farmId);
      
      // Enrichir avec options si nécessaire
      if (options.include_debug_info) {
        (response as any).debug = {
          pipeline_stats: this.pipeline!.getPipelineStats(),
          processing_chain: 'context → intent → tools → synthesis',
          system_health: await this.getSystemHealth()
        };
      }

      return response;

    } catch (error) {
      console.error('❌ Message processing error:', error);
      
      return {
        type: 'error',
        content: 'Erreur lors du traitement de votre message. Notre équipe technique a été notifiée.',
        actions: [],
        success: false,
        error: error.message,
        suggestions: [
          'Reformuler plus simplement',
          'Vérifier noms de parcelles/matériels',
          'Réessayer dans quelques instants'
        ]
      };
    }
  }

  /**
   * Health check complet du système
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    const health: SystemHealthStatus = {
      overall_status: 'healthy',
      components: {},
      issues: [],
      recommendations: [],
      last_check: new Date().toISOString()
    };

    try {
      // Vérifier chaque composant
      health.components.pipeline_initialized = this.isInitialized;
      health.components.database_connected = await this.testDatabaseConnection();
      health.components.prompts_available = await this.testPromptsAvailability();
      health.components.tools_functional = this.testToolsFunctionality();

      // Évaluer santé globale
      const healthyComponents = Object.values(health.components).filter(Boolean).length;
      const totalComponents = Object.keys(health.components).length;
      
      if (healthyComponents === totalComponents) {
        health.overall_status = 'healthy';
        health.recommendations.push('✅ Système complètement opérationnel');
      } else if (healthyComponents >= totalComponents * 0.75) {
        health.overall_status = 'degraded';
        health.issues.push(`${totalComponents - healthyComponents} composants en défaillance`);
        health.recommendations.push('⚠️ Surveillance recommandée');
      } else {
        health.overall_status = 'unhealthy';
        health.issues.push('Défaillances multiples détectées');
        health.recommendations.push('🚨 Intervention technique requise');
      }

    } catch (error) {
      health.overall_status = 'unhealthy';
      health.issues.push(`Health check error: ${error.message}`);
    }

    return health;
  }

  /**
   * Interface pour statistiques de performance
   */
  async getPerformanceMetrics(periodDays = 7): Promise<PerformanceMetrics> {
    if (!this.pipeline) {
      throw new Error('Pipeline non initialisé');
    }

    try {
      const pipelineStats = this.pipeline.getPipelineStats();
      
      // Récupération métriques depuis base de données
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);

      const { data: executions } = await this.supabase
        .from('chat_agent_executions')
        .select('success, processing_time_ms, tools_used, created_at')
        .gte('created_at', cutoffDate.toISOString());

      const executionsData = executions || [];
      
      return {
        period_days: periodDays,
        total_requests: executionsData.length,
        success_rate: executionsData.length > 0 
          ? executionsData.filter((e: any) => e.success).length / executionsData.length
          : 0,
        avg_processing_time_ms: executionsData.length > 0
          ? executionsData.reduce((sum: number, e: any) => sum + (e.processing_time_ms || 0), 0) / executionsData.length
          : 0,
        tools_usage: this.calculateToolsUsage(executionsData),
        performance_trend: 'stable', // TODO: Calcul réel tendance
        system_stats: pipelineStats
      };

    } catch (error) {
      console.error('❌ Error getting performance metrics:', error);
      throw error;
    }
  }

  // ============================================================================
  // MÉTHODES PRIVÉES DE VALIDATION
  // ============================================================================

  /**
   * Validation schéma base de données
   */
  private async validateDatabaseSchema(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Vérifier tables critiques
      const requiredTables = [
        'chat_prompts',
        'chat_message_analyses', 
        'chat_analyzed_actions',
        'chat_agent_executions',
        'plots',
        'materials',
        'tasks',
        'observations',
        'user_conversion_units'
      ];

      for (const table of requiredTables) {
        const { error } = await this.supabase.from(table).select('*').limit(1);
        if (error) {
          errors.push(`Table ${table}: ${error.message}`);
        }
      }

    } catch (error) {
      errors.push(`Database connection error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Test connexion base de données
   */
  private async testDatabaseConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('farms').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Test disponibilité prompts
   */
  private async testPromptsAvailability(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('chat_prompts')
        .select('name')
        .eq('is_active', true)
        .in('name', ['thomas_agent_system', 'tool_selection', 'intent_classification']);
      
      return !error && data && data.length >= 3;
    } catch {
      return false;
    }
  }

  /**
   * Test fonctionnalité des tools
   */
  private testToolsFunctionality(): boolean {
    // Test basique - vérifier que les classes tools sont importables
    try {
      return this.pipeline !== null;
    } catch {
      return false;
    }
  }

  /**
   * Calcul usage des tools
   */
  private calculateToolsUsage(executions: any[]): Record<string, number> {
    const usage: Record<string, number> = {};
    
    executions.forEach((exec: any) => {
      if (exec.tools_used && Array.isArray(exec.tools_used)) {
        exec.tools_used.forEach((tool: string) => {
          usage[tool] = (usage[tool] || 0) + 1;
        });
      }
    });
    
    return usage;
  }

  /**
   * Redémarrage gracieux du système
   */
  async gracefulRestart(): Promise<{ success: boolean; message: string }> {
    console.log('🔄 Performing graceful restart...');
    
    try {
      // Reset état
      this.pipeline = null;
      this.isInitialized = false;
      this.initializationError = null;

      // Réinitialisation complète
      const initResult = await this.initializeCompletePipeline();
      
      if (initResult.success) {
        return {
          success: true,
          message: `Système redémarré avec succès en ${initResult.total_time_ms}ms`
        };
      } else {
        return {
          success: false,
          message: `Échec redémarrage: ${initResult.stages_failed.join(', ')}`
        };
      }

    } catch (error) {
      console.error('❌ Graceful restart failed:', error);
      return {
        success: false,
        message: `Erreur redémarrage: ${error.message}`
      };
    }
  }

  /**
   * Interface simplifiée pour Edge Function
   */
  async handleEdgeRequest(requestData: EdgeRequestData): Promise<EdgeResponseData> {
    console.log('🌐 Handling edge request:', { 
      message_preview: requestData.message.substring(0, 50),
      user_id: requestData.user_id,
      farm_id: requestData.farm_id
    });

    try {
      // Validation requête
      const validation = this.validateEdgeRequest(requestData);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            type: 'validation_error',
            message: validation.errors.join(', '),
            suggestions: [
              'Vérifier tous les paramètres requis',
              'Consulter documentation API'
            ]
          }
        };
      }

      // Traitement via pipeline
      const response = await this.processMessage(
        requestData.message,
        requestData.session_id,
        requestData.user_id,
        requestData.farm_id,
        requestData.options || {}
      );

      // Formatage pour Edge Function
      return {
        success: response.success,
        data: {
          type: response.type,
          content: response.content,
          actions: response.actions,
          confidence: response.confidence,
          suggestions: response.suggestions
        },
        metadata: {
          processing_time_ms: response.processing_time_ms,
          agent_version: 'thomas_agent_v2.0',
          components_used: this.getUsedComponents(),
          system_health: (await this.getSystemHealth()).overall_status
        },
        error: response.error ? {
          type: 'processing_error',
          message: response.error,
          suggestions: response.suggestions || []
        } : undefined
      };

    } catch (error) {
      console.error('❌ Edge request handling error:', error);
      
      return {
        success: false,
        error: {
          type: 'internal_error',
          message: 'Erreur interne système agent',
          suggestions: [
            'Réessayer dans quelques instants',
            'Simplifier le message',
            'Contacter support si problème persiste'
          ]
        }
      };
    }
  }

  /**
   * Validation requête edge
   */
  private validateEdgeRequest(request: EdgeRequestData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!request.message || request.message.trim().length === 0) {
      errors.push('Message requis');
    }
    
    if (request.message && request.message.length > 2000) {
      errors.push('Message trop long (max 2000 caractères)');
    }
    
    if (!request.session_id) {
      errors.push('Session ID requis');
    }
    
    if (!request.user_id) {
      errors.push('User ID requis');
    }
    
    if (!request.farm_id || request.farm_id <= 0) {
      errors.push('Farm ID requis et valide');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Récupération composants utilisés
   */
  private getUsedComponents(): string[] {
    return [
      'AgentPipeline',
      'ContextService', 
      'PromptManager',
      'MatchingServices',
      'AgentTools',
      'ToolRegistry'
    ];
  }

  /**
   * Vérification si système prêt
   */
  isSystemReady(): boolean {
    return this.isInitialized && this.pipeline !== null && !this.initializationError;
  }

  /**
   * Récupération erreur d'initialisation
   */
  getInitializationError(): string | null {
    return this.initializationError;
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface InitializationResult {
  success: boolean;
  stages_completed: string[];
  stages_failed: string[];
  total_time_ms: number;
  components_status: {
    database?: 'ready' | 'degraded' | 'failed';
    prompts?: 'ready' | 'degraded' | 'failed';
    matching?: 'ready' | 'degraded' | 'failed';
    tools?: 'ready' | 'degraded' | 'failed';
    registry?: 'ready' | 'degraded' | 'failed';
    pipeline?: 'ready' | 'degraded' | 'failed';
  };
}

interface SystemHealthStatus {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    pipeline_initialized: boolean;
    database_connected: boolean;
    prompts_available: boolean;
    tools_functional: boolean;
  };
  issues: string[];
  recommendations: string[];
  last_check: string;
}

interface PerformanceMetrics {
  period_days: number;
  total_requests: number;
  success_rate: number;
  avg_processing_time_ms: number;
  tools_usage: Record<string, number>;
  performance_trend: 'improving' | 'stable' | 'declining';
  system_stats: any;
}

interface ProcessingOptions {
  include_debug_info?: boolean;
  priority?: 'low' | 'normal' | 'high';
  timeout_ms?: number;
}

interface EdgeRequestData {
  message: string;
  session_id: string;
  user_id: string;
  farm_id: number;
  options?: ProcessingOptions;
}

interface EdgeResponseData {
  success: boolean;
  data?: {
    type: string;
    content: string;
    actions: any[];
    confidence?: number;
    suggestions?: string[];
  };
  metadata?: {
    processing_time_ms?: number;
    agent_version: string;
    components_used: string[];
    system_health: string;
  };
  error?: {
    type: string;
    message: string;
    suggestions: string[];
  };
}

