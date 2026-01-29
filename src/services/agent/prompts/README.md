# 📝 Thomas Agent - Prompt Management System

## 🎯 Vue d'ensemble

Système de gestion avancé des prompts pour Thomas Agent avec versioning, testing et templates modulaires.

---

## 🏗️ Architecture

```
prompts/
├── PromptTemplateEngine.ts        # Moteur de templates avec variables
├── PromptTestingService.ts        # Tests automatisés + A/B testing  
├── AdvancedPromptManager.ts       # Gestionnaire principal avec cache
├── PromptConfigurationService.ts  # Interface de configuration
├── templates/
│   └── ThomasAgentPrompts.ts     # Templates modulaires
└── index.ts                       # Factory + initialisation
```

---

## 🚀 Utilisation Rapide

### 1. **Initialisation Système**

```typescript
import { ThomasAgentFactory } from '../agent';

// Création agent avec système complet
const agent = await ThomasAgentFactory.createAgent(
  supabaseClient, 
  openAIApiKey
);
// ✅ Prompts déployés automatiquement
```

### 2. **Utilisation Prompts Contextuels**

```typescript
import { PromptManagerFactory } from '../agent/prompts';

const promptManager = await PromptManagerFactory.createConfiguredManager(
  supabaseClient,
  openAIApiKey  
);

// Prompt avec variables contextuelles
const systemPrompt = await promptManager.getContextualPrompt(
  'thomas_agent_system',
  agentContext,
  { special_instruction: 'Focus on precision' }
);
```

### 3. **Testing et Validation**

```typescript
// Test d'un prompt
const testCases = testingService.generateTestCases(farmContext);
const results = await testingService.runTestSuite(prompt, testCases);

console.log(`Success rate: ${(results.success_rate * 100).toFixed(1)}%`);
```

---

## 📋 Templates Disponibles

### **thomas_agent_system v2.0**
Prompt système principal avec instructions complètes

**Variables**: `{{farm_name}}`, `{{user_name}}`, `{{farm_context}}`, `{{available_tools}}`  
**Conditions**: `{{#if first_time_user}}`, `{{#if has_plots}}`
**Usage**: Contexte complet pour l'agent

### **tool_selection v2.0**  
Classification et sélection intelligente des tools

**Output**: JSON structuré avec tools sélectionnés
**Usage**: Autonomie de l'agent pour sélection tools

### **intent_classification v2.0**
Classification précise des intentions utilisateur

**Output**: JSON avec intention + confiance + entités
**Usage**: Compréhension intention avant tool selection

### **response_synthesis v1.0**
Synthèse des résultats tools en réponse naturelle

**Input**: Résultats tools + contexte
**Output**: Réponse française naturelle
**Usage**: Communication finale avec utilisateur

---

## 🔧 Gestion via Supabase Dashboard

### **Commandes SQL Rapides**

```sql
-- 📋 Lister tous les prompts actifs
SELECT name, version, char_length(content) as length, updated_at
FROM chat_prompts 
WHERE is_active = true 
ORDER BY name;

-- 🔧 Modifier un prompt (créer nouvelle version)
UPDATE chat_prompts SET is_active = false WHERE name = 'thomas_agent_system';

INSERT INTO chat_prompts (name, content, version, is_active)
VALUES ('thomas_agent_system', 'NOUVEAU_CONTENU', '2.1', true);

-- 🔄 Rollback vers version précédente
UPDATE chat_prompts SET is_active = false WHERE name = 'thomas_agent_system';
UPDATE chat_prompts SET is_active = true WHERE name = 'thomas_agent_system' AND version = '2.0';

-- 📊 Voir historique versions
SELECT name, version, is_active, created_at, char_length(content) as length
FROM chat_prompts 
WHERE name = 'thomas_agent_system' 
ORDER BY version DESC;
```

### **Dashboard de Santé**

```typescript
import { PromptConfigurationService } from './PromptConfigurationService';

const configService = new PromptConfigurationService(supabase, promptManager);
const dashboard = await configService.generateHealthDashboard();

console.log(dashboard); // Markdown report complet
```

---

## 🧪 Testing et Optimisation

### **Tests Automatisés**

