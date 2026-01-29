# Guide de Design des Dropdowns - Thomas V2

## 📋 Vue d'ensemble

Ce document définit les standards de design et d'implémentation pour tous les composants dropdown de l'application Thomas V2. Il garantit une expérience utilisateur cohérente et professionnelle basée sur l'exemple du sélecteur "Type de parcelle".

## 🎯 Exemple de Référence : Type de Parcelle

Le dropdown "Type de parcelle" dans le formulaire de création de parcelles sert de modèle de référence pour tous les autres dropdowns de l'application.

### Caractéristiques du Modèle
- **Recherche inline** : Possibilité de taper directement dans le champ
- **Ajout dynamique** : Création de nouveaux éléments à la volée
- **Fond blanc** : Cohérence avec les autres champs de formulaire
- **Bordure unique** : Pas de double bordure
- **États visuels clairs** : Normal, focus, erreur, désactivé

## 🎨 Spécifications Visuelles

### 1. Conteneur Principal

```typescript
// ✅ STRUCTURE STANDARD
<TouchableOpacity
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: getBorderColor(), // Selon l'état
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: getBackgroundColor(), // Selon l'état
    minHeight: spacing.interactive.inputHeight,
    overflow: 'hidden',
    transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  }}
>
```

### 2. États Visuels Obligatoires

#### État Normal
```typescript
backgroundColor: colors.background.secondary  // Blanc (#ffffff)
borderColor: colors.border.primary           // Gris clair (#e5e7eb)
```

#### État Focus/Ouvert
```typescript
backgroundColor: colors.background.secondary  // Blanc (#ffffff)
borderColor: colors.border.focus             // Bleu (#3b82f6)
shadowColor: colors.border.focus
shadowOpacity: 0.2
shadowRadius: 4
elevation: 2
```

#### État Erreur
```typescript
backgroundColor: colors.background.secondary  // Blanc (#ffffff)
borderColor: colors.border.error             // Rouge (#ef4444)
```

#### État Désactivé
```typescript
backgroundColor: colors.gray[50]             // Gris très clair (#f9fafb)
borderColor: colors.border.primary           // Gris clair (#e5e7eb)
```

### 3. Dimensions Standards

```typescript
const DROPDOWN_SPECS = {
  minHeight: 44,              // Hauteur minimum tactile
  borderRadius: 8,            // Coins arrondis
  borderWidth: 1,             // Épaisseur de bordure
  paddingHorizontal: 16,      // Espacement horizontal interne
  paddingVertical: 12,        // Espacement vertical interne
  iconSize: 20,               // Taille des icônes (chevron, clear)
  maxDropdownHeight: 300,     // Hauteur max de la liste
};
```

## 🔧 Fonctionnalités Obligatoires

### 1. Recherche Inline (Recommandée)

```typescript
// ✅ IMPLÉMENTATION STANDARD
{inlineSearch && isOpen ? (
  <TextInput
    style={{
      ...textStyles.input,
      paddingVertical: 0,
      color: colors.text.primary,
      // ✅ CRITIQUE : Supprimer toutes les bordures natives
      borderWidth: 0,
      borderStyle: 'none',
      outline: 'none',
      boxShadow: 'none',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      appearance: 'none',
    }}
    placeholder={placeholder}
    placeholderTextColor={colors.text.tertiary}
    value={searchText}
    onChangeText={setSearchText}
  />
) : (
  <Text
    variant="body"
    color={selectedItems.length === 0 ? colors.text.tertiary : colors.text.primary}
  >
    {getDisplayText()}
  </Text>
)}
```

### 2. Bouton de Suppression

```typescript
// ✅ Bouton X pour vider la sélection
{selectedItems.length > 0 && !disabled && (
  <TouchableOpacity
    onPress={clearSelection}
    style={{ marginRight: spacing.sm, padding: 2 }}
  >
    <XIcon size={16} color={colors.gray[500]} />
  </TouchableOpacity>
)}
```

### 3. Icône d'État (Chevron)

