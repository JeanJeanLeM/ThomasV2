# ⚡ ACTION IMMÉDIATE : Fix Observation

**Temps** : 5 minutes  
**Complexité** : Facile ⭐  
**Impact** : Résout le problème "J'ai observé" mal classé

---

## 🎯 Problème
```
"J'ai observé des dégâts de mineuse sur les tomates"
❌ Classé : task_done (action)
✅ Devrait : observation (constat)
```

---

## ✅ Solution : 3 Commandes

### 1️⃣ Déployer (2 min)
```bash
# Connexion Supabase
psql -h [VOTRE_HOST].supabase.co -U postgres -d postgres

# Appliquer le fix
\i supabase/Migrations/022_fix_observation_discrimination.sql

# Vérifier
SELECT name, version, is_active FROM chat_prompts WHERE name = 'intent_classification' ORDER BY version DESC LIMIT 2;
```

**Attendu** :
```
intent_classification | 2.1 | t  ✅
intent_classification | 2.0 | f  ✅
```

### 2️⃣ Redémarrer (1 min)
```bash
# Redémarrer l'app mobile ou le service backend
```

### 3️⃣ Tester (2 min)

**Test A** : Dans le chat Thomas, envoyer
```
J'ai observé des dégâts de mineuse sur les tomates
```
→ Logs doivent montrer : `action_type: "observation"` ✅

**Test B** : Envoyer
```
J'ai inspecté les serres ce matin
```
→ Logs doivent montrer : `action_type: "task_done"` ✅

---

## 🎉 C'est Tout !

Si les 2 tests passent → **PROBLÈME RÉSOLU** ✅

---

## 🚨 Si Ça Ne Marche Pas

```sql
-- Forcer activation v2.1
UPDATE chat_prompts SET is_active = false WHERE name = 'intent_classification' AND version = '2.0';
UPDATE chat_prompts SET is_active = true WHERE name = 'intent_classification' AND version = '2.1';
```

Puis redémarrer l'app.

---

## 📚 Documentation Complète

- **Index complet** : `OBSERVATION_FIX_INDEX.md`
- **Guide détaillé** : `OBSERVATION_TASK_FIX_SUMMARY.md`
- **Tests complets** : `docs/OBSERVATION_VS_TASK_TESTING.md`

---

**GO ! 🚀**

