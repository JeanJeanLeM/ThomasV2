import { SupabaseClient } from '@supabase/supabase-js';
import { AgentTool } from '../../base/AgentTool';
import { PlotMatchingService } from '../../matching/PlotMatchingService';
import { 
  AgentContext, 
  ToolResult, 
  ToolParameters,
  PlotType 
} from '../../types/AgentTypes';

/**
 * Tool de gestion des parcelles
 * Permet création, modification et consultation des parcelles
 * 
 * Fonctionnalités:
 * - Création de nouvelles parcelles avec validation
 * - Modification des parcelles existantes  
 * - Soft delete avec système is_active
 * - Gestion des aliases et mots-clés LLM
 * - Consultation et recherche de parcelles
 */
export class PlotTool extends AgentTool {
  readonly name = "manage_plot";
  readonly description = "Gérer les parcelles (créer, modifier, consulter, désactiver)";
  
  readonly parameters: ToolParameters = {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Opération à effectuer",
        enum: ["create", "modify", "list", "deactivate", "search"]
      },
      plot_name: {
        type: "string",
        description: "Nom de la parcelle"
      },
      plot_type: {
        type: "string", 
        description: "Type de parcelle",
        enum: ["serre_plastique", "serre_verre", "plein_champ", "tunnel", "hydroponique", "pepiniere", "autre"]
      },
      plot_code: {
        type: "string",
        description: "Code/identifiant de la parcelle"
      },
      dimensions: {
        type: "object",
        description: "Dimensions longueur x largeur en mètres"
      },
      description: {
        type: "string",
        description: "Description de la parcelle"
      },
      aliases: {
        type: "array",
        description: "Aliases pour reconnaissance vocale/textuelle"
      },
      llm_keywords: {
        type: "array", 
        description: "Mots-clés pour matching intelligent"
      }
    },
    required: ["operation"]
  };

  constructor(
    private supabase: SupabaseClient,
    private plotMatchingService: PlotMatchingService
  ) {
    super();
  }

  async execute(params: PlotManagementParams, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      console.log('🏗️ PlotTool executing:', params);
      
      // 1. Validation des paramètres
      this.validateParameters(params);

      // 2. Routage selon l'opération
      let result: ToolResult;
      
      switch (params.operation) {
        case 'create':
          result = await this.createPlot(params, context);
          break;
        case 'modify':
          result = await this.modifyPlot(params, context);
          break;
        case 'list':
          result = await this.listPlots(params, context);
          break;
        case 'deactivate':
          result = await this.deactivatePlot(params, context);
          break;
        case 'search':
          result = await this.searchPlots(params, context);
          break;
        default:
          throw new Error(`Opération ${params.operation} non supportée`);
      }

      // 3. Logging
      await this.logToolExecution(
        this.name,
        params,
        result,
        context,
        Date.now() - startTime
      );

      return result;

    } catch (error) {
      console.error('❌ PlotTool error:', error);
      return this.handleError(error, { params, context });
    }
  }

  /**
   * Création d'une nouvelle parcelle
   */
  private async createPlot(params: PlotManagementParams, context: AgentContext): Promise<ToolResult> {
    if (!params.plot_name) {
      return {
        success: false,
        error: "Nom de parcelle requis pour création",
        suggestions: ["Préciser le nom : ex. 'Serre 2', 'Tunnel Nord'"]
      };
    }

    try {
      // Vérifier que le nom n'existe pas déjà
      const { data: existing } = await this.supabase
        .from('plots')
        .select('id, name')
        .eq('farm_id', context.farm.id)
        .eq('name', params.plot_name)
        .eq('is_active', true)
        .single();

      if (existing) {
        return {
          success: false,
          error: `Une parcelle "${params.plot_name}" existe déjà`,
          suggestions: [
            "Utiliser un nom différent",
            "Ou modifier la parcelle existante"
          ]
        };
      }

      // Calcul de la surface si dimensions fournies
      const surfaceArea = params.dimensions?.length && params.dimensions?.width 
        ? params.dimensions.length * params.dimensions.width
        : null;

      // Création de la parcelle
      const { data: plot, error } = await this.supabase
        .from('plots')
        .insert({
          farm_id: context.farm.id,
          name: params.plot_name,
          code: params.plot_code,
          type: params.plot_type || 'autre',
          length: params.dimensions?.length,
          width: params.dimensions?.width,
          surface_area: surfaceArea,
          description: params.description,
          aliases: params.aliases || [],
          llm_keywords: params.llm_keywords || [params.plot_name.toLowerCase()],
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Échec création parcelle: ${error.message}`);
      }

      // Invalider cache du matching service
      this.plotMatchingService.clearCache();

      return {
        success: true,
        data: {
          plot_id: plot.id,
          plot_name: plot.name,
          plot_type: plot.type,
          surface_area: surfaceArea
        },
        message: `Parcelle "${params.plot_name}" créée avec succès${surfaceArea ? ` (${surfaceArea} m²)` : ''}`,
        suggestions: [
          "Ajouter des unités de surface si nécessaire (planches, rangs)",
          "Configurer des aliases pour faciliter l'usage vocal",
          "Ajouter des mots-clés LLM pour meilleur matching"
        ]
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Consultation des parcelles
   */
  private async listPlots(params: PlotManagementParams, context: AgentContext): Promise<ToolResult> {
    try {
      const activePlots = context.farm.plots.filter(p => p.is_active);
      
      if (activePlots.length === 0) {
        return {
          success: true,
          data: { plots: [] },
          message: "Aucune parcelle configurée",
          suggestions: [
            "Créer votre première parcelle : Profil → Configuration → Parcelles",
            "Dire : 'Créer une parcelle serre plastique'"
          ]
        };
      }

      const plotsList = activePlots.map(plot => {
        const surfaceUnitsCount = plot.surface_units.length;
        const surfaceInfo = plot.surface_units.length > 0 
          ? ` (${surfaceUnitsCount} unités)` 
          : '';
        
        return `• **${plot.name}** (${plot.type})${surfaceInfo}`;
      });

      return {
        success: true,
        data: { 
          plots: activePlots,
          total_count: activePlots.length
        },
        message: `Vous avez ${activePlots.length} parcelle(s) active(s) :\n\n${plotsList.join('\n')}`,
        suggestions: [
          "Créer une nouvelle parcelle si besoin",
          "Configurer des aliases pour meilleur matching",
          "Ajouter des unités de surface (planches, rangs)"
        ]
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Recherche de parcelles
   */
  private async searchPlots(params: PlotManagementParams, context: AgentContext): Promise<ToolResult> {
    if (!params.plot_name) {
      return {
        success: false,
        error: "Terme de recherche requis",
        suggestions: ["Préciser : ex. 'chercher serre', 'trouver tunnel'"]
      };
    }

    try {
      // Utiliser le service de matching pour recherche
      const matches = await this.plotMatchingService.matchPlots(params.plot_name, context.farm);
      
      if (matches.length === 0) {
        const suggestions = this.plotMatchingService.generatePlotSuggestions(context.farm);
        
        return {
          success: true,
          data: { matches: [] },
          message: `Aucune parcelle trouvée pour "${params.plot_name}"`,
          suggestions: [`Parcelles disponibles: ${suggestions.join(', ')}`]
        };
      }

      const resultsList = matches.map(match => {
        const confidencePercent = Math.round(match.confidence * 100);
        const surfaceUnits = match.surface_units 
          ? ` → ${match.surface_units.map(su => su.name).join(', ')}` 
          : '';
        
        return `• **${match.plot.name}** (${match.match_type}, ${confidencePercent}%)${surfaceUnits}`;
      });

      return {
        success: true,
        data: { 
          matches,
          search_term: params.plot_name
        },
        message: `Résultats de recherche pour "${params.plot_name}" :\n\n${resultsList.join('\n')}`,
        suggestions: [
          "Utiliser le nom exact pour 100% de confiance",
          "Configurer des aliases si matching imparfait"
        ]
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Désactivation (soft delete) d'une parcelle
   */
  private async deactivatePlot(params: PlotManagementParams, context: AgentContext): Promise<ToolResult> {
    if (!params.plot_name) {
      return {
        success: false,
        error: "Nom de parcelle requis pour désactivation",
        suggestions: ["Préciser : ex. 'désactiver serre 1'"]
      };
    }

    try {
      // Trouver la parcelle
      const matches = await this.plotMatchingService.matchPlots(params.plot_name, context.farm);
      
      if (matches.length === 0) {
        return {
          success: false,
          error: "Parcelle à désactiver non trouvée",
          suggestions: this.plotMatchingService.generatePlotSuggestions(context.farm)
        };
      }

      const plotToDeactivate = matches[0].plot;

      // Soft delete (is_active = false)
      const { error } = await this.supabase
        .from('plots')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', plotToDeactivate.id);

      if (error) {
        throw new Error(`Échec désactivation: ${error.message}`);
      }

      // Invalider cache
      this.plotMatchingService.clearCache();

      return {
        success: true,
        data: { 
          deactivated_plot_id: plotToDeactivate.id,
          plot_name: plotToDeactivate.name
        },
        message: `Parcelle "${plotToDeactivate.name}" désactivée avec succès`,
        suggestions: [
          "⚠️ La parcelle reste dans l'historique mais n'apparaît plus dans les listes actives",
          "Vous pouvez la réactiver depuis Configuration → Parcelles → Afficher inactives",
          "Les tâches liées à cette parcelle sont conservées"
        ]
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Modification d'une parcelle existante
   */
  private async modifyPlot(params: PlotManagementParams, context: AgentContext): Promise<ToolResult> {
    // TODO: Implémenter modification complète
    // Pour MVP, rediriger vers interface manuelle
    
    return {
      success: true,
      data: {},
      message: "Modification de parcelles disponible dans Profil → Configuration → Parcelles",
      suggestions: [
        "Sélectionner la parcelle à modifier",
        "Mettre à jour les informations nécessaires",
        "Sauvegarder les modifications"
      ]
    };
  }

  /**
   * Validation étendue pour gestion parcelles
   */
  protected validateParameters(params: PlotManagementParams): void {
    super.validateParameters(params);

    if (params.operation === 'create') {
      if (!params.plot_name || params.plot_name.length < 2) {
        throw new Error('Nom de parcelle requis (minimum 2 caractères)');
      }
      
      if (params.plot_type && !this.isValidPlotType(params.plot_type)) {
        throw new Error(`Type de parcelle invalide. Types valides: ${this.getValidPlotTypes().join(', ')}`);
      }
    }

    if (['modify', 'deactivate', 'search'].includes(params.operation)) {
      if (!params.plot_name) {
        throw new Error(`Nom de parcelle requis pour l'opération ${params.operation}`);
      }
    }
  }

  /**
   * Validation du type de parcelle
   */
  private isValidPlotType(type: string): boolean {
    return this.getValidPlotTypes().includes(type as PlotType);
  }

  /**
   * Types de parcelles valides
   */
  private getValidPlotTypes(): PlotType[] {
    return [
      'serre_plastique',
      'serre_verre', 
      'plein_champ',
      'tunnel',
      'hydroponique',
      'pepiniere',
      'autre'
    ];
  }

  /**
   * Suggestions spécialisées pour gestion parcelles
   */
  protected generateSuggestions(context: AgentContext, errorType?: string): string[] {
    const suggestions = super.generateSuggestions(context, errorType);

    // Ajout suggestions spécifiques parcelles
    suggestions.push('Utilisez des noms clairs : "Serre 1", "Tunnel Nord"');
    suggestions.push('Configurez des aliases pour faciliter l\'usage vocal');
    suggestions.push('Ajoutez des mots-clés LLM pour meilleur matching automatique');

    // Suggestions selon nombre de parcelles
    if (context.farm.plots.length === 0) {
      suggestions.push('🎯 Première parcelle → Configuration simple recommandée');
    } else if (context.farm.plots.length > 10) {
      suggestions.push('📊 Beaucoup de parcelles → Utiliser codes et catégories');
    }

    return suggestions;
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface PlotManagementParams {
  operation: 'create' | 'modify' | 'list' | 'deactivate' | 'search';
  plot_name?: string;
  plot_type?: PlotType;
  plot_code?: string;
  dimensions?: {
    length: number;
    width: number;
  };
  description?: string;
  aliases?: string[];
  llm_keywords?: string[];
}

