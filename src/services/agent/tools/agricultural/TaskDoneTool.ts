import { SupabaseClient } from '@supabase/supabase-js';
import { AgentTool } from '../../base/AgentTool';
import { PlotMatchingService } from '../../matching/PlotMatchingService';
import { MaterialMatchingService } from '../../matching/MaterialMatchingService';
import { ConversionMatchingService } from '../../matching/ConversionMatchingService';
import { PhytosanitaryMatchingService } from '../../matching/PhytosanitaryMatchingService';
import { 
  AgentContext, 
  ToolResult, 
  ToolParameters,
  TaskPriority 
} from '../../types/AgentTypes';

/**
 * Tool pour créer des tâches réalisées
 * Gère les actions agricoles accomplies avec matching multi-entités
 * 
 * Fonctionnalités:
 * - Matching intelligent parcelles + matériels + conversions
 * - Support quantités avec conversions automatiques
 * - Gestion durée et nombre de personnes
 * - Création dans table tasks existante
 * - Workflow staging → validation → création
 */
export class TaskDoneTool extends AgentTool {
  readonly name = "create_task_done";
  readonly description = "Créer une tâche agricole réalisée avec détails d'exécution";
  
  readonly parameters: ToolParameters = {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "Action réalisée (plantation, récolte, traitement, etc.)"
      },
      crop: {
        type: "string", 
        description: "Culture concernée"
      },
      plot_reference: {
        type: "string",
        description: "Référence de la parcelle"
      },
      quantity: {
        type: "string",
        description: "Quantité avec unité (ex: '3 caisses', '15 kg')"
      },
      material_reference: {
        type: "string",
        description: "Matériel utilisé (optionnel)"
      },
      duration_minutes: {
        type: "number",
        description: "Durée en minutes (optionnel)"
      },
      number_of_people: {
        type: "number",
        description: "Nombre de personnes impliquées"
      },
      notes: {
        type: "string",
        description: "Notes complémentaires"
      }
    },
    required: ["action", "crop", "plot_reference"]
  };

  constructor(
    private supabase: SupabaseClient,
    private plotMatchingService: PlotMatchingService,
    private materialMatchingService: MaterialMatchingService,
    private conversionMatchingService: ConversionMatchingService,
    private phytosanitaryMatchingService: PhytosanitaryMatchingService
  ) {
    super();
  }

  async execute(params: TaskDoneParams, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      console.log('✅ TaskDoneTool executing:', params);
      
      // 1. Validation des paramètres
      this.validateParameters(params);

      // 2. Matching multi-entités en parallèle
      const [plotMatches, materialMatches, conversions] = await Promise.all([
        this.plotMatchingService.matchPlots(params.plot_reference, context.farm),
        params.material_reference 
          ? this.materialMatchingService.matchMaterials(params.material_reference, context.farm)
          : Promise.resolve([]),
        params.quantity 
          ? this.conversionMatchingService.resolveConversions(params.quantity, context.farm)
          : Promise.resolve([])
      ]);

      console.log('🎯 Multi-entity matching results:', {
        plots: plotMatches.length,
        materials: materialMatches.length,
        conversions: conversions.length
      });

      // 3. Validation des matches critiques
      if (plotMatches.length === 0) {
        return {
          success: false,
          error: "Parcelle non trouvée",
          suggestions: this.plotMatchingService.generatePlotSuggestions(context.farm),
          recovery_suggestions: [
            "Vérifier le nom de la parcelle",
            "Consulter vos parcelles dans Configuration"
          ]
        };
      }

      const selectedPlot = plotMatches[0];
      const selectedMaterial = materialMatches.length > 0 ? materialMatches[0] : null;
      const appliedConversion = conversions.length > 0 ? conversions[0] : null;

      // 4. Construction des données de tâche
      // Titre court: "Action Culture" ou juste "Action"
      const capitalizeFirst = (str: string) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      };
      
      const title = params.crop
        ? `${capitalizeFirst(params.action)} ${capitalizeFirst(params.crop)}`
        : capitalizeFirst(params.action);
      
      // Inférer quantity_nature et quantity_type depuis appliedConversion
      const quantityNature = appliedConversion?.original?.unit || params.crop || null;
      const quantityType = this.inferQuantityType(params.action, params.quantity);
      
      // Matching produit phytosanitaire si quantity_type est 'produit_phyto'
      let phytosanitaryProductAmm: string | null = null;
      if (quantityType === 'produit_phyto' && quantityNature) {
        console.log('🌿 [TaskDoneTool] Recherche matching produit phytosanitaire:', quantityNature);
        const productMatch = await this.phytosanitaryMatchingService.matchProduct(
          quantityNature,
          context.farm
        );
        
        if (productMatch) {
          phytosanitaryProductAmm = productMatch.amm;
          console.log('✅ [TaskDoneTool] Produit matché:', productMatch.name, 'AMM:', productMatch.amm);
        } else {
          console.log('⚠️ [TaskDoneTool] Aucun produit matché pour:', quantityNature);
        }
      }
      
      const taskData = {
        farm_id: context.farm.id,
        user_id: context.user.id,
        title: title,
        description: this.buildTaskDescription(params, selectedPlot, selectedMaterial, appliedConversion),
        category: this.inferTaskCategory(params.action),
        type: 'tache',
        date: new Date().toISOString().split('T')[0], // Date d'aujourd'hui
        duration_minutes: params.duration_minutes,
        number_of_people: params.number_of_people || 1,
        status: 'terminee', // Tâche déjà réalisée
        priority: 'moyenne' as TaskPriority,
        action: params.action,
        plants: [params.crop],
        plot_ids: [selectedPlot.plot.id],
        surface_unit_ids: selectedPlot.surface_units?.map(su => su.id) || [],
        material_ids: selectedMaterial ? [selectedMaterial.material.id] : [],
        // Quantités structurées
        quantity_value: appliedConversion?.original?.value || null,
        quantity_unit: appliedConversion?.original?.unit || null,
        quantity_nature: quantityNature, // Garde le nom pour l'affichage
        quantity_type: quantityType,
        phytosanitary_product_amm: phytosanitaryProductAmm, // AMM pour le matching
        quantity_converted_value: appliedConversion?.converted?.value || null,
        quantity_converted_unit: appliedConversion?.converted?.unit || null,
        notes: this.buildTaskNotes(params, appliedConversion),
        ai_confidence: selectedPlot.confidence
      };

      // 5. Staging de l'action
      if (!context.analysis_id) {
        throw new Error('Analysis ID manquant');
      }

      const { data: actionStaging, error: stagingError } = await this.supabase
        .from('chat_analyzed_actions')
        .insert({
          analysis_id: context.analysis_id,
          action_type: 'task_done',
          action_data: {
            ...taskData,
            quantity_details: appliedConversion ? {
              original: appliedConversion.original,
              converted: appliedConversion.converted,
              source: appliedConversion.source
            } : null
          },
          matched_entities: {
            plot: selectedPlot,
            material: selectedMaterial,
            conversion: appliedConversion
          },
          confidence_score: this.calculateOverallConfidence([
            selectedPlot.confidence,
            selectedMaterial?.confidence || 0.8,
            appliedConversion?.confidence || 0.8
          ]),
          status: 'validated'
        })
        .select()
        .single();

      if (stagingError) {
        throw new Error(`Échec staging: ${stagingError.message}`);
      }

      // 6. Création de la tâche finale
      const { data: task, error: taskError } = await this.supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (taskError) {
        await this.updateStagingStatus(actionStaging.id, 'failed', taskError.message);
        throw new Error(`Échec création tâche: ${taskError.message}`);
      }

      // 7. Mise à jour du staging avec succès
      await this.updateStagingStatus(actionStaging.id, 'executed', undefined, task.id, 'task');

      // 8. Construction du message de succès
      const successMessage = this.buildSuccessMessage(
        params, 
        selectedPlot, 
        selectedMaterial, 
        appliedConversion
      );

      return {
        success: true,
        data: {
          task_id: task.id,
          action_staging_id: actionStaging.id,
          matched_plot: selectedPlot.plot.name,
          matched_material: selectedMaterial?.material.name,
          applied_conversion: appliedConversion,
          total_confidence: this.calculateOverallConfidence([
            selectedPlot.confidence,
            selectedMaterial?.confidence || 0.8,
            appliedConversion?.confidence || 0.8
          ])
        },
        message: successMessage,
        confidence: selectedPlot.confidence
      };

    } catch (error) {
      console.error('❌ TaskDoneTool error:', error);
      return this.handleError(error, { params, context });
    }
  }

  /**
   * Construction de la description de tâche
   */
  private buildTaskDescription(
    params: TaskDoneParams,
    plot: any,
    material: any,
    conversion: any
  ): string {
    const parts = [`${params.action} ${params.crop}`];
    
    if (plot) {
      const plotDesc = plot.surface_units && plot.surface_units.length > 0
        ? `${plot.plot.name} (${plot.surface_units.map((su: any) => su.name).join(', ')})`
        : plot.plot.name;
      parts.push(`sur ${plotDesc}`);
    }
    
    if (conversion) {
      parts.push(`(${conversion.original.raw_text} = ${conversion.converted.value} ${conversion.converted.unit})`);
    }
    
    if (material) {
      parts.push(`avec ${material.material.name}`);
    }

    return parts.join(' ');
  }

  /**
   * Construction des notes de tâche avec détails
   */
  private buildTaskNotes(params: TaskDoneParams, conversion: any): string {
    const notes: string[] = [];
    
    if (params.notes) {
      notes.push(params.notes);
    }

    if (conversion && conversion.source === 'user_conversion') {
      notes.push(`Conversion appliquée: ${conversion.original.raw_text} → ${conversion.converted.value} ${conversion.converted.unit}`);
    }

    notes.push(`Créé via Thomas Agent - ${new Date().toLocaleDateString('fr-FR')}`);

    return notes.join('\n');
  }

  /**
   * Inférence de catégorie de tâche selon l'action
   */
  private inferTaskCategory(action: string): 'production' | 'marketing' | 'administratif' | 'general' {
    const actionLower = action.toLowerCase();
    
    const categories = {
      'production': [
        'plantation', 'semis', 'repiquage', 'récolte', 'ramassage', 
        'traitement', 'pulvérisation', 'arrosage', 'taille', 'désherbage',
        'binage', 'buttage', 'paillage', 'fertilisation'
      ],
      'marketing': [
        'vente', 'livraison', 'conditionnement', 'étiquetage',
        'pesée', 'tri', 'emballage'
      ],
      'administratif': [
        'facturation', 'commande', 'planification', 'réunion',
        'formation', 'contrôle', 'audit'
      ]
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => actionLower.includes(keyword))) {
        return category as any;
      }
    }

    return 'production'; // Défaut pour les actions agricoles
  }

  /**
   * Inférer le type de quantité selon l'action
   */
  private inferQuantityType(action: string, quantity?: string): string | null {
    if (!quantity) return null;
    
    const actionLower = action.toLowerCase();
    
    // Plantation
    if (actionLower.includes('plant') || actionLower.includes('sem') || 
        actionLower.includes('repiq') || actionLower.includes('transplant')) {
      return 'plantation';
    }
    
    // Récolte
    if (actionLower.includes('récolt') || actionLower.includes('ramass') || 
        actionLower.includes('cueil')) {
      return 'recolte';
    }
    
    // Produits phytosanitaires
    if (actionLower.includes('pulvér') || actionLower.includes('trait') || 
        actionLower.includes('bouillie') || actionLower.includes('phyto')) {
      return 'produit_phyto';
    }
    
    // Engrais
    if (actionLower.includes('compost') || actionLower.includes('fumier') || 
        actionLower.includes('engrais') || actionLower.includes('fertilisa') || 
        actionLower.includes('apport') || actionLower.includes('épand') ||
        actionLower.includes('broyat')) {
      return 'engrais';
    }
    
    // Vente
    if (actionLower.includes('vend') || actionLower.includes('vente') || 
        (quantity && (quantity.includes('€') || quantity.includes('euro')))) {
      return 'vente';
    }
    
    return 'autre';
  }

  /**
   * Construction du message de succès détaillé
   */
  private buildSuccessMessage(
    params: TaskDoneParams,
    plot: any,
    material: any,
    conversion: any
  ): string {
    let message = `Tâche créée: ${params.action} ${params.crop}`;
    
    // Détails de parcelle
    if (plot) {
      const plotDesc = plot.surface_units && plot.surface_units.length > 0
        ? `${plot.plot.name} (${plot.surface_units.length} unité(s))`
        : plot.plot.name;
      message += ` sur ${plotDesc}`;
    }
    
    // Détails de quantité convertie
    if (conversion) {
      const originalQty = `${conversion.original.value} ${conversion.original.unit}`;
      const convertedQty = `${conversion.converted.value} ${conversion.converted.unit}`;
      
      if (conversion.source === 'user_conversion') {
        message += ` - Quantité: ${originalQty} (${convertedQty} selon vos conversions)`;
      } else {
        message += ` - Quantité: ${convertedQty}`;
      }
    }
    
    // Détails de matériel
    if (material) {
      message += ` avec ${material.material.name}`;
      if (material.confidence < 0.9) {
        message += ` (${Math.round(material.confidence * 100)}% confiance)`;
      }
    }

    return message;
  }

  /**
   * Calcul de la confiance globale multi-entités
   */
  private calculateOverallConfidence(confidences: number[]): number {
    const validConfidences = confidences.filter(c => c > 0);
    if (validConfidences.length === 0) return 0.5;
    
    // Moyenne pondérée (plot plus important)
    const weights = [0.5, 0.3, 0.2]; // plot, material, conversion
    let weightedSum = 0;
    let totalWeight = 0;
    
    validConfidences.forEach((confidence, index) => {
      const weight = weights[index] || 0.1;
      weightedSum += confidence * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Mise à jour du statut dans staging
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
   * Validation étendue pour tâches réalisées
   */
  protected validateParameters(params: TaskDoneParams): void {
    super.validateParameters(params);

    // Validations spécifiques
    if (params.action && params.action.length < 2) {
      throw new Error('L\'action doit faire au moins 2 caractères');
    }

    if (params.duration_minutes && (params.duration_minutes < 1 || params.duration_minutes > 1440)) {
      throw new Error('La durée doit être entre 1 minute et 24 heures');
    }

    if (params.number_of_people && (params.number_of_people < 1 || params.number_of_people > 50)) {
      throw new Error('Le nombre de personnes doit être entre 1 et 50');
    }
  }

  /**
   * Suggestions contextuelles pour tâches réalisées
   */
  protected generateSuggestions(context: AgentContext, errorType?: string): string[] {
    const suggestions = super.generateSuggestions(context, errorType);

    suggestions.push('Préciser la quantité récoltée/traitée si applicable');
    suggestions.push('Indiquer la durée approximative du travail');
    suggestions.push('Mentionner le matériel utilisé si pertinent');

    // Suggestions basées sur conversions disponibles
    if (context.farm.conversions.length > 0) {
      const conversionExamples = context.farm.conversions
        .slice(0, 2)
        .map(conv => `"${conv.container_name}" = ${conv.conversion_value} ${conv.conversion_unit}`)
        .join(', ');
      
      suggestions.push(`Conversions disponibles: ${conversionExamples}`);
    }

    return suggestions;
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface TaskDoneParams {
  action: string;
  crop: string;
  plot_reference: string;
  quantity?: string;
  material_reference?: string;
  duration_minutes?: number;
  number_of_people?: number;
  notes?: string;
}

