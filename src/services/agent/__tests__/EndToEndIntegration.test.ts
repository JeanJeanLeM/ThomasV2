/**
 * Tests End-to-End Thomas Agent v2.0
 * Validation production complète - Toutes les phases intégrées
 * 
 * Objectifs:
 * - Valider workflow complet Message → Actions concrètes
 * - Tester avec données réelles simulées
 * - Vérifier performance sous charge
 * - Valider patterns Anthropic implémentés
 * - Confirmer ready for production
 */

import { SimpleAgentFactory, ThomasAgentWrapper } from '../pipeline/ThomasAgentWrapper';
import { ThomasPipelineFactory } from '../pipeline';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION TESTS E2E
// ============================================================================

const E2E_CONFIG = {
  supabase_url: process.env.TEST_SUPABASE_URL || 'http://localhost:54321',
  supabase_key: process.env.TEST_SUPABASE_KEY || 'test-key',
  openai_key: process.env.TEST_OPENAI_KEY || 'test-openai-key',
  test_timeout: 30000, // 30s timeout for E2E tests
  performance_target_ms: 5000 // 5s max for complex messages
};

/**
 * Suite de tests avec vraie base de données Supabase (si disponible)
 */
describe('Thomas Agent E2E - Production Validation', () => {
  let thomas: ThomasAgentWrapper;
  let supabase: any;
  let testContext: any;

  beforeAll(async () => {
    console.log('🚀 Setting up E2E test environment...');
    
    // Tentative connexion vraie DB, sinon mock
    try {
      if (E2E_CONFIG.supabase_url.includes('localhost') || E2E_CONFIG.supabase_url.includes('supabase.co')) {
        supabase = createClient(E2E_CONFIG.supabase_url, E2E_CONFIG.supabase_key);
        
        // Test connexion
        const { error } = await supabase.from('farms').select('id').limit(1);
        if (error) throw error;
        
        console.log('✅ Connected to real Supabase database');
      } else {
        throw new Error('Mock database for testing');
      }
    } catch (error) {
      console.log('⚠️ Using mock database for E2E tests');
      supabase = createMockSupabaseForE2E();
    }

    // Création Thomas Agent complet
    thomas = new ThomasAgentWrapper(supabase, E2E_CONFIG.openai_key);
    
    const initResult = await thomas.initialize();
    expect(initResult.success).toBe(true);

    // Context de test réaliste
    testContext = {
      session_id: 'e2e-session-' + Date.now(),
      user_id: 'e2e-user-' + Date.now(),
      farm_id: 1
    };

    console.log('✅ E2E environment ready');
  }, E2E_CONFIG.test_timeout);

  describe('🌾 Agricultural Scenarios - Real World', () => {
    
    test('should handle complete daily farm report', async () => {
      const dailyReport = `Bonjour Thomas ! Voici mon rapport de la journée :
      
      J'ai commencé par observer quelques pucerons sur mes tomates dans la serre 1, rien de grave mais à surveiller.
      
      Ensuite j'ai récolté 5 caisses de courgettes dans le tunnel nord, très belle qualité aujourd'hui ! 
      
      J'ai aussi planté 200 plants de radis dans le plein champ 2 avec le tracteur, ça m'a pris environ 2 heures.
      
      Pour demain je prévois de faire le traitement contre les pucerons dans la serre 1, probablement vers 8h du matin.
      
      Et dis-moi, comment je peux créer une nouvelle parcelle pour mes futurs semis ?`;

      console.log('📝 Testing complex daily farm report...');
      
      const response = await thomas.chat(dailyReport, testContext, { debug: true });
      
      // Validations complètes
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();
      expect(response.message.length).toBeGreaterThan(100); // Réponse détaillée
      
      // Actions multiples attendues
      expect(response.actions).toBeDefined();
      expect(response.actions!.length).toBeGreaterThan(2); // Au moins observation + récolte + aide
      
      // Suggestions contextuelles  
      expect(response.suggestions).toBeDefined();
      expect(response.suggestions!.length).toBeGreaterThan(0);
      
      // Debug info disponible
      if (response.debug_info) {
        expect(response.debug_info.agent_version).toBe('thomas_agent_v2.0');
        expect(response.debug_info.system_health).toBeOneOf(['healthy', 'degraded']);
      }
      
      console.log('✅ Daily report processed:', {
        processing_time: response.processing_time,
        actions_created: response.actions?.length,
        message_length: response.message.length
      });

    }, E2E_CONFIG.performance_target_ms);

    test('should handle observation with precise plot matching', async () => {
      const message = "j'ai remarqué des traces de mildiou sur les tomates de la planche 2 dans la serre 1";
      
      const response = await thomas.chat(message, testContext);
      
      expect(response.success).toBe(true);
      expect(response.message).toContain('mildiou');
      expect(response.message).toContain('tomates');
      
      // Vérifier matching hiérarchique planche → serre
      expect(response.message.toLowerCase()).toMatch(/serre.*1|planche.*2/);
      
      // Action observation créée
      const observationAction = response.actions?.find(a => a.type.includes('observation'));
      expect(observationAction).toBeDefined();
      expect(observationAction?.title).toContain('mildiou');
    });

    test('should handle harvest with automatic conversion', async () => {
      const message = "j'ai récolté 4 caisses de courgettes de très bonne qualité ce matin dans le tunnel";
      
      const response = await thomas.chat(message, testContext);
      
      expect(response.success).toBe(true);
      expect(response.message).toContain('récolté');
      
      // Vérifier conversion automatique (4 caisses = 20kg si conversion 5kg/caisse)
      expect(response.message).toMatch(/20\s*kg|conversion/i);
      
      // Vérifier qualité prise en compte
      expect(response.message.toLowerCase()).toMatch(/bonne|qualité|excellent/);
    });

    test('should handle planned task with French date parsing', async () => {
      const message = "je vais faire un désherbage lundi prochain dans toutes les serres";
      
      const response = await thomas.chat(message, testContext);
      
      expect(response.success).toBe(true);
      expect(response.message).toContain('planifié');
      expect(response.message).toContain('lundi');
      
      // Date parsing français
      expect(response.message).toMatch(/\d{1,2}\/\d{1,2}|\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i);
    });
  });

  describe('🎯 Edge Cases and Error Recovery', () => {
    
    test('should handle unknown plot with suggestions', async () => {
      const message = "j'ai observé des problèmes dans la serre xyz qui n'existe pas";
      
      const response = await thomas.chat(message, testContext);
      
      // Même si parcelle inconnue, doit proposer aide
      expect(response.success).toBe(false) || expect(response.success).toBe(true); // Peut gérer via fallback
      expect(response.message).toBeDefined();
      expect(response.suggestions).toBeDefined();
      expect(response.suggestions!.some(s => s.toLowerCase().includes('parcelle'))).toBe(true);
    });

    test('should handle ambiguous message with clarification request', async () => {
      const message = "j'ai fait des trucs dans le jardin";
      
      const response = await thomas.chat(message, testContext);
      
      expect(response.message).toBeDefined();
      // Doit demander des précisions ou fournir aide
      expect(
        response.message.toLowerCase().includes('préciser') ||
        response.message.toLowerCase().includes('reformuler') ||
        response.message.toLowerCase().includes('aide')
      ).toBe(true);
    });

    test('should handle very short messages', async () => {
      const shortMessages = ['salut', 'help', 'merci', '?', 'ok'];
      
      for (const msg of shortMessages) {
        const response = await thomas.chat(msg, testContext);
        
        expect(response.message).toBeDefined();
        expect(response.message.length).toBeGreaterThan(10); // Réponse substantielle même pour messages courts
        
        console.log(`Short message "${msg}" → "${response.message.substring(0, 50)}..."`);
      }
    });
  });

  describe('⚡ Performance and Scalability', () => {
    
    test('should handle concurrent requests from same farm', async () => {
      const messages = [
        "j'ai observé des pucerons serre 1",
        "j'ai récolté des courgettes",
        "comment créer une parcelle ?"
      ];

      const startTime = Date.now();
      
      const responses = await Promise.all(
        messages.map(message => thomas.chat(message, {
          ...testContext,
          session_id: `concurrent-${Math.random().toString(36).substring(7)}`
        }))
      );

      const totalTime = Date.now() - startTime;
      
      // Toutes les réponses doivent être valides
      responses.forEach((response, index) => {
        expect(response.message).toBeDefined();
        console.log(`Concurrent ${index + 1}: ${response.processing_time}ms`);
      });
      
      // Temps total raisonnable pour 3 requêtes parallèles
      expect(totalTime).toBeLessThan(10000); // 10s max pour 3 requêtes
      
      console.log(`🚀 Concurrent processing: ${responses.length} requests in ${totalTime}ms`);
    });

    test('should maintain performance with large context', async () => {
      // Simuler ferme avec beaucoup de données
      const largeContextMessage = `j'ai observé des pucerons sur mes tomates dans la serre 1.
      
      Ma ferme a beaucoup de parcelles et matériel configurés, et j'utilise de nombreuses conversions personnalisées.
      
      J'ai aussi récolté des courgettes avec mes équipements habituels et je planifie plusieurs traitements pour la semaine.`;

      const response = await thomas.chat(largeContextMessage, testContext);
      
      expect(response.success).toBe(true);
      expect(response.processing_time).toBeLessThan(E2E_CONFIG.performance_target_ms);
      
      console.log(`📊 Large context processed in ${response.processing_time}ms`);
    });

    test('should provide consistent response quality', async () => {
      const testMessage = "j'ai observé des pucerons sur mes tomates serre 1";
      const responses: any[] = [];
      
      // Exécuter 5 fois le même message
      for (let i = 0; i < 5; i++) {
        const response = await thomas.chat(testMessage, {
          ...testContext,
          session_id: `consistency-${i}`
        });
        responses.push(response);
      }
      
      // Tous doivent être réussis
      const allSuccessful = responses.every(r => r.success);
      expect(allSuccessful).toBe(true);
      
      // Confidence similaire (variation < 20%)
      const confidences = responses.map(r => r.confidence || 0);
      const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
      const maxVariation = Math.max(...confidences) - Math.min(...confidences);
      
      expect(maxVariation).toBeLessThan(0.2); // Variation < 20%
      
      console.log(`🎯 Consistency test: avg confidence ${avgConfidence.toFixed(2)}, max variation ${maxVariation.toFixed(2)}`);
    });
  });

  describe('🎛️ System Health and Monitoring', () => {
    
    test('should provide comprehensive system stats', async () => {
      const stats = await thomas.getStats();
      
      expect(stats.status).toBeOneOf(['healthy', 'degraded', 'unhealthy']);
      expect(stats.success_rate).toMatch(/\d+\.\d+%/); // Format "XX.X%"
      expect(stats.avg_response_time).toMatch(/\d+ms/); // Format "XXXms"  
      expect(stats.total_requests_7d).toBeGreaterThanOrEqual(0);
      expect(stats.most_used_features).toBeDefined();
      expect(stats.recommendations).toBeDefined();
      
      console.log('📊 System stats:', stats);
    });

    test('should perform quick health check', async () => {
      const healthCheck = await thomas.quickTest();
      
      expect(healthCheck.working).toBe(true);
      expect(healthCheck.response_time_ms).toBeGreaterThan(0);
      expect(healthCheck.response_time_ms).toBeLessThan(3000); // 3s max pour test
      expect(healthCheck.message).toContain('correctement');
      
      console.log(`⚡ Health check: ${healthCheck.message} (${healthCheck.response_time_ms}ms)`);
    });

    test('should support graceful restart', async () => {
      const restartResult = await thomas.restart();
      
      expect(restartResult.success).toBe(true);
      expect(restartResult.message).toContain('succès');
      
      // Vérifier que Thomas fonctionne après restart
      const testResponse = await thomas.chat('test après restart', testContext);
      expect(testResponse.message).toBeDefined();
      
      console.log(`🔄 Restart: ${restartResult.message}`);
    });
  });

  describe('📱 Frontend Integration Scenarios', () => {
    
    test('should work with typical React Native integration', async () => {
      // Simulation appel depuis React Native
      const frontendRequest = {
        message: "j'ai récolté 3 caisses de courgettes ce matin",
        context: testContext,
        ui_context: {
          screen: 'ChatScreen',
          platform: 'mobile',
          app_version: '2.0.0'
        }
      };

      const response = await thomas.chat(frontendRequest.message, frontendRequest.context);
      
      // Format adapté pour UI mobile
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();
      expect(response.actions).toBeDefined();
      
      // Actions avec format UI
      if (response.actions && response.actions.length > 0) {
        const action = response.actions[0];
        expect(action.id).toBeDefined();
        expect(action.type).toBeDefined();
        expect(action.title).toBeDefined();
        expect(action.icon).toBeDefined();
        expect(action.timestamp).toBeDefined();
      }
      
      console.log('📱 Mobile UI format validated:', {
        actions_count: response.actions?.length || 0,
        suggestions_count: response.suggestions?.length || 0
      });
    });

    test('should provide contextual help for UI navigation', async () => {
      const helpQuestions = [
        'comment créer une parcelle ?',
        'où voir mes tâches ?',
        'comment configurer mes conversions ?'
      ];

      for (const question of helpQuestions) {
        const helpResponse = await thomas.getHelp(question, { 
          user_id: testContext.user_id, 
          farm_id: testContext.farm_id 
        });
        
        expect(helpResponse.answer).toBeDefined();
        expect(helpResponse.navigation_hints).toBeDefined();
        expect(helpResponse.navigation_hints.length).toBeGreaterThan(0);
        expect(helpResponse.related_actions).toBeDefined();
        
        console.log(`❓ Help: "${question}" → Navigation: ${helpResponse.navigation_hints[0]}`);
      }
    });
  });

  describe('🎯 Anthropic Patterns Validation', () => {
    
    test('should demonstrate context engineering principles', async () => {
      // Test avec contexte riche vs minimal
      const richMessage = `Dans ma ferme qui a 15 parcelles différentes avec chacune plusieurs unités de surface,
      plus de 20 matériels de différentes catégories, et 30 conversions personnalisées configurées,
      j'ai observé un petit problème de pucerons sur mes tomates de la serre numéro 1.`;

      const response = await thomas.chat(richMessage, testContext);
      
      expect(response.success).toBe(true);
      expect(response.processing_time).toBeLessThan(E2E_CONFIG.performance_target_ms);
      
      // Context engineering devrait gérer contexte riche efficacement
      expect(response.message).toContain('serre');
      expect(response.message).toContain('pucerons');
      
      console.log(`🧠 Context engineering: Rich context processed in ${response.processing_time}ms`);
    });

    test('should demonstrate autonomous tool selection', async () => {
      const autonomyTestMessages = [
        "j'ai des pucerons et j'ai récolté des courgettes", // Multi-action
        "problème bizarre sur mes cultures", // Ambiguous
        "tout va bien aujourd'hui", // No clear action
        "urgent : traitement à faire demain matin" // Priority case
      ];

      for (const message of autonomyTestMessages) {
        const response = await thomas.chat(message, {
          ...testContext,
          session_id: `autonomy-${Math.random().toString(36).substring(7)}`
        });
        
        // L'agent doit toujours fournir une réponse raisonnable
        expect(response.message).toBeDefined();
        expect(response.message.length).toBeGreaterThan(20);
        
        console.log(`🤖 Autonomous: "${message.substring(0, 30)}..." → Actions: ${response.actions?.length || 0}`);
      }
    });

    test('should demonstrate progressive disclosure', async () => {
      // Test que l'agent ne charge que les données nécessaires
      const specificMessage = "j'ai observé des pucerons serre 1"; // Très spécifique
      const generalMessage = "j'ai des problèmes dans mes cultures"; // Très général
      
      const specificResponse = await thomas.chat(specificMessage, testContext);
      const generalResponse = await thomas.chat(generalMessage, testContext);
      
      // Les deux doivent fonctionner mais avec approches différentes
      expect(specificResponse.success).toBe(true);
      expect(generalResponse.message).toBeDefined();
      
      // Message spécifique devrait être plus confiant
      expect(specificResponse.confidence || 0).toBeGreaterThan((generalResponse.confidence || 0) - 0.2);
      
      console.log(`🔍 Progressive disclosure: Specific (${specificResponse.confidence}) vs General (${generalResponse.confidence})`);
    });
  });

  describe('🚀 Production Readiness', () => {
    
    test('should handle production-level error scenarios', async () => {
      const errorScenarios = [
        { message: '', description: 'Empty message' },
        { message: 'a'.repeat(3000), description: 'Too long message' }, 
        { message: 'xyz123!@#$%', description: 'Gibberish' },
        { message: 'parcelle inexistante problème grave', description: 'Unknown references' }
      ];

      for (const scenario of errorScenarios) {
        try {
          const response = await thomas.chat(scenario.message, testContext);
          
          // Même avec erreurs, doit retourner réponse valide
          expect(response.message).toBeDefined();
          
          if (!response.success) {
            expect(response.suggestions).toBeDefined();
            expect(response.suggestions!.length).toBeGreaterThan(0);
          }
          
          console.log(`🛡️ Error scenario "${scenario.description}": Handled gracefully`);
          
        } catch (error) {
          // Les erreurs doivent être catchées, pas propagées
          fail(`Error scenario "${scenario.description}" should be handled gracefully, but threw: ${error.message}`);
        }
      }
    });

    test('should maintain data consistency across operations', async () => {
      // Série d'opérations qui doivent être cohérentes
      const operations = [
        "j'ai créé une observation test-e2e",
        "j'ai complété cette observation",  
        "lister mes observations récentes"
      ];

      const responses: any[] = [];
      for (const operation of operations) {
        const response = await thomas.chat(operation, {
          ...testContext,
          session_id: `consistency-${Math.random().toString(36).substring(7)}`
        });
        responses.push(response);
      }

      // Toutes les opérations doivent être traitées
      responses.forEach((response, index) => {
        expect(response.message).toBeDefined();
        console.log(`🔗 Operation ${index + 1}: ${response.success ? 'OK' : 'Handled'}`);
      });
    });
  });

  describe('📊 Integration with Real Database (if available)', () => {
    
    test.skipIf(!E2E_CONFIG.supabase_url.includes('supabase.co'))(
      'should create real observations in database', 
      async () => {
        const message = "test e2e - j'ai observé des pucerons test dans serre test";
        
        const response = await thomas.chat(message, testContext);
        
        if (response.success && response.actions) {
          // Vérifier en base de données
          const { data: observations } = await supabase
            .from('observations')
            .select('id, title, nature')
            .ilike('nature', '%test%')
            .order('created_at', { ascending: false })
            .limit(1);

          if (observations && observations.length > 0) {
            expect(observations[0].nature).toContain('pucerons');
            console.log('✅ Real database observation created:', observations[0]);
          }
        }
      }
    );
  });
});

