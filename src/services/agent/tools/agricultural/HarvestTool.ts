import { SupabaseClient } from '@supabase/supabase-js';
import { AgentTool } from '../../base/AgentTool';
import { PlotMatchingService } from '../../matching/PlotMatchingService';
import { ConversionMatchingService } from '../../matching/ConversionMatchingService';
import { 
  AgentContext, 
  ToolResult, 
  ToolParameters 
} from '../../types/AgentTypes';

/**
 * Tool spécialisé pour les récoltes avec gestion avancée
 * Extension de TaskDoneTool avec fonctionnalités spécifiques récolte
 * 
 * Fonctionnalités:
 * - Gestion quantités avec conversions automatiques
 * - Évaluation qualité de récolte
 * - Support contenants multiples
 * - Calcul rendement parcellaire
 * - Métadonnées météo et conditions
 * - Suggestions d'optimisation
 */
export class HarvestTool extends AgentTool {
  readonly name = "create_harvest";
  readonly description = "Créer une tâche de récolte avec quantités, qualité et conditions détaillées";
  
  readonly parameters: ToolParameters = {
    type: "object",
    properties: {
      crop: {
        type: "string",
        description: "Culture récoltée"
      },
      plot_reference: {
        type: "string", 
        description: "Parcelle ou zone de récolte"
      },
      quantity: {
        type: "string",
        description: "Quantité récoltée avec unité (ex: '3 caisses', '15 kg', '2 paniers')"
      },
      container_type: {
        type: "string",
        description: "Type de contenant utilisé (caisse, panier, bac, etc.)"
      },
      quality_assessment: {
        type: "string",
        description: "Évaluation de la qualité",
        enum: ["excellent", "good", "fair", "poor"]
      },
      harvest_conditions: {
        type: "string",
        description: "Conditions de récolte (météo, température, etc.)"
      },
      duration_minutes: {
        type: "number",
        description: "Durée de la récolte en minutes"
      },
      number_of_people: {
        type: "number",
        description: "Nombre de personnes ayant participé"
      },
      storage_location: {
        type: "string",
        description: "Lieu de stockage après récolte"
      },
      notes: {
        type: "string",
        description: "Observations complémentaires"
      }
    },
    required: ["crop", "plot_reference", "quantity"]
  };

  constructor(
    private supabase: SupabaseClient,
    private plotMatchingService: PlotMatchingService,
    private conversionMatchingService: ConversionMatchingService
  ) {
    super();
  }

