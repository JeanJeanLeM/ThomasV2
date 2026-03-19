import { SupabaseClient } from '@supabase/supabase-js';
import { ThomasAgentService } from '../../ThomasAgentService';
import { AgentContextService } from '../AgentContextService';
import { ToolRegistry } from '../ToolRegistry';
import { AdvancedPromptManager } from '../prompts/AdvancedPromptManager';
import { MatchingServicesFactory, MatchingServices } from '../matching';
import { AgentToolsFactory, AgentToolsCollection } from '../tools';
import { 
  AgentContext,
  AgentResponse,
  MessageIntent,
  ToolResult,
  ChatAnalyzedAction,
  ChatMessageAnalysis,
  ChatAgentExecution
} from '../types/AgentTypes';

/**
 * Pipeline orchestrateur principal pour Thomas Agent
 * Implémente les patterns Anthropic: "LLMs dynamically direct their own processes and tool usage"
 * 
 * Architecture:
 * 1. Context Engineering - Construction contexte optimal minimal
 * 2. Intent Analysis - Classification via prompt LLM  
 * 3. Tool Selection - L'agent choisit autonomement ses tools
 * 4. Execution Loop - Boucle autonome avec error recovery
 * 5. Response Synthesis - Réponse naturelle française
 * 6. Logging & Metrics - Monitoring complet performance
 * 
 * Patterns Anthropic implémentés:
 * - Autonomous tool usage in loop
 * - Context as finite resource (engineering optimization)
 * - Progressive disclosure de l'information  
 * - Error recovery avec fallbacks intelligents
 * - Performance monitoring avec métriques
 */
export class AgentPipeline {
  private contextService: AgentContextService;
  private toolRegistry: ToolRegistry; 
  private promptManager: AdvancedPromptManager;
  private matchingServices: MatchingServices;
  private tools: AgentToolsCollection;

  constructor(
    private supabase: SupabaseClient,
    private openAIApiKey: string,
    private config: PipelineConfig = {}
  ) {
    this.initializeServices();
  }

  /**
   * Initialisation de tous les services du pipeline
   */
  private async initializeServices(): Promise<void> {
    console.log('🚀 Initializing Agent Pipeline services...');
    
    try {
      // Services core
      this.contextService = new AgentContextService(this.supabase);
      this.toolRegistry = new ToolRegistry();
      this.promptManager = new AdvancedPromptManager(this.supabase, this.openAIApiKey);

      // Services de matching
      this.matchingServices = MatchingServicesFactory.createServices(this.supabase);

      // Creation et enregistrement des tools
      this.tools = AgentToolsFactory.createAllTools(
        this.supabase,
        this.matchingServices.plotMatching,
        this.matchingServices.materialMatching,
        this.matchingServices.conversionMatching,
        this.matchingServices.phytosanitaryMatching
      );

      // Initialisation du registry avec les tools
      await this.toolRegistry.initializeWithServices(this.supabase, this.matchingServices);
      AgentToolsFactory.registerAllTools(this.toolRegistry, this.tools);

      // Validation système
      const toolValidation = AgentToolsFactory.validateTools(this.tools);
      if (!toolValidation.valid) {
        throw new Error(`Tools validation failed: ${toolValidation.errors.join(', ')}`);
      }

      console.log('✅ Agent Pipeline services initialized successfully');

    } catch (error) {
      console.error('❌ Pipeline initialization failed:', error);
      throw new Error(`Échec initialisation pipeline: ${error.message}`);
    }
  }

