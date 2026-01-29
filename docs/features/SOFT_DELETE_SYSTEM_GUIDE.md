# Guide du Système de Soft Delete - Thomas V2

## 📋 Vue d'ensemble

Ce document définit les standards d'implémentation pour le système de soft delete (suppression logique) dans l'application Thomas V2. Il garantit une approche cohérente de la gestion des données "supprimées" qui restent accessibles pour l'historique et la récupération.

## 🎯 Principe du Soft Delete

### 🚨 RÈGLE FONDAMENTALE : Pas de Suppression Définitive
- **OBLIGATOIRE** : Utiliser `is_active: boolean` pour marquer les éléments comme inactifs
- **INTERDIT** : Supprimer définitivement des données utilisateur (DELETE SQL)
- **COMPORTEMENT** : Les éléments inactifs restent en base mais sont filtrés par défaut
- **RÉCUPÉRATION** : Possibilité de réactiver un élément inactif

## 🗄️ Structure Base de Données

### Colonne Standard
```sql
-- ✅ OBLIGATOIRE dans toutes les tables principales
is_active boolean NOT NULL DEFAULT true
```

### Tables Concernées
```sql
-- Exemples d'implémentation
CREATE TABLE public.materials (
  id integer PRIMARY KEY,
  name character varying NOT NULL,
  -- ... autres colonnes ...
  is_active boolean NOT NULL DEFAULT true,  -- ✅ Soft delete
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.farms (
  id integer PRIMARY KEY,
  name character varying NOT NULL,
  -- ... autres colonnes ...
  is_active boolean NOT NULL DEFAULT true,  -- ✅ Soft delete
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

## 🎨 Interface Utilisateur Standard

### 1. Icônes Adaptatives

```typescript
// ✅ STANDARD : Icône selon le statut
{item.is_active === false ? (
  <CheckmarkIcon color={colors.semantic.success} size={16} />  // Réactiver
) : (
  <TrashIcon color={colors.semantic.error} size={16} />        // Désactiver
)}
```

### 2. Cartouche de Statut

```typescript
// ✅ OBLIGATOIRE : Badge visuel pour les éléments inactifs
{item.is_active === false && (
  <View style={styles.inactiveStatusBadge}>
    <Text variant="caption" color={colors.gray[600]} weight="semibold">
      Inactif
    </Text>
  </View>
)}
```

### 3. Styles de Cartouche

```typescript
const styles = StyleSheet.create({
  inactiveStatusBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
});
```

## 🔄 Logique de Basculement

### 1. Fonction Standard

```typescript
const handleToggleActive = (item: ItemType) => {
  const isActive = item.is_active !== false;
  
  console.log('🔧 handleToggleActive called:', {
    itemId: item.id,
    itemName: item.name,
    currentIsActive: item.is_active,
    calculatedIsActive: isActive,
  });

  if (Platform.OS === 'web') {
    // Modal personnalisé pour le web
    setConfirmModal({
      visible: true,
      item,
      isActive,
    });
  } else {
    // Alert natif pour mobile
    Alert.alert(
      isActive ? 'Désactiver l\'élément' : 'Réactiver l\'élément',
      isActive
        ? 'Cet élément sera marqué comme inactif mais conservé dans votre historique.'
        : 'Cet élément sera de nouveau disponible comme actif.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: isActive ? 'Désactiver' : 'Réactiver',
          style: 'destructive',
          onPress: () => confirmToggleActive(item, isActive),
        },
      ]
    );
  }
};
```

### 2. Confirmation et Mise à Jour

```typescript
const confirmToggleActive = (item: ItemType, isActive: boolean) => {
  console.log('✅ Soft delete confirmed, updating item:', {
    itemId: item.id,
    newIsActive: !isActive,
  });
  
  setItems((prev) => {
    const updated = prev.map((i) =>
      i.id === item.id ? { ...i, is_active: !isActive } : i
    );
    console.log('📋 Items state updated:', updated.map(i => ({ 
      id: i.id, 
      name: i.name, 
      is_active: i.is_active 
    })));
    return updated;
  });
  
  setConfirmModal({ visible: false, item: null, isActive: false });
};
```

## 📱 Modales de Confirmation

### 1. Web - Modal Personnalisé

```typescript
<Modal
  visible={confirmModal.visible}
  onClose={cancelToggleActive}
  title={confirmModal.isActive ? 'Désactiver l\'élément' : 'Réactiver l\'élément'}
  size="sm"
  primaryAction={{
    title: confirmModal.isActive ? 'Désactiver' : 'Réactiver',
    onPress: () => confirmModal.item && confirmToggleActive(confirmModal.item, confirmModal.isActive),
    variant: confirmModal.isActive ? 'danger' : 'primary',
  }}
  secondaryAction={{
    title: 'Annuler',
    onPress: cancelToggleActive,
  }}
