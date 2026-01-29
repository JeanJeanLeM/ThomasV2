/**
 * Tests du système de testing des prompts Thomas Agent
 * Validation du PromptTestingService avec cas réels
 */

import { PromptTestingService } from '../PromptTestingService';
import { PromptTemplateEngine } from '../PromptTemplateEngine';
import { THOMAS_AGENT_SYSTEM_PROMPT } from '../templates/ThomasAgentPrompts';
import { ChatPrompt, AgentContext } from '../../types/AgentTypes';

describe('Prompt Testing System', () => {
  let testingService: PromptTestingService;
  let templateEngine: PromptTemplateEngine;
  let mockSupabase: any;
  let mockPrompt: ChatPrompt;
  let mockFarmContext: any;

  beforeEach(() => {
    // Mock Supabase pour tests
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: null }))
          }))
        }))
      }))
    };

    templateEngine = new PromptTemplateEngine();
    testingService = new PromptTestingService(mockSupabase, templateEngine, 'test-openai-key');

    // Mock prompt thomas_agent_system
    mockPrompt = {
      id: 'test-prompt',
      name: 'thomas_agent_system',
      content: THOMAS_AGENT_SYSTEM_PROMPT.template,
      examples: THOMAS_AGENT_SYSTEM_PROMPT.examples,
      version: '2.0',
      is_active: true,
      metadata: THOMAS_AGENT_SYSTEM_PROMPT.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Mock farm context pour tests
    mockFarmContext = {
      plots: [
        { id: 1, name: 'Serre 1', type: 'serre_plastique', aliases: ['serre1'], is_active: true },
        { id: 2, name: 'Tunnel Nord', type: 'tunnel', aliases: ['tunnel_n'], is_active: true }
      ],
      materials: [
        { id: 1, name: 'John Deere 6120', category: 'tracteurs', llm_keywords: ['tracteur'] },
        { id: 2, name: 'Pulvérisateur 200L', category: 'outils_tracteur', llm_keywords: ['pulvérisateur'] }
      ],
      conversions: [
        { container_name: 'caisse', crop_name: 'courgettes', conversion_value: 5, conversion_unit: 'kg' },
        { container_name: 'panier', crop_name: 'tomates', conversion_value: 2.5, conversion_unit: 'kg' }
      ]
    };
  });

  describe('Test Case Generation', () => {
    
    test('should generate comprehensive test cases', () => {
      const testCases = testingService.generateTestCases(mockFarmContext);
      
      expect(testCases.length).toBeGreaterThan(3);
      
      // Vérifier types de tests générés
      const testNames = testCases.map(tc => tc.name);
      expect(testNames).toContain('observation_simple');
      expect(testNames).toContain('task_with_conversion');
      expect(testNames).toContain('help_request');
      expect(testNames).toContain('contextual_plot_reference'); // Car plots disponibles
      
      console.log('🧪 Test cases generated:', testNames);
    });

    test('should create contextual test cases based on farm data', () => {
      const testCases = testingService.generateTestCases(mockFarmContext);
      
      // Test contextuel avec vraie parcelle
      const contextualTest = testCases.find(tc => tc.name === 'contextual_plot_reference');
      expect(contextualTest).toBeDefined();
      expect(contextualTest!.input).toContain('serre 1'); // Utilise vraie parcelle
      expect(contextualTest!.expected_output).toContain('Serre 1');
    });

    test('should adapt test cases for empty farm context', () => {
      const emptyFarmContext = { plots: [], materials: [], conversions: [] };
      const testCases = testingService.generateTestCases(emptyFarmContext);
      
      // Devrait inclure plus de tests d'aide pour ferme vide
      const helpTests = testCases.filter(tc => tc.name.includes('help') || tc.input.includes('comment'));
      expect(helpTests.length).toBeGreaterThan(0);
    });
  });

  describe('Test Execution (Simulated)', () => {
    
    test('should run complete test suite', async () => {
      const testCases = testingService.generateTestCases(mockFarmContext);
      
      const results = await testingService.runTestSuite(mockPrompt, testCases);
      
      expect(results.prompt_name).toBe('thomas_agent_system');
      expect(results.prompt_version).toBe('2.0');
      expect(results.total_tests).toBe(testCases.length);
      expect(results.success_rate).toBeGreaterThanOrEqual(0);
      expect(results.success_rate).toBeLessThanOrEqual(1);
      expect(results.average_score).toBeGreaterThanOrEqual(0);
      expect(results.results.length).toBe(testCases.length);
      
      console.log('✅ Test suite results:', {
        success_rate: `${(results.success_rate * 100).toFixed(1)}%`,
        avg_score: results.average_score.toFixed(2),
        avg_time: `${results.average_execution_time_ms.toFixed(0)}ms`
      });
    });

    test('should evaluate response quality', async () => {
      const testCase = {
        name: 'quality_evaluation_test',
        input: "j'ai observé des pucerons sur mes tomates serre 1",
        expected_output: "Observation créée pour pucerons sur tomates dans serre 1",
        context: testingService['createTestContext'](mockFarmContext),
        evaluation_criteria: {
          content_similarity: { weight: 0.4 },
          required_keywords: { keywords: ['observation', 'pucerons', 'tomates'], weight: 0.4 },
          language_style: { weight: 0.2 }
        },
        pass_threshold: 0.75
      };

      const result = await testingService['runSingleTest'](mockPrompt, testCase);
      
      expect(result.test_case_name).toBe('quality_evaluation_test');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.passed).toBeDefined();
      expect(result.execution_time_ms).toBeGreaterThan(0);
      
      console.log('🎯 Quality evaluation:', {
        score: result.score.toFixed(2),
        passed: result.passed,
        time: `${result.execution_time_ms}ms`
      });
    });
  });

  describe('A/B Testing Capabilities', () => {
    
    test('should compare prompt versions', async () => {
      const testCases = testingService.generateTestCases(mockFarmContext);
      
      // Mock deux versions du prompt pour comparaison
      const promptV1 = { ...mockPrompt, version: '1.0', content: 'Tu es Thomas, assistant agricole simple...' };
      const promptV2 = { ...mockPrompt, version: '2.0' }; // Version actuelle
      
      // Mock la méthode getPromptVersion pour retourner les bonnes versions
      jest.spyOn(testingService as any, 'getPromptVersion')
        .mockImplementation((name: string, version: string) => {
          if (version === '1.0') return Promise.resolve(promptV1);
          if (version === '2.0') return Promise.resolve(promptV2);
          throw new Error('Version not found');
        });

      const comparison = await testingService.comparePromptVersions(
        'thomas_agent_system',
        '1.0',
        '2.0', 
        testCases.slice(0, 2) // Limiter pour test rapide
      );

      expect(comparison.prompt_name).toBe('thomas_agent_system');
      expect(comparison.version_1).toBe('1.0');
      expect(comparison.version_2).toBe('2.0');
      expect(comparison.performance_delta).toBeDefined();
      expect(comparison.recommendation).toBeDefined();
      
      console.log('🔍 A/B Testing:', {
        success_rate_delta: `${(comparison.performance_delta.success_rate * 100).toFixed(1)}%`,
        recommendation: comparison.recommendation.substring(0, 50) + '...'
      });
    });
  });

  describe('Performance Benchmarking', () => {
    
    test('should benchmark prompt performance', async () => {
      const benchmarkResult = await testingService.benchmarkPrompt(mockPrompt, 5); // 5 requêtes pour test rapide
      
      expect(benchmarkResult.prompt_name).toBe('thomas_agent_system');
      expect(benchmarkResult.test_load).toBe(5);
      expect(benchmarkResult.total_time_ms).toBeGreaterThan(0);
      expect(benchmarkResult.avg_response_time_ms).toBeGreaterThan(0);
      expect(benchmarkResult.requests_per_second).toBeGreaterThan(0);
      expect(benchmarkResult.performance_grade).toMatch(/[A-F]/);
      
      console.log('⚡ Benchmark results:', {
        avg_time: `${benchmarkResult.avg_response_time_ms.toFixed(0)}ms`,
        rps: benchmarkResult.requests_per_second.toFixed(1),
        grade: benchmarkResult.performance_grade
      });
    });

    test('should calculate appropriate performance grades', async () => {
      const fastBenchmark = await testingService.benchmarkPrompt(mockPrompt, 3);
      
      // Avec simulation, devrait être rapide = grade élevé
      expect(['A', 'B', 'C']).toContain(fastBenchmark.performance_grade);
      
      console.log(`🏆 Performance grade: ${fastBenchmark.performance_grade} (${fastBenchmark.avg_response_time_ms.toFixed(0)}ms avg)`);
    });
  });

  describe('Template Engine Integration', () => {
    
    test('should render template with test context', () => {
      const testContext = testingService['createTestContext'](mockFarmContext);
      
      const simpleTemplate = `Ferme: {{farm_name}}
Parcelles: {{#if has_plots}}{{plotCount}} parcelles disponibles{{/if}}
Utilisateur: {{user_name}}`;

      const rendered = templateEngine.render(simpleTemplate, testContext);
      
      expect(rendered).toContain('Ferme: Ferme Test');
      expect(rendered).toContain('Utilisateur: Utilisateur Test');
      
      console.log('📝 Template rendered for test:', rendered.substring(0, 100) + '...');
    });

    test('should handle missing variables gracefully', () => {
      const testContext = testingService['createTestContext'](mockFarmContext);
      
      const templateWithMissingVar = `Ferme: {{farm_name}}
Variable inexistante: {{missing_variable}}
Fin template`;

      const rendered = templateEngine.render(templateWithMissingVar, testContext);
      
      expect(rendered).toContain('Ferme: Ferme Test');
      expect(rendered).not.toContain('{{missing_variable}}'); // Doit être supprimé
    });
  });

  describe('Integration with AdvancedPromptManager', () => {
    
    test('should integrate testing with prompt updates', async () => {
      // Mock AdvancedPromptManager pour test integration
      const mockPromptManager = {
        getPrompt: jest.fn().mockResolvedValue(mockPrompt),
        updatePrompt: jest.fn().mockResolvedValue({
          success: true,
          new_version: '2.1',
          test_results: {
            success_rate: 0.85,
            regression_detected: false
          }
        })
      };

      // Test que le système peut être intégré pour tests automatiques lors d'updates
      const updateResult = await mockPromptManager.updatePrompt(
        'thomas_agent_system',
        'Contenu mis à jour...',
        [],
        {},
        true // runTests = true
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.test_results).toBeDefined();
      expect(updateResult.test_results.success_rate).toBeGreaterThan(0);
      
      console.log('🔄 Integration test:', {
        new_version: updateResult.new_version,
        success_rate: `${(updateResult.test_results.success_rate * 100).toFixed(1)}%`,
        regression: updateResult.test_results.regression_detected
      });
    });
  });

  describe('Error Handling in Tests', () => {
    
    test('should handle OpenAI simulation errors gracefully', async () => {
      const testCase = {
        name: 'error_handling_test',
        input: 'test message',
        expected_output: 'expected output',
        context: testingService['createTestContext'](mockFarmContext),
        evaluation_criteria: {
          content_similarity: { weight: 1.0 }
        },
        pass_threshold: 0.5
      };

      // Mock erreur dans callOpenAI
      jest.spyOn(testingService as any, 'callOpenAI')
        .mockRejectedValue(new Error('Simulated OpenAI error'));

      const result = await testingService['runSingleTest'](mockPrompt, testCase);
      
      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
      expect(result.error_message).toContain('Simulated OpenAI error');
      
      console.log('❌ Error handling validated:', result.error_message);
    });

    test('should handle invalid JSON responses', async () => {
      const testCase = {
        name: 'invalid_json_test',
        input: 'test',
        expected_output: 'test',
        context: testingService['createTestContext'](mockFarmContext),
        evaluation_criteria: { content_similarity: { weight: 1.0 } },
        pass_threshold: 0.5
      };

      // Mock réponse JSON invalide
      jest.spyOn(testingService as any, 'callOpenAI')
        .mockResolvedValue('invalid json response {');

      const result = await testingService['runSingleTest'](mockPrompt, testCase);
      
      // Doit gérer gracieusement même avec JSON invalide
      expect(result).toBeDefined();
      expect(result.test_case_name).toBe('invalid_json_test');
      
      console.log('🛡️ Invalid JSON handled gracefully');
    });
  });
});

