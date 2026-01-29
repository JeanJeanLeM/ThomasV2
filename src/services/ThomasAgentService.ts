import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AgentContextService } from './agent/AgentContextService';
import { ToolRegistry } from './agent/ToolRegistry';
import { 
  AgentContext, 
  AgentResponse, 
  MessageIntent, 
  ToolResult, 
  ToolPlan,
  ChatAnalyzedAction,
  ChatMessageAnalysis,
  ChatAgentExecution
} from './agent/types/AgentTypes';

/**
 * Agent IA principal suivant les patterns Anthropic
 * Implémente: "LLMs autonomously using tools in a loop"
 * 
 * Architecture basée sur:
 * - Context Engineering optimisé
 * - Tool selection autonome  
 * - Error recovery et fallbacks
 * - Performance monitoring
 */
export class ThomasAgentService {
  private contextService: AgentContextService;
  private toolRegistry: ToolRegistry;
  private openAIApiKey: string;

  constructor(
    private supabase: SupabaseClient,
    openAIApiKey: string
  ) {
    this.contextService = new AgentContextService(supabase);
    this.toolRegistry = new ToolRegistry();
    this.openAIApiKey = openAIApiKey;
    
    console.log('🤖 Thomas Agent Service initialized');
  }

  /**
   * Point d'entrée principal - traitement d'un message utilisateur
   * Implémente le loop agent autonome selon Anthropic
   */
  async processMessage(
    message: string,
    sessionId: string, 
    userId: string,
    farmId: number
  ): Promise<AgentResponse> {
    
    const startTime = Date.now();
    let analysisId: string | undefined;

    try {
      console.log('🚀 Processing message:', { message, sessionId, userId, farmId });

      // 1. Context Engineering - Construction du contexte optimal
      const context = await this.contextService.buildContext(
        userId, 
        farmId, 
        sessionId
      );

      // 2. Message Analysis - Analyse et stockage
      const analysis = await this.analyzeMessage(message, context);
      analysisId = analysis.id;
      context.analysis_id = analysisId;

      // 3. Intent Classification - Déterminer l'intention
      const intent = await this.classifyIntent(message, context);

      // 4. Tool Selection - L'agent choisit ses tools
      const toolPlans = await this.selectTools(message, intent, context);

      // 5. Tool Execution Loop - Exécution autonome des tools
      const toolResults = await this.executeToolsLoop(toolPlans, message, context);

      // 6. Response Synthesis - Synthèse de la réponse finale
      const response = await this.synthesizeResponse(toolResults, context, intent);

      // 7. Execution Logging - Log complet de l'exécution
      await this.logExecution({
        session_id: sessionId,
        user_id: userId,
        farm_id: farmId,
        message,
        intent_detected: intent.intent,
        tools_used: toolPlans.map(tp => tp.tool_name),
        execution_steps: toolResults,
        final_response: response.content,
        processing_time_ms: Date.now() - startTime,
        success: response.success
      });

      return response;

    } catch (error) {
      console.error('❌ Agent processing error:', error);
      
      // Fallback conversationnel en cas d'erreur
      const fallbackResponse = await this.generateFallbackResponse(message, error);
      
      // Log de l'erreur
      await this.logExecution({
        session_id: sessionId,
        user_id: userId,
        farm_id: farmId,
        message,
        tools_used: [],
        execution_steps: [],
        final_response: fallbackResponse.content,
        processing_time_ms: Date.now() - startTime,
        success: false,
        error_message: error.message
      });

      return fallbackResponse;
    }
  }

