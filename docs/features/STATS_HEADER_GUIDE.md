# Guide de l'En-tête Statistiques - Thomas V2

## 📋 Vue d'ensemble

Ce document définit les standards de design et d'implémentation pour tous les en-têtes de statistiques de l'application Thomas V2. Il garantit une présentation cohérente des données chiffrées à travers toute l'application.

## 🎨 Design Standard de l'En-tête Statistiques

### 🚨 RÈGLE FONDAMENTALE : 3 Statistiques Maximum
- **OBLIGATOIRE** : Afficher exactement 3 statistiques principales
- **INTERDIT** : Plus de 3 stats dans l'en-tête (utiliser des sections séparées)
- **COMPORTEMENT** : Carte unique avec icône, titre et 3 colonnes équilibrées
- **DESIGN** : Fond blanc, ombre légère, icône colorée à gauche

## 🏗️ Structure Standard

### 1. Layout Principal

```typescript
// ✅ STRUCTURE OBLIGATOIRE
<View style={styles.summaryCard}>
  <View style={styles.summaryHeader}>
    <IconComponent color={colors.semantic.success} size={22} />
    <Text variant="h3" style={styles.summaryTitle}>
      Aperçu de vos données
    </Text>
  </View>

  <View style={styles.summaryStats}>
    <View style={styles.summaryStatItem}>
      <Text style={styles.summaryNumber}>{stat1Value}</Text>
      <Text style={styles.summaryLabel}>{stat1Label}</Text>
    </View>
    <View style={styles.summaryStatItem}>
      <Text style={styles.summaryNumber}>{stat2Value}</Text>
      <Text style={styles.summaryLabel}>{stat2Label}</Text>
    </View>
    <View style={styles.summaryStatItem}>
      <Text style={styles.summaryNumber}>{stat3Value}</Text>
      <Text style={styles.summaryLabel}>{stat3Label}</Text>
    </View>
  </View>
</View>
```

### 2. Styles Obligatoires

```typescript
const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.background.secondary,  // ✅ OBLIGATOIRE : Blanc
    borderRadius: 12,                             // ✅ OBLIGATOIRE : 12px
    padding: spacing.lg,                          // ✅ OBLIGATOIRE : 24px
    marginBottom: spacing.xl,                     // ✅ OBLIGATOIRE : 32px
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,                          // ✅ OBLIGATOIRE : Ombre légère
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,                     // ✅ OBLIGATOIRE : 16px
    gap: spacing.sm,                              // ✅ OBLIGATOIRE : 8px
  },
  summaryTitle: {
    color: colors.text.primary,
    fontSize: 18,                                 // ✅ OBLIGATOIRE : 18px
    fontWeight: '600',                            // ✅ OBLIGATOIRE : Semi-bold
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',              // ✅ OBLIGATOIRE : Distribution égale
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,                                      // ✅ OBLIGATOIRE : Largeur égale
  },
  summaryNumber: {
    fontSize: 20,                                 // ✅ OBLIGATOIRE : 20px
    fontWeight: '700',                            // ✅ OBLIGATOIRE : Bold
    color: colors.semantic.success,               // ✅ OBLIGATOIRE : Vert
    marginBottom: 2,                              // ✅ OBLIGATOIRE : 2px
  },
  summaryLabel: {
    fontSize: 12,                                 // ✅ OBLIGATOIRE : 12px
    color: colors.text.secondary,                 // ✅ OBLIGATOIRE : Gris
    textAlign: 'center',                          // ✅ OBLIGATOIRE : Centré
  },
});
```

## 🎯 Choix des Icônes par Contexte

### Icônes Standard par Domaine

```typescript
// Matériel / Équipements
<WrenchScrewdriverIcon color={colors.semantic.success} size={22} />

// Fermes / Exploitations
<BuildingOfficeIcon color={colors.primary[600]} size={22} />

// Tâches / Planning
<ClipboardDocumentListIcon color={colors.semantic.warning} size={22} />

// Parcelles / Terrains
<MapIcon color={colors.semantic.info} size={22} />

// Utilisateurs / Membres
<UsersIcon color={colors.purple[600]} size={22} />

// Conversions / Unités
<ArrowsRightLeftIcon color={colors.semantic.warning} size={22} />

// Observations / Analyses
<EyeIcon color={colors.semantic.info} size={22} />

// Finances / Coûts
<CalculatorIcon color={colors.semantic.success} size={22} />
```

