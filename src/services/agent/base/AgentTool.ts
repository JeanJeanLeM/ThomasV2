import { AgentContext, ToolResult, ToolParameters } from '../types/AgentTypes';

/**
 * Interface de base pour tous les Agent Tools
 * Suit les patterns Anthropic pour tools autonomes
 */
export abstract class AgentTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: ToolParameters;

  /**
   * Exécution du tool avec paramètres et contexte
   * Retourne un résultat standardisé
   */
  abstract execute(params: any, context: AgentContext): Promise<ToolResult>;

  /**
   * Validation des paramètres d'entrée
   * Override si validation spéciale nécessaire
   */
  protected validateParameters(params: any): void {
    const required = this.parameters.required;
    
    for (const field of required) {
      if (params[field] === undefined || params[field] === null || params[field] === '') {
        throw new Error(`Paramètre requis manquant: ${field}`);
      }
    }
  }

  /**
   * Génération de suggestions contextuelles
   * Override pour suggestions spécialisées
   */
  protected generateSuggestions(context: AgentContext, errorType?: string): string[] {
    const baseSuggestions = [
      'Vérifier l\'orthographe',
      'Être plus précis dans la description',
      'Consulter la liste des parcelles disponibles'
    ];

    return baseSuggestions;
  }

  /**
   * Logging des résultats d'exécution
   */
  protected async logToolExecution(
    toolName: string,
    params: any,
    result: ToolResult,
    context: AgentContext,
    executionTimeMs: number
  ): Promise<void> {
    console.log(`🛠️ Tool ${toolName} executed:`, {
      success: result.success,
      confidence: result.confidence,
      execution_time_ms: executionTimeMs,
      context_farm: context.farm.name,
      context_user: context.user.name
    });

    // TODO: Implémenter logging en base si nécessaire
    // await this.supabase.from('tool_execution_logs').insert(...)
  }

  /**
   * Gestion d'erreur standardisée
   */
  protected handleError(error: any, context?: Record<string, any>): ToolResult {
    console.error(`❌ Error in ${this.name}:`, error);

    return {
      success: false,
      error: error.message || 'Erreur inconnue lors de l\'exécution du tool',
      recovery_suggestions: [
        'Vérifier les paramètres fournis',
        'Réessayer avec des données différentes',
        'Contacter le support si le problème persiste'
      ],
      confidence: 0
    };
  }

  /**
   * Formatage du message de succès
   */
  protected formatSuccessMessage(action: string, details: Record<string, any>): string {
    return `✅ ${action} réalisée avec succès. ${this.formatDetails(details)}`;
  }

  /**
   * Formatage des détails dans les messages
   */
  private formatDetails(details: Record<string, any>): string {
    const parts: string[] = [];
    
    if (details.matched_plot) {
      parts.push(`Parcelle: ${details.matched_plot}`);
    }
    
    if (details.converted_quantity) {
      parts.push(`Quantité: ${details.converted_quantity}`);
    }
    
    if (details.confidence && details.confidence < 0.9) {
      parts.push(`Confiance: ${Math.round(details.confidence * 100)}%`);
    }

    return parts.length > 0 ? `(${parts.join(', ')})` : '';
  }
}

/**
 * Interface pour les résultats étendus avec métadonnées
 */
export interface ExtendedToolResult extends ToolResult {
  metadata?: {
    tool_name: string;
    execution_time_ms: number;
    tokens_used?: number;
    model_used?: string;
    debug_info?: Record<string, any>;
  };
}

/**
 * Interface pour les tools avec capacités étendues
 */
export interface AdvancedAgentTool extends AgentTool {
  /**
   * Pré-validation avant exécution
   */
  preValidate?(params: any, context: AgentContext): Promise<boolean>;

  /**
   * Post-traitement après exécution
   */
  postProcess?(result: ToolResult, params: any, context: AgentContext): Promise<ToolResult>;

  /**
   * Estimation de la durée d'exécution
   */
  estimateExecutionTime?(params: any, context: AgentContext): number;

  /**
   * Vérification si le tool peut être exécuté dans le contexte donné
   */
  canExecute?(context: AgentContext): boolean;
}

/**
 * Factory pour créer des tools
 */
export class ToolFactory {
  static createBasicTool(
    name: string,
    description: string,
    parameters: ToolParameters,
    executeFunction: (params: any, context: AgentContext) => Promise<ToolResult>
  ): AgentTool {
    return new (class extends AgentTool {
      readonly name = name;
      readonly description = description;
      readonly parameters = parameters;

      async execute(params: any, context: AgentContext): Promise<ToolResult> {
        const startTime = Date.now();
        
        try {
          this.validateParameters(params);
          const result = await executeFunction(params, context);
          
          await this.logToolExecution(
            this.name,
            params,
            result,
            context,
            Date.now() - startTime
          );
          
          return result;
        } catch (error) {
          return this.handleError(error, { params, context });
        }
      }
    })();
  }
}
