# 🎨 Thomas V2 Design System Guide

## 📋 Vue d'Ensemble

Le Design System Thomas V2 est conçu spécifiquement pour l'application mobile agricole française. Il respecte les spécifications de l'architecture ThomasV2 et fournit une expérience utilisateur cohérente et accessible.

### 🎯 Principes de Design

- **🇫🇷 Français Natif** : Terminologie et conventions françaises
- **🌱 Agriculture First** : Couleurs et iconographie adaptées au secteur agricole
- **📱 Mobile Optimized** : Composants optimisés pour écrans tactiles
- **♿ Accessible** : Conformité WCAG AA pour l'accessibilité
- **🎨 Cohérent** : Système unifié pour toute l'application

---

## 🎨 Système de Couleurs

### Palette Principale (Agriculture)

```typescript
// Vert agriculture (couleur de marque)
primary: {
  50: '#f0fdf4',   // Arrière-plans très clairs
  500: '#22c55e',  // Actions principales
  600: '#16a34a',  // Titres, emphase
  900: '#14532d',  // Texte haute contraste
}
```

### Couleurs Fonctionnelles

```typescript
secondary: {
  blue: '#3b82f6',    // Actions, boutons, liens
  orange: '#f59e0b',  // Observations, avertissements
  red: '#ef4444',     // Traitements, alertes, erreurs
  purple: '#8b5cf6',  // Expérimentations, essais
  yellow: '#eab308',  // Planification, tâches futures
}
```

### Couleurs de Statut

```typescript
status: {
  completed: '#22c55e',   // Tâches terminées
  pending: '#f59e0b',     // Tâches en attente
  cancelled: '#ef4444',   // Tâches annulées
  planned: '#3b82f6',     // Tâches planifiées
  inProgress: '#8b5cf6',  // Tâches en cours
}
```

### Usage des Couleurs

| Contexte | Couleur | Usage |
|----------|---------|-------|
| **Production** | `primary.600` | Tâches de production, cultures |
| **Observations** | `secondary.orange` | Alertes, observations terrain |
| **Traitements** | `secondary.red` | Actions correctives, traitements |
| **Planification** | `secondary.blue` | Tâches futures, calendrier |
| **Expérimentations** | `secondary.purple` | Essais, protocoles |

---

## ✍️ Système Typographique

### Hiérarchie des Titres

```typescript
// Titres principaux
h1: 28px, bold    // Titres d'écran principaux
h2: 24px, bold    // Titres de section
h3: 20px, semibold // Sous-titres
h4: 18px, semibold // Titres de composants
```

### Texte de Corps

```typescript
body: 16px, normal      // Texte principal
bodySmall: 14px, normal // Texte secondaire
bodyLarge: 18px, normal // Texte emphase
caption: 12px, normal   // Légendes, métadonnées
```

### Typographie Agricole Spécialisée

```typescript
taskTitle: 16px, semibold    // "Plantation tomates"
plotName: 14px, medium       // "Serre 1 - Planche 3"
cropName: 14px, normal       // "Tomates cerises"
```

### Règles Typographiques

- **Lisibilité** : Contraste minimum 4.5:1 (WCAG AA)
- **Espacement** : Line-height 1.4 pour le texte de corps
- **Hiérarchie** : Maximum 4 niveaux de titres
- **Cohérence** : Utiliser les variantes prédéfinies

---

## 📐 Système d'Espacement

### Échelle d'Espacement

```typescript
xs: 4px     // Espacement serré
sm: 8px     // Petit espacement
md: 12px    // Espacement moyen
lg: 16px    // Grand espacement
xl: 20px    // Très grand espacement
2xl: 24px   // Espacement de section
3xl: 32px   // Espacement majeur
```

### Espacement Sémantique

```typescript
component: {
  padding: 16px,      // Padding standard des composants
  margin: 16px,       // Marge standard des composants
  gap: 12px,          // Écart entre éléments liés
  section: 24px,      // Écart entre sections
}

layout: {
  screenPadding: 20px,    // Padding des écrans
  cardPadding: 16px,      // Padding interne des cartes
  listItemPadding: 12px,  // Padding des éléments de liste
}
```

### Espacement Interactif

```typescript
interactive: {
  minTouchTarget: 44px,   // Taille minimale tactile
  buttonHeight: 48px,     // Hauteur standard des boutons
  inputHeight: 48px,      // Hauteur standard des champs
  iconSize: 24px,         // Taille standard des icônes
}
```

---

## 🧩 Composants de Base

### Button

Bouton principal avec 5 variantes et 3 tailles.