### Couleurs d'Icônes Standardisées

```typescript
const ICON_COLORS = {
  primary: colors.primary[600],        // Bleu - Fermes, général
  success: colors.semantic.success,    // Vert - Matériel, finances
  warning: colors.semantic.warning,    // Orange - Tâches, conversions
  info: colors.semantic.info,          // Bleu clair - Parcelles, observations
  purple: colors.purple[600],          // Violet - Utilisateurs
  gray: colors.gray[600],              // Gris - Données neutres
} as const;
```

## 📊 Types de Statistiques Standard

### 1. Comptage Simple (Le plus courant)

```typescript
// ✅ EXEMPLE : Matériels
const stats = [
  { value: totalMaterials, label: 'Matériels' },
  { value: tractorCount, label: 'Tracteurs' },
  { value: implementCount, label: 'Outils attelés' },
];
```

### 2. Répartition par Statut

```typescript
// ✅ EXEMPLE : Tâches
const stats = [
  { value: totalTasks, label: 'Tâches' },
  { value: completedTasks, label: 'Terminées' },
  { value: pendingTasks, label: 'En attente' },
];
```

### 3. Métriques de Performance

```typescript
// ✅ EXEMPLE : Fermes
const stats = [
  { value: totalFarms, label: 'Fermes' },
  { value: `${totalArea}ha`, label: 'Surface totale' },
  { value: activePlots, label: 'Parcelles actives' },
];
```

### 4. Données Temporelles

```typescript
// ✅ EXEMPLE : Observations
const stats = [
  { value: totalObservations, label: 'Observations' },
  { value: thisWeekCount, label: 'Cette semaine' },
  { value: criticalCount, label: 'Critiques' },
];
```

## 🎨 Variations de Couleurs pour les Chiffres

### Couleur Standard (Recommandée)
```typescript
// ✅ DÉFAUT : Vert pour tous les chiffres
color: colors.semantic.success  // Cohérence et positivité
```

### Couleurs Contextuelles (Optionnel)
```typescript
// Selon le type de donnée
const getNumberColor = (type: 'positive' | 'neutral' | 'warning' | 'error') => {
  switch (type) {
    case 'positive': return colors.semantic.success;   // Vert
    case 'neutral': return colors.text.primary;        // Noir
    case 'warning': return colors.semantic.warning;    // Orange
    case 'error': return colors.semantic.error;        // Rouge
  }
};

// Exemple d'usage
<Text style={[styles.summaryNumber, { color: getNumberColor('warning') }]}>
  {criticalTasksCount}
</Text>
```

## 📐 Dimensions et Espacements

### Tailles Obligatoires
- **Card padding** : `spacing.lg` (24px)
- **Card border-radius** : `12px`
- **Card margin-bottom** : `spacing.xl` (32px)
- **Header margin-bottom** : `spacing.md` (16px)
- **Header gap** : `spacing.sm` (8px)
- **Number margin-bottom** : `2px` fixe

### Typographie Standardisée
```typescript
// Titre de la carte
fontSize: 18
fontWeight: '600'
color: colors.text.primary

// Chiffres des statistiques
fontSize: 20
fontWeight: '700'
color: colors.semantic.success (par défaut)

// Labels des statistiques
fontSize: 12
color: colors.text.secondary
textAlign: 'center'
```

## 🔧 Logique de Calcul Standard

### 1. Filtrage des Données Actives

```typescript
// ✅ STANDARD : Ne compter que les éléments actifs
const totalActive = items.filter(item => item.is_active !== false).length;
const totalByType = items.filter(item => 
  item.type === targetType && item.is_active !== false
).length;
```

### 2. Calculs Réactifs avec useMemo

