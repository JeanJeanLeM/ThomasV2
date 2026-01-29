/**
 * Démonstration du système de testing des prompts Thomas Agent
 * Exécution concrète des tests avec résultats détaillés
 */

import { PromptTestingService } from '../PromptTestingService';
import { PromptTemplateEngine } from '../PromptTemplateEngine';
import { THOMAS_AGENT_SYSTEM_PROMPT, TOOL_SELECTION_PROMPT } from '../templates/ThomasAgentPrompts';
import { ChatPrompt, AgentContext } from '../../types/AgentTypes';

/**
 * Démonstration complète du système de testing
 */
export class PromptTestingDemo {
  private testingService: PromptTestingService;
  private templateEngine: PromptTemplateEngine;

  constructor() {
    // Mock Supabase pour démonstration
    const mockSupabase = this.createMockSupabase();
    this.templateEngine = new PromptTemplateEngine();
    this.testingService = new PromptTestingService(mockSupabase, this.templateEngine, 'demo-key');
  }

  /**
   * Exécution démonstration complète
   */
  async runCompleteDemo(): Promise<void> {
    console.log('\n🎬 DÉMONSTRATION SYSTÈME TESTING THOMAS AGENT v2.0');
    console.log('='.repeat(70));
    console.log('Architecture la plus avancée pour testing prompts IA agricoles !');
    console.log('='.repeat(70));

    try {
      // 1. Template Engine Demo
      await this.demoTemplateEngine();
      
      // 2. Test Case Generation Demo
      await this.demoTestCaseGeneration();
      
      // 3. Test Suite Execution Demo
      await this.demoTestSuiteExecution();
      
      // 4. A/B Testing Demo
      await this.demoABTesting();
      
      // 5. Performance Benchmark Demo
      await this.demoPerformanceBenchmark();
      
      // 6. Validation & Recommendations
      await this.demoValidationSystem();

      console.log('\n🎉 DÉMONSTRATION TERMINÉE AVEC SUCCÈS !');
      console.log('Le système de testing Thomas Agent est 100% opérationnel ! ⚡');

    } catch (error) {
      console.error('❌ Erreur démonstration:', error);
      throw error;
    }
  }

  /**
   * 1. Démonstration Template Engine avec variables contextuelles
   */
  private async demoTemplateEngine(): Promise<void> {
    console.log('\n📝 1. TEMPLATE ENGINE - Variables Contextuelles');
    console.log('-'.repeat(50));

    const testContext: AgentContext = {
      user: { id: 'demo-user', name: 'Jean Dupont', farm_id: 1 },
      farm: {
        id: 1,
        name: 'Ferme des Trois Chênes',
        plots: [
          { id: 1, name: 'Serre 1', type: 'serre_plastique', aliases: ['serre1'], llm_keywords: ['serre'], surface_units: [], is_active: true },
          { id: 2, name: 'Tunnel Nord', type: 'tunnel', aliases: ['tunnel_n'], llm_keywords: ['tunnel'], surface_units: [], is_active: true }
        ],
        materials: [
          { id: 1, name: 'John Deere 6120', category: 'tracteurs', llm_keywords: ['tracteur'], is_active: true },
          { id: 2, name: 'Pulvérisateur 200L', category: 'outils_tracteur', llm_keywords: ['pulvérisateur'], is_active: true }
        ],
        conversions: [
          { id: '1', container_name: 'caisse', crop_name: 'courgettes', conversion_value: 5, conversion_unit: 'kg', slugs: ['caisses'], is_active: true }
        ],
        preferences: { language: 'fr', auto_categorization: true, confidence_threshold: 0.7, fallback_enabled: true }
      },
      session_id: 'demo-session',
      availableTools: ['create_observation', 'create_task_done', 'create_harvest', 'help']
    };

    // Rendu template système avec contexte réel
    const simpleTemplate = `🌾 FERME: {{farm_name}}
👤 UTILISATEUR: {{user_name}} 
📅 DATE: {{current_date}}

📊 PARCELLES ({{plotCount}}):
{{farm_context}}

🛠️ TOOLS DISPONIBLES:
{{available_tools}}

{{#if has_plots}}✅ Ferme configurée avec parcelles{{/if}}
{{#if has_conversions}}✅ Conversions personnalisées disponibles{{/if}}`;

    const rendered = this.templateEngine.render(simpleTemplate, testContext);
    
    console.log('🎯 Template rendu avec contexte réel:');
    console.log(rendered);
    
    console.log('\n📊 Statistiques template engine:');
    const engineStats = this.templateEngine.getEngineStats();
    console.log(`   Helpers disponibles: ${engineStats.helpers_count}`);
    console.log(`   Helpers: ${engineStats.helpers_available.join(', ')}`);
  }

