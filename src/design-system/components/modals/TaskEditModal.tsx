import React, { useState, useEffect } from 'react';
import { View, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { StandardFormModal, FormSection, RowFields } from '../StandardFormModal';
import { EnhancedInput } from '../EnhancedInput';
import { DropdownSelector, DropdownItem } from '../DropdownSelector';
import { CultureDropdownSelector, CultureDropdownItem } from '../CultureDropdownSelector';
import { DatePicker } from '../DatePicker';
import { Button } from '../Button';
import { Text } from '../Text';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { TaskData } from '../cards/TaskCard';
import { PhotoPicker } from '../photos/PhotoPicker';
import { AttachedPhoto, mediaService } from '../../../services/MediaService';
import { useFarm } from '../../../contexts/FarmContext';
import { useAuth } from '../../../contexts/AuthContext';
import { DirectSupabaseService } from '../../../services/DirectSupabaseService';
import { cultureService } from '../../../services/CultureService';
import { PhytosanitaryProductService } from '../../../services/PhytosanitaryProductService';

// Actions standard — codes alignés avec task_standard_actions (DB)
const COMMON_ACTIONS: DropdownItem[] = [
  // Production — récolte
  { id: 'recolter',         label: 'Récolter',               category: 'production',       color: '#10b981' },
  { id: 'cueillir',         label: 'Cueillir',               category: 'production',       color: '#059669' },
  // Production — plantation / semis
  { id: 'planter',          label: 'Planter',                category: 'production',       color: '#22c55e' },
  { id: 'semer',            label: 'Semer',                  category: 'production',       color: '#16a34a' },
  // Production — préparation sol
  { id: 'labourer',         label: 'Labourer',               category: 'production',       color: '#7c3aed' },
  { id: 'fraiser',          label: 'Fraiser / préparer sol', category: 'production',       color: '#6d28d9' },
  // Production — entretien
  { id: 'desherber',        label: 'Désherber',              category: 'production',       color: '#eab308' },
  { id: 'biner',            label: 'Biner',                  category: 'production',       color: '#ca8a04' },
  { id: 'butter',           label: 'Butter',                 category: 'production',       color: '#a16207' },
  { id: 'tailler',          label: 'Tailler',                category: 'production',       color: '#92400e' },
  { id: 'eclaircir',        label: 'Éclaircir',              category: 'production',       color: '#78350f' },
  { id: 'attacher',         label: 'Attacher / tuteurer',    category: 'production',       color: '#713f12' },
  { id: 'arroser',          label: 'Arroser',                category: 'production',       color: '#0ea5e9' },
  { id: 'irriguer',         label: 'Irriguer',               category: 'production',       color: '#0284c7' },
  // Production — protection / traitement
  { id: 'traiter',          label: 'Traiter',                category: 'production',       color: '#dc2626' },
  { id: 'fertiliser',       label: 'Fertiliser',             category: 'production',       color: '#15803d' },
  { id: 'amender',          label: 'Amender le sol',         category: 'production',       color: '#166534' },
  { id: 'mulcher',          label: 'Pailler / mulcher',      category: 'production',       color: '#14532d' },
  // Production — serre / nettoyage
  { id: 'ouvrir_serre',     label: 'Ouvrir la serre',        category: 'production',       color: '#0891b2' },
  { id: 'fermer_serre',     label: 'Fermer la serre',        category: 'production',       color: '#0e7490' },
  { id: 'installer',        label: 'Installer / poser',      category: 'production',       color: '#155e75' },
  { id: 'retirer',          label: 'Retirer / enlever',      category: 'production',       color: '#164e63' },
  { id: 'nettoyer',         label: 'Nettoyer',               category: 'production',       color: '#06b6d4' },
  { id: 'trier',            label: 'Trier',                  category: 'production',       color: '#0891b2' },
  { id: 'composter',        label: 'Composter',              category: 'production',       color: '#047857' },
  // Animaux
  { id: 'nourrir',          label: 'Nourrir',                category: 'production',       color: '#f59e0b' },
  { id: 'soigner',          label: 'Soigner',                category: 'production',       color: '#d97706' },
  { id: 'recolter_oeufs',   label: 'Ramasser les œufs',      category: 'production',       color: '#b45309' },
  { id: 'tondre',           label: 'Tondre',                 category: 'production',       color: '#92400e' },
  { id: 'faucher',          label: 'Faucher',                category: 'production',       color: '#78350f' },
  // Commercialisation
  { id: 'preparer_commande',label: 'Préparer les commandes', category: 'commercialisation', color: '#8b5cf6' },
  { id: 'livrer',           label: 'Livrer',                 category: 'commercialisation', color: '#7c3aed' },
  { id: 'vendre',           label: 'Vendre',                 category: 'commercialisation', color: '#6d28d9' },
  { id: 'conditionner',     label: 'Conditionner',           category: 'commercialisation', color: '#5b21b6' },
  // Administratif
  { id: 'facturer',         label: 'Facturer',               category: 'administratif',    color: '#3b82f6' },
  { id: 'inventorier',      label: 'Inventorier',            category: 'administratif',    color: '#2563eb' },
  { id: 'declarer',         label: 'Déclarer',               category: 'administratif',    color: '#1d4ed8' },
  { id: 'planifier',        label: 'Planifier',              category: 'administratif',    color: '#1e40af' },
  // Général
  { id: 'reparer',          label: 'Réparer',                category: 'general',          color: '#6b7280' },
  { id: 'entretenir',       label: 'Entretenir',             category: 'general',          color: '#4b5563' },
  { id: 'transporter',      label: 'Transporter',            category: 'general',          color: '#374151' },
  { id: 'surveiller',       label: 'Surveiller',             category: 'general',          color: '#1f2937' },
  { id: 'autre',            label: 'Autre',                  category: 'general',          color: '#9ca3af' },
];

// Cultures communes disponibles
const COMMON_CROPS: DropdownItem[] = [
  // Légumes feuilles
  { id: 'salade', label: 'Salade', category: 'legumes_feuilles', color: '#10b981' },
  { id: 'epinard', label: 'Épinard', category: 'legumes_feuilles', color: '#10b981' },
  { id: 'mache', label: 'Mâche', category: 'legumes_feuilles', color: '#10b981' },
  { id: 'roquette', label: 'Roquette', category: 'legumes_feuilles', color: '#10b981' },
  { id: 'chou', label: 'Chou', category: 'legumes_feuilles', color: '#10b981' },
  
  // Légumes fruits
  { id: 'tomate', label: 'Tomate', category: 'legumes_fruits', color: '#ef4444' },
  { id: 'courgette', label: 'Courgette', category: 'legumes_fruits', color: '#22c55e' },
  { id: 'aubergine', label: 'Aubergine', category: 'legumes_fruits', color: '#8b5cf6' },
  { id: 'poivron', label: 'Poivron', category: 'legumes_fruits', color: '#f59e0b' },
  { id: 'concombre', label: 'Concombre', category: 'legumes_fruits', color: '#22c55e' },
  
  // Légumes racines
  { id: 'carotte', label: 'Carotte', category: 'legumes_racines', color: '#f97316' },
  { id: 'radis', label: 'Radis', category: 'legumes_racines', color: '#ef4444' },
  { id: 'betterave', label: 'Betterave', category: 'legumes_racines', color: '#dc2626' },
  { id: 'navet', label: 'Navet', category: 'legumes_racines', color: '#f3f4f6' },
  
  // Aromates
  { id: 'basilic', label: 'Basilic', category: 'aromates', color: '#22c55e' },
  { id: 'persil', label: 'Persil', category: 'aromates', color: '#22c55e' },
  { id: 'ciboulette', label: 'Ciboulette', category: 'aromates', color: '#22c55e' },
  { id: 'thym', label: 'Thym', category: 'aromates', color: '#22c55e' },
];

// Unités communes
const COMMON_UNITS: DropdownItem[] = [
  { id: 'kg', label: 'kg', type: 'poids' },
  { id: 'g', label: 'g', type: 'poids' },
  { id: 'tonne', label: 'tonne', type: 'poids' },
  { id: 'litre', label: 'litre', type: 'volume' },
  { id: 'ml', label: 'ml', type: 'volume' },
  { id: 'caisse', label: 'caisse', type: 'conditionnement' },
  { id: 'botte', label: 'botte', type: 'conditionnement' },
  { id: 'piece', label: 'pièce', type: 'unite' },
];

// Unités de durée
const DURATION_UNITS: DropdownItem[] = [
  { id: 'minutes', label: 'minutes', type: 'temps' },
  { id: 'heures', label: 'heures', type: 'temps' },
  { id: 'jours', label: 'jours', type: 'temps' },
];

// Catégories de matériel avec libellés lisibles
const MATERIAL_CATEGORIES: DropdownItem[] = [
  { id: 'tracteurs', label: 'Tracteurs', type: 'category' },
  { id: 'outils_tracteur', label: 'Outils tracteur', type: 'category' },
  { id: 'outils_manuels', label: 'Outils manuels', type: 'category' },
  { id: 'petit_equipement', label: 'Petit équipement', type: 'category' },
];

export interface TaskEditModalProps {
  visible: boolean;
  task?: TaskData;
  onClose: () => void;
  onSave: (task: TaskData & { photos?: AttachedPhoto[] }) => void;
  onDelete?: (taskId: string) => void;
  activeFarm?: {
    farm_name: string;
    farm_id: number;
  };
  selectedDate?: Date;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  visible,
  task,
  onClose,
  onSave,
  onDelete,
  activeFarm,
  selectedDate,
}) => {
  const { activeFarm: contextFarm } = useFarm();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<TaskData & {
    action: string;
    standard_action: string | null;
    time: string;
    plot_ids: number[];
    surface_unit_ids: number[];
    material_ids: number[];
    quantity_value: string;
    quantity_unit: string;
    converted_value: string;
    converted_unit: string;
    duration_unit: string;
  }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [attachedPhotos, setAttachedPhotos] = useState<AttachedPhoto[]>([]);
  
  // Données pour les dropdowns
  const [plots, setPlots] = useState<DropdownItem[]>([]);
  const [surfaceUnits, setSurfaceUnits] = useState<DropdownItem[]>([]);
  const [materials, setMaterials] = useState<DropdownItem[]>([]);
  
  // États pour la sélection multiple de cultures
  const [selectedCultures, setSelectedCultures] = useState<CultureDropdownItem[]>([]);
  const [tempCultureSelection, setTempCultureSelection] = useState<CultureDropdownItem | null>(null);
  
  // État pour le nom du produit phytosanitaire (affichage)
  const [productDisplayName, setProductDisplayName] = useState<string | null>(null);

  // Charger les données de la ferme
  useEffect(() => {
    if (visible && (activeFarm?.farm_id || contextFarm?.farm_id)) {
      loadFarmData();
    }
  }, [visible, activeFarm?.farm_id, contextFarm?.farm_id]);

  // Fonction pour charger les cultures depuis les noms
  const loadCulturesFromNames = async (cropNames: string[]): Promise<CultureDropdownItem[]> => {
    if (!cropNames || cropNames.length === 0) return [];
    
    const farmId = activeFarm?.farm_id || contextFarm?.farm_id;
    if (!farmId || !user?.id) return [];
    
    try {
      const cultures = await cultureService.getCulturesForUser(user.id, farmId);
      const cultureItems: CultureDropdownItem[] = [];
      
      for (const cropName of cropNames) {
        const normalizedName = cropName.toLowerCase().trim();
        const culture = cultures.find(c => {
          const cultureName = c.name.toLowerCase();
          return cultureName === normalizedName ||
                 (normalizedName.endsWith('s') && normalizedName.slice(0, -1) === cultureName) ||
                 (cultureName.endsWith('s') && cultureName.slice(0, -1) === normalizedName) ||
                 (normalizedName.endsWith('x') && normalizedName.slice(0, -1) === cultureName) ||
                 (cultureName.endsWith('x') && cultureName.slice(0, -1) === normalizedName);
        });
        
        if (culture) {
          cultureItems.push({
            id: `culture-${culture.id}`,
            label: culture.name,
            type: 'culture',
            culture,
            cultureType: culture.type,
          });
        }
      }
      
      return cultureItems;
    } catch (error) {
      console.error('Erreur lors du chargement des cultures:', error);
      return [];
    }
  };

  // Fonction helper pour charger le nom du produit phytosanitaire
  const loadProductDisplayName = async (amm: string | null | undefined, quantityNature: string | null | undefined) => {
    if (amm) {
      try {
        const product = await PhytosanitaryProductService.getProductByAMM(amm);
        if (product) {
          setProductDisplayName(product.name);
          return product.name;
        }
      } catch (error) {
        console.warn('⚠️ [TaskEditModal] Erreur chargement produit:', error);
      }
    }
    // Fallback sur quantity_nature si produit non trouvé
    setProductDisplayName(quantityNature || null);
    return quantityNature || null;
  };

  // Initialiser le formulaire avec les données de la tâche
  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        action: task.title || '', // Utiliser le titre comme action par défaut
        standard_action: (task as any).standard_action ?? null,
        time: '',
        crops: task.crops || [],
        plots: task.plots || [],
        plot_ids: Array.isArray((task as any).plot_ids)
          ? (task as any).plot_ids.map((id: string | number) => parseInt(String(id), 10)).filter((id: number) => Number.isFinite(id))
          : [],
        surface_unit_ids: Array.isArray((task as any).surface_unit_ids)
          ? (task as any).surface_unit_ids.map((id: string | number) => parseInt(String(id), 10)).filter((id: number) => Number.isFinite(id))
          : [],
        material_ids: Array.isArray((task as any).material_ids)
          ? (task as any).material_ids.map((id: string | number) => parseInt(String(id), 10)).filter((id: number) => Number.isFinite(id))
          : [],
        quantity_value: '',
        quantity_unit: 'kg',
        converted_value: '',
        converted_unit: 'kg',
        duration_unit: 'minutes',
      });
      
      // Charger le nom du produit phytosanitaire si AMM présent
      if (task.phytosanitary_product_amm) {
        loadProductDisplayName(task.phytosanitary_product_amm, task.quantity_nature || null);
      } else {
        setProductDisplayName(task.quantity_nature || null);
      }
      // Charger les cultures depuis les noms
      if (task.crops && task.crops.length > 0) {
        loadCulturesFromNames(task.crops).then(cultures => {
          setSelectedCultures(cultures);
        });
      } else {
        setSelectedCultures([]);
      }
      // Charger les photos existantes si disponibles
      // TODO: Récupérer les photos depuis les métadonnées de la tâche
      setAttachedPhotos([]);
    } else {
      // Nouvelle tâche
      setFormData({
        title: '',
        action: '',
        time: '',
        type: 'completed',
        date: selectedDate || new Date(),
        duration: 0,
        people: 1,
        crops: [],
        plots: [],
        category: 'Production',
        notes: '',
        status: 'Terminée',
        plot_ids: [],
        surface_unit_ids: [],
        material_ids: [],
        quantity_value: '',
        quantity_unit: 'kg',
        converted_value: '',
        converted_unit: 'kg',
        duration_unit: 'minutes',
      });
      setSelectedCultures([]);
      setAttachedPhotos([]);
    }
    setTempCultureSelection(null);
  }, [task, visible, activeFarm?.farm_id, contextFarm?.farm_id, user?.id]);

  const loadFarmData = async () => {
    const farmId = activeFarm?.farm_id || contextFarm?.farm_id;
    if (!farmId) return;

    try {
      console.log('🔄 [TaskEditModal] Chargement des données de la ferme:', farmId);

      // Charger les parcelles
      const plotsResult = await DirectSupabaseService.directSelect(
        'plots',
        'id, name, code, type',
        [{ column: 'farm_id', value: farmId }, { column: 'is_active', value: true }]
      );
      
      if (!plotsResult.error && plotsResult.data) {
        const plotsData = plotsResult.data.map((p: any) => ({
          id: p.id.toString(),
          label: p.name,
          type: p.type,
          description: p.code,
        }));
        setPlots(plotsData);
        console.log('✅ [TaskEditModal] Parcelles chargées:', plotsData.length);
      } else {
        console.error('❌ [TaskEditModal] Erreur chargement parcelles:', plotsResult.error);
        setPlots([]);
      }

      // Charger les planches (surface units)
      const surfaceResult = await DirectSupabaseService.directSelect(
        'surface_units',
        'id, name, code, plot_id, type',
        [{ column: 'is_active', value: true }]
      );
      
      if (!surfaceResult.error && surfaceResult.data) {
        // Filtrer par parcelles de la ferme
        const farmPlotIds = plotsResult.data?.map((p: any) => p.id) || [];
        const filtered = surfaceResult.data.filter((s: any) => farmPlotIds.includes(s.plot_id));
        const surfaceData = filtered.map((s: any) => ({
          id: s.id.toString(),
          label: s.name,
          type: s.type,
          description: s.code,
        }));
        setSurfaceUnits(surfaceData);
        console.log('✅ [TaskEditModal] Planches chargées:', surfaceData.length);
      } else {
        console.error('❌ [TaskEditModal] Erreur chargement planches:', surfaceResult.error);
        setSurfaceUnits([]);
      }

      // Charger le matériel
      const materialsResult = await DirectSupabaseService.directSelect(
        'materials',
        'id, name, category, brand, model',
        [{ column: 'farm_id', value: farmId }, { column: 'is_active', value: true }]
      );
      
      if (!materialsResult.error && materialsResult.data) {
        const materialsData = materialsResult.data.map((m: any) => ({
          id: m.id.toString(),
          label: m.name,
          type: m.category,
          category: m.category,
          description: m.brand ? `${m.brand} ${m.model || ''}`.trim() : undefined,
        }));
        setMaterials(materialsData);
        console.log('✅ [TaskEditModal] Matériel chargé:', materialsData.length);
      } else {
        console.error('❌ [TaskEditModal] Erreur chargement matériel:', materialsResult.error);
        setMaterials([]);
      }
    } catch (error) {
      console.error('❌ [TaskEditModal] Erreur chargement données ferme:', error);
      setPlots([]);
      setSurfaceUnits([]);
      setMaterials([]);
    }
  };

  const handleSave = async () => {
    if (!formData.action?.trim()) {
      Alert.alert('Erreur', 'L\'action est obligatoire');
      return;
    }
    
    // Génération automatique du titre si vide
    let finalTitle = formData.title?.trim();
    if (!finalTitle) {
      finalTitle = generateAutoTitle(formData);
      if (!finalTitle) {
        Alert.alert('Erreur', 'Impossible de générer un titre automatiquement. Veuillez spécifier une action.');
        return;
      }
    }

    setIsLoading(true);
    try {
      // Uploader les photos si nécessaire
      let uploadedPhotos: AttachedPhoto[] = [];
      if (attachedPhotos.length > 0 && activeFarm?.farm_id) {
        console.log('📷 [TASK] Upload des photos en cours...');
        uploadedPhotos = await mediaService.uploadAttachedPhotos(
          attachedPhotos, 
          activeFarm.farm_id, 
          'tasks'
        );
        console.log('✅ [TASK] Photos uploadées:', uploadedPhotos.length);
      }

      const taskToSave: TaskData & { photos?: AttachedPhoto[] } = {
        id: task?.id || `task_${Date.now()}`,
        title: finalTitle,
        action: formData.action,
        standard_action: formData.standard_action ?? null,
        type: formData.type || 'completed',
        date: formData.date || new Date(),
        duration: formData.duration,
        people: formData.people,
        crops: selectedCultures.map(c => c.culture?.name || c.label),
        plots: formData.plots,
        plot_ids: (formData.plot_ids || []).map((id) => String(id)),
        surface_unit_ids: (formData.surface_unit_ids || []).map((id) => String(id)),
        material_ids: (formData.material_ids || []).map((id) => String(id)),
        category: formData.category,
        notes: formData.notes,
        status: formData.status,
        photos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
      };

      await onSave(taskToSave);
      onClose();
    } catch (error) {
      console.error('❌ [TASK] Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la tâche');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!task?.id) return;

    Alert.alert(
      'Supprimer la tâche',
      'Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            onDelete?.(task.id);
            onClose();
          },
        },
      ]
    );
  };

  // Gérer les changements de sélection temporaire (dropdown)
  const handleCultureChange = (culture: CultureDropdownItem | null) => {
    setTempCultureSelection(culture);
  };

  // Ajouter une culture à la liste
  const handleAddCulture = () => {
    if (tempCultureSelection && !selectedCultures.find(c => c.id === tempCultureSelection.id)) {
      setSelectedCultures([...selectedCultures, tempCultureSelection]);
      setTempCultureSelection(null); // Réinitialiser le dropdown
    }
  };

  // Retirer une culture de la liste
  const handleRemoveCulture = (cultureId: string) => {
    setSelectedCultures(selectedCultures.filter(c => c.id !== cultureId));
  };

  const updateFormData = (field: keyof TaskData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Génération automatique du titre basé sur l'action et la culture
    if (field === 'action' || field === 'crops') {
      const newFormData = { ...formData, [field]: value };
      const generatedTitle = generateAutoTitle(newFormData);
      if (generatedTitle && !newFormData.title?.trim()) {
        setFormData(prev => ({ ...prev, [field]: value, title: generatedTitle }));
        return;
      }
    }
  };

  const generateAutoTitle = (data: TaskData): string => {
    const action = data.action?.trim();
    const crops = Array.isArray(data.crops) ? data.crops : [];
    
    if (!action) return '';
    
    // Si pas de culture, juste l'action
    if (crops.length === 0) {
      return action;
    }
    
    // Si une seule culture
    if (crops.length === 1) {
      return `${action} ${crops[0]}`;
    }
    
    // Si plusieurs cultures
    if (crops.length <= 3) {
      return `${action} ${crops.join(', ')}`;
    }
    
    // Si trop de cultures, afficher les 2 premières + "..."
    return `${action} ${crops.slice(0, 2).join(', ')} et ${crops.length - 2} autre${crops.length - 2 > 1 ? 's' : ''}`;
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const parseInputDate = (dateString: string) => {
    return new Date(dateString + 'T12:00:00');
  };

  const getInfoBanner = () => {
    if (!task && (activeFarm || selectedDate)) {
      let text = '';
      if (activeFarm) text += `Ferme: ${activeFarm.farm_name}`;
      if (selectedDate) {
        if (text) text += ' - ';
        text += `Date: ${selectedDate.toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long',
          year: 'numeric'
        })}`;
      }
      return { text, type: 'info' as const };
    }
    return undefined;
  };

  return (
    <StandardFormModal
      visible={visible}
      onClose={onClose}
      title={task ? 'Modifier la tâche' : 'Nouvelle tâche'}
      primaryAction={{
        title: task ? 'Sauvegarder' : 'Créer',
        onPress: handleSave,
        loading: isLoading,
      }}
      secondaryAction={{
        title: 'Annuler',
        onPress: onClose,
      }}
      infoBanner={getInfoBanner()}
    >
      <FormSection 
        title="Informations principales"
      >

        <EnhancedInput
          label="Titre de la tâche"
          placeholder={formData.action ? `${generateAutoTitle(formData) || formData.action}` : "Le titre sera généré automatiquement"}
          value={formData.title || ''}
          onChangeText={(value) => updateFormData('title', value)}
          hint="Optionnel - Un titre sera généré automatiquement basé sur l'action et les cultures"
        />

        <EnhancedInput
          label="Action"
          placeholder="Ex: Récolter, Planter, Désherber..."
          value={formData.action || ''}
          onChangeText={(value) => updateFormData('action', value)}
          hint="Spécifiez l'action principale de cette tâche"
          required
        />

        <DropdownSelector
          label="Action standard"
          placeholder="Sélectionner une action normalisée…"
          items={COMMON_ACTIONS}
          selectedItems={formData.standard_action
            ? COMMON_ACTIONS.filter(a => a.id === formData.standard_action)
            : []}
          onSelectionChange={(selected) =>
            setFormData(prev => ({
              ...prev,
              standard_action: selected.length > 0 ? selected[0].id : null,
            }))
          }
          multiSelect={false}
          searchable
          filterable
          hint="Choix normalisé pour les statistiques et le filtrage"
        />

        <View>
          <Text variant="body" style={{ 
            marginBottom: spacing.sm,
            fontWeight: '600',
            color: colors.text.primary 
          }}>
            Type de tâche
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              title="Effectuée"
              variant={formData.type === 'completed' ? 'primary' : 'outline'}
              size="sm"
              onPress={() => updateFormData('type', 'completed')}
              style={{ flex: 1 }}
            />
            <Button
              title="Planifiée"
              variant={formData.type === 'planned' ? 'primary' : 'outline'}
              size="sm"
              onPress={() => updateFormData('type', 'planned')}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <RowFields>
          <View style={{ flex: 2 }}>
            <DatePicker
              label="Date"
              value={formData.date}
              onChange={(date) => updateFormData('date', date)}
              placeholder="Sélectionner une date"
              required
            />
          </View>
          <View style={{ flex: 1 }}>
            <EnhancedInput
              label="Heure"
              placeholder="HH:MM"
              value={formData.time || ''}
              onChangeText={(value) => updateFormData('time', value)}
              hint="Optionnel"
            />
          </View>
        </RowFields>
      </FormSection>

      <FormSection 
        title="Détails d'exécution"
      >
        <RowFields>
          <View style={{ flex: 1 }}>
            <EnhancedInput
              label="Durée"
              placeholder="60"
              value={formData.duration?.toString() || ''}
              onChangeText={(value) => updateFormData('duration', parseInt(value) || 0)}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <DropdownSelector
              label="Unité"
              placeholder="minutes"
              items={DURATION_UNITS}
              selectedItems={DURATION_UNITS.filter(u => u.id === formData.duration_unit)}
              onSelectionChange={(items) => updateFormData('duration_unit', items[0]?.id || 'minutes')}
            />
          </View>
        </RowFields>
        
        <EnhancedInput
          label="Nombre de personnes"
          placeholder="1"
          value={formData.people?.toString() || ''}
          onChangeText={(value) => updateFormData('people', parseInt(value) || 1)}
          keyboardType="numeric"
          hint="Incluez vous-même dans le compte"
        />

        {/* Affichage du temps total calculé */}
        {formData.duration > 0 && formData.people && formData.people > 0 && (
          <View style={{
            backgroundColor: colors.primary[50],
            padding: spacing.md,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}>
            <Text style={{ fontSize: 20 }}>⏱️</Text>
            <View>
              <Text variant="body" style={{ color: colors.primary[700], fontWeight: '600' }}>
                Temps total de travail
              </Text>
              <Text variant="body" style={{ color: colors.primary[800], fontWeight: '600' }}>
                {(formData.duration * formData.people)} {formData.duration_unit || 'minutes'}
              </Text>
              <Text variant="caption" style={{ color: colors.primary[600] }}>
                ({formData.duration} {formData.duration_unit || 'minutes'} × {formData.people} personne{formData.people > 1 ? 's' : ''})
              </Text>
            </View>
          </View>
        )}
      </FormSection>

      <FormSection>
        <View>
          <Text variant="body" style={{ 
            marginBottom: spacing.sm,
            fontWeight: '600',
            color: colors.text.primary 
          }}>
            Catégorie
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: 2 }}
            style={{ marginHorizontal: -2 }}
          >
            {['Production', 'Marketing', 'Administrative', 'Général'].map((category) => (
              <Button
                key={category}
                title={category}
                variant={formData.category === category ? 'primary' : 'outline'}
                size="sm"
                onPress={() => updateFormData('category', category)}
                style={{ minWidth: 100 }}
              />
            ))}
          </ScrollView>
        </View>

        <View>
          <Text variant="body" style={{ 
            marginBottom: spacing.sm,
            fontWeight: '600',
            color: colors.text.primary 
          }}>
            Culture(s)
          </Text>
          
          {/* Dropdown + Bouton Ajouter */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <CultureDropdownSelector
                placeholder="Sélectionner une culture..."
                selectedItem={tempCultureSelection}
                onSelectionChange={handleCultureChange}
                farmId={activeFarm?.farm_id || contextFarm?.farm_id}
                allowVarieties={false}
                searchable={true}
                useUserPreferences={true}
                hint="Filtrer par type de culture"
              />
            </View>
            <TouchableOpacity
              onPress={handleAddCulture}
              disabled={!tempCultureSelection || selectedCultures.some(c => c.id === tempCultureSelection.id)}
              style={{
                backgroundColor: tempCultureSelection && !selectedCultures.some(c => c.id === tempCultureSelection.id)
                  ? colors.primary[600]
                  : colors.gray[300],
                borderRadius: 8,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: 60,
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="add-outline"
                size={24}
                color={tempCultureSelection && !selectedCultures.some(c => c.id === tempCultureSelection.id)
                  ? colors.text.inverse
                  : colors.gray[500]}
              />
            </TouchableOpacity>
          </View>

          {/* Liste des cultures sélectionnées */}
          {selectedCultures.length > 0 && (
            <View style={{
              backgroundColor: colors.gray[50],
              borderRadius: 8,
              padding: spacing.sm,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.xs,
            }}>
              {selectedCultures.map((culture) => (
                <View
                  key={culture.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.background.primary,
                    borderRadius: 16,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderWidth: 1,
                    borderColor: colors.border.primary,
                    gap: spacing.xs,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: culture.culture?.color || colors.primary[500],
                    }}
                  />
                  <Text variant="caption" style={{ color: colors.text.primary }}>
                    {culture.label}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveCulture(culture.id)}
                    style={{ padding: spacing.xs }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={colors.gray[500]}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <DropdownSelector
          label="Parcelle(s)"
          placeholder="Sélectionner les parcelles"
          items={plots}
          selectedItems={plots.filter(p => formData.plot_ids?.includes(parseInt(p.id)))}
          onSelectionChange={(items) => updateFormData('plot_ids', items.map(i => parseInt(i.id)))}
          multiSelect
          searchable
          hint="Sélectionnez une ou plusieurs parcelles"
        />
        
        <DropdownSelector
          label="Planche(s) / Surface(s)"
          placeholder="Sélectionner les planches"
          items={surfaceUnits}
          selectedItems={surfaceUnits.filter(s => formData.surface_unit_ids?.includes(parseInt(s.id)))}
          onSelectionChange={(items) => updateFormData('surface_unit_ids', items.map(i => parseInt(i.id)))}
          multiSelect
          searchable
          hint="Sélectionnez les planches ou surfaces spécifiques"
        />
      </FormSection>

      <FormSection>
        {/* Quantité */}
        <View style={{
          backgroundColor: colors.gray[50],
          padding: spacing.md,
          borderRadius: 12,
          marginBottom: spacing.md,
        }}>
          <Text variant="body" style={{ 
            marginBottom: spacing.sm,
            fontWeight: '600',
            color: colors.text.primary 
          }}>
            Quantité
          </Text>
          <RowFields>
            <View style={{ flex: 1 }}>
              <EnhancedInput
                label="Valeur"
                placeholder="Ex: 15"
                value={formData.quantity_value || ''}
                onChangeText={(value) => updateFormData('quantity_value', value)}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <DropdownSelector
                label="Unité"
                placeholder="kg, caisse..."
                items={COMMON_UNITS}
                selectedItems={COMMON_UNITS.filter(u => u.id === formData.quantity_unit)}
                onSelectionChange={(items) => updateFormData('quantity_unit', items[0]?.id || 'kg')}
              />
            </View>
          </RowFields>
        </View>

        {/* Conversion (optionnelle) */}
        {formData.quantity_value && formData.quantity_unit !== 'kg' && (
          <View style={{
            backgroundColor: colors.success[50],
            padding: spacing.md,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.success[200],
            marginBottom: spacing.md,
          }}>
            <Text variant="body" style={{ 
              marginBottom: spacing.sm,
              fontWeight: '600',
              color: colors.success[700] 
            }}>
              Conversion (optionnel)
            </Text>
            <RowFields>
              <View style={{ flex: 1 }}>
                <EnhancedInput
                  label="Valeur convertie"
                  placeholder="Ex: 75"
                  value={formData.converted_value || ''}
                  onChangeText={(value) => updateFormData('converted_value', value)}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <DropdownSelector
                  label="Unité"
                  placeholder="kg, litre..."
                  items={COMMON_UNITS}
                  selectedItems={COMMON_UNITS.filter(u => u.id === formData.converted_unit)}
                  onSelectionChange={(items) => updateFormData('converted_unit', items[0]?.id || 'kg')}
                />
              </View>
            </RowFields>
            {formData.quantity_value && formData.converted_value && (
              <Text variant="caption" style={{ marginTop: spacing.sm, color: colors.success[600] }}>
                {formData.quantity_value} {formData.quantity_unit} = {formData.converted_value} {formData.converted_unit}
              </Text>
            )}
          </View>
        )}

        {/* Matériel */}
        <DropdownSelector
          label="Matériel utilisé"
          placeholder="Sélectionner le matériel"
          items={materials}
          selectedItems={materials.filter(m => formData.material_ids?.includes(parseInt(m.id)))}
          onSelectionChange={(items) => updateFormData('material_ids', items.map(i => parseInt(i.id)))}
          multiSelect
          searchable
          categories={MATERIAL_CATEGORIES.map(cat => cat.id)}
          hint="Sélectionnez le matériel utilisé pour cette tâche"
        />
      </FormSection>

      <FormSection 
        title="Informations complémentaires"
      >
        <EnhancedInput
          label="Notes"
          placeholder="Observations, remarques..."
          value={formData.notes || ''}
          onChangeText={(value) => updateFormData('notes', value)}
          multiline
          numberOfLines={3}
        />

        <PhotoPicker
          photos={attachedPhotos}
          onPhotosChange={setAttachedPhotos}
          maxPhotos={5}
        />

        {/* Bouton de suppression pour les tâches existantes */}
        {task && onDelete && (
          <View style={{ marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border.primary }}>
            <Button
              title="Supprimer cette tâche"
              variant="danger"
              onPress={handleDelete}
            />
          </View>
        )}
      </FormSection>
    </StandardFormModal>
  );
};
