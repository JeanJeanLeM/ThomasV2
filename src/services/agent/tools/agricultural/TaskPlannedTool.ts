import { SupabaseClient } from '@supabase/supabase-js';
import { AgentTool } from '../../base/AgentTool';
import { PlotMatchingService } from '../../matching/PlotMatchingService';
import { MaterialMatchingService } from '../../matching/MaterialMatchingService';
import { 
  AgentContext, 
  ToolResult, 
  ToolParameters,
  TaskPriority 
} from '../../types/AgentTypes';

/**
 * Tool pour créer des tâches planifiées  
 * Gère la programmation d'actions futures avec parsing dates français
 * 
 * Fonctionnalités:
 * - Parsing intelligent des dates françaises ("demain", "lundi prochain", "15/12")
 * - Matching parcelles et matériels
 * - Gestion des priorités et durées estimées
 * - Support récurrence (futures extensions)
 * - Suggestions de planning optimal
 */
export class TaskPlannedTool extends AgentTool {
  readonly name = "create_task_planned";
  readonly description = "Créer une tâche agricole planifiée avec date et détails";
  
  readonly parameters: ToolParameters = {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "Action à planifier (plantation, traitement, récolte, etc.)"
      },
      crop: {
        type: "string",
        description: "Culture concernée"
      },
      plot_reference: {
        type: "string", 
        description: "Référence de la parcelle"
      },
      date_reference: {
        type: "string",
        description: "Date planifiée (demain, lundi, 15/12, dans 3 jours)"
      },
      time_reference: {
        type: "string",
        description: "Heure planifiée optionnelle (matin, 14h30, après-midi)"
      },
      material_reference: {
        type: "string",
        description: "Matériel nécessaire (optionnel)"
      },
      priority: {
        type: "string",
        description: "Priorité de la tâche",
        enum: ["basse", "moyenne", "haute", "urgente"]
      },
      duration_minutes: {
        type: "number", 
        description: "Durée estimée en minutes"
      },
      number_of_people: {
        type: "number",
        description: "Nombre de personnes nécessaires"
      },
      notes: {
        type: "string",
        description: "Notes de planification"
      }
    },
    required: ["action", "crop", "plot_reference", "date_reference"]
  };

  constructor(
    private supabase: SupabaseClient,
    private plotMatchingService: PlotMatchingService,
    private materialMatchingService: MaterialMatchingService
  ) {
    super();
  }

  async execute(params: TaskPlannedParams, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      console.log('📅 TaskPlannedTool executing:', params);
      
      // 1. Validation des paramètres
      this.validateParameters(params);

      // 2. Parsing de la date française
      const parsedDate = this.parseFrenchDate(params.date_reference);
      if (!parsedDate.valid) {
        return {
          success: false,
          error: "Date non comprise",
          suggestions: [
            'Utiliser des formats comme: "demain", "lundi", "15/12/2024"',
            'Ou des expressions: "dans 3 jours", "la semaine prochaine"',
            ...parsedDate.suggestions
          ],
          recovery_suggestions: [
            "Reformuler avec une date plus précise",
            "Utiliser le format DD/MM/YYYY"
          ]
        };
      }

      // 3. Parsing de l'heure si fournie
      const parsedTime = params.time_reference ? 
        this.parseFrenchTime(params.time_reference) : 
        { valid: true, time: null, confidence: 0.5, suggestions: [] };

      // 4. Matching parcelles et matériels en parallèle
      const [plotMatches, materialMatches] = await Promise.all([
        this.plotMatchingService.matchPlots(params.plot_reference, context.farm),
        params.material_reference 
          ? this.materialMatchingService.matchMaterials(params.material_reference, context.farm)
          : Promise.resolve([])
      ]);

      // 5. Validation des matches
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

      // 6. Vérification de conflit de planning (optionnel pour MVP)
      const hasConflict = await this.checkSchedulingConflict(
        parsedDate.date,
        parsedTime.time,
        context.farm.id
      );

      // 7. Construction des données de tâche planifiée
      // Titre court: "Action Culture" ou juste "Action"
      const capitalizeFirst = (str: string) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      };
      
      const title = params.crop
        ? `${capitalizeFirst(params.action)} ${capitalizeFirst(params.crop)}`
        : capitalizeFirst(params.action);
      
      const taskData = {
        farm_id: context.farm.id,
        user_id: context.user.id,
        title: title,
        description: this.buildPlannedTaskDescription(params, selectedPlot, selectedMaterial),
        category: this.inferTaskCategory(params.action),
        type: 'tache',
        date: parsedDate.date,
        time: parsedTime.time,
        duration_minutes: params.duration_minutes,
        number_of_people: params.number_of_people || 1,
        status: 'en_attente', // Tâche planifiée
        priority: params.priority || 'moyenne',
        action: params.action,
        plants: [params.crop],
        plot_ids: [selectedPlot.plot.id],
        surface_unit_ids: selectedPlot.surface_units?.map(su => su.id) || [],
        material_ids: selectedMaterial ? [selectedMaterial.material.id] : [],
        notes: this.buildPlannedTaskNotes(params, parsedDate, parsedTime, hasConflict),
        ai_confidence: selectedPlot.confidence
      };

      // 8. Staging de l'action
      if (!context.analysis_id) {
        throw new Error('Analysis ID manquant');
      }

      const { data: actionStaging, error: stagingError } = await this.supabase
        .from('chat_analyzed_actions')
        .insert({
          analysis_id: context.analysis_id,
          action_type: 'task_planned',
          action_data: {
            ...taskData,
            scheduling_details: {
              original_date_text: params.date_reference,
              parsed_date: parsedDate.date,
              original_time_text: params.time_reference,
              parsed_time: parsedTime.time,
              has_conflict: hasConflict
            }
          },
          matched_entities: {
            plot: selectedPlot,
            material: selectedMaterial
          },
          confidence_score: this.calculateOverallConfidence([
            selectedPlot.confidence,
            selectedMaterial?.confidence || 0.8,
            parsedDate.confidence
          ]),
          status: 'validated'
        })
        .select()
        .single();

      if (stagingError) {
        throw new Error(`Échec staging: ${stagingError.message}`);
      }

      // 9. Création de la tâche planifiée
      const { data: task, error: taskError } = await this.supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (taskError) {
        await this.updateStagingStatus(actionStaging.id, 'failed', taskError.message);
        throw new Error(`Échec création tâche planifiée: ${taskError.message}`);
      }

      // 10. Mise à jour du staging
      await this.updateStagingStatus(actionStaging.id, 'executed', undefined, task.id, 'task');

      // 11. Construction du message de succès
      const successMessage = this.buildPlanningSuccessMessage(
        params, 
        selectedPlot, 
        selectedMaterial, 
        parsedDate,
        parsedTime,
        hasConflict
      );

      return {
        success: true,
        data: {
          task_id: task.id,
          action_staging_id: actionStaging.id,
          planned_date: parsedDate.date,
          planned_time: parsedTime.time,
          matched_plot: selectedPlot.plot.name,
          matched_material: selectedMaterial?.material.name,
          has_scheduling_conflict: hasConflict,
          priority: params.priority || 'moyenne'
        },
        message: successMessage,
        confidence: selectedPlot.confidence,
        suggestions: hasConflict ? [
          "⚠️ Conflit de planning détecté",
          "Vérifier votre agenda pour cette date",
          "Considérer reporter à un autre moment"
        ] : []
      };

    } catch (error) {
      console.error('❌ TaskPlannedTool error:', error);
      return this.handleError(error, { params, context });
    }
  }

  /**
   * Parsing intelligent des dates françaises
   */
  private parseFrenchDate(dateRef: string): DateParsingResult {
    const dateRefLower = dateRef.toLowerCase().trim();
    const today = new Date();
    
    try {
      // Mots-clés relatifs
      if (dateRefLower === 'demain') {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return {
          valid: true,
          date: tomorrow.toISOString().split('T')[0],
          confidence: 1.0,
          suggestions: []
        };
      }

      if (dateRefLower === 'après-demain') {
        const afterTomorrow = new Date(today);
        afterTomorrow.setDate(today.getDate() + 2);
        return {
          valid: true,
          date: afterTomorrow.toISOString().split('T')[0],
          confidence: 1.0,
          suggestions: []
        };
      }

      // Jours de la semaine
      const weekdays = {
        'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4, 
        'vendredi': 5, 'samedi': 6, 'dimanche': 0
      };

      for (const [day, dayNum] of Object.entries(weekdays)) {
        if (dateRefLower.includes(day)) {
          const targetDate = this.getNextWeekday(dayNum, dateRefLower.includes('prochain'));
          return {
            valid: true,
            date: targetDate.toISOString().split('T')[0],
            confidence: 0.9,
            suggestions: []
          };
        }
      }

      // Patterns relatifs: "dans X jours"
      const relativeMatch = dateRefLower.match(/dans\s+(\d+)\s+jours?/);
      if (relativeMatch) {
        const daysAhead = parseInt(relativeMatch[1]);
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysAhead);
        return {
          valid: true,
          date: targetDate.toISOString().split('T')[0],
          confidence: 0.95,
          suggestions: []
        };
      }

      // Formats de date: DD/MM ou DD/MM/YYYY
      const dateFormats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
        /^(\d{1,2})\/(\d{1,2})$/, // DD/MM (année courante)
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/ // YYYY-MM-DD
      ];

      for (const format of dateFormats) {
        const match = dateRef.match(format);
        if (match) {
          const parsedDate = this.parseExplicitDate(match);
          if (parsedDate.valid) {
            return parsedDate;
          }
        }
      }

      // Échec du parsing
      return {
        valid: false,
        date: null,
        confidence: 0,
        suggestions: [
          'Essayez: "demain", "lundi", "dans 3 jours"',
          'Ou format: "15/12/2024", "25/11"',
          'Expressions: "la semaine prochaine", "après-demain"'
        ]
      };

    } catch (error) {
      return {
        valid: false,
        date: null,
        confidence: 0,
        suggestions: [`Erreur de parsing: ${error.message}`]
      };
    }
  }

  /**
   * Parsing des heures françaises
   */
  private parseFrenchTime(timeRef: string): TimeParsingResult {
    const timeRefLower = timeRef.toLowerCase().trim();

    // Moments de la journée
    const timeMapping = {
      'matin': '08:00',
      'matinée': '09:00', 
      'midi': '12:00',
      'après-midi': '14:00',
      'soir': '18:00',
      'soirée': '19:00'
    };

    for (const [moment, time] of Object.entries(timeMapping)) {
      if (timeRefLower.includes(moment)) {
        return {
          valid: true,
          time,
          confidence: 0.8,
          suggestions: []
        };
      }
    }

    // Formats d'heure: HH:MM, HHhMM, HH h
    const timeFormats = [
      /^(\d{1,2}):(\d{2})$/, // HH:MM
      /^(\d{1,2})h(\d{2})$/, // HHhMM  
      /^(\d{1,2})\s*h$/, // HH h
      /^(\d{1,2})h$/ // HHh
    ];

    for (const format of timeFormats) {
      const match = timeRef.match(format);
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          return {
            valid: true,
            time: timeStr,
            confidence: 1.0,
            suggestions: []
          };
        }
      }
    }

    return {
      valid: true,
      time: null, // Pas d'heure spécifiée, OK
      confidence: 0.5,
      suggestions: [
        'Formats supportés: "matin", "14h30", "après-midi"',
        'Ou précis: "08:00", "14h", "19h30"'
      ]
    };
  }

  /**
   * Calcul du prochain jour de la semaine
   */
  private getNextWeekday(targetDayNum: number, nextWeek = false): Date {
    const today = new Date();
    const currentDayNum = today.getDay();
    
    let daysAhead = targetDayNum - currentDayNum;
    
    // Si c'est déjà passé cette semaine, prendre la semaine suivante
    if (daysAhead <= 0) {
      daysAhead += 7;
    }
    
    // Si "prochain" est mentionné, forcer semaine suivante
    if (nextWeek && daysAhead < 7) {
      daysAhead += 7;
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysAhead);
    
    return targetDate;
  }

  /**
   * Parsing des dates explicites
   */
  private parseExplicitDate(match: RegExpMatchArray): DateParsingResult {
    try {
      let day, month, year;
      
      if (match.length === 4) {
        // DD/MM/YYYY ou YYYY-MM-DD
        if (match[0].includes('/')) {
          day = parseInt(match[1]);
          month = parseInt(match[2]) - 1; // JavaScript months are 0-based
          year = parseInt(match[3]);
        } else {
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[3]);
        }
      } else if (match.length === 3) {
        // DD/MM (année courante)
        day = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        year = new Date().getFullYear();
      } else {
        throw new Error('Format de date non reconnu');
      }

      const parsedDate = new Date(year, month, day);
      
      // Validation de la date
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Date invalide');
      }
      
      // Vérification que la date n'est pas dans le passé
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (parsedDate < today) {
        return {
          valid: false,
          date: null,
          confidence: 0,
          suggestions: ['La date ne peut pas être dans le passé']
        };
      }

      return {
        valid: true,
        date: parsedDate.toISOString().split('T')[0],
        confidence: 1.0,
        suggestions: []
      };

    } catch (error) {
      return {
        valid: false,
        date: null,
        confidence: 0,
        suggestions: [`Erreur parsing date: ${error.message}`]
      };
    }
  }

  /**
   * Vérification des conflits de planning
   */
  private async checkSchedulingConflict(
    date: string, 
    time: string | null, 
    farmId: number
  ): Promise<boolean> {
    
    try {
      // Requête des tâches existantes pour cette date
      let query = this.supabase
        .from('tasks')
        .select('id, title, time, duration_minutes')
        .eq('farm_id', farmId)
        .eq('date', date)
        .in('status', ['en_attente', 'en_cours']);

      const { data: existingTasks, error } = await query;

      if (error || !existingTasks || existingTasks.length === 0) {
        return false; // Pas de conflit
      }

      // Si pas d'heure spécifiée, pas de conflit détaillé possible
      if (!time) {
        return existingTasks.length > 3; // Plus de 3 tâches = potentiel conflit
      }

      // Vérification des conflits horaires
      const [hours, minutes] = time.split(':').map(Number);
      const taskTime = hours * 60 + minutes; // Minutes depuis minuit

      for (const task of existingTasks) {
        if (task.time) {
          const [taskHours, taskMinutes] = task.time.split(':').map(Number);
          const taskStartTime = taskHours * 60 + taskMinutes;
          const taskEndTime = taskStartTime + (task.duration_minutes || 60);
          
          // Conflit si chevauchement
          if (taskTime >= taskStartTime && taskTime <= taskEndTime) {
            return true;
          }
        }
      }

      return false;

    } catch (error) {
      console.error('❌ Error checking scheduling conflict:', error);
      return false; // En cas d'erreur, ne pas bloquer
    }
  }

  /**
   * Construction description tâche planifiée
   */
  private buildPlannedTaskDescription(
    params: TaskPlannedParams,
    plot: any,
    material: any
  ): string {
    const parts = [`${params.action} planifié pour ${params.crop}`];
    
    if (plot) {
      parts.push(`sur ${plot.plot.name}`);
    }
    
    if (material) {
      parts.push(`avec ${material.material.name}`);
    }
    
    if (params.duration_minutes) {
      const hours = Math.floor(params.duration_minutes / 60);
      const minutes = params.duration_minutes % 60;
      const duration = hours > 0 ? `${hours}h${minutes > 0 ? minutes : ''}` : `${minutes}min`;
      parts.push(`(durée estimée: ${duration})`);
    }

    return parts.join(' ');
  }

  /**
   * Construction des notes de planification
   */
  private buildPlannedTaskNotes(
    params: TaskPlannedParams,
    parsedDate: DateParsingResult,
    parsedTime: TimeParsingResult,
    hasConflict: boolean
  ): string {
    const notes: string[] = [];
    
    if (params.notes) {
      notes.push(params.notes);
    }

    notes.push(`Planifié via Thomas Agent: ${params.date_reference} → ${parsedDate.date}`);
    
    if (params.time_reference && parsedTime.time) {
      notes.push(`Heure planifiée: ${params.time_reference} → ${parsedTime.time}`);
    }
    
    if (hasConflict) {
      notes.push('⚠️ ATTENTION: Conflit de planning potentiel détecté');
    }

    return notes.join('\n');
  }

  /**
   * Construction du message de succès pour planification
   */
  private buildPlanningSuccessMessage(
    params: TaskPlannedParams,
    plot: any,
    material: any,
    parsedDate: DateParsingResult,
    parsedTime: TimeParsingResult,
    hasConflict: boolean
  ): string {
    let message = `Tâche planifiée: ${params.action} ${params.crop}`;
    
    // Détails de lieu
    if (plot) {
      message += ` sur ${plot.plot.name}`;
    }
    
    // Détails temporels
    const dateStr = new Date(parsedDate.date + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    
    message += ` pour ${dateStr}`;
    
    if (parsedTime.time) {
      message += ` à ${parsedTime.time}`;
    }
    
    // Alertes
    if (hasConflict) {
      message += ' ⚠️ (conflit de planning détecté)';
    }

    return message;
  }

  /**
   * Inférence de catégorie selon l'action
   */
  private inferTaskCategory(action: string): 'production' | 'marketing' | 'administratif' | 'general' {
    // Même logique que TaskDoneTool
    const actionLower = action.toLowerCase();
    
    const productionActions = [
      'plantation', 'semis', 'repiquage', 'récolte', 'traitement', 
      'pulvérisation', 'arrosage', 'taille', 'désherbage', 'binage'
    ];
    
    if (productionActions.some(keyword => actionLower.includes(keyword))) {
      return 'production';
    }
    
    return 'production'; // Défaut
  }

  /**
   * Calcul de confiance globale
   */
  private calculateOverallConfidence(confidences: number[]): number {
    const validConfidences = confidences.filter(c => c > 0);
    return validConfidences.length > 0 
      ? validConfidences.reduce((sum, c) => sum + c, 0) / validConfidences.length
      : 0.5;
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
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface TaskPlannedParams {
  action: string;
  crop: string;
  plot_reference: string;
  date_reference: string;
  time_reference?: string;
  material_reference?: string;
  priority?: TaskPriority;
  duration_minutes?: number;
  number_of_people?: number;
  notes?: string;
}

interface DateParsingResult {
  valid: boolean;
  date: string | null;
  confidence: number;
  suggestions: string[];
}

interface TimeParsingResult {
  valid: boolean;
  time: string | null;
  confidence: number;
  suggestions: string[];
}
