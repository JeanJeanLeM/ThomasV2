import { SupabaseClient } from '@supabase/supabase-js';
import { ThomasAgentService } from '../ThomasAgentService';
import { AgentPipeline } from './pipeline/AgentPipeline';
import { FarmAgentConfigService } from './FarmAgentConfigService';
import { AgentResponse } from './types/AgentTypes';

/**
 * Routeur principal pour choisir entre les deux méthodes d'analyse:
 * - Méthode 1: ThomasAgentService (prompt simple monolithique)
 * - Méthode 2: AgentPipeline (pipeline avec tool calling)
 * 
 * Le choix se fait au niveau ferme via la table farm_agent_config
 */

export interface MethodComparisonResult {
  message: string;
  method1_result: AgentResponse;
  method2_result: AgentResponse;
  method1_time_ms: number;
  method2_time_ms: number;
  methods_agree: boolean;
  comparison_details: {
    intent_match: boolean;
    actions_count_match: boolean;
    confidence_diff: number;
  };
}

export interface RouterOptions {
  forceMethod?: 'simple' | 'pipeline';
  enableComparison?: boolean;
  timeout_ms?: number;
}

export class AgentMethodRouter {
  private configService: FarmAgentConfigService;
  private method1Service: ThomasAgentService | null = null;
  private method2Service: AgentPipeline | null = null;
  private isInitialized = false;

  constructor(
    private supabase: SupabaseClient,
    private openAIApiKey: string
  ) {
    this.configService = new FarmAgentConfigService(supabase);
  }

  /**
   * Initialiser les deux services
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🚀 Initializing AgentMethodRouter...');

    try {
      // Initialiser les deux méthodes
      this.method1Service = new ThomasAgentService(this.supabase, this.openAIApiKey);
      this.method2Service = new AgentPipeline(this.supabase, this.openAIApiKey);

      this.isInitialized = true;
      console.log('✅ AgentMethodRouter initialized');

    } catch (error) {
      console.error('❌ Router initialization failed:', error);
      throw new Error(`Échec initialisation router: ${error.message}`);
    }
  }

  /**
   * Point d'entrée principal - Router le message selon la config ferme
   */
  async processMessage(
    message: string,
    sessionId: string,
    userId: string,
    farmId: number,
    options: RouterOptions = {}
  ): Promise<AgentResponse> {
    
    await this.initialize();

    const startTime = Date.now();

    try {
      console.log(`🔀 Routing message for farm ${farmId}...`);

      // Déterminer la méthode à utiliser
      let method: 'simple' | 'pipeline';

      if (options.forceMethod) {
        method = options.forceMethod;
        console.log(`🔧 Forced method: ${method}`);
      } else {
        const config = await this.configService.getFarmConfig(farmId);
        method = config.agent_method;
        console.log(`⚙️ Farm config method: ${method}`);
      }

      // Router vers la méthode appropriée
      let response: AgentResponse;

      if (method === 'simple') {
        response = await this.executeMethod1(message, sessionId, userId, farmId);
      } else {
        response = await this.executeMethod2(message, sessionId, userId, farmId);
      }

      // Enregistrer les métriques
      if (!options.forceMethod) {
        await this.configService.recordMethodExecution(
          farmId,
          method,
          response.success
        );
      }

      // Ajouter des métadonnées sur la méthode utilisée
      (response as any).method_used = method;
      (response as any).routing_time_ms = Date.now() - startTime;

      console.log(`✅ Message processed with method ${method} in ${Date.now() - startTime}ms`);
      return response;

    } catch (error) {
      console.error('❌ Router processing error:', error);
      
      // Fallback intelligent
      return {
        type: 'error',
        content: 'Erreur lors du traitement de votre message. Notre équipe technique a été notifiée.',
        actions: [],
        success: false,
        error: error.message,
        suggestions: [
          'Vérifier votre connexion internet',
          'Réessayer dans quelques instants',
          'Reformuler votre message'
        ]
      };
    }
  }

  /**
   * Exécuter Méthode 1: Prompt simple monolithique
   */
  private async executeMethod1(
    message: string,
    sessionId: string,
    userId: string,
    farmId: number
  ): Promise<AgentResponse> {
    
    console.log('📝 Executing Method 1: Simple prompt...');
    const startTime = Date.now();

    try {
      const response = await this.method1Service!.processMessage(
        message,
        sessionId,
        userId,
        farmId
      );

      response.processing_time_ms = Date.now() - startTime;
      console.log(`✅ Method 1 completed in ${response.processing_time_ms}ms`);
      
      return response;

    } catch (error) {
      console.error('❌ Method 1 error:', error);
      throw new Error(`Méthode simple failed: ${error.message}`);
    }
  }

  /**
   * Exécuter Méthode 2: Pipeline avec tool calling
   */
  private async executeMethod2(
    message: string,
    sessionId: string,
    userId: string,
    farmId: number
  ): Promise<AgentResponse> {
    
    console.log('⚡ Executing Method 2: Pipeline...');
    const startTime = Date.now();

    try {
      const response = await this.method2Service!.processMessage(
        message,
        sessionId,
        userId,
        farmId
      );

      response.processing_time_ms = Date.now() - startTime;
      console.log(`✅ Method 2 completed in ${response.processing_time_ms}ms`);
      
      return response;

    } catch (error) {
      console.error('❌ Method 2 error:', error);
      throw new Error(`Pipeline failed: ${error.message}`);
    }
  }

