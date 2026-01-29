/**
 * Test de discrimination observation vs task_done
 * 
 * Valide que Thomas Agent v2.1 distingue correctement :
 * - Observations (constats) : "J'ai observé des dégâts"
 * - Tâches (actions) : "J'ai inspecté les serres"
 */

const TEST_CASES = {
  observations: [
    {
      id: 1,
      message: "J'ai observé des dégâts de mineuse sur les tomates",
      expected_intent: "observation_creation",
      expected_action_type: "observation",
      reason: "Problème spécifique (dégâts mineuse)"
    },
    {
      id: 2,
      message: "J'ai vu des pucerons dans la serre 1",
      expected_intent: "observation_creation",
      expected_action_type: "observation",
      reason: "Ravageur identifié (pucerons)"
    },
    {
      id: 3,
      message: "J'ai remarqué un jaunissement des feuilles",
      expected_intent: "observation_creation",
      expected_action_type: "observation",
      reason: "Symptôme physiologique"
    },
    {
      id: 4,
      message: "J'ai constaté un problème d'arrosage",
      expected_intent: "observation_creation",
      expected_action_type: "observation",
      reason: "Problème identifié"
    },
    {
      id: 5,
      message: "Des limaces sur les salades ce matin",
      expected_intent: "observation_creation",
      expected_action_type: "observation",
      reason: "Ravageur sans verbe explicite"
    },
    {
      id: 6,
      message: "J'ai observé des traces de mildiou",
      expected_intent: "observation_creation",
      expected_action_type: "observation",
      reason: "Maladie identifiée"
    },
    {
      id: 7,
      message: "J'ai vu que les plants sont flétris",
      expected_intent: "observation_creation",
      expected_action_type: "observation",
      reason: "Symptôme de stress"
    }
  ],

  tasks: [
    {
      id: 8,
      message: "J'ai inspecté les serres ce matin",
      expected_intent: "task_done",
      expected_action_type: "task_done",
      reason: "Action de surveillance"
    },
    {
      id: 9,
      message: "J'ai fait le tour des parcelles",
      expected_intent: "task_done",
      expected_action_type: "task_done",
      reason: "Action générique"
    },
    {
      id: 10,
      message: "J'ai surveillé les cultures pendant 2h",
      expected_intent: "task_done",
      expected_action_type: "task_done",
      reason: "Action avec durée"
    },
    {
      id: 11,
      message: "J'ai vérifié l'état des plants",
      expected_intent: "task_done",
      expected_action_type: "task_done",
      reason: "Action de contrôle"
    },
    {
      id: 12,
      message: "J'ai contrôlé toutes les serres avec Jean",
      expected_intent: "task_done",
      expected_action_type: "task_done",
      reason: "Action collaborative"
    },
    {
      id: 13,
      message: "J'ai observé les cultures",
      expected_intent: "task_done",
      expected_action_type: "task_done",
      reason: "Action générique sans problème"
    },
    {
      id: 14,
      message: "Inspection complète du tunnel nord",
      expected_intent: "task_done",
      expected_action_type: "task_done",
      reason: "Action sans problème"
    }
  ],

  edge_cases: [
    {
      id: 15,
      message: "J'ai observé",
      expected_intent: "unclear",
      expected_action_type: null,
      reason: "Trop vague, devrait demander clarification"
    },
    {
      id: 16,
      message: "J'ai observé les tomates",
      expected_intent: "task_done",
      expected_action_type: "task_done",
      reason: "Pas de problème mentionné"
    },
    {
      id: 17,
      message: "J'ai observé les tomates qui ont des pucerons",
      expected_intent: "observation_creation",
      expected_action_type: "observation",
      reason: "Problème présent malgré formulation complexe"
    },
    {
      id: 18,
      message: "Surveillance des cultures toute la journée, rien à signaler",
      expected_intent: "task_done",
      expected_action_type: "task_done",
      reason: "Action + pas de problème"
    },
    {
      id: 19,
      message: "Tour des parcelles : pucerons serre 1",
      expected_intent: "observation_creation",
      expected_action_type: "observation",
      reason: "Problème identifié malgré format télégraphique"
    }
  ],

  multiple_actions: [
    {
      id: 20,
      message: "J'ai inspecté les serres et observé des pucerons",
      expected_intents: ["task_done", "observation_creation"],
      expected_action_types: ["task_done", "observation"],
      reason: "2 actions distinctes"
    },
    {
      id: 21,
      message: "Fait le tour, vu des limaces sur salades",
      expected_intents: ["task_done", "observation_creation"],
      expected_action_types: ["task_done", "observation"],
      reason: "Action puis constat"
    }
  ]
};

// Statistiques globales
let stats = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  categories: {
    observations: { passed: 0, failed: 0 },
    tasks: { passed: 0, failed: 0 },
    edge_cases: { passed: 0, failed: 0 },
    multiple_actions: { passed: 0, failed: 0 }
  }
};

/**
 * Valide un cas de test unique
 */
