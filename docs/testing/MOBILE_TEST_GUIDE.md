# Guide de Tests Mobile - Formulaires Thomas V2

## 📱 Objectifs des Tests Mobile

Vérifier que tous les formulaires migrés fonctionnent correctement sur :
- **iPhone** (iOS Safari)
- **Android** (Chrome Mobile)
- **iPad** (Safari)

## 🎯 Points de Test Critiques

### 1. Affichage Fullscreen ✅
**Objectif**: Vérifier que tous les modaux de formulaire s'affichent en plein écran

**Test à effectuer**:
- Ouvrir chaque formulaire modal
- Vérifier qu'il occupe 100% de l'écran
- Vérifier qu'il n'y a pas de marges sur les côtés

**Formulaires à tester**:
- TaskEditModal
- ObservationEditModal  
- FarmEditModal
- CultureModal
- ContainerModal
- PlotFormModal

### 2. Scroll et Navigation ✅
**Objectif**: Vérifier que le scroll fonctionne correctement

**Test à effectuer**:
- Ouvrir un formulaire long (ex: PlotFormModal)
- Faire défiler vers le bas
- Vérifier que tous les champs sont accessibles
- Vérifier que les boutons d'action restent visibles

### 3. Clavier et Saisie ✅
**Objectif**: Vérifier l'interaction avec le clavier mobile

**Test à effectuer**:
- Taper dans différents types de champs (texte, numérique, multiline)
- Vérifier que le clavier approprié s'affiche
- Vérifier que la vue se décale correctement
- Tester la navigation entre champs avec "Suivant"

**Points spécifiques**:
- Champs numériques → clavier numérique
- Champs email → clavier avec @
- Champs multiline → clavier avec retour à la ligne

### 4. Touch Targets ✅
**Objectif**: Vérifier que tous les éléments sont facilement touchables

**Test à effectuer**:
- Vérifier que les boutons font au moins 44px de hauteur
- Tester les dropdowns et sélecteurs
- Vérifier l'espacement entre les éléments

### 5. Responsive Design ✅
**Objectif**: Vérifier l'adaptation aux différentes tailles d'écran

**Tailles à tester**:
- iPhone SE (375px) - Petit écran
- iPhone 14 (390px) - Écran standard
- iPhone 14 Plus (428px) - Grand écran
- iPad (768px) - Tablette portrait
- iPad (1024px) - Tablette paysage

## 📋 Checklist par Formulaire

### ✅ TaskEditModal
- [ ] Affichage fullscreen
- [ ] Scroll fluide
- [ ] Champs de saisie fonctionnels
- [ ] Dropdowns accessibles
- [ ] Boutons d'action visibles
- [ ] Navigation clavier

### ✅ ObservationEditModal  
- [ ] Affichage fullscreen
- [ ] Scroll fluide
- [ ] Champs multiline fonctionnels
- [ ] Sélection de sévérité
- [ ] PhotoPicker fonctionnel
- [ ] Sauvegarde/annulation

### ✅ FarmEditModal
- [ ] Affichage fullscreen
- [ ] Champs en ligne (RowFields)
- [ ] Validation en temps réel
- [ ] Bannière d'information
- [ ] Actions principales

### ✅ CultureModal & ContainerModal
- [ ] Affichage fullscreen (plus de double header)
- [ ] Formulaire simple et clair
- [ ] Champs obligatoires marqués
- [ ] Validation fonctionnelle

### ✅ PlotFormModal
- [ ] Affichage fullscreen
- [ ] Sections multiples
- [ ] Champs dynamiques (unités de surface)
- [ ] Aperçu des codes générés
- [ ] Options avancées collapsibles

### ✅ AddDocumentScreen
- [ ] Modal fullscreen
- [ ] Upload de fichiers
- [ ] Prévisualisation
- [ ] Catégories dropdown

### ✅ CreateNotificationScreen & FarmEditScreen
- [ ] Écran full-page (FormScreen)
- [ ] Header avec bouton retour
- [ ] Boutons sticky en bas
- [ ] Scroll avec KeyboardAvoidingView

## 🔧 Optimisations Mobile Implémentées

### 1. Tailles de Police
```css
fontSize: 16px /* Évite l'auto-zoom sur iOS */
```

### 2. Touch Targets
```css
minHeight: 44px /* Standard iOS/Android */
padding: spacing.md /* Espacement suffisant */
```

### 3. Keyboard Handling
```tsx
<KeyboardAvoidingView 
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
/>
```

### 4. Scroll Optimization
```tsx
<ScrollView 
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"
/>
```

### 5. Input Styling
```css
/* Supprime l'auto-zoom et les styles natifs */
-webkit-appearance: none;
font-size: 16px;
outline: none;
```

## 📊 Métriques de Performance Mobile

### Temps de Chargement Cibles
- **Ouverture modal**: < 300ms
- **Affichage clavier**: < 200ms
- **Scroll fluide**: 60fps
- **Validation temps réel**: < 100ms

### Tailles d'Écran Supportées
- **Minimum**: 320px (iPhone SE)
- **Maximum**: 1024px (iPad paysage)
- **Breakpoints**: 375px, 428px, 768px

## 🧪 Tests Automatisés Possibles

### 1. Tests de Rendu
```javascript
// Vérifier que les modaux s'ouvrent en fullscreen
expect(modal).toHaveStyle({ width: '100%', height: '100%' });
```

### 2. Tests d'Interaction
```javascript
// Vérifier que les champs sont focusables
fireEvent.press(textInput);
expect(textInput).toBeFocused();
```

### 3. Tests de Validation
```javascript
// Vérifier la validation en temps réel
fireEvent.changeText(input, 'invalid');
expect(errorMessage).toBeVisible();
```

## 🎯 Résultats Attendus

Après ces tests, tous les formulaires doivent :
- ✅ S'afficher correctement sur tous les appareils
- ✅ Être facilement utilisables au doigt
- ✅ Avoir un scroll fluide et naturel
- ✅ Gérer le clavier intelligemment
- ✅ Respecter les standards iOS/Android

## 📝 Rapport de Test à Compléter

Pour chaque appareil testé, noter :
- ✅ Formulaires fonctionnels
- ❌ Problèmes identifiés
- 📝 Améliorations suggérées
- 🔧 Corrections nécessaires
