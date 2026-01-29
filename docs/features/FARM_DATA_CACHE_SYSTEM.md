# 🚀 Système de Cache des Données Métier - Thomas V2

## 🎯 **Objectif**

Construire un système de cache intelligent pour les données métier de la ferme active : **parcelles, matériels, cultures et tâches**.

## 📊 **Données mises en cache**

### **🥇 Priorité 1 - Critiques (chargement immédiat)**
- **Parcelles** : `PlotService.getPlotsByFarm()`
  - Données de base + unités de surface
  - Cache 30 min (les parcelles changent peu)
- **Matériels** : `MaterialService.getMaterialsByFarm()`
  - Outils, machines, équipements
  - Cache 20 min (les matériels changent peu)

### **🥈 Priorité 2 - Importantes (chargement différé 2s)**
- **Tâches semaine** : Tâches en cours, prévues, observations
  - Cache 5 min (changent souvent)
- **Cultures** : `CultureService.getCultures(farmId)`
  - Types de cultures utilisés
  - Cache 1h (changent très peu)

## 🔧 **Architecture du système**

### **Services créés** :
```typescript
// Service principal de cache
src/services/FarmDataCacheService.ts
- loadFarmData() : Chargement progressif
- invalidateFarmCache() : Invalidation complète
- invalidatePartialCache() : Invalidation sélective
- getCacheStats() : Diagnostics

// Contexte étendu
src/contexts/FarmContext.tsx
- farmData : État des données métier
- refreshFarmData() : Actualisation manuelle
- invalidateFarmData() : Invalidation depuis UI
```

### **Hooks utilitaires** :
```typescript
useFarmPlots()    // Accès direct aux parcelles
useFarmMaterials() // Accès direct aux matériels
useFarmTasks()    // Accès direct aux tâches
useFarmCultures() // Accès direct aux cultures
```

## ⚡ **Stratégie de chargement**

### **1. Chargement progressif**
```
Utilisateur → Ferme active sélectionnée
    ↓
Étape 1 (immédiat) : Parcelles + Matériels
    ↓ (retour interface)
Étape 2 (+ 2s) : Tâches + Cultures
    ↓ (sauvegarde cache)
Données complètes disponibles
```

### **2. Déclencheurs de chargement**
- **Changement ferme active** → Chargement complet
- **Première connexion** → Chargement après sélection ferme
- **Actualisation manuelle** → Invalidation + rechargement
- **Modification données** → Invalidation partielle

### **3. Gestion du cache**
```typescript
// Cache intelligent avec durées différenciées
PLOTS: 30 min     // Changent peu
MATERIALS: 20 min // Changent peu
CULTURES: 60 min  // Changent très peu
TASKS: 5 min      // Changent souvent

// Stockage AsyncStorage par ferme
@farm_data_123 → { plots, materials, cultures, tasks, cachedAt }
@farm_data_sync_123 → timestamp dernière sync
```

## 🎯 **Quand charger les caches ?**

### **✅ Déclencher le chargement** :
1. **Ferme active sélectionnée** (automatique)
2. **Changement de ferme** (automatique)
3. **Actualisation demandée** (bouton refresh)
4. **Cache expiré** (vérification background)
5. **Après création/modification** (invalidation)

### **⚠️ Quand invalider** :
- **Changement ferme** → Invalidation complète
- **Création parcelle** → Invalidation `['plots']`
- **Création matériel** → Invalidation `['materials']`
- **Création tâche** → Invalidation `['tasks']`
- **Modification cultures** → Invalidation `['cultures']`

## 💻 **Comment utiliser**

### **1. Accès aux données (lecture)**
```typescript
// Dans un composant
import { useFarmPlots, useFarmMaterials } from '../contexts/FarmContext';

function MyComponent() {
  const { plots, loading } = useFarmPlots();
  const { materials } = useFarmMaterials();
  
  if (loading) return <Loading />;
  
  return (
    <View>
      {plots.map(plot => (
        <Text key={plot.id}>{plot.name}</Text>
      ))}
    </View>
  );
}
```

