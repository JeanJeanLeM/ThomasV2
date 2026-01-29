# Guide de Style des Champs de Saisie (Input)

## 🎯 Objectif
Assurer une cohérence visuelle parfaite entre les bordures affichées et les bordures réelles des champs de saisie sur toutes les plateformes.

## 🎨 Principes de Design

### Bordures
- **Une seule bordure** : Seul le conteneur a une bordure, jamais le TextInput natif
- **Cohérence visuelle** : Ce que l'utilisateur voit correspond exactement à la zone cliquable
- **États distincts** : Bordures différentes pour normal, focus, erreur, désactivé

### États des Champs

#### 1. État Normal
```typescript
borderColor: colors.border.primary
borderWidth: 1
backgroundColor: colors.gray[50]
```

#### 2. État Focus
```typescript
borderColor: colors.border.focus
borderWidth: 1
shadowColor: colors.border.focus
shadowOpacity: 0.2
shadowRadius: 4
```

#### 3. État Erreur
```typescript
borderColor: colors.border.error
borderWidth: 1
// Pas d'ombre pour éviter la confusion
```

#### 4. État Désactivé
```typescript
borderColor: colors.border.primary
backgroundColor: colors.gray[50]
opacity: 0.6
```

## 🔧 Implémentation Technique

### Suppression des Bordures Natives

#### React Native
```typescript
// Dans le style du TextInput
borderWidth: 0,
borderStyle: 'none',
outline: 'none',
```

#### Web (CSS)
```css
input, textarea {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
```

### Structure du Composant
```typescript
<View style={containerStyle}>
  {label && <Text>{label}</Text>}
  
  <View style={inputContainerStyle}> {/* ← Seule bordure visible */}
    {leftIcon}
    <TextInput style={inputStyle} /> {/* ← Aucune bordure */}
    {rightIcon}
  </View>
  
  {error && <Text>{error}</Text>}
  {hint && <Text>{hint}</Text>}
</View>
```

## ✅ Bonnes Pratiques

### ✅ À Faire
- Utiliser une seule bordure sur le conteneur
- Supprimer complètement les bordures natives du TextInput
- Ajouter des transitions douces entre les états
- Tester sur toutes les plateformes (iOS, Android, Web)
- Utiliser des couleurs cohérentes avec le design system

### ❌ À Éviter
- Double bordures (conteneur + TextInput)
- Bordures natives non supprimées
- États de focus peu visibles
- Incohérence entre plateformes
- Transitions brusques

## 🧪 Tests de Validation

### Checklist Visuelle
- [ ] Bordure unique et nette
- [ ] Pas de double bordure au focus
- [ ] Cohérence entre l'apparence et la zone cliquable
- [ ] Transitions fluides entre les états
- [ ] Rendu identique sur iOS, Android et Web

### Tests d'Interaction
- [ ] Clic/tap fonctionne sur toute la zone visible
- [ ] Focus visible et distinct
- [ ] États d'erreur clairs
- [ ] Accessibilité préservée

## 🎨 Couleurs Standardisées

```typescript
const inputColors = {
  border: {
    primary: colors.gray[300],    // État normal
    focus: colors.primary[500],   // État focus
    error: colors.semantic.error, // État erreur
  },
  background: {
    normal: colors.gray[50],      // Fond normal
    disabled: colors.gray[100],   // Fond désactivé
  },
  text: {
    primary: colors.text.primary,   // Texte normal
    placeholder: colors.text.tertiary, // Placeholder
    disabled: colors.text.tertiary,    // Texte désactivé
  }
};
```

## 📱 Compatibilité Plateformes

### iOS
- Suppression de l'apparence native avec `appearance: 'none'`
- Gestion des safe areas si nécessaire

### Android
- Suppression des ripple effects natifs
- Gestion des différentes versions d'Android

### Web
- CSS global pour supprimer les styles navigateur
- Gestion des pseudo-classes (:focus, :hover)
- Compatibilité cross-browser

## 🔄 Maintenance

### Mise à Jour
- Tester après chaque mise à jour d'Expo/React Native
- Vérifier la cohérence après ajout de nouveaux composants
- Maintenir la documentation à jour

### Monitoring
- Surveiller les rapports de bugs liés aux inputs
- Tester régulièrement sur différents appareils
- Valider l'accessibilité périodiquement