  /**
   * Point d'entrée principal - Traitement message utilisateur
   * Implémente le workflow complet agent autonome
   */
  async processMessage(
    message: string,
    sessionId: string,
    userId: string,
    farmId: number
  ): Promise<AgentResponse> {
    
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    
    console.log(`🚀 Agent Pipeline processing message:`, { 
      execution_id: executionId,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      session_id: sessionId,
      user_id: userId,
      farm_id: farmId
    });

    try {
      // ÉTAPE 1: Context Engineering - Contexte optimal selon Anthropic
      console.log('🧠 [1/6] Building agent context...');
      const context = await this.contextService.buildContext(userId, farmId, sessionId);
      
      // Compaction du contexte si nécessaire
      const optimizedContext = await this.contextService.compactContext(context);
      
      console.log('✅ Context built:', {
        plots: optimizedContext.farm.plots.length,
        materials: optimizedContext.farm.materials.length,
        conversions: optimizedContext.farm.conversions.length
      });

      // ÉTAPE 2: Message Analysis & Storage
      console.log('📝 [2/6] Analyzing and storing message...');
      const messageAnalysis = await this.analyzeAndStoreMessage(message, optimizedContext);
      optimizedContext.analysis_id = messageAnalysis.id;

      // ÉTAPE 3: Intent Classification - Via prompt LLM
      console.log('🎯 [3/6] Classifying intent via LLM...');
      const intent = await this.classifyIntentViaLLM(message, optimizedContext);

      // ÉTAPE 4: Tool Selection - L'agent décide autonomément
      console.log('🛠️ [4/6] Agent selecting tools autonomously...');
      const toolPlans = await this.selectToolsViaLLM(message, intent, optimizedContext);

      // ÉTAPE 5: Execution Loop - Boucle autonome avec recovery
      console.log('⚡ [5/6] Executing tools loop with recovery...');
      const toolResults = await this.executeToolsLoopWithRecovery(toolPlans, message, optimizedContext);

      // ÉTAPE 6: Response Synthesis - Réponse naturelle via LLM
      console.log('💬 [6/6] Synthesizing natural French response...');
      const finalResponse = await this.synthesizeResponseViaLLM(toolResults, message, optimizedContext);

      // LOGGING: Exécution complète pour monitoring
      await this.logCompleteExecution({
        execution_id: executionId,
        session_id: sessionId,
        user_id: userId,
        farm_id: farmId,
        message,
        message_analysis: messageAnalysis,
        intent_detected: intent.intent,
        tools_selected: toolPlans.map(tp => tp.tool_name),
        tools_executed: toolResults.length,
        tools_successful: toolResults.filter(tr => tr.success).length,
        processing_time_ms: Date.now() - startTime,
        final_response: finalResponse.content,
        success: finalResponse.success,
        confidence_score: this.calculateOverallConfidence(intent, toolResults, finalResponse)
      });

      console.log(`🎉 Pipeline completed successfully:`, {
        execution_id: executionId,
        processing_time: `${Date.now() - startTime}ms`,
        tools_executed: toolResults.length,
        success_rate: `${toolResults.filter(tr => tr.success).length}/${toolResults.length}`
      });

      return finalResponse;

    } catch (error) {
      console.error('❌ Agent Pipeline error:', error);
      
      // Fallback intelligent en cas d'erreur critique
      const fallbackResponse = await this.generateIntelligentFallback(message, error, {
        execution_id: executionId,
        processing_stage: this.detectProcessingStage(error),
        user_id: userId,
        farm_id: farmId
      });

      // Log de l'échec pour analyse
      await this.logFailedExecution({
        execution_id: executionId,
        session_id: sessionId,
        user_id: userId,
        farm_id: farmId,
        message,
        error_stage: this.detectProcessingStage(error),
        error_message: error.message,
        processing_time_ms: Date.now() - startTime,
        fallback_used: true
      });

      return fallbackResponse;
    }
  }

