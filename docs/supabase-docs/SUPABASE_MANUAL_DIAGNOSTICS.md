# 🔍 DIAGNOSTIC MANUEL SUPABASE - GUIDE ÉTAPE PAR ÉTAPE

## 🚨 **PROBLÈMES IDENTIFIÉS**

D'après les logs, nous avons **2 problèmes majeurs** :

1. **❌ "Prompt d'analyse introuvable"** - Edge Function échoue
2. **✅ Relations tables corrigées** - `message_analyses` → `chat_message_analyses`

---

## 🎯 **GUIDE DIAGNOSTIC MANUEL**

### **ÉTAPE 1 : Vérifier les Prompts sur Dashboard Supabase**

#### **1.1 Accéder au Dashboard**
🌐 **URL** : https://supabase.com/dashboard/project/kvwzbofifqqytyfertkh

#### **1.2 Naviguer vers la Table chat_prompts**
1. ➡️ Cliquer sur **"Database"** (sidebar gauche)
2. ➡️ Cliquer sur **"Tables"**  
3. ➡️ Chercher et cliquer sur **`chat_prompts`**

#### **1.3 Vérifier le Contenu**
**✅ Attendu :** La table doit contenir **4 prompts** :
- `thomas_agent_system`
- `tool_selection`
- `intent_classification` 
- `response_synthesis`

**❌ Si VIDE** : Les prompts ne sont pas insérés → **Aller à l'Étape 2**

**❌ Si PARTIELS** : Certains prompts manquent → **Aller à l'Étape 2**

**✅ Si COMPLETS** : Les prompts existent → **Aller à l'Étape 3**

---

### **ÉTAPE 2 : Insérer les Prompts Manuellement (si absents)**

#### **2.1 Utiliser l'Éditeur SQL**
1. ➡️ **Database** → **SQL Editor**
2. ➡️ **New query**

#### **2.2 Copier-Coller ce Script SQL**

```sql
-- Insérer les 4 prompts requis par Thomas Agent
INSERT INTO public.chat_prompts (name, content, examples, version, is_active, metadata) 
VALUES (
  'thomas_agent_system',
  'Tu es **Thomas**, assistant agricole français spécialisé dans l''analyse des communications d''agriculteurs.

## 🌾 Contexte Exploitation
- **Exploitation** : {{farm_name}}
- **Utilisateur** : Agriculteur expérimenté
- **Langue** : Français exclusivement

## 🎯 Mission Principale
Analyser les messages agricoles et extraire :
- **Actions** : Tâches réalisées ou planifiées
- **Observations** : États des cultures, problèmes, évolutions
- **Contexte** : Parcelles, matériaux, quantités, timing

## 🔧 Tools Disponibles
- **ObservationTool** : Enregistrer observations (parasites, maladies, croissance)
- **TaskDoneTool** : Enregistrer tâches accomplies (semis, traitement, récolte)
- **TaskPlannedTool** : Planifier tâches futures avec dates
- **HarvestTool** : Enregistrer récoltes avec quantités
- **HelpTool** : Aide et conseils agricoles

## 📝 Instructions Importantes
1. **Français uniquement** - Toutes communications en français
2. **Précision** - Extraire données exactes (quantités, dates, parcelles)
3. **Matching** - Utiliser noms existants de parcelles/matériaux si possibles
4. **Contexte** - Considérer saison, météo, pratiques usuelles
5. **Réponses** - Concises, professionnelles, utiles à l''agriculteur

Analyse le message suivant et identifie les actions à exécuter.',
  '[]'::jsonb,
  '2.0',
  true,
  '{"category": "system", "purpose": "thomas_agent_system", "language": "french", "context_variables": ["farm_name", "farm_context"], "output_format": "structured"}'::jsonb
),
(
  'tool_selection',
  'Analyse ce message agricole et identifie précisément quels tools utiliser.

## 📤 Message Utilisateur
"{{user_message}}"

## 🏗️ Contexte Exploitation  
{{farm_context}}

## 🔧 Tools Disponibles
- **ObservationTool** : Observations, états cultures, problèmes détectés
- **TaskDoneTool** : Tâches accomplies (semis, traitement, récolte, etc.)
- **TaskPlannedTool** : Tâches futures à planifier avec dates/horaires
- **HarvestTool** : Récoltes avec quantités et qualité
- **HelpTool** : Questions, conseils, aide technique

## 📋 Instructions Classification
1. **Analyser intention** principale du message
2. **Identifier actions** concrètes mentionnées
3. **Sélectionner tools** appropriés (un ou plusieurs)
4. **Ordonner par priorité** si plusieurs tools

## 🎯 Format Réponse
Réponds uniquement en JSON :
```json
{
  "selected_tools": ["ToolName1", "ToolName2"],
  "reasoning": "Explication en français",
  "confidence": 0.95
}
```

Analyse maintenant le message et sélectionne les tools.',
  '[
    {
      "input": "J''ai semé des carottes dans la parcelle nord ce matin",
      "output": {
        "selected_tools": ["TaskDoneTool"],
        "reasoning": "Message décrit une tâche accomplie (semis) avec parcelle spécifiée",
        "confidence": 0.98
      }
    }
  ]'::jsonb,
  '2.0',
  true,
  '{"category": "classification", "purpose": "tool_selection", "output_format": "json", "temperature": 0.1, "variables": ["user_message", "farm_context", "available_tools"]}'::jsonb
),
(
  'intent_classification',
  'Classifie précisément l''intention de ce message agricole français.

## 📤 Message
"{{user_message}}"

## 🎯 Types d''Intentions Possibles
- **task_done** : Tâche accomplie (passé)
- **task_planned** : Tâche à planifier (futur)
- **observation** : Constatation, état, problème
- **harvest** : Récolte avec quantités
- **help** : Question, demande conseil
- **mixed** : Plusieurs intentions combinées

## 🔍 Critères Classification
- **Temps verbal** : Passé composé → task_done, Futur → task_planned
- **Verbes d''action** : semer, traiter, récolter → task_done/planned
- **Verbes d''observation** : voir, constater, observer → observation
- **Questions** : comment, quand, pourquoi → help
- **Quantités + récolte** : harvest spécifiquement

## 🎯 Format Réponse
Réponds uniquement en JSON :
```json
{
  "primary_intent": "task_done",
  "confidence": 0.92,
  "secondary_intents": [],
  "details": {
    "tense": "passé_composé",
    "action_verbs": ["semé"],
    "entities": ["carottes", "parcelle nord"]
  }
}
```

Classifie maintenant l''intention du message.',
  '[
    {
      "input": "J''ai traité les tomates contre le mildiou hier",
      "output": {
        "primary_intent": "task_done",
        "confidence": 0.96,
        "secondary_intents": [],
        "details": {
          "tense": "passé_composé",
          "action_verbs": ["traité"],
          "entities": ["tomates", "mildiou"]
        }
      }
    }
  ]'::jsonb,
  '2.0',
  true,
  '{"category": "classification", "purpose": "intent_classification", "output_format": "json", "temperature": 0.1, "variables": ["user_message"]}'::jsonb
),
(
  'response_synthesis',
  'Synthétise les résultats des tools en une réponse française naturelle et professionnelle.

## 🔧 Résultats Tools
{{tools_results}}

## 👤 Message Original Utilisateur
"{{user_message}}"

## 🎯 Instructions Synthèse
1. **Ton professionnel** mais chaleureux
2. **Français naturel** - Éviter jargon technique excessif
3. **Résumé actions** exécutées par les tools
4. **Confirmation** des données enregistrées
5. **Conseils pertinents** si appropriés
6. **Encouragement** positif pour l''agriculteur

## 📋 Structure Réponse
- **Salutation** : "Parfait Thomas !" ou "Bien noté !"
- **Confirmation** : Résumer ce qui a été enregistré
- **Détails** : Préciser parcelles, quantités, dates si pertinents
- **Conseil** : Suggestion ou recommandation (optionnel)
- **Clôture** : Encouragement ou proposition d''aide

## ✨ Exemples de Ton
- "Parfait ! J''ai bien enregistré..."
- "Excellente nouvelle pour..."
- "Merci pour cette information précieuse..."
- "N''hésitez pas à me tenir informé de..."

Génère maintenant une réponse naturelle et engageante.',
  '[
    {
      "input": "Tâche enregistrée : semis carottes, parcelle nord",
      "output": "Parfait Thomas ! J''ai bien enregistré votre semis de carottes dans la parcelle nord. Excellente période pour les carottes ! N''oubliez pas de surveiller l''arrosage les premiers jours. Tenez-moi au courant de la levée !"
    }
  ]'::jsonb,
  '1.0',
  true,
  '{"category": "synthesis", "purpose": "response_synthesis", "output_format": "text", "temperature": 0.3, "variables": ["tools_results", "user_message"]}'::jsonb
);
```

