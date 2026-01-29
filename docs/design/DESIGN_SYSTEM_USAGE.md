# Guide d'Utilisation du Design System Thomas V2

## 🎨 Import et Utilisation

### Import Recommandé - Centralisé
```typescript
// ✅ RECOMMANDÉ - Import depuis l'index principal
import { 
  Button, 
  Input, 
  Card, 
  Text,
  TaskCardMinimal,
  TaskCardStandard,
  TaskCardDetailed,
  colors,
  spacing 
} from '@/design-system';

// ✅ RECOMMANDÉ - Import par catégorie
import { colors, spacing, textStyles } from '@/design-system/tokens';
import { Button, Input, Modal } from '@/design-system/components';
```

### Import à Éviter
```typescript
// ❌ ÉVITER - Import direct des fichiers
import { Button } from '@/design-system/components/Button';
import { colors } from '@/design-system/colors';

// ❌ ÉVITER - Import de tout
import * as DS from '@/design-system';
```

## 🧩 Utilisation des Composants

### 1. Composants de Base
```typescript
import React from 'react';
import { Button, Input, Text, colors, spacing } from '@/design-system';

export const LoginForm = () => {
  return (
    <View style={{ padding: spacing.lg }}>
      <Text variant="title" style={{ marginBottom: spacing.md }}>
        Connexion
      </Text>
      
      <Input
        label="Email"
        placeholder="votre@email.com"
        keyboardType="email-address"
        style={{ marginBottom: spacing.md }}
      />
      
      <Input
        label="Mot de passe"
        placeholder="••••••••"
        secureTextEntry
        style={{ marginBottom: spacing.lg }}
      />
      
      <Button
        title="Se connecter"
        variant="primary"
        onPress={handleLogin}
      />
    </View>
  );
};
```

### 2. Cartes Adaptatives par Contexte
```typescript
import React from 'react';
import { 
  TaskCardMinimal, 
  TaskCardStandard, 
  TaskCardDetailed 
} from '@/design-system';

export const TaskList = ({ viewMode, tasks }) => {
  const renderTaskCard = (task) => {
    switch (viewMode) {
      case 'compact':
        return (
          <TaskCardMinimal
            key={task.id}
            task={task}
            onPress={handleTaskPress}
            onDelete={handleTaskDelete}
          />
        );
      
      case 'standard':
        return (
          <TaskCardStandard
            key={task.id}
            task={task}
            onPress={handleTaskPress}
            onEdit={handleTaskEdit}
            onDelete={handleTaskDelete}
          />
        );
      
      case 'detailed':
        return (
          <TaskCardDetailed
            key={task.id}
            task={task}
            onPress={handleTaskPress}
            onEdit={handleTaskEdit}
            onComment={handleTaskComment}
            onDelete={handleTaskDelete}
            onToggleStatus={handleTaskToggle}
          />
        );
      
      default:
        return <TaskCardStandard key={task.id} task={task} />;
    }
  };

  return (
    <ScrollView>
      {tasks.map(renderTaskCard)}
    </ScrollView>
  );
};
```

### 3. Utilisation des Tokens de Design
```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, textStyles } from '@/design-system';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
    borderRadius: 12,
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    ...textStyles.title,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...textStyles.subtitle,
    color: colors.text.secondary,
  },
});
```

## 🎯 Cas d'Usage Spécifiques

### 1. Écrans de Liste (Compact)
```typescript
// Pour les listes denses, navigation rapide
<TaskCardMinimal 
  task={task}
  onPress={navigateToDetail}
  onDelete={confirmDelete}
/>
```

### 2. Dashboard/Aperçu (Standard)
```typescript
// Pour le travail quotidien, équilibre info/espace
<TaskCardStandard 
  task={task}
  onPress={navigateToDetail}
  onEdit={openEditModal}
  onDelete={confirmDelete}
/>
```

### 3. Détail/Modification (Détaillé)
```typescript
// Pour consultation complète et actions avancées
<TaskCardDetailed 
  task={task}
  onPress={navigateToDetail}
  onEdit={openEditModal}
  onComment={openCommentModal}
  onDelete={confirmDelete}
  onToggleStatus={updateTaskStatus}
/>
```

## 🔧 Personnalisation et Extension