  /**
   * ÉTAPE 2: Analyse et stockage du message
   */
  private async analyzeAndStoreMessage(
    message: string,
    context: AgentContext
  ): Promise<ChatMessageAnalysis> {
    
    const startTime = Date.now();

    // Analyse basique du message (sera enrichie)
    const analysisData = {
      message_length: message.length,
      language_detected: 'fr',
      complexity_score: this.calculateMessageComplexity(message),
      entities_estimated: this.estimateEntityCount(message),
      intent_hints: this.extractIntentHints(message)
    };

    // Stockage de l'analyse
    const { data: analysis, error } = await this.supabase
      .from('chat_message_analyses')
      .insert({
        session_id: context.session_id,
        message_id: context.session_id, // TODO: obtenir vrai message_id depuis chat
        user_message: message,
        analysis_result: analysisData,
        confidence_score: 0.8,
        processing_time_ms: Date.now() - startTime,
        model_used: 'thomas_pipeline_v2'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to store message analysis:', error);
      throw new Error(`Échec stockage analyse: ${error.message}`);
    }

    return analysis;
  }

  /**
   * ÉTAPE 3: Classification d'intention via LLM
   */
  private async classifyIntentViaLLM(
    message: string,
    context: AgentContext
  ): Promise<MessageIntent> {
    
    try {
      // Récupération prompt de classification v3.0
      const promptData = await this.promptManager.getPrompt('intent_classification', '3.0');
      const farmSummary = `${context.farm.plots.length} parcelles, ${context.farm.materials.length} matériels, ${context.farm.conversions.length} conversions`;
      const intentPrompt = promptData.content
        .replace('{{user_message}}', message)
        .replace(/\{\{farm_context_summary\}\}/g, farmSummary);

      // Appel LLM pour classification
      const llmResponse = await this.callOpenAIForClassification(intentPrompt, message);
      
      // Parsing de la réponse JSON
      const intentData = this.parseIntentResponse(llmResponse);
      
      console.log('🎯 Intent classified via LLM:', {
        intent: intentData.intent,
        confidence: intentData.confidence,
        entities_count: intentData.entities_detected?.length || 0
      });

      return intentData;

    } catch (error) {
      console.error('❌ LLM intent classification failed, using fallback:', error);
      
      // Fallback vers classification basique si LLM échoue
      return this.classifyIntentFallback(message, context);
    }
  }

  /**
   * ÉTAPE 4: Sélection de tools via LLM
   */
  private async selectToolsViaLLM(
    message: string,
    intent: MessageIntent,
    context: AgentContext
  ): Promise<ToolPlan[]> {
    
    try {
      // Récupération prompt de sélection tools v3.0
      const promptData = await this.promptManager.getPrompt('tool_selection', '3.0');
      const availableToolsInfo = this.toolRegistry.getToolsForIntent(intent.intent);
      let toolsPrompt = promptData.content
        .replace('{{intent}}', intent.intent)
        .replace('{{user_message}}', message)
        .replace('{{available_tools}}', JSON.stringify(availableToolsInfo, null, 2));

      // Appel LLM pour sélection autonome des tools
      const llmResponse = await this.callOpenAIForToolSelection(toolsPrompt, message);
      
      // Parsing de la réponse JSON avec plans d'exécution
      const toolPlans = this.parseToolSelectionResponse(llmResponse);
      
      console.log('🛠️ Tools selected via LLM:', {
        tools_count: toolPlans.length,
        tools: toolPlans.map(tp => `${tp.tool_name} (${tp.confidence})`).join(', ')
      });

      return toolPlans;

    } catch (error) {
      console.error('❌ LLM tool selection failed, using fallback:', error);
      
      // Fallback vers sélection basique basée sur l'intention
      return this.selectToolsFallback(intent, context);
    }
  }

  /**
   * ÉTAPE 5: Boucle d'exécution tools avec recovery
   * Implémente pattern Anthropic: agents maintain control over task execution
   */
  private async executeToolsLoopWithRecovery(
    toolPlans: ToolPlan[],
    originalMessage: string,
    context: AgentContext
  ): Promise<ToolResult[]> {
    
    console.log(`⚡ Executing ${toolPlans.length} tools with autonomous recovery...`);
    
    const results: ToolResult[] = [];
    const maxRetries = this.config.max_tool_retries || 2;

    for (let i = 0; i < toolPlans.length; i++) {
      const plan = toolPlans[i];
      let retryCount = 0;
      let toolResult: ToolResult | null = null;

      // Boucle de retry avec recovery intelligent
      while (retryCount <= maxRetries && !toolResult?.success) {
        try {
          console.log(`🔧 Executing tool: ${plan.tool_name} (attempt ${retryCount + 1})`);
          
          const tool = this.toolRegistry.getTool(plan.tool_name);
          if (!tool) {
            toolResult = {
              success: false,
              error: `Tool ${plan.tool_name} non disponible`,
              recovery_suggestions: ['Vérifier tools disponibles', 'Utiliser help pour alternatives']
            };
            break;
          }

          // Exécution du tool avec timeout
          const executionPromise = tool.execute(plan.parameters, context);
          const timeoutPromise = new Promise<ToolResult>((_, reject) => 
            setTimeout(() => reject(new Error('Tool execution timeout')), 
                      this.config.tool_timeout_ms || 10000)
          );

          toolResult = await Promise.race([executionPromise, timeoutPromise]);

          // Si succès, mettre à jour métriques
          if (toolResult.success) {
            this.toolRegistry.updateToolMetrics(
              plan.tool_name,
              true,
              Date.now() - Date.now(), // TODO: mesurer temps réel
              toolResult.confidence
            );
          }

        } catch (toolError) {
          console.error(`❌ Tool ${plan.tool_name} execution error:`, toolError);
          
          retryCount++;
          
          // Recovery intelligent selon le type d'erreur
          if (retryCount <= maxRetries) {
            const recoveryStrategy = this.determineRecoveryStrategy(toolError, plan);
            
            if (recoveryStrategy.retry_with_modified_params) {
              // Modifier paramètres pour retry
              plan.parameters = { ...plan.parameters, ...recoveryStrategy.param_modifications };
              console.log(`🔄 Retrying with modified parameters:`, recoveryStrategy.param_modifications);
            } else if (recoveryStrategy.skip_tool) {
              // Skip ce tool et continuer
              toolResult = {
                success: false,
                error: `Tool skipped after error: ${toolError.message}`,
                recovery_suggestions: recoveryStrategy.suggestions || []
              };
              break;
            }
          } else {
            // Max retries atteint
            toolResult = {
              success: false,
              error: `Tool failed after ${maxRetries} retries: ${toolError.message}`,
              recovery_suggestions: [
                'Vérifier les paramètres fournis',
                'Reformuler le message plus clairement',
                'Vérifier configuration ferme (parcelles, matériels)'
              ]
            };
          }
        }
      }

      if (toolResult) {
        results.push(toolResult);
        
        // Logging du résultat pour métriques
        this.toolRegistry.updateToolMetrics(
          plan.tool_name,
          toolResult.success,
          Date.now() - Date.now(),
          toolResult.confidence
        );
      }
    }

    const successfulTools = results.filter(r => r.success).length;
    console.log(`⚡ Tools execution completed: ${successfulTools}/${results.length} successful`);

    return results;
  }

  /**
   * ÉTAPE 6: Synthèse de réponse via LLM
   */
  private async synthesizeResponseViaLLM(
    toolResults: ToolResult[],
    originalMessage: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    
    try {
      // Récupération prompt de synthèse
      const synthesisPrompt = await this.promptManager.getContextualPrompt(
        'response_synthesis',
        context,
        {
          tool_results: JSON.stringify(toolResults, null, 2),
          original_message: originalMessage,
          execution_summary: this.generateExecutionSummary(toolResults)
        }
      );

      // Appel LLM pour synthèse naturelle  
      const llmResponse = await this.callOpenAIForSynthesis(synthesisPrompt, toolResults);
      
      // Construction de la réponse finale
      const response: AgentResponse = {
        type: toolResults.some(tr => tr.success) ? 'actions' : 'error',
        content: llmResponse.content,
        actions: this.extractActionsFromResults(toolResults),
        success: toolResults.some(tr => tr.success),
        processing_time_ms: Date.now() - Date.now(),
        confidence: this.calculateResponseConfidence(toolResults),
        suggestions: this.generateContextualSuggestions(toolResults, context)
      };

      console.log('💬 Response synthesized via LLM:', {
        type: response.type,
        success: response.success,
        actions_count: response.actions.length,
        content_length: response.content.length
      });

      return response;

    } catch (error) {
      console.error('❌ LLM response synthesis failed:', error);
      
      // Fallback vers synthèse basique
      return this.synthesizeResponseFallback(toolResults, originalMessage, context);
    }
  }

  /**
   * Appel OpenAI pour classification d'intention
   */
  private async callOpenAIForClassification(
    systemPrompt: string,
    userMessage: string
  ): Promise<string> {
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openAIApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{}';
      
      console.log('🤖 [LLM-INTENT] Raw response:', content.substring(0, 200));
      
      return content;

    } catch (error) {
      console.error('❌ OpenAI call failed, using simulation fallback:', error);
      const simulatedResponse = this.simulateIntentClassification(userMessage);
      return JSON.stringify(simulatedResponse);
    }
  }

