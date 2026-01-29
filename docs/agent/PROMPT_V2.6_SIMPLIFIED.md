# 🎯 Prompt v2.6 Simplifié - Documentation

**Date** : 07/01/2026  
**Version** : 2.6  
**Taille** : ~4500 caractères (vs 9318 pour v2.5)  
**Statut** : ✅ Prêt à tester

---

## 🎯 **Objectif**

Forcer GPT-4o-mini à retourner **EXACTEMENT** le format JSON attendu par le code, en simplifiant drastiquement le prompt.

---

## 🔧 **Changements Majeurs**

### **1. Prompt 2x Plus Court**
- v2.5 : 9318 chars (trop long, GPT confus)
- v2.6 : ~4500 chars (concis, clair)

### **2. Format JSON FORCÉ**

**Instruction principale** :
```
Tu DOIS retourner EXACTEMENT ce format (pas de texte avant/après):
{
  "actions": [
    {
      "action_type": "task_done",
      "confidence": 0.9,
      "original_text": "...",
      "extracted_data": {...}
    }
  ]
}
```

### **3. 5 Exemples Concrets avec JSON Complet**

Chaque exemple montre :
- ✅ Le message utilisateur
- ✅ Le JSON exact à retourner
- ✅ Tous les champs remplis

**Exemples inclus** :
1. Action agricole (herse)
2. Récolte sans quantité
3. Récolte avec quantité
4. Observation (pucerons)
5. Demande d'aide

### **4. Règles Ultra-Simplifiées**

```markdown
Actions Agricoles = task_done
- Verbe agricole + action passée
- JAMAIS help sauf si question

Récoltes avec Quantité = harvest
- "10 kg" → harvest
- "pendant 1h" → task_done

Observations = observation
- Problème spécifique mentionné
- Extraire dans "issue"

Demande d'aide = help
- SEULEMENT si ?, comment, quand, où
```

---

## 🚨 **Instructions Finales Critiques**

Les dernières lignes du prompt :

```markdown
1. RETOURNE UNIQUEMENT DU JSON VALIDE
2. TOUJOURS UN OBJECT avec un array "actions"
3. TOUJOURS confidence entre 0 et 1
4. date au format YYYY-MM-DD
5. PAS DE TEXTE EXPLICATIF - SEULEMENT JSON
```

---

## 📊 **Comparaison v2.5 vs v2.6**

| Aspect | v2.5 | v2.6 |
|--------|------|------|
| Taille | 9318 chars | ~4500 chars |
| Format JSON | Suggéré | **FORCÉ** |
| Exemples JSON | 0 | **5 complets** |
| Instructions finales | Dispersées | **5 règles claires** |
| Lisibilité GPT | Complexe | **Simple** |

---

## 🧪 **Tests à Effectuer**

### **Test 1: Action Agricole**
```
Message: "J'ai passé la herse étrie pendant 2 heures"
Attendu: 
- action_type: task_done
- confidence: 0.9+
- extracted_data.materials: ["herse étrille"]
- extracted_data.duration: {value: 120, unit: "minutes"}
```

### **Test 2: Récolte sans Quantité**
```
Message: "J'ai récolté des tomates pendant 1 heure"
Attendu:
- action_type: task_done (PAS harvest)
- confidence: 0.9+
- extracted_data.crop: "tomates"
- extracted_data.duration: {value: 60, unit: "minutes"}
```

### **Test 3: Récolte avec Quantité**
```
Message: "J'ai récolté 10 kg de tomates"
Attendu:
- action_type: harvest
- confidence: 0.9+
- extracted_data.crop: "tomates"
- extracted_data.quantity: {value: 10, unit: "kg"}
```

### **Test 4: Observation**
```
Message: "J'ai observé des pucerons sur les tomates"
Attendu:
- action_type: observation
- confidence: 0.9+
- extracted_data.issue: "pucerons"
- extracted_data.category: "ravageurs"
```

### **Test 5: Help**
```
Message: "Comment récolter les tomates ?"
Attendu:
- action_type: help
- confidence: 0.9+
- extracted_data: {}
```

---

## 🎯 **Pourquoi Ça Va Marcher**

### **Raison 1: Clarté**
- Prompt court et direct
- GPT-4o-mini comprend mieux

### **Raison 2: Exemples Concrets**
- 5 exemples avec JSON complet
- GPT apprend par l'exemple

### **Raison 3: Format Forcé**
- Instructions répétées 3x
- "UNIQUEMENT JSON", "TOUJOURS actions array"

### **Raison 4: Code Adaptatif**
- Edge Function accepte action directe OU array
- Double sécurité

---

## 🚀 **Application**

### **Fichier SQL** : `supabase/Migrations/028_simplified_prompt_forced_json.sql`

### **Instructions** :
```
1. Dashboard Supabase SQL Editor
2. Copier-coller 028_simplified_prompt_forced_json.sql
3. RUN
4. Tester immédiatement
```

### **Vérification** :
```sql
SELECT name, version, is_active, LENGTH(content) as chars
FROM chat_prompts
WHERE name = 'thomas_agent_system'
ORDER BY version DESC
LIMIT 3;
```

Devrait montrer :
- ✅ v2.6 active (~4500 chars)
- ❌ v2.5 inactive (9318 chars)

---

## 📈 **Résultats Attendus**

### **Avant (v2.5)**
```
📊 Confiance: 50%
📦 Format: Variable (action directe)
⚠️ Fallback: help systématique
```

### **Après (v2.6)**
```
📊 Confiance: 85-95%
📦 Format: Cohérent (actions array)
✅ Classification: Correcte
```

---

## 🎓 **Leçons Apprises**

1. **Prompt court > Prompt long** pour GPT-4o-mini
2. **Exemples concrets** valent mieux que règles abstraites
3. **Format forcé** avec instructions répétées = succès
4. **Code adaptatif** = sécurité supplémentaire

---

**🎯 Cette version devrait ENFIN fonctionner correctement !**

**📊 Confiance** : Très haute  
**🧪 Prêt pour** : Tests immédiats  
**✅ Statut** : Migration prête à appliquer