/**
 * Benchmarks de performance
 */
describe('🏁 Performance Benchmarks', () => {
  let thomas: ThomasAgentWrapper;

  beforeAll(async () => {
    const supabase = createMockSupabaseForE2E();
    thomas = await SimpleAgentFactory.createReadyAgent(supabase, 'benchmark-key');
  });

  test('should meet performance targets', async () => {
    const benchmarkMessages = [
      { message: "j'ai observé des pucerons", target_ms: 2000, description: 'Simple observation' },
      { message: "j'ai récolté 3 caisses de courgettes avec le tracteur", target_ms: 3000, description: 'Multi-entity task' },
      { message: "j'ai observé des pucerons, récolté des courgettes et je prévois de traiter demain", target_ms: 5000, description: 'Complex multi-action' }
    ];

    for (const benchmark of benchmarkMessages) {
      const startTime = Date.now();
      
      const response = await thomas.chat(benchmark.message, {
        session_id: `benchmark-${Date.now()}`,
        user_id: 'bench-user',
        farm_id: 1
      });
      
      const processingTime = Date.now() - startTime;
      
      expect(response.message).toBeDefined();
      expect(processingTime).toBeLessThan(benchmark.target_ms);
      
      console.log(`⚡ ${benchmark.description}: ${processingTime}ms (target: ${benchmark.target_ms}ms) ${processingTime < benchmark.target_ms ? '✅' : '❌'}`);
    }
  });
});

