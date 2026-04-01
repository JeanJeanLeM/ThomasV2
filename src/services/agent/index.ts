/**
 * Index des services Agent IA Thomas
 * Point d'entrée centralisé pour tous les composants agent
 */

// Types de base
export * from './types/AgentTypes';

// Classes de base
export { AgentTool } from './base/AgentTool';

// Services core
export { ThomasAgentService } from '../ThomasAgentService';
export { AgentContextService } from './AgentContextService';
export { ToolRegistry } from './ToolRegistry';

// Services de prompt management avancé
export * from './prompts';

// Services de matching
export * from './matching';

// Services de pipeline et orchestration
export * from './pipeline';

// Tools système
export * from './tools';

// Factory d'initialisation pour faciliter l'usage
export class ThomasAgentFactory {
  /**
   * Création d'une instance Thomas Agent complète avec tous les services
   */
  static async createAgent(supabaseClient: any, openAIApiKey: string): Promise<ThomasAgentService> {
    console.log('🏭 Creating complete Thomas Agent instance...');
    
    try {
      // 1. Initialiser le système de prompts
      const { PromptSystemInitializer } = await import('./prompts');
      const promptSystemStatus = await PromptSystemInitializer.initializePromptSystem(
        supabaseClient, 
        openAIApiKey
      );

      if (!promptSystemStatus.initialized) {
        console.warn('⚠️ Prompt system initialization issues:', promptSystemStatus.deployment_errors);
      }

      // 2. Créer l'agent principal avec prompt manager avancé
      const agent = new ThomasAgentService(supabaseClient, openAIApiKey);
      
      // 3. Créer tous les services de matching
      const { MatchingServicesFactory } = await import('./matching');
      const matchingServices = MatchingServicesFactory.createServices(supabaseClient);
      
      // 4. Valider les services de matching
      const validation = await MatchingServicesFactory.validateServices(matchingServices);
      if (!validation.services_valid) {
        console.warn('⚠️ Matching services validation issues:', validation.errors);
      }

      // 5. Créer et enregistrer tous les tools
      const { AgentToolsFactory } = await import('./tools');
      const tools = AgentToolsFactory.createAllTools(
        supabaseClient,
        matchingServices.plotMatching,
        matchingServices.materialMatching,
        matchingServices.conversionMatching,
        matchingServices.phytosanitaryMatching
      );

      // 6. Validation des tools
      const toolValidation = AgentToolsFactory.validateTools(tools);
      if (!toolValidation.valid) {
        console.error('❌ Tools validation failed:', toolValidation.errors);
        throw new Error(`Validation tools échouée: ${toolValidation.errors.join(', ')}`);
      }

      console.log('✅ Thomas Agent created successfully with complete system:', {
        prompt_system: promptSystemStatus.initialized,
        prompts_deployed: promptSystemStatus.prompts_deployed,
        matching_services: validation.services_valid,
        tools_valid: toolValidation.valid,
        tools_count: Object.keys(tools).length
      });
      
      return agent;

    } catch (error) {
      console.error('❌ Failed to create complete Thomas Agent:', error);
      throw new Error(`Échec création agent complet: ${error.message}`);
    }
  }

  /**
   * Validation de la configuration environnement
   */
  static validateEnvironment(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validation OpenAI API Key
    if (!process.env.OPENAI_API_KEY) {
      errors.push('OPENAI_API_KEY environnement variable missing');
    }

    // Validation Supabase
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      errors.push('Supabase environment variables missing');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Création d'une instance complète pour tests
   */
  static createTestAgent(): ThomasAgentService {
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
        insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: () => ({ error: null }) })
      })
    };

    return new ThomasAgentService(mockSupabase as any, 'test-api-key');
  }
}