  /**
   * Appel OpenAI pour sélection de tools
   */
  private async callOpenAIForToolSelection(
    systemPrompt: string,
    userMessage: string
  ): Promise<string> {
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openAIApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.2,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{"tools":[]}';
      
      console.log('🤖 [LLM-TOOLS] Raw response:', content.substring(0, 200));
      
      return content;

    } catch (error) {
      console.error('❌ OpenAI call failed, using simulation fallback:', error);
      const simulatedResponse = this.simulateToolSelection(userMessage);
      return JSON.stringify(simulatedResponse);
    }
  }

  /**
   * Appel OpenAI pour synthèse de réponse
   */
  private async callOpenAIForSynthesis(
    systemPrompt: string,
    toolResults: ToolResult[]
  ): Promise<{ content: string }> {
    
    try {
      const toolResultsSummary = toolResults.map(tr => ({
        success: tr.success,
        message: tr.message,
        error: tr.error
      }));

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openAIApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(toolResultsSummary) }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || 'Action traitée.';
      
      console.log('🤖 [LLM-SYNTHESIS] Raw response:', content.substring(0, 200));
      
      return { content };

    } catch (error) {
      console.error('❌ OpenAI call failed, using simulation fallback:', error);
      const synthesizedContent = this.synthesizeIntelligentResponse(toolResults);
      return { content: synthesizedContent };
    }
  }

  // ============================================================================
  // SIMULATIONS LLM (À REMPLACER PAR VRAIS APPELS)
  // ============================================================================

  /**
   * Simulation classification d'intention
   */
  private simulateIntentClassification(message: string): any {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('observé') || messageLower.includes('constaté')) {
      return {
        intent: 'observation_creation',
        confidence: 0.9,
        reasoning: 'Message contient indicateurs d\'observation terrain',
        entities_detected: {
          action_indicators: ['observé'],
          problem_indicators: this.extractProblems(message),
          location_indicators: this.extractLocations(message),
          crop_indicators: this.extractCrops(message)
        }
      };
    }
    
    if (messageLower.includes('récolté') || messageLower.includes('ramassé')) {
      return {
        intent: 'harvest',
        confidence: 0.95,
        reasoning: 'Message indique récolte avec probable quantité',
        entities_detected: {
          action_indicators: ['récolté'],
          quantity_indicators: this.extractQuantities(message),
          location_indicators: this.extractLocations(message)
        }
      };
    }
    
    if (messageLower.includes('planté') || messageLower.includes('fait')) {
      return {
        intent: 'task_done',
        confidence: 0.85,
        reasoning: 'Action agricole accomplie détectée'
      };
    }
    
    if (messageLower.includes('demain') || messageLower.includes('prévu')) {
      return {
        intent: 'task_planned', 
        confidence: 0.8,
        reasoning: 'Planification future détectée'
      };
    }
    
    if (messageLower.includes('comment') || messageLower.includes('?')) {
      return {
        intent: 'help',
        confidence: 0.9,
        reasoning: 'Question d\'aide détectée'
      };
    }
    
    return {
      intent: 'unclear',
      confidence: 0.5,
      reasoning: 'Intention non claire - fallback help'
    };
  }

  /**
   * Simulation sélection de tools
   */
  private simulateToolSelection(message: string): any {
    const messageLower = message.toLowerCase();
    const tools: any[] = [];
    
    // Observation
    if (messageLower.includes('observé')) {
      tools.push({
        tool_name: 'create_observation',
        confidence: 0.9,
        parameters: {
          crop: this.extractCrops(message)[0] || 'culture',
          issue: this.extractProblems(message)[0] || 'problème',
          plot_reference: this.extractLocations(message)[0] || 'parcelle',
          severity: 'medium'
        },
        reasoning: 'Observation terrain avec parcelle et problème identifiés'
      });
    }
    
    // Récolte
    if (messageLower.includes('récolté')) {
      tools.push({
        tool_name: 'create_harvest',
        confidence: 0.95,
        parameters: {
          crop: this.extractCrops(message)[0] || 'culture',
          plot_reference: this.extractLocations(message)[0] || 'parcelle',
          quantity: this.extractQuantities(message)[0] || '1 unité',
          quality_assessment: 'good'
        },
        reasoning: 'Récolte avec quantité détectée'
      });
    }
    
    // Aide
    if (messageLower.includes('comment') || messageLower.includes('?')) {
      tools.push({
        tool_name: 'help',
        confidence: 0.9,
        parameters: {
          question_type: this.classifyHelpType(message),
          user_question: message
        },
        reasoning: 'Question d\'aide nécessite réponse guidée'
      });
    }

    return {
      message_analysis: {
        primary_intent: this.simulateIntentClassification(message).intent,
        confidence: 0.85,
        complexity: message.length > 100 ? 'complex' : 'simple'
      },
      tools_to_use: tools,
      message_type: tools.length > 1 ? 'multiple' : 'single'
    };
  }

  /**
   * Synthèse intelligente basée sur résultats
   */
  private synthesizeIntelligentResponse(toolResults: ToolResult[]): string {
    const successful = toolResults.filter(tr => tr.success);
    const failed = toolResults.filter(tr => !tr.success);
    
    if (successful.length === 0) {
      // Tous les tools ont échoué
      const mainError = failed[0]?.error || 'Erreur inconnue';
      return `Je n'ai pas pu traiter votre message : ${mainError}. ${
        failed[0]?.recovery_suggestions?.[0] || 'Pouvez-vous reformuler plus clairement ?'
      }`;
    }
    
    if (successful.length === toolResults.length) {
      // Tous les tools ont réussi
      const messages = successful.map(tr => tr.message).filter(m => m).join(' ');
      return messages || 'Toutes vos actions ont été traitées avec succès ! ✅';
    }
    
    // Succès partiel
    const successMessages = successful.map(tr => tr.message).filter(m => m).join(' ');
    const errorMessage = failed[0]?.error || '';
    
    return `${successMessages} ✅\n\nCependant, ${errorMessage} ${
      failed[0]?.recovery_suggestions?.[0] || ''
    }`;
  }

  // ============================================================================
  // MÉTHODES UTILITAIRES
  // ============================================================================

  /**
   * Calcul complexité d'un message
   */
  private calculateMessageComplexity(message: string): number {
    const factors = {
      length: Math.min(message.length / 200, 1) * 0.3,
      entities: Math.min(this.estimateEntityCount(message) / 5, 1) * 0.3,
      conjunctions: Math.min((message.match(/\bet\b/gi) || []).length / 3, 1) * 0.2,
      questions: Math.min((message.match(/\?/g) || []).length / 2, 1) * 0.2
    };
    
    return factors.length + factors.entities + factors.conjunctions + factors.questions;
  }

  /**
   * Estimation nombre d'entités
   */
  private estimateEntityCount(message: string): number {
    const patterns = [
      /(?:serre|tunnel|plein\s+champ)\s*\d+/gi,
      /\d+\s*(?:caisse|panier|kg|litre)/gi,
      /(?:tomate|courgette|radis|salade)s?/gi,
      /(?:tracteur|bêche|arrosoir)/gi
    ];
    
    return patterns.reduce((count, pattern) => {
      const matches = message.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  /**
   * Extraction hints d'intention
   */
  private extractIntentHints(message: string): string[] {
    const hints: string[] = [];
    const messageLower = message.toLowerCase();
    
    const intentKeywords = {
      observation: ['observé', 'remarqué', 'constaté', 'vu', 'problème'],
      task_done: ['fait', 'planté', 'récolté', 'traité', 'terminé'],
      task_planned: ['vais', 'prévu', 'demain', 'lundi', 'planifier'],
      help: ['comment', 'où', 'aide', '?', 'expliquer']
    };

    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        hints.push(intent);
      }
    }

    return hints;
  }

  /**
   * Parsing réponse d'intention JSON
   */
  private parseIntentResponse(response: string): MessageIntent {
    try {
      const parsed = JSON.parse(response);
      return {
        intent: parsed.intent,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        entities_detected: Object.values(parsed.entities_detected || {}).flat() as string[]
      };
    } catch (error) {
      console.error('❌ Failed to parse intent response:', error);
      return {
        intent: 'unclear',
        confidence: 0.3,
        reasoning: 'Erreur parsing réponse LLM',
        entities_detected: []
      };
    }
  }

  /**
   * Génération ID d'exécution unique
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Logging exécution réussie
   */
  private async logCompleteExecution(execution: CompleteExecutionLog): Promise<void> {
    try {
      await this.supabase
        .from('chat_agent_executions')
        .insert({
          session_id: execution.session_id,
          user_id: execution.user_id,
          farm_id: execution.farm_id,
          message: execution.message,
          intent_detected: execution.intent_detected,
          tools_used: execution.tools_selected,
          execution_steps: [{
            stage: 'complete',
            tools_executed: execution.tools_executed,
            tools_successful: execution.tools_successful,
            processing_time_ms: execution.processing_time_ms
          }],
          final_response: execution.final_response,
          processing_time_ms: execution.processing_time_ms,
          success: execution.success,
          created_at: new Date().toISOString()
        });
      
      console.log(`📊 Execution logged: ${execution.execution_id}`);
    } catch (error) {
      console.error('❌ Failed to log execution:', error);
    }
  }

  /**
   * Génération fallback intelligent
   */
  private async generateIntelligentFallback(
    message: string,
    error: Error,
    context: { execution_id: string; processing_stage: string; user_id: string; farm_id: number }
  ): Promise<AgentResponse> {
    
    const errorType = this.categorizeError(error);
    
    const fallbackMessages: Record<string, string> = {
      'context_error': 'Problème lors de la récupération du contexte de votre ferme. Vérifiez votre connexion.',
      'llm_error': 'Service d\'analyse IA temporairement indisponible. Je peux traiter des demandes simples.',
      'tool_error': 'Erreur lors de l\'exécution des actions. Reformulez votre demande.',
      'database_error': 'Problème de connexion base de données. Réessayez dans quelques instants.',
      'timeout_error': 'Traitement trop long. Simplifiez votre message ou réessayez.',
      'unknown_error': 'Erreur technique inattendue. Contactez le support si le problème persiste.'
    };

    return {
      type: 'error',
      content: fallbackMessages[errorType] || fallbackMessages.unknown_error,
      actions: [],
      success: false,
      error: error.message,
      suggestions: this.generateErrorSuggestions(errorType, message),
      processing_time_ms: 0
    };
  }

  /**
   * Détection étape de traitement en cas d'erreur
   */
  private detectProcessingStage(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('context') || message.includes('ferme')) return 'context_building';
    if (message.includes('prompt') || message.includes('template')) return 'prompt_management';  
    if (message.includes('intent') || message.includes('classification')) return 'intent_classification';
    if (message.includes('tool')) return 'tool_execution';
    if (message.includes('response') || message.includes('synthesis')) return 'response_synthesis';
    
    return 'unknown';
  }

  /**
   * Catégorisation des erreurs pour fallbacks
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'timeout_error';
    if (message.includes('database') || message.includes('supabase')) return 'database_error';
    if (message.includes('openai') || message.includes('api')) return 'llm_error';
    if (message.includes('tool')) return 'tool_error';
    if (message.includes('context') || message.includes('ferme')) return 'context_error';
    
    return 'unknown_error';
  }

  // ============================================================================
  // MÉTHODES EXTRACTION ENTITÉS (HELPERS)
  // ============================================================================

  private extractProblems(message: string): string[] {
    const problems: string[] = [];
    const messageLower = message.toLowerCase();
    
    const problemKeywords = [
      'puceron', 'pucerons', 'chenille', 'limace', 'doryphore',
      'mildiou', 'oïdium', 'rouille', 'pourriture',
      'carence', 'brûlure', 'stress', 'flétrissement'
    ];
    
    problemKeywords.forEach(keyword => {
      if (messageLower.includes(keyword)) {
        problems.push(keyword);
      }
    });
    
    return problems;
  }

  private extractLocations(message: string): string[] {
    const locations: string[] = [];
    const patterns = [
      /(?:serre|tunnel|plein\s+champ)\s*\d+/gi,
      /(?:serre|tunnel)\s*(?:nord|sud|est|ouest)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) {
        locations.push(...matches);
      }
    });
    
    return locations;
  }

  private extractCrops(message: string): string[] {
    const crops: string[] = [];
    const cropKeywords = [
      'tomate', 'tomates', 'courgette', 'courgettes', 
      'radis', 'salade', 'salades', 'épinard', 'épinards'
    ];
    
    cropKeywords.forEach(crop => {
      if (message.toLowerCase().includes(crop)) {
        crops.push(crop);
      }
    });
    
    return crops;
  }

  private extractQuantities(message: string): string[] {
    const quantities: string[] = [];
    const patterns = [
      /\d+\s*(?:caisse|caisses|panier|paniers|kg|litre)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) {
        quantities.push(...matches);
      }
    });
    
    return quantities;
  }

  private classifyHelpType(message: string): string {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('parcelle')) return 'parcelle';
    if (messageLower.includes('matériel') || messageLower.includes('outil')) return 'materiel';
    if (messageLower.includes('conversion')) return 'conversion';
    if (messageLower.includes('tâche') || messageLower.includes('task')) return 'tache';
    
    return 'general';
  }

  // ============================================================================
  // MÉTHODES FALLBACK
  // ============================================================================

  private classifyIntentFallback(message: string, context: AgentContext): MessageIntent {
    // Fallback basique si LLM échoue
    const simulation = this.simulateIntentClassification(message);
    return {
      intent: simulation.intent,
      confidence: simulation.confidence * 0.7, // Réduire confiance pour fallback
      reasoning: `Fallback classification: ${simulation.reasoning}`,
      entities_detected: []
    };
  }

  private selectToolsFallback(intent: MessageIntent, context: AgentContext): ToolPlan[] {
    // Mapping simple intention → tool
    const intentToolMapping: Record<string, string[]> = {
      'observation_creation': ['create_observation'],
      'task_done': ['create_task_done'],
      'task_planned': ['create_task_planned'], 
      'harvest': ['create_harvest'],
      'help': ['help']
    };

    const selectedTools = intentToolMapping[intent.intent] || ['help'];
    
    return selectedTools.map(toolName => ({
      tool_name: toolName,
      confidence: intent.confidence,
      parameters: {}, // Paramètres basiques
      reasoning: `Fallback selection for intent: ${intent.intent}`
    }));
  }

  private synthesizeResponseFallback(
    toolResults: ToolResult[],
    originalMessage: string,
    context: AgentContext
  ): AgentResponse {
    const successful = toolResults.filter(tr => tr.success);
    
    return {
      type: successful.length > 0 ? 'actions' : 'error',
      content: successful.length > 0 
        ? 'Actions traitées avec méthode de fallback.'
        : 'Impossible de traiter votre message. Reformulez plus clairement.',
      actions: [],
      success: successful.length > 0,
      suggestions: ['Reformuler plus clairement', 'Vérifier configuration ferme']
    };
  }

  // ============================================================================
  // MÉTHODES PARSING ET PROCESSING
  // ============================================================================

  private parseToolSelectionResponse(response: string): ToolPlan[] {
    try {
      const parsed = JSON.parse(response);
      return parsed.tools_to_use || [];
    } catch (error) {
      console.error('❌ Failed to parse tool selection response:', error);
      return [];
    }
  }

  private determineRecoveryStrategy(error: Error, plan: ToolPlan): RecoveryStrategy {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('parcelle non trouvée')) {
      return {
        retry_with_modified_params: true,
        param_modifications: { plot_reference: 'première parcelle disponible' },
        suggestions: ['Vérifier nom de parcelle', 'Utiliser alias si disponible']
      };
    }
    
    if (errorMessage.includes('timeout')) {
      return {
        skip_tool: true,
        suggestions: ['Réessayer plus tard', 'Simplifier la demande']
      };
    }
    
    return {
      retry_with_modified_params: false,
      skip_tool: false,
      suggestions: ['Vérifier paramètres', 'Contacter support']
    };
  }

  private calculateOverallConfidence(
    intent: MessageIntent,
    toolResults: ToolResult[],
    response: AgentResponse
  ): number {
    const intentConfidence = intent.confidence;
    const toolConfidence = toolResults.length > 0 
      ? toolResults.reduce((sum, tr) => sum + (tr.confidence || 0.5), 0) / toolResults.length
      : 0.5;
    const responseConfidence = response.confidence || 0.5;
    
    // Moyenne pondérée
    return (intentConfidence * 0.3 + toolConfidence * 0.5 + responseConfidence * 0.2);
  }

  private calculateResponseConfidence(toolResults: ToolResult[]): number {
    if (toolResults.length === 0) return 0.3;
    
    const successfulResults = toolResults.filter(tr => tr.success);
    const successRate = successfulResults.length / toolResults.length;
    const avgConfidence = successfulResults.length > 0
      ? successfulResults.reduce((sum, tr) => sum + (tr.confidence || 0.5), 0) / successfulResults.length
      : 0.3;
    
    return successRate * avgConfidence;
  }

  private generateExecutionSummary(toolResults: ToolResult[]): string {
    const successful = toolResults.filter(tr => tr.success).length;
    const total = toolResults.length;
    
    return `${successful}/${total} tools executed successfully`;
  }

  private extractActionsFromResults(toolResults: ToolResult[]): any[] {
    return toolResults
      .filter(tr => tr.success && tr.data)
      .map((tr, index) => ({
        id: `action_${index}`,
        type: 'tool_result',
        title: tr.message || 'Action executée',
        data: tr.data,
        confidence: tr.confidence || 0.5,
        status: 'completed'
      }));
  }

  private generateContextualSuggestions(toolResults: ToolResult[], context: AgentContext): string[] {
    const suggestions: string[] = [];
    
    const failed = toolResults.filter(tr => !tr.success);
    if (failed.length > 0) {
      suggestions.push('Vérifier configuration ferme si erreurs fréquentes');
      suggestions.push('Reformuler plus clairement si tools échouent');
    }
    
    if (context.farm.plots.length === 0) {
      suggestions.push('Configurer vos parcelles pour meilleur matching');
    }
    
    if (context.farm.conversions.length === 0) {
      suggestions.push('Ajouter conversions personnalisées pour calculs automatiques');
    }
    
    return suggestions;
  }

  private generateErrorSuggestions(errorType: string, message: string): string[] {
    const baseSuggestions = {
      'context_error': ['Vérifier connexion', 'Rafraîchir la page', 'Réessayer'],
      'llm_error': ['Simplifier le message', 'Réessayer plus tard', 'Utiliser commandes directes'],
      'tool_error': ['Vérifier orthographe parcelles', 'Être plus précis', 'Reformuler'],
      'database_error': ['Vérifier connexion internet', 'Réessayer dans 30s', 'Contacter support'],
      'timeout_error': ['Raccourcir le message', 'Une action à la fois', 'Réessayer'],
      'unknown_error': ['Reformuler différemment', 'Contacter support', 'Utiliser interface manuelle']
    };

    return baseSuggestions[errorType] || baseSuggestions.unknown_error;
  }

  private async logFailedExecution(failure: FailedExecutionLog): Promise<void> {
    try {
      await this.supabase
        .from('chat_agent_executions')
        .insert({
          session_id: failure.session_id,
          user_id: failure.user_id,
          farm_id: failure.farm_id,
          message: failure.message,
          intent_detected: '',
          tools_used: [],
          execution_steps: [{
            stage: failure.error_stage,
            error: failure.error_message,
            fallback_used: failure.fallback_used
          }],
          final_response: '',
          processing_time_ms: failure.processing_time_ms,
          success: false,
          error_message: failure.error_message,
          created_at: new Date().toISOString()
        });
      
      console.log(`📊 Failed execution logged: ${failure.execution_id}`);
    } catch (error) {
      console.error('❌ Failed to log failure:', error);
    }
  }

  /**
   * Stats du pipeline pour monitoring
   */
  getPipelineStats(): PipelineStats {
    const contextStats = this.contextService.getCacheStats();
    const toolStats = this.toolRegistry.getRegistryStats();
    const promptStats = this.promptManager.getManagerStats();

    return {
      context_cache_size: contextStats.size,
      tools_registered: toolStats.total_tools,
      prompt_cache_size: promptStats.cache_size,
      total_categories: Object.keys(toolStats.category_counts).length,
      system_ready: true
    };
  }
}

