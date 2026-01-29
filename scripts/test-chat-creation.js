/**
 * Script de test création chat avec nouvelle méthode fetch() direct
 * Permet de valider que le ChatServiceDirect corrige les timeouts
 */

const { ChatServiceDirect } = require('../src/services/ChatServiceDirect');
const { ChatService } = require('../src/services/chatService');

console.log('\n🧪 TEST CRÉATION CHAT - COMPARAISON MÉTHODES');
console.log('='.repeat(70));
console.log('Test pour identifier la cause des problèmes de création de chat');
console.log('Comparaison: Client Supabase JS vs Fetch Direct');
console.log('='.repeat(70));

/**
 * Test données simulées
 */
const mockChatData = {
  farm_id: 1,
  title: 'Test Chat Creation',
  description: 'Chat de test pour valider la méthode',
  chat_type: 'general',
  is_shared: false
};

/**
 * Test avec l'ancienne méthode (client Supabase JS)
 */
async function testOldMethod() {
  console.log('\n📞 TEST ANCIENNE MÉTHODE (Client Supabase JS)');
  console.log('-'.repeat(50));
  
  try {
    const startTime = Date.now();
    console.log('⏱️ Début test à:', new Date().toLocaleTimeString());
    
    // Test connection d'abord
    console.log('🔍 Test connection...');
    const connectionTest = await ChatService.testConnection();
    
    if (!connectionTest.success) {
      console.log('❌ ÉCHEC CONNECTION:', connectionTest.error);
      return {
        method: 'Supabase JS Client',
        success: false,
        error: connectionTest.error,
        duration: Date.now() - startTime
      };
    }
    
    console.log('✅ Connection OK');
    
    // Test création chat
    console.log('📝 Tentative création chat...');
    const result = await ChatService.createChatSession(mockChatData);
    
    const duration = Date.now() - startTime;
    console.log(`✅ SUCCÈS! Durée: ${duration}ms`);
    console.log('   Session créée:', result.id);
    
    return {
      method: 'Supabase JS Client',
      success: true,
      sessionId: result.id,
      duration: duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ÉCHEC! Durée: ${duration}ms`);
    console.log('   Erreur:', error.message);
    
    return {
      method: 'Supabase JS Client',
      success: false,
      error: error.message,
      duration: duration
    };
  }
}

/**
 * Test avec la nouvelle méthode (fetch direct)
 */
async function testNewMethod() {
  console.log('\n🚀 TEST NOUVELLE MÉTHODE (Fetch Direct)');
  console.log('-'.repeat(50));
  
  try {
    const startTime = Date.now();
    console.log('⏱️ Début test à:', new Date().toLocaleTimeString());
    
    // Test connection d'abord
    console.log('🔍 Test connection...');
    const connectionTest = await ChatServiceDirect.testConnection();
    
    if (!connectionTest.success) {
      console.log('❌ ÉCHEC CONNECTION:', connectionTest.error);
      return {
        method: 'Fetch Direct',
        success: false,
        error: connectionTest.error,
        duration: Date.now() - startTime
      };
    }
    
    console.log('✅ Connection OK');
    
    // Test création chat
    console.log('📝 Tentative création chat...');
    const result = await ChatServiceDirect.createChatSession(mockChatData);
    
    const duration = Date.now() - startTime;
    console.log(`✅ SUCCÈS! Durée: ${duration}ms`);
    console.log('   Session créée:', result.id);
    
    return {
      method: 'Fetch Direct',
      success: true,
      sessionId: result.id,
      duration: duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ÉCHEC! Durée: ${duration}ms`);
    console.log('   Erreur:', error.message);
    
    return {
      method: 'Fetch Direct',
      success: false,
      error: error.message,
      duration: duration
    };
  }
}

/**
 * Test comparatif des deux méthodes
 */