### **2. Actions sur les données (modification)**
```typescript
// Après création d'une parcelle
import { useFarm } from '../contexts/FarmContext';

function CreatePlotScreen() {
  const { invalidateFarmData } = useFarm();
  
  const handleCreatePlot = async (plotData) => {
    await PlotService.createPlot(farmId, plotData);
    
    // Invalider seulement les parcelles
    await invalidateFarmData(['plots']);
  };
}
```

### **3. Actualisation manuelle**
```typescript
// Bouton refresh global
function RefreshButton() {
  const { refreshFarmData, farmData } = useFarm();
  
  return (
    <TouchableOpacity 
      onPress={refreshFarmData}
      disabled={farmData.loading}
    >
      <Text>{farmData.loading ? 'Actualisation...' : 'Actualiser'}</Text>
    </TouchableOpacity>
  );
}
```

## 🔄 **Flux d'actualisation**

### **Scénario : Création d'une parcelle**
```
1. Utilisateur crée parcelle → PlotService.createPlot()
2. Parcelle créée en BD → Success
3. invalidateFarmData(['plots']) → Cache parcelles invalidé
4. Rechargement parcelles depuis API → UI mise à jour
5. Cache mis à jour → Prêt pour prochaine utilisation
```

### **Scénario : Changement de ferme**
```
1. Utilisateur change ferme → changeActiveFarm()
2. Ferme active mise à jour → SimpleInitService.setActiveFarm()
3. loadFarmData(newFarmId) → Chargement des données
4. Données critiques chargées → Interface débloquée
5. Données secondaires chargées → Cache complet
```

## 📈 **Métriques et diagnostics**

### **Cache stats** :
```typescript
const stats = await FarmDataCacheService.getCacheStats(farmId);
// {
//   hasCache: true,
//   ageMinutes: 15,
//   dataTypes: ['plots', 'materials', 'cultures', 'tasks'],
//   sizes: { plots: 12, materials: 8, cultures: 25, tasks: 3 }
// }
```

### **Logs de debug** :
```
🚀 [FARM-CACHE] Chargement progressif pour ferme: 123
✅ [FARM-CACHE] Données critiques chargées: plots: 12, materials: 8
🔄 [FARM-CACHE] Chargement données secondaires en arrière-plan
✅ [FARM-CACHE] Données secondaires sauvegardées en cache
```

## 🎯 **Avantages obtenus**

### **Performance** ⚡
- **Chargement immédiat** des données critiques
- **Interface non-bloquante** (chargement progressif)
- **Cache intelligent** avec durées optimisées
- **Actualisation en arrière-plan** pour les tâches

### **UX améliorée** ✨
- **Pas d'écran blanc** lors du changement de ferme
- **Données toujours disponibles** (fallback cache)
- **Actualisation douce** sans reload complet
- **Feedback visuel** du statut de chargement

### **Robustesse** 🛡️
- **Invalidation automatique** après modifications
- **Fallback sur cache expiré** en cas d'erreur API
- **Gestion d'erreurs** granulaire par type de données
- **Cache par ferme** isolé et cohérent

## 🔧 **Pour les développeurs**

### **Intégrer une nouvelle donnée** :
1. Ajouter le service API correspondant
2. Étendre `FarmDataCache` dans le service
3. Ajouter la logique de chargement
4. Créer le hook utilitaire correspondant
5. Définir la durée de cache appropriée

### **Exemple - Ajouter "Observations"** :
```typescript
// 1. Étendre l'interface
interface FarmDataCache {
  // ... existant
  observations: Observation[];
}

// 2. Ajouter dans loadFarmData()
const observations = await ObservationService.getByFarm(farmId);

// 3. Créer le hook
export const useFarmObservations = () => {
  const { farmData } = useFarm();
  return {
    observations: farmData.observations,
    loading: farmData.loading,
  };
};
```

## 🎉 **Résultat final**

Le système de cache est maintenant :
- ✅ **Intégré** dans FarmContext
- ✅ **Progressif** pour les performances
- ✅ **Intelligent** avec durées différenciées
- ✅ **Simple** à utiliser avec les hooks
- ✅ **Robuste** avec invalidation automatique

**Les données métier sont disponibles instantanément !** 🚀

---

## 📝 **Exemple complet**

Voir `src/examples/FarmDataUsageExample.tsx` pour un exemple complet d'utilisation du système de cache.