// ============================================================================
// INTERFACES COMPLÉMENTAIRES
// ============================================================================

interface RecoveryStrategy {
  retry_with_modified_params: boolean;
  skip_tool: boolean;
  param_modifications?: Record<string, any>;
  suggestions: string[];
}

interface FailedExecutionLog {
  execution_id: string;
  session_id: string;
  user_id: string;
  farm_id: number;
  message: string;
  error_stage: string;
  error_message: string;
  processing_time_ms: number;
  fallback_used: boolean;
}

// ============================================================================
// INTERFACES & TYPES  
// ============================================================================

interface PipelineConfig {
  max_tool_retries?: number;
  tool_timeout_ms?: number;
  enable_llm_calls?: boolean;
  cache_enabled?: boolean;
}

interface ToolPlan {
  tool_name: string;
  confidence: number;
  parameters: Record<string, any>;
  reasoning: string;
}

interface CompleteExecutionLog {
  execution_id: string;
  session_id: string;
  user_id: string;
  farm_id: number;
  message: string;
  message_analysis: ChatMessageAnalysis;
  intent_detected: string;
  tools_selected: string[];
  tools_executed: number;
  tools_successful: number;
  processing_time_ms: number;
  final_response: string;
  success: boolean;
}

interface PipelineStats {
  context_cache_size: number;
  tools_registered: number;
  prompt_cache_size: number;
  total_categories: number;
  system_ready: boolean;
}
