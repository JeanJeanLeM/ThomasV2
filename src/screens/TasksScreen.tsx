import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Button, Modal } from '../design-system/components';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFarm, useFarmTasks } from '../contexts/FarmContext';
import { TaskService } from '../services/TaskService';
import { ObservationService } from '../services/ObservationService';
import { ensureTasksForHorizon } from '../services/RecurringTaskGenerationService';
import { UnifiedTaskCard } from '../design-system/components/cards/UnifiedTaskCard';
import { UnifiedObservationCard } from '../design-system/components/cards/UnifiedObservationCard';
import { CompactTaskCard } from '../design-system/components/cards/CompactTaskCard';
import { CompactObservationCard } from '../design-system/components/cards/CompactObservationCard';
import { TaskEditModal } from '../design-system/components/modals/TaskEditModal';
import { ActionEditModal } from '../components/chat/ActionEditModal';
import { TaskData } from '../design-system/components/cards/TaskCard';
import { ObservationData } from '../design-system/components/cards/ObservationCard';
import { ActionData } from '../components/chat/AIResponseWithActions';
import { convertTaskToAction, convertActionToTask, convertObservationToAction, convertActionToObservation } from '../utils/taskToActionConverter';
import { sanitizeQuantityType } from '../utils/quantityUtils';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { typography } from '../design-system/typography';
import { 
  PlusIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarIcon,
  ViewListIcon,
  ViewGridIcon,
  ArrowPathIcon,
  TrashIcon
} from '../design-system/icons';

// Layout constants
const DAY_CELL_SIZE = 32;
const HORIZONTAL_PADDING = 20;
const FILTER_BADGE_MIN_WIDTH = 20;
const COMPACT_VIEW_KEY = '@tasks_compact_view';

type FilterType = 'all' | 'planifie' | 'effectue' | 'observation';

// Types pour les données de la DB
interface DBTask {
  id: string;
  title: string;
  description?: string;
  category?: string;
  type?: string;
  date: string;
  time?: string;
  duration_minutes?: number;
  status: 'en_attente' | 'en_cours' | 'terminee' | 'annulee' | 'archivee';
  priority?: string;
  notes?: string;
  number_of_people?: number;
  created_at: string;
  updated_at: string;
}

interface DBObservation {
  id: string;
  title: string;
  category?: string;
  nature: string;
  crop?: string;
  status?: string;
  created_at: string;
}

