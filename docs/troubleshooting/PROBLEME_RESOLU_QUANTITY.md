# ✅ PROBLÈME RÉSOLU - Colonnes quantity

## 🔍 Diagnostic

### Erreur identifiée :
```
⚠️ [FARM-CACHE] Erreur chargement tâches: 
{message: 'column tasks.quantity does not exist', code: '42703'}
```

### Cause racine :
Le code essayait de sélectionner une colonne `quantity` qui n'existe **PAS** dans la base de données.

## 📊 Structure réelle de la base de données

**Colonnes existantes :**
- ✅ `quantity_value` (DECIMAL)
- ✅ `quantity_unit` (VARCHAR)
- ✅ `quantity_nature` (VARCHAR)  
- ✅ `quantity_type` (VARCHAR)

**Colonne recherchée (inexistante) :**
- ❌ `quantity` (objet JSON)

## 🛠️ Correction appliquée

### Avant (ne fonctionnait pas) :
```typescript
'id,title,date,status,...,quantity,quantity_nature,quantity_type'
//                         ^^^^^^^^ Colonne inexistante !

quantity: task.quantity  // undefined ou erreur
```

### Après (corrigé) :
```typescript
'id,title,date,status,...,quantity_value,quantity_unit,quantity_nature,quantity_type'
//                         ^^^^^^^^^^^^^^ ^^^^^^^^^^^^^ Colonnes existantes

// Reconstruction de l'objet quantity
quantity: task.quantity_value && task.quantity_unit 
  ? { value: task.quantity_value, unit: task.quantity_unit }
  : undefined
```

## 🎯 Résultat attendu

Après rechargement de l'application, vous devriez voir :

```
✅ [FARM-CACHE] Tâches chargées: {
  total: 4,
  completed: 2,
  planned: 2
}

🔍 [DEBUG-FILTER] État complet: {
  totalFarmTasks: 4,  // ← Tâches maintenant chargées !
  ...
}
```

## 📝 Actions requises

1. **Rechargez la page** (F5)
2. **Vérifiez la console** : Les tâches devraient maintenant être chargées
3. **Testez les filtres** : "Effectué" et "Planifié" devraient fonctionner

## 🎉 Tâches du 7 janvier qui devraient s'afficher

- ✅ "J'ai effectué une tâche sur tomates" (Effectuée)
- ✅ "J'ai récolté 4 kg de laitues" (Planifiée)
- ✅ "désherber - laitues" (Effectuée)

---

**Note :** Les quantités seront maintenant correctement affichées dans les capsules :
- 📊 `4 kg` (valeur + unité)
- 🏷️ `laitues` (nature)
- 📋 `recolte` (type)
