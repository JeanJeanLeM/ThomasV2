#!/usr/bin/env node

/**
 * Test Runner Simple - Thomas Agent Prompts Quality
 * Tests concrets des prompts système avec résultats visuels
 */

console.log('🧪 THOMAS AGENT v2.0 - TESTS QUALITÉ PROMPTS\n');
console.log('='.repeat(60));

// ============================================================================
// DONNÉES TEST RÉALISTES
// ============================================================================

const MOCK_CONTEXT = {
  user: {
    id: 'user-123',
    name: 'Jean Dupont',
    farm_id: 1
  },
  farm: {
    id: 1,
    name: 'Ferme des Trois Chênes',
    plots: [
      { id: 1, name: 'Serre 1', type: 'serre_plastique', aliases: ['serre1', 'grande serre'] },
      { id: 2, name: 'Tunnel Nord', type: 'tunnel', aliases: ['tunnel_n', 'tunnel_nord'] },
      { id: 3, name: 'Plein Champ 1', type: 'plein_champ', aliases: ['pc1', 'champ1'] }
    ],
    materials: [
      { id: 1, name: 'John Deere 6120', category: 'tracteurs', llm_keywords: ['tracteur', 'john deere'] },
      { id: 2, name: 'Pulvérisateur 200L', category: 'outils_tracteur', llm_keywords: ['pulvérisateur', 'atomiseur'] }
    ],
    conversions: [
      { container_name: 'caisse', crop_name: 'courgettes', conversion_value: 5, conversion_unit: 'kg', slugs: ['caisses', 'casier'] },
      { container_name: 'panier', crop_name: 'tomates', conversion_value: 2.5, conversion_unit: 'kg', slugs: ['paniers'] }
    ]
  },
  availableTools: ['create_observation', 'create_task_done', 'create_task_planned', 'create_harvest', 'manage_plot', 'help']
};

const SYSTEM_PROMPT_V2 = `Tu es **Thomas**, assistant agricole français spécialisé dans l'analyse des communications d'agriculteurs.

## 🌾 Contexte Exploitation
**Ferme**: {{farm_name}}
**Utilisateur**: {{user_name}}
**Date**: {{current_date}}

{{farm_context}}

## 🛠️ Tools Disponibles
Tu peux utiliser les tools suivants pour aider l'utilisateur:

{{available_tools}}

## 📋 Instructions Principales

### 1. **Analyse Intelligente**
- Identifie toutes les actions agricoles concrètes dans chaque message
- Détermine l'intention principale : observation, tâche réalisée, tâche planifiée, récolte, aide
- Extrais les entités : parcelles, cultures, quantités, matériels, dates

### 2. **Utilisation Autonome des Tools**
- Sélectionne automatiquement les tools appropriés pour chaque action identifiée
- Utilise le matching intelligent pour parcelles, matériels et conversions
- Gère les actions multiples dans un seul message

### 3. **Contextualisation Agricole**
- Utilise les données de l'exploitation (parcelles, matériels, conversions personnalisées)
- Applique les conversions automatiques (ex: "3 caisses" → "15 kg")
- Catégorise automatiquement (ravageurs, maladies, etc.)

### 4. **Communication Française Naturelle**
- Réponds en français naturel et professionnel
- Utilise le vocabulaire agricole approprié
- Confirme les actions créées avec détails pertinents
- Sois concis mais informatif

## 🎯 Types d'Actions Supportées

### **Observations** (create_observation)
Constats terrain : maladies, ravageurs, problèmes physiologiques, conditions météo

### **Tâches Réalisées** (create_task_done)  
Travaux accomplis : plantation, récolte, traitement, entretien

### **Tâches Planifiées** (create_task_planned)
Travaux futurs : programmation, scheduling, rappels

### **Récoltes Spécialisées** (create_harvest)
Récoltes avec métriques : quantités, qualité, rendement

## 🚨 Gestion des Erreurs - Protocole Strict

Si tool échoue:
1. **Explique clairement** le problème en français
2. **Propose solutions alternatives** concrètes et applicables
3. **Continue avec autres actions** si message contient actions multiples

{{#if first_time_user}}
## 🌟 Message de Bienvenue
Bienvenue ! Je peux vous aider à configurer vos parcelles, matériel et conversions.
{{/if}}

{{#if has_plots}}
## 📍 Vos Parcelles Configurées
Parfait ! Avec vos parcelles configurées, je peux faire un matching précis.
{{/if}}

## ⚡ Instructions Finales
- **Toujours répondre en français**
- **Être précis mais concis** dans les confirmations  
- **Proposer des suggestions** pertinentes selon le contexte
- **Maintenir ton professionnel et bienveillant**`;

