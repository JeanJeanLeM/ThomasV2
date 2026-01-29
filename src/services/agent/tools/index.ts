/**
 * Index centralisé de tous les Agent Tools
 * Organisation par catégorie pour facilité d'usage
 */

// Imports des classes pour utilisation dans factory
import { ObservationTool } from './agricultural/ObservationTool';
import { TaskDoneTool } from './agricultural/TaskDoneTool';
import { TaskPlannedTool } from './agricultural/TaskPlannedTool';  
import { HarvestTool } from './agricultural/HarvestTool';
import { HelpTool } from './utility/HelpTool';
import { PlotTool } from './management/PlotTool';

// Exports des tools
export { ObservationTool } from './agricultural/ObservationTool';
export { TaskDoneTool } from './agricultural/TaskDoneTool';
export { TaskPlannedTool } from './agricultural/TaskPlannedTool';
export { HarvestTool } from './agricultural/HarvestTool';
export { HelpTool } from './utility/HelpTool';
export { PlotTool } from './management/PlotTool';

// Base classes
export { AgentTool } from '../base/AgentTool';

// Factory pour initialiser tous les tools
export class AgentToolsFactory {
  /**
   * Création de tous les tools avec leurs dépendances
   */
  static createAllTools(
    supabaseClient: any,
    plotMatchingService: any,
    materialMatchingService: any,
    conversionMatchingService: any,
    phytosanitaryMatchingService: any
  ): AgentToolsCollection {
    
    console.log('🛠️ Creating all agent tools...');

    return {
      // Tools agricoles
      observationTool: new ObservationTool(supabaseClient, plotMatchingService),
      taskDoneTool: new TaskDoneTool(
        supabaseClient, 
        plotMatchingService, 
        materialMatchingService, 
        conversionMatchingService,
        phytosanitaryMatchingService
      ),
      taskPlannedTool: new TaskPlannedTool(
        supabaseClient,
        plotMatchingService,
        materialMatchingService
      ),
      harvestTool: new HarvestTool(
        supabaseClient,
        plotMatchingService, 
        conversionMatchingService
      ),

      // Tools de gestion
      plotTool: new PlotTool(supabaseClient, plotMatchingService),

      // Tools utilitaires
      helpTool: new HelpTool()
    };
  }

  /**
   * Enregistrement des tools dans un registry
   */
  static registerAllTools(
    toolRegistry: any,
    tools: AgentToolsCollection
  ): void {
    console.log('📝 Registering all tools...');

    // Tools agricoles
    toolRegistry.registerTool(tools.observationTool, 'agricultural');
    toolRegistry.registerTool(tools.taskDoneTool, 'agricultural');
    toolRegistry.registerTool(tools.taskPlannedTool, 'agricultural');
    toolRegistry.registerTool(tools.harvestTool, 'agricultural');

    // Tools de gestion
    toolRegistry.registerTool(tools.plotTool, 'management');

    // Tools utilitaires
    toolRegistry.registerTool(tools.helpTool, 'utility');

    console.log('✅ All tools registered successfully');
  }

  /**
   * Validation que tous les tools sont correctement configurés
   */
  static validateTools(tools: AgentToolsCollection): ToolValidationReport {
    const report: ToolValidationReport = {
      valid: true,
      errors: [],
      warnings: []
    };

    const toolsArray = Object.values(tools);
    
    for (const tool of toolsArray) {
      try {
        // Vérifications de base
        if (!tool.name || tool.name.length === 0) {
          report.errors.push(`Tool sans nom détecté`);
          report.valid = false;
        }

        if (!tool.description || tool.description.length < 10) {
          report.warnings.push(`Tool ${tool.name}: description trop courte`);
        }

        if (!tool.parameters || !tool.parameters.properties) {
          report.errors.push(`Tool ${tool.name}: paramètres manquants`);
          report.valid = false;
        }

        // Vérification que execute est implémentée
        if (typeof tool.execute !== 'function') {
          report.errors.push(`Tool ${tool.name}: méthode execute manquante`);
          report.valid = false;
        }

      } catch (error) {
        report.errors.push(`Erreur validation ${tool.name}: ${error.message}`);
        report.valid = false;
      }
    }

    console.log(`🔍 Tools validation completed:`, {
      valid: report.valid,
      errors_count: report.errors.length,
      warnings_count: report.warnings.length
    });

    return report;
  }

  /**
   * Génération d'un rapport d'usage des tools
   */
  static generateUsageReport(toolRegistry: any): ToolUsageReport {
    const stats = toolRegistry.getRegistryStats();
    
    return {
      total_tools: stats.total_tools,
      categories: stats.category_counts,
      total_usage: stats.total_usage,
      most_used_tools: [], // TODO: Implémenter avec vraies métriques
      performance_metrics: {
        avg_execution_time: 0, // TODO
        success_rate: 0, // TODO
        avg_confidence: 0 // TODO
      },
      recommendations: [
        'Continuer à utiliser Thomas pour optimiser les suggestions',
        'Ajouter des mots-clés LLM aux matériels pour améliorer le matching',
        'Configurer des conversions personnalisées pour plus de précision'
      ]
    };
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface AgentToolsCollection {
  // Agricultural tools
  observationTool: ObservationTool;
  taskDoneTool: TaskDoneTool;
  taskPlannedTool: TaskPlannedTool;
  harvestTool: HarvestTool;

  // Management tools
  plotTool: PlotTool;

  // Utility tools  
  helpTool: HelpTool;
}

interface ToolValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ToolUsageReport {
  total_tools: number;
  categories: Record<string, number>;
  total_usage: number;
  most_used_tools: Array<{
    name: string;
    usage_count: number;
    success_rate: number;
  }>;
  performance_metrics: {
    avg_execution_time: number;
    success_rate: number;
    avg_confidence: number;
  };
  recommendations: string[];
}