```tsx
// Variantes disponibles
<Button title="Principal" variant="primary" />
<Button title="Secondaire" variant="secondary" />
<Button title="Contour" variant="outline" />
<Button title="Fantôme" variant="ghost" />
<Button title="Danger" variant="danger" />

// Tailles disponibles
<Button title="Petit" size="sm" />
<Button title="Moyen" size="md" />
<Button title="Grand" size="lg" />

// États et options
<Button title="Chargement" loading />
<Button title="Désactivé" disabled />
<Button title="Pleine largeur" fullWidth />
<Button title="Avec icône" leftIcon={<Icon />} />
```

### Input

Champ de saisie avec label, validation et états.

```tsx
<Input
  label="Nom de la parcelle"
  placeholder="Ex: Serre 1, Tunnel Nord..."
  value={value}
  onChangeText={setValue}
  required
  hint="Nom unique pour identifier la parcelle"
  error="Ce nom est déjà utilisé"
/>
```

### Card

Conteneur polyvalent avec 4 variantes et espacement configurable.

```tsx
// Variantes disponibles
<Card variant="default">Contenu</Card>
<Card variant="elevated">Contenu avec ombre</Card>
<Card variant="outlined">Contenu avec bordure</Card>
<Card variant="flat">Contenu sans ombre</Card>

// Espacement configurable
<Card padding="sm">Petit padding</Card>
<Card padding="md">Padding moyen</Card>
<Card padding="lg">Grand padding</Card>

// Interactif
<Card onPress={() => console.log('Pressed')}>
  Carte cliquable
</Card>
```

### Text

Composant de texte avec variantes prédéfinies.

```tsx
// Variantes de titre
<Text variant="h1">Titre Principal</Text>
<Text variant="h2">Titre Secondaire</Text>
<Text variant="h3">Sous-titre</Text>

// Variantes de corps
<Text variant="body">Texte principal</Text>
<Text variant="bodySmall">Texte secondaire</Text>
<Text variant="caption">Légende</Text>

// Variantes agricoles
<Text variant="taskTitle">Plantation tomates</Text>
<Text variant="plotName">Serre 1</Text>
<Text variant="cropName">Tomates cerises</Text>

// Variantes de statut
<Text variant="success">Succès</Text>
<Text variant="warning">Avertissement</Text>
<Text variant="error">Erreur</Text>
```

### Modal

Modal responsive avec actions configurables.

```tsx
<Modal
  visible={visible}
  onClose={() => setVisible(false)}
  title="Titre du Modal"
  size="md"
  primaryAction={{
    title: "Confirmer",
    onPress: handleConfirm,
    loading: isLoading,
  }}
  secondaryAction={{
    title: "Annuler",
    onPress: handleCancel,
  }}
>
  <Text>Contenu du modal</Text>
</Modal>
```

---

## 🏗️ Composants de Layout

### Screen

Conteneur d'écran avec SafeArea et ScrollView optionnel.

```tsx
<Screen
  safeArea
  scrollable
  padding="md"
  backgroundColor={colors.background.primary}
>
  <Text>Contenu de l'écran</Text>
</Screen>
```

### Header

En-tête unifié avec titre, sous-titre et actions.

```tsx
<Header
  title="Titre de l'écran"
  subtitle="Sous-titre optionnel"
  leftAction={{
    icon: <BackIcon />,
    onPress: goBack,
  }}
  rightActions={[
    {
      icon: <NotificationIcon />,
      onPress: openNotifications,
      badge: 5,
    },
    {
      icon: <SettingsIcon />,
      onPress: openSettings,
    },
  ]}
/>
```

### Navigation

Navigation par onglets avec badges et états.

```tsx
<Navigation
  tabs={[
    {
      id: 'calendrier',
      title: 'Agenda',
      icon: <CalendarIcon />,
      badge: 3,
    },
    {
      id: 'chat',
      title: 'Thomas',
      icon: <ChatIcon />,
      badge: 1,
    },
    // ... autres onglets
  ]}
  activeTab={activeTab}
  onTabPress={setActiveTab}
/>
```

---

## 🎯 Iconographie

### Icônes de Navigation (ThomasV2)

```tsx
import {
  CalendarIcon,    // Agenda
  StatsIcon,       // Statistiques
  ChatIcon,        // Thomas Chat
  ExperimentsIcon, // Essais
  ProfileIcon,     // Profil
} from '../design-system/icons';
```

### Icônes d'Action

```tsx
import {
  BackIcon,
  SettingsIcon,
  NotificationIcon,
  SearchIcon,
  AddIcon,
  EditIcon,
  DeleteIcon,
} from '../design-system/icons';
```

### Icônes Agricoles

```tsx
import {
  HomeIcon,        // Ferme
  MapIcon,         // Parcelles
  SproutIcon,      // Cultures
  DropletsIcon,    // Irrigation
  SunIcon,         // Météo
  ThermometerIcon, // Température
} from '../design-system/icons';
```

### Usage des Icônes