async function runComparisonTest() {
  console.log('\n⚖️ COMPARAISON DES DEUX MÉTHODES');
  console.log('-'.repeat(50));
  
  // Exécuter les deux tests
  const oldMethodResult = await testOldMethod();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Pause entre tests
  const newMethodResult = await testNewMethod();
  
  // Résultats comparatifs
  console.log('\n📊 RÉSULTATS COMPARATIFS');
  console.log('='.repeat(50));
  
  console.log('\n📞 CLIENT SUPABASE JS:');
  console.log(`   Succès: ${oldMethodResult.success ? '✅ OUI' : '❌ NON'}`);
  console.log(`   Durée: ${oldMethodResult.duration}ms`);
  if (oldMethodResult.error) {
    console.log(`   Erreur: ${oldMethodResult.error}`);
  }
  if (oldMethodResult.sessionId) {
    console.log(`   Session ID: ${oldMethodResult.sessionId}`);
  }
  
  console.log('\n🚀 FETCH DIRECT:');
  console.log(`   Succès: ${newMethodResult.success ? '✅ OUI' : '❌ NON'}`);
  console.log(`   Durée: ${newMethodResult.duration}ms`);
  if (newMethodResult.error) {
    console.log(`   Erreur: ${newMethodResult.error}`);
  }
  if (newMethodResult.sessionId) {
    console.log(`   Session ID: ${newMethodResult.sessionId}`);
  }
  
  // Analyse comparative
  console.log('\n🔍 ANALYSE COMPARATIVE:');
  
  if (oldMethodResult.success && newMethodResult.success) {
    const perfDiff = newMethodResult.duration - oldMethodResult.duration;
    console.log('   📈 Performance:');
    console.log(`      Différence: ${perfDiff > 0 ? '+' : ''}${perfDiff}ms`);
    console.log(`      Amélioration: ${perfDiff < 0 ? 'Fetch Direct plus rapide' : 'Client JS plus rapide'}`);
    console.log('   ✅ Les deux méthodes fonctionnent');
  } else if (!oldMethodResult.success && newMethodResult.success) {
    console.log('   🎯 PROBLÈME IDENTIFIÉ:');
    console.log('      ❌ Client Supabase JS: ÉCHEC');
    console.log('      ✅ Fetch Direct: SUCCÈS');
    console.log('   💡 SOLUTION: Migrer vers Fetch Direct');
  } else if (oldMethodResult.success && !newMethodResult.success) {
    console.log('   ⚠️ RÉSULTAT INATTENDU:');
    console.log('      ✅ Client Supabase JS: SUCCÈS');
    console.log('      ❌ Fetch Direct: ÉCHEC');
    console.log('   🔧 Action: Vérifier implémentation Fetch Direct');
  } else {
    console.log('   🚨 PROBLÈME MAJEUR:');
    console.log('      ❌ Client Supabase JS: ÉCHEC');
    console.log('      ❌ Fetch Direct: ÉCHEC');
    console.log('   🔧 Action: Vérifier configuration Supabase');
  }
  
  return {
    oldMethod: oldMethodResult,
    newMethod: newMethodResult,
    recommendation: getRecommendation(oldMethodResult, newMethodResult)
  };
}

/**
 * Génère une recommandation basée sur les résultats
 */
