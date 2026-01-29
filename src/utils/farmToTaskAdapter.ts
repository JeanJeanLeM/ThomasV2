import { TaskData } from '../design-system/components/cards/TaskCard';
import { FarmWithMembers } from '../services/FarmService';

/**
 * Adapte les données d'une ferme au format TaskData pour utiliser TaskCardDetailed
 */
export const farmToTaskData = (farm: FarmWithMembers): TaskData => {
  return {
    id: farm.id.toString(),
    title: farm.name,
    type: 'planned', // Les fermes sont toujours "actives"
    date: farm.created_at ? new Date(farm.created_at) : new Date(),
    category: farm.farm_type as any || 'Général',
    notes: farm.description || undefined,
    status: 'En cours', // Les fermes sont en cours d'exploitation
    // Informations spécifiques aux fermes adaptées
    crops: farm.farm_type ? [farm.farm_type] : undefined,
    plots: farm.total_area ? [`${farm.total_area} ha`] : undefined,
    people: farm.member_count || 1,
  };
};

/**
 * Données personnalisées pour les fermes (étend TaskData)
 */
export interface FarmTaskData extends TaskData {
  // Données originales de la ferme
  originalFarm: FarmWithMembers;
  // Informations spécifiques
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  photo_url?: string;
  user_role?: string;
  isActive?: boolean;
}