  /**
   * Analyse du message utilisateur et stockage
   */
  private async analyzeMessage(
    message: string, 
    context: AgentContext
  ): Promise<ChatMessageAnalysis> {
    
    console.log('🧠 Analyzing message...');
    const startTime = Date.now();

    // Analyse basique pour l'instant (sera enrichie)
    const analysisResult = {
      message_length: message.length,
      language_detected: 'fr',
      entities_count: this.countEntities(message),
      complexity_score: this.calculateComplexity(message)
    };

    // Stockage de l'analyse
    const { data: analysis, error } = await this.supabase
      .from('chat_message_analyses')
      .insert({
        session_id: context.session_id,
        message_id: context.session_id, // TODO: obtenir le vrai message_id
        user_message: message,
        analysis_result: analysisResult,
        confidence_score: 0.8, // Score par défaut, sera amélioré
        processing_time_ms: Date.now() - startTime,
        model_used: 'thomas_agent_v1'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error storing analysis:', error);
      throw new Error('Échec du stockage de l\'analyse');
    }

    return analysis;
  }

  /**
   * Classification de l'intention du message
   * Logique simplifiée pour MVP, sera remplacée par OpenAI
   */
  private async classifyIntent(
    message: string, 
    context: AgentContext
  ): Promise<MessageIntent> {
    
    console.log('🔍 Classifying intent...');
    
    // Classification basique par mots-clés (sera remplacée par LLM)
    const messageL = message.toLowerCase();
    
    let intent: MessageIntent['intent'] = 'unclear';
    let confidence = 0.6;
    
    if (messageL.includes('observé') || messageL.includes('remarqué') || messageL.includes('constaté')) {
      intent = 'observation_creation';
      confidence = 0.85;
    } else if (messageL.includes('récolté') || messageL.includes('ramassé')) {
      intent = 'harvest';
      confidence = 0.9;
    } else if (messageL.includes('planté') || messageL.includes('semé') || messageL.includes('fait') || messageL.includes('terminé')) {
      intent = 'task_done';
      confidence = 0.8;
    } else if (messageL.includes('demain') || messageL.includes('prévu') || messageL.includes('planifier')) {
      intent = 'task_planned';  
      confidence = 0.75;
    } else if (messageL.includes('comment') || messageL.includes('aide') || messageL.includes('?')) {
      intent = 'help';
      confidence = 0.9;
    }

    return {
      intent,
      confidence,
      reasoning: `Classification basée sur mots-clés: ${intent}`,
      entities_detected: this.extractEntities(message)
    };
  }

  /**
   * Sélection des tools selon l'intention
   * L'agent décide de façon autonome
   */
  private async selectTools(
    message: string,
    intent: MessageIntent,
    context: AgentContext  
  ): Promise<ToolPlan[]> {
    
    console.log('🛠️ Selecting tools...');
    
    const selectedTools = await this.toolRegistry.selectTools(message, intent.intent, context);
    
    // Conversion en plans d'exécution
    const toolPlans: ToolPlan[] = selectedTools.map(toolName => ({
      tool_name: toolName,
      confidence: intent.confidence,
      parameters: this.extractToolParameters(message, toolName, context),
      reasoning: `Tool sélectionné pour intent: ${intent.intent}`
    }));

    return toolPlans;
  }

  /**
   * Boucle d'exécution des tools de façon autonome
   * Pattern Anthropic: "agents maintain control over how they accomplish tasks"
   */
  private async executeToolsLoop(
    toolPlans: ToolPlan[],
    message: string,
    context: AgentContext
  ): Promise<ToolResult[]> {
    
    console.log('⚡ Executing tools loop...');
    const results: ToolResult[] = [];
    
    for (const plan of toolPlans) {
      const startTime = Date.now();
      
      try {
        const tool = this.toolRegistry.getTool(plan.tool_name);
        if (!tool) {
          console.error(`❌ Tool ${plan.tool_name} not found`);
          results.push({
            success: false,
            error: `Tool ${plan.tool_name} non disponible`
          });
          continue;
        }

        // Exécution du tool
        const result = await tool.execute(plan.parameters, context);
        
        // Mise à jour des métriques
        this.toolRegistry.updateToolMetrics(
          plan.tool_name,
          result.success,
          Date.now() - startTime,
          result.confidence
        );

        results.push(result);

        console.log(`✅ Tool ${plan.tool_name} executed:`, { 
          success: result.success,
          confidence: result.confidence
        });

      } catch (error) {
        console.error(`❌ Tool ${plan.tool_name} error:`, error);
        
        results.push({
          success: false,
          error: error.message,
          recovery_suggestions: [
            'Vérifier les paramètres du tool',
            'Réessayer avec des données différentes'
          ]
        });

        // Métriques d'échec
        this.toolRegistry.updateToolMetrics(
          plan.tool_name,
          false,
          Date.now() - startTime
        );
      }
    }

    return results;
  }

  /**
   * Synthèse de la réponse finale
   * Transformation des résultats tools en réponse utilisateur
   */
  private async synthesizeResponse(
    toolResults: ToolResult[],
    context: AgentContext,
    intent: MessageIntent
  ): Promise<AgentResponse> {
    
    console.log('📝 Synthesizing response...');

    const successfulResults = toolResults.filter(r => r.success);
    const failedResults = toolResults.filter(r => !r.success);
    
    // Construction de la réponse
    let content = '';
    const actions: any[] = [];
    
    if (successfulResults.length > 0) {
      // Réponse de succès
      const messages = successfulResults
        .map(r => r.message)
        .filter(m => m)
        .join(' ');
      
      content = messages || 'Actions traitées avec succès.';
      
      // Extraction des actions créées
      successfulResults.forEach((result, index) => {
        if (result.data) {
          actions.push({
            id: `action_${index}`,
            type: this.inferActionType(intent.intent),
            title: result.message || 'Action créée',
            data: result.data,
            confidence: result.confidence || 0.8,
            status: 'created'
          });
        }
      });

    } else {
      // Réponse d'échec avec suggestions
      content = 'Je n\'ai pas pu traiter votre message. ';
      
      if (failedResults.length > 0) {
        const errors = failedResults.map(r => r.error).join(', ');
        content += errors;
      }
    }

    return {
      type: successfulResults.length > 0 ? 'actions' : 'error',
      content,
      actions,
      success: successfulResults.length > 0,
      suggestions: this.generateContextualSuggestions(context, intent),
      processing_time_ms: Date.now() - Date.now(), // Sera recalculé au niveau pipeline
      confidence: this.calculateOverallConfidence(toolResults)
    };
  }

  /**
   * Génération de réponse de fallback en cas d'erreur
   */
  private async generateFallbackResponse(message: string, error: Error): Promise<AgentResponse> {
    console.log('🔄 Generating fallback response...');
    
    const errorType = this.categorizeError(error);
    
    const fallbackMessages: Record<string, string> = {
      'database_error': 'Problème de connexion à la base de données. Veuillez réessayer.',
      'validation_error': 'Les informations fournies ne sont pas valides. Pouvez-vous préciser?',
      'context_error': 'Impossible de charger le contexte de votre ferme. Vérifiez votre connexion.',
      'tool_error': 'Erreur technique lors du traitement. Reformulez votre demande.',
      'unknown': 'Désolé, je n\'ai pas pu traiter votre message. Pouvez-vous reformuler?'
    };

    return {
      type: 'error',
      content: fallbackMessages[errorType] || fallbackMessages.unknown,
      actions: [],
      success: false,
      error: error.message,
      suggestions: [
        'Vérifier l\'orthographe',
        'Être plus précis dans la description',
        'Réessayer dans quelques instants',
        'Contacter le support si le problème persiste'
      ]
    };
  }

  /**
   * Stockage de l'exécution agent pour monitoring
   */
  private async logExecution(execution: Partial<ChatAgentExecution>): Promise<void> {
    try {
      await this.supabase
        .from('chat_agent_executions')
        .insert({
          ...execution,
          created_at: new Date().toISOString()
        });
      
      console.log('📊 Agent execution logged');
    } catch (error) {
      console.error('❌ Failed to log execution:', error);
      // Non-bloquant: continuer même si le logging échoue
    }
  }

  // ============================================================================
  // MÉTHODES UTILITAIRES
  // ============================================================================

  /**
   * Extraction des paramètres pour un tool spécifique
   */
  private extractToolParameters(
    message: string, 
    toolName: string, 
    context: AgentContext
  ): Record<string, any> {
    
    // Extraction basique par tool (sera enrichie avec chaque tool)
    const baseParams: Record<string, any> = {};
    
    if (toolName === 'create_observation') {
      baseParams.plot_reference = this.extractPlotReference(message);
      baseParams.issue = this.extractIssue(message);
      baseParams.crop = this.extractCrop(message);
      baseParams.severity = 'medium'; // Par défaut
    }
    
    if (toolName === 'create_task_done') {
      baseParams.action = this.extractAction(message);
      baseParams.plot_reference = this.extractPlotReference(message);
      baseParams.crop = this.extractCrop(message);
    }

    if (toolName === 'help') {
      baseParams.question_type = this.classifyHelpQuestion(message);
    }

    return baseParams;
  }

  /**
   * Extraction de référence de parcelle du message
   */
  private extractPlotReference(message: string): string {
    // Patterns simples pour MVP
    const plotPatterns = [
      /(?:serre|tunnel|plein\s+champ)\s*(\d+|nord|sud|est|ouest)/i,
      /planche\s*(\d+)/i
    ];

    for (const pattern of plotPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return '';
  }

  /**
   * Extraction du problème/issue du message
   */
  private extractIssue(message: string): string {
    // Recherche de mots-clés de problèmes
    const issueKeywords = [
      'puceron', 'chenille', 'limace', 'doryphore',
      'mildiou', 'oïdium', 'rouille', 'pourriture',
      'carence', 'brûlure', 'stress', 'flétrissement'
    ];

    for (const keyword of issueKeywords) {
      if (message.toLowerCase().includes(keyword)) {
        return keyword;
      }
    }

    // Extraction par patterns
    const issueMatch = message.match(/(?:observé|remarqué|constaté)\s+(.+?)(?:\s+(?:sur|dans)|$)/i);
    return issueMatch ? issueMatch[1].trim() : '';
  }

  /**
   * Extraction de culture du message
   */
  private extractCrop(message: string): string {
    const cropKeywords = [
      'tomate', 'courgette', 'radis', 'salade', 'épinard',
      'carotte', 'navet', 'poireau', 'oignon', 'ail'
    ];

    for (const crop of cropKeywords) {
      if (message.toLowerCase().includes(crop)) {
        return crop + 's'; // Pluriel par défaut
      }
    }

    return '';
  }

  /**
   * Extraction de l'action du message
   */
  private extractAction(message: string): string {
    const actionKeywords = {
      'plantation': ['planté', 'semé', 'repiqué'],
      'récolte': ['récolté', 'ramassé', 'cueilli'],
      'traitement': ['traité', 'pulvérisé', 'appliqué'],
      'entretien': ['sarclé', 'biné', 'désherbé']
    };

    for (const [action, keywords] of Object.entries(actionKeywords)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        return action;
      }
    }

    return 'autre';
  }

  /**
   * Classification des questions d'aide
   */
  private classifyHelpQuestion(message: string): string {
    const questionTypes = {
      'parcelle': ['parcelle', 'serre', 'tunnel'],
      'materiel': ['matériel', 'outil', 'tracteur'],
      'conversion': ['conversion', 'caisse', 'unité'],
      'général': ['comment', 'aide', 'utilisation']
    };

    for (const [type, keywords] of Object.entries(questionTypes)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        return type;
      }
    }

    return 'général';
  }

