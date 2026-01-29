# Guide d'Usage du FarmContext - Thomas V2

## 🌾 Vue d'ensemble

Le `FarmContext` est le système de gestion d'état global pour les fermes dans l'application Thomas V2. Il fournit un accès centralisé aux données des fermes, à la ferme active, et aux données métier avec mise en cache automatique.

## 📋 Table des matières

- [Installation et Configuration](#installation-et-configuration)
- [API du Context](#api-du-context)
- [Utilisation de base](#utilisation-de-base)
- [Données métier en cache](#données-métier-en-cache)
- [Opérations fermes](#opérations-fermes)
- [Bonnes pratiques](#bonnes-pratiques)
- [Exemples complets](#exemples-complets)
- [Dépannage](#dépannage)

## 🚀 Installation et Configuration

### 1. Provider Setup

Le `FarmProvider` doit envelopper votre application au niveau racine :

```typescript
// App.tsx
import { FarmProvider } from './src/contexts/FarmContext';
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <FarmProvider>
        <YourAppContent />
      </FarmProvider>
    </AuthProvider>
  );
}
```

### 2. Hook d'accès

```typescript
import { useFarm } from './src/contexts/FarmContext';

function MyComponent() {
  const farmContext = useFarm();
  // Utiliser farmContext...
}
```

## 🔧 API du Context

### État disponible

```typescript
interface FarmContextType {
  // État des fermes
  farms: UserFarm[];                    // Liste de toutes les fermes
  activeFarm: UserFarm | null;          // Ferme actuellement sélectionnée
  loading: boolean;                     // État de chargement
  error: string | null;                 // Erreur éventuelle
  needsSetup: boolean;                  // Besoin de créer première ferme

  // Données métier de la ferme active (cache intelligent)
  farmData: {
    plots: PlotData[];
    materials: MaterialFromDB[];
    cultures: Culture[];
    tasks: TaskData[];
    loading: boolean;
    lastUpdated: Date | null;
  };

  // Actions fermes
  changeActiveFarm: (farm: UserFarm) => Promise<void>;
  createFirstFarm: (farmData: any) => Promise<void>;
  refreshFarms: () => Promise<void>;
  
  // Actions données métier
  refreshFarmData: () => Promise<void>;
  invalidateFarmData: (dataTypes?: string[]) => Promise<void>;
}
```

### Types de données

```typescript
interface UserFarm {
  farm_id: number;
  farm_name: string;
  role: string;
  is_owner: boolean;
}

interface PlotData {
  id: string;
  name: string;
  type: string;
  area: number;
  unit: string;
  // ... autres propriétés
}
```

## 📖 Utilisation de base

### 1. Accéder aux données des fermes

```typescript
import { useFarm } from '../contexts/FarmContext';

function FarmList() {
  const { farms, activeFarm, loading, error } = useFarm();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <View>
      <Text>Fermes disponibles: {farms.length}</Text>
      <Text>Ferme active: {activeFarm?.farm_name || 'Aucune'}</Text>
      
      {farms.map(farm => (
        <FarmCard key={farm.farm_id} farm={farm} />
      ))}
    </View>
  );
}
```

### 2. Sélectionner une ferme active

```typescript
function FarmSelector() {
  const { farms, activeFarm, changeActiveFarm } = useFarm();

  const handleSelectFarm = async (farm: UserFarm) => {
    await changeActiveFarm(farm);
    console.log('Ferme sélectionnée:', farm.farm_name);
  };

  return (
    <Picker
      selectedValue={activeFarm?.farm_id}
      onValueChange={(farmId) => {
        const farm = farms.find(f => f.farm_id === farmId);
        if (farm) handleSelectFarm(farm);
      }}
    >
      {farms.map(farm => (
        <Picker.Item key={farm.farm_id} label={farm.farm_name} value={farm.farm_id} />
      ))}
    </Picker>
  );
}
```

### 3. Première ferme (setup)

```typescript
function SetupOrApp() {
  const { needsSetup, createFirstFarm } = useFarm();

  const handleCreateFirstFarm = async (farmData: any) => {
    await createFirstFarm(farmData);
    // L'utilisateur est automatiquement redirigé vers l'app
  };

  if (needsSetup) {
    return <FarmSetupScreen onCreateFarm={handleCreateFirstFarm} />;
  }

  return <MainApp />;
}
```

## 💾 Données métier en cache

### 1. Hooks spécialisés pour données métier

```typescript
import { useFarmPlots, useFarmMaterials, useFarmTasks } from '../contexts/FarmContext';

function PlotsList() {
  const { plots, loading } = useFarmPlots();

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView>
      {plots.map(plot => (
        <PlotCard key={plot.id} plot={plot} />
      ))}
    </ScrollView>
  );
}

function MaterialsList() {
  const { materials, loading } = useFarmMaterials();

  return (
    <View>
      <Text>Matériels ({materials.length})</Text>
      {materials.map(material => (
        <MaterialCard key={material.id} material={material} />
      ))}
    </View>
  );
}
```

### 2. Gestion du cache des données métier

```typescript
function DataManager() {
  const { farmData, refreshFarmData, invalidateFarmData } = useFarm();

  const handleRefreshAll = async () => {
    await refreshFarmData(); // Actualise toutes les données
  };

  const handleInvalidatePlots = async () => {
    await invalidateFarmData(['plots']); // Invalide seulement les parcelles
  };

  return (
    <View>
      <Text>Dernière mise à jour: {farmData.lastUpdated?.toLocaleString()}</Text>
      
      <Button onPress={handleRefreshAll} title="Actualiser tout" />
      <Button onPress={handleInvalidatePlots} title="Actualiser parcelles" />
      
      {farmData.loading && <LoadingSpinner />}
    </View>
  );
}
```

### 3. Cache automatique après modifications

```typescript
function CreatePlotScreen() {
  const { invalidateFarmData } = useFarm();

  const handleCreatePlot = async (plotData: any) => {
    // Créer la parcelle via le service
    await PlotService.createPlot(activeFarm.farm_id, plotData);
    
    // Invalider le cache des parcelles
    await invalidateFarmData(['plots']);
    
    // Les composants utilisant useFarmPlots() seront automatiquement mis à jour
    navigation.goBack();
  };

  return (
    <CreatePlotForm onSubmit={handleCreatePlot} />
  );
}
```

## 🔄 Opérations fermes

### 1. Rafraîchir les fermes

```typescript
function RefreshButton() {
  const { refreshFarms, loading } = useFarm();

  const handleRefresh = async () => {
    try {
      await refreshFarms();
      console.log('Fermes rafraîchies');
    } catch (error) {
      console.error('Erreur refresh:', error);
    }
  };

  return (
    <TouchableOpacity onPress={handleRefresh} disabled={loading}>
      <Text>{loading ? 'Chargement...' : 'Rafraîchir'}</Text>
    </TouchableOpacity>
  );
}
```

## ✅ Bonnes pratiques

### 1. Gestion des erreurs

```typescript
function RobustFarmComponent() {
  const { farms, loading, error, refreshFarms } = useFarm();

  if (loading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <ErrorView>
        <Text>Erreur: {error}</Text>
        <Button onPress={refreshFarms} title="Réessayer" />
      </ErrorView>
    );
  }

  return (
    <View>
      {/* Contenu normal */}
    </View>
  );
}
```

### 2. Optimisation des performances

```typescript
function OptimizedFarmList() {
  const { farms, activeFarm } = useFarm();
  
  // Mémoriser les calculs coûteux
  const farmsByType = useMemo(() => {
    return farms.reduce((acc, farm) => {
      const type = farm.farm_type || 'autre';
      if (!acc[type]) acc[type] = [];
      acc[type].push(farm);
      return acc;
    }, {} as Record<string, UserFarm[]>);
  }, [farms]);

  // Mémoriser les composants
  const farmCards = useMemo(() => {
    return farms.map(farm => (
      <MemoizedFarmCard 
        key={farm.farm_id} 
        farm={farm} 
        isActive={activeFarm?.farm_id === farm.farm_id}
      />
    ));
  }, [farms, activeFarm?.farm_id]);

  return <ScrollView>{farmCards}</ScrollView>;
}

const MemoizedFarmCard = React.memo(FarmCard);
```

### 3. Invalidation intelligente du cache

```typescript
// Après création de données
const handleCreateMaterial = async (materialData: any) => {
  await MaterialService.createMaterial(farmId, materialData);
  await invalidateFarmData(['materials']); // Seulement les matériels
};

// Après modification de données
const handleUpdatePlot = async (plotId: string, updates: any) => {
  await PlotService.updatePlot(plotId, updates);
  await invalidateFarmData(['plots']); // Seulement les parcelles
};

// Changement de ferme = rafraîchir toutes les données
const handleChangeFarm = async (farm: UserFarm) => {
  await changeActiveFarm(farm); 
  // Le cache se rafraîchit automatiquement pour la nouvelle ferme
};
```

## 📝 Exemples complets

### 1. Écran de gestion des fermes

```typescript
function FarmManagementScreen() {
  const { 
    farms, 
    activeFarm, 
    loading, 
    error, 
    changeActiveFarm,
    refreshFarms,
    farmData
  } = useFarm();

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onRetry={refreshFarms} />;

  return (
    <Screen>
      {/* Header avec ferme active */}
      <Header>
        <Text>Ferme active: {activeFarm?.farm_name || 'Aucune'}</Text>
        <Button onPress={refreshFarms} title="Rafraîchir" />
      </Header>

      {/* Statistiques de la ferme active */}
      {activeFarm && (
        <StatsSection>
          <Stat label="Parcelles" value={farmData.plots.length} />
          <Stat label="Matériels" value={farmData.materials.length} />
          <Stat label="Tâches" value={farmData.tasks.length} />
        </StatsSection>
      )}

      {/* Liste des fermes */}
      <FarmList 
        farms={farms}
        activeFarm={activeFarm}
        onSelectFarm={changeActiveFarm}
      />
    </Screen>
  );
}
```

### 2. Hook personnalisé pour données combinées

```typescript
function useFarmOverview() {
  const { activeFarm, farmData } = useFarm();

  return useMemo(() => {
    if (!activeFarm) return null;

    return {
      farmName: activeFarm.farm_name,
      totalPlots: farmData.plots.length,
      totalMaterials: farmData.materials.length,
      pendingTasks: farmData.tasks.filter(t => t.status === 'en_attente').length,
      isLoading: farmData.loading,
      lastUpdated: farmData.lastUpdated,
    };
  }, [activeFarm, farmData]);
}

// Usage
function FarmOverview() {
  const overview = useFarmOverview();

  if (!overview) return <Text>Aucune ferme sélectionnée</Text>;

  return (
    <Card>
      <Text>{overview.farmName}</Text>
      <Text>{overview.totalPlots} parcelles</Text>
      <Text>{overview.pendingTasks} tâches en attente</Text>
      {overview.isLoading && <LoadingSpinner />}
    </Card>
  );
}
```

## 🔧 Dépannage

### Problèmes courants

#### 1. "Cannot read property of undefined"
```typescript
// ❌ Mauvais
const farmName = activeFarm.farm_name;

// ✅ Bon
const farmName = activeFarm?.farm_name || 'Aucune ferme';
```

#### 2. "Hook called outside of provider"
```typescript
// Vérifier que FarmProvider enveloppe votre composant
function MyComponent() {
  const { farms } = useFarm(); // Erreur si pas dans un FarmProvider
}
```

#### 3. Données métier qui ne se mettent pas à jour
```typescript
// Après modification, invalider le cache
await PlotService.createPlot(farmId, plotData);
await invalidateFarmData(['plots']); // ✅ Met à jour automatiquement
```

#### 4. Cache qui ne se rafraîchit pas
```typescript
// Forcer un refresh complet
const { refreshFarmData } = useFarm();
await refreshFarmData(); // Rafraîchit toutes les données métier
```

### Logs de debug

Pour diagnostiquer les problèmes, surveillez ces logs dans la console :

```
🚀 [SIMPLE-INIT] Initialisation pour utilisateur: user@email.com
✅ [SIMPLE-INIT] Fermes trouvées: 2
🎯 [SIMPLE-INIT] Ferme active sélectionnée: Ma Ferme
🚀 [FARM-CACHE] Chargement progressif pour ferme: 123
✅ [FARM-CACHE] Données critiques chargées: plots: 5, materials: 3
```

## 📚 Ressources supplémentaires

- **Système de cache** : `docs/FARM_DATA_CACHE_SYSTEM.md`
- **Initialisation** : `docs/SIMPLE_INITIALIZATION_REFACTOR.md`
- **Service principal** : `src/services/SimpleInitService.ts`
- **Cache des données** : `src/services/FarmDataCacheService.ts`
- **Contexte complet** : `src/contexts/FarmContext.tsx`

---

**💡 Conseil** : Le FarmContext gère automatiquement l'initialisation, le cache, et la persistance. Utilisez les hooks spécialisés (`useFarmPlots`, `useFarmMaterials`, etc.) pour un accès optimisé aux données métier.