#### **2.3 Exécuter le Script**
➡️ Cliquer sur **"Run"** pour insérer les prompts

#### **2.4 Vérifier l'Insertion**
➡️ Retourner à **Tables** → **`chat_prompts`** et vérifier que les 4 prompts sont présents

---

### **ÉTAPE 3 : Vérifier les Logs Edge Function**

#### **3.1 Accéder aux Logs**
1. ➡️ **Edge Functions** (sidebar gauche)
2. ➡️ Cliquer sur **`analyze-message`**
3. ➡️ Cliquer sur **"Logs"**

#### **3.2 Analyser les Erreurs**
Chercher les logs récents pour identifier les erreurs spécifiques

---

### **ÉTAPE 4 : Re-déployer Edge Function**

#### **4.1 Re-déployer avec CLI**
```bash
npx supabase functions deploy analyze-message --project-ref kvwzbofifqqytyfertkh
```

#### **4.2 Tester l'Analyse IA**
➡️ Retourner dans l'application et tester un message : `"J'ai observé des pucerons sur les tomates"`

---

## 🎯 **RÉSOLUTION ATTENDUE**

### **✅ Après Correction**
- Edge Function trouve les prompts ✅
- Analyse IA fonctionne ✅  
- Messages utilisateur visibles ✅
- Messages Thomas générés ✅

### **📊 Logs Attendus**
```
🤖 [AI-ANALYSIS] Démarrage analyse IA
⚡ [AI-ANALYSIS] Étape 1/4: Préparation requête Edge Function
🌐 [AI-ANALYSIS] Étape 2/4: Appel Edge Function analyze-message
✅ [AI-ANALYSIS] Étape 3/4: Validation réponse IA
🎯 [AI-ANALYSIS] Analyse terminée avec succès (1250ms)
```

---

## 🆘 **SI LE PROBLÈME PERSISTE**

### **Option A : Dashboard Manuel**
➡️ Utiliser **Database** → **SQL Editor** pour insérer directement les données

### **Option B : Réinitialisation**
➡️ Supprimer et recréer les tables `chat_prompts` si corruption

### **Option C : Support Supabase**
➡️ Contacter le support avec les logs d'erreur

---

## 📞 **PROCHAINE ÉTAPE**

**➡️ Suivre ce guide étape par étape et me faire un retour après l'Étape 1 !**

Je pourrai t'aider avec les étapes suivantes selon ce que tu trouveras dans la table `chat_prompts`.
