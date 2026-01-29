# Système de Quantités Complet ✅

## 📋 Vue d'ensemble

Le système de quantités a été complètement restructuré pour stocker les quantités de manière structurée et requêtable dans la base de données au lieu de seulement dans les champs de notes.

## 🗄️ Structure Base de Données

### Table `tasks` - Nouvelles colonnes

| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `quantity_value` | NUMERIC | Valeur quantité utilisateur | `3` |
| `quantity_unit` | VARCHAR(50) | Unité utilisateur | `"caisses"` |
| `quantity_nature` | VARCHAR(200) | Nature spécifique | `"compost"`, `"bouillie bordelaise"` |
| `quantity_type` | VARCHAR(50) | Type de quantité | `"engrais"`, `"produit_phyto"`, `"recolte"` |
| `quantity_converted_value` | NUMERIC | Valeur convertie | `15` |
| `quantity_converted_unit` | VARCHAR(50) | Unité universelle | `"kg"` |

### Types de quantité (avec contrainte CHECK)

- ✅ `engrais` - Compost, fumier, engrais NPK
- ✅ `produit_phyto` - Bouillie bordelaise, purin, traitements
- ✅ `recolte` - Kg de tomates, caisses de salades
- ✅ `plantation` - Plants, graines
- ✅ `vente` - Montants en euros
- ✅ `autre` - Autres types

## 📊 Exemples de Données Stockées

### Exemple 1: Fertilisation
**Message**: "J'ai apporté 100 kg de compost"

**Stockage dans tasks**:
```json
{
  "quantity_value": 100,
  "quantity_unit": "kg",
  "quantity_nature": "compost",
  "quantity_type": "engrais",
  "quantity_converted_value": null,
  "quantity_converted_unit": null
}
```

### Exemple 2: Récolte avec conversion
**Message**: "J'ai récolté 20 caisses de mesclun"

**Stockage dans tasks** (si 1 caisse = 5 kg):
```json
{
  "quantity_value": 20,
  "quantity_unit": "caisses",
  "quantity_nature": "mesclun",
  "quantity_type": "recolte",
  "quantity_converted_value": 100,
  "quantity_converted_unit": "kg"
}
```

### Exemple 3: Pulvérisation
**Message**: "J'ai pulvérisé 10 L de bouillie bordelaise"

**Stockage dans tasks**:
```json
{
  "quantity_value": 10,
  "quantity_unit": "L",
  "quantity_nature": "bouillie bordelaise",
  "quantity_type": "produit_phyto",
  "quantity_converted_value": null,
  "quantity_converted_unit": null
}
```

### Exemple 4: Plantation
**Message**: "J'ai planté 500 laitues"

**Stockage dans tasks**:
```json
{
  "quantity_value": 500,
  "quantity_unit": "plants",
  "quantity_nature": "laitues",
  "quantity_type": "plantation",
  "quantity_converted_value": null,
  "quantity_converted_unit": null
}
```

## 🔧 Code Modifié

### 1. Services TypeScript

**`src/services/aiChatService.ts`** (lignes 333-343)
```typescript
// Quantités structurées
quantity_value: data.quantity?.value || null,
quantity_unit: data.quantity?.unit || null,
quantity_nature: data.quantity_nature || null,
quantity_type: data.quantity_type || null,
quantity_converted_value: data.quantity_converted?.value || null,
quantity_converted_unit: data.quantity_converted?.unit || null,
```

**`src/services/agent/tools/agricultural/TaskDoneTool.ts`** (lignes 148-154)
```typescript
// Quantités structurées
quantity_value: appliedConversion?.original?.value || null,
quantity_unit: appliedConversion?.original?.unit || null,
quantity_nature: quantityNature,
quantity_type: quantityType,
quantity_converted_value: appliedConversion?.converted?.value || null,
quantity_converted_unit: appliedConversion?.converted?.unit || null,
```

**`src/services/agent/tools/agricultural/HarvestTool.ts`** (lignes 144-150)
```typescript
// Quantités structurées pour récolte
quantity_value: appliedConversion?.original?.value || null,
quantity_unit: appliedConversion?.original?.unit || null,
quantity_nature: params.crop,
quantity_type: 'recolte',
quantity_converted_value: appliedConversion?.converted?.value || null,
quantity_converted_unit: appliedConversion?.converted?.unit || null,
```

### 2. Formulaire UI

**`src/components/chat/ActionEditModal.tsx`**
- ✅ Champ `quantity_type` (dropdown)
- ✅ Champ `quantity_nature` (input)
- ✅ Sur la même ligne
- ✅ Sauvegarde dans `extracted_data`

## 📁 Fichiers de Migration

### À appliquer (via Dashboard Supabase)

**Option 1: Script consolidé (RECOMMANDÉ)** 
```
supabase/APPLY_ALL_QUANTITY_MIGRATIONS.sql
```
Contient tout en une transaction atomique.

**Option 2: Migrations individuelles**
1. `supabase/Migrations/032_add_quantity_nature_and_type.sql`
2. `supabase/Migrations/033_add_quantity_columns_to_tasks.sql`
3. `supabase/Migrations/031_improve_quantity_extraction.sql`

## 🎯 Avantages

### Avant ❌
```sql
-- Quantités dans notes (non requêtable)
notes: "Quantité: 100 kg\n(converti: 100 kg)\nOriginal: ..."
```

### Après ✅
```sql
-- Quantités structurées (requêtable)
SELECT 
  SUM(quantity_converted_value) as total_kg_recolte
FROM tasks 
WHERE quantity_type = 'recolte' 
  AND quantity_converted_unit = 'kg'
  AND date >= '2026-01-01';
```

## 📊 Requêtes Possibles

### Total des récoltes par culture
```sql
SELECT 
  quantity_nature as culture,
  SUM(quantity_converted_value) as total_kg,
  COUNT(*) as nb_recoltes
FROM tasks
WHERE quantity_type = 'recolte'
  AND quantity_converted_unit = 'kg'
GROUP BY quantity_nature
ORDER BY total_kg DESC;
```

### Utilisation d'engrais par mois
```sql
SELECT 
  DATE_TRUNC('month', date) as mois,
  quantity_nature,
  SUM(quantity_value) as total_kg
FROM tasks
WHERE quantity_type = 'engrais'
  AND quantity_unit = 'kg'
GROUP BY mois, quantity_nature
ORDER BY mois DESC;
```

### Produits phyto utilisés
```sql
SELECT 
  quantity_nature as produit,
  SUM(quantity_value) as total_litres,
  COUNT(*) as nb_applications
FROM tasks
WHERE quantity_type = 'produit_phyto'
  AND quantity_unit = 'L'
GROUP BY quantity_nature;
```

## 🚀 Prochaines Étapes

1. ✅ Appliquer `APPLY_ALL_QUANTITY_MIGRATIONS.sql` via Dashboard Supabase
2. ✅ Tester avec des messages variés
3. ✅ Vérifier que les quantités sont bien stockées dans les colonnes
4. 📊 Créer des rapports/graphiques basés sur ces données structurées

## 📝 Notes

- Les colonnes sont **nullables** (optionnelles)
- Les index sont créés pour optimiser les requêtes
- Les conversions sont automatiques si configurées
- Le prompt v2.8 extrait automatiquement nature et type