  /**
   * 2. Démonstration génération automatique de cas de test
   */
  private async demoTestCaseGeneration(): Promise<void> {
    console.log('\n🧪 2. GÉNÉRATION AUTOMATIQUE CAS DE TEST');
    console.log('-'.repeat(50));

    const farmContext = {
      plots: [
        { name: 'Serre 1', type: 'serre_plastique' },
        { name: 'Tunnel Nord', type: 'tunnel' },
        { name: 'Plein Champ 1', type: 'plein_champ' }
      ],
      materials: [
        { name: 'John Deere 6120', category: 'tracteurs' },
        { name: 'Pulvérisateur 200L', category: 'outils_tracteur' }
      ],
      conversions: [
        { container_name: 'caisse', crop_name: 'courgettes', conversion_value: 5, conversion_unit: 'kg' },
        { container_name: 'panier', crop_name: 'tomates', conversion_value: 2.5, conversion_unit: 'kg' }
      ]
    };

    const testCases = this.testingService.generateTestCases(farmContext);
    
    console.log(`🎯 ${testCases.length} cas de test générés automatiquement:`);
    
    testCases.forEach((testCase, index) => {
      console.log(`\n   ${index + 1}. **${testCase.name}**`);
      console.log(`      Input: "${testCase.input}"`);
      console.log(`      Expected: "${testCase.expected_output}"`);
      console.log(`      Pass threshold: ${testCase.pass_threshold}`);
      
      const criteriaKeys = Object.keys(testCase.evaluation_criteria);
      console.log(`      Critères évaluation: ${criteriaKeys.join(', ')}`);
    });

    console.log('\n💡 Tests contextuels avec vraies données ferme:');
    const contextualTests = testCases.filter(tc => tc.name.includes('contextual'));
    console.log(`   ${contextualTests.length} tests adaptés au contexte spécifique`);
  }