// ============================================================================
// TESTS EXÉCUTION
// ============================================================================

async function runAllPromptTests() {
  console.log('🚀 Démarrage tests qualité prompts Thomas Agent...\n');
  
  let totalTests = 0;
  let passedTests = 0;
  const results = [];

  // TEST 1: Structure et Variables
  console.log('📋 [TEST 1/6] VALIDATION STRUCTURE TEMPLATE');
  console.log('-'.repeat(50));
  
  const structureTest = testTemplateStructure();
  results.push(structureTest);
  totalTests++;
  if (structureTest.passed) passedTests++;
  
  console.log(`Résultat: ${structureTest.passed ? '✅ PASSÉ' : '❌ ÉCHEC'} (Score: ${(structureTest.score * 100).toFixed(1)}%)\n`);

  // TEST 2: Rendu Contextuel
  console.log('🔧 [TEST 2/6] RENDU TEMPLATE CONTEXTUEL');
  console.log('-'.repeat(50));
  
  const renderTest = testContextualRendering();
  results.push(renderTest);
  totalTests++;
  if (renderTest.passed) passedTests++;
  
  console.log(`Résultat: ${renderTest.passed ? '✅ PASSÉ' : '❌ ÉCHEC'} (Score: ${(renderTest.score * 100).toFixed(1)}%)\n`);

  // TEST 3: Vocabulaire Agricole
  console.log('🌾 [TEST 3/6] VOCABULAIRE AGRICOLE FRANÇAIS');
  console.log('-'.repeat(50));
  
  const vocabTest = testAgriculturalVocabulary();
  results.push(vocabTest);
  totalTests++;
  if (vocabTest.passed) passedTests++;
  
  console.log(`Résultat: ${vocabTest.passed ? '✅ PASSÉ' : '❌ ÉCHEC'} (Score: ${(vocabTest.score * 100).toFixed(1)}%)\n`);

  // TEST 4: Conditions Logiques
  console.log('🔀 [TEST 4/6] CONDITIONS LOGIQUES');
  console.log('-'.repeat(50));
  
  const conditionsTest = testConditionalLogic();
  results.push(conditionsTest);
  totalTests++;
  if (conditionsTest.passed) passedTests++;
  
  console.log(`Résultat: ${conditionsTest.passed ? '✅ PASSÉ' : '❌ ÉCHEC'} (Score: ${(conditionsTest.score * 100).toFixed(1)}%)\n`);

  // TEST 5: Performance Rendu
  console.log('⚡ [TEST 5/6] PERFORMANCE RENDU');
  console.log('-'.repeat(50));
  
  const perfTest = testRenderingPerformance();
  results.push(perfTest);
  totalTests++;
  if (perfTest.passed) passedTests++;
  
  console.log(`Résultat: ${perfTest.passed ? '✅ PASSÉ' : '❌ ÉCHEC'} (Temps: ${perfTest.avg_time}ms)\n`);

  // TEST 6: Scénarios Réalistes  
  console.log('🎯 [TEST 6/6] SCÉNARIOS AGRICOLES RÉALISTES');
  console.log('-'.repeat(50));
  
  const scenarioTest = testRealisticScenarios();
  results.push(scenarioTest);
  totalTests++;  
  if (scenarioTest.passed) passedTests++;
  
  console.log(`Résultat: ${scenarioTest.passed ? '✅ PASSÉ' : '❌ ÉCHEC'} (Score: ${(scenarioTest.score * 100).toFixed(1)}%)\n`);

  // RÉSULTATS FINAUX
  console.log('='.repeat(60));
  console.log('📊 RÉSULTATS TESTS PROMPTS THOMAS AGENT v2.0');
  console.log('='.repeat(60));
  
  const successRate = (passedTests / totalTests * 100).toFixed(1);
  const overallScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  
  console.log(`🎯 Tests réussis: ${passedTests}/${totalTests} (${successRate}%)`);
  console.log(`📊 Score global: ${(overallScore * 100).toFixed(1)}%`);
  console.log(`🏆 Qualité: ${getQualityGrade(parseFloat(successRate))}`);

  if (parseFloat(successRate) >= 80) {
    console.log('\n🎉 PROMPTS VALIDÉS - PRÊTS POUR PRODUCTION !');
    console.log('✅ Qualité suffisante pour déploiement');
    console.log('🚀 Architecture Thomas Agent opérationnelle');
  } else {
    console.log('\n⚠️ AMÉLIORATIONS RECOMMANDÉES');
    console.log('🔧 Optimiser prompts avant déploiement production');
  }

  // Recommandations détaillées
  console.log('\n💡 RECOMMANDATIONS DÉTAILLÉES:');
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length === 0) {
    console.log('✨ Aucune amélioration critique nécessaire');
    console.log('🎯 Monitoring performance en production recommandé');
    console.log('🔄 Tests A/B pour optimisations futures');
  } else {
    failedTests.forEach(test => {
      console.log(`🔧 ${test.name}: ${test.recommendation || 'Révision nécessaire'}`);
    });
  }

  return {
    total: totalTests,
    passed: passedTests,
    success_rate: parseFloat(successRate),
    overall_score: overallScore,
    grade: getQualityGrade(parseFloat(successRate)),
    production_ready: parseFloat(successRate) >= 80
  };
}

