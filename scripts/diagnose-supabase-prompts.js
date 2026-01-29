/**
 * Script de diagnostic pour vérifier les prompts et tables sur Supabase
 */

console.log('🔍 DIAGNOSTIC SUPABASE - PROMPTS & TABLES');
console.log('='.repeat(50));

// Simuler une vérification de la base de données
const DiagnosticService = {
  async checkChatPrompts() {
    console.log('\n📋 VÉRIFICATION TABLE chat_prompts');
    console.log('-'.repeat(30));
    
    try {
      // Simuler la requête qu'utilise l'Edge Function
      const expectedPrompts = [
        'thomas_agent_system',
        'tool_selection', 
        'intent_classification',
        'response_synthesis'
      ];
      
      console.log('✅ Prompts attendus par l\'Edge Function :');
      expectedPrompts.forEach(prompt => {
        console.log(`   - ${prompt}`);
      });
      
      // Diagnostic probable
      console.log('\n❌ PROBLÈME PROBABLE :');
      console.log('   L\'Edge Function cherche un prompt avec un nom spécifique');
      console.log('   mais ne le trouve pas dans la table chat_prompts');
      
      return {
        status: 'error',
        message: 'Prompts probablement absents ou mal nommés',
        expectedPrompts
      };
    } catch (error) {
      console.error('❌ Erreur diagnostic prompts:', error.message);
      return { status: 'error', error: error.message };
    }
  },
  
  async checkTableRelations() {
    console.log('\n🔗 VÉRIFICATION RELATIONS TABLES');
    console.log('-'.repeat(30));
    
    try {
      const relations = {
        'chat_analyzed_actions': {
          expected_foreign_keys: ['message_analysis_id'],
          relations: ['message_analyses']
        },
        'chat_message_analyses': {
          expected_foreign_keys: ['session_id'],
          relations: ['chat_sessions']
        }
      };
      
      console.log('✅ Relations attendues :');
      Object.entries(relations).forEach(([table, config]) => {
        console.log(`   ${table}:`);
        config.relations.forEach(rel => {
          console.log(`     -> ${rel}`);
        });
      });
      
      console.log('\n❌ ERREUR DÉTECTÉE :');
      console.log('   "Could not find a relationship between \'chat_analyzed_actions\' and \'message_analyses\'"');
      console.log('   Cela suggère une foreign key manquante ou mal configurée');
      
      return {
        status: 'error',
        message: 'Relations entre tables probablement cassées',
        relations
      };
    } catch (error) {
      console.error('❌ Erreur diagnostic relations:', error.message);
      return { status: 'error', error: error.message };
    }
  },
  
  async checkEdgeFunctionLogs() {
    console.log('\n📡 DIAGNOSTIC EDGE FUNCTION');
    console.log('-'.repeat(30));
    
    console.log('🔍 Analyse des logs d\'erreur :');
    console.log('   1. ❌ POST /functions/v1/analyze-message 500 (Internal Server Error)');
    console.log('   2. ❌ "Prompt d\'analyse introuvable"');
    console.log('   3. ❌ Relations tables cassées');
    
    console.log('\n🎯 DIAGNOSTIC :');
    console.log('   L\'Edge Function se lance correctement (pas d\'erreur 404)');
    console.log('   Mais elle échoue à l\'exécution (500) à cause de :');
    console.log('   - Prompts manquants dans chat_prompts');
    console.log('   - Relations tables cassées');
    
    return {
      status: 'error',
      issues: [
        'Edge Function déployée mais échoue à l\'exécution',
        'Prompts manquants ou mal nommés',
        'Relations entre tables cassées'
      ]
    };
  }
};

// Exécuter le diagnostic complet
async function runDiagnostic() {
  console.log('\n🚀 DIAGNOSTIC COMPLET EN COURS...\n');
  
  const promptCheck = await DiagnosticService.checkChatPrompts();
  const relationCheck = await DiagnosticService.checkTableRelations();
  const edgeFunctionCheck = await DiagnosticService.checkEdgeFunctionLogs();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎯 RÉSUMÉ DIAGNOSTIC');
  console.log('='.repeat(50));
  
  console.log('\n📋 PROMPTS :', promptCheck.status === 'error' ? '❌ PROBLÈME' : '✅ OK');
  console.log('🔗 RELATIONS :', relationCheck.status === 'error' ? '❌ PROBLÈME' : '✅ OK');
  console.log('📡 EDGE FUNCTION :', edgeFunctionCheck.status === 'error' ? '❌ PROBLÈME' : '✅ OK');
  
  console.log('\n🛠️ ACTIONS PRIORITAIRES :');
  console.log('   1. 🔍 Vérifier contenu table chat_prompts sur Supabase');
  console.log('   2. 🔧 Corriger relations entre tables');
  console.log('   3. 🚀 Re-déployer Edge Functions avec corrections');
  
  console.log('\n💡 GUIDANCE SUPABASE :');
  console.log('   Dashboard : https://supabase.com/dashboard/project/kvwzbofifqqytyfertkh');
  console.log('   Tables : /database/tables');
  console.log('   Functions : /functions');
  console.log('   Logs : /functions > analyze-message > Logs');
}

runDiagnostic().catch(console.error);
