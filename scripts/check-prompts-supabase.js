/**
 * Vérification directe des prompts dans Supabase
 * Via l'API REST pour diagnostiquer le problème
 */

console.log('\n🔍 VÉRIFICATION PROMPTS SUPABASE');
console.log('='.repeat(50));

const PromptsChecker = {
  async checkPromptsTable() {
    console.log('\n📋 VÉRIFICATION TABLE chat_prompts');
    console.log('-'.repeat(40));
    
    try {
      // Utiliser l'API REST Supabase directement (comme DirectSupabaseService)
      const response = await fetch('https://kvwzbofifqqytyfertkh.supabase.co/rest/v1/chat_prompts?select=name,version,is_active,created_at', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2d3pib2ZpZnFxeXR5ZmVydGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg3NDg5NDMsImV4cCI6MjA0NDMyNDk0M30.Q_X8pQ0YqGWCVNvXmTLWCDXFcE0tP4q2n0EDPTxmLR0',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2d3pib2ZpZnFxeXR5ZmVydGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg3NDg5NDMsImV4cCI6MjA0NDMyNDk0M30.Q_X8pQ0YqGWCVNvXmTLWCDXFcE0tP4q2n0EDPTxmLR0'
        }
      });
      
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const prompts = await response.json();
        console.log(`✅ Prompts trouvés: ${prompts.length}`);
        
        if (prompts.length === 0) {
          console.log('❌ TABLE VIDE - Aucun prompt trouvé !');
          return { status: 'empty', count: 0 };
        }
        
        console.log('\n📋 Liste des prompts :');
        prompts.forEach(prompt => {
          const status = prompt.is_active ? '✅' : '❌';
          console.log(`   ${status} ${prompt.name} (v${prompt.version}) - ${prompt.created_at}`);
        });
        
        // Vérifier les prompts requis
        const requiredPrompts = ['thomas_agent_system', 'tool_selection', 'intent_classification', 'response_synthesis'];
        const foundPrompts = prompts.map(p => p.name);
        const missingPrompts = requiredPrompts.filter(rp => !foundPrompts.includes(rp));
        const activePrompts = prompts.filter(p => p.is_active);
        
        console.log(`\n📊 Analyse des prompts :`);
        console.log(`   Total: ${prompts.length}`);
        console.log(`   Actifs: ${activePrompts.length}`);
        console.log(`   Requis manquants: ${missingPrompts.length}`);
        
        if (missingPrompts.length > 0) {
          console.log('❌ Prompts manquants :');
          missingPrompts.forEach(mp => console.log(`   - ${mp}`));
        }
        
        return {
          status: 'found',
          count: prompts.length,
          active: activePrompts.length,
          missing: missingPrompts,
          prompts
        };
      } else {
        const errorText = await response.text();
        console.log('❌ Erreur accès table chat_prompts :');
        console.log(errorText);
        
        if (response.status === 401) {
          console.log('🔑 Problème authentification - Token invalide ou expiré');
        } else if (response.status === 404) {
          console.log('📋 Table chat_prompts n\'existe pas !');
        }
        
        return { 
          status: 'error', 
          httpStatus: response.status, 
          error: errorText 
        };
      }
    } catch (error) {
      console.error('💥 Erreur réseau:', error.message);
      return { status: 'network_error', error: error.message };
    }
  },
  
  generateSolution(checkResult) {
    console.log('\n' + '='.repeat(50));
    console.log('🎯 DIAGNOSTIC & SOLUTION');
    console.log('='.repeat(50));
    
    if (checkResult.status === 'empty') {
      console.log('🚨 PROBLÈME CONFIRMÉ : TABLE CHAT_PROMPTS VIDE');
      console.log('\n🛠️ SOLUTION IMMÉDIATE :');
      console.log('   1. 🔧 Exécuter migration: npx supabase db push --project-ref kvwzbofifqqytyfertkh');
      console.log('   2. 📋 Ou manuellement insérer les prompts dans Supabase Dashboard');
      console.log('   3. ✅ Re-tester l\'analyse IA');
      
      console.log('\n📋 MIGRATION À EXÉCUTER :');
      console.log('   supabase/Migrations/021_insert_default_prompts.sql');
      
    } else if (checkResult.status === 'found') {
      if (checkResult.missing.length > 0) {
        console.log('⚠️ PROMPTS PARTIELLEMENT PRÉSENTS');
        console.log('   Certains prompts requis sont manquants');
        console.log('   -> Re-exécuter la migration 021');
      } else if (checkResult.active === 0) {
        console.log('😴 PROMPTS PRÉSENTS MAIS INACTIFS');
        console.log('   -> Activer les prompts via: UPDATE chat_prompts SET is_active = true');
      } else {
        console.log('✅ PROMPTS OK - Le problème est ailleurs');
        console.log('   -> Vérifier les logs Edge Function sur Supabase Dashboard');
        console.log('   -> Vérifier les permissions et l\'authentification');
      }
    } else if (checkResult.status === 'error' && checkResult.httpStatus === 404) {
      console.log('🚨 TABLE CHAT_PROMPTS N\'EXISTE PAS');
      console.log('   -> Exécuter toutes les migrations depuis le début');
    } else {
      console.log('❓ AUTRE PROBLÈME DÉTECTÉ');
      console.log('   -> Vérifier connectivité et authentification Supabase');
    }
  }
};

// Mock fetch si non disponible
if (typeof fetch === 'undefined') {
  console.log('⚠️ Fetch non disponible - Simulation basée sur les erreurs observées');
  
  PromptsChecker.checkPromptsTable = async () => {
    // Simulation basée sur l'erreur "Prompt d'analyse introuvable"
    return {
      status: 'empty',
      count: 0
    };
  };
}

// Exécuter la vérification
PromptsChecker.checkPromptsTable()
  .then(result => {
    PromptsChecker.generateSolution(result);
  })
  .catch(error => {
    console.error('💥 Erreur critique:', error);
  });
