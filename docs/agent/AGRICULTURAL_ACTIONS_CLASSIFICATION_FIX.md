# 🚜 Fix Classification Actions Agricoles

**Date** : 07/01/2026  
**Agent** : Chat AI Specialist  
**Contexte** : L'IA classifie les actions agricoles comme des demandes d'aide  
**Statut** : 🔄 En cours

---

## 🚨 **Problème**

### **Cas d'Erreur**
```
Message: "J'ai passé la herse étrie pendant 2 heures"
Classification IA: help (50% confiance) ❌
Classification attendue: task_done ✅
```

### **Analyse**
- **Verbe "passer"** mal interprété comme demande d'aide
- **Manque d'exemples agricoles** dans le prompt
- **Confusion sémantique** entre "passer un outil" et "demander de l'aide"

---

## 🎯 **Solutions**

### **1. Enrichir le Prompt avec Exemples Agricoles**

Ajouter une section spécifique dans `thomas_agent_system` :

```markdown
### 🚜 ACTIONS AGRICOLES COURANTES

**RÈGLE CRITIQUE**: Les verbes agricoles + outils = TOUJOURS task_done

#### Verbes Agricoles + Outils = task_done
- "J'ai **passé** [outil]" → task_done
- "J'ai **utilisé** [outil]" → task_done  
- "J'ai **fait** [travail] avec [outil]" → task_done
- "J'ai **travaillé** avec [outil]" → task_done

#### Exemples Concrets
✅ task_done:
- "J'ai passé la herse étrie pendant 2 heures"
- "J'ai utilisé le tracteur pour labourer"
- "J'ai fait du binage avec la binette"
- "J'ai travaillé au champ avec la charrue"

❌ PAS help:
- Ces phrases décrivent des ACTIONS RÉALISÉES, pas des demandes d'aide
```

### **2. Liste des Outils Agricoles à Reconnaître**

```markdown
#### Outils/Équipements Agricoles
- **Travail du sol**: herse, charrue, cultivateur, bêche, binette
- **Semis**: semoir, planteuse
- **Entretien**: tondeuse, débroussailleuse, sécateur
- **Récolte**: moissonneuse, faucheuse
- **Transport**: tracteur, remorque
- **Traitement**: pulvérisateur, épandeur
```

### **3. Discrimination Help vs Task_Done**

```markdown
#### 🆘 help (demande d'aide)
- "Comment utiliser la herse ?"
- "Que faire avec les pucerons ?"
- "Quel outil pour labourer ?"

#### ✅ task_done (action réalisée)
- "J'ai passé la herse"
- "J'ai traité les pucerons"
- "J'ai labouré avec le tracteur"
```

---

## 🔧 **Implémentation**

### **Étape 1: Export du Prompt Actuel**
```sql
-- Utiliser supabase/export_current_prompt.sql
```

### **Étape 2: Analyser le Contenu**
- Identifier les sections existantes
- Localiser les exemples d'actions
- Vérifier les instructions de classification

### **Étape 3: Créer Version Améliorée**
- Ajouter section "Actions Agricoles"
- Enrichir les exemples
- Clarifier la discrimination help/task_done

### **Étape 4: Migration**
```sql
-- Nouvelle migration 025_fix_agricultural_actions_classification.sql
UPDATE chat_prompts 
SET is_active = false 
WHERE name = 'thomas_agent_system' AND is_active = true;

INSERT INTO chat_prompts (name, version, content, is_active, created_at)
VALUES ('thomas_agent_system', '2.3', '[nouveau contenu]', true, NOW());
```

---

## 🧪 **Tests à Effectuer**

### **Cas de Test Agricoles**
```
✅ Doivent être classifiés comme task_done:
- "J'ai passé la herse étrie pendant 2 heures"
- "J'ai utilisé le tracteur pour labourer le champ nord"
- "J'ai fait du binage sur les tomates"
- "J'ai travaillé avec la charrue ce matin"
- "J'ai tondu les bordures pendant 1h"

❌ Doivent rester help:
- "Comment utiliser la herse étrie ?"
- "Que faire pour labourer efficacement ?"
- "Quel outil pour biner les tomates ?"
```

### **Cas Limites**
```
- "J'ai essayé de passer la herse" → task_done (tentative)
- "Je vais passer la herse demain" → task_planned
- "Peux-tu m'aider à passer la herse ?" → help
```

---

## 📊 **Métriques de Succès**

### **Avant Fix**
- "J'ai passé la herse étrie" → help (50% confiance) ❌

### **Après Fix (Objectif)**
- "J'ai passé la herse étrie" → task_done (90%+ confiance) ✅

---

## 🎯 **Prochaines Étapes**

1. ✅ **Exporter le prompt actuel** avec `export_current_prompt.sql`
2. 🔄 **Analyser le contenu** et identifier les manques
3. ⏳ **Créer la version 2.3** avec exemples agricoles
4. ⏳ **Tester** sur les cas d'usage critiques
5. ⏳ **Déployer** la nouvelle version

---

**Liens utiles** :
- [Prompt Management Strategy](./PROMPT_MANAGEMENT_STRATEGY.md)
- [Guide Organisation](../GUIDE_ORGANISATION_AGENTS.md)
- [Migrations Supabase](../../supabase/Migrations/)

---

**🚜 Objectif** : Classification parfaite des actions agricoles  
**⏱️ Priorité** : Haute (impact direct sur l'expérience utilisateur)