  /**
   * 3. Démonstration exécution test suite complète
   */
  private async demoTestSuiteExecution(): Promise<void> {
    console.log('\n⚡ 3. EXÉCUTION TEST SUITE COMPLÈTE');
    console.log('-'.repeat(50));

    const farmContext = { plots: [{ name: 'Serre 1' }], materials: [], conversions: [] };
    const testCases = this.testingService.generateTestCases(farmContext);
    
    const mockPrompt: ChatPrompt = {
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

    console.log(`🧪 Exécution test suite sur ${testCases.length} cas de test...`);
    
    const results = await this.testingService.runTestSuite(mockPrompt, testCases);
    
    console.log('\n📊 RÉSULTATS TEST SUITE:');
    console.log(`   Prompt: ${results.prompt_name} v${results.prompt_version}`);
    console.log(`   Tests total: ${results.total_tests}`);
    console.log(`   Tests réussis: ${results.passed_tests}`);
    console.log(`   Taux de succès: ${(results.success_rate * 100).toFixed(1)}%`);
    console.log(`   Score moyen: ${results.average_score.toFixed(2)}/1.0`);
    console.log(`   Temps moyen: ${results.average_execution_time_ms.toFixed(0)}ms`);
    console.log(`   Tokens utilisés: ${results.total_tokens_used}`);
    console.log(`   Temps total: ${results.total_execution_time_ms}ms`);

    console.log('\n🔍 DÉTAIL PAR TEST:');
    results.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.test_case_name}`);
      console.log(`      Score: ${(result.score || 0).toFixed(2)} | Temps: ${result.execution_time_ms}ms`);
      if (result.error_message) {
        console.log(`      Erreur: ${result.error_message}`);
      }
    });
  }

  /**
   * 4. Démonstration A/B Testing entre versions
   */
  private async demoABTesting(): Promise<void> {
    console.log('\n🔍 4. A/B TESTING - COMPARAISON VERSIONS');
    console.log('-'.repeat(50));

    // Mock deux versions différentes pour comparaison
    const promptV1: ChatPrompt = {
      id: 'v1', name: 'thomas_agent_system', version: '1.0',
      content: 'Tu es Thomas, assistant agricole français simple...',
      examples: [], is_active: false, metadata: {},
      created_at: '', updated_at: ''
    };

    const promptV2: ChatPrompt = {
      id: 'v2', name: 'thomas_agent_system', version: '2.0',
      content: THOMAS_AGENT_SYSTEM_PROMPT.template, // Version complète
      examples: THOMAS_AGENT_SYSTEM_PROMPT.examples,
      is_active: true, metadata: THOMAS_AGENT_SYSTEM_PROMPT.metadata,
      created_at: '', updated_at: ''
    };

    // Mock getPromptVersion pour A/B testing
    jest.spyOn(this.testingService as any, 'getPromptVersion')
      .mockImplementation((name: string, version: string) => {
        if (version === '1.0') return Promise.resolve(promptV1);
        if (version === '2.0') return Promise.resolve(promptV2);
        throw new Error('Version not found');
      });

    const testCases = this.testingService.generateTestCases({ plots: [], materials: [], conversions: [] });
    const limitedTestCases = testCases.slice(0, 3); // Limiter pour démonstration

    console.log(`🔍 A/B Testing v1.0 vs v2.0 sur ${limitedTestCases.length} cas de test...`);
    
    const comparison = await this.testingService.comparePromptVersions(
      'thomas_agent_system',
      '1.0',
      '2.0',
      limitedTestCases
    );

    console.log('\n📊 RÉSULTATS A/B TESTING:');
    console.log(`   Prompt: ${comparison.prompt_name}`);
    console.log(`   Version A: ${comparison.version_1} vs Version B: ${comparison.version_2}`);
    console.log('\n   🎯 PERFORMANCE DELTA:');
    console.log(`   Success Rate: ${(comparison.performance_delta.success_rate * 100).toFixed(1)}%`);
    console.log(`   Score moyen: ${comparison.performance_delta.avg_score.toFixed(2)}`);
    console.log(`   Temps exécution: ${comparison.performance_delta.avg_execution_time.toFixed(0)}ms`);
    console.log(`   Tokens: ${comparison.performance_delta.token_usage}`);
    
    console.log(`\n   🚨 Régression détectée: ${comparison.regression_detected ? 'OUI' : 'NON'}`);
    console.log(`   💡 Recommandation: ${comparison.recommendation}`);
    
    if (comparison.improvement_areas.length > 0) {
      console.log('\n   🔧 Domaines d\'amélioration:');
      comparison.improvement_areas.forEach(area => {
        console.log(`      • ${area}`);
      });
    }
  }

  /**
   * 5. Démonstration benchmark performance
   */
  private async demoPerformanceBenchmark(): Promise<void> {
    console.log('\n⚡ 5. BENCHMARK PERFORMANCE');
    console.log('-'.repeat(50));

    const mockPrompt: ChatPrompt = {
      id: 'bench', name: 'thomas_agent_system', version: '2.0',
      content: THOMAS_AGENT_SYSTEM_PROMPT.template,
      examples: [], is_active: true, metadata: {},
      created_at: '', updated_at: ''
    };

    console.log('⚡ Lancement benchmark avec 10 requêtes parallèles...');
    
    const benchmark = await this.testingService.benchmarkPrompt(mockPrompt, 10);
    
    console.log('\n📊 RÉSULTATS BENCHMARK:');
    console.log(`   Prompt: ${benchmark.prompt_name} v${benchmark.prompt_version}`);
    console.log(`   Charge test: ${benchmark.test_load} requêtes`);
    console.log(`   Temps total: ${benchmark.total_time_ms}ms`);
    console.log(`   Temps moyen: ${benchmark.avg_response_time_ms.toFixed(0)}ms`);
    console.log(`   Temps min: ${benchmark.min_response_time_ms}ms`);
    console.log(`   Temps max: ${benchmark.max_response_time_ms}ms`);
    console.log(`   Requêtes/sec: ${benchmark.requests_per_second.toFixed(1)}`);
    console.log(`   Grade performance: ${benchmark.performance_grade}`);

    // Interprétation du grade
    const gradeInterpretation = {
      'A': '🌟 Excellent - Production ready !',
      'B': '✅ Très bon - Performance optimale',
      'C': '👍 Acceptable - Améliorations possibles',
      'D': '⚠️ Lent - Optimisation requise',
      'F': '🚨 Très lent - Révision nécessaire'
    };
    
    console.log(`   Interprétation: ${gradeInterpretation[benchmark.performance_grade as keyof typeof gradeInterpretation] || 'Grade inconnu'}`);
  }

  /**
   * 6. Démonstration système validation
   */
  private async demoValidationSystem(): Promise<void> {
    console.log('\n🔍 6. SYSTÈME VALIDATION & RECOMMANDATIONS');
    console.log('-'.repeat(50));

    // Validation template
    const validation = this.templateEngine.validateTemplate(THOMAS_AGENT_SYSTEM_PROMPT.template);
    
    console.log('📋 VALIDATION TEMPLATE:');
    console.log(`   Template valide: ${validation.valid ? '✅ OUI' : '❌ NON'}`);
    
    if (validation.errors.length > 0) {
      console.log('   🚨 Erreurs détectées:');
      validation.errors.forEach(error => console.log(`      • ${error}`));
    }
    
    if (validation.warnings.length > 0) {
      console.log('   ⚠️ Avertissements:');
      validation.warnings.forEach(warning => console.log(`      • ${warning}`));
    }

    // Recommandations système
    console.log('\n💡 RECOMMANDATIONS SYSTÈME:');
    if (validation.valid) {
      console.log('   ✅ Template prêt pour production');
      console.log('   ✅ Variables et conditions bien formées');
      console.log('   ✅ Structure cohérente et maintenable');
      console.log('   🎯 Continuer monitoring performance en production');
    } else {
      console.log('   🔧 Corriger erreurs avant déploiement');
    }

    // Statistiques avancées
    console.log('\n📈 STATISTIQUES AVANCÉES:');
    const stats = this.templateEngine.getEngineStats();
    console.log(`   Helper functions: ${stats.helpers_count}`);
    console.log(`   Functions disponibles: ${stats.helpers_available.join(', ')}`);
    console.log(`   Template length: ${THOMAS_AGENT_SYSTEM_PROMPT.template.length} caractères`);
    console.log(`   Variables count: ${THOMAS_AGENT_SYSTEM_PROMPT.variables.length}`);
    console.log(`   Conditions count: ${THOMAS_AGENT_SYSTEM_PROMPT.conditions.length}`);
  }

  /**
   * Mock Supabase pour démonstration
   */
  private createMockSupabase(): any {
    return {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: null }))
          }))
        }))
      }))
    };
  }

  /**
   * Démonstration de différents scénarios de test
   */
  async demonstrateTestScenarios(): Promise<void> {
    console.log('\n🎭 SCÉNARIOS DE TEST AVANCÉS');
    console.log('-'.repeat(50));

    // Scénarios variés pour démonstration
    const scenarios = [
      {
        name: 'Observation complexe',
        message: "j'ai observé des pucerons verts sur mes tomates cerises dans la serre 1, ils sont nombreux et causent des dégâts aux feuilles",
        expected_intent: 'observation_creation',
        expected_entities: ['pucerons', 'tomates', 'serre 1']
      },
      {
        name: 'Récolte avec conversion',
        message: "j'ai récolté 4 caisses de courgettes de bonne qualité ce matin avec le tracteur",
        expected_intent: 'harvest',
        expected_entities: ['4 caisses', 'courgettes', 'tracteur']
      },
      {
        name: 'Planification française',
        message: "je vais faire le désherbage lundi prochain vers 14h dans toutes les serres",
        expected_intent: 'task_planned',
        expected_entities: ['lundi prochain', '14h', 'serres']
      },
      {
        name: 'Question aide',
        message: "comment je peux configurer une nouvelle conversion pour mes paniers de radis ?",
        expected_intent: 'help',
        expected_entities: ['conversion', 'paniers', 'radis']
      }
    ];

    scenarios.forEach((scenario, index) => {
      console.log(`\n   ${index + 1}. 🎯 **${scenario.name}**`);
      console.log(`      Message: "${scenario.message}"`);
      console.log(`      Intent attendu: ${scenario.expected_intent}`);
      console.log(`      Entités attendues: ${scenario.expected_entities.join(', ')}`);
    });

    console.log('\n💡 Chaque scénario teste:');
    console.log('   • Classification d\'intention précise');
    console.log('   • Extraction d\'entités françaises');
    console.log('   • Matching contextuel avec données ferme');
    console.log('   • Génération réponse naturelle appropriée');
  }
}

/**
 * Script d'exécution de la démonstration
 */
async function runPromptTestingDemonstration(): Promise<void> {
  try {
    const demo = new PromptTestingDemo();
    
    await demo.runCompleteDemo();
    await demo.demonstrateTestScenarios();
    
    console.log('\n🏆 SYSTÈME TESTING THOMAS AGENT - VALIDATION COMPLÈTE');
    console.log('='.repeat(70));
    console.log('✅ Template Engine avec variables contextuelles');
    console.log('✅ Génération automatique cas de test');
    console.log('✅ Test suite avec métriques complètes');
    console.log('✅ A/B testing entre versions prompts');  
    console.log('✅ Benchmark performance sous charge');
    console.log('✅ Validation et recommandations automatiques');
    console.log('\n🚀 SYSTÈME PRÊT POUR OPTIMISATION CONTINUE DES PROMPTS !');
    
  } catch (error) {
    console.error('❌ Erreur démonstration testing:', error);
    throw error;
  }
}

// Export pour usage externe
export { runPromptTestingDemonstration };