// ============================================================================
// IMPLÉMENTATIONS TESTS INDIVIDUELS
// ============================================================================

function testTemplateStructure() {
  console.log('Validation nom, version, contenu...');
  
  const test = { name: 'Structure Template', passed: false, score: 0, errors: [] };
  let checks = 0;
  let passed = 0;

  // Check 1: Version format
  const versionCheck = '2.0'.match(/^\d+\.\d+$/);
  checks++; if (versionCheck) passed++;
  console.log(`  ${versionCheck ? '✅' : '❌'} Version format: 2.0`);

  // Check 2: Content length
  const lengthCheck = SYSTEM_PROMPT_V2.length > 500;
  checks++; if (lengthCheck) passed++;
  console.log(`  ${lengthCheck ? '✅' : '❌'} Contenu suffisant: ${SYSTEM_PROMPT_V2.length} chars`);

  // Check 3: Variables présentes  
  const variables = ['{{farm_name}}', '{{user_name}}', '{{farm_context}}', '{{available_tools}}'];
  variables.forEach(variable => {
    const hasVar = SYSTEM_PROMPT_V2.includes(variable);
    checks++; if (hasVar) passed++;
    console.log(`  ${hasVar ? '✅' : '❌'} Variable: ${variable}`);
  });

  // Check 4: Sections principales
  const sections = ['Instructions Principales', 'Types d\'Actions', 'Gestion des Erreurs'];
  sections.forEach(section => {
    const hasSection = SYSTEM_PROMPT_V2.includes(section);
    checks++; if (hasSection) passed++;
    console.log(`  ${hasSection ? '✅' : '❌'} Section: ${section}`);
  });

  test.score = passed / checks;
  test.passed = test.score >= 0.8;
  
  return test;
}

