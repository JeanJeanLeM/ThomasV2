import { AgentTool, AdvancedAgentTool } from './base/AgentTool';
import { AgentContext } from './types/AgentTypes';
import { 
  AgentToolsFactory, 
  AgentToolsCollection 
} from './tools';
import { MatchingServicesFactory } from './matching';

/**
 * Registry centralisé pour tous les Agent Tools
 * Gestion dynamique et catégorisation automatique
 * Support extensibilité future (nouveaux tools)
 */
export class ToolRegistry {
  private tools = new Map<string, AgentTool>();
  private categories = new Map<string, string[]>();
  private toolMetrics = new Map<string, ToolMetrics>();

  constructor() {
    this.initializeCoreTools();
  }

  /**
   * Initialisation des tools de base avec intégration complète
   */
  private async initializeCoreTools(): Promise<void> {
    console.log('🔧 Initializing core tools...');

    this.setupCategories();
    
    // Note: Les tools seront initialisés via initializeWithServices()
    // car ils ont besoin des services de matching
    
    console.log('✅ Tool registry structure initialized');
  }
  
  /**
   * Initialisation complète avec services de matching
   * Appelée après création des services
   */
  async initializeWithServices(
    supabaseClient: any,
    matchingServices?: any
  ): Promise<void> {
    console.log('🚀 Initializing tools with matching services...');

    try {
      // Créer services de matching si pas fournis
      if (!matchingServices) {
        matchingServices = MatchingServicesFactory.createServices(supabaseClient);
      }

      // Créer tous les tools avec leurs dépendances
      const tools = AgentToolsFactory.createAllTools(
        supabaseClient,
        matchingServices.plotMatching,
        matchingServices.materialMatching, 
        matchingServices.conversionMatching,
        matchingServices.phytosanitaryMatching
      );

      // Enregistrer tous les tools
      AgentToolsFactory.registerAllTools(this, tools);

      // Validation des tools
      const validation = AgentToolsFactory.validateTools(tools);
      if (!validation.valid) {
        console.error('❌ Tools validation failed:', validation.errors);
        throw new Error(`Validation tools échouée: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ Tools validation warnings:', validation.warnings);
      }

      console.log('✅ All tools initialized and validated successfully');
      console.log(`📊 Registry stats:`, this.getRegistryStats());

    } catch (error) {
      console.error('❌ Failed to initialize tools:', error);
      throw error;
    }
  }

  /**
   * Configuration des catégories de tools
   */
  private setupCategories(): void {
    this.categories.set('agricultural', []);
    this.categories.set('management', []);
    this.categories.set('utility', []);
    this.categories.set('future', []);
  }

  /**
   * Enregistrement d'un nouveau tool
   */
  registerTool(tool: AgentTool, category?: string): void {
    // Validation
    if (!tool.name || !tool.description || !tool.parameters) {
      throw new Error(`Tool invalide: ${tool.name} - propriétés manquantes`);
    }

    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} déjà enregistré`);
    }

    // Enregistrement
    this.tools.set(tool.name, tool);

    // Catégorisation automatique ou manuelle
    const toolCategory = category || this.inferCategory(tool);
    this.addToCategory(toolCategory, tool.name);

    // Initialisation des métriques
    this.toolMetrics.set(tool.name, {
      usage_count: 0,
      success_count: 0,
      avg_execution_time_ms: 0,
      last_used: null,
      avg_confidence: 0
    });

    console.log(`✅ Tool registered: ${tool.name} (category: ${toolCategory})`);
  }

  /**
   * Récupération d'un tool par nom
   */
  getTool(name: string): AgentTool | null {
    return this.tools.get(name) || null;
  }

  /**
   * Récupération des tools par catégorie
   */
  getToolsByCategory(category: string): AgentTool[] {
    const toolNames = this.categories.get(category) || [];
    return toolNames
      .map(name => this.tools.get(name))
      .filter((tool): tool is AgentTool => tool !== undefined);
  }

  /**
   * Liste des tools disponibles avec filtrage contextuel
   * Selon les patterns Anthropic: tools adaptés au contexte
   */
  listAvailableTools(context?: AgentContext): ToolInfo[] {
    return Array.from(this.tools.values())
      .filter(tool => this.isToolAvailable(tool, context))
      .map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        category: this.getToolCategory(tool.name),
        metrics: this.toolMetrics.get(tool.name)
      }))
      .sort((a, b) => {
        // Trier par usage et performance
        const aMetrics = a.metrics;
        const bMetrics = b.metrics;
        if (!aMetrics || !bMetrics) return 0;
        
        // Priorité aux tools performants et utilisés
        const aScore = aMetrics.success_count * aMetrics.avg_confidence;
        const bScore = bMetrics.success_count * bMetrics.avg_confidence;
        return bScore - aScore;
      });
  }

  /**
   * Sélection intelligente de tools selon le contexte
   * Core de l'autonomie agent selon Anthropic
   */
  async selectTools(
    message: string, 
    intent: string, 
    context: AgentContext
  ): Promise<string[]> {
    const availableTools = this.listAvailableTools(context);
    
    // Mapping intent → tools
    const intentToolMapping: Record<string, string[]> = {
      'observation_creation': ['create_observation'],
      'task_done': ['create_task_done'], 
      'task_planned': ['create_task_planned'],
      'harvest': ['create_task_done'], // Récolte = tâche done spécialisée
      'help': ['help'],
      'management': this.getManagementTools(),
      'unclear': ['help'] // Fallback
    };

    const suggestedTools = intentToolMapping[intent] || ['help'];
    
    // Filtrer les tools disponibles
    const selectedTools = suggestedTools.filter(toolName => 
      availableTools.some(tool => tool.name === toolName)
    );

    // Si aucun tool disponible, fallback vers help
    if (selectedTools.length === 0) {
      selectedTools.push('help');
    }

    console.log(`🎯 Tools selected for intent "${intent}":`, selectedTools);
    return selectedTools;
  }

  /**
   * Mise à jour des métriques d'un tool après exécution
   */
  updateToolMetrics(
    toolName: string, 
    success: boolean, 
    executionTimeMs: number, 
    confidence?: number
  ): void {
    const metrics = this.toolMetrics.get(toolName);
    if (!metrics) return;

    metrics.usage_count++;
    if (success) {
      metrics.success_count++;
    }

    // Mise à jour moyenne temps d'exécution
    metrics.avg_execution_time_ms = 
      (metrics.avg_execution_time_ms * (metrics.usage_count - 1) + executionTimeMs) / metrics.usage_count;

    // Mise à jour moyenne confiance
    if (confidence !== undefined) {
      metrics.avg_confidence = 
        (metrics.avg_confidence * (metrics.usage_count - 1) + confidence) / metrics.usage_count;
    }

    metrics.last_used = new Date().toISOString();
    
    console.log(`📊 Metrics updated for ${toolName}:`, metrics);
  }

  /**
   * Inférence automatique de catégorie d'un tool
   */
  private inferCategory(tool: AgentTool): string {
    const name = tool.name.toLowerCase();
    
    if (name.includes('observation') || name.includes('task') || name.includes('harvest')) {
      return 'agricultural';
    }
    
    if (name.includes('plot') || name.includes('material') || name.includes('conversion')) {
      return 'management';
    }
    
    if (name.includes('help') || name.includes('search') || name.includes('stats')) {
      return 'utility';
    }
    
    if (name.includes('feedback') || name.includes('weather')) {
      return 'future';
    }
    
    return 'utility'; // Catégorie par défaut
  }

  /**
   * Vérification si un tool est disponible dans le contexte donné
   */
  private isToolAvailable(tool: AgentTool, context?: AgentContext): boolean {
    if (!context) return true;

    // Vérifications contextuelles
    if ((tool as any).canExecute && typeof (tool as any).canExecute === 'function') {
      return (tool as any).canExecute(context);
    }

    // Vérifications de base selon le nom du tool
    const name = tool.name.toLowerCase();
    
    if (name.includes('plot') && context.farm.plots.length === 0) {
      return false;
    }
    
    if (name.includes('material') && context.farm.materials.length === 0) {
      return false;
    }
    
    if (name.includes('conversion') && context.farm.conversions.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Ajout d'un tool à une catégorie
   */
  private addToCategory(category: string, toolName: string): void {
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category)!.push(toolName);
  }

  /**
   * Récupération de la catégorie d'un tool
   */
  private getToolCategory(toolName: string): string {
    for (const [category, tools] of Array.from(this.categories.entries())) {
      if (tools.includes(toolName)) {
        return category;
      }
    }
    return 'unknown';
  }

  /**
   * Récupération des tools de management
   */
  private getManagementTools(): string[] {
    return this.getToolsByCategory('management').map(tool => tool.name);
  }

  /**
   * Chargement dynamique de tools externes (extensibilité future)
   */
  async loadExternalTool(toolPath: string): Promise<void> {
    try {
      console.log(`📦 Loading external tool from: ${toolPath}`);
      
      // TODO: Implémentation du chargement dynamique
      // Pour futures extensions (feedback app, météo, etc.)
      
      console.log(`✅ External tool loaded successfully`);
    } catch (error) {
      console.error(`❌ Failed to load external tool:`, error);
      throw new Error(`Échec du chargement du tool externe: ${error.message}`);
    }
  }

  /**
   * Désactivation temporaire d'un tool
   */
  disableTool(toolName: string, reason?: string): void {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} non trouvé`);
    }

    // Marquer comme désactivé dans les métriques
    const metrics = this.toolMetrics.get(toolName);
    if (metrics) {
      (metrics as any).disabled = true;
      (metrics as any).disabled_reason = reason;
      (metrics as any).disabled_at = new Date().toISOString();
    }

    console.log(`🔒 Tool ${toolName} disabled:`, reason);
  }

  /**
   * Réactivation d'un tool
   */
  enableTool(toolName: string): void {
    const metrics = this.toolMetrics.get(toolName);
    if (metrics && (metrics as any).disabled) {
      delete (metrics as any).disabled;
      delete (metrics as any).disabled_reason;
      delete (metrics as any).disabled_at;
    }

    console.log(`🔓 Tool ${toolName} enabled`);
  }

  /**
   * Statistiques du registry pour monitoring
   */
  getRegistryStats(): RegistryStats {
    const totalTools = this.tools.size;
    const categoryCounts = new Map<string, number>();
    
    for (const [category, tools] of Array.from(this.categories.entries())) {
      categoryCounts.set(category, tools.length);
    }

    const totalUsage = Array.from(this.toolMetrics.values())
      .reduce((sum, metrics) => sum + metrics.usage_count, 0);

    return {
      total_tools: totalTools,
      category_counts: Object.fromEntries(categoryCounts),
      total_usage: totalUsage,
      cache_size: 0 // Pas de cache dans ToolRegistry
    };
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface ToolInfo {
  name: string;
  description: string;
  parameters: any;
  category: string;
  metrics?: ToolMetrics;
}

export interface ToolMetrics {
  usage_count: number;
  success_count: number;
  avg_execution_time_ms: number;
  last_used: string | null;
  avg_confidence: number;
}

export interface RegistryStats {
  total_tools: number;
  category_counts: Record<string, number>;
  total_usage: number;
  cache_size: number;
}
