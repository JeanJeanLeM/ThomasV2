import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Service de gestion de la configuration de méthode d'agent au niveau ferme
 * Permet de choisir entre Méthode 1 (simple) et Méthode 2 (pipeline)
 * et de tracker les performances de chaque méthode
 */

export interface FarmAgentConfig {
  id: string;
  farm_id: number;
  agent_method: 'simple' | 'pipeline';
  simple_success_count: number;
  simple_total_count: number;
  pipeline_success_count: number;
  pipeline_total_count: number;
  config_reason?: string;
  switched_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentMethodMetrics {
  method: 'simple' | 'pipeline';
  success_count: number;
  total_count: number;
  success_rate: number; // Percentage 0-100
  failure_count: number;
}

export interface MethodComparisonStats {
  simple: AgentMethodMetrics;
  pipeline: AgentMethodMetrics;
  recommended_method: 'simple' | 'pipeline' | 'insufficient_data';
  reason: string;
}

export class FarmAgentConfigService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Récupérer la configuration agent d'une ferme
   * Crée une config par défaut si elle n'existe pas
   */
  async getFarmConfig(farmId: number): Promise<FarmAgentConfig> {
    const { data, error } = await this.supabase
      .from('farm_agent_config')
      .select('*')
      .eq('farm_id', farmId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Config n'existe pas, la créer avec valeurs par défaut
        return await this.createDefaultConfig(farmId);
      }
      throw new Error(`Erreur lors de la récupération de la config: ${error.message}`);
    }

