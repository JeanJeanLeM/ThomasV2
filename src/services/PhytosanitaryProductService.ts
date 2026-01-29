/**
 * Service de gestion des produits phytosanitaires
 * Données E-Phy - Anses (https://ephy.anses.fr/)
 * 
 * Fonctionnalités :
 * - Recherche de produits avec filtres
 * - Récupération des détails d'un produit
 * - Récupération des usages autorisés
 * - Création de produits personnalisés
 */

import { supabase } from '../utils/supabase';
import type { PhytosanitaryProduct, PhytosanitaryUsage } from '../types';

export interface PhytosanitaryProductFilters {
  functions?: string[]; // Insecticide, Fongicide, Herbicide, etc.
  cultures?: string[]; // Cultures cibles (ex: "Tomate", "Pommier")
  pests?: string[]; // Bioagresseurs (ex: "Pucerons", "Tavelure")
  cultureTypes?: string[]; // Types de cultures (maraichage, arboriculture, etc.)
  authorizationState?: string; // AUTORISE, RETIRE, etc.
  organic?: boolean; // Agriculture Biologique (vérifie si authorized_mentions contient "biologique")
}

export class PhytosanitaryProductService {
  
  /**
   * Recherche de produits avec filtres
   */
  static async searchProducts(
    query: string,
    filters: PhytosanitaryProductFilters = {},
    farmId?: number
  ): Promise<PhytosanitaryProduct[]> {
    try {
      console.log('[PhytoService] Recherche produits:', { query, filters, farmId });
      
      let queryBuilder = supabase
        .from('phytosanitary_products')
        .select('*')
        .order('name');
      
      // Filtre par texte de recherche
      if (query && query.trim().length > 0) {
        // Recherche dans le nom et les substances actives
        queryBuilder = queryBuilder.or(
          `name.ilike.%${query}%,secondary_names.ilike.%${query}%,active_substances.ilike.%${query}%`
        );
      }
      
      // Filtre par fonction (Insecticide, Fongicide, etc.)
      if (filters.functions && filters.functions.length > 0) {
        const functionFilters = filters.functions
          .map(f => `functions.ilike.%${f}%`)
          .join(',');
        queryBuilder = queryBuilder.or(functionFilters);
      }
      
      // Filtre par état d'autorisation
      if (filters.authorizationState) {
        queryBuilder = queryBuilder.eq('authorization_state', filters.authorizationState);
      }
      
      // Inclure les produits personnalisés de la ferme
      if (farmId) {
        queryBuilder = queryBuilder.or(`is_custom.eq.false,and(is_custom.eq.true,farm_id.eq.${farmId})`);
      } else {
        queryBuilder = queryBuilder.eq('is_custom', false);
      }
      
      // Limiter les résultats seulement si recherche textuelle (pour éviter trop de résultats)
      // Si pas de recherche textuelle mais des filtres, on peut charger plus de produits
      if (query && query.trim().length > 0) {
        queryBuilder = queryBuilder.limit(100);
      } else {
        // Pour les filtres uniquement, on peut charger jusqu'à 1000 produits
        queryBuilder = queryBuilder.limit(1000);
      }
      
      const { data, error } = await queryBuilder;
      
      if (error) {
        console.error('[PhytoService] Erreur recherche:', error);
        throw error;
      }
      
      let products = data || [];
      
      // Filtre Agriculture Biologique (appliqué après récupération pour gérer les null)
      if (filters.organic === true) {
        products = products.filter(p => {
          if (!p.authorized_mentions) return false;
          return p.authorized_mentions.toLowerCase().includes('biologique');
        });
      }
      
      // Filtre par culture ou ravageur (via les usages)
      if ((filters.cultures && filters.cultures.length > 0) || (filters.pests && filters.pests.length > 0)) {
        // Récupérer les AMM des produits qui ont des usages correspondants
        let usageQuery = supabase
          .from('phytosanitary_usages')
          .select('amm');
        
        const usageFilters: string[] = [];
        
        if (filters.cultures && filters.cultures.length > 0) {
          const cultureFilters = filters.cultures
            .map(c => `target_culture.ilike.%${c}%`)
            .join(',');
          usageFilters.push(`or(${cultureFilters})`);
        }
        
        if (filters.pests && filters.pests.length > 0) {
          const pestFilters = filters.pests
            .map(p => `target_pest.ilike.%${p}%`)
            .join(',');
          usageFilters.push(`or(${pestFilters})`);
        }
        
        if (usageFilters.length > 0) {
          usageQuery = usageQuery.or(usageFilters.join(','));
        }
        
        const { data: usageData, error: usageError } = await usageQuery;
        
        if (!usageError && usageData) {
          const validAmms = new Set(usageData.map(u => u.amm));
          products = products.filter(p => validAmms.has(p.amm));
        }
      }
      
      console.log(`[PhytoService] ${products.length} produits trouvés après filtres`);
      return products;
      
    } catch (error) {
      console.error('[PhytoService] Erreur searchProducts:', error);
      return [];
    }
  }

