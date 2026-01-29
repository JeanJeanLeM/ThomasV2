import { supabase } from '../utils/supabase';
import type { Culture, CultureVariety, CultureType, CultureCategory } from '../types';
import { userCulturePreferencesService } from './UserCulturePreferencesService';

export class CultureService {
  // Récupérer toutes les cultures (globales + personnalisées de la ferme)
  async getCultures(farmId?: number): Promise<Culture[]> {
    try {
      let query = supabase
        .from('cultures')
        .select('*')
        .order('name', { ascending: true });

      // Si farmId fourni, inclure les cultures personnalisées de cette ferme
      if (farmId) {
        query = query.or(`farm_id.is.null,farm_id.eq.${farmId}`);
      } else {
        // Sinon, seulement les cultures globales
        query = query.is('farm_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map((item) => this.mapCultureFromDB(item)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des cultures:', error);
      throw new Error('Impossible de récupérer les cultures');
    }
  }

  // Récupérer les cultures par type
  async getCulturesByType(type: CultureType, farmId?: number): Promise<Culture[]> {
    try {
      let query = supabase
        .from('cultures')
        .select('*')
        .eq('type', type)
        .order('name', { ascending: true });

      if (farmId) {
        query = query.or(`farm_id.is.null,farm_id.eq.${farmId}`);
      } else {
        query = query.is('farm_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map((item) => this.mapCultureFromDB(item)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des cultures par type:', error);
      throw new Error('Impossible de récupérer les cultures');
    }
  }

  // Créer une nouvelle culture personnalisée
  async createCulture(culture: Omit<Culture, 'id' | 'createdAt' | 'updatedAt'>): Promise<Culture> {
    try {
      const { data, error } = await supabase
        .from('cultures')
        .insert([{
          name: culture.name,
          type: culture.type,
          category: culture.category,
          description: culture.description,
          color: culture.color,
          is_custom: culture.isCustom,
          farm_id: culture.farmId,
        }])
        .select()
        .single();

      if (error) throw error;

      return this.mapCultureFromDB(data);
    } catch (error) {
      console.error('Erreur lors de la création de la culture:', error);
      throw new Error('Impossible de créer la culture');
    }
  }

  // Récupérer les variétés d'une culture
  async getCultureVarieties(cultureId: number, farmId?: number): Promise<CultureVariety[]> {
    try {
      let query = supabase
        .from('culture_varieties')
        .select(`
          *,
          culture:cultures(*)
        `)
        .eq('culture_id', cultureId)
        .order('name', { ascending: true });

      if (farmId) {
        query = query.or(`farm_id.is.null,farm_id.eq.${farmId}`);
      } else {
        query = query.is('farm_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map((item) => this.mapVarietyFromDB(item)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des variétés:', error);
      throw new Error('Impossible de récupérer les variétés');
    }
  }

  // Créer une nouvelle variété
  async createVariety(variety: Omit<CultureVariety, 'id' | 'createdAt' | 'updatedAt' | 'culture'>): Promise<CultureVariety> {
    try {
      const { data, error } = await supabase
        .from('culture_varieties')
        .insert([{
          culture_id: variety.cultureId,
          name: variety.name,
          description: variety.description,
          typical_weight_kg: variety.typicalWeightKg,
          typical_volume_l: variety.typicalVolumeL,
          farm_id: variety.farmId,
        }])
        .select(`
          *,
          culture:cultures(*)
        `)
        .single();

      if (error) throw error;

      return this.mapVarietyFromDB(data);
    } catch (error) {
      console.error('Erreur lors de la création de la variété:', error);
      throw new Error('Impossible de créer la variété');
    }
  }

  // Rechercher des cultures
  async searchCultures(query: string, farmId?: number): Promise<Culture[]> {
    try {
      let supabaseQuery = supabase
        .from('cultures')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('name', { ascending: true });

      if (farmId) {
        supabaseQuery = supabaseQuery.or(`farm_id.is.null,farm_id.eq.${farmId}`);
      } else {
        supabaseQuery = supabaseQuery.is('farm_id', null);
      }

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      return data?.map((item) => this.mapCultureFromDB(item)) || [];
    } catch (error) {
      console.error('Erreur lors de la recherche de cultures:', error);
      throw new Error('Impossible de rechercher les cultures');
    }
  }

  /**
   * Récupère les cultures selon les préférences utilisateur
   * FILTRAGE RESTRICTIF : retourne uniquement les cultures de la liste utilisateur
   * En cas d'erreur ou si pas de préférences : retourne toutes les cultures
   */
  async getCulturesForUser(userId: string, farmId: number): Promise<Culture[]> {
    try {
      // Récupérer toutes les cultures disponibles
      const allCultures = await this.getCultures(farmId);

      // Essayer de récupérer les préférences utilisateur
      let preferences = null;
      try {
        preferences = await userCulturePreferencesService.getUserPreferences(userId, farmId);
      } catch (prefError) {
        // Erreur lors du chargement des préférences (ex: 406, RLS, etc.)
        console.warn('⚠️ Impossible de charger les préférences utilisateur, affichage de toutes les cultures:', prefError);
        return allCultures;
      }

      if (!preferences || preferences.cultureIds.length === 0) {
        // Pas de préférences : retourner toutes les cultures normalement
        console.log('📋 Aucune préférence utilisateur, affichage de toutes les cultures');
        return allCultures;
      }

      // FILTRAGE RESTRICTIF : retourner uniquement les cultures de la liste utilisateur
      const filteredCultures = allCultures.filter(culture => 
        preferences.cultureIds.includes(culture.id)
      );

      console.log(`✅ Filtrage restrictif: ${filteredCultures.length}/${allCultures.length} cultures affichées`);

      // Trier par nom
      return filteredCultures.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des cultures pour l\'utilisateur:', error);
      // En cas d'erreur, fallback sur toutes les cultures
      return await this.getCultures(farmId);
    }
  }

  // Utilitaires de mapping
  private mapCultureFromDB(data: any): Culture {
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      category: data.category,
      description: data.description,
      color: data.color,
      isCustom: data.is_custom,
      farmId: data.farm_id,
      filiere: data.filiere,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapVarietyFromDB(data: any): CultureVariety {
    return {
      id: data.id,
      cultureId: data.culture_id,
      name: data.name,
      description: data.description,
      typicalWeightKg: data.typical_weight_kg,
      typicalVolumeL: data.typical_volume_l,
      farmId: data.farm_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      culture: data.culture ? this.mapCultureFromDB(data.culture) : undefined,
    };
  }

  // Obtenir les types de cultures avec leurs labels
  getCultureTypes(): Array<{ value: CultureType; label: string; color: string }> {
    return [
      { value: 'legume_fruit', label: 'Légumes fruits', color: '#FF6B6B' },
      { value: 'legume_feuille', label: 'Légumes feuilles', color: '#4ECDC4' },
      { value: 'legume_racine', label: 'Légumes racines', color: '#E67E22' },
      { value: 'cereale', label: 'Céréales', color: '#F1C40F' },
      { value: 'legumineuse', label: 'Légumineuses', color: '#27AE60' },
      { value: 'aromate', label: 'Aromates', color: '#2ECC71' },
      { value: 'fruit', label: 'Fruits', color: '#E74C3C' },
      { value: 'fleur', label: 'Fleurs', color: '#E91E63' },
    ];
  }

  // Obtenir les catégories avec leurs labels
  getCultureCategories(): Array<{ value: CultureCategory; label: string }> {
    return [
      { value: 'recolte', label: 'Récolte' },
      { value: 'intrant', label: 'Intrant' },
    ];
  }
}

export const cultureService = new CultureService();

