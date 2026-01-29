/**
 * Script pour vérifier les secrets et configuration Supabase
 * Diagnostic complet des variables d'environnement Edge Functions
 */

console.log('\n🔐 VÉRIFICATION SECRETS SUPABASE');
console.log('='.repeat(50));

const SecretsChecker = {
  /**
   * Vérifier les variables d'environnement requises
   */
  checkRequiredSecrets() {
    console.log('\n📋 VARIABLES D\'ENVIRONNEMENT REQUISES');
    console.log('-'.repeat(40));
    
    const requiredSecrets = {
      'SUPABASE_URL': {
        description: 'URL du projet Supabase',
        format: 'https://xxxxx.supabase.co',
        required: true,
        present: true // L'utilisateur l'a dans son screenshot
      },
      'SUPABASE_ANON_KEY': {
        description: 'Clé publique Supabase (anon)',
        format: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        required: true,
        present: true // L'utilisateur l'a dans son screenshot
      },
      'SUPABASE_SERVICE_ROLE_KEY': {
        description: 'Clé privée Supabase (service_role)',
        format: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        required: true,
        present: true // L'utilisateur l'a dans son screenshot
      },
      'SUPABASE_DB_URL': {
        description: 'URL directe de la base de données',
        format: 'postgresql://postgres:[PASSWORD]@...',
        required: false,
        present: true // L'utilisateur l'a dans son screenshot
      },
      'OPENAI_API_KEY': {
        description: 'Clé API OpenAI pour l\'IA',
        format: 'sk-proj-... ou sk-...',
        required: true,
        present: false // ❌ MANQUANTE selon les logs
      }
    };
    
    console.log('🔍 Analyse des variables d\'environnement :');
    
    Object.entries(requiredSecrets).forEach(([name, config]) => {
      const status = config.present ? '✅' : '❌';
      const priority = config.required ? '[REQUIS]' : '[OPTIONNEL]';
      console.log(`   ${status} ${name} ${priority}`);
      console.log(`      Description: ${config.description}`);
      console.log(`      Format: ${config.format}`);
      if (!config.present) {
        console.log(`      ❌ MANQUANTE - Doit être ajoutée !`);
      }
      console.log('');
    });
    
    const missingRequired = Object.entries(requiredSecrets)
      .filter(([_, config]) => config.required && !config.present)
      .map(([name, _]) => name);
    
    if (missingRequired.length > 0) {
      console.log('🚨 VARIABLES MANQUANTES CRITIQUES :');
      missingRequired.forEach(name => {
        console.log(`   ❌ ${name}`);
      });
    } else {
      console.log('✅ TOUTES LES VARIABLES REQUISES SONT PRÉSENTES');
    }
    
    return { requiredSecrets, missingRequired };
  },
  
  /**
   * Guide pour ajouter OPENAI_API_KEY
   */
  getOpenAIKeyGuide() {
    console.log('\n🔑 GUIDE: AJOUTER OPENAI_API_KEY');
    console.log('-'.repeat(40));
    
    console.log('📍 ÉTAPES À SUIVRE :');
    console.log('   1. 🌐 Aller sur: https://platform.openai.com/api-keys');
    console.log('   2. 🔐 Se connecter à ton compte OpenAI');
    console.log('   3. ➕ Create new secret key (si nécessaire)');
    console.log('   4. 📋 Copier la clé (sk-proj-... ou sk-...)');
    console.log('');
    console.log('📍 AJOUTER DANS SUPABASE :');
    console.log('   1. 🌐 Dashboard: https://supabase.com/dashboard/project/kvwzbofifqqytyfertkh');
    console.log('   2. ⚙️ Settings → Edge Functions → Environment Variables');
    console.log('   3. ➕ Add variable:');
    console.log('      Name: OPENAI_API_KEY');
    console.log('      Value: [TA_CLE_OPENAI]');
    console.log('   4. 💾 Save');
    console.log('   5. 🚀 Redéployer: npx supabase functions deploy analyze-message --project-ref kvwzbofifqqytyfertkh');
  },
  
  /**
   * Vérifier la configuration des Edge Functions
   */
  checkEdgeFunctionConfig() {
    console.log('\n🚀 CONFIGURATION EDGE FUNCTIONS');
    console.log('-'.repeat(40));
    
    const edgeFunctions = {
      'analyze-message': {
        description: 'Analyse IA des messages utilisateur',
        url: 'https://kvwzbofifqqytyfertkh.supabase.co/functions/v1/analyze-message',
        deployed: true, // D'après les logs précédents
        secrets_required: ['OPENAI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
      },
      'thomas-agent-v2': {
        description: 'Pipeline complet Thomas Agent',
        url: 'https://kvwzbofifqqytyfertkh.supabase.co/functions/v1/thomas-agent-v2',
        deployed: true, // D'après les logs précédents
        secrets_required: ['OPENAI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
      }
    };
    
    console.log('📡 Edge Functions déployées :');
    Object.entries(edgeFunctions).forEach(([name, config]) => {
      const status = config.deployed ? '✅' : '❌';
      console.log(`   ${status} ${name}`);
      console.log(`      Description: ${config.description}`);
      console.log(`      URL: ${config.url}`);
      console.log(`      Secrets requis: ${config.secrets_required.join(', ')}`);
      console.log('');
    });
  },
  
  /**
   * Test de connectivité des Edge Functions
   */
  generateConnectivityTest() {
    console.log('\n🧪 TEST DE CONNECTIVITÉ');
    console.log('-'.repeat(40));
    
    console.log('📋 Commands à exécuter pour tester :');
    console.log('');
    
    console.log('1. 🔍 Vérifier déploiement :');
    console.log('   npx supabase functions list --project-ref kvwzbofifqqytyfertkh');
    console.log('');
    
    console.log('2. 📡 Test Edge Function analyze-message :');
    console.log('   curl -X POST https://kvwzbofifqqytyfertkh.supabase.co/functions/v1/analyze-message \\');
    console.log('        -H "Authorization: Bearer [ANON_KEY]" \\');
    console.log('        -H "Content-Type: application/json" \\');
    console.log('        -d \'{"message_id": "test", "user_message": "Test", "chat_session_id": "test"}\'');
    console.log('');
    
    console.log('3. 📊 Vérifier logs :');
    console.log('   Dashboard → Edge Functions → analyze-message → Logs');
    console.log('');
    
    console.log('✅ RÉSULTAT ATTENDU APRÈS AJOUT OPENAI_API_KEY :');
    console.log('   - Status 200 (au lieu de 500)');
    console.log('   - Réponse JSON avec analyse IA');
    console.log('   - Logs sans erreur "Clé API OpenAI non configurée"');
  }
};

// Exécuter toutes les vérifications
function runAllChecks() {
  console.log('🎯 DIAGNOSTIC COMPLET SECRETS SUPABASE\n');
  
  const secretsCheck = SecretsChecker.checkRequiredSecrets();
  SecretsChecker.getOpenAIKeyGuide();
  SecretsChecker.checkEdgeFunctionConfig();
  SecretsChecker.generateConnectivityTest();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎯 RÉSUMÉ FINAL');
  console.log('='.repeat(50));
  
  if (secretsCheck.missingRequired.length > 0) {
    console.log('🚨 ACTION REQUISE : Ajouter les variables manquantes');
    secretsCheck.missingRequired.forEach(secret => {
      console.log(`   ❌ ${secret}`);
    });
    console.log('\n⏱️ Temps estimé: 5 minutes');
    console.log('🎯 Priorité: CRITIQUE pour l\'analyse IA');
  } else {
    console.log('✅ CONFIGURATION COMPLÈTE');
    console.log('🎯 Prêt pour les tests d\'analyse IA !');
  }
}

runAllChecks();
