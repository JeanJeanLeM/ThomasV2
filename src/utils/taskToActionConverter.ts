import { TaskData } from '../design-system/components/cards/TaskCard';
import { ObservationData } from '../design-system/components/cards/ObservationCard';
import { ActionData } from '../components/chat/AIResponseWithActions';
import { sanitizeQuantityType } from './quantityUtils';

/**
 * Convertit une TaskData en ActionData pour utiliser ActionEditModal
 * avec les données d'une tâche existante
 */
export const convertTaskToAction = (task: TaskData): ActionData => {
  const toNumberIds = (values?: Array<string | number>): number[] => {
    if (!Array.isArray(values)) return [];
    return values
      .map((value) => (typeof value === 'number' ? value : parseInt(String(value), 10)))
      .filter((value) => Number.isFinite(value));
  };

  // Déterminer le type d'action basé sur le statut de la tâche
  const getActionType = (): ActionData['action_type'] => {
    if (task.type === 'completed') {
      return 'task_done';
    } else if (task.type === 'planned') {
      return 'task_planned';
    }
    // Fallback
    return 'task_done';
  };

  // Convertir la date en string si c'est un objet Date
  const formatDate = (date: Date | string): string => {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
    }
    return date;
  };

  // Extraire l'heure si elle existe dans la date
  const extractTime = (date: Date | string): string | undefined => {
    if (date instanceof Date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    // Si c'est une string, essayer d'extraire l'heure
    if (typeof date === 'string' && date.includes('T')) {
      const timePart = date.split('T')[1];
      if (timePart) {
        return timePart.substring(0, 5); // HH:MM
      }
    }
    return undefined;
  };

  // Convertir la durée en minutes vers un objet duration
  const convertDuration = (durationMinutes?: number) => {
    if (!durationMinutes) return undefined;
    
    if (durationMinutes >= 60) {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      if (minutes === 0) {
        return { value: hours, unit: 'heures' };
      } else {
        return { value: durationMinutes, unit: 'minutes' };
      }
    }
    return { value: durationMinutes, unit: 'minutes' };
  };

  const actionData: ActionData = {
    id: task.id,
    action_type: getActionType(),
    original_text: task.title,
    decomposed_text: task.title,
    confidence: 1.0, // Tâche existante = confiance maximale
    extracted_data: {
      title: task.title,
      action: task.action,
      standard_action: task.standard_action,
      
      // Cultures
      crops: task.plants || [],
      crop: task.plants?.[0],
      
      // Localisation
      plots: task.plot_ids || [],
      
      // Quantités
      quantity: task.quantity,
      quantity_converted: task.quantity_converted,
      quantity_nature: task.quantity_nature,
      quantity_type: task.quantity_type,
      // Note: phytosanitary_product_amm n'est pas dans ActionData mais sera utilisé
      // pour charger le nom du produit dans l'UI
      
      // Temps
      date: formatDate(task.date),
      time: extractTime(task.date),
      duration: convertDuration(task.duration_minutes),
      number_of_people: task.number_of_people,
      matched_member_ids: task.members?.map((member) => member.user_id) || [],
      
      // Matériel
      materials: task.material_ids || [],
      
      // Métadonnées
      notes: task.notes,
      priority: task.priority,
    },
    user_status: 'validated', // Tâche existante = déjà validée
    matched_entities: {
      plot_ids: toNumberIds(task.plot_ids as Array<string | number> | undefined),
      surface_unit_ids: toNumberIds(task.surface_unit_ids as Array<string | number> | undefined),
      material_ids: toNumberIds(task.material_ids as Array<string | number> | undefined),
    }
  };

  return actionData;
};

/**
 * Convertit une ActionData modifiée vers TaskData pour la sauvegarde
 */