  async execute(params: HarvestParams, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      console.log('🌾 HarvestTool executing:', params);
      
      // 1. Validation des paramètres
      this.validateParameters(params);

      // 2. Matching parcelles et conversions en parallèle
      const [plotMatches, conversions] = await Promise.all([
        this.plotMatchingService.matchPlots(params.plot_reference, context.farm),
        this.conversionMatchingService.resolveConversions(params.quantity, context.farm)
      ]);

      console.log('🎯 Harvest matching results:', {
        plots: plotMatches.length,
        conversions: conversions.length
      });

      // 3. Validation des matches critiques
      if (plotMatches.length === 0) {
        return {
          success: false,
          error: "Parcelle de récolte non trouvée",
          suggestions: this.plotMatchingService.generatePlotSuggestions(context.farm),
          recovery_suggestions: [
            "Vérifier le nom de la parcelle récoltée",
            "Utiliser un nom ou alias existant"
          ]
        };
      }

      const selectedPlot = plotMatches[0];
      const appliedConversion = conversions.length > 0 ? conversions[0] : null;

      // 4. Calcul des métriques de récolte
      const harvestMetrics = await this.calculateHarvestMetrics(
        selectedPlot,
        appliedConversion,
        context.farm.id
      );

      // 5. Construction des données de tâche de récolte
      const harvestTaskData = {
        farm_id: context.farm.id,
        user_id: context.user.id,
        title: `Récolte ${params.crop} - ${selectedPlot.plot.name}`,
        description: this.buildHarvestDescription(params, selectedPlot, appliedConversion, harvestMetrics),
        category: 'production',
        type: 'tache',
        date: new Date().toISOString().split('T')[0],
        duration_minutes: params.duration_minutes,
        number_of_people: params.number_of_people || 1,
        status: 'terminee',
        priority: 'moyenne',
        action: 'récolte',
        plants: [params.crop],
        plot_ids: [selectedPlot.plot.id],
        surface_unit_ids: selectedPlot.surface_units?.map(su => su.id) || [],
        material_ids: [],
        // Quantités structurées pour récolte
        quantity_value: appliedConversion?.original?.value || null,
        quantity_unit: appliedConversion?.original?.unit || null,
        quantity_nature: params.crop,
        quantity_type: 'recolte',
        quantity_converted_value: appliedConversion?.converted?.value || null,
        quantity_converted_unit: appliedConversion?.converted?.unit || null,
        notes: this.buildHarvestNotes(params, appliedConversion, harvestMetrics),
        ai_confidence: selectedPlot.confidence
      };

      // 6. Staging de l'action spécialisée récolte
      if (!context.analysis_id) {
        throw new Error('Analysis ID manquant');
      }

      const { data: actionStaging, error: stagingError } = await this.supabase
        .from('chat_analyzed_actions')
        .insert({
          analysis_id: context.analysis_id,
          action_type: 'harvest',
          action_data: {
            ...harvestTaskData,
            harvest_specifics: {
              quantity_harvested: appliedConversion?.original || { value: 0, unit: 'unités' },
              quantity_converted: appliedConversion?.converted,
              container_type: params.container_type,
              quality_grade: params.quality_assessment,
              storage_location: params.storage_location,
              harvest_conditions: params.harvest_conditions,
              yield_metrics: harvestMetrics
            }
          },
          matched_entities: {
            plot: selectedPlot,
            conversion: appliedConversion
          },
          confidence_score: this.calculateHarvestConfidence(selectedPlot, appliedConversion),
          status: 'validated'
        })
        .select()
        .single();

      if (stagingError) {
        throw new Error(`Échec staging récolte: ${stagingError.message}`);
      }

      // 7. Création de la tâche de récolte
      const { data: harvestTask, error: taskError } = await this.supabase
        .from('tasks')
        .insert(harvestTaskData)
        .select()
        .single();

      if (taskError) {
        await this.updateStagingStatus(actionStaging.id, 'failed', taskError.message);
        throw new Error(`Échec création tâche récolte: ${taskError.message}`);
      }

      // 8. Mise à jour du staging avec succès
      await this.updateStagingStatus(actionStaging.id, 'executed', undefined, harvestTask.id, 'task');

      // 9. Construction du message de succès avec détails récolte
      const successMessage = this.buildHarvestSuccessMessage(
        params,
        selectedPlot,
        appliedConversion,
        harvestMetrics
      );

      return {
        success: true,
        data: {
          harvest_task_id: harvestTask.id,
          action_staging_id: actionStaging.id,
          matched_plot: selectedPlot.plot.name,
          quantity_original: appliedConversion?.original,
          quantity_converted: appliedConversion?.converted,
          quality_grade: params.quality_assessment,
          yield_metrics: harvestMetrics,
          storage_location: params.storage_location
        },
        message: successMessage,
        confidence: this.calculateHarvestConfidence(selectedPlot, appliedConversion),
        suggestions: this.generateHarvestSuggestions(params, harvestMetrics)
      };

    } catch (error) {
      console.error('❌ HarvestTool error:', error);
      return this.handleError(error, { params, context });
    }
  }

  /**
   * Calcul des métriques de récolte
   */
  private async calculateHarvestMetrics(
    plot: any,
    conversion: any,
    farmId: number
  ): Promise<HarvestMetrics> {
    
    try {
      const plotArea = plot.plot.surface_area || this.estimatePlotArea(plot);
      const harvestedWeight = conversion?.converted?.unit === 'kg' ? conversion.converted.value : null;
      
      // Calcul rendement si possible
      const yieldPerM2 = harvestedWeight && plotArea ? harvestedWeight / plotArea : null;
      
      // Comparaison avec récoltes précédentes (requête historique)
      const previousHarvests = await this.getPreviousHarvests(plot.plot.id, farmId);
      const avgPreviousYield = this.calculateAverageYield(previousHarvests);
      
      const performanceVsPrevious = yieldPerM2 && avgPreviousYield 
        ? ((yieldPerM2 - avgPreviousYield) / avgPreviousYield) * 100
        : null;

      return {
        plot_area_m2: plotArea,
        harvested_weight_kg: harvestedWeight,
        yield_per_m2: yieldPerM2,
        previous_avg_yield: avgPreviousYield,
        performance_vs_previous: performanceVsPrevious,
        harvest_efficiency_score: this.calculateEfficiencyScore(yieldPerM2, avgPreviousYield)
      };

    } catch (error) {
      console.error('❌ Error calculating harvest metrics:', error);
      return {
        plot_area_m2: null,
        harvested_weight_kg: null,
        yield_per_m2: null,
        previous_avg_yield: null,
        performance_vs_previous: null,
        harvest_efficiency_score: null
      };
    }
  }

  /**
   * Récupération des récoltes précédentes pour comparaison
   */
  private async getPreviousHarvests(plotId: number, farmId: number): Promise<any[]> {
    try {
      const { data: tasks, error } = await this.supabase
        .from('tasks')
        .select('notes, ai_confidence, created_at')
        .eq('farm_id', farmId)
        .contains('plot_ids', [plotId])
        .eq('action', 'récolte')
        .eq('status', 'terminee')
        .order('created_at', { ascending: false })
        .limit(10);

      return error ? [] : (tasks || []);
    } catch (error) {
      console.error('❌ Error fetching previous harvests:', error);
      return [];
    }
  }

  /**
   * Estimation de surface si pas disponible
   */
  private estimatePlotArea(plot: any): number | null {
    // Si surface_units disponibles, calculer approximation
    if (plot.surface_units && plot.surface_units.length > 0) {
      const totalSurfaceUnits = plot.surface_units.length;
      // Estimation: 10m² par unité de surface (planche standard)
      return totalSurfaceUnits * 10;
    }
    
    return null;
  }

  /**
   * Calcul du rendement moyen des récoltes précédentes
   */
  private calculateAverageYield(previousHarvests: any[]): number | null {
    // TODO: Parser les notes pour extraire quantités des récoltes précédentes
    // Pour MVP, retourner null
    return null;
  }

  /**
   * Score d'efficacité de récolte
   */
  private calculateEfficiencyScore(
    currentYield: number | null,
    avgPreviousYield: number | null
  ): number | null {
    if (!currentYield || !avgPreviousYield) return null;
    
    // Score sur 100 basé sur performance vs historique
    const performance = ((currentYield - avgPreviousYield) / avgPreviousYield) * 100;
    return Math.max(0, Math.min(100, 50 + performance)); // Centré sur 50, max 100
  }

  /**
   * Construction du message de succès spécialisé récolte
   */
  private buildHarvestSuccessMessage(
    params: HarvestParams,
    plot: any,
    conversion: any,
    metrics: HarvestMetrics
  ): string {
    let message = `Récolte enregistrée: ${params.crop} sur ${plot.plot.name}`;
    
    // Quantités avec conversion
    if (conversion) {
      const originalQty = `${conversion.original.value} ${conversion.original.unit}`;
      const convertedQty = `${conversion.converted.value} ${conversion.converted.unit}`;
      
      if (conversion.source === 'user_conversion') {
        message += ` - ${originalQty} (${convertedQty})`;
      } else {
        message += ` - ${convertedQty}`;
      }
    }
    
    // Qualité
    if (params.quality_assessment) {
      const qualityEmojis = {
        'excellent': '🌟',
        'good': '✅', 
        'fair': '⚠️',
        'poor': '❌'
      };
      
      const emoji = qualityEmojis[params.quality_assessment as keyof typeof qualityEmojis] || '';
      message += ` ${emoji} Qualité: ${params.quality_assessment}`;
    }
    
    // Rendement si calculable
    if (metrics.yield_per_m2) {
      message += ` - Rendement: ${metrics.yield_per_m2.toFixed(1)} kg/m²`;
    }
    
    // Performance vs historique
    if (metrics.performance_vs_previous !== null) {
      const trend = metrics.performance_vs_previous > 0 ? '📈' : '📉';
      const sign = metrics.performance_vs_previous > 0 ? '+' : '';
      message += ` ${trend} ${sign}${metrics.performance_vs_previous.toFixed(1)}% vs moyenne`;
    }

    return message;
  }

  /**
   * Construction de la description détaillée
   */
  private buildHarvestDescription(
    params: HarvestParams,
    plot: any,
    conversion: any,
    metrics: HarvestMetrics
  ): string {
    const parts = [`Récolte de ${params.crop}`];
    
    if (plot.surface_units && plot.surface_units.length > 0) {
      parts.push(`sur ${plot.surface_units.length} unité(s) de ${plot.plot.name}`);
    } else {
      parts.push(`sur ${plot.plot.name}`);
    }
    
    if (conversion) {
      parts.push(`(${conversion.converted.value} ${conversion.converted.unit} récoltés)`);
    }
    
    if (params.quality_assessment) {
      parts.push(`- Qualité: ${params.quality_assessment}`);
    }
    
    if (metrics.yield_per_m2) {
      parts.push(`- Rendement: ${metrics.yield_per_m2.toFixed(1)} kg/m²`);
    }

    return parts.join(' ');
  }

  /**
   * Construction des notes détaillées de récolte
   */
  private buildHarvestNotes(
    params: HarvestParams,
    conversion: any,
    metrics: HarvestMetrics
  ): string {
    const notes: string[] = [];
    
    if (params.notes) {
      notes.push(`Notes: ${params.notes}`);
    }
    
    // Détails de conversion
    if (conversion) {
      notes.push(`Quantité: ${conversion.original.raw_text}`);
      if (conversion.source === 'user_conversion') {
        notes.push(`Conversion appliquée: ${conversion.converted.value} ${conversion.converted.unit}`);
        notes.push(`Source: conversion personnalisée`);
      }
    }
    
    // Conditions de récolte
    if (params.harvest_conditions) {
      notes.push(`Conditions: ${params.harvest_conditions}`);
    }
    
    // Stockage
    if (params.storage_location) {
      notes.push(`Stockage: ${params.storage_location}`);
    }
    
    // Métriques calculées
    if (metrics.plot_area_m2) {
      notes.push(`Surface récoltée: ${metrics.plot_area_m2} m²`);
    }
    
    if (metrics.harvest_efficiency_score) {
      notes.push(`Score d'efficacité: ${metrics.harvest_efficiency_score}/100`);
    }
    
    notes.push(`Créé via Thomas Agent Harvest - ${new Date().toLocaleString('fr-FR')}`);

    return notes.join('\n');
  }

  /**
   * Suggestions spécialisées pour récoltes
   */
  private generateHarvestSuggestions(
    params: HarvestParams,
    metrics: HarvestMetrics
  ): string[] {
    const suggestions: string[] = [];
    
    // Suggestions selon la qualité
    if (params.quality_assessment === 'poor') {
      suggestions.push('💡 Analyser les causes de la mauvaise qualité');
      suggestions.push('Considérer un traitement préventif pour les prochaines cultures');
    } else if (params.quality_assessment === 'excellent') {
      suggestions.push('🌟 Excellente récolte ! Noter les conditions pour reproduire');
    }
    
    // Suggestions de rendement
    if (metrics.performance_vs_previous && metrics.performance_vs_previous < -10) {
      suggestions.push('📉 Rendement en baisse - vérifier fertilisation et irrigation');
    } else if (metrics.performance_vs_previous && metrics.performance_vs_previous > 15) {
      suggestions.push('📈 Excellent rendement - documenter les pratiques gagnantes');
    }
    
    // Suggestions de stockage
    if (!params.storage_location) {
      suggestions.push('🏪 Préciser le lieu de stockage pour traçabilité');
    }
    
    // Suggestions de suivi
    suggestions.push('📊 Consulter les statistiques de rendement dans Analytics');
    
    return suggestions;
  }

  /**
   * Calcul de la confiance spécialisée récolte
   */
  private calculateHarvestConfidence(plot: any, conversion: any): number {
    const plotConfidence = plot.confidence;
    const conversionConfidence = conversion?.confidence || 0.8;
    
    // Pondération: plot plus critique pour récolte
    return (plotConfidence * 0.7) + (conversionConfidence * 0.3);
  }

  /**
   * Mise à jour du statut staging
   */
  private async updateStagingStatus(
    actionId: string,
    status: 'executed' | 'failed',
    errorMessage?: string,
    createdRecordId?: string,
    createdRecordType?: 'task'
  ): Promise<void> {
    
    const updateData: any = {
      status,
      executed_at: new Date().toISOString()
    };

    if (errorMessage) updateData.error_message = errorMessage;
    if (createdRecordId) {
      updateData.created_record_id = createdRecordId;
      updateData.created_record_type = createdRecordType;
    }

    await this.supabase
      .from('chat_analyzed_actions')
      .update(updateData)
      .eq('id', actionId);
  }

  /**
   * Validation étendue pour récoltes
   */
  protected validateParameters(params: HarvestParams): void {
    super.validateParameters(params);

    if (params.quality_assessment && 
        !['excellent', 'good', 'fair', 'poor'].includes(params.quality_assessment)) {
      throw new Error('Évaluation de qualité invalide');
    }

    if (params.duration_minutes && (params.duration_minutes < 5 || params.duration_minutes > 480)) {
      throw new Error('Durée de récolte doit être entre 5 minutes et 8 heures');
    }
  }
}

// ============================================================================
// INTERFACES & TYPES  
// ============================================================================

interface HarvestParams {
  crop: string;
  plot_reference: string;
  quantity: string;
  container_type?: string;
  quality_assessment?: 'excellent' | 'good' | 'fair' | 'poor';
  harvest_conditions?: string;
  duration_minutes?: number;
  number_of_people?: number;
  storage_location?: string;
  notes?: string;
}

interface HarvestMetrics {
  plot_area_m2: number | null;
  harvested_weight_kg: number | null;
  yield_per_m2: number | null;
  previous_avg_yield: number | null;
  performance_vs_previous: number | null; // Pourcentage
  harvest_efficiency_score: number | null; // 0-100
}

