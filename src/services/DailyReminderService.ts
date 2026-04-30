import { supabase } from '../utils/supabase';

export interface DailyReminderConfig {
  id: string;
  user_id: string;
  farm_id: number;
  is_active: boolean;
  /** Jours d'envoi (0=Dim, 1=Lun … 6=Sam) */
  active_days: number[];
  /** Heure d'envoi, format "HH:MM:SS" (UTC) */
  send_time: string;
  created_at: string;
  updated_at: string;
}

export type DailyReminderUpdate = Pick<
  DailyReminderConfig,
  'is_active' | 'active_days' | 'send_time'
>;

export const DailyReminderService = {
  async getConfig(farmId: number): Promise<DailyReminderConfig | null> {
    const { data, error } = await supabase
      .from('daily_reminder_config')
      .select('*')
      .eq('farm_id', farmId)
      .maybeSingle();

    if (error) throw error;
    return data as DailyReminderConfig | null;
  },

  async saveConfig(farmId: number, config: DailyReminderUpdate): Promise<DailyReminderConfig> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('daily_reminder_config')
      .upsert(
        { user_id: user.id, farm_id: farmId, ...config },
        { onConflict: 'user_id,farm_id' },
      )
      .select()
      .single();

    if (error) throw error;
    return data as DailyReminderConfig;
  },

  /** Formate les jours actifs en label lisible */
  formatActiveDays(days: number[]): string {
    const labels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    if (!days || days.length === 0) return 'Aucun jour';
    if (days.length === 7) return 'Tous les jours';
    const sorted = [...days].sort((a, b) => a - b);
    if (sorted.length === 5 && sorted.every((d, i) => d === [1, 2, 3, 4, 5][i])) return 'Lun–Ven';
    if (sorted.length === 6 && sorted.every((d, i) => d === [1, 2, 3, 4, 5, 6][i])) return 'Lun–Sam';
    return sorted.map(d => labels[d]).join(', ');
  },
};
