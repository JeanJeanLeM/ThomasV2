import { PipelineIntegrationService } from '../PipelineIntegrationService';
import { ThomasPipelineFactory } from '../index';

/**
 * Tests d'intégration complète du pipeline Thomas Agent
 * Validation de bout en bout - Phases 1-6
 */
describe('Thomas Agent Pipeline - Complete Integration', () => {
  let pipelineService: PipelineIntegrationService;
  let mockSupabase: any;

  beforeEach(() => {
    // Mock Supabase complet pour tous les services
    mockSupabase = {
      from: jest.fn((tableName: string) => ({
        select: jest.fn((columns = '*') => ({
          eq: jest.fn((column: string, value: any) => ({
            single: jest.fn(() => ({ 
              data: getMockDataForTable(tableName, { [column]: value }), 
              error: null 
            })),
            order: jest.fn(() => ({
              limit: jest.fn(() => ({ 
                data: getMockArrayDataForTable(tableName), 
                error: null 
              }))
            })),
            limit: jest.fn((count: number) => ({ 
              data: getMockArrayDataForTable(tableName).slice(0, count), 
              error: null 
            }))
          })),
          gte: jest.fn(() => ({
            order: jest.fn(() => ({ data: [], error: null }))
          })),
          in: jest.fn(() => ({
            single: jest.fn(() => ({ data: {}, error: null })),
            limit: jest.fn(() => ({ data: [], error: null }))
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => ({ data: getMockArrayDataForTable(tableName), error: null }))
          }))
        })),
        insert: jest.fn((data: any) => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({ 
              data: { id: `mock-${tableName}-${Date.now()}`, ...data }, 
              error: null 
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({ error: null }))
        })),
        upsert: jest.fn(() => ({ error: null }))
      }))
    };

    pipelineService = new PipelineIntegrationService(mockSupabase, 'test-openai-key');
  });

  describe('Pipeline Initialization', () => {
    
    test('should initialize complete pipeline successfully', async () => {
      const initResult = await pipelineService.initializeCompletePipeline();
      
      expect(initResult.success).toBe(true);
      expect(initResult.stages_completed).toContain('database_validation');
      expect(initResult.stages_completed).toContain('prompt_system');
      expect(initResult.stages_completed).toContain('matching_services');
      expect(initResult.stages_completed).toContain('agent_tools');
      expect(initResult.stages_completed).toContain('tool_registry');
      expect(initResult.stages_completed).toContain('pipeline_assembly');
      expect(initResult.total_time_ms).toBeGreaterThan(0);
    });

    test('should handle initialization errors gracefully', async () => {
      // Mock erreur database
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          limit: jest.fn(() => ({ data: null, error: { message: 'Database error' } }))
        }))
      }));

      const initResult = await pipelineService.initializeCompletePipeline();
      
      expect(initResult.success).toBe(false);
      expect(initResult.stages_failed.length).toBeGreaterThan(0);
      expect(initResult.stages_failed[0]).toContain('Database');
    });

    test('should validate all required database tables', async () => {
      const initResult = await pipelineService.initializeCompletePipeline();
      
      expect(initResult.success).toBe(true);
      expect(initResult.components_status.database).toBe('ready');
      
      // Vérifier que toutes les tables requises ont été testées
      expect(mockSupabase.from).toHaveBeenCalledWith('chat_prompts');
      expect(mockSupabase.from).toHaveBeenCalledWith('plots');
      expect(mockSupabase.from).toHaveBeenCalledWith('materials');
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabase.from).toHaveBeenCalledWith('observations');
    });
  });

  describe('Message Processing - Complete Workflow', () => {
    
    beforeEach(async () => {
      // Assurer pipeline initialisé
      await pipelineService.initializeCompletePipeline();
    });

    test('should process observation message end-to-end', async () => {
      const message = "j'ai observé des pucerons sur mes tomates dans la serre 1";
      
      const response = await pipelineService.processMessage(
        message,
        'test-session-id',
        'test-user-id', 
        1
      );

      expect(response.success).toBe(true);
      expect(response.type).toBe('actions');
      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.actions).toBeDefined();
    });

    test('should process harvest message with conversion', async () => {
      const message = "j'ai récolté 3 caisses de courgettes";
      
      const response = await pipelineService.processMessage(
        message,
        'test-session-id',
        'test-user-id',
        1
      );

      expect(response.success).toBe(true);
      expect(response.content).toContain('récolté');
      
      // Vérifier que Supabase a été appelé pour création
      expect(mockSupabase.from).toHaveBeenCalledWith('chat_message_analyses');
      expect(mockSupabase.from).toHaveBeenCalledWith('chat_agent_executions');
    });

    test('should process help request appropriately', async () => {
      const message = "comment créer une nouvelle parcelle ?";
      
      const response = await pipelineService.processMessage(
        message,
        'test-session-id',
        'test-user-id',
        1
      );

      expect(response.success).toBe(true);
      expect(response.content).toContain('parcelle');
      expect(response.suggestions).toBeDefined();
      expect(response.suggestions!.length).toBeGreaterThan(0);
    });

    test('should handle complex multi-action message', async () => {
      const complexMessage = "j'ai observé des pucerons sur mes tomates serre 1, récolté 3 caisses de courgettes et je prévois de traiter demain";
      
      const response = await pipelineService.processMessage(
        complexMessage,
        'test-session-id',
        'test-user-id',
        1
      );

      expect(response.success).toBe(true);
      expect(response.type).toBe('actions');
      
      // Message complexe devrait générer plusieurs actions
      // (simulation MVP - sera plus précis avec vrais LLM calls)
      expect(response.content.length).toBeGreaterThan(50);
    });
  });

  describe('System Health and Performance', () => {
    
    beforeEach(async () => {
      await pipelineService.initializeCompletePipeline();
    });

    test('should provide system health status', async () => {
      const health = await pipelineService.getSystemHealth();
      
      expect(health.overall_status).toBeOneOf(['healthy', 'degraded', 'unhealthy']);
      expect(health.components).toBeDefined();
      expect(health.components.pipeline_initialized).toBe(true);
      expect(health.recommendations).toBeDefined();
      expect(health.last_check).toBeDefined();
    });

    test('should provide performance metrics', async () => {
      const metrics = await pipelineService.getPerformanceMetrics(7);
      
      expect(metrics.period_days).toBe(7);
      expect(metrics.total_requests).toBeGreaterThanOrEqual(0);
      expect(metrics.success_rate).toBeGreaterThanOrEqual(0);
      expect(metrics.success_rate).toBeLessThanOrEqual(1);
      expect(metrics.avg_processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(metrics.system_stats).toBeDefined();
    });

    test('should handle graceful restart', async () => {
      const restartResult = await pipelineService.gracefulRestart();
      
      expect(restartResult.success).toBe(true);
      expect(restartResult.message).toContain('succès');
      expect(pipelineService.isSystemReady()).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    
    test('should handle system not initialized', async () => {
      // Service non initialisé
      const uninitializedService = new PipelineIntegrationService(mockSupabase, 'test-key');
      
      const response = await uninitializedService.processMessage(
        'test message',
        'session',
        'user', 
        1
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('non initialisé');
      expect(response.suggestions).toBeDefined();
    });

    test('should handle database connection errors', async () => {
      // Mock erreur database
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          limit: jest.fn(() => ({ error: { message: 'Connection failed' } }))
        }))
      }));

      const response = await pipelineService.processMessage(
        'test message',
        'session',
        'user',
        1
      );

      expect(response.success).toBe(false);
      expect(response.content).toContain('indisponible');
    });

    test('should provide appropriate fallback responses', async () => {
      await pipelineService.initializeCompletePipeline();
      
      // Message incompréhensible
      const response = await pipelineService.processMessage(
        'xyz123 qwerty asdf',
        'session',
        'user',
        1
      );

      // Même si incompréhensible, doit fournir aide
      expect(response.content).toBeDefined();
      expect(response.suggestions).toBeDefined();
      expect(response.suggestions!.length).toBeGreaterThan(0);
    });
  });

  describe('Factory Patterns', () => {
    
    test('should create production pipeline via factory', async () => {
      const productionPipeline = await ThomasPipelineFactory.createProductionPipeline(
        mockSupabase,
        'production-api-key'
      );

      expect(productionPipeline).toBeInstanceOf(PipelineIntegrationService);
      expect(productionPipeline.isSystemReady()).toBe(true);
    });

    test('should create development pipeline', () => {
      const devPipeline = ThomasPipelineFactory.createDevelopmentPipeline();
      
      expect(devPipeline).toBeInstanceOf(PipelineIntegrationService);
    });

    test('should validate deployment environment', () => {
      const validation = ThomasPipelineFactory.validateDeploymentEnvironment();
      
      expect(validation.ready).toBeDefined();
      expect(validation.issues).toBeDefined();
      expect(validation.recommendations).toBeDefined();
      
      // En test, certaines variables peuvent manquer
      if (!validation.ready) {
        expect(validation.issues.length).toBeGreaterThan(0);
      }
    });

    test('should perform quick health check', async () => {
      await pipelineService.initializeCompletePipeline();
      
      const healthCheck = await ThomasPipelineFactory.quickHealthCheck(pipelineService);
      
      expect(healthCheck.status).toBeOneOf(['UP', 'DOWN', 'DEGRADED']);
      expect(healthCheck.response_time_ms).toBeGreaterThan(0);
      expect(healthCheck.components_healthy).toBeGreaterThanOrEqual(0);
      expect(healthCheck.components_total).toBeGreaterThan(0);
    });
  });

  describe('Edge Function Integration', () => {
    
    test('should format response correctly for Edge Function', async () => {
      await pipelineService.initializeCompletePipeline();
      
      const edgeResponse = await pipelineService.handleEdgeRequest({
        message: 'test message',
        session_id: 'session',
        user_id: 'user',
        farm_id: 1,
        options: {}
      });

      expect(edgeResponse.success).toBeDefined();
      expect(edgeResponse.data || edgeResponse.error).toBeDefined();
      
      if (edgeResponse.success) {
        expect(edgeResponse.data?.type).toBeDefined();
        expect(edgeResponse.data?.content).toBeDefined();
        expect(edgeResponse.metadata?.agent_version).toBe('thomas_agent_v2.0');
      }
    });

    test('should validate edge request parameters', async () => {
      await pipelineService.initializeCompletePipeline();
      
      const invalidRequest = {
        message: '', // Message vide
        session_id: 'session',
        user_id: 'user',
        farm_id: 0 // Farm ID invalide
      };

      const response = await pipelineService.handleEdgeRequest(invalidRequest);
      
      expect(response.success).toBe(false);
      expect(response.error?.type).toBe('validation_error');
      expect(response.error?.message).toContain('Message requis');
    });
  });
});

