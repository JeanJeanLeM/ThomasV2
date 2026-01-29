import { DirectSupabaseService, type WhereCondition } from './DirectSupabaseService';
import type { Database } from '../types/database';

type TaskRow = Database['public']['Tables']['tasks']['Row'];

export interface TaskStatisticsFilters {
  farmId: number;
  startDate: Date;
  endDate: Date;
  userId?: string; // For myDataOnly filter
  plotIds?: number[]; // For plot filter
  surfaceUnitIds?: number[]; // For surface unit filter
  cultureIds?: number[]; // For culture filter
}

export interface TaskStatisticsData {
  category: string;
  totalDuration: number; // Sum of duration_minutes
  taskCount: number;
  color: string;
}

export class TaskService {

  /**
   * Get task statistics aggregated by category for pie chart
   */
  static async getTaskStatistics(filters: TaskStatisticsFilters): Promise<TaskStatisticsData[]> {
    try {
      console.log('📊 [TASK-STATS] Fetching task statistics:', filters);

      // Build the query conditions
      const conditions: WhereCondition[] = [
        { column: 'farm_id', value: filters.farmId },
        { column: 'is_active', value: true }, // Exclude soft-deleted tasks
        { column: 'date', value: filters.startDate.toISOString().split('T')[0], operator: 'gte' },
        { column: 'date', value: filters.endDate.toISOString().split('T')[0], operator: 'lte' }
      ];

      // Add user filter for myDataOnly
      if (filters.userId) {
        conditions.push({ column: 'user_id', value: filters.userId });
      }

      // Note: Plot and surface unit filtering is done client-side after fetching
      // Supabase doesn't easily support array overlap queries via REST API

      // Query tasks with necessary fields
      const selectFields = 'id,farm_id,user_id,title,category,duration_minutes,date,status,plot_ids,material_ids,notes';

      console.log('📊 [TASK-STATS] Query conditions:', {
        farmId: filters.farmId,
        startDate: filters.startDate.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0],
        userId: filters.userId,
        totalConditions: conditions.length
      });

      const tasksResult = await DirectSupabaseService.directSelect(
        'tasks',
        selectFields,
        conditions
      );

      if (tasksResult.error) {
        console.error('❌ [TASK-STATS] Error fetching tasks:', tasksResult.error);
        return [];
      }

      let tasks: TaskRow[] = tasksResult.data || [];

      // Apply additional filters client-side
      if (filters.plotIds && filters.plotIds.length > 0) {
        tasks = tasks.filter(task =>
          task.plot_ids && task.plot_ids.some((plotId: number) => filters.plotIds!.includes(plotId))
        );
      }

      if (filters.surfaceUnitIds && filters.surfaceUnitIds.length > 0) {
        tasks = tasks.filter(task =>
          task.surface_unit_ids && task.surface_unit_ids.some((unitId: number) => filters.surfaceUnitIds!.includes(unitId))
        );
      }

      // Filter out tasks without duration
      tasks = tasks.filter(task => task.duration_minutes && task.duration_minutes > 0);

      // Aggregate by category
      const categoryStats = new Map<string, TaskStatisticsData>();

      tasks.forEach(task => {
        const category = task.category || 'general'; // Default to 'general' if null

        if (!categoryStats.has(category)) {
          categoryStats.set(category, {
            category,
            totalDuration: 0,
            taskCount: 0,
            color: this.getCategoryColor(category)
          });
        }

        const stats = categoryStats.get(category)!;
        stats.totalDuration += task.duration_minutes || 0;
        stats.taskCount += 1;
      });

      const result = Array.from(categoryStats.values());

      console.log('✅ [TASK-STATS] Task statistics aggregated:', {
        totalTasks: tasks.length,
        categories: result.length,
        totalDuration: result.reduce((sum, cat) => sum + cat.totalDuration, 0)
      });

      return result;

    } catch (error) {
      console.error('❌ [TASK-STATS] Exception fetching task statistics:', error);
      return [];
    }
  }

  /**
   * Get color for task category
   */
  private static getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'production': '#10B981', // green
      'marketing': '#3B82F6', // blue
      'administratif': '#F59E0B', // amber
      'general': '#6B7280', // gray
    };

    return colors[category] || colors['general'];
  }

  /**
   * Create a new task
   */
  static async createTask(taskData: Partial<TaskRow>): Promise<TaskRow> {
    try {
      console.log('➕ [TASK-SERVICE] Creating task:', taskData.title);

      const { data, error } = await DirectSupabaseService.directInsert(
        'tasks',
        {
          ...taskData,
          is_active: true,
          created_at: new Date().toISOString()
        }
      );

      if (error) {
        console.error('❌ [TASK-SERVICE] Error creating task:', error);
        throw new Error(error.message || 'Erreur création tâche');
      }

      const createdTask = Array.isArray(data) ? data[0] : data;
      console.log('✅ [TASK-SERVICE] Task created:', createdTask.id);
      return createdTask;

    } catch (error) {
      console.error('❌ [TASK-SERVICE] Exception creating task:', error);
      throw error;
    }
  }

  /**
   * Update a task with new data
   */
  static async updateTask(taskId: string, taskData: Partial<TaskRow>): Promise<void> {
    try {
      console.log('📝 [TASK-SERVICE] Updating task:', taskId, taskData);

      const { data, error } = await DirectSupabaseService.directUpdate(
        'tasks',
        taskData,
        [{ column: 'id', value: taskId }]
      );

      if (error) {
        console.error('❌ [TASK-SERVICE] Error updating task:', error);
        throw new Error(error.message || 'Erreur mise à jour tâche');
      }

      console.log('✅ [TASK-SERVICE] Task updated successfully:', taskId);
    } catch (error) {
      console.error('❌ [TASK-SERVICE] Exception updating task:', error);
      throw error;
    }
  }

  /**
   * Soft delete a task by setting is_active to false
   */
  static async deleteTask(taskId: string): Promise<void> {
    try {
      console.log('🗑️ [TASK-SERVICE] Soft deleting task:', taskId);

      const { data, error } = await DirectSupabaseService.directUpdate(
        'tasks',
        { 
          is_active: false // Now we can use is_active after migration
        },
        [{ column: 'id', value: taskId }]
      );

      if (error) {
        console.error('❌ [TASK-SERVICE] Error soft deleting task:', error);
        throw new Error(error.message || 'Erreur suppression tâche');
      }

      console.log('✅ [TASK-SERVICE] Task soft deleted successfully:', taskId);
    } catch (error) {
      console.error('❌ [TASK-SERVICE] Exception deleting task:', error);
      throw error;
    }
  }

  /**
   * Get all tasks for a farm within a date range (for debugging)
   */
  static async getTasksInRange(filters: TaskStatisticsFilters): Promise<TaskRow[]> {
    try {
      const conditions: WhereCondition[] = [
        { column: 'farm_id', value: filters.farmId },
        { column: 'is_active', value: true }, // Exclude soft-deleted tasks
        { column: 'date', value: filters.startDate.toISOString().split('T')[0], operator: 'gte' },
        { column: 'date', value: filters.endDate.toISOString().split('T')[0], operator: 'lte' }
      ];

      if (filters.userId) {
        conditions.push({ column: 'user_id', value: filters.userId });
      }

      const tasksResult = await DirectSupabaseService.directSelect(
        'tasks',
        '*',
        conditions
      );

      if (tasksResult.error) {
        console.error('❌ [TASK-SERVICE] Error fetching tasks:', tasksResult.error);
        return [];
      }

      return tasksResult.data || [];

    } catch (error) {
      console.error('❌ [TASK-SERVICE] Exception fetching tasks:', error);
      return [];
    }
  }

  /**
   * Get all tasks with their relations (plots, plants, quantities)
   * Used for advanced statistics calculations
   */
  static async getTasksWithRelations(filters: TaskStatisticsFilters): Promise<TaskRow[]> {
    try {
      console.log('📊 [TASK-SERVICE] Fetching tasks with relations:', filters);

      const conditions: WhereCondition[] = [
        { column: 'farm_id', value: filters.farmId },
        { column: 'is_active', value: true },
        { column: 'date', value: filters.startDate.toISOString().split('T')[0], operator: 'gte' },
        { column: 'date', value: filters.endDate.toISOString().split('T')[0], operator: 'lte' }
      ];

      if (filters.userId) {
        conditions.push({ column: 'user_id', value: filters.userId });
      }

      // Select all fields including plants, plot_ids, quantities
      const selectFields = 'id,farm_id,user_id,title,category,duration_minutes,date,status,plot_ids,material_ids,notes,action,plants,surface_unit_ids,quantity_nature,quantity_type,quantity_value,quantity_unit,quantity_converted_value,quantity_converted_unit';

      const tasksResult = await DirectSupabaseService.directSelect(
        'tasks',
        selectFields,
        conditions
      );

      if (tasksResult.error) {
        console.error('❌ [TASK-SERVICE] Error fetching tasks with relations:', tasksResult.error);
        return [];
      }

      let tasks: TaskRow[] = tasksResult.data || [];

      // Apply additional filters client-side
      if (filters.plotIds && filters.plotIds.length > 0) {
        tasks = tasks.filter(task =>
          task.plot_ids && task.plot_ids.some((plotId: number) => filters.plotIds!.includes(plotId))
        );
      }

      if (filters.surfaceUnitIds && filters.surfaceUnitIds.length > 0) {
        tasks = tasks.filter(task =>
          task.surface_unit_ids && task.surface_unit_ids.some((unitId: number) => filters.surfaceUnitIds!.includes(unitId))
        );
      }

      console.log('✅ [TASK-SERVICE] Tasks with relations fetched:', tasks.length);
      return tasks;

    } catch (error) {
      console.error('❌ [TASK-SERVICE] Exception fetching tasks with relations:', error);
      return [];
    }
  }

  /**
   * Extract unique culture names from tasks
   */
  static extractCulturesFromTasks(tasks: TaskRow[]): string[] {
    const cultures = new Set<string>();
    
    tasks.forEach(task => {
      if (task.plants && Array.isArray(task.plants)) {
        task.plants.forEach((plant: string) => {
          if (plant && plant.trim()) {
            cultures.add(plant.trim());
          }
        });
      }
    });

    return Array.from(cultures).sort();
  }

  /**
   * Extract unique plot IDs from tasks
   */
  static extractPlotsFromTasks(tasks: TaskRow[]): number[] {
    const plotIds = new Set<number>();
    
    tasks.forEach(task => {
      if (task.plot_ids && Array.isArray(task.plot_ids)) {
        task.plot_ids.forEach((plotId: number) => {
          if (plotId) {
            plotIds.add(plotId);
          }
        });
      }
    });

    return Array.from(plotIds).sort((a, b) => a - b);
  }
}