export default function TasksScreen() {
  const { user } = useAuth();
  const { activeFarm, loading: farmLoading, farmData, invalidateFarmData, refreshFarmDataSilently } = useFarm();
  const { tasks: farmTasks, loading: tasksLoading } = useFarmTasks();
  const today = new Date();

  // ===== TOUS LES ÉTATS (useState) - DOIVENT ÊTRE AVANT LES useEffect =====
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isCompactView, setIsCompactView] = useState<boolean>(false);
  
  // État des modales
  const [editingTask, setEditingTask] = useState<TaskData | undefined>();
  const [editingAction, setEditingAction] = useState<ActionData | undefined>();
  const [editingObservation, setEditingObservation] = useState<ObservationData | undefined>();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  // États pour les observations (les tâches viennent du FarmContext)
  const [observations, setObservations] = useState<ObservationData[]>([]);
  const [observationsLoading, setObservationsLoading] = useState(false); // Commencer à false pour afficher le cache immédiatement
  const [isRefreshing, setIsRefreshing] = useState(false); // État pour le rafraîchissement en arrière-plan
  
  // State for optimistic deletion
  const [deletingTasks, setDeletingTasks] = useState<Set<string>>(new Set());
  const [deletingObservations, setDeletingObservations] = useState<Set<string>>(new Set());
  const [hiddenTasks, setHiddenTasks] = useState<Set<string>>(new Set());
  const [hiddenObservations, setHiddenObservations] = useState<Set<string>>(new Set());
  
  // État pour la modale de sélection d'année
  const [showYearModal, setShowYearModal] = useState(false);

  // ===== useEffect - APRÈS LES useState =====
  
  // Debug logs
  useEffect(() => {
    console.log('🔍 [TasksScreen] État:', {
      user: user?.email || 'Non connecté',
      activeFarm: activeFarm ? { farm_id: activeFarm.farm_id, farm_name: activeFarm.farm_name } : 'Aucune',
      farmLoading,
      tasksLoading,
      farmTasksCount: farmTasks.length,
      selectedDate: selectedDate.toDateString()
    });
  }, [user, activeFarm, farmLoading, tasksLoading, farmTasks, selectedDate]);
  
  // Charger les données en arrière-plan au montage (sans bloquer l'affichage)
  // Génère aussi les tâches récurrentes 6 mois en avance, puis rafraîchit les tâches
  useEffect(() => {
    if (activeFarm?.farm_id && user?.id) {
      console.log('🔄 [TasksScreen] Rafraîchissement en arrière-plan des données au montage');
      
      // Charger les observations en arrière-plan sans bloquer
      loadObservations(true);
      
      setIsRefreshing(true);
      (async () => {
        try {
          const { created } = await ensureTasksForHorizon(activeFarm.farm_id, user.id, 6);
          if (created > 0) console.log('✅ [TasksScreen] Tâches récurrentes générées:', created);
        } catch (e) {
          console.warn('⚠️ [TasksScreen] Génération tâches récurrentes:', e);
        }
        try {
          await refreshFarmDataSilently(['tasks']);
        } finally {
          setIsRefreshing(false);
        }
      })();
    }
  }, [activeFarm?.farm_id, user?.id]);

  // Charger la préférence d'affichage compact au montage
  useEffect(() => {
    loadCompactViewPreference();
  }, []);

  // ===== FONCTIONS - APRÈS LES useEffect =====
  
  // Fonctions pour gérer la persistance de la vue compacte
  const loadCompactViewPreference = async () => {
    try {
      const value = await AsyncStorage.getItem(COMPACT_VIEW_KEY);
      if (value !== null) {
        setIsCompactView(value === 'true');
      }
    } catch (error) {
      console.error('Error loading compact view preference:', error);
    }
  };

  const toggleCompactView = async () => {
    try {
      const newValue = !isCompactView;
      setIsCompactView(newValue);
      await AsyncStorage.setItem(COMPACT_VIEW_KEY, String(newValue));
    } catch (error) {
      console.error('Error saving compact view preference:', error);
    }
  };

  // Recharger les données (tâches + observations) - utilisé par le bouton et le pull-to-refresh
  const handleRefresh = async () => {
    if (!activeFarm?.farm_id) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshFarmDataSilently(['tasks']),
        loadObservations(true),
      ]);
      console.log('✅ [TasksScreen] Données rechargées');
    } catch (err) {
      console.warn('⚠️ [TasksScreen] Erreur rechargement:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Supprimer toutes les tâches planifiées (en_attente, en_cours) de la ferme
  const handleDeleteAllPlanned = () => {
    if (!activeFarm?.farm_id) return;
    Alert.alert(
      'Supprimer les tâches planifiées',
      'Seules les tâches en attente ou en cours seront supprimées. Les tâches déjà effectuées (terminées) ne sont jamais supprimées et restent affichées. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setIsRefreshing(true);
            try {
              const { deleted } = await TaskService.deleteAllPlannedTasksForFarm(activeFarm.farm_id);
              await refreshFarmDataSilently(['tasks']);
              if (deleted > 0) {
                Alert.alert('Succès', `${deleted} tâche(s) planifiée(s) supprimée(s).`);
              }
            } catch (err) {
              console.error('❌ [TasksScreen] Erreur suppression tâches planifiées:', err);
              Alert.alert('Erreur', 'Impossible de supprimer les tâches planifiées.');
            } finally {
              setIsRefreshing(false);
            }
          },
        },
      ]
    );
  };

  // Charger les observations depuis la base de données (les tâches viennent du FarmContext)
  // Charger d'abord depuis le cache si disponible, puis rafraîchir en arrière-plan
  useEffect(() => {
    if (activeFarm?.farm_id) {
      // Charger immédiatement depuis le cache si disponible
      loadObservationsFromCache();
      // Puis rafraîchir en arrière-plan
      loadObservations(true);
    } else {
      setObservations([]);
      setObservationsLoading(false);
    }
  }, [activeFarm]);
  
  // Fonction pour charger les observations depuis le cache
  const loadObservationsFromCache = async () => {
    if (!activeFarm?.farm_id) return;
    
    try {
      // Essayer de charger depuis le cache local (AsyncStorage ou similaire)
      // Pour l'instant, on charge directement depuis la DB mais sans bloquer
      // Les observations seront chargées en arrière-plan
      console.log('📦 [TasksScreen] Chargement observations depuis cache (si disponible)');
    } catch (error) {
      console.warn('⚠️ [TasksScreen] Erreur chargement cache observations:', error);
    }
  };

  const loadObservations = async (silent = false) => {
    if (!activeFarm?.farm_id) {
      console.log('🚫 [TasksScreen] Aucune ferme active, pas de chargement des observations. activeFarm:', activeFarm);
      if (!silent) setObservationsLoading(false);
      return;
    }

    console.log('📊 [TasksScreen] Chargement des observations pour la ferme:', activeFarm.farm_name, 'ID:', activeFarm.farm_id);

    try {
      if (!silent) setObservationsLoading(true);

      // Charger les observations de la ferme active
      const { data: observationsData, error: observationsError } = await supabase
        .from('observations')
        .select(`
          id,
          title,
          category,
          nature,
          crop,
          status,
          created_at
        `)
        .eq('farm_id', activeFarm.farm_id)
        .order('created_at', { ascending: false });

      if (observationsError) {
        console.error('Erreur lors du chargement des observations:', observationsError);
      } else {
        // Convertir les données de la DB vers le format ObservationData
        const formattedObservations: ObservationData[] = observationsData?.map(obs => ({
          id: obs.id,
          title: obs.title,
          description: obs.nature,
          date: new Date(obs.created_at),
          severity: 'Moyen', // À adapter selon vos besoins
          category: obs.category as any,
          crops: obs.crop ? [obs.crop] : [],
          plots: [], // À adapter selon vos besoins
          weather: {
            temperature: 20,
            humidity: 60,
            conditions: 'Inconnu',
          },
          photos: 0,
          actions: [],
          status: obs.status || 'Nouvelle',
        })) || [];
        
        setObservations(formattedObservations);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      if (!silent) setObservationsLoading(false);
    }
  };

  // Navigation semaine
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
    
    // Sélectionner le lundi de la nouvelle semaine
    const mondayOfWeek = new Date(newDate);
    mondayOfWeek.setDate(newDate.getDate() - newDate.getDay() + 1);
    setSelectedDate(mondayOfWeek);
  };

  // Générer la liste des années (plus large pour le scroll)
  const getYearOptions = () => {
    const currentYear = currentWeek.getFullYear();
    const years = [];
    // Générer une plage plus large d'années pour le scroll
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  // Naviguer vers une année spécifique en gardant la même date
  const navigateToYear = (targetYear: number) => {
    const currentYear = currentWeek.getFullYear();
    const currentMonth = currentWeek.getMonth();
    const currentDate = currentWeek.getDate();
    
    // Créer une nouvelle date avec la même date mais l'année cible
    const newDate = new Date(targetYear, currentMonth, currentDate);
    
    // Si la date n'existe pas (ex: 29 février dans une année non bissextile)
    // on prend le dernier jour du mois
    if (newDate.getMonth() !== currentMonth) {
      newDate.setDate(0); // Dernier jour du mois précédent
    }
    
    setCurrentWeek(newDate);
    
    // Mettre à jour la date sélectionnée vers le lundi de cette semaine
    const mondayOfWeek = new Date(newDate);
    mondayOfWeek.setDate(newDate.getDate() - newDate.getDay() + 1);
    setSelectedDate(mondayOfWeek);
    
    setShowYearModal(false);
  };

  const getWeekLabel = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Lundi
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Dimanche

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    };

    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };

  const getCurrentWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // Fonction utilitaire pour normaliser les dates
  const normalizeDate = (date: Date | string): Date => {
    if (date instanceof Date) {
      return date;
    }
    if (typeof date === 'string') {
      return new Date(date);
    }
    console.warn('Date invalide:', date);
    return new Date();
  };

  /** Retourne YYYY-MM-DD en date calendaire (évite décalage UTC de new Date("YYYY-MM-DD")). */
  const toTaskDateYMD = (date: Date | string): string => {
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      return date.slice(0, 10);
    }
    const d = normalizeDate(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Filtrage des données par date et type
  const filteredData = () => {
    const selectedDateStr = selectedDate.toDateString();
    const selectedLocalYMD = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

    // Filtrer par date calendaire (YMD) pour éviter décalage fuseau avec new Date("YYYY-MM-DD")
    const tasksForDate = farmTasks.filter(task => {
      const taskYMD = toTaskDateYMD(task.date);
      return taskYMD === selectedLocalYMD && !hiddenTasks.has(task.id);
    });

    const observationsForDate = observations.filter(obs => {
      const obsDate = normalizeDate(obs.date);
      return obsDate.toDateString() === selectedDateStr && !hiddenObservations.has(obs.id);
    });
    
    // Filtrer selon les vrais statuts de la DB
    const completedTasks = tasksForDate.filter(task => 
      task.dbStatus === 'terminee'
    );
    const plannedTasks = tasksForDate.filter(task => 
      task.dbStatus === 'en_attente' || task.dbStatus === 'en_cours'
    );
    
    switch (filter) {
      case 'planifie':
        return [...plannedTasks];
      case 'observation':
        return [...observationsForDate];
      case 'effectue':
        return [...completedTasks];
      default:
        return [...completedTasks, ...plannedTasks, ...observationsForDate];
    }
  };

  const getItemCounts = () => {
    // Si pas de ferme active, retourner des compteurs à zéro
    if (!activeFarm) {
      return {
        all: 0,
        planifie: 0,
        observation: 0,
        effectue: 0,
      };
    }

    const selectedDateStr = selectedDate.toDateString();
    const selectedLocalYMD = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

    // Compter seulement les éléments de la date sélectionnée (YMD pour tâches = pas de décalage fuseau)
    const tasksForDate = farmTasks.filter(task => toTaskDateYMD(task.date) === selectedLocalYMD);
    const observationsForDate = observations.filter(obs => {
      const obsDate = normalizeDate(obs.date);
      return obsDate.toDateString() === selectedDateStr;
    });
    
    const completedTasks = tasksForDate.filter(task => 
      task.dbStatus === 'terminee'
    );
    const plannedTasks = tasksForDate.filter(task => 
      task.dbStatus === 'en_attente' || task.dbStatus === 'en_cours'
    );
    
    return {
      all: completedTasks.length + plannedTasks.length + observationsForDate.length,
      planifie: plannedTasks.length,
      observation: observationsForDate.length,
      effectue: completedTasks.length,
    };
  };

  // Handlers pour l'édition
  const handleTaskEdit = (task: TaskData) => {
    // Convertir la tâche en action pour utiliser ActionEditModal
    const actionData = convertTaskToAction(task);
    setEditingAction(actionData);
    setEditingTask(task); // Garder l'original pour la conversion retour
    setShowActionModal(true);
  };

  const handleObservationEdit = (observation: ObservationData) => {
    // Convertir l'observation en action pour utiliser ActionEditModal
    const actionData = convertObservationToAction(observation);
    setEditingAction(actionData);
    setEditingObservation(observation); // Garder l'original pour la conversion retour
    setShowActionModal(true);
  };

  const handleTaskSave = async (updatedTask: TaskData) => {
    console.log('💾 [TASK-SAVE] Sauvegarde tâche:', updatedTask);
    
    try {
      // Gérer la date - convertir en format YYYY-MM-DD
      let taskDate: string | undefined;
      if (updatedTask.date) {
        if (updatedTask.date instanceof Date) {
          // Vérifier si la date est valide
          if (!isNaN(updatedTask.date.getTime())) {
            taskDate = updatedTask.date.toISOString().split('T')[0];
          } else {
            console.warn('⚠️ [TASK-SAVE] Date invalide, utilisation date actuelle');
            taskDate = new Date().toISOString().split('T')[0];
          }
        } else if (typeof updatedTask.date === 'string') {
          // Si c'est déjà une string, l'utiliser directement (format YYYY-MM-DD attendu)
          taskDate = updatedTask.date.split('T')[0];
        }
      }
      
      // Si pas de date, utiliser la date actuelle
      if (!taskDate) {
        console.warn('⚠️ [TASK-SAVE] Aucune date fournie, utilisation date actuelle');
        taskDate = new Date().toISOString().split('T')[0];
      }
      
      console.log('📅 [TASK-SAVE] Date traitée:', taskDate);
      
      // Préparer les données pour la base de données
      const taskUpdate: any = {
        title: updatedTask.title,
        date: taskDate,
        status: updatedTask.dbStatus || updatedTask.status,
        action: updatedTask.action,
        standard_action: (updatedTask as any).standard_action ?? null,
        duration_minutes: updatedTask.duration_minutes,
        number_of_people: updatedTask.number_of_people,
        plants: updatedTask.plants,
        plot_ids: updatedTask.plot_ids?.map(id => parseInt(id as string)),
        material_ids: updatedTask.material_ids?.map(id => parseInt(id as string)),
        priority: updatedTask.priority,
        notes: updatedTask.notes,
      };

      // Ajouter les quantités si présentes
      if (updatedTask.quantity) {
        taskUpdate.quantity_value = updatedTask.quantity.value;
        taskUpdate.quantity_unit = updatedTask.quantity.unit;
      }
      if (updatedTask.quantity_converted) {
        taskUpdate.quantity_converted_value = updatedTask.quantity_converted.value;
        taskUpdate.quantity_converted_unit = updatedTask.quantity_converted.unit;
      }
      if (updatedTask.quantity_nature) {
        taskUpdate.quantity_nature = updatedTask.quantity_nature;
      }
      taskUpdate.quantity_type = sanitizeQuantityType({
        quantity: updatedTask.quantity,
        quantity_nature: updatedTask.quantity_nature,
        quantity_converted: updatedTask.quantity_converted,
        quantity_type: updatedTask.quantity_type,
      });
      // Conserver l'AMM si présent (ne pas le modifier depuis l'UI)
      if (updatedTask.phytosanitary_product_amm !== undefined) {
        taskUpdate.phytosanitary_product_amm = updatedTask.phytosanitary_product_amm;
      }

      // Mettre à jour la tâche en base de données
      await TaskService.updateTask(updatedTask.id, taskUpdate);
      
      console.log('✅ [TASK-SAVE] Tâche mise à jour avec succès');
      
      // Recharger les données silencieusement (sans loading spinner)
      await refreshFarmDataSilently(['tasks']);
      
    } catch (error) {
      console.error('❌ [TASK-SAVE] Erreur sauvegarde tâche:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la tâche');
    } finally {
      setShowTaskModal(false);
      setEditingTask(undefined);
    }
  };

  const handleActionSave = async (updatedAction: ActionData) => {
    console.log('💾 [ACTION-SAVE] Sauvegarde action:', updatedAction);
    
    try {
      // Déterminer si c'est une création ou une modification
      const isNewAction = updatedAction.id?.startsWith('temp_');
      
      if (isNewAction) {
        console.log('➕ [ACTION-SAVE] Création d\'un nouvel élément');
        
        // CRÉATION : Convertir ActionData → TaskData ou ObservationData
        if (updatedAction.action_type === 'observation') {
          // Créer une observation
          const observationData: any = {
            title: updatedAction.extracted_data?.issue || updatedAction.action || 'Observation sans titre',
            category: updatedAction.extracted_data?.category || 'autre',
            nature: updatedAction.extracted_data?.notes || '',
            crop: updatedAction.extracted_data?.crops?.[0] || updatedAction.extracted_data?.crop,
            status: 'Nouvelle',
            created_at: updatedAction.extracted_data?.date || new Date().toISOString(),
            farm_id: activeFarm?.farm_id,
            user_id: user?.id,
            is_active: true
          };
          
          console.log('📝 [ACTION-SAVE] Création observation:', observationData);
          await ObservationService.createObservation(observationData);
          
        } else {
          // Créer une tâche (task_done ou task_planned)
          const taskData: any = {
            title: updatedAction.action || updatedAction.extracted_data?.action || 'Tâche sans titre',
            description: updatedAction.extracted_data?.notes,
            action: updatedAction.extracted_data?.action || updatedAction.action,
            date: updatedAction.extracted_data?.date || new Date().toISOString().split('T')[0],
            time: updatedAction.extracted_data?.time,
            status: updatedAction.action_type === 'task_done' ? 'terminee' : 'en_attente',
            farm_id: activeFarm?.farm_id,
            user_id: user?.id,
            is_active: true,
            duration_minutes: updatedAction.extracted_data?.duration?.value,
            number_of_people: updatedAction.extracted_data?.number_of_people,
            plants: updatedAction.extracted_data?.crops,
            plot_ids: updatedAction.matched_entities?.plot_ids,
            surface_unit_ids: updatedAction.matched_entities?.surface_unit_ids,
            material_ids: updatedAction.matched_entities?.material_ids,
            quantity_value: updatedAction.extracted_data?.quantity?.value,
            quantity_unit: updatedAction.extracted_data?.quantity?.unit,
            quantity_converted_value: updatedAction.extracted_data?.quantity_converted?.value,
            quantity_converted_unit: updatedAction.extracted_data?.quantity_converted?.unit,
            quantity_nature: updatedAction.extracted_data?.quantity_nature,
            quantity_type: sanitizeQuantityType(updatedAction.extracted_data),
            phytosanitary_product_amm: (updatedAction as any).phytosanitary_product_amm || null,
            notes: updatedAction.extracted_data?.notes
          };
          
          console.log('📝 [ACTION-SAVE] Création tâche:', taskData);
          await TaskService.createTask(taskData);
        }
        
        console.log('✅ [ACTION-SAVE] Élément créé avec succès');
        
      } else {
        // MODIFICATION : Logique existante
        console.log('✏️ [ACTION-SAVE] Modification d\'un élément existant');
        
        if (updatedAction.action_type === 'observation') {
          // Modifier une observation
          const updatedObservation = convertActionToObservation(updatedAction, editingObservation);
          await handleObservationSave(updatedObservation);
        } else {
          // Modifier une tâche
          const updatedTask = convertActionToTask(updatedAction, editingTask);
          await handleTaskSave(updatedTask);
        }
      }
      
      // Recharger les données silencieusement
      await refreshFarmDataSilently(['tasks']);
      await loadObservations(true);
      
    } catch (error) {
      console.error('❌ [ACTION-SAVE] Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'élément');
        } finally {
          setShowActionModal(false);
          setEditingAction(undefined);
          setEditingTask(undefined);
          setEditingObservation(undefined);
        }
  };


  const handleTaskDelete = async (taskId: string) => {
    console.log('🗑️ [TASKS-SCREEN] Starting optimistic task deletion:', taskId);
    
    // 1. Start animation immediately
    setDeletingTasks(prev => new Set(prev).add(taskId));
    
    // 2. Call API in background
    try {
      await TaskService.deleteTask(taskId);
      console.log('✅ [TASKS-SCREEN] Task deleted successfully:', taskId);
      
      // 3. Refresh data silently in background without showing loading
      refreshFarmDataSilently(['tasks']).catch(err => 
        console.warn('⚠️ [TASKS-SCREEN] Background refresh failed:', err)
      );
      
    } catch (error) {
      console.error('❌ [TASKS-SCREEN] Error deleting task:', error);
      
      // 4. Rollback on error - restore the task
      setDeletingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      setHiddenTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      
      // Show error message
      Alert.alert(
        'Erreur',
        'Impossible de supprimer la tâche. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleObservationDelete = async (observationId: string) => {
    console.log('🗑️ [TASKS-SCREEN] Starting optimistic observation deletion:', observationId);
    
    // 1. Start animation immediately
    setDeletingObservations(prev => new Set(prev).add(observationId));
    
    // 2. Call API in background
    try {
      await ObservationService.deleteObservation(observationId);
      console.log('✅ [TASKS-SCREEN] Observation deleted successfully:', observationId);
      
      // 3. Refresh observations silently in background
      loadObservations(true).catch(err => 
        console.warn('⚠️ [TASKS-SCREEN] Background refresh failed:', err)
      );
      
    } catch (error) {
      console.error('❌ [TASKS-SCREEN] Error deleting observation:', error);
      
      // 4. Rollback on error - restore the observation
      setDeletingObservations(prev => {
        const newSet = new Set(prev);
        newSet.delete(observationId);
        return newSet;
      });
      setHiddenObservations(prev => {
        const newSet = new Set(prev);
        newSet.delete(observationId);
        return newSet;
      });
      
      // Show error message
      Alert.alert(
        'Erreur',
        'Impossible de supprimer l\'observation. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle animation completion
  const handleTaskDeleteComplete = (taskId: string) => {
    console.log('🎬 [TASKS-SCREEN] Task delete animation completed:', taskId);
    setDeletingTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
    setHiddenTasks(prev => new Set(prev).add(taskId));
  };

  const handleObservationDeleteComplete = (observationId: string) => {
    console.log('🎬 [TASKS-SCREEN] Observation delete animation completed:', observationId);
    setDeletingObservations(prev => {
      const newSet = new Set(prev);
      newSet.delete(observationId);
      return newSet;
    });
    setHiddenObservations(prev => new Set(prev).add(observationId));
  };

  const handleObservationSave = async (updatedObservation: ObservationData) => {
    console.log('💾 [OBSERVATION-SAVE] Sauvegarde observation:', updatedObservation);
    
    try {
      // Gérer la date - convertir en format YYYY-MM-DD si nécessaire
      let observationDate: string | undefined;
      if (updatedObservation.date) {
        if (updatedObservation.date instanceof Date) {
          // Vérifier si la date est valide
          if (!isNaN(updatedObservation.date.getTime())) {
            observationDate = updatedObservation.date.toISOString();
          } else {
            console.warn('⚠️ [OBSERVATION-SAVE] Date invalide, utilisation date actuelle');
            observationDate = new Date().toISOString();
          }
        } else if (typeof updatedObservation.date === 'string') {
          observationDate = updatedObservation.date;
        }
      }
      
      // Si pas de date, utiliser la date actuelle
      if (!observationDate) {
        console.warn('⚠️ [OBSERVATION-SAVE] Aucune date fournie, utilisation date actuelle');
        observationDate = new Date().toISOString();
      }
      
      console.log('📅 [OBSERVATION-SAVE] Date traitée:', observationDate);
      
      // Préparer les données pour la base de données
      // Mapping ObservationData → DB
      const observationUpdate: any = {
        title: updatedObservation.title,
        category: updatedObservation.category,
        nature: updatedObservation.description || updatedObservation.issue || '',
        crop: updatedObservation.crops?.[0] || null,
        status: updatedObservation.status || 'Nouvelle',
        created_at: observationDate,
      };

      // Mettre à jour l'observation en base de données
      await ObservationService.updateObservation(updatedObservation.id, observationUpdate);
      
      console.log('✅ [OBSERVATION-SAVE] Observation mise à jour avec succès');
      
      // Recharger les observations silencieusement (sans loading spinner)
      await loadObservations(true);
      
    } catch (error) {
      console.error('❌ [OBSERVATION-SAVE] Erreur sauvegarde observation:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'observation');
    } finally {
      setShowActionModal(false);
      setEditingObservation(undefined);
    }
  };



  const handleNewTask = () => {
    // Créer une action vide pré-remplie avec la date sélectionnée et la ferme active
    const newAction: ActionData = {
      id: `temp_${Date.now()}`, // ID temporaire pour identifier les nouvelles actions
      action_type: 'task_planned', // Type par défaut
      action: '',
      extracted_data: {
        action_type: 'task_planned',
        action_verb: '',
        date: selectedDate.toISOString().split('T')[0], // Date sélectionnée dans le calendrier
        farm_id: activeFarm?.farm_id,
        user_id: user?.id
      },
      message_id: null,
      chat_id: null
    };
    
    setEditingAction(newAction);
    setShowActionModal(true);
  };

  const counts = getItemCounts();

  // Fonction pour rendre le contenu des cartes selon l'état
  const renderCardsContent = () => {
    // Si les fermes sont en cours de chargement
    if (farmLoading) {
      return (
        <View style={styles.emptyContainer}>
          <Text variant="h3" color={colors.gray[600]} style={{ marginBottom: spacing.sm }}>
            Chargement des fermes...
          </Text>
        </View>
      );
    }

    // Si aucune ferme n'est sélectionnée
    if (!activeFarm) {
      return (
        <View style={styles.emptyContainer}>
          <Text variant="h3" color={colors.gray[600]} style={{ marginBottom: spacing.sm }}>
            Aucune ferme sélectionnée
          </Text>
          <Text variant="body" color={colors.gray[500]} style={{ textAlign: 'center' }}>
            Veuillez sélectionner une ferme pour voir les tâches et observations
          </Text>
        </View>
      );
    }

    // Afficher les données en cache même si un rafraîchissement est en cours
    // Ne montrer le loading que si on n'a AUCUNE donnée en cache
    const hasCachedTasks = farmTasks.length > 0;
    const hasCachedObservations = observations.length > 0;
    const hasAnyCachedData = hasCachedTasks || hasCachedObservations;
    
    // Si on n'a aucune donnée en cache ET qu'un chargement initial est en cours
    if (!hasAnyCachedData && (tasksLoading || observationsLoading)) {
      return (
        <View style={styles.emptyContainer}>
          <Text variant="h3" color={colors.gray[600]} style={{ marginBottom: spacing.sm }}>
            Chargement des données...
          </Text>
          <Text variant="body" color={colors.gray[500]} style={{ textAlign: 'center' }}>
            {activeFarm.name}
          </Text>
        </View>
      );
    }

    // Afficher les données filtrées
    const filteredItems = filteredData();
    
    if (filteredItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={{ marginBottom: spacing.md }}>
            <CalendarIcon size={48} color={colors.gray[400]} />
          </View>
          <Text variant="h3" color={colors.gray[600]} style={{ marginBottom: spacing.sm }}>
            Aucun élément trouvé
          </Text>
          <Text variant="body" color={colors.gray[500]} style={{ textAlign: 'center' }}>
            {filter === 'all' 
              ? 'Aucune tâche ou observation pour cette date'
              : `Aucun élément "${filter === 'planifie' ? 'planifié' : filter === 'observation' ? 'observation' : 'effectué'}" pour cette date`
            }
          </Text>
        </View>
      );
    }

    // Afficher les cartes de données
    return filteredItems.map((item) => {
      // Si c'est une tâche
      if ('type' in item) {
        const task = item as TaskData;
        
        // Choisir le composant selon le mode d'affichage
        if (isCompactView) {
          return (
            <CompactTaskCard
              key={task.id}
              task={task}
              onPress={() => handleTaskEdit(task)}
              onDelete={() => handleTaskDelete(task.id)}
              onDeleteComplete={() => handleTaskDeleteComplete(task.id)}
              isDeleting={deletingTasks.has(task.id)}
            />
          );
        } else {
          return (
            <UnifiedTaskCard
              key={task.id}
              task={task}
              onPress={() => handleTaskEdit(task)}
              onEdit={() => handleTaskEdit(task)}
              onDelete={() => handleTaskDelete(task.id)}
              onDeleteComplete={() => handleTaskDeleteComplete(task.id)}
              isDeleting={deletingTasks.has(task.id)}
            />
          );
        }
      }
      
      // Si c'est une observation
      const observation = item as ObservationData;
      
      // Choisir le composant selon le mode d'affichage
      if (isCompactView) {
        return (
          <CompactObservationCard
            key={observation.id}
            observation={observation}
            onPress={() => handleObservationEdit(observation)}
            onDelete={() => handleObservationDelete(observation.id)}
            onDeleteComplete={() => handleObservationDeleteComplete(observation.id)}
            isDeleting={deletingObservations.has(observation.id)}
          />
        );
      } else {
        return (
          <UnifiedObservationCard
            key={observation.id}
            observation={observation}
            onPress={() => handleObservationEdit(observation)}
            onEdit={() => handleObservationEdit(observation)}
            onDelete={() => handleObservationDelete(observation.id)}
            onDeleteComplete={() => handleObservationDeleteComplete(observation.id)}
            isDeleting={deletingObservations.has(observation.id)}
          />
        );
      }
  });
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Section fixe - Navigation semaine */}
        <View style={styles.weekHeaderSection}>
        <View style={styles.headerTitleRow}>
            <View>
          <Text variant="h2" color={colors.text.primary}>
                Liste des tâches
              </Text>
              <Text variant="bodySmall" color={colors.gray[600]}>
                {activeFarm?.farm_name || 'Aucune ferme'}
          </Text>
            </View>
          
          <Button
              title="Nouvelle"
            variant="primary"
              size="sm"
            leftIcon={<PlusIcon color={colors.text.inverse} />}
              onPress={handleNewTask}
          />
        </View>

          {/* Navigation semaine */}
          <View style={styles.weekNavigation}>
            <TouchableOpacity
              onPress={() => navigateWeek('prev')}
              style={styles.navButton}
            >
              <ChevronLeftIcon color={colors.primary[600]} size={20} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.weekInfo}
              onPress={() => setShowYearModal(true)}
            >
              <Text variant="body" weight="semibold" color={colors.text.primary}>
                Semaine {getCurrentWeekNumber(currentWeek)} - {currentWeek.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </Text>
              <Text variant="bodySmall" color={colors.gray[600]}>
                {getWeekLabel(currentWeek)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigateWeek('next')}
              style={styles.navButton}
            >
              <ChevronRightIcon color={colors.primary[600]} size={20} />
            </TouchableOpacity>
          </View>

          {/* Jours de la semaine */}
        <View style={styles.daysRow}>
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => {
              // Calculer la date pour ce jour de la semaine
              const startOfWeek = new Date(currentWeek);
              startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // Lundi
              const dayDate = new Date(startOfWeek);
              dayDate.setDate(startOfWeek.getDate() + index);
              
              const isToday = dayDate.toDateString() === today.toDateString();
              const isSelected = dayDate.toDateString() === selectedDate.toDateString();
              
              return (
                <TouchableOpacity 
                  key={day} 
                  style={styles.dayItem}
                  onPress={() => setSelectedDate(new Date(dayDate))}
                >
                  <Text variant="caption" color={colors.gray[500]} style={styles.dayLabel}>
                    {day}
                  </Text>
                  <View style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && styles.dayCellToday,
                    !isSelected && { backgroundColor: 'transparent' }
                  ]}>
                    <Text 
                      variant="bodySmall" 
                      weight={isSelected ? 'semibold' : 'normal'}
                      color={isSelected ? colors.text.inverse : colors.gray[700]}
                    >
                      {dayDate.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Filtres par type */}
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text variant="body" weight="semibold">
              Filtrer par type:
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text variant="bodySmall" color={colors.gray[600]}>
                {selectedDate.toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </Text>
              {/* Bouton recharger les données */}
              <TouchableOpacity
                onPress={handleRefresh}
                disabled={isRefreshing}
                style={[styles.viewToggleButton, isRefreshing && { opacity: 0.6 }]}
              >
                <ArrowPathIcon 
                  color={colors.primary[600]} 
                  size={20}
                />
              </TouchableOpacity>
              {/* Bouton toggle vue compacte */}
              <TouchableOpacity
                onPress={toggleCompactView}
                style={styles.viewToggleButton}
              >
                {isCompactView ? (
                  <ViewGridIcon color={colors.primary[600]} size={20} />
                ) : (
                  <ViewListIcon color={colors.primary[600]} size={20} />
                )}
              </TouchableOpacity>
              {/* Supprimer toutes les tâches planifiées */}
              <TouchableOpacity
                onPress={handleDeleteAllPlanned}
                disabled={isRefreshing}
                style={[styles.viewToggleButton, isRefreshing && { opacity: 0.6 }]}
                accessibilityLabel="Supprimer toutes les tâches planifiées"
              >
                <TrashIcon color={colors.semantic?.error ?? '#b91c1c'} size={20} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {[
              { key: 'all', label: 'Tout' },
              { key: 'planifie', label: 'Planifié' },
              { key: 'effectue', label: 'Effectué' },
              { key: 'observation', label: 'Observation' }
          ].map((filterOption) => (
            <TouchableOpacity
              key={filterOption.key}
                onPress={() => setFilter(filterOption.key as FilterType)}
              style={[
                styles.filterChip,
                filter === filterOption.key && styles.filterChipActive
              ]}
            >
              <Text
                variant="bodySmall"
                color={filter === filterOption.key ? colors.text.inverse : colors.gray[700]}
                weight="semibold"
              >
                {filterOption.label}
              </Text>
              <View style={[
                styles.filterBadge,
                filter === filterOption.key ? styles.filterBadgeActive : styles.filterBadgeInactive
              ]}>
                  <Text
                    variant="caption"
                    color={filter === filterOption.key ? colors.overlay.white90 : colors.primary[700]}
                    weight="bold"
                    style={styles.filterBadgeText}
                  >
                    {counts[filterOption.key as keyof typeof counts]}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
              </View>

        {/* Liste des cartes filtrées */}
        <View style={styles.cardsContainer}>
          {renderCardsContent()}
              </View>
      </ScrollView>

      {/* Modales d'édition */}
      <ActionEditModal
        visible={showActionModal}
        action={editingAction || null}
        onClose={() => {
          setShowActionModal(false);
          setEditingAction(undefined);
          setEditingTask(undefined);
          setEditingObservation(undefined);
        }}
        onSave={handleActionSave}
      />

      <TaskEditModal
        visible={showTaskModal}
        task={editingTask}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(undefined);
        }}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
        activeFarm={activeFarm}
        selectedDate={selectedDate}
      />


      {/* Modale de sélection d'année */}
      <Modal
        visible={showYearModal}
        onClose={() => setShowYearModal(false)}
        title="Choisir une année"
      >
        <View style={styles.yearModalContent}>
          <Text variant="body" color={colors.gray[600]} style={{ marginBottom: spacing.lg, textAlign: 'center' }}>
            Sélectionnez une année pour naviguer vers la même période
          </Text>
          
          <ScrollView
            style={styles.yearScrollView}
            contentContainerStyle={styles.yearScrollContent}
            showsVerticalScrollIndicator={true}
            ref={(ref) => {
              // Auto-scroll vers l'année courante quand la modale s'ouvre
              if (ref && showYearModal) {
                const currentYear = currentWeek.getFullYear();
                const yearOptions = getYearOptions();
                const currentIndex = yearOptions.findIndex(year => year === currentYear);
                if (currentIndex >= 0) {
                  // Calculer la position pour centrer l'année courante
                  const itemHeight = 60; // hauteur approximative d'un élément
                  const scrollPosition = Math.max(0, (currentIndex * itemHeight) - 120);
                  setTimeout(() => {
                    ref.scrollTo({ y: scrollPosition, animated: true });
                  }, 100);
                }
              }
            }}
          >
            {getYearOptions().map((year) => {
              const isCurrentYear = year === currentWeek.getFullYear();
              return (
                <TouchableOpacity
                  key={year}
                  onPress={() => navigateToYear(year)}
                  style={[
                    styles.yearOption,
                    isCurrentYear && styles.yearOptionCurrent
                  ]}
                >
                  <Text
                    variant="h3"
                    weight={isCurrentYear ? 'bold' : 'semibold'}
                    color={isCurrentYear ? colors.text.inverse : colors.gray[700]}
                  >
                    {year}
              </Text>
                  {isCurrentYear && (
                    <Text
                      variant="caption"
                      color={colors.text.inverse}
                      style={styles.yearBadge}
                    >
                      Année actuelle
                    </Text>
              )}
                </TouchableOpacity>
              );
            })}
      </ScrollView>
          
          <TouchableOpacity
            onPress={() => setShowYearModal(false)}
            style={styles.cancelButton}
          >
            <Text variant="body" weight="semibold" color={colors.gray[700]}>
              Annuler
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  weekHeaderSection: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg + HORIZONTAL_PADDING,
    marginBottom: spacing.lg,
    marginHorizontal: -HORIZONTAL_PADDING,
    borderWidth: 0,
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
    borderRadius: 6,
    backgroundColor: colors.background.primary,
  },
  weekInfo: {
    alignItems: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  dayItem: {
    alignItems: 'center',
  },
  dayLabel: {
    marginBottom: spacing.xs,
  },
  dayCell: {
    width: DAY_CELL_SIZE,
    height: DAY_CELL_SIZE,
    borderRadius: DAY_CELL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  dayCellSelected: {
    backgroundColor: colors.primary[600],
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: colors.secondary.orange,
  },
  filterSection: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + HORIZONTAL_PADDING,
    marginBottom: spacing.lg,
    marginHorizontal: -HORIZONTAL_PADDING,
    borderWidth: 0,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  filterScrollContent: {
    paddingHorizontal: 0,
    columnGap: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[200],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  filterBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: FILTER_BADGE_MIN_WIDTH,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: colors.overlay.white25,
  },
  filterBadgeInactive: {
    backgroundColor: colors.overlay.primary20,
  },
  filterBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  viewToggleButton: {
    padding: spacing.xs,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
  },
  cardsContainer: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  yearModalContent: {
    padding: spacing.lg,
    height: 400,
  },
  yearScrollView: {
    flex: 1,
    marginVertical: spacing.md,
  },
  yearScrollContent: {
    paddingVertical: spacing.lg,
  },
  yearOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.gray[200],
    alignItems: 'center',
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  yearOptionCurrent: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  yearBadge: {
    marginTop: spacing.xs,
  },
  cancelButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    alignItems: 'center',
  },
});
