/**
 * Test de Validation : Division Multi-Cultures
 * 
 * Teste le système de répartition proportionnelle du temps de travail
 * entre plusieurs cultures dans une même action.
 * 
 * Usage: node tests/test-multi-crop-splitting.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TEST_USER_ID = process.env.TEST_USER_ID || 'd74d6020-8252-42b6-9dcc-b6ab1aca2659';
const TEST_FARM_ID = process.env.TEST_FARM_ID || '16';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   SUPABASE_URL et SUPABASE_ANON_KEY requis dans .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Scénarios de test
const TEST_SCENARIOS = [
  {
    id: 1,
    name: 'Répartition Symétrique - 2 Cultures',
    message: "J'ai désherbé des tomates et des courgettes pendant 3 heures",
    expected: {
      taskCount: 2,
      crops: ['tomates', 'courgettes'],
      durations: [90, 90], // minutes (1h30 chacune)
      repartitionType: 'symmetrique'
    }
  },
  {
    id: 2,
    name: 'Répartition Proportionnelle - Surfaces Planches',
    message: "J'ai désherbé 4 planches de tomates et 2 planches de courgettes en 1 heure",
    expected: {
      taskCount: 2,
      crops: ['tomates', 'courgettes'],
      durations: [40, 20], // minutes (4/6 et 2/6)
      repartitionType: 'proportionnelle'
    }
  },
  {
    id: 3,
    name: 'Répartition Symétrique - 3 Cultures',
    message: "J'ai arrosé des tomates, courgettes et aubergines pendant 1h30",
    expected: {
      taskCount: 3,
      crops: ['tomates', 'courgettes', 'aubergines'],
      durations: [30, 30, 30], // minutes (30min chacune)
      repartitionType: 'symmetrique'
    }
  },
  {
    id: 4,
    name: 'Culture Unique - Pas de Split',
    message: "J'ai désherbé des tomates pendant 2 heures",
    expected: {
      taskCount: 1,
      crops: ['tomates'],
      durations: [120], // minutes (2h)
      repartitionType: 'none'
    }
  },
  {
    id: 5,
    name: 'Répartition Proportionnelle - m²',
    message: "J'ai paillé 20 m² de laitues et 10 m² de radis en 45 minutes",
    expected: {
      taskCount: 2,
      crops: ['laitues', 'radis'],
      durations: [30, 15], // minutes (20/30 et 10/30)
      repartitionType: 'proportionnelle'
    }
  }
];

/**
 * Teste un scénario spécifique
 */
async function testScenario(scenario) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 TEST ${scenario.id}: ${scenario.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📝 Message: "${scenario.message}"`);
  console.log(`🎯 Attendu: ${scenario.expected.taskCount} tâche(s), type: ${scenario.expected.repartitionType}`);

  try {
    // Appeler l'Edge Function analyze-message
    console.log('\n🔄 Envoi à l\'Edge Function...');
    const { data, error } = await supabase.functions.invoke('analyze-message', {
      body: {
        message: scenario.message,
        session_id: `test-multi-crop-${Date.now()}`,
        user_id: TEST_USER_ID,
        farm_id: TEST_FARM_ID,
        use_pipeline: true
      }
    });

    if (error) {
      console.error('❌ Erreur Edge Function:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Réponse reçue');

    // Vérifier la structure de la réponse
    if (!data || !data.actions || !Array.isArray(data.actions)) {
      console.error('❌ Structure de réponse invalide:', data);
      return { success: false, error: 'Structure de réponse invalide' };
    }

    const actions = data.actions;
    console.log(`📊 Actions détectées: ${actions.length}`);

    // Vérifier le nombre d'actions
    if (actions.length !== scenario.expected.taskCount) {
      console.error(`❌ ÉCHEC: Attendu ${scenario.expected.taskCount} action(s), reçu ${actions.length}`);
      return { success: false, error: `Nombre d'actions incorrect` };
    }

    // Vérifier chaque action
    let allValid = true;
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const expectedCrop = scenario.expected.crops[i];
      const expectedDuration = scenario.expected.durations[i];

      console.log(`\n  Action ${i + 1}:`);
      console.log(`    Culture: ${action.extracted_data?.crop} (attendu: ${expectedCrop})`);
      
      // Vérifier la culture
      const actualCrop = action.extracted_data?.crop?.toLowerCase();
      const expectedCropLower = expectedCrop.toLowerCase();
      
      if (!actualCrop || !actualCrop.includes(expectedCropLower.substring(0, 5))) {
        console.error(`    ❌ Culture incorrecte: "${actualCrop}" vs "${expectedCropLower}"`);
        allValid = false;
      } else {
        console.log(`    ✅ Culture correcte`);
      }

      // Vérifier la durée
      if (action.extracted_data?.duration) {
        const actualDuration = action.extracted_data.duration;
        const actualMinutes = actualDuration.unit === 'minutes' 
          ? actualDuration.value 
          : actualDuration.value * 60;
        
        console.log(`    Durée: ${actualMinutes} min (attendu: ${expectedDuration} min)`);
        
        // Tolérance de ±2 minutes pour les arrondis
        if (Math.abs(actualMinutes - expectedDuration) > 2) {
          console.error(`    ❌ Durée incorrecte: ${actualMinutes} vs ${expectedDuration} min`);
          allValid = false;
        } else {
          console.log(`    ✅ Durée correcte`);
        }
      } else if (expectedDuration > 0) {
        console.error(`    ❌ Durée manquante`);
        allValid = false;
      }

      // Vérifier le flag is_multi_crop
      if (scenario.expected.taskCount > 1) {
        // Pour les actions divisées, is_multi_crop devrait être false (car déjà divisé)
        console.log(`    is_multi_crop: ${action.extracted_data?.is_multi_crop || false}`);
      }
    }

    if (allValid) {
      console.log(`\n✅ TEST ${scenario.id} RÉUSSI`);
      return { success: true };
    } else {
      console.log(`\n❌ TEST ${scenario.id} ÉCHOUÉ`);
      return { success: false, error: 'Validation échouée' };
    }

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Exécute tous les tests
 */
async function runAllTests() {
  console.log('🚀 DÉMARRAGE DES TESTS MULTI-CULTURES');
  console.log('=====================================\n');

  const results = [];

  for (const scenario of TEST_SCENARIOS) {
    const result = await testScenario(scenario);
    results.push({
      id: scenario.id,
      name: scenario.name,
      success: result.success,
      error: result.error
    });

    // Pause entre les tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Résumé final
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log(`${'='.repeat(80)}\n`);

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    const status = result.success ? '✅ RÉUSSI' : '❌ ÉCHOUÉ';
    console.log(`${status} - Test ${result.id}: ${result.name}`);
    if (!result.success && result.error) {
      console.log(`         Erreur: ${result.error}`);
    }
  });

  console.log(`\n📈 Résultats: ${passed}/${results.length} tests réussis`);

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} test(s) échoué(s)`);
    process.exit(1);
  } else {
    console.log('\n🎉 Tous les tests sont passés avec succès !');
    process.exit(0);
  }
}

// Exécution
runAllTests().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
