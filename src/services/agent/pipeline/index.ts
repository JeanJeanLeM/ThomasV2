/**
 * Index du système Pipeline Agent Thomas
 * Point d'entrée centralisé pour orchestration complète
 */

export { AgentPipeline } from './AgentPipeline';
export { PipelineIntegrationService } from './PipelineIntegrationService';

/**
 * Factory pour création rapide d'un pipeline opérationnel
 */
export class ThomasPipelineFactory {
  /**
   * Création d'une instance pipeline complète prête à l'emploi
   */
  static async createProductionPipeline(
    supabaseClient: any,
    openAIApiKey: string
  ): Promise<PipelineIntegrationService> {
    
    console.log('🏭 Creating production-ready Thomas Agent pipeline...');
    
    const integrationService = new PipelineIntegrationService(supabaseClient, openAIApiKey);
    
    // Initialisation complète avec validation
    const initResult = await integrationService.initializeCompletePipeline();
    
    if (!initResult.success) {
      const failedStages = initResult.stages_failed.join(', ');
      throw new Error(`Pipeline creation failed at stages: ${failedStages}`);
    }

    console.log('✅ Production pipeline ready:', {
      initialization_time: `${initResult.total_time_ms}ms`,
      components_ready: Object.keys(initResult.components_status).length,
      stages_completed: initResult.stages_completed
    });

    return integrationService;
  }

  /**
   * Création pipeline de développement avec mocks
   */
  static createDevelopmentPipeline(): PipelineIntegrationService {
    console.log('🔧 Creating development pipeline with mocks...');
    
    // Mock Supabase pour développement
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ single: () => ({ data: {}, error: null }) }) }),
        insert: () => ({ select: () => ({ single: () => ({ data: { id: 'dev-id' }, error: null }) }) })
      })
    };

    const devService = new PipelineIntegrationService(mockSupabase as any, 'dev-api-key');
    
    console.log('✅ Development pipeline created');
    return devService;
  }

  /**
   * Validation d'environnement pour déploiement
   */
  static validateDeploymentEnvironment(): {
    ready: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Validation variables d'environnement critiques
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'OPENAI_API_KEY'
    ];

    requiredEnvVars.forEach(envVar => {
      if (!Deno.env.get(envVar)) {
        issues.push(`Variable d'environnement manquante: ${envVar}`);
      }
    });

    // Validation configuration optionnelle
    const optionalEnvVars = {
      'OPENAI_MODEL': 'gpt-4o-mini',
      'MAX_TOKENS': '2000', 
      'TEMPERATURE': '0.3',
      'TIMEOUT_MS': '30000'
    };

    Object.entries(optionalEnvVars).forEach(([envVar, defaultValue]) => {
      if (!Deno.env.get(envVar)) {
        recommendations.push(`Considérer définir ${envVar} (défaut: ${defaultValue})`);
      }
    });

    // Recommandations générales
    if (issues.length === 0) {
      recommendations.push('✅ Environnement prêt pour déploiement production');
      recommendations.push('🔧 Considérer monitoring métriques en production');
    }

    return {
      ready: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Healthcheck rapide pour monitoring externe
   */
  static async quickHealthCheck(pipelineService: PipelineIntegrationService): Promise<{
    status: 'UP' | 'DOWN' | 'DEGRADED';
    response_time_ms: number;
    components_healthy: number;
    components_total: number;
  }> {
    
    const startTime = Date.now();
    
    try {
      if (!pipelineService.isSystemReady()) {
        return {
          status: 'DOWN',
          response_time_ms: Date.now() - startTime,
          components_healthy: 0,
          components_total: 6
        };
      }

      const health = await pipelineService.getSystemHealth();
      const healthyCount = Object.values(health.components).filter(Boolean).length;
      const totalCount = Object.keys(health.components).length;
      
      let status: 'UP' | 'DOWN' | 'DEGRADED';
      if (health.overall_status === 'healthy') {
        status = 'UP';
      } else if (health.overall_status === 'degraded') {
        status = 'DEGRADED';
      } else {
        status = 'DOWN';
      }

      return {
        status,
        response_time_ms: Date.now() - startTime,
        components_healthy: healthyCount,
        components_total: totalCount
      };

    } catch (error) {
      console.error('❌ Quick health check failed:', error);
      return {
        status: 'DOWN',
        response_time_ms: Date.now() - startTime,
        components_healthy: 0,
        components_total: 6
      };
    }
  }
}

/**
 * Utilitaires pour intégration Edge Function
 */
export class EdgeFunctionHelpers {
  /**
   * Wrapper pour utilisation dans Edge Function Deno
   */
  static async handleEdgeRequest(
    request: Request,
    pipelineService: PipelineIntegrationService
  ): Promise<Response> {
    
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // Parsing body
      const body = await request.json();
      
      // Traitement via pipeline
      const result = await pipelineService.handleEdgeRequest({
        message: body.message,
        session_id: body.session_id,
        user_id: body.user_id,
        farm_id: body.farm_id,
        options: body.options || {}
      });

      // Construction réponse Edge Function standard
      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Processing-Time': (Date.now() - startTime).toString(),
          'X-Request-ID': requestId,
          'X-Agent-Version': 'thomas_agent_v2.0'
        }
      });

    } catch (error) {
      console.error(`❌ Edge request error:`, error);
      
      return new Response(JSON.stringify({
        success: false,
        error: {
          type: 'edge_function_error',
          message: error.message,
          request_id: requestId
        }
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  /**
   * Création headers CORS appropriés
   */
  static getCORSHeaders(): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Max-Age': '86400'
    };
  }

  /**
   * Validation complète requête Edge Function
   */
  static validateEdgeFunctionRequest(body: any): {
    valid: boolean;
    sanitized_body: any;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitized: any = {};

    // Validation et sanitization
    if (typeof body.message === 'string' && body.message.trim().length > 0) {
      sanitized.message = body.message.trim();
      if (sanitized.message.length > 2000) {
        sanitized.message = sanitized.message.substring(0, 2000);
        warnings.push('Message tronqué à 2000 caractères');
      }
    } else {
      errors.push('Paramètre "message" requis (string non vide)');
    }

    if (typeof body.session_id === 'string' && body.session_id.length > 0) {
      sanitized.session_id = body.session_id;
    } else {
      errors.push('Paramètre "session_id" requis (string UUID)');
    }

    if (typeof body.user_id === 'string' && body.user_id.length > 0) {
      sanitized.user_id = body.user_id;
    } else {
      errors.push('Paramètre "user_id" requis (string UUID)');
    }

    if (typeof body.farm_id === 'number' && body.farm_id > 0) {
      sanitized.farm_id = body.farm_id;
    } else {
      errors.push('Paramètre "farm_id" requis (number > 0)');
    }

    // Options optionnelles
    if (body.options && typeof body.options === 'object') {
      sanitized.options = body.options;
    } else {
      sanitized.options = {};
    }

    return {
      valid: errors.length === 0,
      sanitized_body: sanitized,
      errors,
      warnings
    };
  }
}

