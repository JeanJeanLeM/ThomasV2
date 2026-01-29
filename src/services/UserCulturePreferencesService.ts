import { supabase } from '../utils/supabase';
import type { UserCulturePreferences, CultureProfileType, CultureProfile } from '../types';

export class UserCulturePreferencesService {
  /**
   * Récupère les préférences de cultures d'un utilisateur pour une ferme
   */
  async getUserPreferences(userId: string, farmId: number): Promise<UserCulturePreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_culture_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('farm_id', farmId)
        .maybeSingle(); // Utiliser maybeSingle au lieu de single pour éviter les erreurs 406

      if (error) {
        console.error('❌ Erreur Supabase lors de la récupération des préférences:', error);
        throw error;
      }

      if (!data) {
        // Aucune préférence trouvée
        console.log('📋 Aucune préférence utilisateur trouvée pour:', { userId, farmId });
        return null;
      }

      return this.mapFromDB(data);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des préférences:', error);
      throw error;
    }
  }

  /**
   * Définit un profil prédéfini pour un utilisateur
   * Charge automatiquement les cultures du profil
   */
  async setUserProfile(
    userId: string,
    farmId: number,
    profileType: CultureProfileType
  ): Promise<UserCulturePreferences> {
    try {
      // Obtenir les IDs de cultures du profil via la fonction SQL
      const { data: profileCultures, error: profileError } = await supabase
        .rpc('get_profile_culture_ids', { profile: profileType });

      if (profileError) {
        console.error('Erreur lors de la récupération des cultures du profil:', profileError);
        throw profileError;
      }

      const cultureIds = profileCultures || [];

      // Vérifier si des préférences existent déjà
      const existing = await this.getUserPreferences(userId, farmId);

      if (existing) {
        // Mettre à jour
        const { data, error } = await supabase
          .from('user_culture_preferences')
          .update({
            profile_type: profileType,
            culture_ids: cultureIds,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('farm_id', farmId)
          .select()
          .single();

        if (error) throw error;
        return this.mapFromDB(data);
      } else {
        // Créer
        const { data, error } = await supabase
          .from('user_culture_preferences')
          .insert({
            user_id: userId,
            farm_id: farmId,
            profile_type: profileType,
            culture_ids: cultureIds,
          })
          .select()
          .single();

        if (error) throw error;
        return this.mapFromDB(data);
      }
    } catch (error) {
      console.error('Erreur lors de la définition du profil:', error);
      throw new Error('Impossible de définir le profil');
    }
  }

  /**
   * Met à jour la liste de cultures de l'utilisateur
   */
  async updateCultureList(
    userId: string,
    farmId: number,
    cultureIds: number[]
  ): Promise<UserCulturePreferences> {
    try {
      const existing = await this.getUserPreferences(userId, farmId);

      if (existing) {
        // Mettre à jour
        const { data, error } = await supabase
          .from('user_culture_preferences')
          .update({
            culture_ids: cultureIds,
            profile_type: cultureIds.length > 0 ? existing.profileType : 'custom',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('farm_id', farmId)
          .select()
          .single();

        if (error) throw error;
        return this.mapFromDB(data);
      } else {
        // Créer avec profil custom
        const { data, error } = await supabase
          .from('user_culture_preferences')
          .insert({
            user_id: userId,
            farm_id: farmId,
            profile_type: 'custom',
            culture_ids: cultureIds,
          })
          .select()
          .single();

        if (error) throw error;
        return this.mapFromDB(data);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la liste:', error);
      throw new Error('Impossible de mettre à jour la liste de cultures');
    }
  }

  /**
   * Ajoute une culture à la liste de l'utilisateur
   */
  async addCultureToUserList(
    userId: string,
    farmId: number,
    cultureId: number
  ): Promise<UserCulturePreferences> {
    try {
      const existing = await this.getUserPreferences(userId, farmId);
      const currentIds = existing?.cultureIds || [];

      // Vérifier si la culture n'est pas déjà dans la liste
      if (currentIds.includes(cultureId)) {
        return existing!;
      }

      const newIds = [...currentIds, cultureId];
      return await this.updateCultureList(userId, farmId, newIds);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la culture:', error);
      throw new Error('Impossible d\'ajouter la culture à la liste');
    }
  }

  /**
   * Supprime une culture de la liste de l'utilisateur
   */
  async removeCultureFromUserList(
    userId: string,
    farmId: number,
    cultureId: number
  ): Promise<UserCulturePreferences> {
    try {
      const existing = await this.getUserPreferences(userId, farmId);
      if (!existing) {
        throw new Error('Aucune préférence trouvée');
      }

      const newIds = existing.cultureIds.filter(id => id !== cultureId);
      return await this.updateCultureList(userId, farmId, newIds);
    } catch (error) {
      console.error('Erreur lors de la suppression de la culture:', error);
      throw new Error('Impossible de supprimer la culture de la liste');
    }
  }

  /**
   * Obtient les cultures d'un profil prédéfini
   * Utilise la fonction SQL pour obtenir les IDs
   */
  async getProfileCultures(profileType: CultureProfileType): Promise<number[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_profile_culture_ids', { profile: profileType });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des cultures du profil:', error);
      throw new Error('Impossible de récupérer les cultures du profil');
    }
  }

  /**
   * Obtient tous les profils prédéfinis avec leurs métadonnées
   */
  getAvailableProfiles(): CultureProfile[] {
    return [
      {
        type: 'maraichage',
        label: 'Maraîchage',
        description: 'Légumes fruits, feuilles, racines et aromates',
        cultureIds: [], // Sera rempli dynamiquement
      },
      {
        type: 'pepiniere',
        label: 'Pépinière',
        description: 'Fleurs, aromates et jeunes plants',
        cultureIds: [],
      },
      {
        type: 'floriculture',
        label: 'Floriculture',
        description: 'Cultures de fleurs ornementales',
        cultureIds: [],
      },
      {
        type: 'arboriculture',
        label: 'Arboriculture',
        description: 'Arbres fruitiers et fruits',
        cultureIds: [],
      },
      {
        type: 'grande_culture',
        label: 'Grande culture',
        description: 'Céréales et légumineuses',
        cultureIds: [],
      },
      {
        type: 'tropical',
        label: 'Tropical',
        description: 'Fruits et cultures tropicales',
        cultureIds: [],
      },
    ];
  }

  /**
   * Supprime les préférences d'un utilisateur pour une ferme
   */
  async deleteUserPreferences(userId: string, farmId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_culture_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('farm_id', farmId);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de la suppression des préférences:', error);
      throw new Error('Impossible de supprimer les préférences');
    }
  }

  /**
   * Mapping depuis la base de données
   */
  private mapFromDB(data: any): UserCulturePreferences {
    return {
      id: data.id,
      userId: data.user_id,
      farmId: data.farm_id,
      profileType: data.profile_type,
      cultureIds: data.culture_ids || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const userCulturePreferencesService = new UserCulturePreferencesService();