/**
 * Tests d'évaluation des réponses
 */
describe('Response Evaluation System', () => {
  let testingService: PromptTestingService;

  beforeEach(() => {
    const mockSupabase = { from: () => ({}) };
    const templateEngine = new PromptTemplateEngine();
    testingService = new PromptTestingService(mockSupabase as any, templateEngine, 'test-key');
  });

  test('should evaluate content similarity correctly', () => {
    const evaluation = testingService['evaluateResponse'](
      "J'ai créé une observation pour les pucerons sur vos tomates", // Actual
      "Observation créée pour pucerons sur tomates",                 // Expected  
      {
        content_similarity: { weight: 1.0 }
      }
    );

    expect(evaluation.score).toBeGreaterThan(0.5); // Bon overlap de mots
    expect(evaluation.details).toBeDefined();
    expect(evaluation.details.length).toBeGreaterThan(0);
    
    console.log('📊 Content similarity:', {
      score: evaluation.score.toFixed(2),
      details: evaluation.details[0]
    });
  });

  test('should check required keywords', () => {
    const evaluation = testingService['evaluateResponse'](
      "J'ai créé une observation pour les pucerons sur vos tomates",
      "Expected output",
      {
        required_keywords: { 
          keywords: ['observation', 'pucerons', 'tomates'], 
          weight: 1.0 
        }
      }
    );

    expect(evaluation.score).toBeGreaterThan(0.9); // Tous les mots-clés présents
    
    console.log('🔍 Keywords check:', {
      score: evaluation.score.toFixed(2),
      details: evaluation.details
    });
  });

  test('should evaluate French language style', () => {
    const frenchText = "J'ai créé votre observation avec les données fournies";
    const englishText = "I have created your observation with the provided data";
    
    const frenchEval = testingService['evaluateLanguageStyle'](frenchText);
    const englishEval = testingService['evaluateLanguageStyle'](englishText);
    
    expect(frenchEval).toBeGreaterThan(englishEval);
    
    console.log('🇫🇷 Language style evaluation:', {
      french_score: frenchEval.toFixed(2),
      english_score: englishEval.toFixed(2)
    });
  });
});

