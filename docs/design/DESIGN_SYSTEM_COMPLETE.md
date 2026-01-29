# Guide Complet du Design System - Thomas V2

## 📱 Mobile-First

Ce design system est optimisé **Mobile-First** pour les agriculteurs français. La priorité est donnée à l'expérience mobile et tablette.

---

## 🎨 Couleurs

### Import
```typescript
import { colors } from '@/design-system/colors';
```

### Palette Principale
- **Primary (Vert)** : `colors.primary[50]` à `colors.primary[900]`
  - Utilisation : Boutons primaires, liens, éléments interactifs
  - Exemple : `colors.primary[600]` pour les CTA

- **Gray (Neutre)** : `colors.gray[50]` à `colors.gray[900]`
  - Utilisation : Textes, bordures, backgrounds
  - Exemple : `colors.gray[100]` pour backgrounds légers

### Couleurs Sémantiques
```typescript
colors.semantic.success  // Vert pour succès
colors.semantic.warning  // Orange pour avertissements
colors.semantic.error    // Rouge pour erreurs
colors.semantic.info     // Bleu pour informations
```

### Couleurs de Texte
```typescript
colors.text.primary    // #111827 - Texte principal
colors.text.secondary  // #6B7280 - Texte secondaire
colors.text.tertiary   // #9CA3AF - Texte tertiaire
colors.text.inverse    // #FFFFFF - Texte sur fond sombre
```

### Couleurs de Background
```typescript
colors.background.primary   // #F9FAFB - Background principal
colors.background.secondary // #FFFFFF - Background secondaire (cards)
```

### Overlays
```typescript
colors.overlay.white25  // Blanc 25% - Pour badges actifs
colors.overlay.white90  // Blanc 90% - Pour texte sur overlay
colors.overlay.black10  // Noir 10% - Pour ombres légères
```

---

## 📏 Spacing

### Import
```typescript
import { spacing } from '@/design-system/spacing';
```

### Échelle
```typescript
spacing.xs   // 4px
spacing.sm   // 8px
spacing.md   // 16px
spacing.lg   // 24px
spacing.xl   // 32px
spacing['2xl'] // 48px
spacing['3xl'] // 64px
```

### Utilisation
```typescript
<View style={{ padding: spacing.md, marginBottom: spacing.lg }}>
```

---

## ✍️ Typography

### Import
```typescript
import { typography, textStyles } from '@/design-system/typography';
```

### Tailles
```typescript
typography.sizes.xs    // 12px
typography.sizes.sm    // 14px
typography.sizes.base  // 16px
typography.sizes.lg    // 18px
typography.sizes.xl    // 20px
typography.sizes['2xl'] // 24px
typography.sizes['3xl'] // 28px
typography.sizes['4xl'] // 32px
```

### Poids
```typescript
typography.weights.normal    // 400
typography.weights.medium    // 500
typography.weights.semibold  // 600
typography.weights.bold      // 700
```

### Styles Prédéfinis
```typescript
textStyles.h1           // Grand titre
textStyles.h2           // Titre moyen
textStyles.h3           // Petit titre
textStyles.body         // Corps de texte
textStyles.caption      // Petit texte
textStyles.statNumber   // Grands chiffres de statistiques (32px)
textStyles.emojiLarge   // Emoji/icônes grandes (48px)
textStyles.badge        // Petits badges (10px)
textStyles.formLabel    // Labels de formulaire
```

---

## 🧩 Composants

### Text

Le composant de base pour tout texte.

```typescript
import { Text } from '@/design-system/components';

// Usage basique
<Text>Mon texte</Text>

// Avec variant
<Text variant="h2" color={colors.text.primary}>
  Titre Principal
</Text>

// Avec poids et alignement
<Text variant="body" weight="semibold" align="center">
  Texte centré en gras
</Text>
```

**Props:**
- `variant`: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'caption' | 'label'
- `color`: Couleur du texte
- `weight`: 'normal' | 'medium' | 'semibold' | 'bold'
- `align`: 'left' | 'center' | 'right'

---

### Button

Boutons avec variants et icônes.

```typescript
import { Button } from '@/design-system/components';
import { PlusIcon } from '@/design-system/icons';

// Bouton primaire
<Button
  title="Ajouter"
  variant="primary"
  onPress={handleAdd}
/>

// Avec icône
<Button
  title="Créer"
  variant="primary"
  leftIcon={<PlusIcon color={colors.text.inverse} />}
  onPress={handleCreate}
/>

// Bouton secondaire
<Button
  title="Annuler"
  variant="secondary"
  onPress={handleCancel}
/>

// Pleine largeur
<Button
  title="Connexion"
  variant="primary"
  fullWidth
  onPress={handleLogin}
/>
```