function validateTestCase(testCase, category, actualResult) {
  stats.total++;
  
  const success = actualResult.action_type === testCase.expected_action_type;
  
  if (success) {
    stats.passed++;
    stats.categories[category].passed++;
    console.log(`  ✅ Test ${testCase.id}: ${testCase.message.substring(0, 50)}...`);
    console.log(`     → Correct: ${actualResult.action_type} (confiance: ${(actualResult.confidence * 100).toFixed(0)}%)`);
  } else {
    stats.failed++;
    stats.categories[category].failed++;
    console.log(`  ❌ Test ${testCase.id}: ${testCase.message.substring(0, 50)}...`);
    console.log(`     → Attendu: ${testCase.expected_action_type}`);
    console.log(`     → Obtenu: ${actualResult.action_type}`);
    console.log(`     → Raison: ${testCase.reason}`);
  }
  
  console.log('');
}

/**
 * Génère le rapport final
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 RAPPORT DE TEST - DISCRIMINATION OBSERVATION VS TASK');
  console.log('='.repeat(80));
  
  console.log('\n📈 RÉSULTATS GLOBAUX:');
  console.log(`   Total tests: ${stats.total}`);
  console.log(`   ✅ Réussis: ${stats.passed} (${((stats.passed / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Échoués: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
  
  console.log('\n📊 RÉSULTATS PAR CATÉGORIE:');
  
  for (const [category, results] of Object.entries(stats.categories)) {
    const total = results.passed + results.failed;
    if (total > 0) {
      const percentage = ((results.passed / total) * 100).toFixed(1);
      const status = percentage >= 95 ? '✅' : percentage >= 80 ? '⚠️' : '❌';
      console.log(`   ${status} ${category}: ${results.passed}/${total} (${percentage}%)`);
    }
  }
  
  console.log('\n🎯 MÉTRIQUES CIBLES:');
  
  const globalPrecision = ((stats.passed / stats.total) * 100).toFixed(1);
  console.log(`   Précision globale: ${globalPrecision}% ${globalPrecision >= 90 ? '✅' : '❌'} (cible: >90%)`);
  
  const obsCategory = stats.categories.observations;
  const obsPrecision = obsCategory.passed + obsCategory.failed > 0 
    ? ((obsCategory.passed / (obsCategory.passed + obsCategory.failed)) * 100).toFixed(1)
    : 0;
  console.log(`   Précision observations: ${obsPrecision}% ${obsPrecision >= 95 ? '✅' : '❌'} (cible: >95%)`);
  
  const tasksCategory = stats.categories.tasks;
  const tasksPrecision = tasksCategory.passed + tasksCategory.failed > 0
    ? ((tasksCategory.passed / (tasksCategory.passed + tasksCategory.failed)) * 100).toFixed(1)
    : 0;
  console.log(`   Précision tâches: ${tasksPrecision}% ${tasksPrecision >= 95 ? '✅' : '❌'} (cible: >95%)`);
  
  console.log('\n🚀 RECOMMANDATION:');
  
  if (globalPrecision >= 90 && obsPrecision >= 95 && tasksPrecision >= 95) {
    console.log('   ✅ DÉPLOIEMENT EN PRODUCTION RECOMMANDÉ');
    console.log('   La discrimination fonctionne correctement.');
  } else if (globalPrecision >= 80) {
    console.log('   ⚠️ AMÉLIORATION NÉCESSAIRE');
    console.log('   La discrimination fonctionne mais peut être optimisée.');
  } else {
    console.log('   ❌ NE PAS DÉPLOYER');
    console.log('   La discrimination nécessite des corrections majeures.');
  }
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Point d'entrée principal
 * 
 * USAGE:
 * 1. Tester manuellement via l'interface chat
 * 2. Récupérer les résultats depuis les logs ou la DB
 * 3. Appeler validateTestCase() pour chaque cas
 * 4. Appeler generateReport() à la fin
 */
async function runTests() {
  console.log('🧪 TEST DE DISCRIMINATION OBSERVATION VS TASK_DONE\n');
  console.log('⚠️  Ce script est un template pour validation manuelle.');
  console.log('    Intégrez-le avec votre système de test pour automatisation.\n');
  
  console.log('📋 CAS DE TEST DISPONIBLES:');
  console.log(`   - ${TEST_CASES.observations.length} observations (constats)`);
  console.log(`   - ${TEST_CASES.tasks.length} tâches (actions)`);
  console.log(`   - ${TEST_CASES.edge_cases.length} cas limites`);
  console.log(`   - ${TEST_CASES.multiple_actions.length} actions multiples`);
  
  console.log('\n📖 INSTRUCTIONS:');
  console.log('   1. Déployez la migration 022_fix_observation_discrimination.sql');
  console.log('   2. Testez chaque message via l\'interface chat');
  console.log('   3. Récupérez les résultats (logs ou DB)');
  console.log('   4. Appelez validateTestCase() pour valider');
  console.log('   5. Générez le rapport avec generateReport()');
  
  console.log('\n💡 EXEMPLE D\'UTILISATION:');
  console.log(`
// Après avoir testé le message "J'ai observé des dégâts..."
const result = {
  action_type: 'observation',  // depuis les logs
  confidence: 0.95
};

validateTestCase(TEST_CASES.observations[0], 'observations', result);
  `);
  
  console.log('\n🔗 VOIR AUSSI:');
  console.log('   - docs/OBSERVATION_VS_TASK_TESTING.md pour guide complet');
  console.log('   - supabase/Migrations/022_fix_observation_discrimination.sql');
}

// Exporter pour utilisation externe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TEST_CASES,
    validateTestCase,
    generateReport,
    runTests
  };
}

// Si exécuté directement
if (require.main === module) {
  runTests();
}


