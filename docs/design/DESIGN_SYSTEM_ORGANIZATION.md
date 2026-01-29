# Organisation et Réexploitation du Design System Thomas V2

## 🏗️ **Structure Recommandée pour la Réexploitation**

### **1. Organisation en Package Interne**

```
src/
├── design-system/                 # 🎨 Design System (réutilisable)
│   ├── index.ts                  # Point d'entrée principal
│   ├── tokens/                   # Design tokens
│   │   ├── index.ts
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── shadows.ts
│   ├── components/               # Composants UI
│   │   ├── index.ts
│   │   ├── base/                # Composants de base
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Text.tsx
│   │   │   └── Card.tsx
│   │   ├── layout/              # Composants de mise en page
│   │   │   ├── Screen.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Navigation.tsx
│   │   ├── specialized/         # Composants métier
│   │   │   ├── cards/
│   │   │   ├── modals/
│   │   │   └── forms/
│   │   └── advanced/            # Composants complexes
│   │       └── DropdownSelector.tsx
│   ├── icons/                   # Système d'icônes
│   │   ├── index.ts
│   │   └── lucide-exports.ts
│   ├── utils/                   # Utilitaires
│   │   ├── tailwind.ts
│   │   └── responsive.ts
│   └── hooks/                   # Hooks personnalisés
│       ├── useTheme.ts
│       └── useResponsive.ts
├── components/                   # 🧩 Composants applicatifs
│   ├── features/                # Composants par fonctionnalité
│   │   ├── tasks/
│   │   ├── observations/
│   │   └── planning/
│   └── shared/                  # Composants partagés app
├── screens/                     # 📱 Écrans de l'application
├── services/                    # 🔧 Services métier
└── utils/                       # 🛠️ Utilitaires applicatifs
```

### **2. Point d'Entrée Optimisé**

```typescript
// src/design-system/index.ts
// Export structuré pour une utilisation optimale

// Design Tokens
export * from './tokens';

// Composants de Base
export {
  Button,
  Input,
  Text,
  Card,
  Modal,
} from './components/base';

// Composants de Layout
export {
  Screen,
  Header,
  Navigation,
} from './components/layout';

// Composants Spécialisés
export {
  TaskCardMinimal,
  TaskCardStandard,
  TaskCardDetailed,
  ObservationCardMinimal,
  ObservationCardStandard,
  ObservationCardDetailed,
} from './components/specialized/cards';

// Composants Avancés
export {
  DropdownSelector,
} from './components/advanced';

// Icônes
export * from './icons';

// Utilitaires
export * from './utils';

// Hooks
export * from './hooks';
```

## 📦 **Stratégies de Réexploitation**

### **1. Approche Modulaire par Fonctionnalité**

```typescript
// src/components/features/tasks/TaskList.tsx
import React from 'react';
import { 
  TaskCardMinimal, 
  TaskCardStandard, 
  TaskCardDetailed,
  colors,
  spacing 
} from '@/design-system';

interface TaskListProps {
  tasks: Task[];
  viewMode: 'compact' | 'standard' | 'detailed';
  onTaskAction: (action: string, task: Task) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  viewMode,
  onTaskAction,
}) => {
  // Logique de rendu adaptatif
  const renderTask = (task: Task) => {
    const commonProps = {
      task,
      onPress: (t: Task) => onTaskAction('view', t),
      onEdit: (t: Task) => onTaskAction('edit', t),
      onDelete: (t: Task) => onTaskAction('delete', t),
    };

    switch (viewMode) {
      case 'compact':
        return <TaskCardMinimal key={task.id} {...commonProps} />;
      case 'standard':
        return <TaskCardStandard key={task.id} {...commonProps} />;
      case 'detailed':
        return (
          <TaskCardDetailed
            key={task.id}
            {...commonProps}
            onComment={(t: Task) => onTaskAction('comment', t)}
            onToggleStatus={(t: Task) => onTaskAction('toggle', t)}
          />
        );
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      {tasks.map(renderTask)}
    </View>
  );
};
```

### **2. Composants Composés (Compound Components)**

