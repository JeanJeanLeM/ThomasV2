import type { RecurringTaskTemplate } from '../types';
import { DirectSupabaseService } from './DirectSupabaseService';
import { RecurringTaskService } from './RecurringTaskService';
import { TaskService } from './TaskService';

const HORIZON_MONTHS = 6;

/** Retourne YYYY-MM-DD en date locale (évite décalage UTC de toISOString). */
function toLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Vérifie si un mois (1-12) est dans la période saisonnière du template.
 * Gère le cycle Nov→Fév (start_month=11, end_month=2).
 */
function isMonthInSeason(month: number, t: RecurringTaskTemplate): boolean {
  if (t.is_permanent) return true;
  const start = t.start_month;
  const end = t.end_month;
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
}

/**
 * Retourne le premier jour du mois qui correspond à day_of_week (0=dim, 6=sam),
 * ou null si aucun dans ce mois.
 */
function firstOccurrenceOfDayInMonth(year: number, month: number, dayOfWeek: number): Date | null {
  const first = new Date(year, month - 1, 1);
  const firstDow = first.getDay();
  let diff = dayOfWeek - firstDow;
  if (diff < 0) diff += 7;
  const d = new Date(year, month - 1, 1 + diff);
  if (d.getMonth() !== month - 1) return null;
  return d;
}

/**
 * Toutes les dates d'un mois qui correspondent à day_of_week.
 */
function allOccurrencesOfDayInMonth(year: number, month: number, dayOfWeek: number): Date[] {
  const out: Date[] = [];
  const first = firstOccurrenceOfDayInMonth(year, month, dayOfWeek);
  if (!first) return out;
  const d = new Date(first);
  while (d.getMonth() === month - 1) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

/**
 * Calcule les dates d'occurrence d'un template entre fromDate et toDate (inclus),
 * en respectant saison (start_month/end_month) et fréquence (weekly / biweekly / monthly).
 */
export function getOccurrenceDates(
  template: RecurringTaskTemplate,
  fromDate: Date,
  toDate: Date
): Date[] {
  const results: Date[] = [];
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  const dayOfWeek = template.day_of_week;

  if (template.frequency_type === 'weekly') {
    const cur = new Date(from);
    const startTime = from.getTime();
    const endTime = to.getTime();
    while (cur.getTime() <= endTime) {
      if (cur.getTime() >= startTime) {
        const month = cur.getMonth() + 1;
        if (isMonthInSeason(month, template) && cur.getDay() === dayOfWeek) {
          results.push(new Date(cur));
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    return results;
  }

  if (template.frequency_type === 'biweekly') {
    const cur = new Date(from);
    const endTime = to.getTime();
    let reference: Date | null = null;
    while (cur.getTime() <= endTime) {
      const month = cur.getMonth() + 1;
      if (isMonthInSeason(month, template) && cur.getDay() === dayOfWeek) {
        if (reference === null) reference = new Date(cur);
        const daysSinceRef = Math.round((cur.getTime() - reference.getTime()) / (24 * 60 * 60 * 1000));
        if (daysSinceRef % 14 === 0) results.push(new Date(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
    return results;
  }

  if (template.frequency_type === 'monthly') {
    const yearFrom = from.getFullYear();
    const monthFrom = from.getMonth() + 1;
    const yearTo = to.getFullYear();
    const monthTo = to.getMonth() + 1;
    for (let y = yearFrom; y <= yearTo; y++) {
      const mStart = y === yearFrom ? monthFrom : 1;
      const mEnd = y === yearTo ? monthTo : 12;
      for (let m = mStart; m <= mEnd; m++) {
        if (!isMonthInSeason(m, template)) continue;
        const occ = firstOccurrenceOfDayInMonth(y, m, dayOfWeek);
        if (occ) {
          const t = occ.getTime();
          if (t >= from.getTime() && t <= to.getTime()) results.push(occ);
        }
      }
    }
    return results;
  }

  return results;
}

/**
 * Récupère les dates (YYYY-MM-DD) des tâches déjà générées pour un template dans la plage.
 */
export async function getExistingGeneratedDates(
  templateId: string,
  fromDate: Date,
  toDate: Date
): Promise<Set<string>> {
  const fromStr = toLocalYMD(fromDate);
  const toStr = toLocalYMD(toDate);
  const { data, error } = await DirectSupabaseService.directSelect(
    'tasks',
    'date',
    [
      { column: 'recurring_template_id', value: templateId },
      { column: 'date', value: fromStr, operator: 'gte' },
      { column: 'date', value: toStr, operator: 'lte' },
    ]
  );
  if (error) return new Set();
  const rows = Array.isArray(data) ? data : [];
  return new Set(rows.map((r: { date: string }) => r.date));
}

/**
 * Crée une tâche en base à partir d'un template et d'une date.
 */
async function createTaskFromTemplate(
  template: RecurringTaskTemplate,
  date: Date,
  farmId: number,
  userId: string
): Promise<void> {
  const dateStr = toLocalYMD(date);
  await TaskService.createTask({
    farm_id: farmId,
    user_id: userId,
    title: template.name,
    description: template.notes ?? null,
    category: template.category,
    type: 'tache',
    date: dateStr,
    time: null,
    duration_minutes: template.duration_minutes,
    status: 'en_attente',
    priority: 'moyenne',
    plot_ids: template.plot_ids ?? [],
    material_ids: template.material_ids ?? [],
    surface_unit_ids: template.surface_unit_ids ?? [],
    notes: template.notes ?? null,
    number_of_people: template.number_of_people ?? 1,
    action: template.action ?? null,
    recurring_template_id: template.id,
  });
}

/**
 * Assure que les tâches issues des templates récurrents sont générées sur les 6 prochains mois.
 * Ne crée pas de doublon (une tâche par template par date).
 * À appeler au chargement de l'écran Tâches ou après modification des templates.
 */
export async function ensureTasksForHorizon(
  farmId: number,
  userId: string,
  horizonMonths: number = HORIZON_MONTHS
): Promise<{ created: number; skipped: number }> {
  const templates = await RecurringTaskService.getByFarm(farmId);
  const activeTemplates = templates.filter((t) => t.is_active);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setMonth(to.getMonth() + horizonMonths);
  to.setHours(23, 59, 59, 999);

  let created = 0;
  let skipped = 0;

  for (const template of activeTemplates) {
    const dates = getOccurrenceDates(template, from, to);
    const existing = await getExistingGeneratedDates(template.id, from, to);
    for (const d of dates) {
      const dateStr = toLocalYMD(d);
      if (existing.has(dateStr)) {
        skipped++;
        continue;
      }
      try {
        await createTaskFromTemplate(template, d, farmId, userId);
        created++;
        existing.add(dateStr);
      } catch (err) {
        console.warn('[RecurringTaskGeneration] Failed to create task for', template.name, dateStr, err);
      }
    }
  }

  return { created, skipped };
}
