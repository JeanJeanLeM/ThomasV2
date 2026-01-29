import { 
  AgentToolsFactory, 
  AgentToolsCollection 
} from '../index';
import { MatchingServicesFactory } from '../../matching';
import { ThomasAgentService } from '../../../ThomasAgentService';
import { AgentContext } from '../../types/AgentTypes';

/**
 * Tests d'intégration complète des Agent Tools
 * Validation du workflow Message → Tools → Actions
 */
describe('Agent Tools Integration', () => {
  let tools: AgentToolsCollection;
  let mockSupabase: any;
  let mockContext: AgentContext;
  let matchingServices: any;

  beforeEach(async () => {
    // Mock Supabase client
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: { id: 'test-id' }, error: null })),
            order: jest.fn(() => ({ limit: jest.fn(() => ({ data: [], error: null })) }))
          })),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({ data: { id: 'test-staging-id' }, error: null }))
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => ({ error: null }))
          })),
          contains: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({ data: [], error: null }))
              }))
            }))
          }))
        }))
      }))
    };

    // Créer les services de matching
    matchingServices = MatchingServicesFactory.createServices(mockSupabase);

    // Créer tous les tools
    tools = AgentToolsFactory.createAllTools(
      mockSupabase,
      matchingServices.plotMatching,
      matchingServices.materialMatching,
      matchingServices.conversionMatching
    );

    // Mock context complet
    mockContext = {
      user: {
        id: 'test-user-id',
        name: 'Test User',
        farm_id: 1
      },
      farm: {
        id: 1,
        name: 'Ferme de Test',
        plots: [
          {
            id: 1,
            name: 'Serre 1',
            type: 'serre_plastique',
            aliases: ['serre1', 'grande serre'],
            llm_keywords: ['serre', 'tunnel'],
            surface_units: [
              {
                id: 11,
                plot_id: 1,
                name: 'Planche 1',
                type: 'planche',
                aliases: ['planche1'],
                llm_keywords: ['planche'],
                is_active: true
              }
            ],
            is_active: true
          }
        ],
        materials: [
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
        conversions: [
          {
            id: '1',
            container_name: 'caisse',
            crop_name: 'courgettes',
            conversion_value: 5,
            conversion_unit: 'kg',
            slugs: ['caisses', 'casier'],
            is_active: true
          }
        ],
        preferences: {
          language: 'fr',
          auto_categorization: true,
          confidence_threshold: 0.7,
          fallback_enabled: true
        }
      },
      session_id: 'test-session-id',
      analysis_id: 'test-analysis-id',
      availableTools: ['create_observation', 'create_task_done', 'create_task_planned', 'create_harvest', 'help']
    };
  });

  describe('Tools Validation', () => {
    
    test('should validate all tools successfully', () => {
      const validation = AgentToolsFactory.validateTools(tools);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should have all required tools', () => {
      expect(tools.observationTool).toBeDefined();
      expect(tools.taskDoneTool).toBeDefined();
      expect(tools.taskPlannedTool).toBeDefined();
      expect(tools.harvestTool).toBeDefined();
      expect(tools.helpTool).toBeDefined();
    });

    test('should have correct tool names', () => {
      expect(tools.observationTool.name).toBe('create_observation');
      expect(tools.taskDoneTool.name).toBe('create_task_done');
      expect(tools.taskPlannedTool.name).toBe('create_task_planned');
      expect(tools.harvestTool.name).toBe('create_harvest');
      expect(tools.helpTool.name).toBe('help');
    });
  });

  describe('ObservationTool Integration', () => {
    
    test('should create observation with plot matching', async () => {
      const params = {
        crop: 'tomates',
        issue: 'pucerons',
        plot_reference: 'serre 1',
        severity: 'medium'
      };

      const result = await tools.observationTool.execute(params, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.data.observation_id).toBe('test-id');
      expect(result.data.matched_plot).toBe('Serre 1');
      expect(result.message).toContain('pucerons');
      expect(result.message).toContain('Serre 1');
    });

    test('should handle plot not found error', async () => {
      const params = {
        crop: 'tomates',
        issue: 'pucerons', 
        plot_reference: 'parcelle inexistante'
      };

      const result = await tools.observationTool.execute(params, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Parcelle non trouvée');
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions).toContain('Serre 1');
    });
  });

  describe('TaskDoneTool Integration', () => {
    
    test('should create task with multi-entity matching', async () => {
      const params = {
        action: 'plantation',
        crop: 'tomates',
        plot_reference: 'serre 1',
        quantity: '3 caisses',
        material_reference: 'tracteur',
        duration_minutes: 120,
        number_of_people: 2
      };

      const result = await tools.taskDoneTool.execute(params, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.data.task_id).toBe('test-id');
      expect(result.data.matched_plot).toBe('Serre 1');
      expect(result.data.applied_conversion).toBeDefined();
      expect(result.message).toContain('plantation');
    });
  });

  describe('TaskPlannedTool Integration', () => {
    
    test('should create planned task with date parsing', async () => {
      const params = {
        action: 'traitement',
        crop: 'tomates',
        plot_reference: 'serre 1',
        date_reference: 'demain',
        time_reference: 'matin',
        priority: 'haute'
      };

      const result = await tools.taskPlannedTool.execute(params, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.data.task_id).toBe('test-id');
      expect(result.data.planned_date).toBeDefined();
      expect(result.data.planned_time).toBe('08:00');
      expect(result.message).toContain('traitement');
      expect(result.message).toContain('demain');
    });

    test('should handle invalid date parsing', async () => {
      const params = {
        action: 'traitement',
        crop: 'tomates',
        plot_reference: 'serre 1',
        date_reference: 'date impossible'
      };

      const result = await tools.taskPlannedTool.execute(params, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Date non comprise');
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('HarvestTool Integration', () => {
    
    test('should create harvest with quantity conversion', async () => {
      const params = {
        crop: 'courgettes',
        plot_reference: 'serre 1',
        quantity: '3 caisses',
        container_type: 'caisse standard',
        quality_assessment: 'excellent',
        harvest_conditions: 'temps sec, matin'
      };

      const result = await tools.harvestTool.execute(params, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.data.harvest_task_id).toBe('test-id');
      expect(result.data.quantity_converted).toBeDefined();
      expect(result.data.quality_grade).toBe('excellent');
      expect(result.message).toContain('15'); // 3 caisses = 15 kg
      expect(result.message).toContain('kg');
    });
  });

  describe('HelpTool Integration', () => {
    
    test('should provide contextual help', async () => {
      const params = {
        question_type: 'parcelle',
        user_question: 'comment créer une parcelle ?'
      };

      const result = await tools.helpTool.execute(params, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Profil');
      expect(result.message).toContain('Configuration');
      expect(result.message).toContain('Parcelles');
      expect(result.data.help_category).toBe('Configuration');
    });

    test('should handle unclear questions', async () => {
      const params = {
        question_type: 'unclear',
        user_question: 'hjklm qsdfgh'
      };

      const result = await tools.helpTool.execute(params, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('pas bien compris');
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('Error Handling & Recovery', () => {
    
    test('should handle missing analysis_id gracefully', async () => {
      const contextWithoutAnalysis = { ...mockContext, analysis_id: undefined };
      
      const params = {
        crop: 'tomates',
        issue: 'pucerons',
        plot_reference: 'serre 1'
      };

      const result = await tools.observationTool.execute(params, contextWithoutAnalysis);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Analysis ID manquant');
      expect(result.recovery_suggestions).toBeDefined();
    });

    test('should handle database errors gracefully', async () => {
      // Mock erreur Supabase
      mockSupabase.from = jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: { message: 'Database error' } }))
          }))
        }))
      }));

      const params = {
        crop: 'tomates',
        issue: 'pucerons',
        plot_reference: 'serre 1'
      };

      const result = await tools.observationTool.execute(params, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('Performance & Metrics', () => {
    
    test('should execute tools within reasonable time', async () => {
      const startTime = Date.now();
      
      const params = {
        question_type: 'general',
        user_question: 'test question'
      };

      const result = await tools.helpTool.execute(params, mockContext);
      
      const executionTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(1000); // Moins d'1 seconde
    });

    test('should provide confidence scores', async () => {
      const params = {
        crop: 'tomates',
        issue: 'pucerons',
        plot_reference: 'serre 1'
      };

      const result = await tools.observationTool.execute(params, mockContext);
      
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Complex Scenarios', () => {
    
    test('should handle multi-tool workflow simulation', async () => {
      // Simulation d'un message complexe nécessitant plusieurs tools
      
      // 1. Observation
      const obsResult = await tools.observationTool.execute({
        crop: 'tomates',
        issue: 'pucerons',
        plot_reference: 'serre 1',
        severity: 'high'
      }, mockContext);

      expect(obsResult.success).toBe(true);

      // 2. Tâche planifiée en réaction
      const taskResult = await tools.taskPlannedTool.execute({
        action: 'traitement',
        crop: 'tomates',
        plot_reference: 'serre 1',
        date_reference: 'demain',
        priority: 'urgente'
      }, mockContext);

      expect(taskResult.success).toBe(true);

      // 3. Récolte anticipée
      const harvestResult = await tools.harvestTool.execute({
        crop: 'courgettes',
        plot_reference: 'serre 1',
        quantity: '2 caisses',
        quality_assessment: 'good'
      }, mockContext);

      expect(harvestResult.success).toBe(true);

      // Vérifier que tous les résultats sont cohérents
      expect(obsResult.data.matched_plot).toBe(taskResult.data.matched_plot);
      expect(harvestResult.data.quantity_converted?.value).toBe(10); // 2 caisses = 10kg
    });
  });

  describe('Factory & Registry Integration', () => {
    
    test('should create and validate all tools via factory', () => {
      const validation = AgentToolsFactory.validateTools(tools);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should generate usage report', () => {
      const mockRegistry = {
        getRegistryStats: jest.fn(() => ({
          total_tools: 5,
          category_counts: { agricultural: 4, utility: 1 },
          total_usage: 0,
          cache_size: 0
        }))
      };

      const report = AgentToolsFactory.generateUsageReport(mockRegistry);
      
      expect(report.total_tools).toBe(5);
      expect(report.categories.agricultural).toBe(4);
      expect(report.categories.utility).toBe(1);
      expect(report.recommendations).toBeDefined();
    });
  });
});

