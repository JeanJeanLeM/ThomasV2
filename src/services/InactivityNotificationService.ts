import { supabase } from '../utils/supabase';

export interface InactivityConfig {
  id: string;
  user_id: string;
  farm_id: number; // integer FK
  is_active: boolean;
  /** Jours où des tâches sont attendues (0=Dim, 1=Lun … 6=Sam) */
  active_days: number[];
  /** Heure d'envoi le lendemain matin, format "HH:MM:SS" (UTC) */
  send_time: string;
  created_at: string;
  updated_at: string;
}

export type InactivityConfigUpdate = Pick<
  InactivityConfig,
  'is_active' | 'active_days' | 'send_time'
>;

export const InactivityNotificationService = {
  /** Récupère la config d'inactivité pour une ferme (null si inexistante). */
  async getConfig(farmId: number): Promise<InactivityConfig | null> {
    const { data, error } = await supabase
      .from('inactivity_notification_config')
      .select('*')
      .eq('farm_id', farmId)
      .maybeSingle();

    if (error) throw error;
    return data as InactivityConfig | null;
  },

  /** Crée ou met à jour la config (upsert sur user_id + farm_id). */
  async saveConfig(
    farmId: number,
    config: InactivityConfigUpdate,
  ): Promise<InactivityConfig> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('inactivity_notification_config')
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
    return data as InactivityConfig;
  },

  /** Active ou désactive sans modifier les autres paramètres. */
  async toggle(farmId: number, isActive: boolean): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { error } = await supabase
      .from('inactivity_notification_config')
      .update({ is_active: isActive })
      .eq('farm_id', farmId)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /** Formate les jours actifs en label court (ex: "Lun–Sam"). */
  formatActiveDays(days: number[]): string {
    const labels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    if (!days || days.length === 0) return 'Aucun jour';
    if (days.length === 7) return 'Tous les jours';
    const sorted = [...days].sort((a, b) => a - b);
    if (
      sorted.length === 5 &&
      sorted.every((d, i) => d === [1, 2, 3, 4, 5][i])
    ) return 'Lun–Ven';
    if (
      sorted.length === 6 &&
      sorted.every((d, i) => d === [1, 2, 3, 4, 5, 6][i])
    ) return 'Lun–Sam';
    return sorted.map(d => labels[d]).join(', ');
  },
};
