# 🎯 Migration 028 : Prompt Simplifié + Format JSON Forcé

## 📋 **Changements**

### **Avant (v2.5)**
- 9318 caractères
- Format JSON non forcé
- GPT retournait formats variables
- Fallback "help" activé souvent

### **Après (v2.6)**
- ~4500 caractères (2x plus court)
- **Format JSON STRICTEMENT forcé**
- **5 exemples concrets** avec JSON complet
- Instructions claires et directes

## 🎯 **Améliorations Clés**

### **1. Format JSON Obligatoire**
```json
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

### **2. Exemples Concrets**
✅ Action agricole → JSON complet  
✅ Récolte sans quantité → JSON complet  
✅ Récolte avec quantité → JSON complet  
✅ Observation → JSON complet  
✅ Help → JSON complet

### **3. Règles Simplifiées**
- Verbe agricole = task_done (sauf question)
- Récolte + quantité = harvest
- Récolte sans quantité = task_done
- Problème spécifique = observation
- Question explicite = help

## 🚀 **Application**

### **Via Dashboard Supabase**
```
1. Ouvrir: https://supabase.com/dashboard/project/kvwzbofifqqytyfertkh/sql
2. Copier TOUT le contenu de: supabase/Migrations/028_simplified_prompt_forced_json.sql
3. Coller dans SQL Editor
4. RUN
```

## 🧪 **Tests Attendus**

```
✅ "J'ai passé la herse pendant 2h" → task_done (90%+)
✅ "J'ai récolté des tomates pendant 1h" → task_done (90%+)
✅ "J'ai récolté 10 kg de tomates" → harvest (90%+)
✅ "J'ai observé des pucerons" → observation (90%+)
✅ "Comment récolter ?" → help (90%+)
```

## 📊 **Résultat Attendu**

- ✅ **Format JSON cohérent** (toujours avec "actions" array)
- ✅ **Confiance élevée** (80-95% au lieu de 50%)
- ✅ **extracted_data rempli** (plus vide)
- ✅ **Plus de fallback "help"** (sauf vraies questions)

---

**🎯 Cette version force GPT à retourner exactement ce que le code attend !**
