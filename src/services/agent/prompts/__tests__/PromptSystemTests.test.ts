import { SupabaseClient } from '@supabase/supabase-js';
import { PromptTestingService, TestCase } from '../PromptTestingService';
import { PromptTemplateEngine } from '../PromptTemplateEngine';
import { AdvancedPromptManager } from '../AdvancedPromptManager';
import { 
  THOMAS_AGENT_SYSTEM_PROMPT,
  TOOL_SELECTION_PROMPT,
  INTENT_CLASSIFICATION_PROMPT,
  PromptTemplateFactory
} from '../templates/ThomasAgentPrompts';
import { AgentContext, ChatPrompt } from '../../types/AgentTypes';

/**
 * Tests système complets des prompts Thomas Agent
 * Validation qualité, performance et cohérence
 */
describe('Thomas Agent Prompt System Testing', () => {
  let testingService: PromptTestingService;
  let templateEngine: PromptTemplateEngine;
  let promptManager: AdvancedPromptManager;
  let mockSupabase: any;
  let testContext: AgentContext;

  beforeEach(() => {
    // Mock Supabase pour tests
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ 
              data: createMockPrompt('thomas_agent_system'),
              error: null 
            })),
            order: jest.fn(() => ({ 
              limit: jest.fn(() => ({ data: [], error: null }))
            }))
          }))
        })),
        insert: jest.fn(() => ({ error: null })),
        update: jest.fn(() => ({ 
          eq: jest.fn(() => ({ error: null }))
        }))
      }))
    };

    // Services de test
    templateEngine = new PromptTemplateEngine();
    testingService = new PromptTestingService(mockSupabase, templateEngine, 'test-openai-key');
    promptManager = new AdvancedPromptManager(mockSupabase, 'test-openai-key');

    // Context de test réaliste
    testContext = createRealisticTestContext();
  });

  describe('🧪 Prompt Template Validation', () => {
    
    test('should validate all default templates structure', () => {
      const templates = [
        THOMAS_AGENT_SYSTEM_PROMPT,
        TOOL_SELECTION_PROMPT,
        INTENT_CLASSIFICATION_PROMPT
      ];

      templates.forEach(template => {
        const validation = PromptTemplateFactory.validateTemplate(template);
        
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        
        // Validations spécifiques
        expect(template.name).toBeDefined();
        expect(template.version).toMatch(/^\d+\.\d+$/);
        expect(template.template.length).toBeGreaterThan(100);
        expect(template.variables).toBeDefined();
        
        console.log(`✅ Template ${template.name} v${template.version}: Valid`);
        
        if (validation.warnings.length > 0) {
          console.warn(`⚠️ ${template.name} warnings:`, validation.warnings);
        }
      });
    });

    test('should validate template variables are used', () => {
      const systemTemplate = THOMAS_AGENT_SYSTEM_PROMPT;
      
      // Vérifier que toutes les variables déclarées sont utilisées
      systemTemplate.variables.forEach(variable => {
        expect(systemTemplate.template).toContain(`{{${variable}}}`);
      });

      // Variables critiques
      expect(systemTemplate.template).toContain('{{farm_name}}');
      expect(systemTemplate.template).toContain('{{farm_context}}');
      expect(systemTemplate.template).toContain('{{available_tools}}');
      expect(systemTemplate.template).toContain('{{few_shot_examples}}');
    });

    test('should validate template conditions are used', () => {
      const systemTemplate = THOMAS_AGENT_SYSTEM_PROMPT;
      
      // Vérifier conditions déclarées
      systemTemplate.conditions.forEach(condition => {
        expect(systemTemplate.template).toContain(`{{#if ${condition}}}`);
        expect(systemTemplate.template).toContain('{{/if}}');
      });

      // Condition critique pour nouveaux utilisateurs
      expect(systemTemplate.template).toContain('{{#if first_time_user}}');
    });
  });

  describe('🎯 Template Engine Rendering', () => {
    
    test('should render system prompt with context', () => {
      const rendered = templateEngine.render(
        THOMAS_AGENT_SYSTEM_PROMPT.template,
        testContext
      );

      // Vérifier remplacement variables
      expect(rendered).toContain('Ferme de Test'); // farm_name
      expect(rendered).toContain('Testeur Thomas'); // user_name  
      expect(rendered).toContain('Serre 1'); // farm_context parcelles
      expect(rendered).toContain('create_observation'); // available_tools
      
      // Ne doit plus contenir de variables non remplacées  
      expect(rendered).not.toMatch(/\{\{[^}]+\}\}/);
      
      // Longueur raisonnable (template expanded)
      expect(rendered.length).toBeGreaterThan(THOMAS_AGENT_SYSTEM_PROMPT.template.length);
      
      console.log(`📝 Rendered prompt length: ${rendered.length} chars`);
    });

    test('should handle conditional rendering', () => {
      // Test avec nouveau utilisateur (pas de parcelles)
      const newUserContext = {
        ...testContext,
        farm: {
          ...testContext.farm,
          plots: [], // Pas de parcelles = nouveau utilisateur
          materials: [],
          conversions: []
        }
      };

      const templateWithCondition = `
      Normal content here.
      {{#if first_time_user}}
      Bienvenue, nouvel utilisateur !
      {{/if}}
      {{#if has_plots}}
      Vous avez des parcelles configurées.
      {{/if}}
      `;

      const rendered = templateEngine.render(templateWithCondition, newUserContext);
      
      expect(rendered).toContain('Bienvenue, nouvel utilisateur !');
      expect(rendered).not.toContain('Vous avez des parcelles');
    });

    test('should apply helper functions', () => {
      const templateWithHelpers = `
      Date formatée: {{formatDate "2024-11-24"}}
      Nombre formaté: {{formatNumber "1500"}}  
      Liste jointe: {{joinList '["pommes", "poires", "oranges"]'}}
      `;

      const rendered = templateEngine.render(templateWithHelpers, testContext);
      
      expect(rendered).toContain('dimanche 24 novembre'); // formatDate
      expect(rendered).toContain('1 500'); // formatNumber français
      expect(rendered).toContain('pommes, poires et oranges'); // joinList français
      
      console.log('🔧 Helper functions rendered:', rendered);
    });
  });

  describe('🧪 Prompt Quality Testing', () => {
    
    test('should test system prompt quality', async () => {
      const systemPrompt = PromptTemplateFactory.templateToChatPrompt(THOMAS_AGENT_SYSTEM_PROMPT);
      const testCases = createSystemPromptTestCases();
      
      const results = await testingService.runTestSuite(systemPrompt as ChatPrompt, testCases);
      
      expect(results.prompt_name).toBe('thomas_agent_system');
      expect(results.total_tests).toBe(testCases.length);
      expect(results.success_rate).toBeGreaterThan(0.6); // Au moins 60% succès avec simulation
      
      console.log(`📊 System prompt test results:`, {
        success_rate: `${(results.success_rate * 100).toFixed(1)}%`,
        avg_score: results.average_score.toFixed(2),
        avg_execution_time: `${results.average_execution_time_ms.toFixed(0)}ms`,
        passed_tests: `${results.passed_tests}/${results.total_tests}`
      });

      // Analyser échecs pour amélioration
      const failedTests = results.results.filter(r => !r.passed);
      if (failedTests.length > 0) {
        console.log('❌ Failed tests analysis:', 
          failedTests.map(t => ({ name: t.test_case_name, score: t.score }))
        );
      }
    });

    test('should test tool selection prompt accuracy', async () => {
      const toolSelectionPrompt = PromptTemplateFactory.templateToChatPrompt(TOOL_SELECTION_PROMPT);
      const testCases = createToolSelectionTestCases();
      
      const results = await testingService.runTestSuite(toolSelectionPrompt as ChatPrompt, testCases);
      
      expect(results.success_rate).toBeGreaterThan(0.7); // 70% pour JSON structuré
      
      // Vérifier que les tests JSON passent
      const jsonTests = results.results.filter(r => r.test_case_name.includes('json'));
      if (jsonTests.length > 0) {
        const jsonSuccessRate = jsonTests.filter(t => t.passed).length / jsonTests.length;
        console.log(`🔧 JSON format success rate: ${(jsonSuccessRate * 100).toFixed(1)}%`);
      }
    });

    test('should test intent classification precision', async () => {
      const intentPrompt = PromptTemplateFactory.templateToChatPrompt(INTENT_CLASSIFICATION_PROMPT);
      const testCases = createIntentClassificationTestCases();
      
      const results = await testingService.runTestSuite(intentPrompt as ChatPrompt, testCases);
      
      expect(results.success_rate).toBeGreaterThan(0.8); // 80% pour classification
      
      console.log(`🎯 Intent classification results:`, {
        success_rate: `${(results.success_rate * 100).toFixed(1)}%`,
        avg_confidence: results.results.reduce((sum, r) => sum + (r.score || 0), 0) / results.results.length
      });
    });
  });

  describe('⚡ Prompt Performance Testing', () => {
    
    test('should benchmark prompt rendering performance', async () => {
      const systemPrompt = PromptTemplateFactory.templateToChatPrompt(THOMAS_AGENT_SYSTEM_PROMPT);
      
      // Benchmark avec 10 requêtes
      const benchmark = await testingService.benchmarkPrompt(systemPrompt as ChatPrompt, 10);
      
      expect(benchmark.prompt_name).toBe('thomas_agent_system');
      expect(benchmark.test_load).toBe(10);
      expect(benchmark.avg_response_time_ms).toBeLessThan(2000); // < 2s moyen
      expect(benchmark.performance_grade).toBeOneOf(['A', 'B', 'C', 'D', 'F']);
      
      console.log(`⚡ Performance benchmark:`, {
        avg_response: `${benchmark.avg_response_time_ms.toFixed(0)}ms`,
        grade: benchmark.performance_grade,
        requests_per_second: benchmark.requests_per_second.toFixed(1)
      });
    });

    test('should test template rendering speed', async () => {
      const iterations = 20;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        const rendered = templateEngine.render(
          THOMAS_AGENT_SYSTEM_PROMPT.template,
          testContext
        );
        
        const renderTime = Date.now() - startTime;
        times.push(renderTime);
        
        expect(rendered).toBeDefined();
        expect(rendered.length).toBeGreaterThan(500);
      }
      
      const avgRenderTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      const maxRenderTime = Math.max(...times);
      
      expect(avgRenderTime).toBeLessThan(100); // < 100ms moyen
      expect(maxRenderTime).toBeLessThan(500); // < 500ms max
      
      console.log(`🚀 Template rendering performance:`, {
        avg_time: `${avgRenderTime.toFixed(1)}ms`,
        max_time: `${maxRenderTime}ms`,
        iterations
      });
    });
  });

  describe('🔍 Prompt Content Analysis', () => {
    
    test('should analyze prompt token efficiency', () => {
      const systemTemplate = THOMAS_AGENT_SYSTEM_PROMPT.template;
      
      // Estimation tokens (4 chars ≈ 1 token)
      const estimatedTokens = Math.ceil(systemTemplate.length / 4);
      
      expect(estimatedTokens).toBeLessThan(2000); // Reasonable pour système
      expect(estimatedTokens).toBeGreaterThan(200); // Assez détaillé
      
      console.log(`📊 Token analysis:`, {
        template_length: systemTemplate.length,
        estimated_tokens: estimatedTokens,
        efficiency: `${((2000 - estimatedTokens) / 2000 * 100).toFixed(1)}% marge disponible`
      });
    });

    test('should validate French agricultural vocabulary', () => {
      const systemTemplate = THOMAS_AGENT_SYSTEM_PROMPT.template;
      
      // Vocabulaire agricole français attendu
      const expectedTerms = [
        'agricole', 'parcelle', 'serre', 'culture', 'plantation', 
        'récolte', 'observation', 'tâche', 'matériel', 'traitement'
      ];
      
      expectedTerms.forEach(term => {
        expect(systemTemplate.toLowerCase()).toContain(term);
      });

      // Expressions françaises naturelles
      const frenchExpressions = [
        'j\'ai', 'vous avez', 'votre', 'vos', 'français'
      ];
      
      const foundExpressions = frenchExpressions.filter(expr => 
        systemTemplate.toLowerCase().includes(expr)
      );
      
      expect(foundExpressions.length).toBeGreaterThan(3); // Au moins 3 expressions françaises
      
      console.log(`🇫🇷 French vocabulary check: ${foundExpressions.length}/5 expressions found`);
    });

    test('should validate instruction clarity and completeness', () => {
      const systemTemplate = THOMAS_AGENT_SYSTEM_PROMPT.template;
      
      // Instructions critiques attendues
      const criticalInstructions = [
        'instructions principales',
        'types d\'actions',
        'gestion des erreurs', 
        'exemples d\'utilisation',
        'tools disponibles'
      ];
      
      criticalInstructions.forEach(instruction => {
        expect(systemTemplate.toLowerCase()).toContain(instruction.toLowerCase());
      });

      // Structure sections avec headers
      const headerCount = (systemTemplate.match(/##\s+[^#]/g) || []).length;
      expect(headerCount).toBeGreaterThan(3); // Au moins 4 sections principales
      
      console.log(`📋 Instruction structure: ${headerCount} main sections found`);
    });
  });

  describe('🎯 Real-World Scenario Testing', () => {
    
    test('should handle typical farmer messages', async () => {
      const realWorldMessages = [
        {
          message: "j'ai observé des pucerons sur mes tomates dans la serre 1",
          expected_intent: 'observation_creation',
          expected_tools: ['create_observation']
        },
        {
          message: "j'ai récolté 3 caisses de courgettes ce matin avec le tracteur",
          expected_intent: 'harvest',
          expected_tools: ['create_harvest']
        },
        {
          message: "je vais faire un traitement demain matin contre les pucerons",
          expected_intent: 'task_planned', 
          expected_tools: ['create_task_planned']
        },
        {
          message: "comment je peux ajouter une nouvelle parcelle ?",
          expected_intent: 'help',
          expected_tools: ['help']
        }
      ];

      for (const scenario of realWorldMessages) {
        console.log(`\n🌾 Testing scenario: "${scenario.message.substring(0, 50)}..."`);
        
        // Test intent classification
        const intentTestCase: TestCase = {
          name: `intent_${scenario.expected_intent}`,
          input: scenario.message,
          expected_output: `{"intent": "${scenario.expected_intent}"}`,
          context: testContext,
          evaluation_criteria: {
            required_keywords: { 
              keywords: [scenario.expected_intent], 
              weight: 1.0 
            }
          },
          pass_threshold: 0.7
        };

        const intentPrompt = PromptTemplateFactory.templateToChatPrompt(INTENT_CLASSIFICATION_PROMPT);
        const intentResults = await testingService.runTestSuite(intentPrompt as ChatPrompt, [intentTestCase]);
        
        console.log(`🎯 Intent "${scenario.expected_intent}": ${intentResults.success_rate >= 0.7 ? '✅' : '❌'} (${(intentResults.success_rate * 100).toFixed(1)}%)`);

        // Test tool selection
        const toolTestCase: TestCase = {
          name: `tool_${scenario.expected_tools[0]}`,
          input: scenario.message,
          expected_output: `{"tools_to_use": [{"tool_name": "${scenario.expected_tools[0]}"}]}`,
          context: testContext,
          evaluation_criteria: {
            required_keywords: { 
              keywords: scenario.expected_tools, 
              weight: 1.0 
            }
          },
          pass_threshold: 0.6
        };

        const toolPrompt = PromptTemplateFactory.templateToChatPrompt(TOOL_SELECTION_PROMPT);
        const toolResults = await testingService.runTestSuite(toolPrompt as ChatPrompt, [toolTestCase]);
        
        console.log(`🛠️ Tool "${scenario.expected_tools[0]}": ${toolResults.success_rate >= 0.6 ? '✅' : '❌'} (${(toolResults.success_rate * 100).toFixed(1)}%)`);
      }
    });

    test('should handle edge cases gracefully', async () => {
      const edgeCases = [
        { message: "", description: "Empty message" },
        { message: "bonjour", description: "Greeting only" },
        { message: "xyz123 qwerty", description: "Gibberish" },
        { message: "j'ai fait des trucs dans le jardin", description: "Vague action" },
        { message: "URGENT URGENT URGENT", description: "All caps urgent" }
      ];

      for (const edgeCase of edgeCases) {
        console.log(`\n🔍 Edge case: ${edgeCase.description}`);
        
        const testCase: TestCase = {
          name: `edge_${edgeCase.description.replace(/\s+/g, '_')}`,
          input: edgeCase.message,
          expected_output: 'help or clarification requested',
          context: testContext,
          evaluation_criteria: {
            language_style: { weight: 1.0 }
          },
          pass_threshold: 0.4 // Plus tolérant pour edge cases
        };

        const systemPrompt = PromptTemplateFactory.templateToChatPrompt(THOMAS_AGENT_SYSTEM_PROMPT);
        const results = await testingService.runTestSuite(systemPrompt as ChatPrompt, [testCase]);
        
        // Edge cases doivent au moins générer réponse cohérente
        expect(results.results[0].actual_output).toBeDefined();
        expect(results.results[0].actual_output.length).toBeGreaterThan(10);
        
        console.log(`🛡️ ${edgeCase.description}: ${results.success_rate >= 0.4 ? '✅' : '⚠️'} Response provided`);
      }
    });
  });

  describe('📊 Prompt Optimization Analysis', () => {
    
    test('should identify optimization opportunities', async () => {
      const systemPrompt = PromptTemplateFactory.templateToChatPrompt(THOMAS_AGENT_SYSTEM_PROMPT);
      
      // Analyser longueur et complexité
      const templateLength = systemPrompt.content.length;
      const sectionCount = (systemPrompt.content.match(/##\s/g) || []).length;
      const exampleCount = (systemPrompt.content.match(/exemple/gi) || []).length;
      
      const analysis = {
        template_length: templateLength,
        sections: sectionCount,
        examples: exampleCount,
        estimated_tokens: Math.ceil(templateLength / 4),
        complexity_score: this.calculateComplexityScore(systemPrompt.content)
      };
      
      console.log('🔍 Prompt analysis:', analysis);
      
      // Recommandations d'optimisation
      const recommendations: string[] = [];
      
      if (analysis.estimated_tokens > 1500) {
        recommendations.push('Considérer compaction pour efficacité tokens');
      }
      
      if (analysis.sections > 8) {
        recommendations.push('Beaucoup de sections - vérifier nécessité');
      }
      
      if (analysis.examples < 3) {
        recommendations.push('Ajouter plus d\'exemples pour précision');
      }
      
      console.log('💡 Optimization recommendations:', recommendations);
      
      expect(analysis.estimated_tokens).toBeLessThan(2000); // Limite raisonnable
    });

    test('should compare template versions if multiple exist', async () => {
      // Simulation comparaison versions
      const v1_template = "Version simple: Tu es Thomas, aide l'agriculteur.";
      const v2_template = THOMAS_AGENT_SYSTEM_PROMPT.template;
      
      const v1_analysis = {
        length: v1_template.length,
        tokens: Math.ceil(v1_template.length / 4),
        sections: (v1_template.match(/##/g) || []).length
      };
      
      const v2_analysis = {
        length: v2_template.length,
        tokens: Math.ceil(v2_template.length / 4),
        sections: (v2_template.match(/##/g) || []).length
      };
      
      console.log('📈 Version comparison:', {
        v1: v1_analysis,
        v2: v2_analysis,
        improvement: {
          detail_increase: `${((v2_analysis.length / v1_analysis.length - 1) * 100).toFixed(0)}%`,
          section_increase: v2_analysis.sections - v1_analysis.sections,
          token_efficiency: v2_analysis.tokens < 2000 ? 'Good' : 'Needs optimization'
        }
      });
      
      // V2 devrait être plus détaillé mais rester efficace
      expect(v2_analysis.length).toBeGreaterThan(v1_analysis.length);
      expect(v2_analysis.tokens).toBeLessThan(2000);
    });
  });

  describe('🔄 A/B Testing Simulation', () => {
    
    test('should simulate A/B test between prompt versions', async () => {
      // Créer deux versions légèrement différentes pour test
      const versionA = PromptTemplateFactory.templateToChatPrompt(THOMAS_AGENT_SYSTEM_PROMPT);
      const versionB = {
        ...versionA,
        content: versionA.content + '\n\n## Instructions Supplémentaires\nSois encore plus précis dans tes réponses.',
        version: '2.1'
      };

      const testCases = createSystemPromptTestCases();
      
      // Tests parallèles  
      const [resultsA, resultsB] = await Promise.all([
        testingService.runTestSuite(versionA as ChatPrompt, testCases),
        testingService.runTestSuite(versionB as ChatPrompt, testCases)
      ]);
      
      // Comparaison
      const comparison = {
        version_a: { success_rate: resultsA.success_rate, avg_score: resultsA.average_score },
        version_b: { success_rate: resultsB.success_rate, avg_score: resultsB.average_score },
        delta: {
          success_rate: resultsB.success_rate - resultsA.success_rate,
          avg_score: resultsB.average_score - resultsA.average_score
        }
      };
      
      const winner = comparison.delta.success_rate > 0 ? 'Version B' : 'Version A';
      const significant = Math.abs(comparison.delta.success_rate) > 0.1;
      
      console.log(`🥇 A/B Test Results:`, {
        winner,
        significant_difference: significant,
        delta_success: `${(comparison.delta.success_rate * 100).toFixed(1)}%`,
        delta_score: comparison.delta.avg_score.toFixed(3),
        recommendation: significant 
          ? `Déployer ${winner}`
          : 'Différence non significative - garder version actuelle'
      });
    });
  });
});

// Helper function pour calculer score complexité
function calculateComplexityScore(content: string): number {
  const factors = {
    length: Math.min(content.length / 5000, 1) * 0.3,
    sections: Math.min((content.match(/##/g) || []).length / 10, 1) * 0.2,
    variables: Math.min((content.match(/\{\{/g) || []).length / 20, 1) * 0.3,
    conditions: Math.min((content.match(/\{\{#if/g) || []).length / 5, 1) * 0.2
  };
  
  return factors.length + factors.sections + factors.variables + factors.conditions;
}

// ============================================================================
// HELPERS POUR TESTS
// ============================================================================

/**
 * Création contexte de test réaliste
 */
function createRealisticTestContext(): AgentContext {
  return {
    user: {
      id: 'test-user-123',
      name: 'Testeur Thomas',
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
          llm_keywords: ['serre', 'tunnel', 'abri'],
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
        },
        {
          id: 2,
          name: 'Tunnel Nord',
          type: 'tunnel',
          aliases: ['tunnel_nord'],
          llm_keywords: ['tunnel'],
          surface_units: [],
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
          llm_keywords: ['tracteur', 'tractor', 'john deere'],
          is_active: true
        }
      ],
      conversions: [
        {
          id: 'conv-1',
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
    session_id: 'test-session-456',
    analysis_id: 'test-analysis-789',
    availableTools: [
      'create_observation',
      'create_task_done', 
      'create_task_planned',
      'create_harvest',
      'manage_plot',
      'help'
    ]
  };
}

/**
 * Cas de test pour prompt système
 */
function createSystemPromptTestCases(): TestCase[] {
  return [
    {
      name: 'observation_simple',
      input: "j'ai observé des pucerons sur mes tomates serre 1",
      expected_output: "Observation créée pour pucerons sur tomates dans Serre 1",
      context: createRealisticTestContext(),
      evaluation_criteria: {
        content_similarity: { weight: 0.4 },
        required_keywords: { 
          keywords: ['observation', 'pucerons', 'tomates', 'serre'], 
          weight: 0.4 
        },
        language_style: { weight: 0.2 }
      },
      pass_threshold: 0.75
    },
    {
      name: 'harvest_with_conversion',
      input: "j'ai récolté 3 caisses de courgettes",
      expected_output: "Récolte enregistrée: 3 caisses (15 kg) de courgettes",
      context: createRealisticTestContext(),
      evaluation_criteria: {
        content_similarity: { weight: 0.3 },
        required_keywords: { 
          keywords: ['récolté', 'caisses', 'courgettes', 'kg'], 
          weight: 0.5 
        },
        language_style: { weight: 0.2 }
      },
      pass_threshold: 0.7
    },
    {
      name: 'help_request',
      input: "comment créer une parcelle ?",
      expected_output: "Guide pour créer parcelle avec navigation",
      context: createRealisticTestContext(),
      evaluation_criteria: {
        required_keywords: { 
          keywords: ['parcelle', 'créer', 'profil', 'configuration'], 
          weight: 0.6 
        },
        language_style: { weight: 0.4 }
      },
      pass_threshold: 0.8
    }
  ];
}

/**
 * Cas de test pour sélection d'outils
 */
function createToolSelectionTestCases(): TestCase[] {
  return [
    {
      name: 'json_format_observation',
      input: "j'ai observé des pucerons",
      expected_output: '{"tools_to_use": [{"tool_name": "create_observation"}]}',
      context: createRealisticTestContext(),
      evaluation_criteria: {
        response_structure: { expected_format: 'json', weight: 0.6 },
        required_keywords: { keywords: ['create_observation'], weight: 0.4 }
      },
      pass_threshold: 0.8
    }
  ];
}

/**
 * Cas de test pour classification d'intention
 */
function createIntentClassificationTestCases(): TestCase[] {
  return [
    {
      name: 'clear_observation_intent',
      input: "j'ai remarqué des taches sur mes feuilles",
      expected_output: '{"intent": "observation_creation", "confidence": 0.8}',
      context: createRealisticTestContext(),
      evaluation_criteria: {
        response_structure: { expected_format: 'json', weight: 0.5 },
        required_keywords: { keywords: ['observation_creation'], weight: 0.5 }
      },
      pass_threshold: 0.7
    }
  ];
}

/**
 * Mock prompt pour tests
 */
function createMockPrompt(name: string): ChatPrompt {
  return {
    id: `mock-${name}`,
    name,
    content: `Tu es Thomas, assistant agricole. Template de test pour ${name}.`,
    examples: [],
    version: '2.0',
    is_active: true,
    metadata: { category: 'test' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
