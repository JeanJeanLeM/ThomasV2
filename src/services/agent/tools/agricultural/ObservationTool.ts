import { SupabaseClient } from '@supabase/supabase-js';
import { AgentTool } from '../../base/AgentTool';
import { PlotMatchingService } from '../../matching/PlotMatchingService';
import { 
  AgentContext, 
  ToolResult, 
  ToolParameters,
  ObservationCategory,
  SeverityLevel 
} from '../../types/AgentTypes';

/**
 * Tool pour créer des observations agricoles
 * Gère les constats terrain (maladies, ravageurs, problèmes)
 * 
 * Fonctionnalités:
 * - Matching intelligent des parcelles mentionnées
 * - Catégorisation automatique des problèmes
 * - Validation des paramètres d'entrée
 * - Création dans table observations existante
 * - Staging dans chat_analyzed_actions
 */
export class ObservationTool extends AgentTool {
  readonly name = "create_observation";
  readonly description = "Créer une observation agricole basée sur un constat terrain (maladie, ravageur, problème)";
  
  readonly parameters: ToolParameters = {
    type: "object",
    properties: {
      crop: { 
        type: "string", 
        description: "Culture concernée par l'observation" 
      },
      issue: { 
        type: "string", 
        description: "Problème ou constat observé" 
      },
      severity: { 
        type: "string", 
        description: "Gravité du problème",
        enum: ["low", "medium", "high", "critical"]
      },
      plot_reference: { 
        type: "string", 
        description: "Référence de la parcelle mentionnée" 
      },
      notes: { 
        type: "string", 
        description: "Notes complémentaires optionnelles" 
      }
    },
    required: ["crop", "issue", "plot_reference"]
  };

  constructor(
    private supabase: SupabaseClient,
    private plotMatchingService: PlotMatchingService
  ) {
    super();
  }

