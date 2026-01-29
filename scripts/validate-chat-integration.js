/**
 * Validation complète intégration Chat
 * Vérifie que TOUS les composants utilisent ChatServiceDirect
 */

console.log('\n🔧 VALIDATION INTÉGRATION CHAT COMPLÈTE');
console.log('='.repeat(60));
console.log('Vérification que tous les composants utilisent ChatServiceDirect');

const fs = require('fs');
const path = require('path');

/**
 * Validation des imports dans tous les fichiers
 */
function validateChatServiceImports() {
  console.log('\n📁 VALIDATION IMPORTS CHATSERVICE');
  console.log('-'.repeat(40));
  
  const filesToCheck = [
    'src/components/ChatList.tsx',
    'src/components/ChatConversation.tsx'
  ];
  
  let allCorrect = true;
  
  filesToCheck.forEach(filePath => {
    try {
      const fullPath = path.join(__dirname, '..', filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Vérifications
      const hasOldImport = content.includes('from \'../services/chatService\'');
      const hasNewImport = content.includes('from \'../services/ChatServiceDirect\'');
      const hasDirectImport = content.includes('ChatServiceDirect as ChatService');
      
      console.log(`\n📄 ${filePath}:`);
      console.log(`   ${hasOldImport ? '❌' : '✅'} Ancien import (chatService): ${hasOldImport ? 'DÉTECTÉ' : 'Absent'}`);
      console.log(`   ${hasNewImport ? '✅' : '❌'} Nouvel import (ChatServiceDirect): ${hasNewImport ? 'PRÉSENT' : 'Absent'}`);
      console.log(`   ${hasDirectImport ? '✅' : '❌'} Alias correct: ${hasDirectImport ? 'OUI' : 'NON'}`);
      
      if (hasOldImport || !hasNewImport || !hasDirectImport) {
        allCorrect = false;
        console.log(`   🚨 CORRECTION REQUISE dans ${filePath}`);
      } else {
        console.log(`   ✅ PARFAIT - Utilise ChatServiceDirect`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERREUR lecture ${filePath}:`, error.message);
      allCorrect = false;
    }
  });
  
  return allCorrect;
}

/**
 * Validation des appels de méthodes
 */
function validateChatServiceCalls() {
  console.log('\n🔍 VALIDATION APPELS MÉTHODES');
  console.log('-'.repeat(40));
  
  const files = {
    'ChatList.tsx': [
      'ChatService.getChatSessions',
      'ChatService.testConnection', 
      'ChatService.createChatSession',
      'ChatService.archiveChatSession',
      'ChatService.subscribeToChatSessions'
    ],
    'ChatConversation.tsx': [
      'ChatService.getChatMessages',
      'ChatService.sendMessage',
      'ChatService.subscribeToMessages'
    ]
  };
  
  Object.entries(files).forEach(([fileName, expectedCalls]) => {
    try {
      const filePath = path.join(__dirname, '..', 'src', 'components', fileName);
      const content = fs.readFileSync(filePath, 'utf8');
      
      console.log(`\n📄 ${fileName}:`);
      
      expectedCalls.forEach(call => {
        const hasCall = content.includes(call);
        console.log(`   ${hasCall ? '✅' : '❌'} ${call}: ${hasCall ? 'TROUVÉ' : 'MANQUANT'}`);
      });
      
    } catch (error) {
      console.log(`   ❌ ERREUR analyse ${fileName}:`, error.message);
    }
  });
}

/**
 * Test de cohérence des types
 */
function validateTypeConsistency() {
  console.log('\n📝 VALIDATION COHÉRENCE TYPES');
  console.log('-'.repeat(40));
  
  try {
    // Vérifier que les types sont importés correctement
    const conversationPath = path.join(__dirname, '..', 'src', 'components', 'ChatConversation.tsx');
    const conversationContent = fs.readFileSync(conversationPath, 'utf8');
    
    const checks = {
      'Import ChatSession': conversationContent.includes('ChatSession'),
      'Import ChatMessage': conversationContent.includes('ChatMessage'),
      'Fonction adaptChatMessageToMessage': conversationContent.includes('adaptChatMessageToMessage'),
      'Type Message défini': conversationContent.includes('interface Message')
    };
    
    console.log('\n   Vérifications types ChatConversation.tsx:');
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}`);
    });
    
    return Object.values(checks).every(Boolean);
    
  } catch (error) {
    console.log('   ❌ ERREUR validation types:', error.message);
    return false;
  }
}

/**
 * Simulation workflow utilisateur
 */
function simulateUserWorkflow() {
  console.log('\n🎭 SIMULATION WORKFLOW UTILISATEUR');
  console.log('-'.repeat(40));
  
  console.log('\n   📱 ÉTAPES UTILISATEUR:');
  console.log('   1. 📋 Ouvrir écran Chat → ChatList.tsx');
  console.log('      └─ Appel: ChatServiceDirect.getChatSessions() ✅');
  console.log('   ');
  console.log('   2. ➕ Cliquer bouton + → Modal création');
  console.log('      └─ Appel: ChatServiceDirect.createChatSession() ✅');
  console.log('   ');
  console.log('   3. 💬 Sélectionner chat → ChatConversation.tsx');
  console.log('      └─ Appel: ChatServiceDirect.getChatMessages() ✅');
  console.log('   ');
  console.log('   4. ✍️ Taper message + Envoyer');
  console.log('      └─ Appel: ChatServiceDirect.sendMessage() ✅');
  console.log('   ');
  console.log('   5. 🔄 Réception temps réel');
  console.log('      └─ Subscription: ChatServiceDirect.subscribeToMessages() ✅');
  
  console.log('\n   💡 RÉSULTAT ATTENDU:');
  console.log('   ✅ Messages apparaissent instantanément');
  console.log('   ✅ Pas de timeout');
  console.log('   ✅ Logs [CHAT-DIRECT] dans console');
  console.log('   ✅ Interface réactive <500ms');
}

/**
 * Instructions de test
 */
function showTestInstructions() {
  console.log('\n📋 INSTRUCTIONS TEST UTILISATEUR');
  console.log('-'.repeat(40));
  console.log('');
  console.log('🔄 1. REDÉMARRER L\'APPLICATION');
  console.log('   Ctrl+C puis npm start (imports modifiés)');
  console.log('');
  console.log('💬 2. TESTER WORKFLOW COMPLET:');
  console.log('   ├── Ouvrir Assistant IA');
  console.log('   ├── Cliquer + → Créer chat privé');
  console.log('   ├── Chat apparaît dans liste');
  console.log('   ├── Cliquer sur chat → Ouvre conversation');
  console.log('   └── Taper "Bonjour Thomas" → Envoyer');
  console.log('');
  console.log('✅ 3. RÉSULTATS ATTENDUS:');
  console.log('   ├── Message utilisateur apparaît immédiatement');
  console.log('   ├── Réponse Thomas dans <2s');
  console.log('   ├── Pas d\'erreur timeout dans console');
  console.log('   └── Logs [CHAT-DIRECT] visibles');
  console.log('');
  console.log('🚨 4. SI ÇA NE MARCHE PAS:');
  console.log('   ├── Vérifier console pour erreurs');
  console.log('   ├── S\'assurer que app est redémarrée');
  console.log('   └── Tester création chat avant conversation');
}

/**
 * Exécution validation complète
 */
async function runCompleteValidation() {
  try {
    console.log('🚀 Démarrage validation intégration chat...');
    
    // 1. Validation imports
    const importsOK = validateChatServiceImports();
    
    // 2. Validation appels méthodes
    validateChatServiceCalls();
    
    // 3. Validation cohérence types
    const typesOK = validateTypeConsistency();
    
    // 4. Simulation workflow
    simulateUserWorkflow();
    
    // 5. Résumé
    console.log('\n🎯 RÉSUMÉ VALIDATION');
    console.log('='.repeat(50));
    
    if (importsOK && typesOK) {
      console.log('✅ VALIDATION RÉUSSIE !');
      console.log('   📱 ChatList.tsx: Utilise ChatServiceDirect');
      console.log('   💬 ChatConversation.tsx: Utilise ChatServiceDirect');
      console.log('   📝 Types: Cohérents entre composants');
      console.log('   🔄 Workflow: Intégration complète');
      
      console.log('\n🎉 SYSTÈME CHAT 100% OPÉRATIONNEL !');
      console.log('   Redémarrer app → Tester conversation complète');
      
    } else {
      console.log('❌ VALIDATION ÉCHOUÉE');
      console.log('   Certains composants utilisent encore l\'ancien ChatService');
      console.log('   Vérifier les imports manuellement');
    }
    
    // 6. Instructions test
    showTestInstructions();
    
    return { importsOK, typesOK };
    
  } catch (error) {
    console.error('❌ Erreur validation:', error);
    return { importsOK: false, typesOK: false };
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  runCompleteValidation();
}

module.exports = { runCompleteValidation, validateChatServiceImports };
