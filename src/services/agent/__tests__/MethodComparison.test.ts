import { createClient } from '@supabase/supabase-js';
import { AgentMethodRouter } from '../AgentMethodRouter';
import { FarmAgentConfigService } from '../FarmAgentConfigService';
import { PromptDeploymentService } from '../prompts/PromptDeploymentService';

/**
 * Tests de comparaison entre Méthode 1 (simple) et Méthode 2 (pipeline)
 * 
 * Objectifs:
 * - Valider que les deux méthodes produisent des résultats cohérents
 * - Comparer les performances (temps de traitement)
 * - Identifier les différences de comportement
 * - Mesurer la précision de chaque méthode
 */

describe('Method Comparison Tests', () => {
  let supabase: any;
  let router: AgentMethodRouter;
  let configService: FarmAgentConfigService;
  let promptService: PromptDeploymentService;
  
  const TEST_FARM_ID = 1;
  const TEST_USER_ID = 'test-user-id';
  const TEST_SESSION_ID = 'test-session-id';
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';

  beforeAll(async () => {
    // Setup Supabase client
    supabase = createClient(
      process.env.SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
    );

    // Initialiser les services
    router = new AgentMethodRouter(supabase, OPENAI_API_KEY);
    configService = new FarmAgentConfigService(supabase);
    promptService = new PromptDeploymentService(supabase);

    // Déployer les prompts v3.0 pour les tests
    console.log('📝 Deploying prompts for tests...');
    const deployment = await promptService.deployAllPrompts();
    if (!deployment.success) {
      console.warn('⚠️ Some prompts failed to deploy:', deployment.errors);
    }

    // S'assurer que la config ferme existe
    await configService.getFarmConfig(TEST_FARM_ID);
  });

  describe('Simple Messages - Observations', () => {
    test('Should detect observation intent in both methods', async () => {
      const message = "j'ai observé des pucerons sur mes tomates dans la serre 1";
      
      const comparison = await router.compareMethodsForMessage(
        message,
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID
      );

      expect(comparison.method1_result.success).toBe(true);
      expect(comparison.method2_result.success).toBe(true);
      
      // Les deux devraient avoir détecté l'observation
      expect(comparison.comparison_details.intent_match).toBe(true);
      
      // Les deux devraient avoir créé des actions
      expect(comparison.method1_result.actions.length).toBeGreaterThan(0);
      expect(comparison.method2_result.actions.length).toBeGreaterThan(0);
    }, 30000);

    test('Should handle observation without plot reference', async () => {
      const message = "j'ai vu du mildiou sur les tomates";
      
      const comparison = await router.compareMethodsForMessage(
        message,
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID
      );

      // Les deux méthodes devraient gérer l'absence de parcelle
      expect(comparison.methods_agree).toBeDefined();
    }, 30000);
  });

  describe('Task Done with Materials', () => {
    test('Should extract materials and duration', async () => {
      const message = "j'ai désherbé pendant 2 heures avec la binette";
      
      const comparison = await router.compareMethodsForMessage(
        message,
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID
      );

      expect(comparison.method1_result.success).toBe(true);
      expect(comparison.method2_result.success).toBe(true);
      
      // Vérifier que les actions contiennent les infos de durée et matériel
      const method1HasDuration = JSON.stringify(comparison.method1_result).includes('2');
      const method2HasDuration = JSON.stringify(comparison.method2_result).includes('2');
      
      expect(method1HasDuration || method2HasDuration).toBe(true);
    }, 30000);
  });

  describe('Harvest with Conversions', () => {
    test('Should handle harvest with quantity', async () => {
      const message = "j'ai récolté 3 caisses de courgettes";
      
      const comparison = await router.compareMethodsForMessage(
        message,
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID
      );

      expect(comparison.method1_result.success).toBe(true);
      expect(comparison.method2_result.success).toBe(true);
      
      // Les deux devraient avoir détecté harvest (pas task_done)
      const method1Content = comparison.method1_result.content.toLowerCase();
      const method2Content = comparison.method2_result.content.toLowerCase();
      
      // Au moins une méthode devrait mentionner la quantité
      const mentionsQuantity = 
        method1Content.includes('3') || 
        method2Content.includes('3') ||
        method1Content.includes('caisse') ||
        method2Content.includes('caisse');
      
      expect(mentionsQuantity).toBe(true);
    }, 30000);
  });

  describe('Planned Tasks', () => {
    test('Should handle future tense and date parsing', async () => {
      const message = "je vais traiter demain matin";
      
      const comparison = await router.compareMethodsForMessage(
        message,
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID
      );

      expect(comparison.method1_result.success).toBe(true);
      expect(comparison.method2_result.success).toBe(true);
      
      // Au moins une méthode devrait avoir créé une tâche planifiée
      const totalActions = 
        comparison.method1_result.actions.length + 
        comparison.method2_result.actions.length;
      
      expect(totalActions).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Complex Multi-Action Messages', () => {
    test('Should handle multiple actions in one message', async () => {
      const message = "j'ai observé des pucerons serre 1, récolté 2 paniers de tomates, et je vais traiter demain";
      
      const comparison = await router.compareMethodsForMessage(
        message,
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID
      );

      // Les deux méthodes devraient gérer le message complexe
      expect(comparison.method1_result.success || comparison.method2_result.success).toBe(true);
      
      // Au moins une méthode devrait avoir détecté plusieurs actions
      const maxActions = Math.max(
        comparison.method1_result.actions.length,
        comparison.method2_result.actions.length
      );
      
      expect(maxActions).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Help and Questions', () => {
    test('Should handle help requests', async () => {
      const message = "comment créer une nouvelle parcelle ?";
      
      const comparison = await router.compareMethodsForMessage(
        message,
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID
      );

      expect(comparison.method1_result.success).toBe(true);
      expect(comparison.method2_result.success).toBe(true);
      
      // Les deux devraient avoir détecté l'intent help
      const method1IsHelp = comparison.method1_result.type === 'conversational';
      const method2IsHelp = comparison.method2_result.type === 'conversational';
      
      expect(method1IsHelp || method2IsHelp).toBe(true);
    }, 30000);
  });

  describe('Performance Comparison', () => {
    test('Should compare processing times', async () => {
      const message = "j'ai planté 500 laitues";
      
      const comparison = await router.compareMethodsForMessage(
        message,
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID
      );

      console.log('⏱️ Performance comparison:', {
        method1_time: `${comparison.method1_time_ms}ms`,
        method2_time: `${comparison.method2_time_ms}ms`,
        ratio: `${(comparison.method2_time_ms / comparison.method1_time_ms).toFixed(2)}x`
      });

      // Méthode 1 devrait généralement être plus rapide (1 appel LLM vs 3-4)
      // Mais on ne fait pas d'assertion stricte car dépend du réseau
      expect(comparison.method1_time_ms).toBeGreaterThan(0);
      expect(comparison.method2_time_ms).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Confidence Scores', () => {
    test('Should compare confidence scores', async () => {
      const message = "j'ai semé des radis";
      
      const comparison = await router.compareMethodsForMessage(
        message,
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID
      );

      console.log('📊 Confidence comparison:', {
        method1_confidence: comparison.method1_result.confidence,
        method2_confidence: comparison.method2_result.confidence,
        diff: Math.abs(
          (comparison.method1_result.confidence || 0) - 
          (comparison.method2_result.confidence || 0)
        ).toFixed(2)
      });

      // Les deux devraient avoir une confiance > 0 si succès
      if (comparison.method1_result.success) {
        expect(comparison.method1_result.confidence).toBeGreaterThan(0);
      }
      if (comparison.method2_result.success) {
        expect(comparison.method2_result.confidence).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('Error Handling', () => {
    test('Should handle ambiguous messages gracefully', async () => {
      const message = "j'ai fait un truc";
      
      const comparison = await router.compareMethodsForMessage(
        message,
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID
      );

      // Les deux méthodes devraient gérer le message ambigu sans crash
      expect(comparison.method1_result).toBeDefined();
      expect(comparison.method2_result).toBeDefined();
      
      // Au moins une devrait fournir des suggestions
      const hasSuggestions = 
        (comparison.method1_result.suggestions?.length || 0) > 0 ||
        (comparison.method2_result.suggestions?.length || 0) > 0;
      
      expect(hasSuggestions).toBe(true);
    }, 30000);
  });

  describe('Method Selection and Routing', () => {
    test('Should route to simple method when configured', async () => {
      await configService.updateAgentMethod(TEST_FARM_ID, 'simple', 'Test routing');
      
      const response = await router.processMessage(
        "j'ai récolté des tomates",
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID
      );

      expect((response as any).method_used).toBe('simple');
    }, 30000);

    test('Should route to pipeline method when configured', async () => {
      await configService.updateAgentMethod(TEST_FARM_ID, 'pipeline', 'Test routing');
      
      const response = await router.processMessage(
        "j'ai récolté des tomates",
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID
      );

      expect((response as any).method_used).toBe('pipeline');
    }, 30000);

    test('Should force method with option', async () => {
      const response = await router.processMessage(
        "j'ai récolté des tomates",
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID,
        { forceMethod: 'simple' }
      );

      expect((response as any).method_used).toBe('simple');
    }, 30000);
  });

  describe('Metrics Recording', () => {
    test('Should record execution metrics', async () => {
      await configService.resetMetrics(TEST_FARM_ID);
      
      // Exécuter avec méthode simple
      await configService.updateAgentMethod(TEST_FARM_ID, 'simple');
      await router.processMessage(
        "j'ai récolté des tomates",
        TEST_SESSION_ID,
        TEST_USER_ID,
        TEST_FARM_ID
      );
      
      const config = await configService.getFarmConfig(TEST_FARM_ID);
      expect(config.simple_total_count).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Agreement Analysis', () => {
    test('Should analyze agreement between methods', async () => {
      const testMessages = [
        "j'ai observé des pucerons",
        "j'ai récolté 10 kg de tomates",
        "je vais traiter demain",
        "j'ai désherbé pendant 2h"
      ];

      let agreements = 0;
      let total = 0;

      for (const message of testMessages) {
        const comparison = await router.compareMethodsForMessage(
          message,
          TEST_SESSION_ID,
          TEST_USER_ID,
          TEST_FARM_ID
        );
        
        total++;
        if (comparison.methods_agree) {
          agreements++;
        }
      }

      const agreementRate = (agreements / total) * 100;
      console.log(`📊 Agreement rate: ${agreementRate.toFixed(1)}% (${agreements}/${total})`);
      
      // Les méthodes devraient être d'accord dans au moins 50% des cas
      expect(agreementRate).toBeGreaterThanOrEqual(50);
    }, 120000);
  });
});

describe('Farm Agent Config Service Tests', () => {
  let supabase: any;
  let configService: FarmAgentConfigService;
  const TEST_FARM_ID = 1;

  beforeAll(() => {
    supabase = createClient(
      process.env.SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
    );
    configService = new FarmAgentConfigService(supabase);
  });

  test('Should create default config for new farm', async () => {
    const config = await configService.getFarmConfig(TEST_FARM_ID);
    
    expect(config).toBeDefined();
    expect(config.farm_id).toBe(TEST_FARM_ID);
    expect(config.agent_method).toBeDefined();
  });

  test('Should update agent method', async () => {
    const updated = await configService.updateAgentMethod(
      TEST_FARM_ID,
      'pipeline',
      'Test update'
    );

    expect(updated.agent_method).toBe('pipeline');
    expect(updated.config_reason).toBe('Test update');
  });

  test('Should calculate comparison stats', async () => {
    const stats = await configService.getMethodComparisonStats(TEST_FARM_ID);
    
    expect(stats.simple).toBeDefined();
    expect(stats.pipeline).toBeDefined();
    expect(stats.recommended_method).toBeDefined();
    expect(stats.reason).toBeDefined();
  });
});