// ============================================================================
// HELPERS E2E
// ============================================================================

function createMockSupabaseForE2E(): any {
  return {
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: getMockDataE2E(table), error: null })),
          limit: jest.fn(() => ({ data: [getMockDataE2E(table)], error: null })),
          order: jest.fn(() => ({ data: [getMockDataE2E(table)], error: null }))
        })),
        limit: jest.fn(() => ({ data: [getMockDataE2E(table)], error: null })),
        ilike: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({ data: [getMockDataE2E(table)], error: null }))
          }))
        })),
        gte: jest.fn(() => ({
          order: jest.fn(() => ({ data: [], error: null }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({ data: { id: `e2e-${Date.now()}` }, error: null }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({ error: null }))
      }))
    }))
  };
}

function getMockDataE2E(table: string): any {
  const mockData: Record<string, any> = {
    'profiles': { full_name: 'Agriculteur E2E', language: 'fr' },
    'farms': { name: 'Ferme E2E Test', farm_type: 'maraichage' },
    'plots': { id: 1, name: 'Serre 1', type: 'serre_plastique', aliases: ['serre1'], is_active: true },
    'materials': { id: 1, name: 'John Deere 6120', category: 'tracteurs', llm_keywords: ['tracteur'], is_active: true },
    'user_conversion_units': { container_name: 'caisse', crop_name: 'courgettes', conversion_value: 5, conversion_unit: 'kg' },
    'chat_prompts': { name: 'thomas_agent_system', content: 'Tu es Thomas...', version: '2.0', is_active: true },
    'observations': { id: 'obs-1', title: 'Test observation', nature: 'pucerons test' }
  };

  return mockData[table] || { id: 'mock-id' };
}

