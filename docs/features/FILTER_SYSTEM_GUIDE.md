# Guide du Système de Filtres - Thomas V2

## 📋 Vue d'ensemble

Ce document définit les standards de design et d'implémentation pour tous les systèmes de filtres de l'application Thomas V2. Il garantit une cohérence visuelle et comportementale à travers toute l'application.

## 🎨 Design Standard des Filtres

### 🚨 RÈGLE FONDAMENTALE : Design Unifié
- **OBLIGATOIRE** : Tous les filtres doivent suivre le design de `ConversionFilters.tsx`
- **INTERDIT** : Créer des styles de filtres personnalisés sans justification
- **COMPORTEMENT** : ScrollView horizontal avec chips arrondis et badges de comptage
- **COULEURS** : Palette définie selon le type de filtre

## 🏗️ Structure Standard des Filtres

### 1. Layout Principal

```typescript
// ✅ STRUCTURE STANDARD
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.scrollContent}
>
  {FILTER_OPTIONS.map((filter) => {
    const isSelected = selectedFilter === filter.key;
    const count = getCountForFilter(filter.key);
    
    return (
      <TouchableOpacity
        key={filter.key}
        style={[
          styles.filterChip,
          isSelected && {
            backgroundColor: filter.color,
            borderColor: filter.color,
          },
        ]}
        onPress={() => onFilterChange(filter.key)}
      >
        <Text
          variant="caption"
          weight="medium"
          color={isSelected ? colors.text.inverse : colors.text.secondary}
        >
          {filter.label}
        </Text>
        
        {count > 0 && (
          <View style={[styles.countBadge, isSelected && styles.countBadgeSelected]}>
            <Text
              variant="caption"
              weight="bold"
              color={isSelected ? filter.color : colors.text.inverse}
              style={{ fontSize: 10 }}
            >
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  })}
</ScrollView>
```

### 2. Styles Obligatoires

```typescript
const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,                    // ✅ OBLIGATOIRE : 20px
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.gray[300],
    gap: spacing.xs,
  },
  countBadge: {
    backgroundColor: colors.primary[600],
    borderRadius: 10,                    // ✅ OBLIGATOIRE : 10px
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeSelected: {
    backgroundColor: colors.background.secondary,  // ✅ Badge inversé quand sélectionné
  },
});
```

## 🎯 Palette de Couleurs Standard

### Couleurs par Type de Filtre

```typescript
// Filtres de statut (Actif/Inactif)
const STATUS_COLORS = {
  all: colors.gray[600],           // Gris neutre
  active: colors.semantic.success, // Vert
  inactive: colors.gray[500],      // Gris foncé
} as const;

// Filtres de catégorie (selon le contexte)
const CATEGORY_COLORS = {
  all: colors.gray[600],           // Gris neutre
  primary: colors.primary[600],    // Bleu principal
  secondary: colors.semantic.warning, // Orange/Jaune
  tertiary: colors.semantic.info,  // Bleu clair
  custom: colors.purple[600],      // Violet pour personnalisé
} as const;

// Filtres de priorité
const PRIORITY_COLORS = {
  all: colors.gray[600],
  low: colors.semantic.success,    // Vert
  medium: colors.semantic.warning, // Orange
  high: colors.semantic.error,     // Rouge
  urgent: colors.red[700],         // Rouge foncé
} as const;
```

### États Visuels

#### État Normal (Non sélectionné)
```typescript
backgroundColor: colors.background.secondary  // Blanc
borderColor: colors.gray[300]                // Gris clair
textColor: colors.text.secondary             // Gris moyen
badgeColor: colors.primary[600]              // Bleu
```

#### État Sélectionné
```typescript
backgroundColor: filter.color                // Couleur du filtre
borderColor: filter.color                    // Même couleur
textColor: colors.text.inverse               // Blanc
badgeColor: colors.background.secondary      // Blanc (inversé)
badgeTextColor: filter.color                 // Couleur du filtre
```

## 📐 Dimensions Standards

### Tailles Obligatoires
- **Chip height** : Auto (padding vertical `spacing.sm`)
- **Chip border-radius** : `20px`
- **Badge size** : `20x20px` minimum
- **Badge border-radius** : `10px`
- **Gap entre chips** : `spacing.sm`
- **Padding horizontal container** : `spacing.lg`

### Espacement
```typescript
// Container
paddingHorizontal: spacing.lg    // 24px
gap: spacing.sm                  // 8px

// Chip interne
paddingHorizontal: spacing.md    // 16px
paddingVertical: spacing.sm      // 8px
gap: spacing.xs                  // 4px (entre texte et badge)

// Badge interne
paddingHorizontal: 6             // 6px fixe
```

## 🔧 Logique Standard

### 1. Fonction de Comptage

```typescript
const getCountForFilter = (filterKey: string) => {
  if (filterKey === 'all') return items.length;
  
  return items.filter(item => {
    // Logique spécifique selon le type de filtre
    switch (filterKey) {
      case 'active':
        return item.is_active !== false;
      case 'inactive':
        return item.is_active === false;
      default:
        return item.category === filterKey;
    }
  }).length;
};
```

### 2. Gestion des États

