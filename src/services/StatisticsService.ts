/**
 * Service centralisé pour toutes les statistiques de l'application
 * Gère l'agrégation et le formatage des données pour les différents types de graphiques
 */

import { TaskService, type TaskStatisticsFilters } from './TaskService';
import { ChartColorService } from './ChartColorService';
import { DirectSupabaseService, type WhereCondition } from './DirectSupabaseService';
import type { Database } from '../types/database';
import type { PieChartData } from '../design-system/components/charts';

type TaskRow = Database['public']['Tables']['tasks']['Row'];

export interface BarChartData {
  label: string;           // Date ou période (axe X)
  stacks: {                // Données empilées
    name: string;          // Nom de la tâche/culture
    value: number;         // Durée en heures
    color: string;
  }[];
}

export class StatisticsService {
  /**
   * Get work time statistics aggregated by culture
   */
  static async getWorkTimeByCulture(
    filters: TaskStatisticsFilters
  ): Promise<PieChartData[]> {
    try {
      console.log('📊 [STATS-SERVICE] Fetching work time by culture:', filters);

      const tasks = await TaskService.getTasksWithRelations(filters);
      
      // Filter tasks with duration and plants
      const tasksWithPlants = tasks.filter(task => 
        task.duration_minutes && 
        task.duration_minutes > 0 &&
        task.plants && 
        Array.isArray(task.plants) && 
        task.plants.length > 0
      );

      if (tasksWithPlants.length === 0) {
        return [];
      }

      // Aggregate by culture
      const cultureStats = new Map<string, { totalDuration: number; taskCount: number }>();

      tasksWithPlants.forEach(task => {
        const duration = task.duration_minutes || 0;
        const plants = task.plants || [];

        plants.forEach((plant: string) => {
          if (plant && plant.trim()) {
            const cultureName = plant.trim();
            
            if (!cultureStats.has(cultureName)) {
              cultureStats.set(cultureName, {
                totalDuration: 0,
                taskCount: 0,
              });
            }

            const stats = cultureStats.get(cultureName)!;
            stats.totalDuration += duration;
            stats.taskCount += 1;
          }
        });
      });

      // Fetch culture colors from database
      const cultureColorsMap = new Map<string, string>();
      const uniqueCultures = Array.from(cultureStats.keys());
      
      for (const cultureName of uniqueCultures) {
        try {
          const cultureResult = await DirectSupabaseService.directSelect(
            'cultures',
            'name,color',
            [{ column: 'name', value: cultureName }],
            true
          );

          if (cultureResult.data && !cultureResult.error) {
            cultureColorsMap.set(cultureName, cultureResult.data.color || '');
          }
        } catch (error) {
          console.warn(`⚠️ [STATS-SERVICE] Could not fetch color for culture ${cultureName}:`, error);
        }
      }

      // Convert to PieChartData format
      const result: PieChartData[] = Array.from(cultureStats.entries()).map(([cultureName, stats]) => ({
        name: cultureName,
        value: Math.round((stats.totalDuration / 60) * 100) / 100, // Convert to hours
        color: ChartColorService.getCultureColor(cultureName, cultureColorsMap.get(cultureName)),
      }));

      console.log('✅ [STATS-SERVICE] Work time by culture:', result.length, 'cultures');
      return result;

    } catch (error) {
      console.error('❌ [STATS-SERVICE] Error getting work time by culture:', error);
      return [];
    }
  }

  /**
   * Get work time statistics aggregated by task (for a specific culture)
   */
  static async getWorkTimeByTask(
    filters: TaskStatisticsFilters,
    cultureName?: string
  ): Promise<PieChartData[]> {
    try {
      console.log('📊 [STATS-SERVICE] Fetching work time by task:', { filters, cultureName });

      const tasks = await TaskService.getTasksWithRelations(filters);
      
      // Filter tasks with duration
      let filteredTasks = tasks.filter(task => 
        task.duration_minutes && 
        task.duration_minutes > 0
      );

      // Filter by culture if specified
      if (cultureName) {
        filteredTasks = filteredTasks.filter(task => {
          if (!task.plants || !Array.isArray(task.plants)) return false;
          return task.plants.some((plant: string) => 
            plant && plant.trim().toLowerCase() === cultureName.toLowerCase()
          );
        });
      }

      if (filteredTasks.length === 0) {
        return [];
      }

      // Aggregate by task title or action
      const taskStats = new Map<string, { totalDuration: number; taskCount: number }>();

      filteredTasks.forEach(task => {
        const taskName = task.title || task.action || 'Tâche sans nom';
        const duration = task.duration_minutes || 0;

        if (!taskStats.has(taskName)) {
          taskStats.set(taskName, {
            totalDuration: 0,
            taskCount: 0,
          });
        }

        const stats = taskStats.get(taskName)!;
        stats.totalDuration += duration;
        stats.taskCount += 1;
      });

      // Convert to PieChartData format
      const result: PieChartData[] = Array.from(taskStats.entries()).map(([taskName, stats], index) => ({
        name: taskName,
        value: Math.round((stats.totalDuration / 60) * 100) / 100, // Convert to hours
        color: ChartColorService.getColorPalette()[index % ChartColorService.getColorPalette().length],
      }));

      console.log('✅ [STATS-SERVICE] Work time by task:', result.length, 'tasks');
      return result;

    } catch (error) {
      console.error('❌ [STATS-SERVICE] Error getting work time by task:', error);
      return [];
    }
  }