**Props:**
- `title`: Texte du bouton
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- `fullWidth`: boolean
- `leftIcon` / `rightIcon`: ReactNode
- `disabled`: boolean
- `loading`: boolean

---

### Card

Conteneur avec ombre et bordures.

```typescript
import { Card } from '@/design-system/components';

// Card basique
<Card>
  <Text>Contenu</Text>
</Card>

// Card avec variant
<Card variant="elevated" padding="lg">
  <Text variant="h3">Titre</Text>
  <Text>Description</Text>
</Card>

// Card cliquable
<Card onPress={handlePress}>
  <Text>Cliquez-moi</Text>
</Card>
```

**Props:**
- `variant`: 'default' | 'elevated' | 'outlined'
- `padding`: 'none' | 'sm' | 'md' | 'lg'
- `onPress`: Fonction de clic
- `style`: ViewStyle personnalisé

---

### Input

Champ de saisie avec label et erreur.

```typescript
import { Input } from '@/design-system/components';

// Input basique
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="votre@email.com"
/>

// Input avec erreur
<Input
  label="Mot de passe"
  value={password}
  onChangeText={setPassword}
  secureTextEntry
  error="Mot de passe incorrect"
/>

// Input avec icône
<Input
  label="Recherche"
  value={search}
  onChangeText={setSearch}
  leftIcon={<SearchIcon color={colors.gray[400]} />}
/>
```

**Props:**
- `label`: string
- `value`: string
- `onChangeText`: (text: string) => void
- `placeholder`: string
- `error`: string
- `leftIcon` / `rightIcon`: ReactNode
- `secureTextEntry`: boolean
- `multiline`: boolean
- `disabled`: boolean

---

### Avatar

Affichage d'avatar avec initiales ou image.

```typescript
import { Avatar } from '@/design-system/components';

// Avatar avec initiales
<Avatar initials="JD" size="md" />

// Avatar avec image
<Avatar imageUrl="https://..." size="lg" />

// Avatar personnalisé
<Avatar
  initials="AB"
  size="xl"
  backgroundColor={colors.secondary.blue}
  textColor={colors.text.inverse}
/>
```

**Props:**
- `initials`: string (1-2 caractères)
- `imageUrl`: string
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
- `backgroundColor`: string
- `textColor`: string

---

### EmptyState

État vide avec icône, titre et action.

```typescript
import { EmptyState } from '@/design-system/components';
import { DocumentIcon } from '@/design-system/icons';

// Empty state basique
<EmptyState
  icon={<DocumentIcon size={48} color={colors.gray[400]} />}
  title="Aucun document"
  description="Vous n'avez pas encore ajouté de documents"
/>

// Avec action
<EmptyState
  icon={<CalendarIcon size={48} color={colors.gray[400]} />}
  title="Aucune tâche"
  description="Commencez par créer votre première tâche"
  action={{
    label: "Créer une tâche",
    onPress: handleCreate,
    variant: "primary"
  }}
/>
```

**Props:**
- `icon`: ReactNode
- `title`: string
- `description`: string (optionnel)
- `action`: { label, onPress, variant? } (optionnel)

---

### Skeleton Loaders

Placeholders animés pendant le chargement.

```typescript
import { SkeletonCard, SkeletonList, SkeletonText } from '@/design-system/components';

// Skeleton card unique
<SkeletonCard width="100%" height={120} borderRadius={12} />

// Liste de skeletons
<SkeletonList count={5} variant="card" itemHeight={100} />

// Texte skeleton
<SkeletonText lines={3} width={['100%', '95%', '60%']} />
```

**SkeletonCard Props:**
- `width`: number | string
- `height`: number
- `borderRadius`: number

**SkeletonList Props:**
- `count`: number
- `variant`: 'card' | 'list' | 'grid'
- `itemHeight`: number

**SkeletonText Props:**
- `lines`: number
- `width`: string | string[]
- `lineHeight`: number

---

### Modal

Dialogue modale.

```typescript
import { Modal } from '@/design-system/components';

<Modal
  visible={isVisible}
  onClose={() => setIsVisible(false)}
  title="Confirmation"
>
  <Text>Êtes-vous sûr ?</Text>
  <Button title="Oui" onPress={handleConfirm} />
  <Button title="Non" variant="secondary" onPress={handleCancel} />
</Modal>
```

**Props:**
- `visible`: boolean
- `onClose`: () => void
- `title`: string
- `children`: ReactNode

---

### Screen

Conteneur d'écran avec SafeArea.

```typescript
import { Screen } from '@/design-system/components';

<Screen backgroundColor={colors.background.primary}>
  {/* Contenu de l'écran */}
</Screen>
```

