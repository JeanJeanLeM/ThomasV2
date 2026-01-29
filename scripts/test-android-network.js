/**
 * Script de test de connectivité Android
 * À exécuter depuis l'appareil Android pour diagnostiquer les problèmes réseau
 */

import { supabase } from '../src/utils/supabase';

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testNetworkConnectivity() {
  log('\n🧪 TEST DE CONNECTIVITÉ RÉSEAU ANDROID', 'blue');
  log('='.repeat(50), 'blue');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Vérifier la configuration
  log('\n📋 Test 1: Configuration Supabase', 'yellow');
  results.total++;
  try {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error('Variables d\'environnement manquantes');
    }
    
    log(`  URL: ${url}`, 'green');
    log(`  ANON_KEY: ${key.substring(0, 20)}...`, 'green');
    log('  ✅ Configuration OK', 'green');
    results.passed++;
    results.tests.push({ name: 'Configuration', status: 'PASS' });
  } catch (error) {
    log(`  ❌ Erreur: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Configuration', status: 'FAIL', error: error.message });
  }

  // Test 2: Connexion à Supabase
  log('\n🔌 Test 2: Connexion Supabase', 'yellow');
  results.total++;
  try {
    const startTime = Date.now();
    const { data, error } = await supabase.auth.getSession();
    const duration = Date.now() - startTime;
    
    if (error) {
      throw error;
    }
    
    log(`  ✅ Connexion réussie (${duration}ms)`, 'green');
    log(`  Session: ${data.session ? 'Existante' : 'Aucune'}`, 'green');
    results.passed++;
    results.tests.push({ name: 'Connexion Supabase', status: 'PASS', duration });
  } catch (error) {
    log(`  ❌ Erreur: ${error.message}`, 'red');
    log(`  Code: ${error.code || 'N/A'}`, 'red');
    results.failed++;
    results.tests.push({ 
      name: 'Connexion Supabase', 
      status: 'FAIL', 
      error: error.message,
      code: error.code 
    });
  }

  // Test 3: Test d'authentification (sans créer de compte)
  log('\n🔐 Test 3: Endpoint Auth (ping)', 'yellow');
  results.total++;
  try {
    const startTime = Date.now();
    // Essayer de se connecter avec des identifiants invalides (pour tester l'endpoint)
    const { error } = await supabase.auth.signInWithPassword({
      email: 'test-connectivity@thomas.test',
      password: 'invalid-password-for-testing',
    });
    const duration = Date.now() - startTime;
    
    // On s'attend à une erreur "Invalid login credentials"
    // Si on reçoit une erreur réseau, c'est le problème
    if (error && (error.message.includes('Invalid') || error.message.includes('credentials'))) {
      log(`  ✅ Endpoint Auth accessible (${duration}ms)`, 'green');
      log(`  Erreur attendue: ${error.message}`, 'green');
      results.passed++;
      results.tests.push({ name: 'Endpoint Auth', status: 'PASS', duration });
    } else if (error && error.message.includes('Network')) {
      throw new Error(`Erreur réseau: ${error.message}`);
    } else {
      log(`  ⚠️ Réponse inattendue: ${error?.message || 'Aucune erreur'}`, 'yellow');
      results.passed++;
      results.tests.push({ name: 'Endpoint Auth', status: 'WARN', note: 'Réponse inattendue' });
    }
  } catch (error) {
    log(`  ❌ Erreur: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ 
      name: 'Endpoint Auth', 
      status: 'FAIL', 
      error: error.message 
    });
  }

  // Test 4: Test de requête database
  log('\n💾 Test 4: Accès Database (lecture)', 'yellow');
  results.total++;
  try {
    const startTime = Date.now();
    // Essayer de lire une table publique (sans auth)
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    const duration = Date.now() - startTime;
    
    if (error) {
      // Si c'est une erreur d'auth/RLS, c'est normal - le réseau fonctionne
      if (error.message.includes('permission') || error.message.includes('policy')) {
        log(`  ✅ Database accessible (${duration}ms)`, 'green');
        log(`  Erreur RLS attendue: ${error.message}`, 'green');
        results.passed++;
        results.tests.push({ name: 'Accès Database', status: 'PASS', duration });
      } else if (error.message.includes('Network')) {
        throw error;
      } else {
        throw error;
      }
    } else {
      log(`  ✅ Database accessible (${duration}ms)`, 'green');
      results.passed++;
      results.tests.push({ name: 'Accès Database', status: 'PASS', duration });
    }
  } catch (error) {
    log(`  ❌ Erreur: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ 
      name: 'Accès Database', 
      status: 'FAIL', 
      error: error.message 
    });
  }

  // Résumé
  log('\n📊 RÉSUMÉ DES TESTS', 'blue');
  log('='.repeat(50), 'blue');
  log(`  Total: ${results.total}`, 'yellow');
  log(`  Réussis: ${results.passed}`, 'green');
  log(`  Échoués: ${results.failed}`, 'red');
  log(`  Taux de réussite: ${((results.passed / results.total) * 100).toFixed(1)}%`, 
    results.failed === 0 ? 'green' : 'yellow');

  // Détails des échecs
  if (results.failed > 0) {
    log('\n❌ TESTS ÉCHOUÉS:', 'red');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(test => {
        log(`  • ${test.name}: ${test.error}`, 'red');
      });
  }

  // Diagnostic
  log('\n💡 DIAGNOSTIC', 'blue');
  log('='.repeat(50), 'blue');
  
  if (results.failed === 0) {
    log('  ✅ Tous les tests passent - Connexion réseau OK', 'green');
    log('  Si vous avez toujours des erreurs, vérifiez:', 'yellow');
    log('    • Les credentials utilisateur (email/password)', 'yellow');
    log('    • Les logs détaillés dans l\'app', 'yellow');
  } else {
    const hasNetworkError = results.tests.some(t => 
      t.error && t.error.toLowerCase().includes('network')
    );
    
    if (hasNetworkError) {
      log('  🔴 PROBLÈME RÉSEAU DÉTECTÉ', 'red');
      log('  Causes possibles:', 'yellow');
      log('    1. Permissions Android manquantes (INTERNET, ACCESS_NETWORK_STATE)', 'yellow');
      log('    2. Firewall ou proxy bloque les connexions', 'yellow');
      log('    3. Pas de connexion Internet active', 'yellow');
      log('    4. URL Supabase incorrecte', 'yellow');
      log('\n  Solutions:', 'green');
      log('    • Vérifier app.json contient les permissions réseau', 'green');
      log('    • Tester sur un autre réseau (4G au lieu de WiFi)', 'green');
      log('    • Rebuilder l\'APK avec les permissions correctes', 'green');
    } else {
      log('  ⚠️ Problème de configuration ou d\'authentification', 'yellow');
      log('  Le réseau semble fonctionner, mais:', 'yellow');
      log('    • Vérifier les variables d\'environnement', 'yellow');
      log('    • Vérifier la configuration Supabase', 'yellow');
    }
  }

  log('\n' + '='.repeat(50), 'blue');
  
  return results;
}

// Exécution si appelé directement
if (require.main === module) {
  testNetworkConnectivity()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      log(`\n🔥 ERREUR CRITIQUE: ${error.message}`, 'red');
      console.error(error);
      process.exit(1);
    });
}

export { testNetworkConnectivity };




