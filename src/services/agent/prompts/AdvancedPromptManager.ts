import { SupabaseClient } from '@supabase/supabase-js';
import { PromptTemplateEngine } from './PromptTemplateEngine';
import { PromptTestingService, TestCase } from './PromptTestingService';
import { 
  PromptTemplate,
  PromptTemplateFactory,
  THOMAS_AGENT_PROMPT_COLLECTION 
} from './templates/ThomasAgentPrompts';
import { 
  ChatPrompt, 
  AgentContext 
} from '../types/AgentTypes';

/**
 * Gestionnaire avancé des prompts avec versioning, testing et templates
 * Remplace le PromptManager basique avec fonctionnalités sophistiquées
 * 
 * Fonctionnalités:
 * - Cache intelligent multi-niveaux
 * - Versioning automatique avec rollback
 * - Template engine avec variables contextuelles
 * - Testing automatisé avec métriques
 * - A/B testing entre versions
 * - Performance monitoring
 * - Auto-fallback en cas d'erreur
 */
export class AdvancedPromptManager {
  private promptCache = new Map<string, ChatPrompt>();
  private templateCache = new Map<string, string>();
  private cacheExpiry = new Map<string, number>();
  private templateEngine: PromptTemplateEngine;
  private testingService: PromptTestingService;
  
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_CACHE_SIZE = 100;

  constructor(
    private supabase: SupabaseClient,
    private openAIApiKey: string
  ) {
    this.templateEngine = new PromptTemplateEngine();
    this.testingService = new PromptTestingService(supabase, this.templateEngine, openAIApiKey);
    this.initializeDefaultHelpers();
  }