  /**
   * Récupère un produit par son AMM
   */
  static async getProductByAmm(amm: string): Promise<PhytosanitaryProduct | null> {
    try {
      const { data, error } = await supabase
        .from('phytosanitary_products')
        .select('*')
        .eq('amm', amm)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Aucun produit trouvé
          return null;
        }
        console.error('[PhytoService] Erreur getProductByAmm:', error);
        return null;
      }

      return data as PhytosanitaryProduct;
    } catch (error) {
      console.error('[PhytoService] Erreur getProductByAmm:', error);
      return null;
    }
  }
  
  /**
   * Compte le nombre total de produits selon les filtres (sans limite)
   */
  static async countProductsByFilters(
    filters: PhytosanitaryProductFilters = {},
    farmId?: number
  ): Promise<number> {
    try {
      console.log('[PhytoService] Comptage produits avec filtres:', { filters, farmId });
      
      // Utiliser searchProducts avec une query vide pour obtenir tous les produits filtrés
      const products = await this.searchProducts('', filters, farmId);
      
      return products.length;
    } catch (error) {
      console.error('[PhytoService] Erreur countProductsByFilters:', error);
      return 0;
    }
  }

  /**
   * Récupère un produit par son numéro AMM
   */
  static async getProductByAMM(amm: string): Promise<PhytosanitaryProduct | null> {
    try {
      console.log('[PhytoService] Récupération produit AMM:', amm);
      
      const { data, error } = await supabase
        .from('phytosanitary_products')
        .select('*')
        .eq('amm', amm)
        .single();
      
      if (error) {
        console.error('[PhytoService] Erreur getProductByAMM:', error);
        return null;
      }
      
      return data;
      
    } catch (error) {
      console.error('[PhytoService] Erreur getProductByAMM:', error);
      return null;
    }
  }
  
  /**
   * Récupère les usages autorisés d'un produit
   */
  static async getProductUsages(amm: string): Promise<PhytosanitaryUsage[]> {
    try {
      console.log('[PhytoService] Récupération usages pour AMM:', amm);
      
      const { data, error } = await supabase
        .from('phytosanitary_usages')
        .select('*')
        .eq('amm', amm)
        .order('target_culture');
      
      if (error) {
        console.error('[PhytoService] Erreur getProductUsages:', error);
        return [];
      }
      
      console.log(`[PhytoService] ${data?.length || 0} usages trouvés`);
      return data || [];
      
    } catch (error) {
      console.error('[PhytoService] Erreur getProductUsages:', error);
      return [];
    }
  }
  
  /**
   * Recherche d'usages par culture ou bioagresseur
   */
  static async searchUsages(
    searchTerm: string,
    searchType: 'culture' | 'pest' = 'culture'
  ): Promise<PhytosanitaryUsage[]> {
    try {
      console.log('[PhytoService] Recherche usages:', { searchTerm, searchType });
      
      const column = searchType === 'culture' ? 'target_culture' : 'target_pest';
      
      const { data, error } = await supabase
        .from('phytosanitary_usages')
        .select('*')
        .ilike(column, `%${searchTerm}%`)
        .limit(50);
      
      if (error) {
        console.error('[PhytoService] Erreur searchUsages:', error);
        return [];
      }
      
      return data || [];
      
    } catch (error) {
      console.error('[PhytoService] Erreur searchUsages:', error);
      return [];
    }
  }
  
  /**
   * Crée un produit personnalisé (non autorisé)
   * Important: Afficher un avertissement "PRODUIT NON AUTORISÉ"
   */
  static async createCustomProduct(data: {
    name: string;
    farmId: number;
    userId: string;
  }): Promise<PhytosanitaryProduct | null> {
    try {
      console.log('[PhytoService] Création produit personnalisé:', data);
      
      // Générer un AMM fictif pour le produit personnalisé
      const customAmm = `CUSTOM-${Date.now()}-${data.farmId}`;
      
      const productData: Partial<PhytosanitaryProduct> = {
        amm: customAmm,
        name: data.name,
        is_custom: true,
        farm_id: data.farmId,
        authorization_state: 'NON_AUTORISE',
        functions: 'Produit personnalisé',
        holder: 'Utilisateur',
      };
      
      const { data: createdProduct, error } = await supabase
        .from('phytosanitary_products')
        .insert([productData])
        .select()
        .single();
      
      if (error) {
        console.error('[PhytoService] Erreur createCustomProduct:', error);
        throw error;
      }
      
      console.log('[PhytoService] Produit personnalisé créé:', createdProduct.amm);
      return createdProduct;
      
    } catch (error) {
      console.error('[PhytoService] Erreur createCustomProduct:', error);
      return null;
    }
  }
  
  /**
   * Récupère toutes les fonctions disponibles (pour filtres)
   */
  static async getAvailableFunctions(): Promise<string[]> {
    try {
      console.log('[PhytoService] Récupération fonctions disponibles');
      
      const { data, error } = await supabase
        .from('phytosanitary_products')
        .select('functions')
        .not('functions', 'is', null)
        .eq('is_custom', false);
      
      if (error) {
        console.error('[PhytoService] Erreur getAvailableFunctions:', error);
        return [];
      }
      
      // Extraire les fonctions uniques
      const functionsSet = new Set<string>();
      
      data?.forEach(item => {
        if (item.functions) {
          // Les fonctions peuvent être séparées par | ou ,
          const functions = item.functions.split(/[|,]/).map(f => f.trim());
          functions.forEach(f => {
            if (f) functionsSet.add(f);
          });
        }
      });
      
      const functions = Array.from(functionsSet).sort();
      console.log(`[PhytoService] ${functions.length} fonctions trouvées`);
      
      return functions;
      
    } catch (error) {
      console.error('[PhytoService] Erreur getAvailableFunctions:', error);
      return [];
    }
  }
  
  /**
   * Récupère les produits les plus utilisés (par popularité)
   */
  static async getPopularProducts(limit: number = 10): Promise<PhytosanitaryProduct[]> {
    try {
      console.log('[PhytoService] Récupération produits populaires');
      
      // Pour l'instant, on retourne les produits autorisés les plus récents
      // TODO: Implémenter un système de popularité basé sur l'utilisation
      const { data, error } = await supabase
        .from('phytosanitary_products')
        .select('*')
        .eq('is_custom', false)
        .eq('authorization_state', 'AUTORISE')
        .order('first_authorization_date', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('[PhytoService] Erreur getPopularProducts:', error);
        return [];
      }
      
      return data || [];
      
    } catch (error) {
      console.error('[PhytoService] Erreur getPopularProducts:', error);
      return [];
    }
  }
  
  /**
   * Supprime un produit personnalisé
   */
  static async deleteCustomProduct(amm: string, farmId: number): Promise<boolean> {
    try {
      console.log('[PhytoService] Suppression produit personnalisé:', amm);
      
      const { error } = await supabase
        .from('phytosanitary_products')
        .delete()
        .eq('amm', amm)
        .eq('is_custom', true)
        .eq('farm_id', farmId);
      
      if (error) {
        console.error('[PhytoService] Erreur deleteCustomProduct:', error);
        return false;
      }
      
      console.log('[PhytoService] Produit personnalisé supprimé');
      return true;
      
    } catch (error) {
      console.error('[PhytoService] Erreur deleteCustomProduct:', error);
      return false;
    }
  }
  
  /**
   * Récupère toutes les cultures uniques disponibles (pour filtres)
   */
  static async getAvailableCultures(): Promise<string[]> {
    try {
      console.log('[PhytoService] Récupération cultures disponibles');
      
      const { data, error } = await supabase
        .from('phytosanitary_usages')
        .select('target_culture')
        .not('target_culture', 'is', null)
        .neq('target_culture', '');
      
      if (error) {
        console.error('[PhytoService] Erreur getAvailableCultures:', error);
        return [];
      }
      
      // Extraire les cultures uniques
      const culturesSet = new Set<string>();
      
      data?.forEach(item => {
        if (item.target_culture) {
          // Les cultures peuvent être séparées par " - " (ex: "Tomate - Aubergine")
          const cultures = item.target_culture.split(' - ').map(c => c.trim());
          cultures.forEach(c => {
            if (c) culturesSet.add(c);
          });
        }
      });
      
      const cultures = Array.from(culturesSet).sort();
      console.log(`[PhytoService] ${cultures.length} cultures trouvées`);
      
      return cultures;
      
    } catch (error) {
      console.error('[PhytoService] Erreur getAvailableCultures:', error);
      return [];
    }
  }
  
  /**
   * Récupère tous les ravageurs/bioagresseurs uniques disponibles (pour filtres)
   */
  static async getAvailablePests(): Promise<string[]> {
    try {
      console.log('[PhytoService] Récupération ravageurs disponibles');
      
      const { data, error } = await supabase
        .from('phytosanitary_usages')
        .select('target_pest')
        .not('target_pest', 'is', null)
        .neq('target_pest', '');
      
      if (error) {
        console.error('[PhytoService] Erreur getAvailablePests:', error);
        return [];
      }
      
      // Extraire les ravageurs uniques
      const pestsSet = new Set<string>();
      
      data?.forEach(item => {
        if (item.target_pest) {
          pestsSet.add(item.target_pest.trim());
        }
      });
      
      const pests = Array.from(pestsSet).sort();
      console.log(`[PhytoService] ${pests.length} ravageurs trouvés`);
      
      return pests;
      
    } catch (error) {
      console.error('[PhytoService] Erreur getAvailablePests:', error);
      return [];
    }
  }
}

export const phytosanitaryProductService = PhytosanitaryProductService;