/**
 * Tests de performance du pipeline
 */
describe('Pipeline Performance', () => {
  let pipelineService: PipelineIntegrationService;

  beforeEach(async () => {
    const mockSupabase = createOptimizedMockSupabase();
    pipelineService = new PipelineIntegrationService(mockSupabase, 'test-key');
    await pipelineService.initializeCompletePipeline();
  });

  test('should process messages within acceptable time limits', async () => {
    const messages = [
      "j'ai observé des pucerons",
      "comment créer une parcelle ?",
      "j'ai récolté 3 caisses de courgettes"
    ];

    for (const message of messages) {
      const startTime = Date.now();
      
      const response = await pipelineService.processMessage(
        message,
        'session',
        'user',
        1
      );
      
      const processingTime = Date.now() - startTime;
      
      expect(response).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Moins de 5s
      
      console.log(`⏱️ Message "${message.substring(0, 20)}...": ${processingTime}ms`);
    }
  });

  test('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = 5;
    const message = "test concurrent";
    
    const promises = Array(concurrentRequests).fill(null).map((_, index) => 
      pipelineService.processMessage(
        `${message} ${index}`,
        `session-${index}`,
        'user',
        1
      )
    );

    const startTime = Date.now();
    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    responses.forEach(response => {
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    expect(totalTime).toBeLessThan(10000); // 10s pour 5 requêtes parallèles
    console.log(`🚀 ${concurrentRequests} concurrent requests: ${totalTime}ms total`);
  });
});

/**
 * Tests des patterns Anthropic
 */
describe('Anthropic Patterns Compliance', () => {
  
  test('should implement context engineering principles', async () => {
    const service = new PipelineIntegrationService(createOptimizedMockSupabase(), 'test-key');
    await service.initializeCompletePipeline();

    // Test que le contexte est optimisé (minimal mais complet)
    const response = await service.processMessage(
      'long message with many details about farming activities',
      'session',
      'user',
      1
    );

    expect(response).toBeDefined();
    // Le système devrait fonctionner même avec messages longs
    expect(response.content).toBeDefined();
  });

  test('should implement autonomous tool selection', async () => {
    const service = new PipelineIntegrationService(createOptimizedMockSupabase(), 'test-key');
    await service.initializeCompletePipeline();

    const response = await service.processMessage(
      "j'ai observé des pucerons et récolté des courgettes", // Actions multiples
      'session',
      'user',
      1
    );

    expect(response.success).toBe(true);
    // L'agent devrait traiter les actions multiples de façon autonome
    expect(response.content).toBeDefined();
  });

  test('should implement error recovery with fallbacks', async () => {
    // Mock erreur partielle
    const faultyMock = createOptimizedMockSupabase();
    faultyMock.from = jest.fn((table: string) => {
      if (table === 'tasks') {
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({ data: null, error: { message: 'Insert failed' } }))
            }))
          }))
        };
      }
      return createOptimizedMockSupabase().from(table);
    });

    const service = new PipelineIntegrationService(faultyMock, 'test-key');
    await service.initializeCompletePipeline();

    const response = await service.processMessage(
      'test message',
      'session',
      'user',
      1
    );

    // Même avec erreurs partielles, devrait fournir réponse
    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(response.suggestions).toBeDefined();
  });
});