    return data;
  }

  /**
   * Créer une configuration par défaut pour une ferme
   */
  private async createDefaultConfig(farmId: number): Promise<FarmAgentConfig> {
    const { data, error } = await this.supabase
      .from('farm_agent_config')
      .insert({
        farm_id: farmId,
        agent_method: 'pipeline',
        config_reason: 'Configuration par défaut - première utilisation (pipeline)'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la création de la config: ${error.message}`);
    }

    return data;
  }

  /**
   * Mettre à jour la méthode d'agent pour une ferme
   */
  async updateAgentMethod(
    farmId: number,
    method: 'simple' | 'pipeline',
    reason?: string
  ): Promise<FarmAgentConfig> {
    // Vérifier que la config existe
    await this.getFarmConfig(farmId);

    const { data, error } = await this.supabase
      .from('farm_agent_config')
      .update({
        agent_method: method,
        config_reason: reason || `Changement vers méthode ${method}`,
        switched_at: new Date().toISOString()
      })
      .eq('farm_id', farmId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la mise à jour de la méthode: ${error.message}`);
    }

    console.log(`✅ Méthode d'agent mise à jour pour ferme ${farmId}: ${method}`);
    return data;
  }

  /**
   * Incrémenter les compteurs après l'exécution d'une méthode
   */
  async recordMethodExecution(
    farmId: number,
    method: 'simple' | 'pipeline',
    success: boolean
  ): Promise<void> {
    const config = await this.getFarmConfig(farmId);

    let updates: any = {};

    if (method === 'simple') {
      updates.simple_total_count = config.simple_total_count + 1;
      if (success) {
        updates.simple_success_count = config.simple_success_count + 1;
      }
    } else {
      updates.pipeline_total_count = config.pipeline_total_count + 1;
      if (success) {
        updates.pipeline_success_count = config.pipeline_success_count + 1;
      }
    }

    const { error } = await this.supabase
      .from('farm_agent_config')
      .update(updates)
      .eq('farm_id', farmId);

    if (error) {
      console.error(`❌ Erreur lors de l'enregistrement de l'exécution:`, error);
      // Non-bloquant: on ne throw pas l'erreur
    }
  }

  /**
   * Obtenir les métriques détaillées pour une méthode
   */
  getMethodMetrics(config: FarmAgentConfig, method: 'simple' | 'pipeline'): AgentMethodMetrics {
    const success_count = method === 'simple' 
      ? config.simple_success_count 
      : config.pipeline_success_count;
    
    const total_count = method === 'simple'
      ? config.simple_total_count
      : config.pipeline_total_count;

    const success_rate = total_count > 0 
      ? Math.round((success_count / total_count) * 100) 
      : 0;

    return {
      method,
      success_count,
      total_count,
      success_rate,
      failure_count: total_count - success_count
    };
  }

  /**
   * Comparer les performances des deux méthodes
   */
  async getMethodComparisonStats(farmId: number): Promise<MethodComparisonStats> {
    const config = await this.getFarmConfig(farmId);

    const simple_metrics = this.getMethodMetrics(config, 'simple');
    const pipeline_metrics = this.getMethodMetrics(config, 'pipeline');

    // Déterminer la méthode recommandée
    let recommended_method: 'simple' | 'pipeline' | 'insufficient_data' = 'insufficient_data';
    let reason = '';

    const min_executions = 10; // Minimum d'exécutions pour avoir des stats significatives

    if (simple_metrics.total_count < min_executions && pipeline_metrics.total_count < min_executions) {
      recommended_method = 'insufficient_data';
      reason = `Pas assez de données (minimum ${min_executions} exécutions par méthode)`;
    } else if (simple_metrics.total_count < min_executions) {
      recommended_method = 'pipeline';
      reason = 'Méthode pipeline a plus de données historiques';
    } else if (pipeline_metrics.total_count < min_executions) {
      recommended_method = 'simple';
      reason = 'Méthode simple a plus de données historiques';
    } else {
      // Les deux ont assez de données, comparer les success rates
      if (pipeline_metrics.success_rate > simple_metrics.success_rate + 5) {
        recommended_method = 'pipeline';
        reason = `Pipeline plus performant: ${pipeline_metrics.success_rate}% vs ${simple_metrics.success_rate}%`;
      } else if (simple_metrics.success_rate > pipeline_metrics.success_rate + 5) {
        recommended_method = 'simple';
        reason = `Simple plus performant: ${simple_metrics.success_rate}% vs ${pipeline_metrics.success_rate}%`;
      } else {
        // Performances similaires : pipeline par défaut produit (analyse plus riche)
        recommended_method = 'pipeline';
        reason = `Performances similaires, pipeline privilégié par défaut`;
      }
    }

    return {
      simple: simple_metrics,
      pipeline: pipeline_metrics,
      recommended_method,
      reason
    };
  }

  /**
   * Obtenir toutes les configurations (pour admin)
   */
  async getAllConfigs(): Promise<FarmAgentConfig[]> {
    const { data, error } = await this.supabase
      .from('farm_agent_config')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur lors de la récupération des configs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Statistiques globales sur l'utilisation des méthodes
   */
  async getGlobalStats(): Promise<{
    total_farms: number;
    using_simple: number;
    using_pipeline: number;
    total_simple_executions: number;
    total_pipeline_executions: number;
    avg_simple_success_rate: number;
    avg_pipeline_success_rate: number;
  }> {
    const { data, error } = await this.supabase
      .from('farm_agent_config')
      .select('*');

    if (error) {
      throw new Error(`Erreur lors du calcul des stats globales: ${error.message}`);
    }

    const configs = data || [];
    const total_farms = configs.length;
    const using_simple = configs.filter(c => c.agent_method === 'simple').length;
    const using_pipeline = configs.filter(c => c.agent_method === 'pipeline').length;

    const total_simple_executions = configs.reduce((sum, c) => sum + c.simple_total_count, 0);
    const total_pipeline_executions = configs.reduce((sum, c) => sum + c.pipeline_total_count, 0);

    const simple_success_total = configs.reduce((sum, c) => sum + c.simple_success_count, 0);
    const pipeline_success_total = configs.reduce((sum, c) => sum + c.pipeline_success_count, 0);

    const avg_simple_success_rate = total_simple_executions > 0
      ? Math.round((simple_success_total / total_simple_executions) * 100)
      : 0;

    const avg_pipeline_success_rate = total_pipeline_executions > 0
      ? Math.round((pipeline_success_total / total_pipeline_executions) * 100)
      : 0;

    return {
      total_farms,
      using_simple,
      using_pipeline,
      total_simple_executions,
      total_pipeline_executions,
      avg_simple_success_rate,
      avg_pipeline_success_rate
    };
  }

  /**
   * Réinitialiser les compteurs pour une ferme
   */
  async resetMetrics(farmId: number): Promise<void> {
    const { error } = await this.supabase
      .from('farm_agent_config')
      .update({
        simple_success_count: 0,
        simple_total_count: 0,
        pipeline_success_count: 0,
        pipeline_total_count: 0
      })
      .eq('farm_id', farmId);

    if (error) {
      throw new Error(`Erreur lors de la réinitialisation des métriques: ${error.message}`);
    }

    console.log(`✅ Métriques réinitialisées pour ferme ${farmId}`);
  }
}