  /**
   * Comptage des entités dans le message
   */
  private countEntities(message: string): number {
    const patterns = [
      /(?:serre|tunnel|plein\s+champ)\s*\d+/gi,
      /\d+\s*(?:caisse|panier|kg|gramme)/gi,
      /(?:tomate|courgette|radis|salade)s?/gi
    ];

    let count = 0;
    patterns.forEach(pattern => {
      const matches = message.match(pattern);
      count += matches ? matches.length : 0;
    });

    return count;
  }

  /**
   * Calcul de la complexité du message
   */
  private calculateComplexity(message: string): number {
    const factors = {
      length: message.length / 100, // Plus long = plus complexe
      entities: this.countEntities(message) * 0.2, // Plus d'entités = plus complexe
      questions: (message.match(/\?/g) || []).length * 0.3,
      conjunctions: (message.match(/\bet\b/gi) || []).length * 0.4 // "et" indique actions multiples
    };

    return Math.min(Math.max(
      factors.length + factors.entities + factors.questions + factors.conjunctions,
      0.1
    ), 1.0);
  }

  /**
   * Extraction des entités mentionnées
   */
  private extractEntities(message: string): string[] {
    const entities: string[] = [];
    
    // Parcelles
    const plotMatches = message.match(/(?:serre|tunnel|plein\s+champ)\s*(?:\d+|nord|sud|est|ouest)/gi);
    if (plotMatches) entities.push(...plotMatches);
    
    // Cultures
    const cropMatches = message.match(/(?:tomate|courgette|radis|salade|épinard)s?/gi);
    if (cropMatches) entities.push(...cropMatches);
    
    // Quantités
    const quantityMatches = message.match(/\d+\s*(?:caisse|panier|kg|gramme|litre)/gi);
    if (quantityMatches) entities.push(...quantityMatches);

    return entities;
  }