```typescript
const stats = useMemo(() => {
  const activeItems = items.filter(item => item.is_active !== false);
  
  return {
    total: activeItems.length,
    type1: activeItems.filter(item => item.type === 'type1').length,
    type2: activeItems.filter(item => item.type === 'type2').length,
  };
}, [items]);
```

### 3. Gestion des Cas Vides

```typescript
// ✅ Affichage cohérent même avec 0 éléments
const displayValue = (value: number, suffix?: string) => {
  return value === 0 ? '0' : `${value}${suffix || ''}`;
};

// Usage
<Text style={styles.summaryNumber}>
  {displayValue(stats.total)}
</Text>
```

## 📱 Responsive Design

### Mobile (Défaut)
```typescript
// ✅ Layout horizontal avec 3 colonnes égales
summaryStats: {
  flexDirection: 'row',
  justifyContent: 'space-between',
}
summaryStatItem: {
  alignItems: 'center',
  flex: 1,
}
```

### Tablette/Web (Optionnel)
```typescript
// Même layout, mais possibilité d'ajuster les tailles
summaryStatItem: {
  alignItems: 'center',
  flex: 1,
  minWidth: 80,  // Largeur minimum pour éviter l'écrasement
}
```

## ✅ Exemples d'Implémentation

### Matériels (Référence)
```typescript
<View style={styles.summaryCard}>
  <View style={styles.summaryHeader}>
    <WrenchScrewdriverIcon color={colors.semantic.success} size={22} />
    <Text variant="h3" style={styles.summaryTitle}>
      Aperçu de vos données
    </Text>
  </View>

  <View style={styles.summaryStats}>
    <View style={styles.summaryStatItem}>
      <Text style={styles.summaryNumber}>{totalMaterials}</Text>
      <Text style={styles.summaryLabel}>Matériels</Text>
    </View>
    <View style={styles.summaryStatItem}>
      <Text style={styles.summaryNumber}>{tractorCount}</Text>
      <Text style={styles.summaryLabel}>Tracteurs</Text>
    </View>
    <View style={styles.summaryStatItem}>
      <Text style={styles.summaryNumber}>{implementCount}</Text>
      <Text style={styles.summaryLabel}>Outils attelés</Text>
    </View>
  </View>
</View>
```

### Fermes
```typescript
<View style={styles.summaryCard}>
  <View style={styles.summaryHeader}>
    <BuildingOfficeIcon color={colors.primary[600]} size={22} />
    <Text variant="h3" style={styles.summaryTitle}>
      Vue d'ensemble
    </Text>
  </View>

  <View style={styles.summaryStats}>
    <View style={styles.summaryStatItem}>
      <Text style={styles.summaryNumber}>{totalFarms}</Text>
      <Text style={styles.summaryLabel}>Fermes</Text>
    </View>
    <View style={styles.summaryStatItem}>
      <Text style={styles.summaryNumber}>{totalArea}ha</Text>
      <Text style={styles.summaryLabel}>Surface</Text>
    </View>
    <View style={styles.summaryStatItem}>
      <Text style={styles.summaryNumber}>{activePlots}</Text>
      <Text style={styles.summaryLabel}>Parcelles</Text>
    </View>
  </View>
</View>
```

### Tâches
```typescript
<View style={styles.summaryCard}>
  <View style={styles.summaryHeader}>
    <ClipboardDocumentListIcon color={colors.semantic.warning} size={22} />
    <Text variant="h3" style={styles.summaryTitle}>
      État des tâches
    </Text>
  </View>

  <View style={styles.summaryStats}>
    <View style={styles.summaryStatItem}>
      <Text style={styles.summaryNumber}>{totalTasks}</Text>
      <Text style={styles.summaryLabel}>Total</Text>
    </View>
    <View style={styles.summaryStatItem}>
      <Text style={[styles.summaryNumber, { color: colors.semantic.success }]}>
        {completedTasks}
      </Text>
      <Text style={styles.summaryLabel}>Terminées</Text>
    </View>
    <View style={styles.summaryStatItem}>
      <Text style={[styles.summaryNumber, { color: colors.semantic.warning }]}>
        {pendingTasks}
      </Text>
      <Text style={styles.summaryLabel}>En attente</Text>
    </View>
  </View>
</View>
```