export const convertActionToTask = (action: ActionData, originalTask?: TaskData): TaskData => {
  const data = action.extracted_data || {};

  const toIdStrings = (values?: unknown): string[] | undefined => {
    if (!Array.isArray(values)) return undefined;
    const normalized = values
      .map((value) => (typeof value === 'number' ? String(value) : String(value || '').trim()))
      .filter((value) => /^\d+$/.test(value));
    return normalized.length > 0 ? normalized : undefined;
  };

  const matchedPlotIds = toIdStrings(action.matched_entities?.plot_ids);
  const matchedSurfaceUnitIds = toIdStrings(action.matched_entities?.surface_unit_ids);
  const matchedMaterialIds = toIdStrings(action.matched_entities?.material_ids);
  const extractedPlotIds = toIdStrings(data.plots as unknown);
  const extractedSurfaceUnitIds = toIdStrings((data as any).surface_units as unknown);
  const extractedMaterialIds = toIdStrings(data.materials as unknown);
  
  // Convertir la date string + time vers Date
  const buildDate = (): Date | string => {
    // Si on a une date dans l'action
    if (data.date && data.date !== 'undefined' && data.date !== 'null') {
      try {
        const dateStr = data.time 
          ? `${data.date}T${data.time}:00`
          : `${data.date}T12:00:00`; // Midi par défaut
        
        const newDate = new Date(dateStr);
        
        // Vérifier que la date est valide
        if (!isNaN(newDate.getTime())) {
          return newDate;
        }
      } catch (e) {
        console.warn('⚠️ [CONVERTER] Date invalide dans action:', data.date, e);
      }
    }
    
    // Fallback sur la tâche originale ou date actuelle
    if (originalTask?.date) {
      return originalTask.date;
    }
    
    console.warn('⚠️ [CONVERTER] Aucune date valide, utilisation date actuelle');
    return new Date();
  };

  // Convertir duration vers minutes
  const convertToMinutes = (duration?: { value: number; unit: string }): number | undefined => {
    if (!duration) return undefined;
    
    if (duration.unit === 'heures') {
      return duration.value * 60;
    }
    return duration.value; // déjà en minutes
  };

  const taskData: TaskData = {
    id: action.id || originalTask?.id || '',
    user_id: originalTask?.user_id,
    title: data.title || originalTask?.title || '',
    action: data.action || originalTask?.action,
    standard_action: data.standard_action ?? originalTask?.standard_action ?? null,
    type: action.action_type === 'task_done' ? 'completed' : 'planned',
    date: buildDate(),
    duration_minutes: convertToMinutes(data.duration) || originalTask?.duration_minutes,
    number_of_people: data.number_of_people || originalTask?.number_of_people,
    plants: data.crops || originalTask?.plants,
    plot_ids: matchedPlotIds || extractedPlotIds || originalTask?.plot_ids,
    surface_unit_ids: matchedSurfaceUnitIds || extractedSurfaceUnitIds || originalTask?.surface_unit_ids,
    material_ids: matchedMaterialIds || extractedMaterialIds || originalTask?.material_ids,
    quantity: data.quantity || originalTask?.quantity,
    quantity_converted: data.quantity_converted || originalTask?.quantity_converted,
    quantity_nature: data.quantity_nature || originalTask?.quantity_nature,
    quantity_type: sanitizeQuantityType({
      quantity: data.quantity || originalTask?.quantity,
      quantity_nature: data.quantity_nature || originalTask?.quantity_nature,
      quantity_converted: data.quantity_converted || originalTask?.quantity_converted,
      quantity_type: data.quantity_type || originalTask?.quantity_type,
    }),
    phytosanitary_product_amm: originalTask?.phytosanitary_product_amm || null,
    priority: data.priority || originalTask?.priority,
    notes: data.notes || originalTask?.notes,
    members: originalTask?.members,
  };

  return taskData;
};

/**
 * Convertit une ObservationData en ActionData pour utiliser ActionEditModal
 * avec les données d'une observation existante
 */