```typescript
// Test suite complet
const testResults = await testingService.runTestSuite(prompt, testCases);

// A/B testing entre versions
const abResults = await promptManager.runABTest(
  'thomas_agent_system',
  '2.0',
  '2.1',
  testCases
);

// Auto-optimisation
const optimization = await promptManager.autoOptimizePrompt(
  'thomas_agent_system',
  'performance' // ou 'accuracy', 'token_efficiency'
);
```

### **Métriques Performance**

```typescript
// Rapport de performance sur 7 jours  
const report = await promptManager.getPromptPerformanceReport('thomas_agent_system', 7);

console.log(`Performance: ${report.performance_grade}`);
console.log(`Success rate: ${(report.success_rate * 100).toFixed(1)}%`);
console.log(`Avg time: ${report.avg_processing_time_ms}ms`);
```

---

## 🔄 Workflow de Mise à Jour

### 1. **Développement Local**
```typescript
// Test nouveau prompt
const newContent = `Nouveau contenu optimisé...`;
const updateResult = await promptManager.updatePrompt(
  'thomas_agent_system',
  newContent,
  examples,
  metadata,
  true // Run tests
);
```

### 2. **Validation**
```typescript
// Validation avant déploiement
if (updateResult.test_results?.regression_detected) {
  console.log('🚨 Régression détectée - ne pas déployer');
  return;
}
```

### 3. **Rollback si Nécessaire**
```typescript
// Rollback vers version stable
await promptManager.rollbackPrompt('thomas_agent_system', '2.0');
```

---

## ⚙️ Configuration Interface

### **Export/Import Configuration**

```typescript
// Export configuration complète
const exportData = await configService.exportConfiguration();

// Import dans autre environnement
const importResult = await configService.importConfiguration(
  exportData,
  { overwrite: true, validate: true }
);
```

### **Scripts de Déploiement**

```sql
-- Exécuter pour déployer prompts par défaut
\i supabase/Migrations/021_insert_default_prompts.sql
```

---

## 🎯 Variables de Template Disponibles

### **Variables Standard**
- `{{farm_name}}` - Nom de l'exploitation
- `{{user_name}}` - Nom de l'utilisateur  
- `{{current_date}}` - Date actuelle français
- `{{farm_context}}` - Contexte ferme formaté
- `{{available_tools}}` - Liste tools disponibles

### **Variables Helper Functions**
- `{{formatDate date}}` - Formatage date français
- `{{formatNumber num}}` - Formatage nombre français
- `{{pluralize count singular plural}}` - Pluralisation
- `{{truncate text length}}` - Limitation longueur
- `{{joinList items}}` - Join avec "et" français

### **Conditions**  
- `{{#if has_plots}}...{{/if}}` - Si parcelles configurées
- `{{#if has_materials}}...{{/if}}` - Si matériels disponibles
- `{{#if first_time_user}}...{{/if}}` - Si nouvel utilisateur
- `{{#unless condition}}...{{/unless}}` - Condition inverse

---

## 📊 Monitoring et Métriques

### **Statistiques Disponibles**
- Taux de succès par prompt
- Temps de traitement moyen  
- Usage des tools par prompt
- Tendances performance
- Erreurs fréquentes

### **Alertes Automatiques**
- Régression détectée (< 10% succès)
- Performance dégradée (> 5s traitement)  
- Erreurs critiques répétées
- Cache volumineux (> 100 MB)

---

## 🚨 Troubleshooting

### **Erreurs Courantes**

**"Prompt non trouvé"**
```sql
-- Vérifier existence
SELECT * FROM chat_prompts WHERE name = 'thomas_agent_system';

-- Réactiver si inactif
UPDATE chat_prompts SET is_active = true WHERE name = 'thomas_agent_system' AND version = '2.0';
```

**"Template rendering error"**
```typescript
// Vérifier variables manquantes
const validation = templateEngine.validateTemplate(prompt.content);
console.log(validation.errors);
```

**"Tests failing"**
```typescript
// Analyser résultats détaillés  
const results = await testingService.runTestSuite(prompt, testCases);
results.results.filter(r => !r.passed).forEach(failure => {
  console.log(`❌ ${failure.test_case_name}: ${failure.error_message}`);
});
```

---

*Documentation Phase 5 - Prompt Management System*  
*Thomas Agent v2.0 - Architecture Fondatrice*