```tsx
// Tailles standard
<Icon name="Calendar" size="sm" />  // 20px
<Icon name="Calendar" size="md" />  // 24px (défaut)
<Icon name="Calendar" size="lg" />  // 28px

// Couleurs contextuelles
<Icon name="Calendar" color={colors.primary[600]} />
<Icon name="Calendar" color={colors.gray[500]} />
```

---

## 📱 Responsive Design

### Breakpoints

```typescript
// Tailles d'écran supportées
mobile: 320px - 767px    // Téléphones
tablet: 768px - 1023px   // Tablettes
desktop: 1024px+         // Desktop (web)
```

### Adaptations Mobile

- **Touch Targets** : Minimum 44px pour tous les éléments interactifs
- **Spacing** : Espacement généreux pour éviter les erreurs tactiles
- **Typography** : Tailles optimisées pour la lecture mobile
- **Navigation** : Bottom tabs pour l'accessibilité au pouce

---

## ♿ Accessibilité

### Conformité WCAG AA

- **Contraste** : Ratio minimum 4.5:1 pour le texte normal
- **Taille** : Texte minimum 16px pour la lisibilité
- **Touch Targets** : Minimum 44x44px pour les éléments interactifs
- **Focus** : Indicateurs visuels clairs pour la navigation clavier

### Bonnes Pratiques

```tsx
// Labels accessibles
<Button title="Ajouter une tâche" accessibilityLabel="Ajouter une nouvelle tâche agricole" />

// Hints descriptifs
<Input
  label="Quantité"
  accessibilityHint="Saisissez la quantité récoltée en kilogrammes"
/>

// États accessibles
<Button
  title="Sauvegarder"
  loading={isLoading}
  accessibilityState={{ busy: isLoading }}
/>
```

---

## 🚀 Utilisation

### Import du Design System

```tsx
// Import des composants
import {
  Button,
  Input,
  Card,
  Modal,
  Text,
  Screen,
  Header,
  Navigation,
} from '../design-system/components';

// Import des couleurs
import { colors } from '../design-system/colors';

// Import des icônes
import { CalendarIcon, ChatIcon } from '../design-system/icons';
```

### Exemple d'Écran Complet

```tsx
import React from 'react';
import {
  Screen,
  Header,
  Card,
  Text,
  Button,
} from '../design-system/components';
import { BackIcon, AddIcon } from '../design-system/icons';

export const ExampleScreen = () => {
  return (
    <Screen safeArea scrollable>
      <Header
        title="Mes Parcelles"
        leftAction={{
          icon: <BackIcon />,
          onPress: () => navigation.goBack(),
        }}
        rightActions={[
          {
            icon: <AddIcon />,
            onPress: () => navigation.navigate('AddPlot'),
          },
        ]}
      />
      
      <Card variant="elevated" padding="lg">
        <Text variant="h3">Serre 1</Text>
        <Text variant="plotName">Tunnel plastique - 200m²</Text>
        <Text variant="body" style={{ marginTop: 12 }}>
          Tomates cerises en production depuis mars 2024.
        </Text>
        
        <Button
          title="Voir les détails"
          variant="outline"
          style={{ marginTop: 16 }}
          onPress={() => navigation.navigate('PlotDetails')}
        />
      </Card>
    </Screen>
  );
};
```

---

## 📚 Ressources

### Fichiers du Design System

- `src/design-system/colors.ts` - Système de couleurs
- `src/design-system/typography.ts` - Système typographique
- `src/design-system/spacing.ts` - Système d'espacement
- `src/design-system/components/` - Composants réutilisables
- `src/design-system/icons.tsx` - Système d'icônes

### Documentation Technique

- [ThomasV2 Architecture](./ThomasV2) - Architecture complète
- [Roadmap Implementation](./ROADMAP_IMPLEMENTATION.md) - Plan d'implémentation
- [Technical Specifications](./TECHNICAL_SPECIFICATIONS.md) - Spécifications techniques

### Outils de Développement

- **Storybook** : Documentation interactive des composants
- **TypeScript** : Typage strict pour la cohérence
- **ESLint/Prettier** : Formatage et qualité du code
- **Jest** : Tests unitaires des composants

---

## 🔄 Évolution

### Versioning

Le design system suit le versioning sémantique :
- **Major** : Changements breaking (couleurs, API composants)
- **Minor** : Nouveaux composants, nouvelles variantes
- **Patch** : Corrections de bugs, améliorations mineures

### Contribution

1. **Proposer** : Créer une issue pour discuter des changements
2. **Développer** : Implémenter avec tests et documentation
3. **Tester** : Vérifier la compatibilité et l'accessibilité
4. **Documenter** : Mettre à jour ce guide et les exemples

---

**📅 Dernière mise à jour** : Novembre 2024  
**🚀 Version** : 1.0.0  
**👥 Équipe** : Thomas V2 Development Team
