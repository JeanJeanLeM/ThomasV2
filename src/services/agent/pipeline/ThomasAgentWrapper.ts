import { SupabaseClient } from '@supabase/supabase-js';
import { PipelineIntegrationService } from './PipelineIntegrationService';
import { ThomasPipelineFactory } from './index';
import { AgentResponse } from '../types/AgentTypes';

/**
 * Wrapper simplifié pour Thomas Agent - Interface utilisateur finale
 * Abstrait la complexité du pipeline pour utilisation facile
 * 
 * Usage:
 * ```typescript
 * const thomas = new ThomasAgentWrapper(supabase, openAIKey);
 * await thomas.initialize();
 * const response = await thomas.chat("j'ai observé des pucerons serre 1");
 * ```
 */
export class ThomasAgentWrapper {
  private pipelineService: PipelineIntegrationService | null = null;
  private isReady = false;

  constructor(
    private supabase: SupabaseClient,
    private openAIApiKey: string
  ) {}

  /**
   * Initialisation simple - à appeler une fois au démarrage
   */
  async initialize(): Promise<{ success: boolean; message: string; time_ms: number }> {
    console.log('🚀 Initializing Thomas Agent...');
    const startTime = Date.now();

    try {
      // Création via factory
      this.pipelineService = await ThomasPipelineFactory.createProductionPipeline(
        this.supabase,
        this.openAIApiKey
      );

      this.isReady = true;
      const initTime = Date.now() - startTime;

      console.log(`✅ Thomas Agent ready in ${initTime}ms`);
      
      return {
        success: true,
        message: `Thomas Agent prêt ! Initialisé en ${initTime}ms`,
        time_ms: initTime
      };

    } catch (error) {
      console.error('❌ Thomas Agent initialization failed:', error);
      
      return {
        success: false,
        message: `Échec initialisation: ${error.message}`,
        time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Interface chat principale - Simple et intuitive
   */
  async chat(
    message: string,
    context: {
      session_id: string;
      user_id: string; 
      farm_id: number;
    },
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    
    // Vérifier état de préparation
    if (!this.isReady || !this.pipelineService) {
      console.warn('⚠️ Thomas not ready, auto-initializing...');
      
      const initResult = await this.initialize();
      if (!initResult.success) {
        return {
          success: false,
          message: 'Thomas Agent indisponible. Réessayez dans quelques instants.',
          error: initResult.message,
          suggestions: [
            'Rafraîchir la page',
            'Vérifier votre connexion',
            'Contacter support'
          ]
        };
      }
    }

    try {
      console.log(`💬 Thomas chat:`, {
        message_preview: message.substring(0, 50),
        user_id: context.user_id,
        farm_id: context.farm_id,
        session_id: context.session_id
      });

      // Traitement via pipeline
      const response = await this.pipelineService!.processMessage(
        message,
        context.session_id,
        context.user_id,
        context.farm_id,
        {
          include_debug_info: options.debug || false,
          priority: options.priority || 'normal'
        }
      );

      // Simplification de la réponse pour interface
      const chatResponse: ChatResponse = {
        success: response.success,
        message: response.content,
        actions: this.formatActionsForUI(response.actions),
        suggestions: response.suggestions || [],
        confidence: response.confidence,
        processing_time: response.processing_time_ms,
        error: response.error
      };

      // Debug info si demandé
      if (options.debug) {
        chatResponse.debug_info = {
          agent_version: 'thomas_agent_v2.0',
          response_type: response.type,
          system_health: (await this.pipelineService!.getSystemHealth()).overall_status,
          pipeline_stats: await this.getQuickStats()
        };
      }

      return chatResponse;

    } catch (error) {
      console.error('❌ Thomas chat error:', error);
      
      return {
        success: false,
        message: 'Désolé, je n\'ai pas pu traiter votre message.',
        error: error.message,
        suggestions: [
          'Reformuler plus clairement', 
          'Vérifier orthographe des parcelles',
          'Réessayer dans quelques instants'
        ]
      };
    }
  }

  /**
   * Interface d'aide contextuelle
   */
  async getHelp(question: string, context: { user_id: string; farm_id: number }): Promise<HelpResponse> {
    const helpMessage = question.includes('?') ? question : `comment ${question} ?`;
    
    const response = await this.chat(helpMessage, {
      session_id: 'help-session',
      user_id: context.user_id,
      farm_id: context.farm_id
    });

    return {
      answer: response.message,
      suggestions: response.suggestions,
      related_actions: this.getRelatedHelpActions(question),
      navigation_hints: this.getNavigationHints(question)
    };
  }

  /**
   * Interface de statistiques simplifiée
   */
  async getStats(): Promise<SimpleStats> {
    if (!this.pipelineService) {
      throw new Error('Thomas Agent non initialisé');
    }

    const health = await this.pipelineService.getSystemHealth();
    const metrics = await this.pipelineService.getPerformanceMetrics(7);

    return {
      status: health.overall_status,
      success_rate: `${(metrics.success_rate * 100).toFixed(1)}%`,
      avg_response_time: `${metrics.avg_processing_time_ms.toFixed(0)}ms`,
      total_requests_7d: metrics.total_requests,
      most_used_features: Object.entries(metrics.tools_usage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tool, count]) => `${tool} (${count}x)`),
      recommendations: health.recommendations.slice(0, 3)
    };
  }

  /**
   * Test rapide de fonctionnement
   */
  async quickTest(): Promise<{ working: boolean; response_time_ms: number; message: string }> {
    const startTime = Date.now();
    
    try {
      const testResponse = await this.chat('test de fonctionnement', {
        session_id: 'quicktest',
        user_id: 'test-user',
        farm_id: 1
      });

      return {
        working: testResponse.success,
        response_time_ms: Date.now() - startTime,
        message: testResponse.success 
          ? 'Thomas Agent fonctionne correctement ✅'
          : 'Thomas Agent rencontre des difficultés ⚠️'
      };

    } catch (error) {
      return {
        working: false,
        response_time_ms: Date.now() - startTime,
        message: `Thomas Agent en erreur: ${error.message} ❌`
      };
    }
  }

  /**
   * Redémarrage si nécessaire
   */
  async restart(): Promise<{ success: boolean; message: string }> {
    console.log('🔄 Restarting Thomas Agent...');
    
    try {
      if (this.pipelineService) {
        const restartResult = await this.pipelineService.gracefulRestart();
        return restartResult;
      } else {
        const initResult = await this.initialize();
        return {
          success: initResult.success,
          message: initResult.message
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Échec redémarrage: ${error.message}`
      };
    }
  }

  // ============================================================================
  // MÉTHODES PRIVÉES
  // ============================================================================

  /**
   * Formatage des actions pour l'UI
   */
  private formatActionsForUI(actions: any[]): UIAction[] {
    if (!actions || actions.length === 0) {
      return [];
    }

    return actions.map((action, index) => ({
      id: action.id || `action_${index}`,
      type: this.mapActionType(action.type),
      title: action.title || action.message || 'Action créée',
      description: this.generateActionDescription(action),
      status: action.status || 'completed',
      confidence: action.confidence,
      icon: this.getActionIcon(action.type),
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Mapping types d'action pour UI
   */
  private mapActionType(type: string): string {
    const mapping: Record<string, string> = {
      'tool_result': 'action',
      'observation': 'observation',
      'task_done': 'tache_realisee',
      'task_planned': 'tache_planifiee',
      'harvest': 'recolte',
      'help': 'aide'
    };
    
    return mapping[type] || 'autre';
  }

  /**
   * Génération description d'action
   */
  private generateActionDescription(action: any): string {
    if (action.data?.matched_plot) {
      return `Parcelle: ${action.data.matched_plot}`;
    }
    
    if (action.data?.converted_quantity) {
      return `Quantité: ${action.data.converted_quantity}`;
    }
    
    if (action.confidence && action.confidence < 0.8) {
      return `Confiance: ${Math.round(action.confidence * 100)}%`;
    }
    
    return action.title || 'Action agricole';
  }

  /**
   * Icônes pour actions
   */
  private getActionIcon(type: string): string {
    const icons: Record<string, string> = {
      'observation': '👁️',
      'task_done': '✅',
      'task_planned': '📅',
      'harvest': '🌾',
      'help': '❓',
      'action': '🎯'
    };
    
    return icons[type] || '📝';
  }

  /**
   * Actions d'aide liées
   */
  private getRelatedHelpActions(question: string): string[] {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('parcelle')) {
      return [
        'Voir mes parcelles',
        'Créer une parcelle',
        'Configurer aliases parcelles'
      ];
    }
    
    if (questionLower.includes('matériel')) {
      return [
        'Voir mon matériel',
        'Ajouter matériel',
        'Configurer mots-clés LLM'
      ];
    }
    
    return [
      'Guide utilisateur',
      'Configuration générale',
      'Contacter support'
    ];
  }

  /**
   * Hints de navigation
   */
  private getNavigationHints(question: string): string[] {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('parcelle')) {
      return ['Profil → Configuration → Parcelles'];
    }
    
    if (questionLower.includes('tâche')) {
      return ['Menu → Tâches → Nouvelle tâche'];
    }
    
    return ['Menu principal → Profil → Configuration'];
  }

  /**
   * Statistiques rapides
   */
  private async getQuickStats(): Promise<any> {
    try {
      if (!this.pipelineService) return {};
      
      return {
        system_ready: this.pipelineService.isSystemReady(),
        cache_sizes: 'optimized',
        last_health_check: 'recent'
      };
    } catch {
      return {};
    }
  }
}

// ============================================================================
// INTERFACES SIMPLIFIÉES POUR UI
// ============================================================================

export interface ChatOptions {
  debug?: boolean;
  priority?: 'low' | 'normal' | 'high';
  timeout_ms?: number;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  actions?: UIAction[];
  suggestions?: string[];
  confidence?: number;
  processing_time?: number;
  error?: string;
  debug_info?: {
    agent_version: string;
    response_type: string;
    system_health: string;
    pipeline_stats: any;
  };
}

export interface UIAction {
  id: string;
  type: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  confidence?: number;
  icon: string;
  timestamp: string;
}

export interface HelpResponse {
  answer: string;
  suggestions: string[];
  related_actions: string[];
  navigation_hints: string[];
}

export interface SimpleStats {
  status: string;
  success_rate: string;
  avg_response_time: string;
  total_requests_7d: number;
  most_used_features: string[];
  recommendations: string[];
}

/**
 * Factory pour création ultra-simple
 */
export class SimpleAgentFactory {
  /**
   * Création d'un agent Thomas prêt à l'emploi en une ligne
   */
  static async createReadyAgent(
    supabaseClient: SupabaseClient,
    openAIApiKey: string
  ): Promise<ThomasAgentWrapper> {
    
    console.log('⚡ Creating ready Thomas Agent in one step...');
    
    const wrapper = new ThomasAgentWrapper(supabaseClient, openAIApiKey);
    
    const initResult = await wrapper.initialize();
    if (!initResult.success) {
      throw new Error(`Agent creation failed: ${initResult.message}`);
    }

    console.log(`🎉 Thomas Agent ready! ${initResult.message}`);
    return wrapper;
  }
}

/**
 * Exemples d'utilisation pour documentation
 */
export const USAGE_EXAMPLES = {
  basic_chat: `
// Usage basique
const thomas = new ThomasAgentWrapper(supabase, openAIKey);
await thomas.initialize();

const response = await thomas.chat("j'ai observé des pucerons serre 1", {
  session_id: "session-123",
  user_id: "user-456", 
  farm_id: 1
});

console.log(response.message); // "Observation créée: pucerons sur tomates (Serre 1)"
`,

  with_help: `
// Aide contextuelle
const helpResponse = await thomas.getHelp("créer une parcelle", {
  user_id: "user-456",
  farm_id: 1
});

console.log(helpResponse.answer); // Guide étapes détaillé
console.log(helpResponse.navigation_hints); // ["Profil → Configuration → Parcelles"]
`,

  with_stats: `
// Statistiques système
const stats = await thomas.getStats();

console.log(\`Performance: \${stats.success_rate} succès, \${stats.avg_response_time} temps moyen\`);
console.log(\`Fonctionnalités populaires: \${stats.most_used_features.join(', ')}\`);
`,

  health_check: `
// Test santé système
const healthCheck = await thomas.quickTest();

if (healthCheck.working) {
  console.log(\`✅ Thomas opérationnel (\${healthCheck.response_time_ms}ms)\`);
} else {
  console.log(\`❌ Thomas en erreur: \${healthCheck.message}\`);
}
`,

  factory_usage: `
// Création ultra-simple
try {
  const thomas = await SimpleAgentFactory.createReadyAgent(supabase, openAIKey);
  
  const response = await thomas.chat("comment ça va ?", context);
  console.log(response.message);
  
} catch (error) {
  console.error("Thomas creation failed:", error);
}
`
};

