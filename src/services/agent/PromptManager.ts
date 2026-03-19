import { SupabaseClient } from '@supabase/supabase-js';
import { ChatPrompt, AgentContext } from './types/AgentTypes';
import { 
  PromptTemplate, 
  PromptTemplateFactory,
  THOMAS_AGENT_SYSTEM_TEMPLATE,
  TOOL_SELECTION_TEMPLATE,
  INTENT_CLASSIFICATION_TEMPLATE 
} from './prompts/PromptTemplates';

/**
 * Gestionnaire des prompts système avec versioning et cache
 * Implémente la gestion des prompts modifiables selon roadmap
 */
export class PromptManager {
  private promptCache = new Map<string, ChatPrompt>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor(private supabase: SupabaseClient) {}

  /**
   * Récupération d'un prompt système avec template intelligent
   */
  async getSystemPrompt(name: string, version?: string, context?: AgentContext): Promise<ChatPrompt> {
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
        // Récupérer la dernière version
        query = query.order('version', { ascending: false }).limit(1);
      }

      const { data: prompt, error } = await query.single();

      if (error || !prompt) {
        throw new Error(`Prompt ${name} (version: ${version || 'latest'}) non trouvé`);
      }

      // Mise en cache
      this.promptCache.set(cacheKey, prompt);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL_MS);

      console.log(`📝 Prompt loaded: ${name} v${prompt.version}`);
      return prompt;

    } catch (error) {
      console.error(`❌ Error loading prompt ${name}:`, error);
      
      // Fallback vers prompt par défaut si disponible
      return this.getFallbackPrompt(name);
    }
  }

  /**
   * Construction de prompt avec variables contextuelles
   * Template engine simple pour personnalisation
   */
  buildPromptWithContext(template: string, context: AgentContext): string {
    let prompt = template;

    // Variables de base
    prompt = prompt.replace(/\{\{farm_name\}\}/g, context.farm.name);
    prompt = prompt.replace(/\{\{user_name\}\}/g, context.user.name);
    prompt = prompt.replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString('fr-FR'));

    // Contexte agricole
    prompt = prompt.replace(/\{\{farm_context\}\}/g, this.formatFarmContext(context.farm));
    prompt = prompt.replace(/\{\{farm_context_summary\}\}/g, this.formatFarmContextCompact(context.farm));
    prompt = prompt.replace(/\{\{available_tools\}\}/g, this.formatAvailableTools(context.availableTools));

    // Exemples few-shot dynamiques
    if (prompt.includes('{{few_shot_examples}}')) {
      const examples = this.selectRelevantExamples(context);
      prompt = prompt.replace(/\{\{few_shot_examples\}\}/g, examples);
    }

    return prompt;
  }

  /**
   * Mise à jour d'un prompt avec versioning
   */
  async updatePrompt(
    name: string,
    content: string,
    examples: any[] = [],
    metadata: Record<string, any> = {}
  ): Promise<void> {
    
    try {
      console.log(`📝 Updating prompt: ${name}`);

      // 1. Désactiver l'ancienne version
      await this.supabase
        .from('chat_prompts')
        .update({ is_active: false })
        .eq('name', name)
        .eq('is_active', true);

      // 2. Créer nouvelle version
      const newVersion = await this.getNextVersion(name);
      
      const { error } = await this.supabase
        .from('chat_prompts')
        .insert({
          name,
          content,
          examples,
          version: newVersion,
          is_active: true,
          metadata: {
            ...metadata,
            updated_by: 'thomas_agent',
            updated_reason: 'Version update'
          }
        });

      if (error) {
        throw new Error(`Échec mise à jour prompt: ${error.message}`);
      }

      // 3. Invalider cache
      this.invalidateCache(name);
      
      console.log(`✅ Prompt ${name} updated to version ${newVersion}`);

    } catch (error) {
      console.error(`❌ Error updating prompt ${name}:`, error);
      throw error;
    }
  }

  /**
   * Formatage du contexte ferme pour les prompts
   */
  private formatFarmContext(farm: any): string {
    const context = [
      `Exploitation: ${farm.name}`,
      `Parcelles (${farm.plots.length}): ${farm.plots.slice(0, 5).map((p: any) => p.name).join(', ')}${farm.plots.length > 5 ? '...' : ''}`,
      `Matériels (${farm.materials.length}): ${farm.materials.slice(0, 3).map((m: any) => m.name).join(', ')}${farm.materials.length > 3 ? '...' : ''}`,
      `Conversions: ${farm.conversions.length} configurée(s)`
    ];

    return context.join('\n');
  }

  /**
   * Formatage des tools disponibles pour les prompts
   */
  private formatAvailableTools(tools: string[]): string {
    return tools.map(tool => `- ${tool}`).join('\n');
  }

  /**
   * Sélection d'exemples pertinents selon le contexte
   */
  private selectRelevantExamples(context: AgentContext): string {
    // Pour MVP, utiliser exemples statiques
    // Sera étendu avec sélection intelligente
    
    const baseExamples = [
      {
        input: "j'ai observé des pucerons sur mes tomates serre 1",
        expected: "Observation créée: pucerons sur tomates (Serre 1)"
      },
      {
        input: "j'ai récolté 3 caisses de courgettes",
        expected: "Tâche créée: récolte 15kg courgettes (conversion appliquée)"
      }
    ];

    return baseExamples
      .map(ex => `Entrée: "${ex.input}"\nSortie: "${ex.expected}"`)
      .join('\n\n');
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
   * Prompt de fallback en cas d'erreur
   */
  private getFallbackPrompt(name: string): ChatPrompt {
    const fallbackPrompts: Record<string, ChatPrompt> = {
      'thomas_agent_system': {
        id: 'fallback_system',
        name: 'thomas_agent_system',
        content: 'Tu es Thomas, assistant agricole français. Aide l\'utilisateur avec ses questions agricoles.',
        examples: [],
        version: 'fallback',
        is_active: true,
        metadata: { type: 'fallback' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    return fallbackPrompts[name] || fallbackPrompts['thomas_agent_system'];
  }

  /**
   * Validation de cache
   */
  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry ? expiry > Date.now() : false;
  }

  /**
   * Invalidation du cache pour un prompt
   */
  private invalidateCache(name: string): void {
    // Supprimer toutes les versions en cache de ce prompt
    for (const key of this.promptCache.keys()) {
      if (key.startsWith(`${name}_`)) {
        this.promptCache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
    
    console.log(`🗑️ Cache invalidated for prompt: ${name}`);
  }

  /**
   * Statistiques du cache
   */
  getCacheStats(): { size: number; expired: number } {
    const now = Date.now();
    let expired = 0;
    
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (expiry <= now) {
        expired++;
      }
    }

    return {
      size: this.promptCache.size,
      expired
    };
  }

  // ============================================================================
  // MÉTHODES AVANCÉES - PHASE 5
  // ============================================================================

  /**
   * Sélection intelligente de template selon contexte
   */
  async getOptimalTemplate(
    templateName: string,
    context: AgentContext
  ): Promise<PromptTemplate> {
    console.log(`🎯 Selecting optimal template: ${templateName}`);
    
    // Utiliser factory pour sélection contextuelle
    const template = PromptTemplateFactory.selectTemplate(templateName, context);
    
    // Vérifier si template personnalisé existe en base
    const customTemplate = await this.getCustomTemplate(templateName, context);
    if (customTemplate) {
      return this.mergeTemplates(template, customTemplate);
    }

    return template;
  }

  /**
   * Construction de prompt avec template complet
   */
  async buildAdvancedPrompt(
    templateName: string,
    context: AgentContext,
    additionalVariables?: Record<string, string>
  ): Promise<string> {
    
    // Récupérer template optimal
    const template = await this.getOptimalTemplate(templateName, context);
    
    // Variables de contexte étendues
    const variables = {
      ...this.buildContextVariables(context),
      ...additionalVariables
    };

    // Construction avec toutes les variables
    let prompt = template.template;
    
    // Remplacer toutes les variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      prompt = prompt.replace(regex, value);
    }

    // Ajouter exemples contextuels
    if (prompt.includes('{{few_shot_examples}}')) {
      const examples = PromptTemplateFactory.generateContextualExamples(context);
      prompt = prompt.replace(/\{\{few_shot_examples\}\}/g, examples);
    }

    console.log(`✅ Advanced prompt built for ${templateName} (${prompt.length} chars)`);
    return prompt;
  }

  /**
   * Test d'un template avec cas de test
   */
  async testTemplate(
    template: PromptTemplate,
    testCases: TemplateTestCase[],
    context: AgentContext
  ): Promise<TemplateTestResults> {
    
    console.log(`🧪 Testing template: ${template.name}`);
    const results: TemplateTestResult[] = [];

    for (const testCase of testCases) {
      const testStartTime = Date.now();
      
      try {
        // Construire prompt avec contexte de test
        const builtPrompt = await this.buildAdvancedPrompt(
          template.name,
          { ...context, ...testCase.context_override }
        );

        // Simuler exécution (pour MVP, pas d'appel OpenAI réel)
        const simulatedResponse = this.simulateAgentResponse(builtPrompt, testCase);

        // Évaluer le résultat
        const evaluation = this.evaluateTemplateResponse(
          simulatedResponse,
          testCase.expected_outcome
        );

        results.push({
          test_case: testCase.name,
          input: testCase.user_input,
          expected: testCase.expected_outcome,
          actual: simulatedResponse,
          score: evaluation.score,
          passed: evaluation.passed,
          execution_time_ms: Date.now() - testStartTime,
          issues: evaluation.issues
        });

      } catch (error) {
        results.push({
          test_case: testCase.name,
          input: testCase.user_input,
          error: error.message,
          passed: false,
          execution_time_ms: Date.now() - testStartTime,
          issues: [`Erreur d'exécution: ${error.message}`]
        });
      }
    }

    const passedTests = results.filter(r => r.passed).length;
    const averageScore = results
      .filter(r => r.score !== undefined)
      .reduce((sum, r) => sum + r.score!, 0) / results.length || 0;

    const testResults: TemplateTestResults = {
      template_name: template.name,
      template_version: template.version,
      total_tests: testCases.length,
      passed_tests: passedTests,
      success_rate: passedTests / testCases.length,
      average_score: averageScore,
      total_execution_time_ms: results.reduce((sum, r) => sum + r.execution_time_ms, 0),
      results,
      recommendations: this.generateTestRecommendations(results)
    };

    console.log(`✅ Template testing completed:`, {
      template: template.name,
      success_rate: `${Math.round(testResults.success_rate * 100)}%`,
      avg_score: Math.round(averageScore * 100),
      total_time: `${testResults.total_execution_time_ms}ms`
    });

    return testResults;
  }

  /**
   * Optimisation d'un template basée sur les résultats de test
   */
  async optimizeTemplate(
    templateName: string,
    testResults: TemplateTestResults,
    context: AgentContext
  ): Promise<PromptTemplate> {
    
    console.log(`🔧 Optimizing template: ${templateName}`);
    
    const originalTemplate = await this.getOptimalTemplate(templateName, context);
    let optimizedTemplate = { ...originalTemplate };

    // Analyse des échecs pour optimisation
    const failedResults = testResults.results.filter(r => !r.passed);
    
    if (failedResults.length > 0) {
      // Optimisations basées sur les échecs
      const commonIssues = this.analyzeCommonIssues(failedResults);
      
      // Ajuster template selon les problèmes identifiés
      if (commonIssues.includes('entity_extraction')) {
        optimizedTemplate = this.enhanceEntityExtraction(optimizedTemplate);
      }
      
      if (commonIssues.includes('tool_selection')) {
        optimizedTemplate = this.enhanceToolSelection(optimizedTemplate);
      }
      
      if (commonIssues.includes('response_quality')) {
        optimizedTemplate = this.enhanceResponseQuality(optimizedTemplate);
      }
    }

    // Incrémenter version
    const [major, minor] = optimizedTemplate.version.split('.').map(Number);
    optimizedTemplate.version = `${major}.${minor + 1}`;
    
    // Ajouter métadonnées d'optimisation
    optimizedTemplate.metadata = {
      ...optimizedTemplate.metadata,
      optimized_from: originalTemplate.version,
      optimization_reason: `Optimisation basée sur ${failedResults.length} échecs de test`,
      optimization_date: new Date().toISOString()
    };

    console.log(`✅ Template optimized: ${templateName} → v${optimizedTemplate.version}`);
    return optimizedTemplate;
  }

  // ============================================================================
  // MÉTHODES PRIVÉES AVANCÉES
  // ============================================================================

  /**
   * Construction des variables de contexte étendues
   */
  private buildContextVariables(context: AgentContext): Record<string, string> {
    return {
      // Variables de base existantes
      'farm_name': context.farm.name,
      'user_name': context.user.name,
      'current_date': new Date().toLocaleDateString('fr-FR'),
      
      // Variables étendues
      'farm_type': 'maraîchage', // TODO: récupérer du contexte
      'farm_context': this.formatFarmContext(context.farm),
      'farm_context_compact': this.formatFarmContextCompact(context.farm),
      'farm_context_summary': this.formatFarmContextCompact(context.farm),
      'available_tools_formatted': this.formatAvailableToolsAdvanced(context.availableTools),
      'available_tools_with_descriptions': this.formatToolsWithDescriptions(context.availableTools),
      
      // Variables statistiques
      'plots_count': context.farm.plots.length.toString(),
      'materials_count': context.farm.materials.length.toString(),
      'conversions_count': context.farm.conversions.length.toString(),
      
      // Variables temporelles
      'current_season': this.getCurrentSeason(),
      'current_month': new Date().toLocaleDateString('fr-FR', { month: 'long' })
    };
  }

  /**
   * Formatage compact du contexte ferme
   */
  private formatFarmContextCompact(farm: any): string {
    return `${farm.plots.length} parcelles, ${farm.materials.length} matériels, ${farm.conversions.length} conversions`;
  }

  /**
   * Formatage avancé des tools avec descriptions
   */
  private formatAvailableToolsAdvanced(tools: string[]): string {
    const toolDescriptions: Record<string, string> = {
      'create_observation': '👁️ Créer observations terrain',
      'create_task_done': '✅ Enregistrer tâches réalisées', 
      'create_task_planned': '📅 Planifier tâches futures',
      'create_harvest': '🌾 Récoltes avec métriques',
      'manage_plot': '🏗️ Gérer parcelles',
      'help': '❓ Aide et assistance'
    };

    return tools
      .map(tool => `- **${tool}**: ${toolDescriptions[tool] || 'Tool spécialisé'}`)
      .join('\n');
  }

  /**
   * Formatage tools avec descriptions complètes
   */
  private formatToolsWithDescriptions(tools: string[]): string {
    // TODO: Récupérer vraies descriptions des tools depuis registry
    return this.formatAvailableToolsAdvanced(tools);
  }

  /**
   * Détermination de la saison actuelle
   */
  private getCurrentSeason(): string {
    const month = new Date().getMonth(); // 0-11
    
    if (month >= 2 && month <= 4) return 'Printemps';
    if (month >= 5 && month <= 7) return 'Été';  
    if (month >= 8 && month <= 10) return 'Automne';
    return 'Hiver';
  }

  /**
   * Récupération de template personnalisé de la base
   */
  private async getCustomTemplate(
    templateName: string,
    context: AgentContext
  ): Promise<PromptTemplate | null> {
    
    try {
      // Rechercher template personnalisé pour cette ferme
      const { data: customPrompt } = await this.supabase
        .from('chat_prompts')
        .select('*')
        .eq('name', `${templateName}_farm_${context.farm.id}`)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (customPrompt) {
        return {
          name: customPrompt.name,
          version: customPrompt.version,
          description: `Template personnalisé pour ${context.farm.name}`,
          template: customPrompt.content,
          variables: {},
          examples: customPrompt.examples || [],
          metadata: customPrompt.metadata || {}
        };
      }

    } catch (error) {
      // Pas de template personnalisé trouvé, pas grave
    }

    return null;
  }

  /**
   * Fusion de templates (base + personnalisation)
   */
  private mergeTemplates(
    baseTemplate: PromptTemplate,
    customTemplate: PromptTemplate
  ): PromptTemplate {
    
    return {
      ...baseTemplate,
      template: customTemplate.template || baseTemplate.template,
      examples: [...baseTemplate.examples, ...(customTemplate.examples || [])],
      metadata: {
        ...baseTemplate.metadata,
        ...customTemplate.metadata,
        merged_from: [baseTemplate.version, customTemplate.version]
      }
    };
  }

  /**
   * Simulation de réponse agent (pour tests sans OpenAI)
   */
  private simulateAgentResponse(
    prompt: string,
    testCase: TemplateTestCase
  ): string {
    
    // Simulation simple basée sur le type de test case
    const input = testCase.user_input.toLowerCase();
    
    if (input.includes('observé') || input.includes('remarqué')) {
      return `Observation créée pour le problème mentionné. Parcelle identifiée avec confiance élevée.`;
    }
    
    if (input.includes('récolté') || input.includes('ramassé')) {
      return `Récolte enregistrée avec conversion automatique appliquée. Quantité calculée selon vos paramètres.`;
    }
    
    if (input.includes('planifier') || input.includes('demain')) {
      return `Tâche planifiée avec succès. Date analysée et ajoutée à votre agenda.`;
    }
    
    if (input.includes('comment') || input.includes('aide')) {
      return `Voici les étapes pour réaliser cette action...`;
    }
    
    return `Action traitée selon votre message. Résultat enregistré dans votre exploitation.`;
  }

  /**
   * Évaluation d'une réponse de template
   */
  private evaluateTemplateResponse(
    actualResponse: string,
    expectedOutcome: TemplateExpectedOutcome
  ): TemplateEvaluation {
    
    const evaluation: TemplateEvaluation = {
      score: 0.5, // Score de base
      passed: false,
      issues: []
    };

    // Critères d'évaluation
    const criteria = {
      language_french: this.checkFrenchLanguage(actualResponse),
      tone_professional: this.checkProfessionalTone(actualResponse),
      includes_key_concepts: this.checkKeyConcepts(actualResponse, expectedOutcome),
      appropriate_length: this.checkAppropriateLength(actualResponse),
      clear_actionable: this.checkActionableClear(actualResponse)
    };

    // Calcul du score
    const passedCriteria = Object.values(criteria).filter(Boolean).length;
    evaluation.score = passedCriteria / Object.keys(criteria).length;
    evaluation.passed = evaluation.score >= 0.8;

    // Identification des problèmes
    if (!criteria.language_french) evaluation.issues.push('Réponse non en français');
    if (!criteria.tone_professional) evaluation.issues.push('Ton non professionnel');
    if (!criteria.includes_key_concepts) evaluation.issues.push('Concepts clés manquants');
    if (!criteria.appropriate_length) evaluation.issues.push('Longueur inappropriée');
    if (!criteria.clear_actionable) evaluation.issues.push('Instructions peu claires');

    return evaluation;
  }

  /**
   * Analyse des problèmes récurrents dans les tests
   */
  private analyzeCommonIssues(failedResults: TemplateTestResult[]): string[] {
    const issueCount = new Map<string, number>();
    
    failedResults.forEach(result => {
      result.issues.forEach(issue => {
        issueCount.set(issue, (issueCount.get(issue) || 0) + 1);
      });
    });

    // Retourner issues les plus fréquents
    return Array.from(issueCount.entries())
      .filter(([_, count]) => count >= 2) // Au moins 2 occurrences
      .sort((a, b) => b[1] - a[1])
      .map(([issue, _]) => issue)
      .slice(0, 5);
  }

  /**
   * Génération de recommandations d'optimisation
   */
  private generateTestRecommendations(results: TemplateTestResult[]): string[] {
    const recommendations: string[] = [];
    
    const failureRate = results.filter(r => !r.passed).length / results.length;
    const avgScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;

    if (failureRate > 0.3) {
      recommendations.push('🔴 Taux d\'échec élevé - réviser les instructions de base');
    }

    if (avgScore < 0.7) {
      recommendations.push('🟡 Score moyen faible - améliorer exemples et clarté');
    }

    const avgTime = results.reduce((sum, r) => sum + r.execution_time_ms, 0) / results.length;
    if (avgTime > 2000) {
      recommendations.push('⏱️ Temps d\'exécution élevé - simplifier le template');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Template performant - optimisations mineures possibles');
    }

    return recommendations;
  }

  /**
   * Sauvegarde d'un template optimisé en base
   */
  async saveOptimizedTemplate(
    template: PromptTemplate,
    context: AgentContext
  ): Promise<void> {
    
    try {
      console.log(`💾 Saving optimized template: ${template.name}`);
      
      // Créer nouvelle version en base
      await this.updatePrompt(
        template.name,
        template.template,
        template.examples,
        {
          ...template.metadata,
          farm_id: context.farm.id,
          optimized: true,
          saved_by: 'thomas_agent_optimizer'
        }
      );
      
      console.log(`✅ Optimized template saved: ${template.name} v${template.version}`);
      
    } catch (error) {
      console.error(`❌ Failed to save optimized template:`, error);
      throw error;
    }
  }

  // Méthodes d'évaluation (simplifiées pour MVP)
  private checkFrenchLanguage(text: string): boolean {
    const frenchIndicators = ['le ', 'la ', 'des ', 'avec', 'dans', 'sur', 'pour'];
    return frenchIndicators.some(indicator => text.toLowerCase().includes(indicator));
  }

  private checkProfessionalTone(text: string): boolean {
    const unprofessional = ['lol', 'mddr', '!!!!!', 'bizarre'];
    return !unprofessional.some(word => text.toLowerCase().includes(word));
  }

  private checkKeyConcepts(text: string, expected: TemplateExpectedOutcome): boolean {
    if (!expected.key_concepts) return true;
    return expected.key_concepts.some(concept => text.toLowerCase().includes(concept.toLowerCase()));
  }

  private checkAppropriateLength(text: string): boolean {
    return text.length >= 20 && text.length <= 500; // Longueur raisonnable
  }

  private checkActionableClear(text: string): boolean {
    const actionableIndicators = ['créé', 'enregistré', 'planifié', 'vous pouvez'];
    return actionableIndicators.some(indicator => text.toLowerCase().includes(indicator));
  }

  // Méthodes d'amélioration template (basiques pour MVP)
  private enhanceEntityExtraction(template: PromptTemplate): PromptTemplate {
    return {
      ...template,
      template: template.template + '\n\n**Focus spécial** : Bien identifier cultures, parcelles, et quantités.'
    };
  }

  private enhanceToolSelection(template: PromptTemplate): PromptTemplate {
    return {
      ...template,
      template: template.template + '\n\n**Sélection tools** : Privilégier spécialisation (HarvestTool vs TaskDoneTool).'
    };
  }

  private enhanceResponseQuality(template: PromptTemplate): PromptTemplate {
    return {
      ...template,
      template: template.template + '\n\n**Réponses** : Être concis, précis, et confirmer les actions réalisées.'
    };
  }
}
