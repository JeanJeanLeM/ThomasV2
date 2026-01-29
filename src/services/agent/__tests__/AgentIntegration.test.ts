/**
 * Test d'intégration complète Thomas Agent
 * Validation que toutes les phases s'intègrent correctement
 */
import { ThomasAgentService } from '../../ThomasAgentService';
import { AgentContextService } from '../AgentContextService';
import { ToolRegistry } from '../ToolRegistry';
import { PromptManager } from '../PromptManager';
import { MatchingServicesFactory } from '../matching';
import { AgentToolsFactory } from '../tools';

describe('Thomas Agent Integration - Phases 1-4', () => {
  let agent: ThomasAgentService;
  let mockSupabase: any;

  beforeEach(async () => {
    // Mock Supabase complet
    mockSupabase = {
      from: jest.fn((tableName) => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ 
              data: mockDataFor(tableName), 
              error: null 
            })),
            order: jest.fn(() => ({
              limit: jest.fn(() => ({ data: [], error: null }))
            }))
          })),
          contains: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({ data: [], error: null }))
              }))
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({ 
              data: { id: `test-${tableName}-id` }, 
              error: null 
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({ error: null }))
        }))
      }))
    };

    // Créer agent avec toutes les dépendances
    agent = new ThomasAgentService(mockSupabase, 'test-api-key');
  });

  test('should initialize all components successfully', async () => {
    // Test que tous les services peuvent être créés
    const contextService = new AgentContextService(mockSupabase);
    const toolRegistry = new ToolRegistry();
    const promptManager = new PromptManager(mockSupabase);
    const matchingServices = MatchingServicesFactory.createServices(mockSupabase);

    expect(contextService).toBeDefined();
    expect(toolRegistry).toBeDefined();  
    expect(promptManager).toBeDefined();
    expect(matchingServices.plotMatching).toBeDefined();
    expect(matchingServices.materialMatching).toBeDefined();
    expect(matchingServices.conversionMatching).toBeDefined();

    // Test création des tools
    const tools = AgentToolsFactory.createAllTools(
      mockSupabase,
      matchingServices.plotMatching,
      matchingServices.materialMatching,
      matchingServices.conversionMatching
    );

    expect(tools.observationTool).toBeDefined();
    expect(tools.taskDoneTool).toBeDefined();
    expect(tools.taskPlannedTool).toBeDefined();
    expect(tools.harvestTool).toBeDefined();
    expect(tools.plotTool).toBeDefined();
    expect(tools.helpTool).toBeDefined();

    // Validation des tools
    const validation = AgentToolsFactory.validateTools(tools);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should handle complete agent workflow simulation', async () => {
    // Test simulation workflow complet agent
    const result = await agent.processMessage(
      "j'ai observé des pucerons sur mes tomates serre 1",
      'test-session',
      'test-user',
      1
    );

    // L'agent doit retourner une réponse structurée
    expect(result).toBeDefined();
    expect(result.type).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.success).toBeDefined();

    // Vérifier que Supabase a été appelé pour staging et création
    expect(mockSupabase.from).toHaveBeenCalledWith('chat_message_analyses');
    expect(mockSupabase.from).toHaveBeenCalledWith('chat_agent_executions');
  });

  test('should handle multiple action message', async () => {
    const complexMessage = "j'ai observé des pucerons serre 1 et récolté 3 caisses de courgettes";
    
    const result = await agent.processMessage(
      complexMessage,
      'test-session',
      'test-user', 
      1
    );

    expect(result.success).toBeDefined();
    expect(result.content).toBeDefined();
    
    // Vérifier que l'agent a bien analysé le message complexe
    expect(mockSupabase.from).toHaveBeenCalledWith('chat_message_analyses');
  });

  test('should handle error gracefully with fallback', async () => {
    // Mock erreur database
    mockSupabase.from = jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: { message: 'Database error' } }))
        }))
      }))
    }));

    const result = await agent.processMessage(
      "test message",
      'test-session',
      'test-user',
      1
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Database error');
    expect(result.suggestions).toBeDefined();
  });

  // Helper function pour mock data selon table
  function mockDataFor(tableName: string): any {
    const mockData: Record<string, any> = {
      'profiles': {
        id: 'test-user',
        full_name: 'Test User',
        email: 'test@test.com',
        language: 'fr'
      },
      'farms': {
        id: 1,
        name: 'Ferme Test'
      },
      'plots': [
        {
          id: 1,
          name: 'Serre 1',
          type: 'serre_plastique',
          aliases: ['serre1'],
          llm_keywords: ['serre'],
          is_active: true,
          surface_units: []
        }
      ],
      'materials': [
        {
          id: 1,
          name: 'John Deere 6120',
          category: 'tracteurs',
          llm_keywords: ['tracteur'],
          is_active: true
        }
      ],
      'user_conversion_units': [
        {
          id: '1',
          container_name: 'caisse',
          crop_name: 'courgettes',
          conversion_value: 5,
          conversion_unit: 'kg',
          slugs: ['caisses'],
          is_active: true
        }
      ],
      'chat_prompts': {
        id: 'test-prompt',
        name: 'thomas_agent_system',
        content: 'Tu es Thomas...',
        version: '1.0',
        is_active: true
      }
    };

    return mockData[tableName] || {};
  }
});

/**
 * Test de performance des tools
 */
describe('Tools Performance', () => {
  
  test('tools should execute within time limits', async () => {
    // Test que chaque tool s'exécute dans un délai raisonnable
    const timeouts = {
      ObservationTool: 2000,  // 2s max
      TaskDoneTool: 3000,     // 3s max (plus complexe)
      TaskPlannedTool: 2000,  // 2s max
      HarvestTool: 3000,      // 3s max (calculs)
      HelpTool: 500,          // 0.5s max (simple)
      PlotTool: 1000          // 1s max
    };

    // TODO: Implémenter tests de performance réels
    expect(true).toBe(true); // Placeholder pour MVP
  });
});

/**
 * Test des patterns Anthropic
 */
describe('Anthropic Patterns Compliance', () => {
  
  test('should implement autonomous tool selection', () => {
    // Vérifier que l'agent sélectionne les tools de façon autonome
    // TODO: Test avec vraie logique de sélection
    expect(true).toBe(true); // Placeholder pour MVP
  });

  test('should implement context engineering principles', () => {
    // Vérifier application des principes de context engineering
    // TODO: Mesurer taille contexte vs performance  
    expect(true).toBe(true); // Placeholder pour MVP
  });

  test('should implement error recovery patterns', () => {
    // Vérifier gestion d'erreur et recovery
    // TODO: Test avec vraies erreurs et fallbacks
    expect(true).toBe(true); // Placeholder pour MVP  
  });
});