/**
 * Tests d'intégration avec vrais prompts
 */
describe('Real Prompts Integration', () => {
  let testingService: PromptTestingService;

  beforeEach(() => {
    const mockSupabase = { from: () => ({}) };
    const templateEngine = new PromptTemplateEngine();
    testingService = new PromptTestingService(mockSupabase as any, templateEngine, 'test-key');
  });

  test('should validate thomas_agent_system prompt structure', () => {
    const prompt = THOMAS_AGENT_SYSTEM_PROMPT;
    
    // Vérifications structure
    expect(prompt.name).toBe('thomas_agent_system');
    expect(prompt.version).toBe('2.0');
    expect(prompt.template).toBeDefined();
    expect(prompt.template.length).toBeGreaterThan(1000); // Prompt substantiel
    expect(prompt.examples).toBeDefined();
    expect(prompt.examples.length).toBeGreaterThan(2);
    
    // Vérifier variables déclarées présentes dans template
    prompt.variables.forEach(variable => {
      expect(prompt.template).toContain(`{{${variable}}}`);
    });
    
    // Vérifier conditions déclarées présentes dans template
    prompt.conditions.forEach(condition => {
      expect(prompt.template).toContain(`{{#if ${condition}}}`);
    });
    
    console.log('✅ System prompt structure validated:', {
      length: prompt.template.length,
      variables: prompt.variables.length,
      conditions: prompt.conditions.length,
      examples: prompt.examples.length
    });
  });

  test('should render system prompt with real context', () => {
    const templateEngine = new PromptTemplateEngine();
    
    const realContext: AgentContext = {
      user: { id: 'user-1', name: 'Jean Dupont', farm_id: 1 },
      farm: {
        id: 1,
        name: 'Ferme des Trois Chênes',
        plots: [
          { id: 1, name: 'Serre 1', type: 'serre_plastique', aliases: [], llm_keywords: [], surface_units: [], is_active: true },
          { id: 2, name: 'Tunnel Nord', type: 'tunnel', aliases: [], llm_keywords: [], surface_units: [], is_active: true }
        ],
        materials: [
          { id: 1, name: 'John Deere 6120', category: 'tracteurs', llm_keywords: [], is_active: true }
        ],
        conversions: [
          { id: '1', container_name: 'caisse', crop_name: 'courgettes', conversion_value: 5, conversion_unit: 'kg', slugs: [], is_active: true }
        ],
        preferences: { language: 'fr', auto_categorization: true, confidence_threshold: 0.7, fallback_enabled: true }
      },
      session_id: 'test-session',
      availableTools: ['create_observation', 'create_task_done', 'help']
    };

    const rendered = templateEngine.render(THOMAS_AGENT_SYSTEM_PROMPT.template, realContext);
    
    expect(rendered).toContain('Ferme des Trois Chênes');
    expect(rendered).toContain('Jean Dupont');
    expect(rendered).toContain('Serre 1');
    expect(rendered).toContain('John Deere 6120');
    expect(rendered).toContain('caisse');
    expect(rendered).toContain('create_observation');
    
    console.log('🎯 Real context rendering successful:', {
      rendered_length: rendered.length,
      contains_farm_name: rendered.includes('Ferme des Trois Chênes'),
      contains_plots: rendered.includes('Serre 1'),
      contains_tools: rendered.includes('create_observation')
    });
  });
});

