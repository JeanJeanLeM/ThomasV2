/**
 * Index du système de prompt management avancé
 * Point d'entrée pour tous les services de prompts
 */

// Services principaux
export { PromptTemplateEngine } from './PromptTemplateEngine';
export { PromptTestingService } from './PromptTestingService';
export { AdvancedPromptManager } from './AdvancedPromptManager';

// Templates et factory
export * from './templates/ThomasAgentPrompts';

// Service d'initialisation et déploiement
export class PromptSystemInitializer {
  /**
   * Initialisation complète du système de prompts
   */
  static async initializePromptSystem(
    supabaseClient: any,
    openAIApiKey: string
  ): Promise<PromptSystemStatus> {
    console.log('🚀 Initializing Thomas Agent prompt system...');

    try {
      // 1. Créer le gestionnaire avancé
      const promptManager = new AdvancedPromptManager(supabaseClient, openAIApiKey);

      // 2. Déployer les prompts par défaut
      const deploymentResult = await promptManager.deployDefaultPrompts(false);

      // 3. Vérifier l'état des prompts critiques
      const criticalPrompts = [
        'thomas_agent_system',
        'tool_selection', 
        'intent_classification'
      ];

      const promptsStatus: Record<string, boolean> = {};
      for (const promptName of criticalPrompts) {
        try {
          await promptManager.getPrompt(promptName);
          promptsStatus[promptName] = true;
        } catch {
          promptsStatus[promptName] = false;
        }
      }

      // 4. Validation du template engine
      const templateEngine = new PromptTemplateEngine();
      const engineStats = templateEngine.getEngineStats();

      const status: PromptSystemStatus = {
        initialized: true,
        prompts_deployed: deploymentResult.deployed,
        prompts_skipped: deploymentResult.skipped,
        deployment_errors: deploymentResult.errors,
        critical_prompts_status: promptsStatus,
        template_engine_ready: engineStats.helpers_count > 0,
        recommendations: this.generateInitializationRecommendations(
          deploymentResult, 
          promptsStatus
        )
      };

      console.log('✅ Prompt system initialized:', status);
      return status;

    } catch (error) {
      console.error('❌ Prompt system initialization failed:', error);
      return {
        initialized: false,
        error: error.message,
        prompts_deployed: 0,
        prompts_skipped: 0,
        deployment_errors: [error.message],
        critical_prompts_status: {},
        template_engine_ready: false,
        recommendations: [
          'Vérifier la connexion à la base de données',
          'Valider que les tables chat_prompts existent',
          'Vérifier les permissions de création'
        ]
      };
    }
  }

  /**
   * Vérification de l'état du système
   */
  static async checkSystemHealth(
    promptManager: AdvancedPromptManager
  ): Promise<SystemHealthReport> {
    console.log('🔍 Checking prompt system health...');

    const health: SystemHealthReport = {
      overall_status: 'healthy',
      issues: [],
      warnings: [],
      recommendations: []
    };

    try {
      // 1. Vérifier prompts critiques
      const criticalPrompts = ['thomas_agent_system', 'tool_selection', 'intent_classification'];
      
      for (const promptName of criticalPrompts) {
        try {
          const prompt = await promptManager.getPrompt(promptName);
          if (!prompt.is_active) {
            health.issues.push(`Prompt critique ${promptName} inactif`);
            health.overall_status = 'unhealthy';
          }
        } catch {
          health.issues.push(`Prompt critique ${promptName} manquant`);
          health.overall_status = 'unhealthy';
        }
      }

      // 2. Vérifier performance récente
      for (const promptName of criticalPrompts) {
        try {
          const report = await promptManager.getPromptPerformanceReport(promptName, 1);
          
          if (report.success_rate < 0.7) {
            health.warnings.push(`${promptName}: Taux de succès faible (${(report.success_rate * 100).toFixed(1)}%)`);
          }
          
          if (report.avg_processing_time_ms > 5000) {
            health.warnings.push(`${promptName}: Temps de traitement élevé (${report.avg_processing_time_ms}ms)`);
          }
        } catch {
          // Performance non disponible, pas critique
        }
      }

      // 3. Vérifier cache
      const managerStats = promptManager.getManagerStats();
      if (managerStats.cache_size > 50) {
        health.warnings.push('Cache prompts volumineux - considérer nettoyage');
      }

      // 4. Générer recommandations
      if (health.issues.length === 0 && health.warnings.length === 0) {
        health.recommendations.push('Système prompt en bon état');
      } else {
        health.recommendations.push('Surveiller les métriques de performance');
        if (health.issues.length > 0) {
          health.recommendations.push('Corriger les problèmes critiques identifiés');
        }
      }

      console.log(`🎯 Health check completed: ${health.overall_status}`);
      return health;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        overall_status: 'unhealthy',
        issues: [`Health check failed: ${error.message}`],
        warnings: [],
        recommendations: ['Vérifier la connectivité du système']
      };
    }
  }

  /**
   * Génération de recommandations d'initialisation
   */
  private static generateInitializationRecommendations(
    deployment: { deployed: number; errors: string[] },
    promptsStatus: Record<string, boolean>
  ): string[] {
    const recommendations: string[] = [];

    // Recommandations selon le déploiement
    if (deployment.deployed > 0) {
      recommendations.push(`✅ ${deployment.deployed} prompts déployés avec succès`);
    }

    if (deployment.errors.length > 0) {
      recommendations.push(`⚠️ ${deployment.errors.length} erreurs de déploiement à corriger`);
    }

    // Recommandations selon les prompts critiques
    const missingPrompts = Object.entries(promptsStatus)
      .filter(([name, status]) => !status)
      .map(([name]) => name);

    if (missingPrompts.length > 0) {
      recommendations.push(`🚨 Prompts critiques manquants: ${missingPrompts.join(', ')}`);
      recommendations.push('Exécuter migration ou déploiement forcé');
    }

    // Recommandations générales
    if (Object.values(promptsStatus).every(status => status)) {
      recommendations.push('🎉 Tous les prompts critiques sont prêts');
      recommendations.push('Système prêt pour utilisation en production');
    }

    return recommendations;
  }
}

// Factory pour création rapide d'un gestionnaire configuré
export class PromptManagerFactory {
  /**
   * Création d'un gestionnaire prompt prêt à l'emploi
   */
  static async createConfiguredManager(
    supabaseClient: any,
    openAIApiKey: string
  ): Promise<AdvancedPromptManager> {
    
    const manager = new AdvancedPromptManager(supabaseClient, openAIApiKey);
    
    // Initialisation du système si besoin
    const systemStatus = await PromptSystemInitializer.initializePromptSystem(
      supabaseClient, 
      openAIApiKey
    );

    if (!systemStatus.initialized) {
      throw new Error(`Échec initialisation système prompts: ${systemStatus.error}`);
    }

    return manager;
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface PromptSystemStatus {
  initialized: boolean;
  error?: string;
  prompts_deployed: number;
  prompts_skipped: number;
  deployment_errors: string[];
  critical_prompts_status: Record<string, boolean>;
  template_engine_ready: boolean;
  recommendations: string[];
}

interface SystemHealthReport {
  overall_status: 'healthy' | 'unhealthy' | 'degraded';
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

