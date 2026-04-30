import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Modal, Text, Input, Button, DatePicker } from '../../design-system/components';
import { DropdownSelector, DropdownItem } from '../../design-system/components/DropdownSelector';
import { CultureDropdownSelector, CultureDropdownItem } from '../../design-system/components/CultureDropdownSelector';
import { colors } from '../../design-system/colors';
import { spacing } from '../../design-system/spacing';
import { useFarm } from '../../contexts/FarmContext';
import { useAuth } from '../../contexts/AuthContext';
import { PhytosanitaryProductService } from '../../services/PhytosanitaryProductService';
import { DirectSupabaseService } from '../../services/DirectSupabaseService';
import { cultureService } from '../../services/CultureService';
import { farmMemberService } from '../../services/FarmMemberService';
import { ActionData } from './AIResponseWithActions';
import { parseISODate, formatToISODate } from '../../utils/dateUtils';
import { ActionAttachmentsSection } from '../attachments/ActionAttachmentsSection';

// Types d'actions disponibles
const ACTION_TYPES: DropdownItem[] = [
  { id: 'harvest', label: 'Récolte', type: 'production', color: '#10b981' },
  { id: 'task_done', label: 'Tâche effectuée', type: 'production', color: '#3b82f6' },
  { id: 'task_planned', label: 'Tâche planifiée', type: 'production', color: '#8b5cf6' },
  { id: 'observation', label: 'Observation', type: 'production', color: '#f59e0b' },
  { id: 'help', label: 'Aide', type: 'autre', color: '#6b7280' },
];

// Actions standard — codes alignés avec task_standard_actions (DB)
const COMMON_ACTIONS: DropdownItem[] = [
  { id: 'recolter', label: 'Récolter', category: 'production', color: '#10b981' },
  { id: 'cueillir', label: 'Cueillir', category: 'production', color: '#059669' },
  { id: 'planter', label: 'Planter', category: 'production', color: '#22c55e' },
  { id: 'semer', label: 'Semer', category: 'production', color: '#16a34a' },
  { id: 'labourer', label: 'Labourer', category: 'production', color: '#7c3aed' },
  { id: 'fraiser', label: 'Fraiser / préparer sol', category: 'production', color: '#6d28d9' },
  { id: 'desherber', label: 'Désherber', category: 'production', color: '#eab308' },
  { id: 'biner', label: 'Biner', category: 'production', color: '#ca8a04' },
  { id: 'butter', label: 'Butter', category: 'production', color: '#a16207' },
  { id: 'tailler', label: 'Tailler', category: 'production', color: '#92400e' },
  { id: 'eclaircir', label: 'Éclaircir', category: 'production', color: '#78350f' },
  { id: 'attacher', label: 'Attacher / tuteurer', category: 'production', color: '#713f12' },
  { id: 'arroser', label: 'Arroser', category: 'production', color: '#0ea5e9' },
  { id: 'irriguer', label: 'Irriguer', category: 'production', color: '#0284c7' },
  { id: 'traiter', label: 'Traiter', category: 'production', color: '#dc2626' },
  { id: 'fertiliser', label: 'Fertiliser', category: 'production', color: '#15803d' },
  { id: 'amender', label: 'Amender le sol', category: 'production', color: '#166534' },
  { id: 'mulcher', label: 'Pailler / mulcher', category: 'production', color: '#14532d' },
  { id: 'ouvrir_serre', label: 'Ouvrir la serre', category: 'production', color: '#0891b2' },
  { id: 'fermer_serre', label: 'Fermer la serre', category: 'production', color: '#0e7490' },
  { id: 'installer', label: 'Installer / poser', category: 'production', color: '#155e75' },
  { id: 'retirer', label: 'Retirer / enlever', category: 'production', color: '#164e63' },
  { id: 'nettoyer', label: 'Nettoyer', category: 'production', color: '#06b6d4' },
  { id: 'trier', label: 'Trier', category: 'production', color: '#0891b2' },
  { id: 'composter', label: 'Composter', category: 'production', color: '#047857' },
  { id: 'nourrir', label: 'Nourrir', category: 'production', color: '#f59e0b' },
  { id: 'soigner', label: 'Soigner', category: 'production', color: '#d97706' },
  { id: 'recolter_oeufs', label: 'Ramasser les oeufs', category: 'production', color: '#b45309' },
  { id: 'tondre', label: 'Tondre', category: 'production', color: '#92400e' },
  { id: 'faucher', label: 'Faucher', category: 'production', color: '#78350f' },
  { id: 'preparer_commande', label: 'Préparer les commandes', category: 'commercialisation', color: '#8b5cf6' },
  { id: 'livrer', label: 'Livrer', category: 'commercialisation', color: '#7c3aed' },
  { id: 'vendre', label: 'Vendre', category: 'commercialisation', color: '#6d28d9' },
  { id: 'conditionner', label: 'Conditionner', category: 'commercialisation', color: '#5b21b6' },
  { id: 'facturer', label: 'Facturer', category: 'administratif', color: '#3b82f6' },
  { id: 'inventorier', label: 'Inventorier', category: 'administratif', color: '#2563eb' },
  { id: 'declarer', label: 'Déclarer', category: 'administratif', color: '#1d4ed8' },
  { id: 'planifier', label: 'Planifier', category: 'administratif', color: '#1e40af' },
  { id: 'reparer', label: 'Réparer', category: 'general', color: '#6b7280' },
  { id: 'entretenir', label: 'Entretenir', category: 'general', color: '#4b5563' },
  { id: 'transporter', label: 'Transporter', category: 'general', color: '#374151' },
  { id: 'surveiller', label: 'Surveiller', category: 'general', color: '#1f2937' },
  { id: 'autre', label: 'Autre', category: 'general', color: '#9ca3af' },
];