```typescript
const [selectedFilter, setSelectedFilter] = useState<string>('all');

const handleFilterChange = (filterKey: string) => {
  setSelectedFilter(filterKey);
  // Déclencher le filtrage des données
  onFilterChange?.(filterKey);
};
```

### 3. Filtrage des Données

```typescript
const filteredItems = useMemo(() => {
  if (selectedFilter === 'all') return items;
  
  return items.filter(item => {
    // Logique de filtrage personnalisée
    return matchesFilter(item, selectedFilter);
  });
}, [items, selectedFilter]);
```

## 📱 Responsive Design

### Mobile
- **ScrollView horizontal** obligatoire
- **Touch targets** : minimum 44px de hauteur
- **Espacement** : `spacing.sm` entre les chips

### Web
- **Même design** que mobile
- **Hover states** : légère opacité ou élévation
- **Focus states** : outline pour l'accessibilité

## ✅ Exemples d'Implémentation

### Filtre de Statut (Matériels)
```typescript
const STATUS_FILTERS = [
  { key: 'all', label: 'Tous', count: materials.length, color: colors.gray[600] },
  { key: 'active', label: 'Actifs', count: activeCount, color: colors.semantic.success },
  { key: 'inactive', label: 'Inactifs', count: inactiveCount, color: colors.gray[500] },
];
```

### Filtre de Catégorie (Conversions)
```typescript
const CATEGORY_FILTERS = [
  { key: 'all', label: 'Tout', color: colors.gray[600] },
  { key: 'recolte', label: 'Récolte', color: colors.semantic.success },
  { key: 'intrant', label: 'Intrant', color: colors.semantic.warning },
  { key: 'custom', label: 'Personnalisé', color: colors.gray[600] },
];
```

### Filtre de Priorité (Tâches)
```typescript
const PRIORITY_FILTERS = [
  { key: 'all', label: 'Toutes', color: colors.gray[600] },
  { key: 'low', label: 'Basse', color: colors.semantic.success },
  { key: 'medium', label: 'Moyenne', color: colors.semantic.warning },
  { key: 'high', label: 'Haute', color: colors.semantic.error },
  { key: 'urgent', label: 'Urgente', color: colors.red[700] },
];
```

## 🚫 Anti-Patterns à Éviter

### ❌ Styles Personnalisés
```typescript
// INTERDIT : Styles différents
style={{
  backgroundColor: '#custom-color',
  borderRadius: 15,  // Différent de 20
  padding: 10,       // Padding fixe au lieu de spacing
}}
```

### ❌ Badges Manquants
```typescript
// INTERDIT : Pas de comptage
<Text>{filter.label}</Text>  // Sans badge de count
```

### ❌ Couleurs Arbitraires
```typescript
// INTERDIT : Couleurs non standardisées
color: '#ff5733'  // Au lieu d'utiliser colors.semantic.*
```

### ❌ Layout Vertical
```typescript
// INTERDIT : Layout vertical pour les filtres
<View style={{ flexDirection: 'column' }}>  // Doit être horizontal
```

## 📋 Checklist de Conformité

### ✅ Design
- [ ] **ScrollView horizontal** avec `showsHorizontalScrollIndicator={false}`
- [ ] **Chips arrondis** avec `borderRadius: 20`
- [ ] **Badges circulaires** avec `borderRadius: 10`
- [ ] **Couleurs standardisées** selon le type de filtre
- [ ] **États sélectionné/non-sélectionné** correctement implémentés

### ✅ Comportement
- [ ] **Comptage dynamique** avec badges
- [ ] **Gestion d'état** avec `useState`
- [ ] **Filtrage réactif** des données
- [ ] **Performance** avec `useMemo` si nécessaire

### ✅ Accessibilité
- [ ] **Touch targets** suffisants (44px minimum)
- [ ] **Contrastes** respectés
- [ ] **Focus states** pour le web
- [ ] **Labels** descriptifs

## 🔄 Évolution et Maintenance

### Ajout d'un Nouveau Type de Filtre
1. **Définir la palette** de couleurs dans ce document
2. **Créer les constantes** de filtres
3. **Implémenter** selon la structure standard
4. **Tester** la conformité avec cette checklist

### Modification d'un Filtre Existant
1. **Vérifier** la conformité avec ce guide
2. **Justifier** toute déviation du standard
3. **Mettre à jour** ce document si nécessaire
4. **Propager** les changements aux autres filtres

---

## 🚨 RÉSUMÉ DES RÈGLES CRITIQUES

### DESIGN = COHÉRENCE OBLIGATOIRE
1. **TOUJOURS** utiliser le design de `ConversionFilters.tsx`
2. **JAMAIS** de styles personnalisés sans justification
3. **TOUJOURS** des badges de comptage
4. **TOUJOURS** des couleurs standardisées selon le type
5. **TOUJOURS** ScrollView horizontal avec chips arrondis

### STRUCTURE TYPE
```typescript
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  <TouchableOpacity style={[styles.filterChip, selected && selectedStyle]}>
    <Text>{label}</Text>
    <View style={styles.countBadge}>
      <Text>{count}</Text>
    </View>
  </TouchableOpacity>
</ScrollView>
```

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2024  
**Basé sur** : ConversionFilters.tsx et MaterialsSettingsScreen.tsx implementations