  /**
   * Get work time statistics aggregated by plot
   */
  static async getWorkTimeByPlot(
    filters: TaskStatisticsFilters
  ): Promise<PieChartData[]> {
    try {
      console.log('📊 [STATS-SERVICE] Fetching work time by plot:', filters);

      const tasks = await TaskService.getTasksWithRelations(filters);
      
      // Filter tasks with duration and plot_ids
      const tasksWithPlots = tasks.filter(task => 
        task.duration_minutes && 
        task.duration_minutes > 0 &&
        task.plot_ids && 
        Array.isArray(task.plot_ids) && 
        task.plot_ids.length > 0
      );

      if (tasksWithPlots.length === 0) {
        return [];
      }

      // Get plot names from database
      const plotIds = TaskService.extractPlotsFromTasks(tasksWithPlots);
      const plotNamesMap = new Map<number, string>();

      // Fetch plot names
      for (const plotId of plotIds) {
        try {
          const plotResult = await DirectSupabaseService.directSelect(
            'plots',
            'id,name',
            [{ column: 'id', value: plotId }],
            true
          );

          if (plotResult.data && !plotResult.error) {
            plotNamesMap.set(plotId, plotResult.data.name || `Parcelle ${plotId}`);
          } else {
            plotNamesMap.set(plotId, `Parcelle ${plotId}`);
          }
        } catch (error) {
          console.warn(`⚠️ [STATS-SERVICE] Could not fetch plot ${plotId}:`, error);
          plotNamesMap.set(plotId, `Parcelle ${plotId}`);
        }
      }

      // Aggregate by plot
      const plotStats = new Map<number, { totalDuration: number; taskCount: number }>();

      tasksWithPlots.forEach(task => {
        const duration = task.duration_minutes || 0;
        const plotIds = task.plot_ids || [];

        plotIds.forEach((plotId: number) => {
          if (plotId) {
            if (!plotStats.has(plotId)) {
              plotStats.set(plotId, {
                totalDuration: 0,
                taskCount: 0,
              });
            }

            const stats = plotStats.get(plotId)!;
            stats.totalDuration += duration;
            stats.taskCount += 1;
          }
        });
      });

      // Convert to PieChartData format
      const result: PieChartData[] = Array.from(plotStats.entries()).map(([plotId, stats]) => ({
        name: plotNamesMap.get(plotId) || `Parcelle ${plotId}`,
        value: Math.round((stats.totalDuration / 60) * 100) / 100, // Convert to hours
        color: ChartColorService.getPlotColor(plotId),
      }));

      console.log('✅ [STATS-SERVICE] Work time by plot:', result.length, 'plots');
      return result;

    } catch (error) {
      console.error('❌ [STATS-SERVICE] Error getting work time by plot:', error);
      return [];
    }
  }