### 1. Thème Personnalisé
```typescript
// Créer des variantes de couleurs
const customColors = {
  ...colors,
  primary: {
    ...colors.primary,
    600: '#custom-color', // Override spécifique
  },
};

// Utiliser dans un composant
<Button 
  title="Action Custom"
  style={{ backgroundColor: customColors.primary[600] }}
/>
```

### 2. Composant Dérivé
```typescript
import React from 'react';
import { TaskCardStandard } from '@/design-system';

// Créer une variante spécialisée
export const UrgentTaskCard = ({ task, ...props }) => {
  return (
    <TaskCardStandard
      {...props}
      task={task}
      style={{
        borderLeftColor: colors.semantic.error,
        borderLeftWidth: 6,
        backgroundColor: colors.semantic.error + '05',
      }}
    />
  );
};
```

## 📱 Responsive et Adaptation

### 1. Adaptation par Taille d'Écran
```typescript
import { Dimensions } from 'react-native';
import { TaskCardMinimal, TaskCardStandard } from '@/design-system';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

export const AdaptiveTaskList = ({ tasks }) => {
  const CardComponent = isTablet ? TaskCardStandard : TaskCardMinimal;
  
  return (
    <ScrollView>
      {tasks.map(task => (
        <CardComponent key={task.id} task={task} />
      ))}
    </ScrollView>
  );
};
```

### 2. Adaptation par Contexte Utilisateur
```typescript
export const ContextualTaskList = ({ tasks, userRole, viewPreference }) => {
  const getCardLevel = () => {
    if (userRole === 'manager') return 'detailed';
    if (viewPreference === 'compact') return 'minimal';
    return 'standard';
  };

  const cardLevel = getCardLevel();
  // Render approprié selon le niveau...
};
```

## 🚀 Bonnes Pratiques de Performance

### 1. Import Sélectif
```typescript
// ✅ Import seulement ce qui est nécessaire
import { Button, colors } from '@/design-system';

// ❌ Éviter l'import de tout le design system
import * as DesignSystem from '@/design-system';
```

### 2. Mémorisation des Styles
```typescript
import React, { useMemo } from 'react';
import { colors, spacing } from '@/design-system';

export const OptimizedComponent = ({ variant }) => {
  const styles = useMemo(() => ({
    container: {
      backgroundColor: colors.background.primary,
      padding: spacing.lg,
      borderRadius: variant === 'rounded' ? 12 : 0,
    },
  }), [variant]);

  return <View style={styles.container}>...</View>;
};
```

## 📚 Documentation et Maintenance

### 1. Storybook (Recommandé)
```bash
# Installation Storybook pour React Native
npx storybook@latest init
```

### 2. Tests de Composants
```typescript
import { render } from '@testing-library/react-native';
import { Button } from '@/design-system';

describe('Button Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <Button title="Test Button" variant="primary" />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });
});
```

## 🔄 Évolution et Versioning

### 1. Versioning Sémantique
- **Major (1.0.0)** : Changements breaking (API, props)
- **Minor (1.1.0)** : Nouveaux composants, nouvelles fonctionnalités
- **Patch (1.1.1)** : Corrections de bugs, améliorations

### 2. Migration Guide
```typescript
// v1.0.0 → v1.1.0
// Ancien
<TaskCard task={task} level="minimal" />

// Nouveau
<TaskCardMinimal task={task} />
```

## 🎨 Intégration avec Tailwind CSS

### 1. Approche Hybride (Actuelle)
```typescript
import { View } from 'react-native';
import { Text, colors } from '@/design-system';

export const HybridComponent = () => {
  return (
    <View className="p-4 bg-white rounded-lg shadow-sm">
      <Text variant="title" className="mb-2">
        Titre avec Tailwind + Design System
      </Text>
      <View style={{ backgroundColor: colors.primary[100] }}>
        Contenu mixte
      </View>
    </View>
  );
};
```

### 2. Configuration Tailwind Alignée
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Synchroniser avec design-system/colors.ts
        primary: {
          50: '#f0f9ff',
          // ... autres couleurs du design system
        },
      },
      spacing: {
        // Synchroniser avec design-system/spacing.ts
        xs: '4px',
        sm: '8px',
        // ...
      },
    },
  },
};
```