```typescript
// src/components/features/tasks/TaskManager.tsx
import React, { useState } from 'react';
import { TaskList } from './TaskList';
import { TaskFilters } from './TaskFilters';
import { TaskActions } from './TaskActions';
import { Screen, Header } from '@/design-system';

export const TaskManager: React.FC = () => {
  const [viewMode, setViewMode] = useState('standard');
  const [filters, setFilters] = useState({});
  
  return (
    <Screen>
      <Header title="Gestion des Tâches" />
      
      <TaskFilters
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={filters}
        onFiltersChange={setFilters}
      />
      
      <TaskList
        viewMode={viewMode}
        tasks={filteredTasks}
        onTaskAction={handleTaskAction}
      />
      
      <TaskActions onNewTask={handleNewTask} />
    </Screen>
  );
};
```

### **3. Hooks Personnalisés pour la Logique**

```typescript
// src/design-system/hooks/useAdaptiveCard.ts
import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

type CardLevel = 'minimal' | 'standard' | 'detailed';

interface UseAdaptiveCardOptions {
  defaultLevel?: CardLevel;
  breakpoints?: {
    compact: number;
    standard: number;
  };
}

export const useAdaptiveCard = (options: UseAdaptiveCardOptions = {}) => {
  const {
    defaultLevel = 'standard',
    breakpoints = { compact: 480, standard: 768 }
  } = options;

  const [cardLevel, setCardLevel] = useState<CardLevel>(defaultLevel);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (screenWidth < breakpoints.compact) {
      setCardLevel('minimal');
    } else if (screenWidth < breakpoints.standard) {
      setCardLevel('standard');
    } else {
      setCardLevel('detailed');
    }
  }, [screenWidth, breakpoints]);

  return {
    cardLevel,
    setCardLevel,
    screenWidth,
    isCompact: screenWidth < breakpoints.compact,
    isStandard: screenWidth >= breakpoints.compact && screenWidth < breakpoints.standard,
    isDetailed: screenWidth >= breakpoints.standard,
  };
};
```

### **4. Utilisation du Hook Adaptatif**

```typescript
// src/screens/TaskScreen.tsx
import React from 'react';
import { useAdaptiveCard } from '@/design-system/hooks';
import { TaskList } from '@/components/features/tasks';

export const TaskScreen: React.FC = () => {
  const { cardLevel, setCardLevel, isCompact } = useAdaptiveCard({
    defaultLevel: 'standard'
  });

  return (
    <Screen>
      {!isCompact && (
        <ViewModeSelector
          currentMode={cardLevel}
          onModeChange={setCardLevel}
        />
      )}
      
      <TaskList
        viewMode={cardLevel}
        tasks={tasks}
        onTaskAction={handleTaskAction}
      />
    </Screen>
  );
};
```

## 🎯 **Patterns de Réutilisation Avancés**

### **1. Factory Pattern pour les Cartes**

```typescript
// src/design-system/factories/CardFactory.ts
import {
  TaskCardMinimal,
  TaskCardStandard,
  TaskCardDetailed,
  ObservationCardMinimal,
  ObservationCardStandard,
  ObservationCardDetailed,
} from '@/design-system';

type CardType = 'task' | 'observation';
type CardLevel = 'minimal' | 'standard' | 'detailed';

export class CardFactory {
  static create(type: CardType, level: CardLevel) {
    const cardMap = {
      task: {
        minimal: TaskCardMinimal,
        standard: TaskCardStandard,
        detailed: TaskCardDetailed,
      },
      observation: {
        minimal: ObservationCardMinimal,
        standard: ObservationCardStandard,
        detailed: ObservationCardDetailed,
      },
    };

    return cardMap[type][level];
  }
}

// Utilisation
const TaskCard = CardFactory.create('task', 'standard');
return <TaskCard task={task} onPress={handlePress} />;
```

### **2. Provider Pattern pour le Thème**

```typescript
// src/design-system/providers/ThemeProvider.tsx
import React, { createContext, useContext, useState } from 'react';
import { colors as defaultColors } from '@/design-system/tokens';

interface ThemeContextType {
  colors: typeof defaultColors;
  cardLevel: 'minimal' | 'standard' | 'detailed';
  setCardLevel: (level: 'minimal' | 'standard' | 'detailed') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cardLevel, setCardLevel] = useState<'minimal' | 'standard' | 'detailed'>('standard');

  const value = {
    colors: defaultColors,
    cardLevel,
    setCardLevel,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

### **3. HOC pour l'Adaptation Automatique**

```typescript
// src/design-system/hocs/withAdaptiveCard.tsx
import React from 'react';
import { useAdaptiveCard } from '@/design-system/hooks';

