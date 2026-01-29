# ⚡ QUICK FIX: Discrimination Observation vs Tâche

**Temps requis** : 5 minutes  
**Complexité** : Faible  
**Impact** : Résout immédiatement le problème "J'ai observé" mal classé

---

## 🎯 **Problème**

```
Message : "J'ai observé des dégâts de mineuse sur les tomates"
❌ Classé comme : task_done (action "observer")
✅ Devrait être : observation (constat terrain)
```

---

## 🚀 **Solution en 3 Étapes**

### **Étape 1 : Déployer la Migration** (2 min)

```bash
# Se connecter à Supabase
psql -h [VOTRE_HOST_SUPABASE].supabase.co -U postgres -d postgres

# Appliquer le fix
\i supabase/Migrations/022_fix_observation_discrimination.sql

# Vérifier
SELECT name, version, is_active 
FROM chat_prompts 
WHERE name = 'intent_classification' 
ORDER BY version DESC 
LIMIT 2;
```

**Résultat attendu** :
```
name                   | version | is_active
-----------------------+---------+-----------
intent_classification  | 2.1     | t         ✅
intent_classification  | 2.0     | f         ✅
```

### **Étape 2 : Redémarrer l'App** (1 min)

Si votre app cache les prompts :
- Mobile : Forcer fermeture + réouvrir
- Backend : Redémarrer service

### **Étape 3 : Tester** (2 min)

Dans le chat Thomas, envoyer :

**Test 1** :
```
J'ai observé des dégâts de mineuse sur les tomates
```

**Attendu dans les logs** :
```javascript
action_type: "observation"     // ✅ CORRECT
category: "ravageurs"           // ✅
```

**Test 2** :
```
J'ai inspecté les serres ce matin
```

**Attendu dans les logs** :
```javascript
action_type: "task_done"       // ✅ CORRECT
action: "inspecter"             // ✅
```

---

## ✅ **Validation Rapide**

Si les 2 tests passent → **FIX RÉUSSI !** 🎉

Sinon, voir troubleshooting ci-dessous.

---

## 🚨 **Troubleshooting**

### **Problème : Toujours classé task_done**

```sql
-- Forcer activation v2.1
UPDATE chat_prompts SET is_active = false 
WHERE name = 'intent_classification' AND version = '2.0';

UPDATE chat_prompts SET is_active = true 
WHERE name = 'intent_classification' AND version = '2.1';
```

Puis **redémarrer l'app**.

### **Problème : Migration échoue**

Erreur "ON CONFLICT" ?

```sql
-- Insérer directement sans conflit
DELETE FROM chat_prompts 
WHERE name IN ('intent_classification', 'tool_selection') 
AND version = '2.1';

-- Puis relancer la migration
\i supabase/Migrations/022_fix_observation_discrimination.sql
```

### **Problème : Pas de changement visible**

1. Vérifier que la migration est bien appliquée (SQL ci-dessus)
2. Vider cache navigateur/app
3. Vérifier logs console pour voir quelle version de prompt est utilisée

---

## 📊 **Tests Complets** (Optionnel)

Pour validation exhaustive : voir `docs/OBSERVATION_VS_TASK_TESTING.md`

22 cas de test disponibles pour couvrir tous les cas limites.

---

## 📚 **Documentation Complète**

- 📄 `OBSERVATION_TASK_FIX_SUMMARY.md` : Analyse complète du problème
- 🧪 `docs/OBSERVATION_VS_TASK_TESTING.md` : Guide de test détaillé
- 💾 `supabase/Migrations/022_fix_observation_discrimination.sql` : Migration SQL
- 🔧 `scripts/test-observation-discrimination.js` : Script validation

---

## 💬 **Besoin d'Aide ?**

Consultez l'agent spécialiste : `agents/03_CHAT_AI_SPECIALIST.md`

**Let's fix this! 🚀**