function getRecommendation(oldResult, newResult) {
  if (!oldResult.success && newResult.success) {
    return {
      action: 'MIGRATE_TO_FETCH_DIRECT',
      priority: 'HIGH',
      reason: 'Client Supabase JS timeout, Fetch Direct fonctionne',
      steps: [
        '1. Remplacer ChatService par ChatServiceDirect',
        '2. Tester en production',
        '3. Monitorer performance',
        '4. Migrer autres services si nécessaire'
      ]
    };
  } else if (oldResult.success && newResult.success) {
    const perfBetter = newResult.duration < oldResult.duration;
    return {
      action: perfBetter ? 'CONSIDER_MIGRATION' : 'KEEP_CURRENT',
      priority: 'MEDIUM',
      reason: perfBetter ? 'Fetch Direct plus performant' : 'Client JS acceptable',
      steps: perfBetter ? [
        '1. Tests approfondis Fetch Direct',
        '2. Migration progressive',
        '3. Monitoring comparatif'
      ] : [
        '1. Garder Client Supabase JS',
        '2. Monitorer problèmes futurs',
        '3. Fetch Direct en backup'
      ]
    };
  } else {
    return {
      action: 'INVESTIGATE_CONFIG',
      priority: 'CRITICAL',
      reason: 'Problème configuration Supabase',
      steps: [
        '1. Vérifier URLs et clés Supabase',
        '2. Tester réseau/connectivité',
        '3. Examiner logs Supabase',
        '4. Contacter support si nécessaire'
      ]
    };
  }
}

/**
 * Test de stress pour identifier les limites
 */
async function stressTest() {
  console.log('\n💪 TEST DE STRESS - CRÉATIONS MULTIPLES');
  console.log('-'.repeat(50));
  
  const testCount = 3;
  const results = [];
  
  for (let i = 1; i <= testCount; i++) {
    console.log(`\n🔄 Test ${i}/${testCount}`);
    
    const chatData = {
      ...mockChatData,
      title: `Stress Test Chat ${i}`,
      description: `Chat de stress test numéro ${i}`
    };
    
    try {
      const startTime = Date.now();
      const result = await ChatServiceDirect.createChatSession(chatData);
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ Succès: ${duration}ms - ID: ${result.id}`);
      results.push({ success: true, duration, sessionId: result.id });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ Échec: ${duration}ms - ${error.message}`);
      results.push({ success: false, duration, error: error.message });
    }
    
    // Pause entre tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const successCount = results.filter(r => r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log('\n📊 RÉSULTATS STRESS TEST:');
  console.log(`   Succès: ${successCount}/${testCount} (${(successCount/testCount*100).toFixed(1)}%)`);
  console.log(`   Durée moyenne: ${avgDuration.toFixed(0)}ms`);
  
  if (successCount === testCount) {
    console.log('   🎉 Fetch Direct résiste au stress!');
  } else {
    console.log('   ⚠️ Problèmes détectés sous charge');
  }
  
  return results;
}

/**
 * Exécution du test complet
 */
async function runFullTest() {
  try {
    console.log('🚀 Démarrage test création chat...');
    
    // Test comparatif
    const comparisonResults = await runComparisonTest();
    
    // Test de stress si la nouvelle méthode fonctionne
    let stressResults = null;
    if (comparisonResults.newMethod.success) {
      stressResults = await stressTest();
    }
    
    // Rapport final
    console.log('\n🏁 RAPPORT FINAL');
    console.log('='.repeat(70));
    
    const rec = comparisonResults.recommendation;
    console.log(`📋 RECOMMANDATION: ${rec.action}`);
    console.log(`🚨 PRIORITÉ: ${rec.priority}`);
    console.log(`💡 RAISON: ${rec.reason}`);
    console.log('\n📝 ÉTAPES RECOMMANDÉES:');
    rec.steps.forEach(step => console.log(`   ${step}`));
    
    if (stressResults) {
      const successRate = stressResults.filter(r => r.success).length / stressResults.length;
      console.log(`\n💪 RÉSISTANCE STRESS: ${(successRate * 100).toFixed(1)}% réussite`);
    }
    
    console.log('\n✅ Test terminé - Consultez les résultats ci-dessus');
    
    return {
      comparison: comparisonResults,
      stress: stressResults,
      recommendation: rec
    };
    
  } catch (error) {
    console.error('❌ Erreur pendant test:', error);
    throw error;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  runFullTest().catch(console.error);
}

module.exports = {
  testOldMethod,
  testNewMethod,
  runComparisonTest,
  stressTest,
  runFullTest
};
