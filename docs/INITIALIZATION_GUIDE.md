# 🚀 Guide Complet d'Initialisation - Thomas V2

## 📋 Vue d'ensemble

Ce guide unifie toutes les informations sur l'initialisation de Thomas V2, incluant l'authentification, la gestion des fermes, et le cache des données métier.

## 🎯 Architecture d'initialisation

### **Philosophie SIMPLE**
- **API-first** : Une seule source de vérité
- **Logique linéaire** : Auth → Fermes → Données → App
- **Cache intelligent** : Chargement progressif des données métier
- **Gestion d'erreurs robuste** : Timeouts et récupération automatique

### **Flux d'initialisation**
```
1. App démarre → AuthContext initialisation
2. Utilisateur connecté → FarmProvider initialisation
3. SimpleInitService.initializeUserFarms()
4. Si aucune ferme → FarmSetupScreen
5. Si fermes existantes → Sélection ferme active
6. Cache des données métier (parcelles, matériels, etc.)
7. App principale prête
```

## 🔧 Services principaux

### **1. SimpleInitService** 
*Service ultra-simple pour l'initialisation des fermes*

```typescript
// Initialisation complète
const result = await SimpleInitService.initializeUserFarms(userId);
// → { farms, activeFarm, needsSetup }

// Changer ferme active
await SimpleInitService.setActiveFarm(userId, farmId);

// Créer première ferme
const newFarm = await SimpleInitService.createFirstFarm(userId, farmData);
```

**Avantages :**
- ~150 lignes seulement
- Pas de cache complexe
- Timeouts intelligents (5s profil, 8s fermes)
- Création automatique du profil si manquant

### **2. FarmDataCacheService**
*Cache intelligent pour les données métier*

```typescript
// Chargement progressif
const data = await FarmDataCacheService.loadFarmData(farmId);
// → Données critiques immédiatement, secondaires en arrière-plan

// Invalidation sélective
await FarmDataCacheService.invalidatePartialCache(farmId, ['plots']);

// Statistiques du cache
const stats = await FarmDataCacheService.getCacheStats(farmId);
```

**Données en cache :**
- **Parcelles** : 30 min (changent peu)
- **Matériels** : 20 min (changent peu)
- **Cultures** : 60 min (changent très peu)
- **Tâches** : 5 min (changent souvent)

## 📱 Composants d'interface

### **1. Flux principal (App.tsx)**
```typescript
// Architecture ultra-simple
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreens />;
  
  return (
    <FarmProvider>
      <AppMainContent />
    </FarmProvider>
  );
}
```

### **2. Gestion des états d'initialisation**
```typescript
function AppMainContent() {
  const { loading, error, needsSetup } = useFarm();
  
  if (loading) return <LoadingScreen message="Chargement fermes..." />;
  if (error) return <ErrorScreen error={error} />;
  if (needsSetup) return <FarmSetupScreen />;
  
  return <SimpleNavigator />;
}
```

### **3. Configuration première ferme**
```typescript
// FarmSetupScreen.tsx - Interface guidée
function FarmSetupScreen() {
  const { createFirstFarm } = useFarm();
  
  const handleCreate = async (farmData) => {
    await createFirstFarm(farmData);
    // Redirection automatique vers l'app
  };
  
  return <SetupForm onSubmit={handleCreate} />;
}
```

## 💾 Stockage et persistance

### **Base de données**
```sql
-- Migration : Ferme active dans le profil
ALTER TABLE public.profiles 
ADD COLUMN latest_active_farm_id INTEGER REFERENCES public.farms(id);

-- Index pour performance
CREATE INDEX profiles_latest_active_farm_idx ON public.profiles(latest_active_farm_id);
```

### **Cache local (AsyncStorage)**
```typescript
// Structure du cache par ferme
@farm_data_123: {
  plots: PlotData[],
  materials: MaterialFromDB[],
  cultures: Culture[],
  tasks: TaskData[],
  cachedAt: timestamp,
  farmId: number
}
```

## 🎮 Utilisation pratique

### **1. Accès aux données**
```typescript
// Hook principal
const { farms, activeFarm, loading, needsSetup } = useFarm();

// Hooks spécialisés
const { plots, loading: plotsLoading } = useFarmPlots();
const { materials } = useFarmMaterials();
const { tasks } = useFarmTasks();
```

