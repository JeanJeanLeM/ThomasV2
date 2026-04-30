import { supabase } from '../utils/supabase';

export interface ActivityStreakConfig {
  id: string;
  user_id: string;
  farm_id: number;
  is_active: boolean;
  active_days: number[];
  safe_pass_enabled: boolean;
  safe_pass_cap: number;
  vacation_enabled: boolean;
  vacation_start: string | null;
  vacation_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityStreakState {
  user_id: string;
  farm_id: number;
  is_active: boolean;
  current_streak: number;
  best_streak: number;
  safe_pass_balance: number;
  safe_pass_cap: number;
  last_success_date: string | null;
  last_evaluated_date: string | null;
  vacation_enabled: boolean;
  vacation_start: string | null;
  vacation_end: string | null;
  active_days: number[];
}

export interface ActivityStreakConfigUpdate {
  is_active?: boolean;
  active_days?: number[];
  safe_pass_enabled?: boolean;
  safe_pass_cap?: number;
  vacation_enabled?: boolean;
  vacation_start?: string | null;
  vacation_end?: string | null;
}

const DEFAULT_ACTIVE_DAYS = [1, 2, 3, 4, 5, 6];
const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const ActivityStreakService = {
  defaultActiveDays: DEFAULT_ACTIVE_DAYS,

  async getConfig(farmId: number): Promise<ActivityStreakConfig | null> {
    const { data, error } = await supabase
      .from('activity_streak_config')
      .select('*')
      .eq('farm_id', farmId)
      .maybeSingle();

    if (error) throw error;
    return data as ActivityStreakConfig | null;
  },

  async saveConfig(
    farmId: number,
    config: ActivityStreakConfigUpdate,
  ): Promise<ActivityStreakConfig> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('activity_streak_config')
      .upsert(
        {
          user_id: user.id,
          farm_id: farmId,
          ...config,
        },
        { onConflict: 'user_id,farm_id' },
      )
      .select()
      .single();

    if (error) throw error;
    return data as ActivityStreakConfig;
  },

  async refreshAndGetState(farmId: number): Promise<ActivityStreakState> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase.rpc('refresh_activity_streak', {
      p_user_id: user.id,
      p_farm_id: farmId,
    });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row as ActivityStreakState;
  },

  async setVacationMode(
    farmId: number,
    startDate: string,
    endDate: string,
  ): Promise<ActivityStreakConfig> {
    return this.saveConfig(farmId, {
      vacation_enabled: true,
      vacation_start: startDate,
      vacation_end: endDate,
    });
  },

  async setVacationWeeks(farmId: number, weeks: number): Promise<ActivityStreakConfig> {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + weeks * 7 - 1);
    return this.setVacationMode(farmId, toIsoDate(start), toIsoDate(end));
  },

  async disableVacationMode(farmId: number): Promise<ActivityStreakConfig> {
    return this.saveConfig(farmId, {
      vacation_enabled: false,
      vacation_start: null,
      vacation_end: null,
    });
  },

  isVacationActive(stateOrConfig?: {
    vacation_enabled?: boolean;
    vacation_start?: string | null | undefined;
    vacation_end?: string | null | undefined;
  } | null): boolean {
    if (!stateOrConfig?.vacation_enabled || !stateOrConfig.vacation_start || !stateOrConfig.vacation_end) {
      return false;
    }

    const today = toIsoDate(new Date());
    return today >= stateOrConfig.vacation_start && today <= stateOrConfig.vacation_end;
  },

  formatActiveDays(days: number[]): string {
    if (!days || days.length === 0) return 'Aucun jour';
    const sorted = [...days].sort((a, b) => a - b);
    if (sorted.length === 7) return 'Tous les jours';
    if (sorted.length === 5 && sorted.every((d, i) => d === [1, 2, 3, 4, 5][i])) return 'Lun-Ven';
    if (sorted.length === 6 && sorted.every((d, i) => d === [1, 2, 3, 4, 5, 6][i])) return 'Lun-Sam';
    return sorted.map(day => DAY_LABELS[day]).join(', ');
  },

  formatVacationRange(start?: string | null, end?: string | null): string {
    if (!start || !end) return 'Aucune période';
    const format = (value: string) => {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    };
    return `${format(start)} au ${format(end)}`;
  },
};