function testContextualRendering() {
  console.log('Test rendu avec contexte ferme réaliste...');
  
  const test = { name: 'Rendu Contextuel', passed: false, score: 0 };
  
  // Simulation rendu template
  let rendered = SYSTEM_PROMPT_V2
    .replace(/\{\{farm_name\}\}/g, MOCK_CONTEXT.farm.name)
    .replace(/\{\{user_name\}\}/g, MOCK_CONTEXT.user.name) 
    .replace(/\{\{current_date\}\}/g, '24 novembre 2024');
  
  // Farm context formaté
  const farmContext = `Parcelles actives (${MOCK_CONTEXT.farm.plots.length}):
• ${MOCK_CONTEXT.farm.plots.map(p => `${p.name} (${p.type})`).join('\n• ')}

Matériels (${MOCK_CONTEXT.farm.materials.length}):
• ${MOCK_CONTEXT.farm.materials.map(m => `${m.name} (${m.category})`).join('\n• ')}

Conversions personnalisées (${MOCK_CONTEXT.farm.conversions.length}):
• ${MOCK_CONTEXT.farm.conversions.map(c => `${c.container_name} (${c.crop_name}) = ${c.conversion_value} ${c.conversion_unit}`).join('\n• ')}`;

  rendered = rendered.replace(/\{\{farm_context\}\}/g, farmContext);
  
  // Available tools
  const toolsList = MOCK_CONTEXT.availableTools.map(tool => `- **${tool}**: Tool agricole spécialisé`).join('\n');
  rendered = rendered.replace(/\{\{available_tools\}\}/g, toolsList);

  // Validations
  const checks = [
    { check: rendered.includes('Ferme des Trois Chênes'), desc: 'Nom ferme inclus' },
    { check: rendered.includes('Jean Dupont'), desc: 'Nom utilisateur inclus' },
    { check: rendered.includes('Serre 1'), desc: 'Parcelles contextuelles' },
    { check: rendered.includes('John Deere'), desc: 'Matériels contextuels' },
    { check: rendered.includes('caisse'), desc: 'Conversions contextuelles' },
    { check: rendered.includes('create_observation'), desc: 'Tools disponibles' },
    { check: !rendered.includes('{{'), desc: 'Variables toutes remplacées' },
    { check: rendered.length > SYSTEM_PROMPT_V2.length * 1.5, desc: 'Template étendu significativement' }
  ];

  let passed = 0;
  checks.forEach(({ check, desc }) => {
    if (check) passed++;
    console.log(`  ${check ? '✅' : '❌'} ${desc}`);
  });

  test.score = passed / checks.length;
  test.passed = test.score >= 0.8;

  console.log(`  📏 Taille finale: ${rendered.length} chars (expansion: +${((rendered.length / SYSTEM_PROMPT_V2.length - 1) * 100).toFixed(0)}%)`);
  
  return test;
}

function testAgriculturalVocabulary() {
  console.log('Analyse vocabulaire agricole spécialisé...');
  
  const test = { name: 'Vocabulaire Agricole', passed: false, score: 0 };

  // Vocabulaire agricole français critique
  const requiredVocabulary = [
    // Actions agricoles
    { term: 'plantation', category: 'actions' },
    { term: 'récolte', category: 'actions' },
    { term: 'traitement', category: 'actions' },
    { term: 'observation', category: 'actions' },
    
    // Infrastructures
    { term: 'serre', category: 'infrastructure' },
    { term: 'tunnel', category: 'infrastructure' },
    { term: 'parcelle', category: 'infrastructure' },
    
    // Problèmes agricoles
    { term: 'pucerons', category: 'ravageurs' },
    { term: 'ravageurs', category: 'problemes' },
    { term: 'maladies', category: 'problemes' },
    
    // Cultures
    { term: 'tomates', category: 'cultures' },
    { term: 'courgettes', category: 'cultures' },
    
    // Matériel
    { term: 'tracteur', category: 'materiel' },
    { term: 'matériel', category: 'materiel' }
  ];

  const foundByCategory = {};
  let totalFound = 0;

  requiredVocabulary.forEach(({ term, category }) => {
    const found = SYSTEM_PROMPT_V2.toLowerCase().includes(term.toLowerCase());
    
    if (!foundByCategory[category]) foundByCategory[category] = { found: 0, total: 0 };
    foundByCategory[category].total++;
    
    if (found) {
      foundByCategory[category].found++;
      totalFound++;
      console.log(`  ✅ ${term} (${category})`);
    } else {
      console.log(`  ❌ ${term} (${category}) - MANQUANT`);
    }
  });

  // Analyse par catégorie
  console.log('\n  📊 Analyse par catégorie:');
  Object.entries(foundByCategory).forEach(([category, stats]) => {
    const rate = (stats.found / stats.total * 100).toFixed(1);
    console.log(`    🎯 ${category}: ${stats.found}/${stats.total} (${rate}%)`);
  });

  test.score = totalFound / requiredVocabulary.length;
  test.passed = test.score >= 0.75; // 75% vocabulaire minimum

  console.log(`  📊 Score global vocabulaire: ${(test.score * 100).toFixed(1)}%`);

  return test;
}