### **2. Actions courantes**
```typescript
// Changer de ferme
await changeActiveFarm(selectedFarm);

// Actualiser données
await refreshFarmData(); // Toutes les données
await invalidateFarmData(['plots']); // Seulement les parcelles

// Après création/modification
await PlotService.createPlot(farmId, plotData);
await invalidateFarmData(['plots']); // Cache mis à jour auto
```

### **3. Gestion d'erreurs**
```typescript
function RobustComponent() {
  const { error, loading, refreshFarms } = useFarm();
  
  if (loading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <ErrorView>
        <Text>{error}</Text>
        <Button onPress={refreshFarms}>Réessayer</Button>
      </ErrorView>
    );
  }
  
  return <NormalContent />;
}
```

## 🔧 Diagnostics et debug

### **Mode debug intégré**
```typescript
// Triple-tap sur écran de chargement pour activer
// Tests automatiques :
// - Connexion Supabase
// - Session utilisateur  
// - Profil utilisateur
// - Fonction get_user_farms
// - Fermes directes
```

### **Logs à surveiller**
```
🚀 [SIMPLE-INIT] Initialisation pour utilisateur: user@email.com
✅ [SIMPLE-INIT] Fermes trouvées: 2
🎯 [SIMPLE-INIT] Ferme active sélectionnée: Ma Ferme
🚀 [FARM-CACHE] Chargement progressif pour ferme: 123
✅ [FARM-CACHE] Données critiques chargées: plots: 5, materials: 3
```

### **Problèmes courants et solutions**
```typescript
// 1. Profil manquant
// → Création automatique dans SimpleInitService

// 2. Ferme active perdue
// → Sauvegarde dans latest_active_farm_id

// 3. Cache obsolète
// → Invalidation automatique après modifications

// 4. Timeout d'initialisation
// → Timeouts courts (5s, 8s, 15s) avec retry
```

## 📊 Performances

### **Métriques cibles**
- **Démarrage** : < 3 secondes
- **Changement ferme** : < 2 secondes
- **Données critiques** : < 1 seconde
- **Cache hit ratio** : > 80%

### **Optimisations appliquées**
- Chargement progressif (critique → secondaire)
- Cache intelligent avec durées différenciées
- Timeouts courts pour éviter les blocages
- Invalidation sélective du cache

## 🚀 Migration depuis ancienne version

### **Services supprimés**
- ❌ `FarmCacheService` (logique cache complexe)
- ❌ `AppInitializationServiceV2` (vérifications système)
- ❌ `validateAndCleanupSession` (validation JWT complexe)

### **Services ajoutés**
- ✅ `SimpleInitService` (initialisation simple)
- ✅ `FarmDataCacheService` (cache métier intelligent)
- ✅ `InitializationDebug` (diagnostics intégrés)

### **Migration automatique**
```typescript
// L'ancienne méthode
await AppInitializationServiceV2.performSystemChecks();
await FarmCacheService.diagnoseCache();
const farms = await FarmService.getUserFarms(true);

// La nouvelle méthode (tout en un)
const result = await SimpleInitService.initializeUserFarms(userId);
```

## 🏆 Résultat final

L'initialisation Thomas V2 est maintenant :

- ✅ **Simple** : Logique linéaire, pas de sur-ingénierie
- ✅ **Rapide** : Démarrage < 3s, données critiques < 1s
- ✅ **Robuste** : Timeouts, gestion d'erreurs, récupération auto
- ✅ **Intelligente** : Cache progressif, invalidation sélective
- ✅ **Maintenable** : Code clair, diagnostics intégrés

**Mission accomplie !** 🎯

---

## 📚 Ressources

- **Cache des données** : `docs/FARM_DATA_CACHE_SYSTEM.md`
- **Usage du contexte** : `docs/FARM_CONTEXT_USAGE.md`
- **Guide membres** : `docs/FARM_MEMBERS_GUIDE.md`
- **Code source** : `src/services/SimpleInitService.ts`
- **Tests diagnostics** : Triple-tap en mode développement