  /**
   * Récupération d'un prompt avec rendu contextuel
   * API principale du gestionnaire
   */
  async getContextualPrompt(
    name: string,
    context: AgentContext,
    variables: Record<string, any> = {},
    version?: string
  ): Promise<string> {
    
    try {
      // 1. Récupération du prompt brut
      const prompt = await this.getPrompt(name, version);
      
      // 2. Rendu avec contexte via template engine
      const rendered = this.templateEngine.render(prompt.content, context, variables);
      
      // 3. Cache du résultat rendu
      const cacheKey = `rendered_${name}_${version || 'latest'}_${this.hashContext(context)}`;
      this.templateCache.set(cacheKey, rendered);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL_MS);
      
      console.log(`📝 Contextual prompt rendered: ${name} (${rendered.length} chars)`);
      return rendered;

    } catch (error) {
      console.error(`❌ Error getting contextual prompt ${name}:`, error);
      
      // Fallback vers template statique si erreur
      return this.getFallbackPrompt(name);
    }
  }

  /**
   * Récupération d'un prompt brut avec cache
   */
  async getPrompt(name: string, version?: string): Promise<ChatPrompt> {
    const cacheKey = `${name}_${version || 'latest'}`;

    // Vérifier cache
    if (this.isCacheValid(cacheKey)) {
      return this.promptCache.get(cacheKey)!;
    }

    try {
      let query = this.supabase
        .from('chat_prompts')
        .select('*')
        .eq('name', name)
        .eq('is_active', true);

      if (version) {
        query = query.eq('version', version);
      } else {
        query = query.order('version', { ascending: false }).limit(1);
      }

      const { data: prompt, error } = await query.single();

      if (error || !prompt) {
        throw new Error(`Prompt ${name} (v${version || 'latest'}) non trouvé`);
      }

      // Mise en cache avec gestion taille
      this.addToCache(cacheKey, prompt);
      
      console.log(`📥 Prompt loaded: ${name} v${prompt.version}`);
      return prompt;

    } catch (error) {
      console.error(`❌ Error loading prompt ${name}:`, error);
      throw error;
    }
  }

  /**
   * Mise à jour d'un prompt avec validation et testing
   */
  async updatePrompt(
    name: string,
    newContent: string,
    examples: any[] = [],
    metadata: Record<string, any> = {},
    runTests = true
  ): Promise<PromptUpdateResult> {
    
    console.log(`📝 Updating prompt: ${name}`);
    
    try {
      // 1. Validation du nouveau contenu
      const tempTemplate: PromptTemplate = {
        name,
        version: 'temp',
        description: 'Validation temporaire',
        template: newContent,
        examples,
        variables: this.extractVariables(newContent),
        conditions: this.extractConditions(newContent),
        metadata
      };

      const validation = PromptTemplateFactory.validateTemplate(tempTemplate);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // 2. Test du nouveau prompt si demandé
      let testResults;
      if (runTests) {
        const oldPrompt = await this.getPrompt(name);
        testResults = await this.testPromptUpdate(oldPrompt, newContent, examples);
        
        if (testResults.regression_detected) {
          return {
            success: false,
            errors: ['Régression détectée lors des tests'],
            test_results: testResults,
            warnings: validation.warnings
          };
        }
      }

      // 3. Désactivation ancienne version
      await this.supabase
        .from('chat_prompts')
        .update({ is_active: false })
        .eq('name', name)
        .eq('is_active', true);

      // 4. Création nouvelle version
      const newVersion = await this.getNextVersion(name);
      const { data: newPrompt, error } = await this.supabase
        .from('chat_prompts')
        .insert({
          name,
          content: newContent,
          examples,
          version: newVersion,
          is_active: true,
            metadata: {
              category: 'system',
              ...metadata,
              updated_by: 'advanced_prompt_manager',
              previous_version: await this.getCurrentVersion(name),
              validation_passed: true,
              test_results: testResults ? {
                success_rate: testResults.success_rate,
                avg_score: testResults.average_score
              } : null
            }
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Échec mise à jour: ${error.message}`);
      }

      // 5. Invalidation du cache
      this.invalidatePromptCache(name);

      console.log(`✅ Prompt ${name} updated to v${newVersion}`);
      
      return {
        success: true,
        new_version: newVersion,
        test_results: testResults,
        warnings: validation.warnings,
        new_prompt_id: newPrompt.id
      };

    } catch (error) {
      console.error(`❌ Error updating prompt ${name}:`, error);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Test d'une mise à jour de prompt  
   */
  private async testPromptUpdate(
    oldPrompt: ChatPrompt,
    newContent: string,
    newExamples: any[]
  ): Promise<any> {
    
    // Créer un prompt temporaire pour test
    const testPrompt: ChatPrompt = {
      ...oldPrompt,
      content: newContent,
      examples: newExamples,
      version: 'test'
    };

    // Générer cas de test automatiques
    const testCases = this.testingService.generateTestCases({
      plots: [], materials: [], conversions: [] // Context minimal pour test
    });

    // Exécuter tests comparatifs
    const [oldResults, newResults] = await Promise.all([
      this.testingService.runTestSuite(oldPrompt, testCases),
      this.testingService.runTestSuite(testPrompt, testCases)
    ]);

    // Comparaison
    return {
      old_success_rate: oldResults.success_rate,
      new_success_rate: newResults.success_rate,
      success_rate_delta: newResults.success_rate - oldResults.success_rate,
      average_score: newResults.average_score,
      regression_detected: newResults.success_rate < oldResults.success_rate - 0.1
    };
  }

  /**
   * Déploiement des prompts par défaut
   */
  async deployDefaultPrompts(force = false): Promise<DeploymentResult> {
    console.log('🚀 Deploying default Thomas Agent prompts...');
    
    const results: DeploymentResult = {
      deployed: 0,
      skipped: 0,
      errors: []
    };

    for (const template of THOMAS_AGENT_PROMPT_COLLECTION) {
      try {
        // Vérifier si existe déjà
        const existing = await this.checkPromptExists(template.name, template.version);
        
        if (existing && !force) {
          console.log(`⏭️ Skipping ${template.name} v${template.version} (already exists)`);
          results.skipped++;
          continue;
        }

        // Validation du template
        const validation = PromptTemplateFactory.validateTemplate(template);
        if (!validation.valid) {
          results.errors.push(`${template.name}: ${validation.errors.join(', ')}`);
          continue;
        }

        // Conversion et insertion
        const chatPrompt = PromptTemplateFactory.templateToChatPrompt(template);
        
        if (existing && force) {
          // Mise à jour forcée
          await this.supabase
            .from('chat_prompts')
            .update(chatPrompt)
            .eq('name', template.name)
            .eq('version', template.version);
        } else {
          // Nouvelle création
          await this.supabase
            .from('chat_prompts')
            .insert(chatPrompt);
        }

        console.log(`✅ Deployed: ${template.name} v${template.version}`);
        results.deployed++;

      } catch (error) {
        console.error(`❌ Failed to deploy ${template.name}:`, error);
        results.errors.push(`${template.name}: ${error.message}`);
      }
    }

    console.log(`🎯 Deployment completed: ${results.deployed} deployed, ${results.skipped} skipped, ${results.errors.length} errors`);
    return results;
  }

  /**
   * A/B Testing entre deux versions de prompt
   */
  async runABTest(
    promptName: string,
    versionA: string,
    versionB: string,
    testCases: TestCase[]
  ): Promise<ABTestResult> {
    
    console.log(`🧪 Running A/B test: ${promptName} v${versionA} vs v${versionB}`);

    const comparison = await this.testingService.comparePromptVersions(
      promptName, 
      versionA, 
      versionB, 
      testCases
    );

    const winner = comparison.performance_delta.success_rate > 0 ? versionB : versionA;
    const confidence = Math.abs(comparison.performance_delta.success_rate);

    return {
      prompt_name: promptName,
      version_a: versionA,
      version_b: versionB,
      winner,
      confidence,
      performance_delta: comparison.performance_delta,
      statistical_significance: confidence > 0.05, // 5% seuil
      recommendation: comparison.recommendation,
      next_action: confidence > 0.1 
        ? `Déployer ${winner} en production`
        : 'Différence non significative - garder version actuelle'
    };
  }

  /**
   * Rollback vers version précédente
   */
  async rollbackPrompt(name: string, targetVersion?: string): Promise<void> {
    console.log(`🔄 Rolling back prompt: ${name} to ${targetVersion || 'previous'}`);
    
    try {
      // Si version cible non spécifiée, prendre la version précédente
      if (!targetVersion) {
        const currentPrompt = await this.getPrompt(name);
        const previousVersion = await this.getPreviousVersion(name, currentPrompt.version);
        
        if (!previousVersion) {
          throw new Error('Aucune version précédente trouvée');
        }
        
        targetVersion = previousVersion.version;
      }

      // Désactiver version actuelle
      await this.supabase
        .from('chat_prompts')
        .update({ is_active: false })
        .eq('name', name)
        .eq('is_active', true);

      // Réactiver version cible
      await this.supabase
        .from('chat_prompts')
        .update({ is_active: true })
        .eq('name', name)
        .eq('version', targetVersion);

      // Invalider cache
      this.invalidatePromptCache(name);

      console.log(`✅ Rollback completed: ${name} → v${targetVersion}`);

    } catch (error) {
      console.error(`❌ Rollback failed:`, error);
      throw error;
    }
  }

  /**
   * Monitoring de la performance des prompts
   */
  async getPromptPerformanceReport(
    name: string,
    periodDays = 7
  ): Promise<PerformanceReport> {
    
    console.log(`📊 Generating performance report for ${name} (${periodDays} days)`);

    try {
      // Récupérer métriques depuis chat_agent_executions
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);

      const { data: executions, error } = await this.supabase
        .from('chat_agent_executions')
        .select('success, processing_time_ms, created_at, tools_used')
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Erreur récupération métriques: ${error.message}`);
      }

      const executionsData = executions || [];
      
      // Calculs de performance
      const totalExecutions = executionsData.length;
      const successfulExecutions = executionsData.filter(e => e.success).length;
      const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;
      
      const avgProcessingTime = totalExecutions > 0
        ? executionsData.reduce((sum, e) => sum + (e.processing_time_ms || 0), 0) / totalExecutions
        : 0;

      // Analyse des tools les plus utilisés
      const toolUsage = new Map<string, number>();
      executionsData.forEach(exec => {
        (exec.tools_used || []).forEach((tool: string) => {
          toolUsage.set(tool, (toolUsage.get(tool) || 0) + 1);
        });
      });

      const mostUsedTools = Array.from(toolUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      return {
        prompt_name: name,
        period_days: periodDays,
        total_executions: totalExecutions,
        success_rate: successRate,
        avg_processing_time_ms: avgProcessingTime,
        most_used_tools: mostUsedTools.map(([tool, count]) => ({ tool, count })),
        performance_grade: this.calculatePerformanceGrade(successRate, avgProcessingTime),
        trends: this.analyzeTrends(executionsData),
        recommendations: this.generatePerformanceRecommendations(successRate, avgProcessingTime, toolUsage)
      };

    } catch (error) {
      console.error(`❌ Error generating performance report:`, error);
      throw error;
    }
  }

  /**
   * Auto-optimisation des prompts basée sur les métriques
   */
  async autoOptimizePrompt(
    name: string,
    optimizationGoal: 'performance' | 'accuracy' | 'token_efficiency' = 'performance'
  ): Promise<OptimizationResult> {
    
    console.log(`🔧 Auto-optimizing prompt ${name} for ${optimizationGoal}`);

    try {
      const currentPrompt = await this.getPrompt(name);
      const performanceReport = await this.getPromptPerformanceReport(name);

      let optimizationSuggestions: string[] = [];
      let optimizedContent = currentPrompt.content;

      // Optimisations selon l'objectif
      switch (optimizationGoal) {
        case 'performance':
          if (performanceReport.avg_processing_time_ms > 3000) {
            optimizationSuggestions.push('Réduire longueur du prompt pour meilleure performance');
            optimizedContent = this.shortenPrompt(optimizedContent);
          }
          break;

        case 'accuracy':
          if (performanceReport.success_rate < 0.8) {
            optimizationSuggestions.push('Ajouter exemples spécifiques pour améliorer précision');
            optimizedContent = this.addMoreExamples(optimizedContent, performanceReport);
          }
          break;

        case 'token_efficiency':
          optimizationSuggestions.push('Compacter prompt pour efficacité tokens');
          optimizedContent = this.compactPrompt(optimizedContent);
          break;
      }

      // Création version optimisée si changements significatifs
      if (optimizedContent !== currentPrompt.content) {
        const updateResult = await this.updatePrompt(
          name,
          optimizedContent,
          currentPrompt.examples,
          {
            ...currentPrompt.metadata,
            optimization_goal: optimizationGoal,
            auto_optimized: true,
            optimization_date: new Date().toISOString()
          },
          true // Tester la nouvelle version
        );

        return {
          success: updateResult.success,
          optimization_applied: true,
          suggestions: optimizationSuggestions,
          new_version: updateResult.new_version,
          test_results: updateResult.test_results
        };
      } else {
        return {
          success: true,
          optimization_applied: false,
          suggestions: ['Prompt déjà optimisé pour cet objectif'],
          current_performance: performanceReport.performance_grade
        };
      }

    } catch (error) {
      console.error(`❌ Auto-optimization failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // MÉTHODES PRIVÉES
  // ============================================================================

  /**
   * Initialisation des helpers par défaut
   */
  private initializeDefaultHelpers(): void {
    // Helper pour nombre de parcelles
    this.templateEngine.addHelper('plotCount', (context: AgentContext) => {
      return context.farm.plots.filter(p => p.is_active).length.toString();
    });

    // Helper pour résumé matériel
    this.templateEngine.addHelper('materialSummary', (context: AgentContext) => {
      const categories = new Map<string, number>();
      context.farm.materials.forEach(m => {
        if (m.is_active) {
          categories.set(m.category, (categories.get(m.category) || 0) + 1);
        }
      });
      
      return Array.from(categories.entries())
        .map(([cat, count]) => `${count} ${cat}`)
        .join(', ');
    });
  }

  /**
   * Hash du contexte pour cache
   */
  private hashContext(context: AgentContext): string {
    const contextKey = `${context.farm.id}_${context.user.id}_${context.farm.plots.length}_${context.farm.materials.length}`;
    // Simple hash pour cache key
    return Buffer.from(contextKey).toString('base64').substring(0, 8);
  }

  /**
   * Gestion intelligente du cache avec taille limitée
   */
  private addToCache(key: string, prompt: ChatPrompt): void {
    // Nettoyer cache si trop plein
    if (this.promptCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanOldCache();
    }

    this.promptCache.set(key, prompt);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL_MS);
  }

  /**
   * Nettoyage cache ancien
   */
  private cleanOldCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (expiry <= now) {
        this.promptCache.delete(key);
        this.cacheExpiry.delete(key);
        cleaned++;
      }
    }

    console.log(`🗑️ Cache cleaned: ${cleaned} expired entries removed`);
  }

  /**
   * Extraction des variables d'un template
   */
  private extractVariables(template: string): string[] {
    const matches = template.match(/\{\{([^}#\/\s]+)\}\}/g) || [];
    return [...new Set(matches.map(match => match.replace(/[{}]/g, '')))];
  }

  /**
   * Extraction des conditions d'un template
   */
  private extractConditions(template: string): string[] {
    const matches = template.match(/\{\{#if\s+(\w+)\}\}/g) || [];
    return [...new Set(matches.map(match => match.match(/\{\{#if\s+(\w+)\}\}/)?.[1] || ''))];
  }

  /**
   * Génération du numéro de version suivant
   */
  private async getNextVersion(name: string): Promise<string> {
    const { data: versions } = await this.supabase
      .from('chat_prompts')
      .select('version')
      .eq('name', name)
      .order('version', { ascending: false })
      .limit(1);

    if (!versions || versions.length === 0) {
      return '1.0';
    }

    const lastVersion = versions[0].version;
    const [major, minor] = lastVersion.split('.').map(Number);
    
    return `${major}.${minor + 1}`;
  }

  /**
   * Vérification d'existence d'un prompt
   */
  private async checkPromptExists(name: string, version: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('chat_prompts')
      .select('id')
      .eq('name', name)
      .eq('version', version)
      .single();

    return !!data;
  }

  /**
   * Validation de cache
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? expiry > Date.now() : false;
  }

  /**
   * Invalidation cache pour un prompt
   */
  private invalidatePromptCache(name: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.promptCache.keys()) {
      if (key.startsWith(name)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.promptCache.delete(key);
      this.cacheExpiry.delete(key);
    });
    
    console.log(`🗑️ Cache invalidated for prompt: ${name}`);
  }

  /**
   * Prompt de fallback en cas d'erreur
   */
  private getFallbackPrompt(name: string): string {
    const fallbacks: Record<string, string> = {
      'thomas_agent_system': 'Tu es Thomas, assistant agricole français. Aide l\'utilisateur avec ses questions et actions agricoles.',
      'tool_selection': 'Analyse le message et retourne les tools appropriés en JSON.',
      'intent_classification': 'Classifie l\'intention du message agricole.'
    };

    return fallbacks[name] || 'Tu es un assistant agricole utile.';
  }

  /**
   * Récupération version précédente
   */
  private async getPreviousVersion(name: string, currentVersion: string): Promise<ChatPrompt | null> {
    const { data: versions } = await this.supabase
      .from('chat_prompts')
      .select('*')
      .eq('name', name)
      .neq('version', currentVersion)
      .order('version', { ascending: false })
      .limit(1);

    return versions && versions.length > 0 ? versions[0] : null;
  }

  /**
   * Récupération version actuelle
   */
  private async getCurrentVersion(name: string): Promise<string> {
    const { data: prompt } = await this.supabase
      .from('chat_prompts')
      .select('version')
      .eq('name', name)
      .eq('is_active', true)
      .single();

    return prompt?.version || '1.0';
  }

  /**
   * Raccourcissement d'un prompt pour performance
   */
  private shortenPrompt(content: string): string {
    // Suppression des sections moins critiques
    let shortened = content
      .replace(/## 📖.*?(?=##|$)/s, '') // Supprimer exemples détaillés
      .replace(/### Exemples.*?(?=###|##|$)/s, '') // Supprimer exemples
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Réduire espaces multiples
      .trim();

    return shortened.length > 2000 ? shortened.substring(0, 2000) + '...' : shortened;
  }

  /**
   * Ajout d'exemples spécialisés
   */
  private addMoreExamples(content: string, report: any): string {
    // Identifier les cas d'échec fréquents et ajouter exemples
    if (report.most_used_tools.some((tool: any) => tool.tool === 'help')) {
      const helpExamples = `

## 💡 Exemples Supplémentaires - Questions Fréquentes
- "Comment créer une parcelle ?" → Guide configuration
- "Où voir mes tâches ?" → Navigation interface  
- "Problème avec conversion" → Aide configuration conversions`;

      return content + helpExamples;
    }

    return content;
  }

  /**
   * Compaction d'un prompt pour efficacité tokens
   */
  private compactPrompt(content: string): string {
    return content
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Supprimer bold markdown
      .replace(/- /g, '• ') // Raccourcir listes
      .replace(/\n\s*\n/g, '\n') // Une seule ligne vide
      .replace(/(?:Exemple|Example)s?\s*:?/gi, 'Ex:') // Raccourcir "Exemples"
      .trim();
  }

  /**
   * Calcul note de performance
   */
  private calculatePerformanceGrade(successRate: number, avgTime: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    // Pondération succès (70%) + performance (30%)
    const successScore = successRate * 0.7;
    const timeScore = avgTime < 1000 ? 0.3 : avgTime < 3000 ? 0.2 : avgTime < 5000 ? 0.1 : 0;
    const totalScore = successScore + timeScore;

    if (totalScore >= 0.9) return 'A';
    if (totalScore >= 0.8) return 'B'; 
    if (totalScore >= 0.7) return 'C';
    if (totalScore >= 0.6) return 'D';
    return 'F';
  }

  /**
   * Analyse des tendances
   */
  private analyzeTrends(executions: any[]): { success_rate_trend: string; performance_trend: string } {
    // Pour MVP, retour statique - à implémenter avec vraies données
      return {
        success_rate_trend: 'stable' as const,
        performance_trend: 'stable' as const
      };
  }

  /**
   * Génération recommandations performance
   */
  private generatePerformanceRecommendations(
    successRate: number,
    avgTime: number,
    toolUsage: Map<string, number>
  ): string[] {
    const recommendations: string[] = [];

    if (successRate < 0.8) {
      recommendations.push('🎯 Améliorer taux de succès - revoir prompts système');
    }

    if (avgTime > 3000) {
      recommendations.push('⚡ Optimiser performance - compacter prompts');
    }

    if (toolUsage.get('help') || 0 > toolUsage.size * 0.3) {
      recommendations.push('❓ Beaucoup de demandes d\'aide - améliorer clarté prompts');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Performance optimale - continuer surveillance');
    }

    return recommendations;
  }

  /**
   * Stats du gestionnaire pour monitoring
   */
  getManagerStats(): PromptManagerStats {
    return {
      cache_size: this.promptCache.size,
      template_cache_size: this.templateCache.size,
      cache_hit_rate: 0, // TODO: Implémenter tracking
      active_prompts_count: 0, // TODO: Requête DB
      avg_render_time_ms: 0 // TODO: Tracking
    };
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface PromptUpdateResult {
  success: boolean;
  new_version?: string;
  new_prompt_id?: string;
  test_results?: any;
  errors?: string[];
  warnings?: string[];
}

interface DeploymentResult {
  deployed: number;
  skipped: number;
  errors: string[];
}

interface ABTestResult {
  prompt_name: string;
  version_a: string;
  version_b: string;
  winner: string;
  confidence: number;
  performance_delta: {
    success_rate: number;
    avg_score: number;
    avg_execution_time: number;
    token_usage: number;
  };
  statistical_significance: boolean;
  recommendation: string;
  next_action: string;
}

interface OptimizationResult {
  success: boolean;
  optimization_applied: boolean;
  suggestions: string[];
  new_version?: string;
  test_results?: any;
  current_performance?: string;
  error?: string;
}

interface PerformanceReport {
  prompt_name: string;
  period_days: number;
  total_executions: number;
  success_rate: number;
  avg_processing_time_ms: number;
  most_used_tools: Array<{ tool: string; count: number }>;
  performance_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trends: {
    success_rate_trend: 'improving' | 'stable' | 'declining';
    performance_trend: 'faster' | 'stable' | 'slower';
  };
  recommendations: string[];
}

interface PromptManagerStats {
  cache_size: number;
  template_cache_size: number; 
  cache_hit_rate: number;
  active_prompts_count: number;
  avg_render_time_ms: number;
}
