# 🧪 Tests de Validation Agent

Script automatisé pour tester l'analyse agent sur 10 scénarios variés.

## 🚀 Installation

```bash
# Installer tsx (TypeScript executor)
npm install -g tsx

# OU utiliser npx (pas d'installation globale)
# npx tsx tests/agent-analysis-validation.ts
```

## ⚙️ Configuration

1. Copier `config.example.ts` vers `config.ts` :
   ```bash
   cp tests/config.example.ts tests/config.ts
   ```

2. Éditer `tests/config.ts` avec vos vraies valeurs :
   ```typescript
   export const TEST_CONFIG = {
     SUPABASE_URL: 'https://votre-projet.supabase.co',
     SUPABASE_ANON_KEY: 'votre-clé-anon',
     TEST_USER_ID: 'votre-user-id-test',
     TEST_FARM_ID: 1
   }
   ```

## 🏃 Exécution

```bash
# Depuis la racine du projet
tsx tests/agent-analysis-validation.ts
```

## 📊 Rapport Généré

Le script génère un rapport détaillé avec :

- ✅ Taux de succès global (%)
- ⏱️ Temps de traitement moyen
- ❌ Liste des tests échoués avec détails
- 🔍 Points faibles identifiés par catégorie
- 💡 Recommandations d'amélioration

## 🧪 Cas de Test

Le script teste 10 scénarios variés :

1. **Observation simple** - "J'ai observé des pucerons sur les tomates"
2. **Récolte avec quantité** - "J'ai récolté 10 kg de tomates"
3. **Tâche avec durée** - "J'ai passé la herse pendant 2 heures"
4. **Multi-actions (2)** - Récolte + Observation
5. **Question aide** - "Comment créer une nouvelle parcelle ?"
6. **Récolte sans quantité** - "J'ai récolté des courgettes ce matin"
7. **Multi-actions (3)** - Semis + Observation + Récolte
8. **Action complexe avec outil** - Traitement avec pulvérisateur
9. **Observation sans culture** - "J'ai observé des limaces dans la serre"
10. **Récolte unité non-standard** - "J'ai récolté 3 caisses de tomates"

## 📈 Exemple de Sortie

```
🧪 Démarrage des tests de validation de l'analyse agent

📊 Nombre de tests: 10
🌐 Environment: https://xxx.supabase.co
👤 User ID: test-user-validation
🏭 Farm ID: 1

🔍 Test test-01: Observation simple
   Message: "J'ai observé des pucerons sur les tomates"
   ✅ SUCCÈS (2847ms)

🔍 Test test-02: Récolte avec quantité
   Message: "J'ai récolté 10 kg de tomates"
   ✅ SUCCÈS (3156ms)

...

================================================================================
📊 RAPPORT DE VALIDATION
================================================================================

✅ Succès: 8/10 (80.0%)
❌ Échecs: 2/10
⏱️  Temps moyen: 3248ms

❌ TESTS ÉCHOUÉS:

  test-07 - Multi-actions (3)
     Message: "J'ai semé des radis, observé du mildiou..."
     • Nombre d'actions incorrect: attendu 3, reçu 2

🔍 POINTS FAIBLES IDENTIFIÉS:

  • Détection multi-actions: 1 occurrence(s)
  • Extraction quantité: 1 occurrence(s)

💡 RECOMMANDATIONS:

  ✅ Bon! La plupart des cas fonctionnent.
  → Améliorer les prompts pour les cas échoués avant production.
```

## 🔄 Workflow Recommandé

1. **Exécuter les tests** initiaux
2. **Identifier** les points faibles dans le rapport
3. **Ajuster** les prompts (`029_*.sql`, `030_*.sql`)
4. **Redéployer** les migrations et Edge Functions
5. **Ré-exécuter** les tests pour valider
6. **Répéter** jusqu'à atteindre >90% de succès

## 📝 Ajouter Vos Propres Tests

Éditer `tests/agent-analysis-validation.ts` et ajouter dans `TEST_CASES` :

```typescript
{
  id: 'test-11',
  name: 'Votre cas de test',
  message: "Votre message de test",
  expected: {
    action_count: 1,
    actions: [
      { 
        type: 'observation', 
        crop: 'tomates', 
        issue: 'pucerons' 
      }
    ]
  }
}
```

## 🐛 Troubleshooting

**Erreur "SUPABASE_ANON_KEY not configured"**
→ Vérifier que le fichier `.env` existe et contient les bonnes clés

**Erreur "Farm not found"**
→ Vérifier que `TEST_FARM_ID` correspond à une ferme existante

**Tous les tests échouent**
→ Vérifier que les Edge Functions sont déployées et que les prompts v3.0 sont actifs