function testConditionalLogic() {
  console.log('Test conditions first_time_user et has_plots...');
  
  const test = { name: 'Conditions Logiques', passed: false, score: 0 };

  // Test nouveau utilisateur (pas de parcelles)
  const newUserTemplate = SYSTEM_PROMPT_V2;
  const hasFirstTimeCondition = newUserTemplate.includes('{{#if first_time_user}}') && 
                                newUserTemplate.includes('Bienvenue');
  
  // Test utilisateur expérimenté (avec parcelles)
  const hasExperiencedCondition = newUserTemplate.includes('{{#if has_plots}}');

  const conditionChecks = [
    { check: hasFirstTimeCondition, desc: 'Condition first_time_user avec message bienvenue' },
    { check: hasExperiencedCondition, desc: 'Condition has_plots pour utilisateurs expérimentés' },
    { check: newUserTemplate.includes('{{/if}}'), desc: 'Conditions correctement fermées' }
  ];

  let passed = 0;
  conditionChecks.forEach(({ check, desc }) => {
    if (check) passed++;
    console.log(`  ${check ? '✅' : '❌'} ${desc}`);
  });

  test.score = passed / conditionChecks.length;
  test.passed = test.score >= 0.8;

  return test;
}

function testRenderingPerformance() {
  console.log('Benchmark temps de rendu template...');
  
  const test = { name: 'Performance Rendu', passed: false, score: 0 };
  const iterations = 20;
  const times = [];

  // Simulation rendering multiple fois
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    
    // Rendu complet simulé
    let rendered = SYSTEM_PROMPT_V2
      .replace(/\{\{farm_name\}\}/g, MOCK_CONTEXT.farm.name)
      .replace(/\{\{user_name\}\}/g, MOCK_CONTEXT.user.name)
      .replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString('fr-FR'))
      .replace(/\{\{farm_context\}\}/g, 'Contexte ferme formaté...')
      .replace(/\{\{available_tools\}\}/g, MOCK_CONTEXT.availableTools.join(', '));
    
    const renderTime = Date.now() - startTime;
    times.push(renderTime);
  }

  const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);

  console.log(`  📊 Performance ${iterations} rendus:`);
  console.log(`    ⏱️ Temps moyen: ${avgTime.toFixed(1)}ms`);
  console.log(`    ⏱️ Temps max: ${maxTime}ms`); 
  console.log(`    ⏱️ Temps min: ${minTime}ms`);

  // Critères performance
  const perfChecks = [
    { check: avgTime < 20, desc: `Temps moyen < 20ms (${avgTime.toFixed(1)}ms)`, weight: 0.4 },
    { check: maxTime < 50, desc: `Temps max < 50ms (${maxTime}ms)`, weight: 0.3 },
    { check: times.every(t => t < 100), desc: 'Tous rendus < 100ms', weight: 0.3 }
  ];

  let weightedScore = 0;
  perfChecks.forEach(({ check, desc, weight }) => {
    if (check) weightedScore += weight;
    console.log(`  ${check ? '✅' : '⚠️'} ${desc}`);
  });

  test.score = weightedScore;
  test.passed = test.score >= 0.7;
  test.avg_time = avgTime.toFixed(1);

  return test;
}