  /**
   * Inférence du type d'action selon l'intention
   */
  private inferActionType(intent: string): string {
    const mapping: Record<string, string> = {
      'observation_creation': 'observation',
      'task_done': 'task_done',
      'task_planned': 'task_planned', 
      'harvest': 'task_done',
      'help': 'help'
    };

    return mapping[intent] || 'unknown';
  }

  /**
   * Génération de suggestions contextuelles
   */
  private generateContextualSuggestions(
    context: AgentContext, 
    intent: MessageIntent
  ): string[] {
    const suggestions: string[] = [];

    // Suggestions selon l'intention
    if (intent.intent === 'observation_creation') {
      suggestions.push('Préciser la gravité du problème (faible, moyenne, haute)');
      suggestions.push('Ajouter des détails sur les symptômes observés');
    }

    // Suggestions selon le contexte ferme
    if (context.farm.plots.length > 0) {
      const plotNames = context.farm.plots.slice(0, 3).map(p => p.name);
      suggestions.push(`Parcelles disponibles: ${plotNames.join(', ')}`);
    }

    if (context.farm.conversions.length > 0) {
      suggestions.push('Vos conversions personnalisées sont disponibles');
    }

    return suggestions;
  }

  /**
   * Calcul de la confiance globale
   */
  private calculateOverallConfidence(toolResults: ToolResult[]): number {
    if (toolResults.length === 0) return 0;
    
    const confidences = toolResults
      .map(r => r.confidence || 0)
      .filter(c => c > 0);
    
    if (confidences.length === 0) return 0;
    
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  /**
   * Catégorisation des erreurs pour fallbacks appropriés
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('database') || message.includes('supabase')) {
      return 'database_error';
    }
    
    if (message.includes('validation') || message.includes('paramètre')) {
      return 'validation_error';
    }
    
    if (message.includes('context') || message.includes('ferme')) {
      return 'context_error';
    }
    
    if (message.includes('tool')) {
      return 'tool_error';
    }
    
    return 'unknown';
  }
}