// Cultures communes disponibles
const COMMON_CROPS: DropdownItem[] = [
  // Légumes feuilles
  { id: 'laitue', label: 'Laitue', type: 'legumes_feuilles', category: 'legumes_feuilles', color: '#22c55e' },
  { id: 'epinard', label: 'Épinard', type: 'legumes_feuilles', category: 'legumes_feuilles', color: '#22c55e' },
  { id: 'roquette', label: 'Roquette', type: 'legumes_feuilles', category: 'legumes_feuilles', color: '#22c55e' },
  { id: 'mache', label: 'Mâche', type: 'legumes_feuilles', category: 'legumes_feuilles', color: '#22c55e' },
  { id: 'chou', label: 'Chou', type: 'legumes_feuilles', category: 'legumes_feuilles', color: '#22c55e' },
  
  // Légumes fruits
  { id: 'tomate', label: 'Tomate', type: 'legumes_fruits', category: 'legumes_fruits', color: '#ef4444' },
  { id: 'courgette', label: 'Courgette', type: 'legumes_fruits', category: 'legumes_fruits', color: '#22c55e' },
  { id: 'aubergine', label: 'Aubergine', type: 'legumes_fruits', category: 'legumes_fruits', color: '#8b5cf6' },
  { id: 'poivron', label: 'Poivron', type: 'legumes_fruits', category: 'legumes_fruits', color: '#f59e0b' },
  { id: 'concombre', label: 'Concombre', type: 'legumes_fruits', category: 'legumes_fruits', color: '#22c55e' },
  
  // Légumes racines
  { id: 'carotte', label: 'Carotte', type: 'legumes_racines', category: 'legumes_racines', color: '#f97316' },
  { id: 'radis', label: 'Radis', type: 'legumes_racines', category: 'legumes_racines', color: '#ef4444' },
  { id: 'betterave', label: 'Betterave', type: 'legumes_racines', category: 'legumes_racines', color: '#dc2626' },
  { id: 'navet', label: 'Navet', type: 'legumes_racines', category: 'legumes_racines', color: '#f3f4f6' },
  { id: 'pomme_de_terre', label: 'Pomme de terre', type: 'legumes_racines', category: 'legumes_racines', color: '#a3a3a3' },
  
  // Légumineuses
  { id: 'haricot_vert', label: 'Haricot vert', type: 'legumineuses', category: 'legumineuses', color: '#22c55e' },
  { id: 'petit_pois', label: 'Petit pois', type: 'legumineuses', category: 'legumineuses', color: '#22c55e' },
  { id: 'feve', label: 'Fève', type: 'legumineuses', category: 'legumineuses', color: '#22c55e' },
  
  // Aromates
  { id: 'basilic', label: 'Basilic', type: 'aromates', category: 'aromates', color: '#22c55e' },
  { id: 'persil', label: 'Persil', type: 'aromates', category: 'aromates', color: '#22c55e' },
  { id: 'ciboulette', label: 'Ciboulette', type: 'aromates', category: 'aromates', color: '#22c55e' },
  { id: 'thym', label: 'Thym', type: 'aromates', category: 'aromates', color: '#22c55e' },
  { id: 'romarin', label: 'Romarin', type: 'aromates', category: 'aromates', color: '#22c55e' },
];

// Catégories pour observations
const OBSERVATION_CATEGORIES: DropdownItem[] = [
  { id: 'ravageurs', label: 'Ravageurs', color: '#ef4444' },
  { id: 'maladies', label: 'Maladies', color: '#f97316' },
  { id: 'physiologique', label: 'Physiologique', color: '#eab308' },
  { id: 'meteo', label: 'Météo', color: '#0ea5e9' },
  { id: 'autre', label: 'Autre', color: '#6b7280' },
];

// Unités courantes
const COMMON_UNITS: DropdownItem[] = [
  { id: 'kg', label: 'kg' },
  { id: 'g', label: 'g' },
  { id: 'tonnes', label: 'tonnes' },
  { id: 'unites', label: 'unités' },
  { id: 'bottes', label: 'bottes' },
  { id: 'caisses', label: 'caisses' },
  { id: 'cagettes', label: 'cagettes' },
  { id: 'barquettes', label: 'barquettes' },
  { id: 'sacs', label: 'sacs' },
  { id: 'litres', label: 'litres' },
];

// Unités de durée
const DURATION_UNITS: DropdownItem[] = [
  { id: 'minutes', label: 'minutes' },
  { id: 'heures', label: 'heures' },
];