function testRealisticScenarios() {
  console.log('Test scénarios agricoles français réalistes...');
  
  const test = { name: 'Scénarios Réalistes', passed: false, score: 0, scenarios: [] };

  const agriculturalScenarios = [
    {
      message: "j'ai observé des pucerons sur mes tomates dans la serre 1",
      expected_elements: ['observation', 'pucerons', 'tomates', 'serre'],
      intent: 'observation_creation',
      tools: ['create_observation']
    },
    {
      message: "j'ai récolté 3 caisses de courgettes ce matin avec le tracteur",
      expected_elements: ['récolté', 'caisses', 'courgettes', 'tracteur'],
      intent: 'harvest',
      tools: ['create_harvest', 'create_task_done']
    },
    {
      message: "je vais faire un traitement anti-pucerons demain matin dans toutes les serres",
      expected_elements: ['traitement', 'demain', 'matin', 'serres'],
      intent: 'task_planned',
      tools: ['create_task_planned']
    },
    {
      message: "comment je peux créer une nouvelle parcelle pour mes futurs semis ?",
      expected_elements: ['comment', 'créer', 'parcelle', 'nouveaux'],
      intent: 'help',
      tools: ['help', 'manage_plot']
    }
  ];

  let scenariosPassed = 0;

  agriculturalScenarios.forEach((scenario, index) => {
    console.log(`\n  🌾 Scénario ${index + 1}: "${scenario.message.substring(0, 40)}..."`);
    
    const scenarioResult = { message: scenario.message, checks: [], passed: false };
    
    // Analyse du message dans contexte prompt
    const fullPrompt = SYSTEM_PROMPT_V2
      .replace(/\{\{farm_name\}\}/g, MOCK_CONTEXT.farm.name)
      .replace(/\{\{user_name\}\}/g, MOCK_CONTEXT.user.name);

    // Vérifications contextuelles
    const contextChecks = [
      { check: fullPrompt.includes('create_observation'), desc: 'Tool observation disponible' },
      { check: fullPrompt.includes('create_harvest'), desc: 'Tool récolte disponible' },
      { check: fullPrompt.includes('Serre 1'), desc: 'Parcelle contextualisée' },
      { check: fullPrompt.includes('courgettes'), desc: 'Conversion contextualisée' }
    ];

    let scenarioChecks = 0;
    let scenarioPassed = 0;

    contextChecks.forEach(({ check, desc }) => {
      scenarioChecks++;
      if (check) scenarioPassed++;
      console.log(`    ${check ? '✅' : '⚠️'} ${desc}`);
    });

    // Simulation classification intention (basique)
    const messageLower = scenario.message.toLowerCase();
    let detectedIntent = 'unclear';
    
    if (messageLower.includes('observé') || messageLower.includes('constaté')) detectedIntent = 'observation_creation';
    else if (messageLower.includes('récolté') || messageLower.includes('ramassé')) detectedIntent = 'harvest';  
    else if (messageLower.includes('vais') || messageLower.includes('demain')) detectedIntent = 'task_planned';
    else if (messageLower.includes('comment') || messageLower.includes('?')) detectedIntent = 'help';

    const intentCorrect = detectedIntent === scenario.intent;
    scenarioChecks++;
    if (intentCorrect) scenarioPassed++;
    console.log(`    ${intentCorrect ? '✅' : '❌'} Intent détecté: ${detectedIntent} (attendu: ${scenario.intent})`);

    scenarioResult.passed = scenarioPassed >= scenarioChecks * 0.75;
    scenarioResult.score = scenarioPassed / scenarioChecks;
    
    if (scenarioResult.passed) {
      scenariosPassed++;
      console.log(`    🎯 Scénario ${index + 1}: ✅ VALIDÉ (${(scenarioResult.score * 100).toFixed(1)}%)`);
    } else {
      console.log(`    ⚠️ Scénario ${index + 1}: Améliorations suggérées`);
    }

    test.scenarios.push(scenarioResult);
  });

  test.score = scenariosPassed / agriculturalScenarios.length;
  test.passed = test.score >= 0.75;

  console.log(`\n  📊 Scénarios validés: ${scenariosPassed}/${agriculturalScenarios.length}`);

  return test;
}

function getQualityGrade(percentage) {
  if (percentage >= 95) return '🌟 A+ (Excellence)';
  if (percentage >= 90) return '✨ A (Très Bon)';
  if (percentage >= 80) return '✅ B (Bon - Production Ready)';
  if (percentage >= 70) return '⚠️ C (Acceptable - Améliorations recommandées)';
  if (percentage >= 60) return '🔧 D (Insuffisant - Révision nécessaire)';
  return '🚨 F (Échec - Refonte requise)';
}

// ============================================================================
// EXÉCUTION
// ============================================================================

if (require.main === module) {
  runAllPromptTests()
    .then(results => {
      console.log(`\n🏁 Tests terminés: ${results.production_ready ? 'PRODUCTION READY' : 'NEEDS IMPROVEMENT'} 🏁`);
      process.exit(results.production_ready ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ ERREUR CRITIQUE TESTS:', error.message);
      process.exit(1);
    });
}

module.exports = { runAllPromptTests };
