import type { RecurringTaskTemplate, RecurringTaskCategory, RecurringTaskFrequencyType } from '../types';
import { DirectSupabaseService } from './DirectSupabaseService';

const TABLE = 'recurring_task_templates';

export interface RecurringTaskCreateData {
  farm_id: number;
  user_id: string;
  name: string;
  duration_minutes: number;
  action?: string;
  category: RecurringTaskCategory;
  culture?: string;
  number_of_people: number;
  plot_ids?: number[];
  surface_unit_ids?: number[];
  material_ids?: number[];
  notes?: string;
  start_month: number;
  end_month: number;
  start_day?: number;
  end_day?: number;
  is_permanent: boolean;
  day_of_week: number;
  frequency_type: RecurringTaskFrequencyType;
  frequency_interval: number;
}

export interface RecurringTaskUpdateData extends Partial<Omit<RecurringTaskCreateData, 'farm_id' | 'user_id'>> {
  id: string;
}

export interface WeeklyStats {
  count: number;
  totalMinutesPerWeek: number;
  coveragePercent: number;
}

function rowToTemplate(row: any): RecurringTaskTemplate {
  return {
    id: row.id,
    farm_id: row.farm_id,
    name: row.name,
    duration_minutes: row.duration_minutes,
    action: row.action ?? undefined,
    category: row.category,
    culture: row.culture ?? undefined,
    number_of_people: row.number_of_people ?? 1,
    plot_ids: row.plot_ids ?? [],
    surface_unit_ids: row.surface_unit_ids ?? [],
    material_ids: row.material_ids ?? [],
    notes: row.notes ?? undefined,
    start_month: row.start_month ?? 1,
    end_month: row.end_month ?? 12,
    start_day: row.start_day,
    end_day: row.end_day,
    is_permanent: row.is_permanent ?? false,
    day_of_week: row.day_of_week ?? 0,
    frequency_type: row.frequency_type ?? 'weekly',
    frequency_interval: row.frequency_interval ?? 1,
    is_active: row.is_active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class RecurringTaskService {
  static async getByFarm(farmId: number): Promise<RecurringTaskTemplate[]> {
    const { data, error } = await DirectSupabaseService.directSelect(
      TABLE,
      '*',
      [{ column: 'farm_id', value: farmId }]
    );
    if (error) throw new Error(error.message || 'Erreur chargement tâches récurrentes');
    const rows = Array.isArray(data) ? data : [];
    return rows.map(rowToTemplate);
  }

  static async create(data: RecurringTaskCreateData): Promise<RecurringTaskTemplate> {
    const insertData = {
      farm_id: data.farm_id,
      user_id: data.user_id,
      name: data.name,
      duration_minutes: data.duration_minutes,
      action: data.action ?? null,
      category: data.category,
      culture: data.culture ?? null,
      number_of_people: data.number_of_people ?? 1,
      plot_ids: data.plot_ids ?? [],
      surface_unit_ids: data.surface_unit_ids ?? [],
      material_ids: data.material_ids ?? [],
      notes: data.notes ?? null,
      start_month: data.start_month,
      end_month: data.end_month,
      start_day: data.start_day ?? null,
      end_day: data.end_day ?? null,
      is_permanent: data.is_permanent ?? false,
      day_of_week: data.day_of_week,
      frequency_type: data.frequency_type,
      frequency_interval: data.frequency_interval ?? 1,
      is_active: true,
    };
    const { data: created, error } = await DirectSupabaseService.directInsert(TABLE, insertData);
    if (error) throw new Error(error.message || 'Erreur création tâche récurrente');
    const row = Array.isArray(created) ? created[0] : created;
    return rowToTemplate(row);
  }

  static async update(payload: RecurringTaskUpdateData): Promise<RecurringTaskTemplate> {
    const { id, ...rest } = payload;
    const updateData: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
    const { data: updated, error } = await DirectSupabaseService.directUpdate(
      TABLE,
      updateData,
      [{ column: 'id', value: id }]
    );
    if (error) throw new Error(error.message || 'Erreur mise à jour tâche récurrente');
    const row = Array.isArray(updated) ? updated[0] : updated;
    return rowToTemplate(row);
  }

  static async toggleActive(id: string, isActive: boolean): Promise<RecurringTaskTemplate> {
    const { data, error } = await DirectSupabaseService.directUpdate(
      TABLE,
      { is_active: isActive, updated_at: new Date().toISOString() },
      [{ column: 'id', value: id }]
    );
    if (error) throw new Error(error.message || 'Erreur changement statut');
    const row = Array.isArray(data) ? data[0] : data;
    return rowToTemplate(row);
  }

  static async delete(id: string): Promise<void> {
    const { error } = await DirectSupabaseService.directDelete(TABLE, [{ column: 'id', value: id }]);
    if (error) throw new Error(error.message || 'Erreur suppression tâche récurrente');
  }

  static async getWeeklyWorkHours(userId: string): Promise<number> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'profiles',
      'weekly_work_hours',
      [{ column: 'id', value: userId }],
      true
    );
    if (error) return 35;
    const hours = data?.weekly_work_hours;
    return typeof hours === 'number' && hours > 0 ? hours : 35;
  }

  static async updateWeeklyWorkHours(userId: string, hours: number): Promise<void> {
    const { error } = await DirectSupabaseService.directUpdate(
      'profiles',
      { weekly_work_hours: hours, updated_at: new Date().toISOString() },
      [{ column: 'id', value: userId }]
    );
    if (error) throw new Error(error.message || 'Erreur mise à jour heures hebdo');
  }

  /**
   * Stats pour l'en-tête : nb tâches actives, durée/semaine, % couverture.
   * Utilise la semaine courante et le mois courant pour filtrer saisonnier.
   */
  static calculateWeeklyStats(
    templates: RecurringTaskTemplate[],
    weeklyWorkHours: number
  ): WeeklyStats {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDayOfWeek = now.getDay();

    const activeTemplates = templates.filter((t) => t.is_active);

    let totalMinutesPerWeek = 0;
    for (const t of activeTemplates) {
      const inSeason = t.is_permanent || isMonthInRange(currentMonth, t.start_month, t.end_month);
      if (!inSeason) continue;
      const occurrencesThisWeek = getOccurrencesThisWeek(t, currentDayOfWeek);
      totalMinutesPerWeek += t.duration_minutes * occurrencesThisWeek;
    }

    const weekMinutes = Math.max(1, weeklyWorkHours * 60);
    const coveragePercent = Math.min(100, Math.round((totalMinutesPerWeek / weekMinutes) * 100));

    return {
      count: activeTemplates.length,
      totalMinutesPerWeek,
      coveragePercent,
    };
  }
}

function isMonthInRange(month: number, start: number, end: number): boolean {
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
}

function getOccurrencesThisWeek(template: RecurringTaskTemplate, todayDayOfWeek: number): number {
  switch (template.frequency_type) {
    case 'weekly':
      return 1;
    case 'biweekly':
      return 0.5;
    case 'monthly':
      return 1 / 4;
    default:
      return 1;
  }
}

export function formatRecurrence(template: RecurringTaskTemplate): string {
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const day = dayNames[template.day_of_week] ?? '?';
  let freq: string;
  switch (template.frequency_type) {
    case 'weekly':
      freq = `Tous les ${day.toLowerCase()}s`;
      break;
    case 'biweekly':
      freq = `Un ${day.toLowerCase()} sur deux`;
      break;
    case 'monthly':
      freq = `1 ${day.toLowerCase()} par mois`;
      break;
    default:
      freq = day;
  }
  if (!template.is_permanent && template.start_month !== undefined && template.end_month !== undefined) {
    const monthNames = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const start = monthNames[template.start_month] ?? '';
    const end = monthNames[template.end_month] ?? '';
    freq += ` (${start}–${end})`;
  }
  return freq;
}