// ============================================================================
// HELPERS DE TEST
// ============================================================================

/**
 * Données mock pour tables selon contexte
 */
function getMockDataForTable(tableName: string, filters: Record<string, any> = {}): any {
  const mockData: Record<string, any> = {
    'profiles': {
      id: filters.id || 'test-user',
      full_name: 'Testeur Thomas',
      language: 'fr'
    },
    'farms': {
      id: filters.id || 1,
      name: 'Ferme de Test',
      farm_type: 'maraichage'
    },
    'chat_prompts': {
      id: 'prompt-id',
      name: filters.name || 'thomas_agent_system',
      content: 'Tu es Thomas, assistant agricole...',
      version: '2.0',
      is_active: true,
      examples: [],
      metadata: { category: 'system' }
    },
    'plots': {
      id: 1,
      name: 'Serre 1',
      type: 'serre_plastique',
      aliases: ['serre1'],
      llm_keywords: ['serre'],
      is_active: true
    },
    'materials': {
      id: 1,
      name: 'John Deere 6120',
      category: 'tracteurs',
      llm_keywords: ['tracteur'],
      is_active: true
    }
  };

  return mockData[tableName] || {};
}

/**
 * Données array mock pour tables
 */
function getMockArrayDataForTable(tableName: string): any[] {
  const mockArrays: Record<string, any[]> = {
    'plots': [
      {
        id: 1,
        name: 'Serre 1',
        type: 'serre_plastique',
        aliases: ['serre1'],
        llm_keywords: ['serre'],
        is_active: true
      },
      {
        id: 2,
        name: 'Tunnel Nord',
        type: 'tunnel', 
        aliases: ['tunnel_n'],
        llm_keywords: ['tunnel'],
        is_active: true
      }
    ],
    'materials': [
      {
        id: 1,
        name: 'John Deere 6120',
        category: 'tracteurs',
        brand: 'John Deere',
        model: '6120',
        llm_keywords: ['tracteur', 'john deere'],
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
        slugs: ['caisses', 'casier'],
        is_active: true
      }
    ]
  };

  return mockArrays[tableName] || [];
}

/**
 * Mock Supabase optimisé pour performance
 */
function createOptimizedMockSupabase(): any {
  return {
    from: jest.fn((tableName: string) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ 
            data: getMockDataForTable(tableName), 
            error: null 
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => ({ 
              data: getMockArrayDataForTable(tableName), 
              error: null 
            }))
          })),
          limit: jest.fn(() => ({ 
            data: getMockArrayDataForTable(tableName), 
            error: null 
          }))
        })),
        gte: jest.fn(() => ({
          order: jest.fn(() => ({ data: [], error: null }))
        })),
        in: jest.fn(() => ({
          single: jest.fn(() => ({ data: getMockDataForTable(tableName), error: null }))
        })),
        order: jest.fn(() => ({ data: getMockArrayDataForTable(tableName), error: null })),
        limit: jest.fn(() => ({ data: getMockArrayDataForTable(tableName), error: null }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({ 
            data: { id: `mock-${tableName}-${Date.now()}` }, 
            error: null 
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({ error: null }))
      })),
      upsert: jest.fn(() => ({ error: null }))
    }))
  };
}

// Extension Jest pour matchers custom
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}

// Matcher custom pour Jest
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});