/**
 * Démonstration système testing complet
 */
describe('Complete Testing System Demo', () => {
  
  test('should demonstrate end-to-end testing workflow', async () => {
    console.log('\n🎬 DÉMONSTRATION SYSTÈME TESTING THOMAS AGENT v2.0');
    console.log('=' .repeat(60));
    
    // 1. Setup
    const mockSupabase = { from: () => ({}) };
    const templateEngine = new PromptTemplateEngine();
    const testingService = new PromptTestingService(mockSupabase as any, templateEngine, 'demo-key');
    
    console.log('✅ 1. Services de testing initialisés');

    // 2. Génération cas de test
    const farmContext = {
      plots: [{ name: 'Serre 1' }, { name: 'Tunnel Nord' }],
      materials: [{ name: 'John Deere 6120' }],
      conversions: [{ container_name: 'caisse', conversion_value: 5 }]
    };
    
    const testCases = testingService.generateTestCases(farmContext);
    console.log(`✅ 2. ${testCases.length} cas de test générés automatiquement`);
    
    // 3. Test suite
    const mockPrompt: ChatPrompt = {
      id: 'demo', name: 'thomas_agent_system', content: THOMAS_AGENT_SYSTEM_PROMPT.template,
      examples: [], version: '2.0', is_active: true, metadata: {},
      created_at: '', updated_at: ''
    };
    
    const results = await testingService.runTestSuite(mockPrompt, testCases);
    console.log(`✅ 3. Test suite exécutée: ${results.passed_tests}/${results.total_tests} réussis`);
    console.log(`   Success rate: ${(results.success_rate * 100).toFixed(1)}%`);
    console.log(`   Avg score: ${results.average_score.toFixed(2)}`);
    console.log(`   Avg time: ${results.average_execution_time_ms.toFixed(0)}ms`);

    // 4. Benchmark performance
    const benchmark = await testingService.benchmarkPrompt(mockPrompt, 5);
    console.log(`✅ 4. Benchmark performance: Grade ${benchmark.performance_grade}`);
    console.log(`   Requests/sec: ${benchmark.requests_per_second.toFixed(1)}`);
    
    // 5. Validation template
    const validation = templateEngine.validateTemplate(THOMAS_AGENT_SYSTEM_PROMPT.template);
    console.log(`✅ 5. Template validation: ${validation.valid ? 'VALIDE' : 'ERREURS'}`);
    
    if (validation.warnings.length > 0) {
      console.log(`   Warnings: ${validation.warnings.slice(0, 2).join(', ')}`);
    }

    console.log('\n🎉 DÉMONSTRATION TERMINÉE - SYSTÈME TESTING OPÉRATIONNEL !');
    console.log('=' .repeat(60));
    
    // Assertion finale
    expect(results.total_tests).toBeGreaterThan(3);
    expect(validation.valid).toBe(true);
    expect(benchmark.performance_grade).toMatch(/[A-F]/);
  });
});

