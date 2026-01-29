import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  AgentContext, 
  FarmContext, 
  PlotWithDetails, 
  MaterialWithKeywords,
  UserConversionWithAliases,
  AIPreferences 
} from './types/AgentTypes';

/**
 * Service de Context Engineering selon les guides Anthropic
 * Implémente: "Finding the smallest possible set of high-signal tokens"
 * 
 * Stratégies utilisées:
 * - Minimal viable context: Seulement les données nécessaires
 * - Progressive disclosure: Chargement des détails à la demande  
 * - Context compaction: Résumé intelligent pour les gros contextes
 * - Token efficiency: Optimisation du nombre de tokens
 */
export class AgentContextService {
  private contextCache = new Map<string, AgentContext>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private supabase: SupabaseClient) {}

  /**
   * Construction du contexte agent optimisé
   * Context minimal mais complet selon patterns Anthropic
   */
  async buildContext(
    userId: string, 
    farmId: number, 
    sessionId: string,
    analysisId?: string
  ): Promise<AgentContext> {
    
    const cacheKey = `${userId}_${farmId}`;
    
    // Vérifier cache (performance optimization)
    if (this.isCacheValid(cacheKey)) {
      const cachedContext = this.contextCache.get(cacheKey)!;
      return {
        ...cachedContext,
        session_id: sessionId,
        analysis_id: analysisId
      };
    }

    try {
      console.log('🧠 Building agent context...', { userId, farmId });
      
      // Construction contexte optimisé en parallèle
      const [user, farm] = await Promise.all([
        this.getUserInfo(userId),
        this.getFarmContext(farmId, userId)
      ]);

      const context: AgentContext = {
        user: {
          id: userId,
          name: user.full_name || user.email || 'Utilisateur',
          farm_id: farmId
        },
        farm,
        session_id: sessionId,
        analysis_id: analysisId,
        availableTools: this.getAvailableTools(farm)
      };

      // Mise en cache
      this.contextCache.set(cacheKey, context);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL_MS);

      console.log('✅ Agent context built:', {
        plots_count: farm.plots.length,
        materials_count: farm.materials.length,
        conversions_count: farm.conversions.length,
        phyto_products_count: farm.phytosanitary_products.length,
        cache_key: cacheKey
      });

      return context;

    } catch (error) {
      console.error('❌ Error building context:', error);
      throw new Error(`Échec de construction du contexte: ${error.message}`);
    }
  }

  /**
   * Context compaction pour les gros contextes
   * Implémente la stratégie de compaction Anthropic
   */
  async compactContext(context: AgentContext): Promise<AgentContext> {
    const tokenCount = this.estimateTokenCount(context);
    
    if (tokenCount < 1000) {
      // Contexte assez petit, pas de compaction nécessaire
      return context;
    }

    console.log(`🗜️ Compacting context (${tokenCount} tokens estimated)`);

    const compactedFarm: FarmContext = {
      id: context.farm.id,
      name: context.farm.name,
      // Garder seulement les plots actifs les plus utilisés (top 10)
      plots: context.farm.plots
        .filter(p => p.is_active)
        .slice(0, 10),
      // Garder seulement les matériels récents et actifs (top 15)
      materials: context.farm.materials
        .filter(m => m.is_active)
        .slice(0, 15),
      // Garder toutes les conversions (critiques pour calculs)
      conversions: context.farm.conversions.filter(c => c.is_active),
      // Garder tous les produits phytosanitaires (liste généralement courte)
      phytosanitary_products: context.farm.phytosanitary_products,
      // Préférences essentielles
      preferences: context.farm.preferences
    };

    return {
      ...context,
      farm: compactedFarm
    };
  }

  /**
   * Récupération des informations utilisateur essentielles
   */
  private async getUserInfo(userId: string) {
    const { data: user, error } = await this.supabase
      .from('profiles')
      .select('id, email, first_name, last_name, full_name, language')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error(`Utilisateur ${userId} non trouvé`);
    }

    return user;
  }

  /**
   * Construction du contexte ferme optimisé
   * Données high-signal seulement
   */
  private async getFarmContext(farmId: number, userId: string): Promise<FarmContext> {
    // Requêtes parallèles pour performance
    const [farmInfo, plots, materials, conversions, phytoProducts] = await Promise.all([
      this.getFarmInfo(farmId),
      this.getActivePlots(farmId),
      this.getMaterialsByCategory(farmId),
      this.getUserConversions(farmId),
      this.getUserPhytoProducts(farmId, userId)
    ]);

    return {
      id: farmId,
      name: farmInfo.name,
      plots,
      materials,
      conversions,
      phytosanitary_products: phytoProducts,
      preferences: {
        language: 'fr',
        auto_categorization: true,
        confidence_threshold: 0.7,
        fallback_enabled: true
      }
    };
  }

  /**
   * Récupération des parcelles actives avec détails optimisés
   */
  private async getActivePlots(farmId: number): Promise<PlotWithDetails[]> {
    const { data: plots, error } = await this.supabase
      .from('plots')
      .select(`
        id,
        name,
        type,
        aliases,
        llm_keywords,
        is_active,
        surface_units:surface_units(
          id,
          plot_id,
          name,
          type,
          aliases,
          llm_keywords,
          is_active
        )
      `)
      .eq('farm_id', farmId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching plots:', error);
      return [];
    }

    return plots?.map(plot => ({
      ...plot,
      surface_units: plot.surface_units?.filter(su => su.is_active) || []
    })) || [];
  }

  /**
   * Récupération des matériels groupés par catégorie
   */
  private async getMaterialsByCategory(farmId: number): Promise<MaterialWithKeywords[]> {
    const { data: materials, error } = await this.supabase
      .from('materials')
      .select('id, name, category, brand, model, llm_keywords, is_active')
      .eq('farm_id', farmId)
      .eq('is_active', true)
      .order('category, name');

    if (error) {
      console.error('Error fetching materials:', error);
      return [];
    }

    return materials || [];
  }

  /**
   * Récupération des conversions utilisateur avec aliases
   */
  private async getUserConversions(farmId: number): Promise<UserConversionWithAliases[]> {
    const { data: conversions, error } = await this.supabase
      .from('user_conversion_units')
      .select('id, container_name, crop_name, conversion_value, conversion_unit, slugs, description, is_active')
      .eq('farm_id', farmId)
      .eq('is_active', true)
      .order('crop_name, container_name');

    if (error) {
      console.error('Error fetching conversions:', error);
      return [];
    }

    return conversions || [];
  }

  /**
   * Récupération des noms de produits phytosanitaires de l'utilisateur
   * Retourne seulement les noms pour le contexte Whisper et le matching
   */
  private async getUserPhytoProducts(farmId: number, userId: string): Promise<string[]> {
    try {
      // Récupérer les préférences utilisateur
      const { data: preferences, error: prefsError } = await this.supabase
        .from('user_phytosanitary_preferences')
        .select('product_amms')
        .eq('farm_id', farmId)
        .eq('user_id', userId)
        .single();

      if (prefsError || !preferences?.product_amms?.length) {
        console.log('No phytosanitary products found for user');
        return [];
      }

      // Charger les produits correspondants
      const { data: products, error: productsError } = await this.supabase
        .from('phytosanitary_products')
        .select('name')
        .in('amm', preferences.product_amms);

      if (productsError) {
        console.error('Error fetching phytosanitary products:', productsError);
        return [];
      }

      // Retourner seulement les noms
      return products?.map(p => p.name).filter(Boolean) || [];
    } catch (error) {
      console.error('Error in getUserPhytoProducts:', error);
      return [];
    }
  }

  /**
   * Récupération des informations ferme essentielles
   */
  private async getFarmInfo(farmId: number) {
    const { data: farm, error } = await this.supabase
      .from('farms')
      .select('id, name, description, farm_type')
      .eq('id', farmId)
      .eq('is_active', true)
      .single();

    if (error || !farm) {
      throw new Error(`Ferme ${farmId} non trouvée ou inactive`);
    }

    return farm;
  }

  /**
   * Détermination des tools disponibles selon le contexte
   */
  private getAvailableTools(farm: FarmContext): string[] {
    const baseTool = [
      'create_observation',
      'create_task_done', 
      'create_task_planned',
      'help'
    ];

    // Ajouter tools contextuels selon les données disponibles
    if (farm.materials.length > 0) {
      baseTool.push('manage_materials');
    }

    if (farm.conversions.length > 0) {
      baseTool.push('manage_conversions');
    }

    if (farm.plots.length > 5) {
      baseTool.push('search_plots');
    }

    return baseTool;
  }

  /**
   * Estimation du nombre de tokens du contexte
   * Approximation pour décider si compaction nécessaire
   */
  private estimateTokenCount(context: AgentContext): number {
    // Estimation approximative: 4 caractères = 1 token
    const contextStr = JSON.stringify(context);
    return Math.ceil(contextStr.length / 4);
  }

  /**
   * Vérification de validité du cache
   */
  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry ? expiry > Date.now() : false;
  }

  /**
   * Invalidation manuelle du cache (utile après modifications)
   */
  invalidateCache(userId: string, farmId: number): void {
    const cacheKey = `${userId}_${farmId}`;
    this.contextCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
    console.log(`🗑️ Context cache invalidated for ${cacheKey}`);
  }

  /**
   * Mise à jour contextuelle rapide (pour modifications mineures)
   */
  async updateContextData(
    userId: string,
    farmId: number,
    updates: Partial<FarmContext>
  ): Promise<void> {
    const cacheKey = `${userId}_${farmId}`;
    const existingContext = this.contextCache.get(cacheKey);

    if (existingContext) {
      existingContext.farm = {
        ...existingContext.farm,
        ...updates
      };
      
      // Renouveler l'expiry
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL_MS);
      
      console.log(`🔄 Context updated for ${cacheKey}:`, updates);
    }
  }

  /**
   * Stats du cache pour monitoring
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.contextCache.size,
      // TODO: Implémenter tracking du hit rate si nécessaire
    };
  }
}
