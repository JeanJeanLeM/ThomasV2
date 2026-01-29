import { DirectSupabaseService } from './DirectSupabaseService';

export interface AnalyzedAction {
  id: string;
  analysis_id?: string;
  action_type: 'help' | 'task_done' | 'task_planned' | 'observation' | 'config' | 'harvest';
  original_text: string;
  decomposed_text: string;
  
  // Entités matchées (IDs réels de la DB)
  matched_entities?: {
    plot_ids?: number[];
    surface_unit_ids?: number[];
    material_ids?: number[];
  };
  
  // Alias pour compatibilité
  context?: {
    plot_ids?: number[];
    surface_unit_ids?: number[];
    material_ids?: number[];
  };
  
  // Données extraites par l'IA
  extracted_data: {
    // Titre et action
    title?: string;
    action?: string;
    
    // Culture(s)
    crop?: string;
    crops?: string[];
    
    // Multi-Cultures (nouveau)
    is_multi_crop?: boolean;
    surface_distribution?: {
      [cropName: string]: {
        count: number;
        unit: string; // "planches", "m²", "rangs", etc.
      };
    };
    
    // Localisation (noms)
    plots?: string[];
    plot_names?: string[];
    surface_units?: string[];
    surface_unit_count?: number;
    
    // Quantités
    quantity?: { value: number; unit: string };
    quantity_nature?: string;  // Nature spécifique (compost, bouillie, tomates)
    quantity_type?: string;    // Type: engrais, produit_phyto, recolte, plantation, vente
    quantity_converted?: { value: number; unit: string; original?: any };
    
    // Temps
    duration?: { value: number; unit: string };
    date?: string;
    time?: string;
    
    // Ressources
    materials?: string[];
    material_names?: string[];
    number_of_people?: number;
    
    // Observation
    issue?: string;
    category?: string;
    severity?: string;
    
    // Métadonnées
    notes?: string;
    priority?: 'basse' | 'moyenne' | 'haute' | 'urgente';
    
    [key: string]: any;
  };
  
  confidence_score: number;
  user_status: 'pending' | 'validated' | 'rejected' | 'modified';
  user_modifications?: any;
  
  // Référence vers l'enregistrement créé
  created_record_id?: string;
  created_record_type?: 'task' | 'observation';
  
  // Multi-cultures : ID de l'action originale (avant division)
  original_action_id?: string;
  
  // Contexte de création
  farm_id?: number;
  user_id?: string;
}

export interface AIAnalysisResult {
  analysis_id: string;
  actions: AnalyzedAction[];
  confidence: number;
  processing_time_ms: number;
}