## 🚫 Anti-Patterns à Éviter

### ❌ Plus de 3 Statistiques
```typescript
// INTERDIT : Trop de colonnes
<View style={styles.summaryStats}>
  <StatItem />  <StatItem />  <StatItem />  <StatItem />  {/* ❌ 4 stats */}
</View>
```

### ❌ Styles Personnalisés
```typescript
// INTERDIT : Dévier du design standard
summaryCard: {
  backgroundColor: '#custom-color',  // ❌ Utiliser colors.background.secondary
  borderRadius: 8,                  // ❌ Doit être 12
  padding: 20,                      // ❌ Utiliser spacing.lg
}
```

### ❌ Icônes Incohérentes
```typescript
// INTERDIT : Taille ou couleur arbitraire
<CustomIcon size={18} color="#ff0000" />  // ❌ Doit être size={22} avec couleur standard
```

### ❌ Typographie Incohérente
```typescript
// INTERDIT : Tailles de police différentes
summaryNumber: {
  fontSize: 24,  // ❌ Doit être 20
  fontWeight: '500',  // ❌ Doit être '700'
}
```

### ❌ Layout Vertical
```typescript
// INTERDIT : Empilement vertical des stats
summaryStats: {
  flexDirection: 'column',  // ❌ Doit être 'row'
}
```

## 📋 Checklist de Conformité

### ✅ Structure
- [ ] **Exactement 3 statistiques** dans l'en-tête
- [ ] **Icône contextuelle** à gauche du titre
- [ ] **Titre descriptif** ("Aperçu de vos données", "Vue d'ensemble", etc.)
- [ ] **Layout horizontal** avec colonnes égales

### ✅ Design
- [ ] **Card blanche** avec ombre légère
- [ ] **Border-radius 12px** et padding `spacing.lg`
- [ ] **Icône 22px** avec couleur standardisée
- [ ] **Typographie** respectée (18px titre, 20px chiffres, 12px labels)

### ✅ Données
- [ ] **Calculs réactifs** avec useMemo si nécessaire
- [ ] **Filtrage des éléments actifs** uniquement
- [ ] **Gestion des cas vides** (affichage de 0)
- [ ] **Labels descriptifs** et courts

### ✅ Accessibilité
- [ ] **Contrastes suffisants** pour tous les textes
- [ ] **Tailles de touch targets** appropriées
- [ ] **Labels explicites** pour les lecteurs d'écran

## 🔄 Évolution et Maintenance

### Ajout d'un Nouvel En-tête
1. **Choisir l'icône** appropriée selon le contexte
2. **Définir les 3 statistiques** les plus importantes
3. **Implémenter** selon la structure standard
4. **Tester** avec des données vides et pleines

### Modification d'un En-tête Existant
1. **Vérifier** la conformité avec ce guide
2. **Justifier** toute déviation du standard
3. **Maintenir** les 3 statistiques maximum
4. **Tester** l'impact sur les performances

---

## 🚨 RÉSUMÉ DES RÈGLES CRITIQUES

### EN-TÊTE = 3 STATS MAXIMUM
1. **TOUJOURS** exactement 3 statistiques
2. **JAMAIS** plus de 3 colonnes dans l'en-tête
3. **TOUJOURS** une icône contextuelle colorée
4. **TOUJOURS** le design de carte blanche standard
5. **TOUJOURS** des chiffres verts (sauf contexte spécial)

### STRUCTURE TYPE
```typescript
<Card>
  <Header>
    <Icon color={contextColor} size={22} />
    <Title>Aperçu de vos données</Title>
  </Header>
  <Stats>
    <Stat><Number>{value1}</Number><Label>{label1}</Label></Stat>
    <Stat><Number>{value2}</Number><Label>{label2}</Label></Stat>
    <Stat><Number>{value3}</Number><Label>{label3}</Label></Stat>
  </Stats>
</Card>
```

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2024  
**Basé sur** : MaterialsSettingsScreen.tsx stats header implementation