```typescript
// ✅ Chevron qui indique l'état ouvert/fermé
{isOpen ? (
  <ChevronUpIcon size={20} color={colors.gray[500]} />
) : (
  <ChevronDownIcon size={20} color={colors.gray[500]} />
)}
```

### 4. Ajout Dynamique d'Éléments

```typescript
// ✅ Permettre l'ajout de nouveaux éléments
{filteredItems.length === 0 && searchText.trim() && onAddNew && (
  <TouchableOpacity
    onPress={() => {
      onAddNew(searchText.trim());
      setIsOpen(false);
      setSearchText('');
    }}
    style={styles.addNewButton}
  >
    <PlusIcon size={14} color={colors.primary[700]} />
    <Text color={colors.primary[700]} weight="semibold">
      Ajouter "{searchText.trim()}"
    </Text>
  </TouchableOpacity>
)}
```

## 📱 Liste Déroulante

### 1. Conteneur de la Liste

```typescript
// ✅ STRUCTURE STANDARD
<View
  style={{
    backgroundColor: colors.background.secondary, // ✅ Blanc
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 8,
    marginTop: spacing.xs,
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  }}
>
```

### 2. Éléments de Liste

```typescript
// ✅ STRUCTURE D'ÉLÉMENT
<TouchableOpacity
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    backgroundColor: selected ? colors.primary[100] : 'transparent',
  }}
  onPress={() => handleItemSelect(item)}
>
  <View style={{ flex: 1 }}>
    <Text
      variant="body"
      color={selected ? colors.primary[700] : colors.text.primary}
      weight={selected ? 'semibold' : 'normal'}
    >
      {item.label}
    </Text>
  </View>
</TouchableOpacity>
```

### 3. Animation d'Ouverture

```typescript
// ✅ ANIMATION FLUIDE
<Animated.View
  style={{
    opacity: animatedHeight,
    maxHeight: animatedHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [0, maxHeight + 100],
    }),
    overflow: 'hidden',
  }}
>
```

## 🚫 Anti-Patterns à Éviter

### ❌ Double Bordure
```typescript
// INTERDIT : TextInput avec bordure + conteneur avec bordure
<TextInput
  style={{
    borderWidth: 1,        // ❌ Crée une double bordure
    borderColor: 'black',  // ❌ Bordure native visible
  }}
/>
```

### ❌ Fond Gris sur Champs Actifs
```typescript
// INTERDIT : Fond gris sur champs modifiables
backgroundColor: colors.background.primary  // ❌ Gris au lieu de blanc
```

### ❌ Pas de Recherche
```typescript
// INTERDIT : Dropdown sans possibilité de recherche
searchable={false}  // ❌ Mauvaise UX pour les longues listes
```

### ❌ Pas d'Ajout Dynamique
```typescript
// INTERDIT : Pas de possibilité d'ajouter de nouveaux éléments
// ❌ Force l'utilisateur à sortir du formulaire
```

### ❌ Icônes Incohérentes
```typescript
// INTERDIT : Tailles d'icônes différentes
<ChevronDownIcon size={24} />  // ❌ Trop grand
<XIcon size={12} />            // ❌ Trop petit
```

## 📋 Props Obligatoires du Composant

```typescript
interface DropdownSelectorProps {
  // ✅ OBLIGATOIRES
  label?: string;                    // Label du champ
  placeholder?: string;              // Texte de placeholder
  items: DropdownItem[];            // Liste des éléments
  onSelectionChange: (items: DropdownItem[]) => void; // Callback de sélection
  
  // ✅ RECOMMANDÉES
  inlineSearch?: boolean;           // Recherche directe dans le champ
  onAddNew?: (label?: string) => void; // Ajout dynamique d'éléments
  searchable?: boolean;             // Possibilité de recherche
  disabled?: boolean;               // État désactivé
  error?: string;                   // Message d'erreur
  hint?: string;                    // Texte d'aide
  required?: boolean;               // Champ obligatoire
  
  // ✅ OPTIONNELLES
  multiSelect?: boolean;            // Sélection multiple
  maxHeight?: number;               // Hauteur max de la liste
  categories?: string[];            // Filtres par catégorie
}
```