export const convertObservationToAction = (observation: ObservationData): ActionData => {
  // Convertir la date en string si c'est un objet Date
  const formatDate = (date: Date | string): string => {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
    }
    return date;
  };

  // Extraire l'heure si elle existe dans la date
  const extractTime = (date: Date | string): string | undefined => {
    if (date instanceof Date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    // Si c'est une string, essayer d'extraire l'heure
    if (typeof date === 'string' && date.includes('T')) {
      const timePart = date.split('T')[1];
      if (timePart) {
        return timePart.substring(0, 5); // HH:MM
      }
    }
    return undefined;
  };

  // Mapper la catégorie d'observation vers la catégorie d'action
  const mapCategory = (category?: string): string => {
    if (!category) return '';
    // Les catégories d'observation peuvent être directement utilisées
    return category;
  };

  const actionData: ActionData = {
    id: observation.id,
    action_type: 'observation',
    original_text: observation.title,
    decomposed_text: observation.title,
    confidence: 1.0, // Observation existante = confiance maximale
    extracted_data: {
      title: observation.title,
      
      // Cultures
      crops: observation.crops || [],
      crop: observation.crops?.[0],
      
      // Localisation
      plots: observation.plots || [],
      
      // Observation spécifique
      issue: observation.issue || observation.description,
      category: mapCategory(observation.category),
      
      // Temps
      date: formatDate(observation.date),
      time: extractTime(observation.date),
      
      // Métadonnées
      notes: observation.description,
    },
    user_status: 'validated', // Observation existante = déjà validée
    matched_entities: {
      plot_ids: observation.plots?.map(id => parseInt(id)) || [],
    }
  };

  return actionData;
};

/**
 * Convertit une ActionData modifiée vers ObservationData pour la sauvegarde
 */
export const convertActionToObservation = (action: ActionData, originalObservation?: ObservationData): ObservationData => {
  const data = action.extracted_data || {};
  
  // Convertir la date string + time vers Date
  const buildDate = (): Date => {
    // Si on a une date dans l'action
    if (data.date && data.date !== 'undefined' && data.date !== 'null') {
      try {
        const dateStr = data.time 
          ? `${data.date}T${data.time}:00`
          : `${data.date}T12:00:00`; // Midi par défaut
        
        const newDate = new Date(dateStr);
        
        // Vérifier que la date est valide
        if (!isNaN(newDate.getTime())) {
          return newDate;
        }
      } catch (e) {
        console.warn('⚠️ [CONVERTER] Date invalide dans action:', data.date, e);
      }
    }
    
    // Fallback sur l'observation originale ou date actuelle
    if (originalObservation?.date) {
      return originalObservation.date instanceof Date 
        ? originalObservation.date 
        : new Date(originalObservation.date);
    }
    
    console.warn('⚠️ [CONVERTER] Aucune date valide, utilisation date actuelle');
    return new Date();
  };

  // Mapper la catégorie d'action vers la catégorie d'observation
  const mapCategoryBack = (category?: string): ObservationData['category'] => {
    if (!category) return 'autre';
    
    // Les catégories d'observation valides
    const validCategories: ObservationData['category'][] = [
      'ravageurs',
      'maladies',
      'carences',
      'dégâts_climatiques',
      'croissance_anormale',
      'autre'
    ];
    
    if (validCategories.includes(category as ObservationData['category'])) {
      return category as ObservationData['category'];
    }
    
    return 'autre';
  };

  const observationData: ObservationData = {
    id: action.id || originalObservation?.id || '',
    title: data.title || originalObservation?.title || '',
    description: data.notes || data.issue || originalObservation?.description,
    date: buildDate(),
    severity: originalObservation?.severity || 'Moyen',
    category: mapCategoryBack(data.category) || originalObservation?.category || 'autre',
    issue: data.issue || originalObservation?.issue,
    crops: data.crops || originalObservation?.crops,
    plots: data.plots || originalObservation?.plots,
    weather: originalObservation?.weather,
    photos: originalObservation?.photos,
    actions: originalObservation?.actions,
    status: originalObservation?.status || 'Nouvelle',
  };

  return observationData;
};