interface WithAdaptiveCardProps {
  forceLevel?: 'minimal' | 'standard' | 'detailed';
}

export const withAdaptiveCard = <P extends object>(
  Component: React.ComponentType<P & { cardLevel: string }>
) => {
  return (props: P & WithAdaptiveCardProps) => {
    const { cardLevel } = useAdaptiveCard();
    const finalLevel = props.forceLevel || cardLevel;

    return <Component {...props} cardLevel={finalLevel} />;
  };
};

// Utilisation
const AdaptiveTaskList = withAdaptiveCard(TaskList);
```

## 📱 **Configuration et Personnalisation**

### **1. Configuration Centralisée**

```typescript
// src/design-system/config/index.ts
export const designSystemConfig = {
  // Breakpoints responsive
  breakpoints: {
    mobile: 0,
    tablet: 768,
    desktop: 1024,
  },
  
  // Niveaux de cartes par défaut selon l'écran
  defaultCardLevels: {
    mobile: 'minimal',
    tablet: 'standard',
    desktop: 'detailed',
  },
  
  // Animation
  animations: {
    duration: {
      fast: 200,
      normal: 300,
      slow: 500,
    },
    easing: 'ease-in-out',
  },
  
  // Accessibilité
  accessibility: {
    minimumTouchTarget: 44,
    highContrast: false,
  },
};
```

### **2. Thème Personnalisé**

```typescript
// src/config/theme.ts
import { designSystemConfig } from '@/design-system/config';
import { colors as baseColors } from '@/design-system/tokens';

export const appTheme = {
  ...designSystemConfig,
  colors: {
    ...baseColors,
    // Personnalisations spécifiques à l'app
    brand: {
      primary: '#custom-green',
      secondary: '#custom-orange',
    },
  },
};
```

## 🚀 **Déploiement et Distribution**

### **1. Package NPM Interne**

```json
// design-system/package.json
{
  "name": "@thomas-v2/design-system",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-native": ">=0.72.0"
  }
}
```

### **2. Documentation Automatisée**

```bash
# Génération de documentation avec TypeDoc
npm install --save-dev typedoc
npx typedoc src/design-system/index.ts
```

### **3. Tests Automatisés**

```typescript
// src/design-system/__tests__/components.test.tsx
import { render } from '@testing-library/react-native';
import { Button, TaskCardMinimal } from '@/design-system';

describe('Design System Components', () => {
  describe('Button', () => {
    it('renders with correct variant styles', () => {
      const { getByText } = render(
        <Button title="Test" variant="primary" />
      );
      expect(getByText('Test')).toBeTruthy();
    });
  });

  describe('TaskCardMinimal', () => {
    const mockTask = {
      id: '1',
      title: 'Test Task',
      type: 'completed' as const,
      date: new Date(),
    };

    it('renders task information correctly', () => {
      const { getByText } = render(
        <TaskCardMinimal task={mockTask} />
      );
      expect(getByText('Test Task')).toBeTruthy();
    });
  });
});
```

## 📊 **Métriques et Monitoring**

### **1. Tracking d'Utilisation**

```typescript
// src/design-system/utils/analytics.ts
export const trackComponentUsage = (componentName: string, props: any) => {
  // Analytics pour comprendre l'utilisation des composants
  console.log(`Component used: ${componentName}`, props);
};

// Dans les composants
export const Button: React.FC<ButtonProps> = (props) => {
  useEffect(() => {
    trackComponentUsage('Button', { variant: props.variant });
  }, [props.variant]);
  
  // ... reste du composant
};
```

### **2. Performance Monitoring**

```typescript
// src/design-system/utils/performance.ts
export const measureRenderTime = (componentName: string) => {
  const start = performance.now();
  
  return () => {
    const end = performance.now();
    console.log(`${componentName} render time: ${end - start}ms`);
  };
};
```

Cette organisation permet une réexploitation optimale du design system avec une séparation claire des responsabilités, une maintenance facilitée et une évolutivité maximale ! 🚀