## 🎯 Exemples d'Utilisation

### 1. Dropdown Simple (Type de Parcelle)

```typescript
<DropdownSelector
  label="Type de parcelle"
  placeholder="Sélectionnez un type"
  items={PLOT_TYPES}
  selectedItems={selectedType ? [selectedType] : []}
  onSelectionChange={(items) => setSelectedType(items[0])}
  inlineSearch={true}
  onAddNew={(label) => {
    // Ajouter un nouveau type personnalisé
    const newType = { id: 'custom', label: label || '' };
    setCustomType(newType);
    setSelectedType(newType);
  }}
  required={true}
/>
```

### 2. Dropdown avec Catégories

```typescript
<DropdownSelector
  label="Matériel"
  placeholder="Sélectionnez un matériel"
  items={materials}
  selectedItems={selectedMaterials}
  onSelectionChange={setSelectedMaterials}
  multiSelect={true}
  categories={['tracteurs', 'outils_tracteur', 'outils_manuels']}
  searchable={true}
  onAddNew={handleAddNewMaterial}
/>
```

### 3. Dropdown de Statut

```typescript
<DropdownSelector
  label="Statut"
  placeholder="Choisir un statut"
  items={STATUS_OPTIONS}
  selectedItems={selectedStatus ? [selectedStatus] : []}
  onSelectionChange={(items) => setSelectedStatus(items[0])}
  inlineSearch={false}  // Pas de recherche pour les statuts
  disabled={!canEditStatus}
/>
```

## 📊 Checklist de Conformité

### ✅ Apparence
- [ ] **Fond blanc** pour les champs actifs
- [ ] **Bordure unique** (pas de double bordure)
- [ ] **États visuels** clairs (normal, focus, erreur, désactivé)
- [ ] **Transitions fluides** entre les états
- [ ] **Ombre au focus** pour la visibilité

### ✅ Fonctionnalités
- [ ] **Recherche inline** (recommandée)
- [ ] **Bouton de suppression** (X) quand sélectionné
- [ ] **Icône d'état** (chevron up/down)
- [ ] **Ajout dynamique** d'éléments (si applicable)
- [ ] **Animation d'ouverture** fluide

### ✅ Accessibilité
- [ ] **Hauteur minimum** de 44px (tactile)
- [ ] **Contrastes** respectés
- [ ] **Labels** descriptifs
- [ ] **États** clairement indiqués

### ✅ Performance
- [ ] **Filtrage efficace** des grandes listes
- [ ] **Animation** optimisée (useNativeDriver si possible)
- [ ] **Pas de re-render** inutiles

## 🔄 Évolution et Maintenance

### Ajout d'un Nouveau Dropdown
1. **Utiliser** le composant `DropdownSelector` existant
2. **Suivre** les props obligatoires et recommandées
3. **Tester** tous les états visuels
4. **Vérifier** la conformité avec cette checklist

### Modification d'un Dropdown Existant
1. **Vérifier** la conformité avec ce guide
2. **Tester** l'impact sur l'UX
3. **Maintenir** la cohérence visuelle
4. **Documenter** les changements si nécessaires

---

## 🚨 RÉSUMÉ DES RÈGLES CRITIQUES

### DROPDOWN = COHÉRENCE OBLIGATOIRE
1. **TOUJOURS** fond blanc pour les champs actifs
2. **JAMAIS** de double bordure (supprimer les bordures natives)
3. **TOUJOURS** recherche inline pour les longues listes
4. **TOUJOURS** possibilité d'ajout dynamique si applicable
5. **TOUJOURS** états visuels clairs et transitions fluides

### STRUCTURE TYPE
```typescript
<DropdownSelector
  label="Label descriptif"
  placeholder="Texte d'aide"
  items={items}
  selectedItems={selected}
  onSelectionChange={handleChange}
  inlineSearch={true}
  onAddNew={handleAddNew}
  required={true}
/>
```

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2024  
**Basé sur** : DropdownSelector "Type de parcelle" dans PlotsSettingsScreen.tsx