>
  <View style={{ padding: spacing.md }}>
    <Text variant="body" color={colors.text.secondary}>
      {confirmModal.isActive
        ? 'Cet élément sera marqué comme inactif mais conservé dans votre historique.'
        : 'Cet élément sera de nouveau disponible comme actif.'}
    </Text>
    
    {confirmModal.item && (
      <View style={styles.itemPreviewCard}>
        <Text variant="h4" color={colors.text.primary}>
          {confirmModal.item.name}
        </Text>
        {/* Informations supplémentaires selon le type d'élément */}
      </View>
    )}
  </View>
</Modal>
```

### 2. Mobile - Alert Natif

```typescript
Alert.alert(
  isActive ? 'Désactiver l\'élément' : 'Réactiver l\'élément',
  isActive
    ? 'Cet élément sera marqué comme inactif mais conservé dans votre historique.'
    : 'Cet élément sera de nouveau disponible comme actif.',
  [
    { text: 'Annuler', style: 'cancel' },
    {
      text: isActive ? 'Désactiver' : 'Réactiver',
      style: 'destructive',
      onPress: () => confirmToggleActive(item, isActive),
    },
  ]
);
```

## 🔍 Système de Filtrage Intégré

### 1. Filtres Standard

```typescript
const STATUS_FILTERS = [
  { 
    key: 'all', 
    label: 'Tous', 
    count: items.length, 
    color: colors.gray[600] 
  },
  { 
    key: 'active', 
    label: 'Actifs', 
    count: items.filter(i => i.is_active !== false).length, 
    color: colors.semantic.success 
  },
  { 
    key: 'inactive', 
    label: 'Inactifs', 
    count: items.filter(i => i.is_active === false).length, 
    color: colors.gray[500] 
  },
];
```

### 2. Logique de Filtrage

```typescript
const filteredItems = useMemo(() => {
  let filtered = items;
  
  // Filtrage par statut actif/inactif
  if (statusFilter === 'active') {
    filtered = filtered.filter(item => item.is_active !== false);
  } else if (statusFilter === 'inactive') {
    filtered = filtered.filter(item => item.is_active === false);
  }
  
  // Autres filtres (recherche, catégorie, etc.)
  if (searchQuery) {
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  return filtered;
}, [items, statusFilter, searchQuery]);
```

## 📊 Statistiques et Compteurs

### 1. Comptage Actifs Uniquement

```typescript
// ✅ STANDARD : Les statistiques ne comptent que les éléments actifs
const totalActiveItems = items.filter(item => item.is_active !== false).length;
const activeTractors = items.filter(item => 
  item.type === 'tractor' && item.is_active !== false
).length;
```

### 2. Affichage des Statistiques

```typescript
<View style={styles.summaryStats}>
  <View style={styles.summaryStatItem}>
    <Text style={styles.summaryNumber}>{totalActiveItems}</Text>
    <Text style={styles.summaryLabel}>Éléments actifs</Text>
  </View>
  {/* Autres statistiques basées sur les éléments actifs */}
</View>
```

## 🗃️ Gestion des Données

### 1. Création d'Éléments

```typescript
// ✅ OBLIGATOIRE : Nouveaux éléments actifs par défaut
const newItem = {
  id: generateId(),
  name: formData.name,
  // ... autres propriétés ...
  is_active: true,  // ✅ Actif par défaut
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
```

### 2. Requêtes Base de Données

```sql
-- ✅ STANDARD : Filtrer les éléments actifs par défaut
SELECT * FROM materials 
WHERE farm_id = $1 
AND is_active = true
ORDER BY created_at DESC;

-- ✅ Pour afficher tous (avec filtre)
SELECT * FROM materials 
WHERE farm_id = $1 
AND ($2 = 'all' OR 
     ($2 = 'active' AND is_active = true) OR 
     ($2 = 'inactive' AND is_active = false))
ORDER BY is_active DESC, created_at DESC;
```

### 3. Mise à Jour du Statut

```sql
-- ✅ STANDARD : Update au lieu de DELETE
UPDATE materials 
SET is_active = $2, updated_at = NOW() 
WHERE id = $1;
```

## 🔧 Interface TypeScript

### 1. Type Standard

```typescript
interface BaseEntity {
  id: string;
  name: string;
  is_active?: boolean;  // ✅ Optionnel avec défaut true
  created_at: string;
  updated_at: string;
}

// Exemple d'implémentation
interface MaterialData extends BaseEntity {
  type: 'tractor' | 'implement' | 'tool' | 'vehicle';
  brand: string;
  model: string;
  // ... autres propriétés spécifiques ...
}
```

### 2. Helpers de Validation

```typescript
// ✅ Helper pour vérifier si un élément est actif
const isActive = (item: { is_active?: boolean }) => {
  return item.is_active !== false;
};

// ✅ Helper pour filtrer les éléments actifs
const getActiveItems = <T extends { is_active?: boolean }>(items: T[]): T[] => {
  return items.filter(isActive);
};

// ✅ Helper pour filtrer les éléments inactifs
const getInactiveItems = <T extends { is_active?: boolean }>(items: T[]): T[] => {
  return items.filter(item => item.is_active === false);
};
```

## 📋 Checklist de Conformité

### ✅ Base de Données
- [ ] **Colonne `is_active`** présente avec `DEFAULT true`
- [ ] **Pas de DELETE** sur les données utilisateur
- [ ] **UPDATE** pour changer le statut
- [ ] **Index** sur `is_active` si nécessaire pour les performances

### ✅ Interface Utilisateur
- [ ] **Icônes adaptatives** (poubelle → checkmark)
- [ ] **Cartouche "Inactif"** sur les éléments désactivés
- [ ] **Modal/Alert** de confirmation selon la plateforme
- [ ] **Filtres actif/inactif** intégrés

### ✅ Logique Métier
- [ ] **Fonction `handleToggleActive`** standardisée
- [ ] **Logs** pour le debugging
- [ ] **Gestion d'état** réactive
- [ ] **Statistiques** basées sur les éléments actifs uniquement

### ✅ Expérience Utilisateur
- [ ] **Messages clairs** dans les confirmations
- [ ] **Récupération possible** des éléments inactifs
- [ ] **Historique préservé** pour l'audit
- [ ] **Performance** maintenue avec les filtres

## 🚫 Anti-Patterns à Éviter

### ❌ Suppression Définitive
```typescript
// INTERDIT : Suppression définitive
setItems(items.filter(item => item.id !== itemId));  // ❌
```

### ❌ Gestion Incohérente du Statut
```typescript
// INTERDIT : Logique incohérente
if (item.active === true)  // ❌ Utiliser is_active
if (item.deleted)          // ❌ Utiliser is_active = false
```

### ❌ Pas de Confirmation
```typescript
// INTERDIT : Pas de confirmation utilisateur
const handleDelete = () => {
  updateItemStatus(false);  // ❌ Sans confirmation
};
```

### ❌ Statistiques Incorrectes
```typescript
// INTERDIT : Compter les éléments inactifs dans les stats
const total = items.length;  // ❌ Inclut les inactifs
```

## 🔄 Migration d'un Hard Delete vers Soft Delete

### 1. Ajout de la Colonne
```sql
-- Étape 1 : Ajouter la colonne
ALTER TABLE table_name 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Étape 2 : Créer un index si nécessaire
CREATE INDEX idx_table_name_is_active ON table_name(is_active);
```

### 2. Mise à Jour du Code
```typescript
// Avant (hard delete)
const handleDelete = (id: string) => {
  setItems(items.filter(item => item.id !== id));
};

// Après (soft delete)
const handleToggleActive = (item: ItemType) => {
  // Implémentation standard du soft delete
};
```

### 3. Mise à Jour des Requêtes
```sql
-- Avant
DELETE FROM table_name WHERE id = $1;

-- Après
UPDATE table_name SET is_active = false, updated_at = NOW() WHERE id = $1;
```

---

## 🚨 RÉSUMÉ DES RÈGLES CRITIQUES

### SOFT DELETE = PRÉSERVATION OBLIGATOIRE
1. **TOUJOURS** utiliser `is_active: boolean` 
2. **JAMAIS** de DELETE définitif sur les données utilisateur
3. **TOUJOURS** une confirmation avant désactivation
4. **TOUJOURS** possibilité de réactivation
5. **TOUJOURS** filtres actif/inactif intégrés

### STRUCTURE TYPE
```typescript
// Base de données
is_active boolean NOT NULL DEFAULT true

// Interface
{item.is_active === false ? <CheckmarkIcon /> : <TrashIcon />}

// Logique
const isActive = item.is_active !== false;
```

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2024  
**Basé sur** : MaterialsSettingsScreen.tsx soft delete implementation