---

## 🎯 Patterns UI Recommandés

### Layout Standard Écran

```typescript
<Screen backgroundColor={colors.background.primary}>
  <ScrollView style={styles.scrollView}>
    {/* Header */}
    <View style={styles.header}>
      <Text variant="h2">Titre de l'écran</Text>
      <Button title="Action" variant="primary" onPress={handleAction} />
    </View>

    {/* Contenu principal */}
    <View style={styles.content}>
      {/* Cards, listes, etc. */}
    </View>
  </ScrollView>
</Screen>

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
});
```

### Formulaire Standard

```typescript
<Card padding="lg">
  <Text variant="h3" style={{ marginBottom: spacing.md }}>
    Informations
  </Text>

  <Input
    label="Nom"
    value={name}
    onChangeText={setName}
    style={{ marginBottom: spacing.md }}
  />

  <Input
    label="Email"
    value={email}
    onChangeText={setEmail}
    error={emailError}
    style={{ marginBottom: spacing.lg }}
  />

  <Button
    title="Enregistrer"
    variant="primary"
    fullWidth
    onPress={handleSubmit}
  />
</Card>
```

### Liste avec Cards

```typescript
<ScrollView>
  {items.map(item => (
    <Card
      key={item.id}
      onPress={() => handleSelect(item)}
      style={{ marginBottom: spacing.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Avatar initials={item.initials} />
        <View style={{ marginLeft: spacing.md, flex: 1 }}>
          <Text variant="h4">{item.title}</Text>
          <Text variant="caption">{item.description}</Text>
        </View>
      </View>
    </Card>
  ))}
</ScrollView>
```

### États de Chargement

```typescript
{loading ? (
  <SkeletonList count={5} variant="card" itemHeight={100} />
) : data.length === 0 ? (
  <EmptyState
    icon={<DocumentIcon size={48} color={colors.gray[400]} />}
    title="Aucun résultat"
    description="Aucune donnée disponible"
  />
) : (
  // Afficher les données
  data.map(item => ...)
)}
```

---

## ❌ Anti-Patterns à Éviter

### ❌ Styles Inline
```typescript
// BAD
<View style={{
  flexDirection: 'row',
  padding: 16,
  marginBottom: 24,
}}>
```

```typescript
// GOOD
<View style={styles.container}>
```

### ❌ Couleurs Hardcodées
```typescript
// BAD
<View style={{ backgroundColor: '#f7f7f8' }}>

// GOOD
<View style={{ backgroundColor: colors.background.primary }}>
```

### ❌ Magic Numbers fontSize
```typescript
// BAD
<Text style={{ fontSize: 18 }}>

// GOOD
<Text style={{ fontSize: typography.sizes.lg }}>
```

### ❌ Custom Icons au lieu du Design System
```typescript
// BAD
<View style={{
  width: 24,
  height: 24,
  backgroundColor: 'blue',
  borderRadius: 12,
}} />

// GOOD
<InfoIcon color={colors.primary[600]} size={24} />
```

---

## 📱 Touch Targets

**Minimum recommandé : 48x48px** pour les éléments interactifs sur mobile.

```typescript
// ✅ Bon
const styles = StyleSheet.create({
  touchable: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

---

## ♿ Accessibilité

### Labels pour les inputs
```typescript
<Input
  label="Email"  // ✅ Toujours un label visible
  value={email}
  onChangeText={setEmail}
/>
```

### Contraste
- Texte principal : Minimum 4.5:1
- Texte large : Minimum 3:1

### Touch Targets
- Minimum 48x48px
- Espacement suffisant entre éléments cliquables

---

## 📊 Métriques de Qualité

Après implémentation du design system :

| Métrique | Cible |
|----------|-------|
| Design System Compliance | **95%** |
| Visual Consistency | **95%** |
| Styles inline évités | **90%** |
| Couleurs hardcodées évitées | **95%** |

---

## 🔄 Changelog Design System

### v2.1.0 (Janvier 2026)
- ✅ Ajout composants `Avatar`, `EmptyState`, `SkeletonCard`, `SkeletonList`, `SkeletonText`
- ✅ Nouveaux variants typography: `statNumber`, `emojiLarge`, `badge`, `formLabel`
- ✅ Ajout `colors.overlay` pour badges et overlays
- ✅ Refactoring complet TasksScreen.tsx avec StyleSheet
- ✅ Remplacement couleurs hardcodées par tokens
- ✅ Documentation complète

---

## 📚 Ressources

- **Icons** : `@/design-system/icons` - Heroicons v2
- **Components** : `@/design-system/components`
- **Tokens** : `@/design-system/colors`, `spacing`, `typography`

---

**Made with 💚 for French Farmers**

