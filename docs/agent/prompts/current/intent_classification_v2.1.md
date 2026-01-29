# 🤖 intent_classification v2.1

**Version** : 2.1  
**Statut** : ✅ Actif  
**Date** : 05/01/2026  
**Longueur** : 4765 caractères

---

## 📋 **Contenu du Prompt**

Classifie précisément l'intention de ce message agricole français.

## 📤 Message
"{{user_message}}"

## 🎯 Classification d'Intention

### 🔍 RÈGLE CRITIQUE - Discrimination "Observer"

⚠️ **Le verbe "observer" a DEUX sens en français** :

#### **CONSTATIF (→ observation_creation)**
L'utilisateur **remarque/constate** un problème, symptôme, anomalie :
- "J'ai **observé** des dégâts de mineuse" ✅ observation
- "J'ai **vu** des pucerons sur les tomates" ✅ observation
- "J'ai **remarqué** un jaunissement des feuilles" ✅ observation
- "J'ai **constaté** un problème d'arrosage" ✅ observation

**Indicateurs clés** : Mention d'un problème/symptôme/anomalie spécifique après le verbe

#### **ACTIF (→ task_done)**
L'utilisateur **effectue une action** de surveillance/inspection :
- "J'ai **inspecté** les serres" ✅ task_done
- "J'ai **fait une tournée** d'observation" ✅ task_done  
- "J'ai **surveillé** les cultures pendant 2h" ✅ task_done
- "J'ai **vérifié** l'état des plants" ✅ task_done

**Indicateurs clés** : Action de surveillance générale, durée mentionnée, pas de problème spécifique

---

### Intentions Principales:

1. **observation_creation** - Constats terrain (passifs)
   - **Focus** : PROBLÈME/SYMPTÔME détecté
   - **Mots-clés principaux** : 
     - Constats : "remarqué", "constaté", "vu", "trouvé"
     - Problèmes : "dégâts", "maladie", "ravageur", "pucerons", "jaunissement", "flétrissement"
     - Conditions : "stress hydrique", "carence", "brûlure"
   - **Structure typique** : "J'ai [verbe constatif] [problème spécifique] sur [culture/parcelle]"
   
2. **task_done** - Actions réalisées (actives)
   - **Focus** : TRAVAIL effectué avec durée/effort
   - **Mots-clés principaux** : 
     - Actions : "fait", "effectué", "réalisé", "accompli", "terminé"
     - Travaux : "planté", "traité", "arrosé", "taillé", "désherbé", "paillé"
     - Surveillance : "inspecté", "surveillé", "vérifié", "contrôlé", "fait le tour"
   - **Structure typique** : "J'ai [action] [cible] [avec matériel/durée/quantité]"
   
3. **task_planned** - Actions futures  
   - **Focus** : PLANIFICATION avec date future
   - **Mots-clés** : "vais", "prévu", "demain", "lundi", "planifier", "programmer"
   
4. **harvest** - Récoltes spécialisées
   - **Focus** : QUANTITÉS récoltées
   - **Mots-clés** : "récolté", "ramassé", "cueilli" + quantités chiffrées
   
5. **management** - Gestion/Configuration
   - **Focus** : CONFIGURATION système
   - **Mots-clés** : "créer parcelle", "ajouter matériel", "configurer", "paramétrer"
   
6. **help** - Demandes d'aide
   - **Focus** : QUESTION utilisateur
   - **Mots-clés** : "comment", "où", "aide", "?", "expliquer", "qui peut"

## 🧪 Exemples de Discrimination

### ✅ OBSERVATION (Constat)
- "J'ai observé des dégâts de mineuse sur les tomates"
  → Intent: observation_creation (problème spécifique détecté)
  
- "J'ai remarqué que les feuilles jaunissent dans la serre 1"
  → Intent: observation_creation (symptôme physiologique)

- "J'ai vu des limaces sur les salades ce matin"
  → Intent: observation_creation (ravageur identifié)

### ✅ TÂCHE EFFECTUÉE (Action)
- "J'ai inspecté toutes les serres ce matin"
  → Intent: task_done (action de surveillance sans problème)
  
- "J'ai fait le tour des parcelles pendant 1h"
  → Intent: task_done (action avec durée)

- "J'ai vérifié l'état des plants avec Jean"
  → Intent: task_done (action collaborative)

### ⚠️ CAS AMBIGUS
Si le message contient "observé" mais **sans problème spécifique** :
- "J'ai observé les cultures" → Intent: task_done (action générique)
- "J'ai observé des pucerons" → Intent: observation_creation (problème précis)

**RÈGLE** : Si problème/symptôme/ravageur mentionné → observation_creation
            Sinon → task_done

## 📊 Format de Réponse JSON

```json
{
  "intent": "observation_creation",
  "confidence": 0.95,
  "reasoning": "L'utilisateur décrit un problème spécifique (dégâts de mineuse) observé sur une culture. C'est un CONSTAT, pas une action de surveillance.",
  "discrimination_applied": "Le message contient un problème spécifique après 'observé', donc observation_creation et non task_done",
  "entities_detected": {
    "action_indicators": ["observé"],
    "problem_indicators": ["dégâts", "mineuse"],
    "location_indicators": ["serre 1"],
    "crop_indicators": ["tomates"]
  }
}
```

## ⚡ Instructions Finales
- **TOUJOURS** vérifier si un problème spécifique est mentionné après "observer/voir/remarquer"
- **SI problème spécifique** → observation_creation
- **SI action générique sans problème** → task_done
- **En cas de doute** : privilégier observation_creation si symptôme/ravageur présent

---

## 📊 **Métadonnées**

- **ID** : af014d3d-8f9e-4312-8eb9-a04a8ec7013d
- **Créé le** : 2026-01-05T11:23:56.729303+01:00
- **Mis à jour le** : 2026-01-05T11:23:56.729303+01:00
- **Exemples** : Oui
- **Metadata** : {
  "category": "classification",
  "variables": [
    "user_message"
  ],
  "created_by": "chat_ai_specialist_fix_2026_01_05",
  "temperature": 0.1,
  "improvements": [
    "discrimination_observer",
    "explicit_rules",
    "more_examples"
  ],
  "output_format": "json"
}

---

**📁 Emplacement** : `docs/agent/prompts/current/`  
**🔄 Export** : 07/01/2026 10:20:56  
**📊 Statut** : ✅ Actif