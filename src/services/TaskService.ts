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

export interface TaskMemberData {
  user_id: string;
  first_name: string;
  last_name?: string | null;
  full_name?: string | null;
}

export class TaskService {
  static async getProfileFirstNamesByUserIds(userIds: string[]): Promise<Record<string, string>> {
    if (!userIds || userIds.length === 0) return {};

    try {
      const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
      const result = await DirectSupabaseService.directSelect(
        'profiles',
        'id,first_name,full_name,email',
        [{ column: 'id', value: `(${uniqueUserIds.join(',')})`, operator: 'in' }]
      );

      if (result.error || !Array.isArray(result.data)) return {};

      const namesByUserId: Record<string, string> = {};
      for (const profile of result.data) {
        if (!profile?.id) continue;
        const fallback =
          (typeof profile.full_name === 'string' && profile.full_name.trim().length > 0
            ? profile.full_name.trim().split(' ')[0]
            : null) ||
          (typeof profile.email === 'string' && profile.email.includes('@')
            ? profile.email.split('@')[0]
            : null) ||
          profile.id;
        namesByUserId[profile.id] = profile.first_name || fallback;
      }
      return namesByUserId;
    } catch (error) {
      console.error('❌ [TASK-SERVICE] getProfileFirstNamesByUserIds failed:', error);
      return {};
    }
  }

  static async getTaskMembersByTaskIds(taskIds: string[]): Promise<Record<string, TaskMemberData[]>> {
    if (!taskIds || taskIds.length === 0) return {};

    try {
      const uniqueTaskIds = Array.from(new Set(taskIds.filter(Boolean)));
      const inClause = `(${uniqueTaskIds.join(',')})`;
      const taskMembersByTaskId: Record<string, TaskMemberData[]> = {};

      const taskMembersResult = await DirectSupabaseService.directSelect(
        'task_members',
        'task_id,user_id',
        [{ column: 'task_id', value: inClause, operator: 'in' }]
      );

      if (taskMembersResult.error || !Array.isArray(taskMembersResult.data) || taskMembersResult.data.length === 0) {
        return {};
      }

      const taskMembersRows = taskMembersResult.data as Array<{ task_id: string; user_id: string }>;
      const uniqueUserIds = Array.from(new Set(taskMembersRows.map((row) => row.user_id).filter(Boolean)));
      const profileById: Record<string, { first_name?: string | null; last_name?: string | null; full_name?: string | null }> = {};

      if (uniqueUserIds.length > 0) {
        const profilesResult = await DirectSupabaseService.directSelect(
          'profiles',
          'id,first_name,last_name,full_name',
          [{ column: 'id', value: `(${uniqueUserIds.join(',')})`, operator: 'in' }]
        );

        if (!profilesResult.error && Array.isArray(profilesResult.data)) {
          for (const profile of profilesResult.data) {
            if (profile?.id) {
              profileById[profile.id] = {
                first_name: profile.first_name,
                last_name: profile.last_name,
                full_name: profile.full_name,
              };
            }
          }
        }
      }

      for (const row of taskMembersRows) {
        if (!row.task_id || !row.user_id) continue;
        const profile = profileById[row.user_id] || {};
        const fallbackFirstName = (profile.full_name || row.user_id).split(' ')[0] || row.user_id;
        if (!taskMembersByTaskId[row.task_id]) taskMembersByTaskId[row.task_id] = [];
        taskMembersByTaskId[row.task_id].push({
          user_id: row.user_id,
          first_name: profile.first_name || fallbackFirstName,
          last_name: profile.last_name || null,
          full_name: profile.full_name || null,
        });
      }

      return taskMembersByTaskId;
    } catch (error) {
      console.error('❌ [TASK-SERVICE] getTaskMembersByTaskIds failed:', error);
      return {};
    }
  }

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
   * Soft-delete all planned tasks (en_attente, en_cours) for a farm.
   * Tasks already completed (terminee) are never deleted.
   * Deleted tasks disappear from the app (is_active = false) but remain in the table.
   */
  static async deleteAllPlannedTasksForFarm(farmId: number): Promise<{ deleted: number }> {
    try {
      const conditionsEnAttente: WhereCondition[] = [
        { column: 'farm_id', value: farmId },
        { column: 'status', value: 'en_attente' },
        { column: 'is_active', value: true },
      ];
      const conditionsEnCours: WhereCondition[] = [
        { column: 'farm_id', value: farmId },
        { column: 'status', value: 'en_cours' },
        { column: 'is_active', value: true },
      ];
      const whereEq = (c: WhereCondition[]) => c.map(({ column, value }) => ({ column, value }));

      const [r1, r2] = await Promise.all([
        DirectSupabaseService.directUpdate('tasks', { is_active: false }, whereEq(conditionsEnAttente), 'id'),
        DirectSupabaseService.directUpdate('tasks', { is_active: false }, whereEq(conditionsEnCours), 'id'),
      ]);
      const deleted = (Array.isArray(r1.data) ? r1.data.length : 0) + (Array.isArray(r2.data) ? r2.data.length : 0);
      if (r1.error) console.error('❌ [TASK-SERVICE] deleteAllPlanned (en_attente):', r1.error);
      if (r2.error) console.error('❌ [TASK-SERVICE] deleteAllPlanned (en_cours):', r2.error);
      console.log('✅ [TASK-SERVICE] Planned tasks soft-deleted:', deleted);
      return { deleted };
    } catch (error) {
      console.error('❌ [TASK-SERVICE] Exception deleteAllPlannedTasksForFarm:', error);
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

  /**
   * Chargement léger (plot_ids, plants) pour pré-filtrer les listes Culture / Parcelle
   * selon les tâches présentes sur la période.
   */
  static async getPeriodReferenceHints(filters: TaskStatisticsFilters): Promise<{
    taskCount: number;
    plotIds: number[];
    plantNames: string[];
  }> {
    try {
      const conditions: WhereCondition[] = [
        { column: 'farm_id', value: filters.farmId },
        { column: 'is_active', value: true },
        { column: 'date', value: filters.startDate.toISOString().split('T')[0], operator: 'gte' },
        { column: 'date', value: filters.endDate.toISOString().split('T')[0], operator: 'lte' },
      ];

      if (filters.userId) {
        conditions.push({ column: 'user_id', value: filters.userId });
      }

      const tasksResult = await DirectSupabaseService.directSelect(
        'tasks',
        'plot_ids,plants',
        conditions
      );

      if (tasksResult.error || !tasksResult.data) {
        return { taskCount: 0, plotIds: [], plantNames: [] };
      }

      const tasks = tasksResult.data as TaskRow[];

      return {
        taskCount: tasks.length,
        plotIds: TaskService.extractPlotsFromTasks(tasks),
        plantNames: TaskService.extractCulturesFromTasks(tasks),
      };
    } catch (error) {
      console.error('❌ [TASK-SERVICE] getPeriodReferenceHints:', error);
      return { taskCount: 0, plotIds: [], plantNames: [] };
    }
  }
}



