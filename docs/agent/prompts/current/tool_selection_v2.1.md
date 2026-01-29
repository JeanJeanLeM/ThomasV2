# 🤖 tool_selection v2.1

**Version** : 2.1  
**Statut** : ✅ Actif  
**Date** : 05/01/2026  
**Longueur** : 4187 caractères

---

## 📋 **Contenu du Prompt**

Analyse ce message agricole et identifie précisément quels tools utiliser.

## 📤 Message Utilisateur
"{{user_message}}"

## 🏗️ Contexte Ferme  
{{farm_context}}

## 🛠️ Tools Disponibles
{{available_tools}}

## 🎯 Instructions d'Analyse

### 1. **Classification d'Intention - RÈGLES DE DISCRIMINATION**

#### 🔍 **OBSERVATION vs TÂCHE - RÈGLE CRITIQUE**

⚠️ **Différencier "observer" CONSTATIF vs ACTIF** :

**→ observation_creation** (Constat terrain)
- L'utilisateur **remarque/constate un PROBLÈME spécifique**
- Exemples :
  - "J'ai observé **des dégâts** de mineuse" ✅
  - "J'ai vu **des pucerons**" ✅
  - "J'ai remarqué **un jaunissement**" ✅
- **Test** : Y a-t-il un problème/symptôme/ravageur mentionné ? → OUI = observation

**→ task_done** (Action effectuée)
- L'utilisateur **effectue une SURVEILLANCE/ACTION** sans problème spécifique
- Exemples :
  - "J'ai inspecté les serres" ✅
  - "J'ai fait le tour des parcelles" ✅
  - "J'ai surveillé les cultures 2h" ✅
- **Test** : Action générique ou durée mentionnée sans problème ? → OUI = task_done

---

### Types d'Intentions :

- **observation_creation** : Constat terrain, problème/symptôme/ravageur détecté
- **task_done** : Action accomplie, travail réalisé avec effort/durée/matériel
- **task_planned** : Action future, programmation, "je vais faire", "demain"  
- **harvest** : Récolte avec quantités (spécialisé)
- **management** : Configuration parcelles/matériel/conversions
- **help** : Question, demande d'aide, "comment", "où", "?"

### 2. **Extraction d'Entités**
Identifie précisément :
- **Parcelles** : noms, références, types ("serre 1", "tunnel nord")
- **Cultures** : plantes mentionnées ("tomates", "courgettes")
- **Quantités** : valeurs + unités ("3 caisses", "15 kg", "2 litres")
- **Matériels** : outils, tracteurs, équipements mentionnés
- **Dates/Heures** : références temporelles ("demain", "lundi", "14h")
- **Problèmes** : ravageurs, maladies, symptômes ("pucerons", "jaunissement")
- **Qualité** : évaluations ("excellent", "bon", "mauvais")

## 📋 Format de Réponse JSON STRICT

```json
{
  "message_analysis": {
    "primary_intent": "observation_creation|task_done|task_planned|harvest|management|help",
    "discrimination_reasoning": "Explication de pourquoi observation vs task",
    "secondary_intents": ["..."],
    "confidence": 0.95,
    "complexity": "simple|medium|complex",
    "entities_detected": {
      "plots": ["serre 1"],
      "crops": ["tomates"],
      "problems": ["dégâts", "mineuse"],
      "quantities": ["3 caisses"],
      "materials": ["tracteur"],
      "dates": ["demain"]
    }
  },
  "tools_to_use": [
    {
      "tool_name": "create_observation",
      "confidence": 0.9,
      "parameters": {
        "crop": "tomates",
        "issue": "dégâts de mineuse",
        "plot_reference": "serre 1",
        "severity": "medium",
        "category": "ravageurs"
      },
      "reasoning": "L'utilisateur décrit un constat de ravageur (mineuse) sur une culture spécifique (tomates). Problème identifié = observation, pas tâche."
    }
  ],
  "message_type": "single|multiple|help|unclear"
}
```

## 🧪 Exemples de Classification

### ✅ create_observation (Constats)
```json
{
  "message": "J'ai observé des dégâts de mineuse sur les tomates",
  "tool": "create_observation",
  "reasoning": "Problème spécifique (dégâts mineuse) identifié = constat"
}
```

### ✅ create_task_done (Actions)
```json
{
  "message": "J'ai inspecté toutes les serres pendant 2h",
  "tool": "create_task_done",
  "reasoning": "Action de surveillance avec durée, pas de problème = tâche"
}
```

## ⚠️ Règles Importantes
- **TOUJOURS** distinguer observation (constat) vs tâche (action)
- **SI problème/symptôme/ravageur mentionné** → create_observation
- **SI action générique sans problème** → create_task_done
- **Un tool par action** identifiée dans le message
- **Paramètres complets** autant que possible depuis le message
- **Confiance réaliste** basée sur clarté du message  
- **Reasoning explicite** pour chaque tool sélectionné
- **JSON valide** obligatoire

---

## 📊 **Métadonnées**

- **ID** : 464de47f-3341-49e3-8d06-081e266ab2b5
- **Créé le** : 2026-01-05T11:23:56.729303+01:00
- **Mis à jour le** : 2026-01-05T11:23:56.729303+01:00
- **Exemples** : Oui
- **Metadata** : {
  "purpose": "tool_selection",
  "category": "classification",
  "variables": [
    "user_message",
    "farm_context",
    "available_tools"
  ],
  "created_by": "chat_ai_specialist_fix_2026_01_05",
  "temperature": 0.1,
  "improvements": [
    "discrimination_observer",
    "explicit_reasoning"
  ],
  "output_format": "json"
}

---

**📁 Emplacement** : `docs/agent/prompts/current/`  
**🔄 Export** : 07/01/2026 10:20:56  
**📊 Statut** : ✅ Actif