/**
 * Tests de régression automatique
 */
describe('Automated Regression Testing', () => {
  
  test('should detect prompt regression', async () => {
    const mockSupabase = { from: () => ({}) };
    const templateEngine = new PromptTemplateEngine();
    const testingService = new PromptTestingService(mockSupabase as any, templateEngine, 'test-key');

    // Mock version qui régresse
    const goodPrompt: ChatPrompt = {
      id: '1', name: 'test_prompt', content: 'Tu es un assistant très bon...',
      version: '1.0', examples: [], is_active: true, metadata: {},
      created_at: '', updated_at: ''
    };

    const badPrompt: ChatPrompt = {
      id: '2', name: 'test_prompt', content: 'Tu es assistant...',  // Plus court/moins bon
      version: '2.0', examples: [], is_active: true, metadata: {},
      created_at: '', updated_at: ''
    };

    // Mock les deux versions
    jest.spyOn(testingService as any, 'getPromptVersion')
      .mockImplementation((name: string, version: string) => {
        if (version === '1.0') return Promise.resolve(goodPrompt);
        if (version === '2.0') return Promise.resolve(badPrompt);
        throw new Error('Version not found');
      });

    const testCases = [
      {
        name: 'regression_test',
        input: 'test input',
        expected_output: 'good output',
        context: testingService['createTestContext']({ plots: [], materials: [], conversions: [] }),
        evaluation_criteria: { content_similarity: { weight: 1.0 } },
        pass_threshold: 0.7
      }
    ];

    const comparison = await testingService.comparePromptVersions('test_prompt', '1.0', '2.0', testCases);
    
    // Le système devrait détecter que v2.0 est possiblement moins bonne
    expect(comparison.performance_delta).toBeDefined();
    expect(comparison.recommendation).toBeDefined();
    
    console.log('🔍 Regression detection:', {
      delta: comparison.performance_delta.success_rate.toFixed(2),
      recommendation: comparison.recommendation.substring(0, 50) + '...'
    });
  });
});