// Types de quantité
const QUANTITY_TYPES: DropdownItem[] = [
  { id: 'engrais', label: 'Engrais', color: '#22c55e' },
  { id: 'produit_phyto', label: 'Produit phytosanitaire', color: '#f59e0b' },
  { id: 'recolte', label: 'Récolte', color: '#3b82f6' },
  { id: 'plantation', label: 'Plantation', color: '#10b981' },
  { id: 'vente', label: 'Vente', color: '#8b5cf6' },
  { id: 'autre', label: 'Autre', color: '#6b7280' },
];

interface ActionEditModalProps {
  visible: boolean;
  onClose: () => void;
  action: ActionData | null;
  onSave: (updatedAction: ActionData) => void;
}

interface FormData {
  action_type: string;
  action_verb: string;
  standard_action: string;
  crop: string;
  plot_ids: number[];
  surface_unit_ids: number[];
  material_ids: number[];
  // Quantité utilisateur (ex: 3 caisses)
  quantity_value: string;
  quantity_unit: string;
  quantity_type: string;    // Type de quantité (engrais, produit_phyto, etc.)
  quantity_nature: string;  // Nature de la quantité (compost, bouillie, etc.)
  // Quantité convertie/universelle (ex: 15 kg)
  converted_value: string;
  converted_unit: string;
  // Temps
  duration_value: string;
  duration_unit: string;
  number_of_people: string;
  // Date/heure
  date: Date;
  time: string;
  // Observation
  issue: string;
  category: string;
  // Notes
  notes: string;
}