  /**
   * Comparer les résultats des deux méthodes côte à côte
   * Utile pour tester et valider les méthodes
   */
  async compareMethodsForMessage(
    message: string,
    sessionId: string,
    userId: string,
    farmId: number
  ): Promise<MethodComparisonResult> {
    
    await this.initialize();

    console.log('🔬 Comparing both methods...');

    // Exécuter les deux méthodes en parallèle
    const [method1Result, method2Result] = await Promise.allSettled([
      this.executeMethod1WithTiming(message, sessionId, userId, farmId),
      this.executeMethod2WithTiming(message, sessionId, userId, farmId)
    ]);

    // Extraire les résultats
    const method1Data = method1Result.status === 'fulfilled' 
      ? method1Result.value 
      : { response: this.createErrorResponse('Method 1 failed'), time_ms: 0 };

    const method2Data = method2Result.status === 'fulfilled'
      ? method2Result.value
      : { response: this.createErrorResponse('Method 2 failed'), time_ms: 0 };

    // Analyser les différences
    const methods_agree = this.compareResponses(method1Data.response, method2Data.response);

    const comparison: MethodComparisonResult = {
      message,
      method1_result: method1Data.response,
      method2_result: method2Data.response,
      method1_time_ms: method1Data.time_ms,
      method2_time_ms: method2Data.time_ms,
      methods_agree,
      comparison_details: {
        intent_match: this.compareIntents(method1Data.response, method2Data.response),
        actions_count_match: method1Data.response.actions.length === method2Data.response.actions.length,
        confidence_diff: Math.abs(
          (method1Data.response.confidence || 0) - (method2Data.response.confidence || 0)
        )
      }
    };

    // Stocker la comparaison
    await this.storeComparison(farmId, userId, comparison);

    console.log('✅ Comparison completed:', {
      methods_agree,
      time_diff: `${Math.abs(method1Data.time_ms - method2Data.time_ms)}ms`
    });

    return comparison;
  }

  /**
   * Exécuter une méthode avec mesure du temps
   */
  private async executeMethod1WithTiming(
    message: string,
    sessionId: string,
    userId: string,
    farmId: number
  ): Promise<{ response: AgentResponse; time_ms: number }> {
    const startTime = Date.now();
    const response = await this.executeMethod1(message, sessionId, userId, farmId);
    return { response, time_ms: Date.now() - startTime };
  }

  private async executeMethod2WithTiming(
    message: string,
    sessionId: string,
    userId: string,
    farmId: number
  ): Promise<{ response: AgentResponse; time_ms: number }> {
    const startTime = Date.now();
    const response = await this.executeMethod2(message, sessionId, userId, farmId);
    return { response, time_ms: Date.now() - startTime };
  }

  /**
   * Comparer deux réponses pour voir si elles sont similaires
   */
  private compareResponses(response1: AgentResponse, response2: AgentResponse): boolean {
    // Si l'une a échoué et pas l'autre, elles ne sont pas équivalentes
    if (response1.success !== response2.success) {
      return false;
    }

    // Si les deux ont échoué, considérer comme équivalent
    if (!response1.success && !response2.success) {
      return true;
    }

    // Comparer le nombre d'actions
    if (response1.actions.length !== response2.actions.length) {
      return false;
    }

    // Comparer les types d'actions (ordre non important)
    const types1 = response1.actions.map(a => a.type).sort();
    const types2 = response2.actions.map(a => a.type).sort();

    return JSON.stringify(types1) === JSON.stringify(types2);
  }

  /**
   * Comparer les intents détectés
   */
  private compareIntents(response1: AgentResponse, response2: AgentResponse): boolean {
    const intent1 = (response1 as any).intent || 'unknown';
    const intent2 = (response2 as any).intent || 'unknown';
    return intent1 === intent2;
  }

  /**
   * Créer une réponse d'erreur
   */
  private createErrorResponse(message: string): AgentResponse {
    return {
      type: 'error',
      content: message,
      actions: [],
      success: false,
      error: message
    };
  }

  /**
   * Stocker la comparaison dans la base de données
   */
  private async storeComparison(
    farmId: number,
    userId: string,
    comparison: MethodComparisonResult
  ): Promise<void> {
    try {
      await this.supabase
        .from('agent_method_comparisons')
        .insert({
          farm_id: farmId,
          user_id: userId,
          message: comparison.message,
          method1_intent: (comparison.method1_result as any).intent,
          method1_actions: comparison.method1_result.actions,
          method1_confidence: comparison.method1_result.confidence,
          method1_processing_ms: comparison.method1_time_ms,
          method1_success: comparison.method1_result.success,
          method1_error: comparison.method1_result.error,
          method2_intent: (comparison.method2_result as any).intent,
          method2_actions: comparison.method2_result.actions,
          method2_confidence: comparison.method2_result.confidence,
          method2_processing_ms: comparison.method2_time_ms,
          method2_success: comparison.method2_result.success,
          method2_error: comparison.method2_result.error,
          methods_agree: comparison.methods_agree
        });

      console.log('✅ Comparison stored in database');

    } catch (error) {
      console.error('❌ Error storing comparison:', error);
      // Non-bloquant
    }
  }

  /**
   * Obtenir la configuration de la ferme
   */
  async getFarmAgentConfig(farmId: number) {
    return await this.configService.getFarmConfig(farmId);
  }

  /**
   * Mettre à jour la méthode pour une ferme
   */
  async updateFarmAgentConfig(
    farmId: number,
    method: 'simple' | 'pipeline',
    reason?: string
  ) {
    return await this.configService.updateAgentMethod(farmId, method, reason);
  }

  /**
   * Obtenir les statistiques de comparaison
   */
  async getMethodComparisonStats(farmId: number) {
    return await this.configService.getMethodComparisonStats(farmId);
  }

  /**
   * Vérifier si le router est prêt
   */
  isReady(): boolean {
    return this.isInitialized && this.method1Service !== null && this.method2Service !== null;
  }
}