  async execute(params: ObservationParams, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      console.log('👁️ ObservationTool executing:', params);
      
      // 1. Validation des paramètres
      this.validateParameters(params);

      // 2. Matching de la parcelle mentionnée
      const plotMatches = await this.plotMatchingService.matchPlots(
        params.plot_reference,
        context.farm
      );

      if (plotMatches.length === 0) {
        return {
          success: false,
          error: "Parcelle non trouvée",
          suggestions: this.plotMatchingService.generatePlotSuggestions(context.farm, 5),
          recovery_suggestions: [
            "Vérifier l'orthographe du nom de la parcelle",
            "Utiliser un alias de la parcelle si disponible",
            "Consulter la liste des parcelles dans Profil > Configuration"
          ]
        };
      }

      // 3. Sélection du meilleur match
      const selectedPlot = plotMatches[0]; // Highest confidence
      console.log('🎯 Plot matched:', { 
        plot: selectedPlot.plot.name, 
        confidence: selectedPlot.confidence 
      });

      // 4. Catégorisation automatique du problème
      const category = this.categorizeIssue(params.issue);
      console.log('🏷️ Issue categorized:', { issue: params.issue, category });

      // 5. Staging de l'action dans chat_analyzed_actions
      if (!context.analysis_id) {
        throw new Error('Analysis ID manquant du contexte');
      }

      const { data: actionStaging, error: stagingError } = await this.supabase
        .from('chat_analyzed_actions')
        .insert({
          analysis_id: context.analysis_id,
          action_type: 'observation',
          action_data: {
            title: `${params.issue} - ${params.crop}`,
            category,
            nature: params.issue,
            crop: params.crop,
            severity: params.severity || 'medium',
            notes: params.notes
          },
          matched_entities: {
            plot: {
              id: selectedPlot.plot.id,
              name: selectedPlot.plot.name,
              type: selectedPlot.plot.type
            },
            surface_units: selectedPlot.surface_units?.map(su => ({
              id: su.id,
              name: su.name,
              type: su.type
            })) || []
          },
          confidence_score: selectedPlot.confidence,
          status: 'validated'
        })
        .select()
        .single();

      if (stagingError) {
        throw new Error(`Échec staging action: ${stagingError.message}`);
      }

      // 6. Création de l'observation finale
      const { data: observation, error: obsError } = await this.supabase
        .from('observations')
        .insert({
          farm_id: context.farm.id,
          user_id: context.user.id,
          title: `${params.issue} - ${params.crop}`,
          category,
          nature: params.issue,
          crop: params.crop,
          plot_ids: [selectedPlot.plot.id],
          surface_unit_ids: selectedPlot.surface_units?.map(su => su.id) || [],
          status: 'active'
        })
        .select()
        .single();

      if (obsError) {
        // Marquer le staging comme échoué
        await this.updateStagingStatus(actionStaging.id, 'failed', obsError.message);
        throw new Error(`Échec création observation: ${obsError.message}`);
      }

      // 7. Mise à jour du staging avec succès
      await this.updateStagingStatus(
        actionStaging.id, 
        'executed', 
        undefined,
        observation.id,
        'observation'
      );

      // 8. Logging de l'exécution
      await this.logToolExecution(
        this.name,
        params,
        { success: true, confidence: selectedPlot.confidence },
        context,
        Date.now() - startTime
      );

      // 9. Retour du résultat de succès
      const plotDescription = selectedPlot.surface_units && selectedPlot.surface_units.length > 0
        ? `${selectedPlot.plot.name} (${selectedPlot.surface_units.map(su => su.name).join(', ')})`
        : selectedPlot.plot.name;

      return {
        success: true,
        data: {
          observation_id: observation.id,
          action_staging_id: actionStaging.id,
          matched_plot: selectedPlot.plot.name,
          matched_surface_units: selectedPlot.surface_units?.map(su => su.name) || [],
          category_detected: category,
          severity: params.severity || 'medium'
        },
        message: `Observation créée: ${params.issue} sur ${params.crop} (${plotDescription})`,
        confidence: selectedPlot.confidence
      };

    } catch (error) {
      console.error('❌ ObservationTool error:', error);
      return this.handleError(error, { params, context });
    }
  }

  /**
   * Catégorisation automatique des problèmes agricoles
   */
  private categorizeIssue(issue: string): ObservationCategory {
    const issueLower = issue.toLowerCase();
    
    // Classification par mots-clés
    const categories = {
      'ravageurs': [
        'puceron', 'pucerons', 'aphid', 'chenille', 'chenilles', 'limace', 'limaces', 
        'doryphore', 'doryphores', 'thrips', 'acarien', 'acariens', 'cochenille',
        'aleurode', 'mouche', 'vers', 'larve', 'larves', 'insecte', 'insectes'
      ],
      'maladies': [
        'mildiou', 'oïdium', 'oidium', 'rouille', 'pourriture', 'fusarium', 
        'botrytis', 'alternaria', 'anthracnose', 'cercosporiose', 'verticillium',
        'tache', 'taches', 'moisissure', 'champignon', 'bactérie', 'virus'
      ],
      'physiologie': [
        'carence', 'carences', 'brûlure', 'brulure', 'stress', 'flétrissement',
        'flétrissement', 'jaunissement', 'dessèchement', 'nécrose', 
        'chlorose', 'déficience', 'excès', 'toxicité'
      ],
      'sol': [
        'sol', 'terre', 'substrat', 'drainage', 'compaction', 'érosion',
        'ph', 'acidité', 'alcalinité', 'salinité', 'structure'
      ],
      'météo': [
        'gel', 'grêle', 'vent', 'sécheresse', 'humidité', 'température',
        'chaleur', 'froid', 'pluie', 'orage'
      ]
    };

    // Recherche du meilleur match
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => issueLower.includes(keyword))) {
        return category as ObservationCategory;
      }
    }

    return 'autre';
  }

  /**
   * Mise à jour du statut dans chat_analyzed_actions
   */
  private async updateStagingStatus(
    actionId: string,
    status: 'executed' | 'failed',
    errorMessage?: string,
    createdRecordId?: string,
    createdRecordType?: 'observation'
  ): Promise<void> {
    
    const updateData: any = {
      status,
      executed_at: new Date().toISOString()
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (createdRecordId) {
      updateData.created_record_id = createdRecordId;
      updateData.created_record_type = createdRecordType;
    }

    const { error } = await this.supabase
      .from('chat_analyzed_actions')
      .update(updateData)
      .eq('id', actionId);

    if (error) {
      console.error('❌ Failed to update staging status:', error);
    }
  }

  /**
   * Validation étendue spécifique aux observations
   */
  protected validateParameters(params: ObservationParams): void {
    super.validateParameters(params);

    // Validations spécifiques
    if (params.crop && params.crop.length < 2) {
      throw new Error('Le nom de la culture doit faire au moins 2 caractères');
    }

    if (params.issue && params.issue.length < 3) {
      throw new Error('La description du problème doit faire au moins 3 caractères');
    }

    if (params.plot_reference && params.plot_reference.length < 1) {
      throw new Error('La référence de parcelle ne peut pas être vide');
    }

    if (params.severity && !['low', 'medium', 'high', 'critical'].includes(params.severity)) {
      throw new Error('Niveau de gravité invalide');
    }
  }

  /**
   * Suggestions contextuelles pour les observations
   */
  protected generateSuggestions(context: AgentContext, errorType?: string): string[] {
    const suggestions = super.generateSuggestions(context, errorType);

    // Suggestions spécifiques aux observations
    suggestions.push('Décrire les symptômes observés précisément');
    suggestions.push('Préciser la gravité du problème (faible, moyenne, haute)');
    suggestions.push('Indiquer si le problème s\'étend à d\'autres parcelles');

    // Suggestions basées sur les parcelles disponibles
    if (context.farm.plots.length > 0) {
      const plotNames = context.farm.plots
        .filter(p => p.is_active)
        .slice(0, 3)
        .map(p => p.name);
      
      suggestions.push(`Parcelles disponibles: ${plotNames.join(', ')}`);
    }

    return suggestions;
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface ObservationParams {
  crop: string;
  issue: string;
  severity?: SeverityLevel;
  plot_reference: string;
  notes?: string;
}