export const ActionEditModal: React.FC<ActionEditModalProps> = ({
  visible,
  onClose,
  action,
  onSave,
}) => {
  const { activeFarm } = useFarm();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Données pour les dropdowns
  const [plots, setPlots] = useState<DropdownItem[]>([]);
  const [surfaceUnits, setSurfaceUnits] = useState<DropdownItem[]>([]);
  const [materials, setMaterials] = useState<DropdownItem[]>([]);
  const [farmMembers, setFarmMembers] = useState<DropdownItem[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isPeopleManuallyEdited, setIsPeopleManuallyEdited] = useState(false);
  
  // Culture sélectionnée
  const [selectedCulture, setSelectedCulture] = useState<CultureDropdownItem | null>(null);
  
  // État pour le nom du produit phytosanitaire (affichage)
  const [productDisplayName, setProductDisplayName] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState<FormData>({
    action_type: 'task_done',
    action_verb: '',
    standard_action: '',
    crop: '',
    plot_ids: [],
    surface_unit_ids: [],
    material_ids: [],
    quantity_value: '',
    quantity_unit: 'kg',
    quantity_type: '',
    quantity_nature: '',
    converted_value: '',
    converted_unit: 'kg',
    duration_value: '',
    duration_unit: 'minutes',
    number_of_people: '1',
    date: new Date(),
    time: '',
    issue: '',
    category: '',
    notes: '',
  });

  // Fonction pour valider et convertir les dates
  const validateDate = (dateStr: string): string => {
    if (!dateStr) {
      return new Date().toISOString().split('T')[0];
    }
    
    // Si c'est déjà au format ISO, vérifier la validité
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const testDate = new Date(dateStr);
      if (!isNaN(testDate.getTime())) {
        return dateStr;
      }
    }
    
    // Conversion des termes relatifs français
    const today = new Date();
    const lowerDate = dateStr.toLowerCase().trim();
    
    switch (lowerDate) {
      case 'aujourd\'hui':
      case 'aujourdhui':
      case 'ce matin':
      case 'cet après-midi':
      case 'cet apres-midi':
      case 'ce soir':
        return today.toISOString().split('T')[0];
        
      case 'hier':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
        
      case 'demain':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
        
      default:
        console.warn(`⚠️ [ActionEditModal] Date invalide: "${dateStr}" → utilisation d'aujourd'hui`);
        return today.toISOString().split('T')[0];
    }
  };

  // Charger les données de la ferme
  useEffect(() => {
    console.log('🔍 [ActionEditModal] useEffect loadFarmData:', { visible, farmId: activeFarm?.farm_id });
    if (visible && activeFarm?.farm_id) {
      loadFarmData();
    }
  }, [visible, activeFarm?.farm_id]);

  // Fonction pour normaliser la culture (gérer pluriel/singulier)
  const normalizeCrop = (cropName: string): string => {
    if (!cropName) return '';
    
    const normalized = cropName.toLowerCase().trim();
    
    // Chercher une correspondance exacte d'abord (id ou label)
    const exactMatch = COMMON_CROPS.find(c => 
      c.id === normalized || c.label.toLowerCase() === normalized
    );
    if (exactMatch) return exactMatch.id;
    
    // Essayer de matcher avec le pluriel/singulier
    const singularMatch = COMMON_CROPS.find(c => {
      const cropId = c.id.toLowerCase();
      const cropLabel = c.label.toLowerCase();
      
      // Essayer avec 's' à la fin (tomates -> tomate)
      if (normalized.endsWith('s') && normalized.slice(0, -1) === cropId) return true;
      if (normalized.endsWith('s') && normalized.slice(0, -1) === cropLabel) return true;
      
      // Essayer avec 'x' à la fin (choux -> chou)
      if (normalized.endsWith('x') && normalized.slice(0, -1) === cropId) return true;
      
      // L'inverse (tomate -> tomates)
      if (cropId.endsWith('s') && cropId.slice(0, -1) === normalized) return true;
      
      return false;
    });
    
    if (singularMatch) return singularMatch.id;
    
    // Retourner la valeur originale si aucune correspondance
    return cropName;
  };

  // Fonction pour trouver une culture par nom
  const findCultureByName = async (cropName: string): Promise<CultureDropdownItem | null> => {
    if (!cropName || !activeFarm?.farm_id) return null;
    
    try {
      const cultures = await cultureService.getCulturesForUser(user?.id || '', activeFarm.farm_id);
      const normalizedName = cropName.toLowerCase().trim();
      
      // Chercher une correspondance exacte
      const exactMatch = cultures.find(c => 
        c.name.toLowerCase() === normalizedName
      );
      
      if (exactMatch) {
        return {
          id: `culture-${exactMatch.id}`,
          label: exactMatch.name,
          type: 'culture',
          culture: exactMatch,
          cultureType: exactMatch.type,
        };
      }
      
      // Chercher une correspondance partielle (pour gérer pluriel/singulier)
      const partialMatch = cultures.find(c => {
        const cultureName = c.name.toLowerCase();
        // Correspondance exacte
        if (cultureName === normalizedName) return true;
        // Pluriel -> singulier (tomates -> tomate)
        if (normalizedName.endsWith('s') && normalizedName.slice(0, -1) === cultureName) return true;
        if (cultureName.endsWith('s') && cultureName.slice(0, -1) === normalizedName) return true;
        // Pluriel en 'x' (choux -> chou)
        if (normalizedName.endsWith('x') && normalizedName.slice(0, -1) === cultureName) return true;
        if (cultureName.endsWith('x') && cultureName.slice(0, -1) === normalizedName) return true;
        return false;
      });
      
      if (partialMatch) {
        return {
          id: `culture-${partialMatch.id}`,
          label: partialMatch.name,
          type: 'culture',
          culture: partialMatch,
          cultureType: partialMatch.type,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de la recherche de culture:', error);
      return null;
    }
  };

  // Initialiser le formulaire avec les données de l'action
  useEffect(() => {
    if (action && visible && activeFarm?.farm_id) {
      const data = action.extracted_data || {};
      const entities = action.matched_entities || {};
      const initialMatchedMemberIds = Array.isArray((data as any).matched_member_ids)
        ? ((data as any).matched_member_ids as string[]).filter(Boolean)
        : [];
      
      const cropValue = data.crop || data.crops?.[0] || '';
      const normalizedCrop = normalizeCrop(cropValue);
      
      // Fonction async pour charger le nom du produit phytosanitaire
      const loadProductName = async () => {
        let initialProductName = data.quantity_nature || '';
        
        // Charger le nom du produit phytosanitaire si AMM présent dans l'action originale
        // (vient de la tâche convertie)
        if ((action as any).phytosanitary_product_amm) {
          try {
            const product = await PhytosanitaryProductService.getProductByAMM(
              (action as any).phytosanitary_product_amm
            );
            if (product) {
              initialProductName = product.name;
              setProductDisplayName(product.name);
            }
          } catch (error) {
            console.warn('⚠️ [ActionEditModal] Erreur chargement produit:', error);
            setProductDisplayName(data.quantity_nature || null);
          }
        } else {
          setProductDisplayName(data.quantity_nature || null);
        }
        
        // Mettre à jour le formulaire avec le nom du produit
        setFormData(prev => ({
          ...prev,
          quantity_nature: initialProductName,
        }));
      };
      
      // Initialiser le formulaire de base
      setFormData({
        action_type: action.action_type || 'task_done',
        action_verb: data.action || '',
        standard_action: data.standard_action || '',
        crop: normalizedCrop,
        plot_ids: entities.plot_ids || [],
        surface_unit_ids: entities.surface_unit_ids || [],
        material_ids: entities.material_ids || [],
        quantity_value: data.quantity?.value?.toString() || '',
        quantity_unit: data.quantity?.unit || 'kg',
        quantity_type: data.quantity_type || '',
        quantity_nature: data.quantity_nature || '', // Sera mis à jour par loadProductName
        converted_value: data.quantity_converted?.value?.toString() || '',
        converted_unit: data.quantity_converted?.unit || 'kg',
        duration_value: data.duration?.value?.toString() || '',
        duration_unit: data.duration?.unit || 'minutes',
        number_of_people: (data.number_of_people || 1).toString(),
        date: (() => {
          const parsedDate = parseISODate(data.date);
          if (parsedDate) {
            console.log(`📅 [ActionEditModal] Date initialisée depuis extracted_data.date: ${data.date} → ${parsedDate.toISOString().split('T')[0]}`);
            return parsedDate;
          } else {
            console.log(`⚠️ [ActionEditModal] Date non disponible dans extracted_data.date, utilisation date d'aujourd'hui`);
            return new Date();
          }
        })(),
        time: data.time || '',
        issue: data.issue || '',
        category: data.category || '',
        notes: data.notes || '',
      });
      setSelectedMemberIds(initialMatchedMemberIds);
      setIsPeopleManuallyEdited(
        typeof data.number_of_people === 'number' &&
        data.number_of_people > 0 &&
        data.number_of_people !== initialMatchedMemberIds.length
      );
      
      // Charger le nom du produit de manière asynchrone
      loadProductName();
      
      // Charger la culture correspondante
      if (cropValue) {
        findCultureByName(cropValue).then(culture => {
          setSelectedCulture(culture);
        });
      } else {
        setSelectedCulture(null);
      }
    } else if (!action && visible) {
      // Réinitialiser si pas d'action
      setSelectedCulture(null);
      setSelectedMemberIds([]);
      setIsPeopleManuallyEdited(false);
    }
  }, [action, visible, activeFarm?.farm_id]);

  useEffect(() => {
    if (isPeopleManuallyEdited) return;
    if (selectedMemberIds.length === 0) return;
    setFormData((prev) => ({ ...prev, number_of_people: String(selectedMemberIds.length) }));
  }, [selectedMemberIds, isPeopleManuallyEdited]);

  const loadFarmData = async () => {
    if (!activeFarm?.farm_id) {
      console.log('❌ [ActionEditModal] Pas de farm_id:', activeFarm);
      return;
    }
    setIsLoading(true);

    try {
      console.log('🔄 [ActionEditModal] Chargement des données de la ferme:', activeFarm.farm_id);

      // Charger les parcelles
      const plotsResult = await DirectSupabaseService.directSelect(
        'plots',
        'id, name, code, type',
        [{ column: 'farm_id', value: activeFarm.farm_id }, { column: 'is_active', value: true }]
      );
      
      if (!plotsResult.error && plotsResult.data) {
        const plotsData = plotsResult.data.map((p: any) => ({
          id: p.id.toString(),
          label: p.name,
          type: p.type,
          description: p.code,
        }));
        setPlots(plotsData);
        console.log('✅ [ActionEditModal] Parcelles chargées:', plotsData.length);
      } else {
        console.error('❌ [ActionEditModal] Erreur chargement parcelles:', plotsResult.error);
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
        console.log('✅ [ActionEditModal] Planches chargées:', surfaceData.length);
      } else {
        console.error('❌ [ActionEditModal] Erreur chargement planches:', surfaceResult.error);
        setSurfaceUnits([]);
      }

      // Charger le matériel
      const materialsResult = await DirectSupabaseService.directSelect(
        'materials',
        'id, name, category, brand, model',
        [{ column: 'farm_id', value: activeFarm.farm_id }, { column: 'is_active', value: true }]
      );
      if (!materialsResult.error && materialsResult.data) {
        setMaterials(materialsResult.data.map((m: any) => ({
          id: m.id.toString(),
          label: m.name,
          type: m.category,
          category: m.category,
          description: m.brand ? `${m.brand} ${m.model || ''}`.trim() : undefined,
        })));
      }

      const membersData = await farmMemberService.getFarmMembers(activeFarm.farm_id);
      const memberItems: DropdownItem[] = membersData.map((member) => ({
        id: member.userId,
        label: member.user?.firstName || member.user?.email || member.userId,
        type: member.role,
        description: member.role,
      }));
      setFarmMembers(memberItems);
    } catch (error) {
      console.error('❌ [ActionEditModal] Erreur chargement données ferme:', error);
      setPlots([]);
      setSurfaceUnits([]);
      setMaterials([]);
      setFarmMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calcul automatique du temps total
  const calculateTotalWorkTime = () => {
    const duration = parseFloat(formData.duration_value) || 0;
    const people = parseInt(formData.number_of_people) || 1;
    return duration * people;
  };

  const handleDelete = async () => {
    if (!action?.id) return;
    
    Alert.alert(
      'Supprimer l\'action',
      'Êtes-vous sûr de vouloir supprimer cette action ? Cette opération ne peut pas être annulée.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              // Soft delete: marquer comme supprimée
              await DirectSupabaseService.directUpdate(
                'chat_analyzed_actions',
                { user_status: 'deleted' },
                [{ column: 'id', value: action.id }]
              );
              console.log('✅ [DELETE] Action supprimée:', action.id);
              Alert.alert('Action supprimée', 'L\'action a été supprimée avec succès.');
              onClose();
            } catch (error: any) {
              console.error('❌ [DELETE] Erreur:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'action');
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!action) return;
    setIsSaving(true);

    try {
      console.log('💾 [ACTION-EDIT] Sauvegarde action:', action.id);
      console.log('📝 [ACTION-EDIT] Données formulaire:', formData);
      
      // Convertir l'id de culture en label pour le backend
      const getCropLabel = (): string => {
        // Utiliser la culture sélectionnée si disponible
        if (selectedCulture) {
          return selectedCulture.culture?.name || selectedCulture.label || '';
        }
        // Fallback sur formData.crop (pour compatibilité avec anciennes données)
        if (formData.crop) {
          return formData.crop;
        }
        return '';
      };
      
      // Convertir la date en string YYYY-MM-DD
      const getDateString = (): string | undefined => {
        return formatToISODate(formData.date);
      };
      
      const updatedAction: ActionData = {
        ...action,
        action_type: formData.action_type as ActionData['action_type'],
        extracted_data: {
          ...(formData.action_verb ? { action: formData.action_verb } : {}),
          ...(formData.standard_action ? { standard_action: formData.standard_action } : {}),
          ...(getCropLabel() ? { crop: getCropLabel().toLowerCase() } : {}),
          plots: formData.plot_ids.length > 0 
            ? plots.filter(p => formData.plot_ids.includes(parseInt(p.id))).map(p => p.label)
            : [],
          quantity: formData.quantity_value 
            ? { value: parseFloat(formData.quantity_value), unit: formData.quantity_unit }
            : undefined,
          quantity_type: formData.quantity_type || undefined,
          quantity_nature: formData.quantity_nature || undefined,
          quantity_converted: formData.converted_value
            ? { value: parseFloat(formData.converted_value), unit: formData.converted_unit }
            : undefined,
          duration: formData.duration_value
            ? { value: parseFloat(formData.duration_value), unit: formData.duration_unit }
            : undefined,
          number_of_people: selectedMemberIds.length > 0 && !isPeopleManuallyEdited
            ? selectedMemberIds.length
            : (parseInt(formData.number_of_people) || 1),
          matched_member_ids: selectedMemberIds,
          total_work_time: formData.duration_value
            ? { value: calculateTotalWorkTime(), unit: formData.duration_unit }
            : undefined,
          date: getDateString(),
          time: formData.time || undefined,
          issue: formData.issue || undefined,
          category: formData.category || undefined,
          notes: formData.notes || undefined,
        },
        matched_entities: {
          plot_ids: formData.plot_ids,
          surface_unit_ids: formData.surface_unit_ids,
          material_ids: formData.material_ids,
        },
      };

      console.log('✅ [ACTION-EDIT] Action mise à jour:', updatedAction);
      onSave(updatedAction);
      onClose();
    } catch (error) {
      console.error('❌ [ACTION-EDIT] Erreur sauvegarde action:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const isObservation = formData.action_type === 'observation';
  const attachmentRecordType = isObservation ? 'observation' : 'task';
  const attachmentRecordId = (action as any)?.record_id || action?.id || null;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Modifier l'action"
      size="fullscreen"
      primaryAction={{
        title: 'Sauvegarder',
        onPress: handleSave,
        loading: isSaving,
        disabled: !formData.action_type,
      }}
      secondaryAction={{
        title: 'Annuler',
        onPress: onClose,
      }}
    >
      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={{ gap: spacing.lg, paddingBottom: 100 }}>
          
          {/* Badge informatif */}
          <View style={{
            backgroundColor: colors.primary[50],
            borderRadius: 8,
            padding: spacing.md,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary[600],
          }}>
            <Text variant="body" style={{ color: colors.primary[700], fontWeight: '600' }}>
              Modifiez les données extraites par l'IA avant de valider
            </Text>
            {action?.confidence && (
              <Text variant="caption" style={{ color: colors.primary[600], marginTop: 4 }}>
                Confiance IA : {(action.confidence * 100).toFixed(0)}%
              </Text>
            )}
          </View>

          {/* Section Type d'action */}
          <View>
            <Text variant="h3" style={{ 
              color: colors.text.primary,
              marginBottom: spacing.md,
              fontSize: 18,
              fontWeight: '600'
            }}>
              Type d'action
            </Text>
            
            <DropdownSelector
              label="Type"
              placeholder="Sélectionner le type"
              items={ACTION_TYPES}
              selectedItems={ACTION_TYPES.filter(t => t.id === formData.action_type)}
              onSelectionChange={(items) => updateFormData('action_type', items[0]?.id || 'task_done')}
              required
            />
            
            <Input
              label="Action"
              placeholder="Ex: récolter, planter, désherber..."
              value={formData.action_verb}
              onChangeText={(value) => updateFormData('action_verb', value)}
              hint="Verbe décrivant l'action effectuée"
            />

            {formData.action_type !== 'observation' && (
              <DropdownSelector
                label="Action standard"
                placeholder="Sélectionner une action standard..."
                items={COMMON_ACTIONS}
                selectedItems={formData.standard_action
                  ? COMMON_ACTIONS.filter(item => item.id === formData.standard_action)
                  : []}
                onSelectionChange={(items) => updateFormData('standard_action', items[0]?.id || '')}
                searchable
                filterable
                hint="Liste normalisée des actions (recherche incluse)"
              />
            )}
          </View>

          {/* Section Temps de travail */}
          <View>
            <Text variant="h3" style={{ 
              color: colors.text.primary,
              marginBottom: spacing.md,
              fontSize: 18,
              fontWeight: '600'
            }}>
              Temps de travail
            </Text>
            
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Durée"
                  placeholder="Ex: 45"
                  value={formData.duration_value}
                  onChangeText={(value) => updateFormData('duration_value', value)}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <DropdownSelector
                  label="Unité"
                  placeholder="unité"
                  items={DURATION_UNITS}
                  selectedItems={DURATION_UNITS.filter(u => u.id === formData.duration_unit)}
                  onSelectionChange={(items) => updateFormData('duration_unit', items[0]?.id || 'minutes')}
                />
              </View>
            </View>
            
            <Input
              label="Nombre de personnes"
              placeholder="Ex: 2"
              value={formData.number_of_people}
              onChangeText={(value) => {
                setIsPeopleManuallyEdited(true);
                updateFormData('number_of_people', value);
              }}
              keyboardType="numeric"
              hint="Incluez vous-même dans le compte"
            />

            <DropdownSelector
              label="Membres de la ferme"
              placeholder="Sélectionner les membres concernés"
              items={farmMembers}
              selectedItems={farmMembers.filter((member) => selectedMemberIds.includes(member.id))}
              onSelectionChange={(items) => {
                const ids = items.map((item) => item.id);
                setSelectedMemberIds(ids);
              }}
              multiSelect
              searchable
              hint="Associe des profils à la tâche pour le suivi personnel"
            />

            {/* Affichage du temps total calculé */}
            {formData.duration_value && parseInt(formData.number_of_people) > 0 && (
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
                  <Text variant="label" style={{ color: colors.primary[700] }}>
                    Temps total de travail
                  </Text>
                  <Text variant="body" style={{ color: colors.primary[800], fontWeight: '600' }}>
                    {calculateTotalWorkTime()} {formData.duration_unit}
                  </Text>
                  <Text variant="caption" style={{ color: colors.primary[600] }}>
                    ({formData.duration_value} {formData.duration_unit} × {formData.number_of_people} personne{parseInt(formData.number_of_people) > 1 ? 's' : ''})
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Section Culture et Localisation */}
          <View>
            <Text variant="h3" style={{ 
              color: colors.text.primary,
              marginBottom: spacing.md,
              fontSize: 18,
              fontWeight: '600'
            }}>
              Culture et Localisation
            </Text>
            
            <CultureDropdownSelector
              label="Culture"
              placeholder="Sélectionner une culture"
              selectedItem={selectedCulture}
              onSelectionChange={(item) => {
                setSelectedCulture(item);
                // Stocker le nom de la culture pour compatibilité
                updateFormData('crop', item?.culture?.name || item?.label || '');
              }}
              farmId={activeFarm?.farm_id}
              allowVarieties={false}
              searchable={true}
              useUserPreferences={true}
              onAddCulture={async () => {
                // Permettre la création d'une nouvelle culture
                // Pour l'instant, on stocke juste le nom
                if (selectedCulture?.label) {
                  updateFormData('crop', selectedCulture.label.toLowerCase());
                }
              }}
              hint="Tapez pour rechercher ou ajouter une nouvelle culture"
            />
            
            <DropdownSelector
              label="Parcelle(s)"
              placeholder="Sélectionner les parcelles"
              items={plots}
              selectedItems={plots.filter(p => formData.plot_ids.includes(parseInt(p.id)))}
              onSelectionChange={(items) => updateFormData('plot_ids', items.map(i => parseInt(i.id)))}
              multiSelect
              searchable
            />
            
            <DropdownSelector
              label="Planche(s) / Surface(s)"
              placeholder="Sélectionner les planches"
              items={surfaceUnits}
              selectedItems={surfaceUnits.filter(s => formData.surface_unit_ids.includes(parseInt(s.id)))}
              onSelectionChange={(items) => updateFormData('surface_unit_ids', items.map(i => parseInt(i.id)))}
              multiSelect
              searchable
            />
          </View>

          {/* Section Détails de l'observation - Affichée uniquement si type = observation */}
          {formData.action_type === 'observation' && (
            <View>
              <Text variant="h3" style={{ 
                color: colors.text.primary,
                marginBottom: spacing.md,
                fontSize: 18,
                fontWeight: '600'
              }}>
                Détails de l'observation
              </Text>
              
              <DropdownSelector
                label="Catégorie"
                placeholder="Type de problème"
                items={OBSERVATION_CATEGORIES}
                selectedItems={OBSERVATION_CATEGORIES.filter(c => c.id === formData.category)}
                onSelectionChange={(items) => updateFormData('category', items[0]?.id || '')}
              />
              
              <Input
                label="Problème observé"
                placeholder="Ex: pucerons, mildiou, carence..."
                value={formData.issue}
                onChangeText={(value) => updateFormData('issue', value)}
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {/* Section Quantité et Conversion */}
          <View>
            <Text variant="h3" style={{ 
              color: colors.text.primary,
              marginBottom: spacing.md,
              fontSize: 18,
              fontWeight: '600'
            }}>
              Quantité
            </Text>
            
            {/* Quantité utilisateur */}
            <View style={{
              backgroundColor: colors.gray[50],
              padding: spacing.md,
              borderRadius: 12,
              marginBottom: spacing.md,
            }}>
              <Text variant="label" style={{ marginBottom: spacing.sm, color: colors.text.secondary }}>
                Unité utilisateur
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Valeur"
                    placeholder="Ex: 3"
                    value={formData.quantity_value}
                    onChangeText={(value) => updateFormData('quantity_value', value)}
                    keyboardType="numeric"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <DropdownSelector
                    label="Unité"
                    placeholder="unité"
                    items={COMMON_UNITS}
                    selectedItems={COMMON_UNITS.filter(u => u.id === formData.quantity_unit)}
                    onSelectionChange={(items) => updateFormData('quantity_unit', items[0]?.id || 'kg')}
                    inlineSearch={true}
                    onAddNew={(label) => {
                      // Ajouter une unité personnalisée
                      if (label && label.trim()) {
                        updateFormData('quantity_unit', label.trim().toLowerCase());
                      }
                    }}
                    style={{ marginBottom: 0 }}
                  />
                </View>
              </View>
              
              {/* Type et Nature de la quantité */}
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <DropdownSelector
                    label="Type"
                    placeholder="Sélectionner le type"
                    items={QUANTITY_TYPES}
                    selectedItems={QUANTITY_TYPES.filter(t => t.id === formData.quantity_type)}
                    onSelectionChange={(items) => updateFormData('quantity_type', items[0]?.id || '')}
                    hint="Type de quantité (optionnel)"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Nature"
                    placeholder="Ex: compost, bouillie..."
                    value={productDisplayName || formData.quantity_nature || ''}
                    onChangeText={(value) => {
                      setProductDisplayName(null); // Réinitialiser si l'utilisateur modifie
                      updateFormData('quantity_nature', value);
                    }}
                    hint="Nom spécifique (optionnel)"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>
            </View>

            {/* Quantité convertie */}
            <View style={{
              backgroundColor: colors.success[50],
              padding: spacing.md,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.success[200],
            }}>
              <Text variant="label" style={{ marginBottom: spacing.sm, color: colors.success[700] }}>
                Unité universelle (conversion)
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Valeur convertie"
                    placeholder="Ex: 15"
                    value={formData.converted_value}
                    onChangeText={(value) => updateFormData('converted_value', value)}
                    keyboardType="numeric"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <DropdownSelector
                    label="Unité"
                    placeholder="unité"
                    items={COMMON_UNITS}
                    selectedItems={COMMON_UNITS.filter(u => u.id === formData.converted_unit)}
                    onSelectionChange={(items) => updateFormData('converted_unit', items[0]?.id || 'kg')}
                    style={{ marginBottom: 0 }}
                  />
                </View>
              </View>
              <Text variant="caption" style={{ marginTop: spacing.sm, color: colors.success[600] }}>
                {formData.quantity_value && formData.converted_value && 
                  `${formData.quantity_value} ${formData.quantity_unit} = ${formData.converted_value} ${formData.converted_unit}`
                }
              </Text>
            </View>
          </View>

          {/* Section Matériel */}
          <View>
            <Text variant="h3" style={{ 
              color: colors.text.primary,
              marginBottom: spacing.md,
              fontSize: 18,
              fontWeight: '600'
            }}>
              Matériel utilisé
            </Text>
            
            <DropdownSelector
              label="Matériel"
              placeholder="Sélectionner le matériel"
              items={materials}
              selectedItems={materials.filter(m => formData.material_ids.includes(parseInt(m.id)))}
              onSelectionChange={(items) => updateFormData('material_ids', items.map(i => parseInt(i.id)))}
              multiSelect
              searchable
              categories={['tracteurs', 'outils_tracteur', 'outils_manuels', 'petit_equipement']}
            />
          </View>

          {/* Section Date/Heure */}
          <View>
            <Text variant="h3" style={{ 
              color: colors.text.primary,
              marginBottom: spacing.md,
              fontSize: 18,
              fontWeight: '600'
            }}>
              Date et Heure
            </Text>
            
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
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
                <Input
                  label="Heure"
                  placeholder="HH:MM"
                  value={formData.time}
                  onChangeText={(value) => updateFormData('time', value)}
                />
              </View>
            </View>
          </View>

          {/* Section Commentaire */}
          <View>
            <Text variant="h3" style={{ 
              color: colors.text.primary,
              marginBottom: spacing.md,
              fontSize: 18,
              fontWeight: '600'
            }}>
              Commentaire
            </Text>
            
            <Input
              label="Comment s'est passée la tâche ?"
              placeholder="Ex: Ça s'est bien passé, c'était trop humide..."
              value={formData.notes}
              onChangeText={(value) => updateFormData('notes', value)}
              multiline
              numberOfLines={3}
              hint="Optionnel - Laissez vide si rien à signaler"
            />
          </View>

          {action && attachmentRecordId && (
            <ActionAttachmentsSection
              recordType={attachmentRecordType}
              recordId={attachmentRecordId}
              farmId={activeFarm?.farm_id}
              userId={user?.id}
            />
          )}

          {/* Zone de danger - Suppression */}
          <View style={{
            marginTop: spacing.xl,
            padding: spacing.lg,
            backgroundColor: colors.red?.[50] || '#fef2f2',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.red?.[200] || '#fecaca',
          }}>
            <Text variant="h3" style={{ 
              color: colors.red?.[700] || '#b91c1c',
              marginBottom: spacing.sm,
              fontSize: 16,
              fontWeight: '600'
            }}>
              Zone de danger
            </Text>
            
            <Text variant="body" style={{ 
              color: colors.red?.[600] || '#dc2626',
              marginBottom: spacing.md,
              fontSize: 14
            }}>
              Supprimer définitivement cette action. Cette opération ne peut pas être annulée.
            </Text>
            
            <Button
              title="🗑️ Supprimer l'action"
              onPress={handleDelete}
              variant="outline"
              loading={isSaving}
              style={{
                borderColor: colors.red?.[300] || '#fca5a5',
                backgroundColor: 'transparent',
              }}
              textStyle={{
                color: colors.red?.[700] || '#b91c1c',
                fontWeight: '600'
              }}
            />
          </View>

        </View>
      </ScrollView>
    </Modal>
  );
};

export default ActionEditModal;

