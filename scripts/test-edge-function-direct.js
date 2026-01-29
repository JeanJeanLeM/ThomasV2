/**
 * Test direct de l'Edge Function analyze-message
 * Pour diagnostiquer les prompts et les erreurs
 */

console.log('\n📡 TEST DIRECT EDGE FUNCTION');
console.log('='.repeat(50));

const EdgeFunctionTester = {
  async testAnalyzeMessage() {
    console.log('\n🎯 TEST analyze-message Edge Function');
    console.log('-'.repeat(40));
    
    const testPayload = {
      message_id: 'test-analysis-' + Date.now(),
      user_message: "J'ai observé des pucerons sur les tomates",
      chat_session_id: "test-session-123"
    };
    
    console.log('📤 Payload de test :');
    console.log(JSON.stringify(testPayload, null, 2));
    
    try {
      const response = await fetch('https://kvwzbofifqqytyfertkh.supabase.co/functions/v1/analyze-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2d3pib2ZpZnFxeXR5ZmVydGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg3NDg5NDMsImV4cCI6MjA0NDMyNDk0M30.Q_X8pQ0YqGWCVNvXmTLWCDXFcE0tP4q2n0EDPTxmLR0' // Token public anon
        },
        body: JSON.stringify(testPayload)
      });
      
      console.log(`\n📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Réponse Edge Function :');
        console.log(JSON.stringify(data, null, 2));
        return { status: 'success', data };
      } else {
        const errorData = await response.text();
        console.log('❌ Erreur Edge Function :');
        console.log(errorData);
        return { 
          status: 'error', 
          httpStatus: response.status,
          error: errorData 
        };
      }
    } catch (error) {
      console.error('❌ Erreur réseau:', error.message);
      return { status: 'network_error', error: error.message };
    }
  },
  
  async testEdgeFunctionDiagnostic() {
    console.log('\n🔍 DIAGNOSTIC DÉTAILLÉ');
    console.log('-'.repeat(40));
    
    const result = await this.testAnalyzeMessage();
    
    if (result.status === 'success') {
      console.log('\n✅ EDGE FUNCTION OPÉRATIONNELLE !');
      console.log('   Les prompts sont accessibles et l\'analyse fonctionne');
    } else if (result.status === 'error') {
      console.log('\n❌ EDGE FUNCTION ÉCHOUE :');
      console.log(`   HTTP Status: ${result.httpStatus}`);
      console.log(`   Erreur: ${result.error}`);
      
      if (result.error.includes('Prompt d\'analyse introuvable')) {
        console.log('\n💡 DIAGNOSTIC :');
        console.log('   - Les prompts ne sont PAS dans la base de données');
        console.log('   - Ou ils ne sont pas nommés correctement');
        console.log('   - Vérifier table chat_prompts sur Supabase Dashboard');
      }
    } else {
      console.log('\n🌐 PROBLÈME RÉSEAU');
      console.log('   Impossible de joindre l\'Edge Function');
    }
    
    return result;
  }
};

// Mock fetch pour les environnements qui ne l'ont pas
if (typeof fetch === 'undefined') {
  console.log('⚠️ Fetch non disponible dans cet environnement');
  console.log('   Test simulé - Résultats basés sur les logs d\'erreur précédents');
  
  EdgeFunctionTester.testAnalyzeMessage = async () => {
    return {
      status: 'error',
      httpStatus: 500,
      error: '{"error": "Prompt d\'analyse introuvable", "success": false}'
    };
  };
}

// Exécuter le test
EdgeFunctionTester.testEdgeFunctionDiagnostic()
  .then(result => {
    console.log('\n' + '='.repeat(50));
    console.log('🎯 CONCLUSION DIAGNOSTIC');
    console.log('='.repeat(50));
    
    if (result.status === 'success') {
      console.log('✅ Edge Function opérationnelle - Le problème est ailleurs');
    } else if (result.httpStatus === 500 && result.error.includes('Prompt')) {
      console.log('🎯 PROBLÈME CONFIRMÉ : PROMPTS MANQUANTS');
      console.log('\n🛠️ SOLUTION :');
      console.log('   1. 🔍 Vérifier Supabase Dashboard > Database > Tables > chat_prompts');
      console.log('   2. 📋 Compter les prompts existants');
      console.log('   3. 🚀 Re-exécuter migration 021_insert_default_prompts.sql si vide');
      console.log('   4. ✅ Re-tester l\'analyse IA');
    } else {
      console.log('❓ Autre problème détecté - Analyse approfondie nécessaire');
    }
  })
  .catch(error => {
    console.error('💥 Erreur critique:', error);
  });
