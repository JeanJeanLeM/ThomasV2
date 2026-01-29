/**
 * Service de gestion des préférences utilisateur pour les produits phytosanitaires
 * 
 * Fonctionnalités :
 * - Gestion de la liste personnalisée de produits
 * - Ajout/suppression de produits de la liste utilisateur
 * - Gestion des filtres (fonction, filière)
 * - Récupération des produits de l'utilisateur
 */

import { supabase } from '../utils/supabase';
import type { UserPhytosanitaryPreferences, PhytosanitaryProduct } from '../types';
import { PhytosanitaryProductService } from './PhytosanitaryProductService';

export class UserPhytosanitaryPreferencesService {
  
  /**
   * Récupère les préférences de l'utilisateur pour une ferme
   */
  static async getUserPreferences(
    userId: string,
    farmId: number
  ): Promise<UserPhytosanitaryPreferences | null> {
    try {
      console.log('[PhytoPrefs] Récupération préférences:', { userId, farmId });
      
      const { data, error } = await supabase
        .from('user_phytosanitary_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('farm_id', farmId)
        .single();
      
      if (error) {
        // Si aucune préférence n'existe, retourner null (pas une erreur)
        if (error.code === 'PGRST116') {
          console.log('[PhytoPrefs] Aucune préférence trouvée');
          return null;
        }
        // Erreur 406 (Not Acceptable) peut être due à RLS - ne pas logger comme erreur
        if (error.code === '406' || error.message?.includes('406')) {
          console.log('[PhytoPrefs] Aucune préférence trouvée (RLS)');
          return null;
        }
        console.error('[PhytoPrefs] Erreur getUserPreferences:', error);
        return null;
      }
      
      console.log('[PhytoPrefs] Préférences trouvées:', data.product_amms?.length || 0, 'produits');
      return data;
      
    } catch (error) {
      console.error('[PhytoPrefs] Erreur getUserPreferences:', error);
      return null;
    }
  }
  
  /**
   * Crée ou met à jour les préférences de l'utilisateur
   */
  static async upsertPreferences(
    userId: string,
    farmId: number,
    preferences: Partial<UserPhytosanitaryPreferences>
  ): Promise<UserPhytosanitaryPreferences | null> {
    try {
      console.log('[PhytoPrefs] Upsert préférences:', { userId, farmId });
      
      const data: Partial<UserPhytosanitaryPreferences> = {
        user_id: userId,
        farm_id: farmId,
        product_amms: preferences.product_amms || [],
        culture_filter: preferences.culture_filter || [],
        function_filter: preferences.function_filter || [],
        pest_filter: preferences.pest_filter || [],
      };
      
      const { data: result, error } = await supabase
        .from('user_phytosanitary_preferences')
        .upsert([data], { onConflict: 'user_id,farm_id' })
        .select()
        .single();
      
      if (error) {
        console.error('[PhytoPrefs] Erreur upsertPreferences:', error);
        throw error;
      }
      
      console.log('[PhytoPrefs] Préférences sauvegardées');
      return result;
      
    } catch (error) {
      console.error('[PhytoPrefs] Erreur upsertPreferences:', error);
      return null;
    }
  }
  
  /**
   * Ajoute un produit à la liste de l'utilisateur
   */
  static async addProductToUserList(
    userId: string,
    farmId: number,
    amm: string
  ): Promise<boolean> {
    try {
      console.log('[PhytoPrefs] Ajout produit à la liste:', { userId, farmId, amm });
      
      // Récupérer les préférences existantes
      let preferences = await this.getUserPreferences(userId, farmId);
      
      if (!preferences) {
        // Créer de nouvelles préférences
        preferences = await this.upsertPreferences(userId, farmId, {
          product_amms: [amm],
          culture_filter: [],
          function_filter: []
        });
        return preferences !== null;
      }
      
      // Vérifier si le produit est déjà dans la liste
      if (preferences.product_amms.includes(amm)) {
        console.log('[PhytoPrefs] Produit déjà dans la liste');
        return true;
      }
      
      // Ajouter le produit à la liste
      const updatedAmms = [...preferences.product_amms, amm];
      
      const result = await this.upsertPreferences(userId, farmId, {
        ...preferences,
        product_amms: updatedAmms
      });
      
      return result !== null;
      
    } catch (error) {
      console.error('[PhytoPrefs] Erreur addProductToUserList:', error);
      return false;
    }
  }
  
  /**
   * Retire un produit de la liste de l'utilisateur
   */
  static async removeProductFromUserList(
    userId: string,
    farmId: number,
    amm: string
  ): Promise<boolean> {
    try {
      console.log('[PhytoPrefs] Retrait produit de la liste:', { userId, farmId, amm });
      
      const preferences = await this.getUserPreferences(userId, farmId);
      
      if (!preferences) {
        console.log('[PhytoPrefs] Aucune préférence à modifier');
        return false;
      }
      
      // Retirer le produit de la liste
      const updatedAmms = preferences.product_amms.filter(a => a !== amm);
      
      const result = await this.upsertPreferences(userId, farmId, {
        ...preferences,
        product_amms: updatedAmms
      });
      
      return result !== null;
      
    } catch (error) {
      console.error('[PhytoPrefs] Erreur removeProductFromUserList:', error);
      return false;
    }
  }
  
  /**
   * Récupère les produits de l'utilisateur (avec détails)
   */
  static async getUserProducts(
    userId: string,
    farmId: number
  ): Promise<PhytosanitaryProduct[]> {
    try {
      console.log('[PhytoPrefs] Récupération produits utilisateur:', { userId, farmId });
      
      const preferences = await this.getUserPreferences(userId, farmId);
      
      if (!preferences || preferences.product_amms.length === 0) {
        console.log('[PhytoPrefs] Aucun produit dans la liste');
        return [];
      }
      
      // Récupérer les détails des produits
      const { data, error } = await supabase
        .from('phytosanitary_products')
        .select('*')
        .in('amm', preferences.product_amms);
      
      if (error) {
        console.error('[PhytoPrefs] Erreur getUserProducts:', error);
        return [];
      }
      
      console.log(`[PhytoPrefs] ${data?.length || 0} produits récupérés`);
      return data || [];
      
    } catch (error) {
      console.error('[PhytoPrefs] Erreur getUserProducts:', error);
      return [];
    }
  }
  
  /**
   * Met à jour les filtres de l'utilisateur
   */
  static async updateFilters(
    userId: string,
    farmId: number,
    filters: {
      culture_filter?: string[];
      function_filter?: string[];
      pest_filter?: string[];
    }
  ): Promise<boolean> {
    try {
      console.log('[PhytoPrefs] Mise à jour filtres:', { userId, farmId, filters });
      
      let preferences = await this.getUserPreferences(userId, farmId);
      
      if (!preferences) {
        // Créer de nouvelles préférences avec les filtres
        preferences = await this.upsertPreferences(userId, farmId, {
          product_amms: [],
          culture_filter: filters.culture_filter || [],
          function_filter: filters.function_filter || [],
          pest_filter: filters.pest_filter || []
        });
        return preferences !== null;
      }
      
      // Mettre à jour les filtres
      const result = await this.upsertPreferences(userId, farmId, {
        ...preferences,
        culture_filter: filters.culture_filter !== undefined 
          ? filters.culture_filter 
          : preferences.culture_filter,
        function_filter: filters.function_filter !== undefined 
          ? filters.function_filter 
          : preferences.function_filter,
        pest_filter: filters.pest_filter !== undefined 
          ? filters.pest_filter 
          : (preferences.pest_filter || [])
      });
      
      return result !== null;
      
    } catch (error) {
      console.error('[PhytoPrefs] Erreur updateFilters:', error);
      return false;
    }
  }
  
  /**
   * Réinitialise les préférences de l'utilisateur
   */
  static async resetPreferences(
    userId: string,
    farmId: number
  ): Promise<boolean> {
    try {
      console.log('[PhytoPrefs] Réinitialisation préférences:', { userId, farmId });
      
      const { error } = await supabase
        .from('user_phytosanitary_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('farm_id', farmId);
      
      if (error) {
        console.error('[PhytoPrefs] Erreur resetPreferences:', error);
        return false;
      }
      
      console.log('[PhytoPrefs] Préférences réinitialisées');
      return true;
      
    } catch (error) {
      console.error('[PhytoPrefs] Erreur resetPreferences:', error);
      return false;
    }
  }
  
  /**
   * Compte le nombre de produits dans la liste de l'utilisateur
   */
  static async getUserProductCount(
    userId: string,
    farmId: number
  ): Promise<number> {
    try {
      const preferences = await this.getUserPreferences(userId, farmId);
      return preferences?.product_amms?.length || 0;
    } catch (error) {
      console.error('[PhytoPrefs] Erreur getUserProductCount:', error);
      return 0;
    }
  }
  
  /**
   * Vérifie si un produit est dans la liste de l'utilisateur
   */
  static async isProductInUserList(
    userId: string,
    farmId: number,
    amm: string
  ): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId, farmId);
      return preferences?.product_amms?.includes(amm) || false;
    } catch (error) {
      console.error('[PhytoPrefs] Erreur isProductInUserList:', error);
      return false;
    }
  }
}

export const userPhytosanitaryPreferencesService = UserPhytosanitaryPreferencesService;
