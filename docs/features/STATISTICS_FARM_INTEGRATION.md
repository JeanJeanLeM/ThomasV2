# Intégration des Statistiques avec FarmContext - Thomas V2

## 🎯 Problème Identifié

Les statistiques du ProfileScreen (tâches ce mois, heures travaillées, parcelles actives) affichent des valeurs fixes (0) et ne sont pas liées à la ferme active.

## 🔧 Solution avec FarmContext

### 1. Utiliser les données en cache du FarmContext

```typescript
import { useFarm } from '../contexts/FarmContext';

function ProfileScreen() {
  const { activeFarm, farmData } = useFarm();
  
  // Données automatiquement mises à jour
  const stats = {
    plots: farmData.plots.filter(p => p.status === 'active').length,
    tasks: farmData.tasks.length,
    hours: farmData.tasks.reduce((sum, task) => sum + (task.duration_minutes || 0), 0) / 60
  };
}
```

### 2. Statistiques temps réel avec TaskService

```typescript
import { TaskService } from '../services/TaskService';

function useMonthlyStats() {
  const { activeFarm, user } = useFarm();
  const [stats, setStats] = useState({ tasks: 0, hours: 0, plots: 0 });

  useEffect(() => {
    if (!activeFarm?.id) return;

    const fetchStats = async () => {
      // Période du mois courant
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const taskStats = await TaskService.getTaskStatistics({
        farmId: activeFarm.id,
        startDate: startOfMonth,
        endDate: endOfMonth,
        userId: user?.id // Optionnel : mes données uniquement
      });

      const totalHours = taskStats.reduce((sum, cat) => sum + cat.totalDuration, 0) / 60;
      const totalTasks = taskStats.reduce((sum, cat) => sum + cat.taskCount, 0);

      setStats({
        tasks: totalTasks,
        hours: Math.round(totalHours * 10) / 10,
        plots: farmData.plots.filter(p => p.status === 'active').length
      });
    };

    fetchStats();
  }, [activeFarm?.id, user?.id, farmData.plots]);

  return stats;
}
```

### 3. Correction rapide ProfileScreen

```typescript
// Remplacer les stats fixes par :
const { activeFarm, farmData } = useFarm();

const stats = useMemo(() => ({
  tasks: farmData.tasks.filter(task => {
    const taskDate = new Date(task.date);
    const now = new Date();
    return taskDate.getMonth() === now.getMonth() && 
           taskDate.getFullYear() === now.getFullYear();
  }).length,
  hours: Math.round(
    farmData.tasks
      .filter(task => task.duration_minutes)
      .reduce((sum, task) => sum + (task.duration_minutes || 0), 0) / 60 * 10
  ) / 10,
  plots: farmData.plots.filter(plot => plot.status === 'active').length
}), [farmData.tasks, farmData.plots]);
```

## 📊 Avantages de cette approche

- **Cache automatique** : Données déjà chargées par FarmContext
- **Réactivité** : Mise à jour automatique lors des changements
- **Performance** : Pas de requêtes supplémentaires
- **Cohérence** : Même source de données que les autres écrans

## 🚀 Implémentation Immédiate

1. **Importer useFarm** dans ProfileScreen
2. **Remplacer stats fixes** par calculs basés sur farmData
3. **Ajouter useEffect** pour rafraîchir si nécessaire
4. **Gérer les cas d'absence** de ferme active

Cette solution garantit que les statistiques reflètent toujours l'état actuel de la ferme sélectionnée.