export class AIChatService {
  /**
   * Analyser un message utilisateur avec l'IA
   */
  static async analyzeMessage(
    messageId: string,
    userMessage: string,
    chatSessionId: string
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 [AI-ANALYSIS] Démarrage analyse IA');
      console.log('📝 [AI-ANALYSIS] Message:', userMessage);
      console.log('🔍 [AI-ANALYSIS] Session:', chatSessionId);
      console.log('🆔 [AI-ANALYSIS] Message ID:', messageId);

      // Étape 1: Préparation de la requête
      console.log('⚡ [AI-ANALYSIS] Étape 1/4: Préparation requête Edge Function');
      
      const requestBody = {
        message_id: messageId,
        user_message: userMessage,
        chat_session_id: chatSessionId,
        timestamp: new Date().toISOString(),
        analysis_version: '2.0'
      };

      // Étape 2: Appel Edge Function via API direct (bypass client JS)
      console.log('🌐 [AI-ANALYSIS] Étape 2/4: Appel Edge Function analyze-message (DirectSupabaseService)');
      
      const { data, error } = await DirectSupabaseService.directEdgeFunction(
        'analyze-message',
        requestBody
      );

      // Étape 3: Validation réponse
      console.log('🔍 [AI-ANALYSIS] Étape 3/4: Validation réponse IA');

      if (error) {
        console.error('❌ [AI-ANALYSIS] Erreur Edge Function:', error);
        throw new Error(`Erreur analyse IA: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error('❌ [AI-ANALYSIS] Réponse invalide:', data);
        throw new Error(data?.error || 'Erreur inconnue de l\'IA');
      }

      // Étape 4: Traitement résultats
      console.log('✅ [AI-ANALYSIS] Étape 4/4: Traitement résultats');
      
      const processingTime = Date.now() - startTime;
      console.log('📊 [AI-ANALYSIS] Statistiques analyse:');
      console.log(`   • Temps total: ${processingTime}ms`);
      console.log(`   • Actions détectées: ${data.actions?.length || 0}`);
      console.log(`   • Confiance: ${(data.confidence * 100).toFixed(1)}%`);
      console.log(`   • Analysis ID: ${data.analysis_id}`);

      if (data.actions?.length > 0) {
        console.log('🎯 [AI-ANALYSIS] Actions identifiées:');
        data.actions.forEach((action: AnalyzedAction, index: number) => {
          console.log(`   ${index + 1}. ${action.action_type}: "${action.decomposed_text}" (confiance: ${(action.confidence_score * 100).toFixed(0)}%)`);
        });
      }

      const result = {
        ...data,
        processing_time_ms: processingTime
      };

      console.log('✅ [AI-ANALYSIS] Analyse terminée avec succès');
      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ [AI-ANALYSIS] Échec analyse après', processingTime, 'ms');
      console.error('❌ [AI-ANALYSIS] Erreur détaillée:', error);
      console.error('❌ [AI-ANALYSIS] Message original:', userMessage);
      
      // Enrichir l'erreur avec contexte
      const baseMessage = error instanceof Error ? error.message : String(error);
      const enrichedError: Error & {
        originalMessage?: string;
        processingTime?: number;
        sessionId?: string;
      } = new Error(`Analyse IA échouée: ${baseMessage}`);
      enrichedError.originalMessage = userMessage;
      enrichedError.processingTime = processingTime;
      enrichedError.sessionId = chatSessionId;
      
      throw enrichedError;
    }
  }

  /**
   * Valider une action analysée
   */
  static async validateAction(actionId: string, modifications?: any): Promise<void> {
    try {
      const updateData: any = {
        user_status: modifications ? 'modified' : 'validated',
        updated_at: new Date().toISOString()
      };

      if (modifications) {
        updateData.user_modifications = modifications;
      }

      const { error } = await DirectSupabaseService.directUpdate(
        'chat_analyzed_actions',
        updateData,
        [{ column: 'id', value: actionId }]
      );

      if (error) {
        throw new Error(error.message || 'Erreur mise à jour action');
      }

      console.log(`✅ Action ${modifications ? 'modified' : 'validated'}:`, actionId);
    } catch (error) {
      console.error('❌ Failed to validate action:', error);
      throw error;
    }
  }

  /**
   * Rejeter une action analysée
   */
  static async rejectAction(actionId: string): Promise<void> {
    try {
      const { error } = await DirectSupabaseService.directUpdate(
        'chat_analyzed_actions',
        {
          user_status: 'rejected',
          updated_at: new Date().toISOString()
        },
        [{ column: 'id', value: actionId }]
      );

      if (error) {
        throw new Error(error.message || 'Erreur rejet action');
      }

      console.log('❌ Action rejected:', actionId);
    } catch (error) {
      console.error('❌ Failed to reject action:', error);
      throw error;
    }
  }

  /**
   * Créer une tâche à partir d'une action validée
   * Note: Les actions multi-cultures doivent déjà être divisées AVANT d'appeler cette méthode
   * Aligné avec le schéma tasks de la DB
   * 
   * @returns ID de la tâche créée (string)
   */
  static async createTaskFromAction(
    action: AnalyzedAction, 
    farmId: number, 
    userId: string
  ): Promise<string> {
    try {
      console.log('📝 [CREATE-SINGLE-TASK] Création tâche unique:', action.id);
      
      const entities = action.matched_entities || action.context || {};
      const data = action.extracted_data || {};
      
      // Construire le titre court: "Matériel Culture", "Action Culture", "Matériel" ou "Action"
      const capitalizeFirst = (str: string) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      };
      
      // Prioriser : Matériel > Action extraite de l'original
      let mainElement = '';
      
      // 1. Si matériel mentionné, l'utiliser en priorité (ex: "charrue", "herse")
      if (data.materials && Array.isArray(data.materials) && data.materials.length > 0) {
        mainElement = data.materials[0];
      } 
      // 2. Si material (singulier) mentionné
      else if (data.material) {
        mainElement = data.material;
      }
      // 3. Sinon, extraire l'action du texte original (plus précis que data.action qui peut être générique)
      else {
        // Extraire l'outil/action du texte original (ex: "J'ai passé la herse" -> "herse")
        const originalText = action.original_text || action.decomposed_text || '';
        const originalLower = originalText.toLowerCase();
        
        // Liste d'outils agricoles courants
        const tools = ['charrue', 'herse', 'bêche', 'motobineuse', 'rotavator', 'pulvérisateur', 
                       'semoir', 'planteuse', 'récolteuse', 'tracteur', 'cultivateur'];
        
        const foundTool = tools.find(tool => originalLower.includes(tool));
        
        if (foundTool) {
          mainElement = foundTool;
        } else if (data.action) {
          // Nettoyer l'action (enlever "travail du sol" -> chercher dans l'original)
          mainElement = data.action;
        } else {
          mainElement = action.decomposed_text || 'Action';
        }
      }
      
      // Construire le titre
      const title = data.title || 
        (mainElement && data.crop 
          ? `${capitalizeFirst(mainElement)} ${capitalizeFirst(data.crop)}`
          : mainElement
          ? capitalizeFirst(mainElement)
          : action.decomposed_text || 'Tâche');
      
      // Calculer la durée en minutes
      let durationMinutes: number | undefined;
      if (data.duration) {
        const unit = data.duration.unit?.toLowerCase();
        if (unit === 'min' || unit === 'minutes' || unit === 'minute') {
          durationMinutes = data.duration.value;
        } else if (unit === 'h' || unit === 'heure' || unit === 'heures' || unit === 'hour' || unit === 'hours') {
          durationMinutes = data.duration.value * 60;
        }
      }
      
      // Construire les notes
      const notesParts: string[] = [];
      if (data.quantity) {
        notesParts.push(`Quantité: ${data.quantity.value} ${data.quantity.unit}`);
      }
      if (data.quantity_converted) {
        notesParts.push(`(converti: ${data.quantity_converted.value} ${data.quantity_converted.unit})`);
      }
      if (action.original_text) {
        notesParts.push(`Original: ${action.original_text}`);
      }
      
      // Déterminer la date de la tâche
      let taskDate: string;
      if (data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        // Utiliser la date extraite si elle est en format ISO valide
        taskDate = data.date;
        console.log(`📅 [CREATE-TASK] Utilisation date extraite: ${taskDate}`);
      } else if (action.action_type === 'task_planned') {
        // Pour les tâches planifiées sans date, utiliser demain par défaut
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        taskDate = tomorrow.toISOString().split('T')[0];
        console.log(`📅 [CREATE-TASK] Tâche planifiée sans date, utilisation demain: ${taskDate}`);
      } else {
        // Pour les tâches effectuées, utiliser aujourd'hui
        taskDate = new Date().toISOString().split('T')[0];
        console.log(`📅 [CREATE-TASK] Tâche effectuée, utilisation aujourd'hui: ${taskDate}`);
      }
      
      // IMPORTANT: Mettre à jour extracted_data.date de l'action pour qu'elle soit visible dans le chat
      if (!data.date) {
        data.date = taskDate;
        console.log(`📅 [CREATE-TASK] Date ajoutée à extracted_data pour affichage: ${taskDate}`);
      }
      
      const taskData = {
        farm_id: farmId,
        user_id: userId,
        title: title,
        description: action.decomposed_text || action.original_text || title,
        action: data.action || action.action_type,
        category: this.mapActionToTaskCategory(action.action_type),
        type: (action.action_type === 'task_done' || action.action_type === 'harvest') ? 'tache' : 'autre',
        date: taskDate,
        time: data.time || null,
        duration_minutes: durationMinutes,
        status: (action.action_type === 'task_done' || action.action_type === 'harvest') ? 'terminee' : 'en_attente',
        priority: data.priority || 'moyenne',
        plot_ids: entities.plot_ids || [],
        surface_unit_ids: entities.surface_unit_ids || [],
        material_ids: entities.material_ids || [],
        plants: data.crops || (data.crop ? [data.crop] : []),
        number_of_people: data.number_of_people || 1,
        // Quantités structurées
        quantity_value: data.quantity?.value || null,
        quantity_unit: data.quantity?.unit || null,
        quantity_nature: data.quantity_nature || null,
        quantity_type: data.quantity_type || null,
        quantity_converted_value: data.quantity_converted?.value || null,
        quantity_converted_unit: data.quantity_converted?.unit || null,
        notes: notesParts.join('\n'),
        ai_confidence: action.confidence_score
      };

      console.log('📦 [CREATE-TASK] Données tâche:', JSON.stringify(taskData, null, 2));

      const { data: result, error } = await DirectSupabaseService.directInsert(
        'tasks',
        taskData
      );

      if (error) {
        console.error('❌ [CREATE-TASK] Erreur insertion:', error);
        throw new Error(error.message || 'Erreur création tâche');
      }

      const createdTask = Array.isArray(result) ? result[0] : result;
      console.log('✅ [CREATE-SINGLE-TASK] Tâche créée:', createdTask.id);

      // Mettre à jour l'action avec la référence vers la tâche créée
      // Pour les actions multi-cultures divisées, utiliser l'ID original
      const actionIdToLink = action.original_action_id || action.id;
      
      console.log(`🔗 [CREATE-SINGLE-TASK] Liaison action "${actionIdToLink}" -> tâche "${createdTask.id}"`);
      
      const linkResult = await DirectSupabaseService.directUpdate(
        'chat_analyzed_actions',
        { 
          created_record_id: createdTask.id,
          created_record_type: 'task',
          status: 'validated'
        },
        [{ column: 'id', value: actionIdToLink }]
      );

      if (linkResult.error) {
        console.warn('⚠️ [CREATE-SINGLE-TASK] Échec liaison action-tâche:', linkResult.error);
      } else {
        console.log('✅ [CREATE-SINGLE-TASK] Action liée à la tâche');
      }

      return createdTask.id;
    } catch (error) {
      console.error('❌ [CREATE-SINGLE-TASK] Échec création:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une tâche existante à partir d'une action modifiée
   * Évite les doublons en mettant à jour au lieu de créer
   */
  static async updateTaskFromAction(
    action: AnalyzedAction,
    taskId: string,
    farmId: number,
    userId: string
  ): Promise<void> {
    try {
      console.log('🔄 [UPDATE-TASK] Mise à jour tâche:', taskId);
      
      const entities = action.matched_entities || action.context || {};
      const data = action.extracted_data || {};
      
      // Construire le titre (même logique que createTaskFromAction)
      const capitalizeFirst = (str: string) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      };
      
      let mainElement = '';
      if (data.materials && Array.isArray(data.materials) && data.materials.length > 0) {
        mainElement = data.materials[0];
      } else if (data.material) {
        mainElement = data.material;
      } else {
        mainElement = data.action || 'Action';
      }
      
      const title = data.title || 
        (mainElement && data.crop 
          ? `${capitalizeFirst(mainElement)} ${capitalizeFirst(data.crop)}`
          : mainElement
          ? capitalizeFirst(mainElement)
          : action.decomposed_text || 'Tâche');
      
      // Calculer la durée en minutes
      let durationMinutes: number | undefined;
      if (data.duration) {
        const unit = data.duration.unit?.toLowerCase();
        if (unit === 'min' || unit === 'minutes' || unit === 'minute') {
          durationMinutes = data.duration.value;
        } else if (unit === 'h' || unit === 'heure' || unit === 'heures' || unit === 'hour' || unit === 'hours') {
          durationMinutes = data.duration.value * 60;
        }
      }
      
      // Construire les notes
      const notesParts: string[] = [];
      if (data.quantity) {
        notesParts.push(`Quantité: ${data.quantity.value} ${data.quantity.unit}`);
      }
      if (data.quantity_converted) {
        notesParts.push(`(converti: ${data.quantity_converted.value} ${data.quantity_converted.unit})`);
      }
      if (action.original_text) {
        notesParts.push(`Original: ${action.original_text}`);
      }
      
      const taskData = {
        title: title,
        description: action.decomposed_text || action.original_text || title,
        action: data.action || action.action_type,
        category: this.mapActionToTaskCategory(action.action_type),
        type: (action.action_type === 'task_done' || action.action_type === 'harvest') ? 'tache' : 'autre',
        date: data.date || new Date().toISOString().split('T')[0],
        time: data.time || null,
        duration_minutes: durationMinutes,
        status: (action.action_type === 'task_done' || action.action_type === 'harvest') ? 'terminee' : 'en_attente',
        priority: data.priority || 'moyenne',
        plot_ids: entities.plot_ids || [],
        surface_unit_ids: entities.surface_unit_ids || [],
        material_ids: entities.material_ids || [],
        plants: data.crops || (data.crop ? [data.crop] : []),
        number_of_people: data.number_of_people || 1,
        quantity_value: data.quantity?.value || null,
        quantity_unit: data.quantity?.unit || null,
        quantity_nature: data.quantity_nature || null,
        quantity_type: data.quantity_type || null,
        quantity_converted_value: data.quantity_converted?.value || null,
        quantity_converted_unit: data.quantity_converted?.unit || null,
        notes: notesParts.join('\n'),
        ai_confidence: action.confidence_score,
        updated_at: new Date().toISOString()
      };

      console.log('📦 [UPDATE-TASK] Données tâche:', JSON.stringify(taskData, null, 2));

      const { error } = await DirectSupabaseService.directUpdate(
        'tasks',
        taskData,
        [{ column: 'id', value: taskId }]
      );

      if (error) {
        console.error('❌ [UPDATE-TASK] Erreur mise à jour:', error);
        throw new Error(error.message || 'Erreur mise à jour tâche');
      }

      console.log('✅ [UPDATE-TASK] Tâche mise à jour:', taskId);
    } catch (error) {
      console.error('❌ [UPDATE-TASK] Échec mise à jour:', error);
      throw error;
    }
  }

  /**
   * Créer une observation à partir d'une action validée
   * Aligné avec le schéma observations de la DB
   */
  static async createObservationFromAction(
    action: AnalyzedAction,
    farmId: number,
    userId: string
  ): Promise<string> {
    try {
      console.log('👁️ [CREATE-OBS] Création observation depuis action:', action.id);
      
      const entities = action.matched_entities || action.context || {};
      const data = action.extracted_data || {};
      
      // Mapper la catégorie d'observation
      const mapCategory = (cat?: string): string => {
        const categoryMap: Record<string, string> = {
          'ravageurs': 'maladie_ravageur',
          'ravageur': 'maladie_ravageur',
          'maladies': 'maladie_ravageur',
          'maladie': 'maladie_ravageur',
          'physiologique': 'physiologique',
          'meteo': 'meteo',
          'météo': 'meteo',
        };
        return categoryMap[cat?.toLowerCase() || ''] || 'autre';
      };
      
      // Construire le titre - Format: "Problème Culture" (ex: "Pucerons Tomates")
      // ou juste "Problème" si pas de culture
      const capitalizeFirst = (str: string) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      };
      
      const title = data.title || 
        (data.issue && data.crop 
          ? `${capitalizeFirst(data.issue)} ${capitalizeFirst(data.crop)}`
          : data.issue
          ? capitalizeFirst(data.issue)
          : action.decomposed_text);
      
      const observationData = {
        farm_id: farmId,
        user_id: userId,
        title: title,
        category: mapCategory(data.category),
        nature: [
          data.issue ? `Problème: ${data.issue}` : '',
          data.severity ? `Gravité: ${data.severity}` : '',
          `Original: ${action.original_text}`
        ].filter(Boolean).join('\n'),
        crop: data.crop || data.crops?.[0] || null,
        plot_ids: entities.plot_ids || [],
        surface_unit_ids: entities.surface_unit_ids || [],
        status: 'active'
      };

      console.log('📦 [CREATE-OBS] Données observation:', JSON.stringify(observationData, null, 2));

      const { data: result, error } = await DirectSupabaseService.directInsert(
        'observations',
        observationData
      );

      if (error) {
        console.error('❌ [CREATE-OBS] Erreur insertion:', error);
        throw new Error(error.message || 'Erreur création observation');
      }

      const createdObs = Array.isArray(result) ? result[0] : result;
      console.log('✅ [CREATE-OBS] Observation créée:', createdObs.id);

      // Mettre à jour l'action avec la référence vers l'observation créée
      // Pour les actions multi-cultures divisées, utiliser l'ID original
      const actionIdToLink = action.original_action_id || action.id;
      
      console.log(`🔗 [CREATE-OBS] Liaison action "${actionIdToLink}" -> observation "${createdObs.id}"`);
      
      const linkResult = await DirectSupabaseService.directUpdate(
        'chat_analyzed_actions',
        { 
          created_record_id: createdObs.id,
          created_record_type: 'observation',
          status: 'validated'
        },
        [{ column: 'id', value: actionIdToLink }]
      );

      if (linkResult.error) {
        console.warn('⚠️ [CREATE-OBS] Échec liaison action-observation:', linkResult.error);
      } else {
        console.log('🔗 [CREATE-OBS] Action liée à l\'observation');
      }

      return createdObs.id;
    } catch (error) {
      console.error('❌ [CREATE-OBS] Échec création:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une observation existante à partir d'une action modifiée
   * Évite les doublons en mettant à jour au lieu de créer
   */
  static async updateObservationFromAction(
    action: AnalyzedAction,
    observationId: string,
    farmId: number,
    userId: string
  ): Promise<void> {
    try {
      console.log('🔄 [UPDATE-OBS] Mise à jour observation:', observationId);
      
      const entities = action.matched_entities || action.context || {};
      const data = action.extracted_data || {};
      
      // Mapper la catégorie
      const mapCategory = (cat?: string): string => {
        const categoryMap: Record<string, string> = {
          'ravageurs': 'maladie_ravageur',
          'ravageur': 'maladie_ravageur',
          'maladies': 'maladie_ravageur',
          'maladie': 'maladie_ravageur',
          'physiologique': 'physiologique',
          'autre': 'autre'
        };
        return categoryMap[cat?.toLowerCase() || ''] || 'maladie_ravageur';
      };

      // Construire le titre: "Problème Culture" ou "Problème"
      const capitalizeFirst = (str: string) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      };
      
      const title = data.crop
        ? `${capitalizeFirst(data.issue || 'Observation')} ${capitalizeFirst(data.crop)}`
        : capitalizeFirst(data.issue || 'Observation');

      const obsData = {
        title: title,
        nature: data.issue || 'Observation',
        category: mapCategory(data.category),
        crop: data.crop || null,
        plot_ids: entities.plot_ids || [],
        surface_unit_ids: entities.surface_unit_ids || [],
        notes: action.decomposed_text || action.original_text || '',
        status: 'active',
        severity: data.severity || 'medium',
        ai_confidence: action.confidence_score,
        updated_at: new Date().toISOString()
      };

      console.log('📦 [UPDATE-OBS] Données observation:', JSON.stringify(obsData, null, 2));

      const { error } = await DirectSupabaseService.directUpdate(
        'observations',
        obsData,
        [{ column: 'id', value: observationId }]
      );

      if (error) {
        console.error('❌ [UPDATE-OBS] Erreur mise à jour:', error);
        throw new Error(error.message || 'Erreur mise à jour observation');
      }

      console.log('✅ [UPDATE-OBS] Observation mise à jour:', observationId);
    } catch (error) {
      console.error('❌ [UPDATE-OBS] Échec mise à jour:', error);
      throw error;
    }
  }

  /**
   * Récupérer l'ID de la tâche/observation existante liée à une action
   * Permet de déterminer si on doit UPDATE ou CREATE
   */
  static async getExistingRecordId(actionId: string): Promise<string | null> {
    try {
      console.log('🔍 [GET-RECORD-ID] Recherche record existant pour action:', actionId);
      
      const { data, error } = await DirectSupabaseService.directSelect(
        'chat_analyzed_actions',
        'created_record_id, created_record_type',
        [{ column: 'id', value: actionId }]
      );

      if (error || !data || data.length === 0) {
        console.log('⚠️ [GET-RECORD-ID] Aucun record trouvé');
        return null;
      }

      const recordId = data[0].created_record_id;
      console.log('✅ [GET-RECORD-ID] Record trouvé:', recordId, 'type:', data[0].created_record_type);
      return recordId || null;
    } catch (error) {
      console.error('❌ [GET-RECORD-ID] Erreur récupération:', error);
      return null;
    }
  }

  /**
   * Obtenir les actions analysées pour un message
   */
  static async getActionsForMessage(messageId: string): Promise<AnalyzedAction[]> {
    try {
      const { data, error } = await DirectSupabaseService.directSelect(
        'chat_analyzed_actions',
        '*,chat_message_analyses!inner(message_id)',
        [{ column: 'chat_message_analyses.message_id', value: messageId }]
      );

      if (error) {
        throw new Error(error.message || 'Erreur récupération actions');
      }

      // Transformer les actions pour correspondre au format AnalyzedAction
      const transformedActions = (data || []).map((action: any) => {
        // Récupérer extracted_data depuis action_data
        const extractedData = action.action_data?.extracted_data || action.extracted_data || {};
        
        // Si la date est dans action_data.date mais pas dans extracted_data.date, l'ajouter
        // (car TaskPlannedTool stocke la date directement dans action_data.date)
        if (action.action_data?.date && !extractedData.date) {
          extractedData.date = action.action_data.date;
          console.log(`📅 [GET-ACTIONS-FOR-MESSAGE] Date ajoutée depuis action_data.date: ${extractedData.date}`);
        }
        
        return {
          id: action.id,
          analysis_id: action.analysis_id,
          action_type: action.action_type,
          original_text: action.action_data?.original_text || action.original_text || '',
          decomposed_text: action.action_data?.decomposed_text || action.decomposed_text || '',
          extracted_data: extractedData,
          matched_entities: action.matched_entities || action.action_data?.context || {},
          confidence_score: action.confidence_score || 0,
          user_status: action.user_status || 'pending',
          original_action_id: action.original_action_id,
          farm_id: action.farm_id,
          user_id: action.user_id
        };
      });

      // Tri côté client par created_at pour respecter l'ordre chronologique
      return transformedActions.sort((a: any, b: any) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return da - db;
      });
    } catch (error) {
      console.error('❌ Failed to get actions:', error);
      return [];
    }
  }

  /**
   * Récupère toutes les actions d'une analyse par analysis_id
   */
  static async getActionsForAnalysis(analysisId: string): Promise<AnalyzedAction[]> {
    try {
      console.log('🔍 [GET-ACTIONS] Récupération actions pour analysis:', analysisId);
      
      const { data, error } = await DirectSupabaseService.directSelect(
        'chat_analyzed_actions',
        '*',
        [{ column: 'analysis_id', value: analysisId }]
      );

      if (error) {
        console.error('❌ [GET-ACTIONS] Erreur:', error);
        return [];
      }

      const actions = (data || []) as AnalyzedAction[];
      
      // Transformer les actions pour correspondre au format AnalyzedAction
      const transformedActions = actions.map((action: any) => {
        // Récupérer extracted_data depuis action_data
        const extractedData = action.action_data?.extracted_data || action.extracted_data || {};
        
        // Si la date est dans action_data.date mais pas dans extracted_data.date, l'ajouter
        // (car TaskPlannedTool stocke la date directement dans action_data.date)
        if (action.action_data?.date && !extractedData.date) {
          extractedData.date = action.action_data.date;
          console.log(`📅 [GET-ACTIONS] Date ajoutée depuis action_data.date: ${extractedData.date}`);
        }
        
        // Log pour déboguer
        if (action.action_type === 'task_planned') {
          console.log(`📅 [GET-ACTIONS] Action ${action.id} (task_planned):`, {
            'action_data.date': action.action_data?.date,
            'extracted_data.date': extractedData.date,
            'action_data.extracted_data?.date': action.action_data?.extracted_data?.date
          });
        }
        
        return {
          id: action.id,
          analysis_id: action.analysis_id,
          action_type: action.action_type,
          original_text: action.action_data?.original_text || action.original_text || '',
          decomposed_text: action.action_data?.decomposed_text || action.decomposed_text || '',
          extracted_data: extractedData,
          matched_entities: action.matched_entities || action.action_data?.context || {},
          confidence_score: action.confidence_score || 0,
          user_status: action.user_status || 'pending',
          original_action_id: action.original_action_id,
          farm_id: action.farm_id,
          user_id: action.user_id
        };
      });

      console.log(`✅ [GET-ACTIONS] ${transformedActions.length} actions récupérées`);
      return transformedActions;
    } catch (error) {
      console.error('❌ [GET-ACTIONS] Exception:', error);
      return [];
    }
  }

  /**
   * Obtenir les statistiques d'utilisation de l'IA pour un utilisateur
   */
  static async getAIStats(userId: string): Promise<any> {
    try {
      const { data, error } = await DirectSupabaseService.directSelect(
        'chat_analyzed_actions',
        'action_type,user_status,confidence_score,created_at',
        [{ column: 'user_id', value: userId }]
      );

      if (error) {
        throw new Error(error.message || 'Erreur récupération stats IA');
      }

      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      const filtered = (data || []).filter((action: any) => {
        if (!action.created_at) return false;
        const t = new Date(action.created_at).getTime();
        return t >= thirtyDaysAgo && t <= now;
      });

      const stats = {
        total_actions: data?.length || 0,
        by_type: {} as Record<string, number>,
        by_status: {} as Record<string, number>,
        avg_confidence: 0,
        validation_rate: 0
      };

      if (filtered.length > 0) {
        // Comptage par type
        filtered.forEach((action: { action_type: string; user_status: string; confidence_score?: number }) => {
          stats.by_type[action.action_type] = (stats.by_type[action.action_type] || 0) + 1;
          stats.by_status[action.user_status] = (stats.by_status[action.user_status] || 0) + 1;
        });

        // Confiance moyenne
        stats.avg_confidence =
        filtered.reduce((sum: number, action: { confidence_score?: number }) => sum + (action.confidence_score || 0), 0) /
        filtered.length;

        // Taux de validation
        const validated =
          (stats.by_status['validated'] || 0) + (stats.by_status['modified'] || 0);
        stats.validation_rate = validated / stats.total_actions;
      }

      return stats;
    } catch (error) {
      console.error('❌ Failed to get AI stats:', error);
      return null;
    }
  }

  /**
   * Mapper un type d'action vers une catégorie de tâche
   */
  private static mapActionToTaskCategory(actionType: string): string {
    switch (actionType) {
      case 'task_done':
      case 'task_planned':
      case 'observation':
        return 'production';
      case 'config':
        return 'administratif';
      case 'help':
        return 'general';
      default:
        return 'general';
    }
  }
}

export default AIChatService;