  /**
   * Get work time over time aggregated by culture (for stacked bar chart)
   */
  static async getWorkTimeOverTimeByCulture(
    filters: TaskStatisticsFilters,
    groupBy: 'day' | 'week' | 'month' = 'week'
  ): Promise<BarChartData[]> {
    try {
      console.log('📊 [STATS-SERVICE] Fetching work time over time by culture:', { filters, groupBy });

      const tasks = await TaskService.getTasksWithRelations(filters);
      
      // Filter tasks with duration and plants
      const tasksWithPlants = tasks.filter(task => 
        task.duration_minutes && 
        task.duration_minutes > 0 &&
        task.plants && 
        Array.isArray(task.plants) && 
        task.plants.length > 0 &&
        task.date
      );

      if (tasksWithPlants.length === 0) {
        return [];
      }

      // Group tasks by period and culture
      const periodStats = new Map<string, Map<string, number>>();

      tasksWithPlants.forEach(task => {
        const date = new Date(task.date);
        let periodKey: string;

        // Group by period
        switch (groupBy) {
          case 'day':
            periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            break;
          case 'week':
            // Get Monday of the week
            const dayOfWeek = date.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const monday = new Date(date);
            monday.setDate(monday.getDate() - daysToMonday);
            periodKey = `Semaine ${monday.toISOString().split('T')[0]}`;
            break;
          case 'month':
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            periodKey = date.toISOString().split('T')[0];
        }

        const duration = (task.duration_minutes || 0) / 60; // Convert to hours
        const plants = task.plants || [];

        plants.forEach((plant: string) => {
          if (plant && plant.trim()) {
            const cultureName = plant.trim();

            if (!periodStats.has(periodKey)) {
              periodStats.set(periodKey, new Map());
            }

            const cultureMap = periodStats.get(periodKey)!;
            const currentValue = cultureMap.get(cultureName) || 0;
            cultureMap.set(cultureName, currentValue + duration);
          }
        });
      });

      // Fetch culture colors from database
      const allCultureNames = new Set<string>();
      periodStats.forEach(cultureMap => {
        cultureMap.forEach((_, cultureName) => allCultureNames.add(cultureName));
      });

      const cultureColorsMap = new Map<string, string>();
      for (const cultureName of allCultureNames) {
        try {
          const cultureResult = await DirectSupabaseService.directSelect(
            'cultures',
            'name,color',
            [{ column: 'name', value: cultureName }],
            true
          );

          if (cultureResult.data && !cultureResult.error) {
            cultureColorsMap.set(cultureName, cultureResult.data.color || '');
          }
        } catch (error) {
          console.warn(`⚠️ [STATS-SERVICE] Could not fetch color for culture ${cultureName}:`, error);
        }
      }

      // Convert to BarChartData format
      const result: BarChartData[] = Array.from(periodStats.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([periodKey, cultureMap]) => {
          const stacks = Array.from(cultureMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cultureName, value]) => ({
              name: cultureName,
              value: Math.round(value * 100) / 100,
              color: ChartColorService.getCultureColor(cultureName, cultureColorsMap.get(cultureName)),
            }));

          return {
            label: periodKey,
            stacks,
          };
        });

      console.log('✅ [STATS-SERVICE] Work time over time by culture:', result.length, 'periods');
      return result;

    } catch (error) {
      console.error('❌ [STATS-SERVICE] Error getting work time over time by culture:', error);
      return [];
    }
  }

  /**
   * Get harvest statistics aggregated by culture
   */
  static async getHarvestByCulture(
    filters: TaskStatisticsFilters
  ): Promise<PieChartData[]> {
    try {
      console.log('📊 [STATS-SERVICE] Fetching harvest by culture:', filters);

      const tasks = await TaskService.getTasksWithRelations(filters);
      
      // Filter tasks with harvest quantities
      const harvestTasks = tasks.filter(task => 
        task.quantity_type === 'recolte' &&
        task.quantity_value &&
        task.quantity_value > 0
      );

      if (harvestTasks.length === 0) {
        return [];
      }

      // Aggregate by culture
      const harvestStats = new Map<string, { totalQuantity: number; taskCount: number; unit: string }>();

      harvestTasks.forEach(task => {
        const quantity = task.quantity_value || 0;
        const unit = task.quantity_unit || 'unité';
        
        // Extract culture from plants or description
        let cultureName = 'Autre';
        
        if (task.plants && Array.isArray(task.plants) && task.plants.length > 0) {
          cultureName = task.plants[0].trim();
        } else if (task.description) {
          // Try to extract culture from description (simple heuristic)
          const desc = task.description.toLowerCase();
          // This is a simple approach - could be improved with NLP
          cultureName = 'Autre';
        }

        if (!harvestStats.has(cultureName)) {
          harvestStats.set(cultureName, {
            totalQuantity: 0,
            taskCount: 0,
            unit,
          });
        }

        const stats = harvestStats.get(cultureName)!;
        stats.totalQuantity += quantity;
        stats.taskCount += 1;
      });

      // Fetch culture colors from database
      const cultureColorsMap = new Map<string, string>();
      const uniqueCultures = Array.from(harvestStats.keys());
      
      for (const cultureName of uniqueCultures) {
        if (cultureName === 'Autre') continue; // Skip "Autre"
        
        try {
          const cultureResult = await DirectSupabaseService.directSelect(
            'cultures',
            'name,color',
            [{ column: 'name', value: cultureName }],
            true
          );

          if (cultureResult.data && !cultureResult.error) {
            cultureColorsMap.set(cultureName, cultureResult.data.color || '');
          }
        } catch (error) {
          console.warn(`⚠️ [STATS-SERVICE] Could not fetch color for culture ${cultureName}:`, error);
        }
      }

      // Convert to PieChartData format
      const result: PieChartData[] = Array.from(harvestStats.entries()).map(([cultureName, stats]) => ({
        name: cultureName,
        value: Math.round(stats.totalQuantity * 100) / 100,
        color: ChartColorService.getCultureColor(cultureName, cultureColorsMap.get(cultureName)),
      }));

      console.log('✅ [STATS-SERVICE] Harvest by culture:', result.length, 'cultures');
      return result;

    } catch (error) {
      console.error('❌ [STATS-SERVICE] Error getting harvest by culture:', error);
      return [];
    }
  }
}
