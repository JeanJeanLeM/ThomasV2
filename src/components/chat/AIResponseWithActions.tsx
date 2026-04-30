import React, { useState, useEffect, memo, useCallback } from 'react';
import { View, TouchableOpacity, Platform, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../design-system/components';
import { spacing } from '../../design-system/spacing';
import { ActionEditModal } from './ActionEditModal';
import { PlotFormModal } from '../../design-system/components/modals/PlotFormModal';
import { QuickConversionModal } from '../../design-system/components/modals/QuickConversionModal';
import { MaterialFormModal } from '../../design-system/components/modals/MaterialFormModal';
import { AIChatService } from '../../services/aiChatService';
import { useFarm } from '../../contexts/FarmContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { mapToPlotData, mapToQuickConversionData, mapToMaterialData } from '../../utils/actionToFormMappers';
import type { PlotData } from '../../design-system/components/cards/PlotCardStandard';
import { PlotService } from '../../services/plotService';
import { ConversionService } from '../../services/ConversionService';
import { hasQuantityData, sanitizeQuantityType } from '../../utils/quantityUtils';
import { MaterialService } from '../../services/MaterialService';
import InterfaceTourTarget from '../interface-tour/InterfaceTourTarget';

// Interface alignée avec le schéma DB tasks + chat_analyzed_actions
export interface ActionData {
  id?: string;
  action_type: 'observation' | 'task_done' | 'task_planned' | 'help' | 'manage_plot' | 'manage_conversion' | 'manage_material' | 'sale' | 'purchase';
  onboarding_demo?: boolean;
  original_text?: string;
  decomposed_text?: string;
  confidence?: number;
  extracted_data?: {
    // Données de base
    title?: string;
    action?: string;           // Action principale (récolter, planter, traiter...)
    standard_action?: string | null; // Action standard normalisée (réf. task_standard_actions)
    crop?: string;             // Culture concernée
    crops?: string[];          // Plusieurs cultures (plants[] dans tasks)
    
    // Localisation
    plots?: string[];          // plot_ids - parcelles
    plot_names?: string[];     // Noms des parcelles
    surface_units?: string[];  // surface_unit_ids - planches
    surface_unit_count?: number;
    
    // Quantités et durée
    quantity?: { value: number; unit: string };
    quantity_nature?: string;  // Nature spécifique (compost, bouillie, tomates)
    quantity_type?: string;    // Type: engrais, produit_phyto, recolte, plantation, vente
    quantity_converted?: { value: number; unit: string; original?: any };
    duration?: { value: number; unit: string };  // duration_minutes
    number_of_people?: number;  // Nombre de personnes
    matched_member_ids?: string[]; // IDs des membres associés à la tâche
    total_work_time?: { value: number; unit: string };  // Temps total = duration × personnes
    
    // Temps
    date?: string;             // Date de la tâche
    scheduled_date?: string;   // Date planifiée (pour task_planned)
    scheduled_time?: string;   // Heure planifiée
    task_type?: string;        // "done" | "planned"
    time?: string;             // Heure
    
    // Matériel
    materials?: string[];      // material_ids
    material_names?: string[];
    
    // Observation spécifique
    issue?: string;            // Problème observé
    category?: string;         // ravageurs, maladies, physiologique...
    severity?: string;         // Gravité
    
    // Métadonnées
    notes?: string;
    priority?: 'basse' | 'moyenne' | 'haute' | 'urgente';

    // Management (parcelle, conversion, matériel)
    name?: string;
    type?: string;
    custom_category?: string;  // Catégorie personnalisée (ex: Motoculteur)
    record_id?: string;
    card_summary?: {
      action_type: string;
      title: string;
      subtitle?: string;
      highlights?: Array<{ label: string; value: string }>;
      record_type: string;
    };
    container_name?: string;
    crop_name?: string;
    conversion_value?: number;
    conversion_unit?: string;
    category?: string;
    customer_name?: string;
    supplier_name?: string;
    payment_status?: string;
    total_ht?: number;
    total_ttc?: number;
  };
  user_status?: 'pending' | 'validated' | 'modified' | 'rejected';
  /** ID du record créé (ex: invoice.id pour sale/purchase) */
  record_id?: string;
  matched_entities?: {
    plot_ids?: number[];
    surface_unit_ids?: number[];
    material_ids?: number[];
  };
}

interface AIResponseWithActionsProps {
  message: string;
  actions: ActionData[];
  confidence?: number;
  helpShortcut?: { screen: string; label: string };
  onNavigateToHelp?: (screen: string) => void;
  /** Navigation vers un écran avec paramètres (ex: InvoiceDetails avec invoiceId) */
  onNavigate?: (screen: string, params?: Record<string, unknown>) => void;
  onValidateAction?: (index: number, action: ActionData) => void;
  onEditAction?: (index: number, action: ActionData) => void;
  onRejectAction?: (index: number, action: ActionData) => void;
}

const getActionConfig = (type: string) => {
  switch (type) {
    case 'observation':
      return {
        icon: 'eye-outline' as const,
        color: '#f59e0b', // Amber
        bgColor: '#fef3c7',
        label: 'Observation',
        emoji: '👁️'
      };
    case 'task_done':
      return {
        icon: 'checkmark-circle-outline' as const,
        color: '#10b981', // Emerald
        bgColor: '#d1fae5',
        label: 'Tâche effectuée',
        emoji: '✅'
      };
    case 'task_planned':
      return {
        icon: 'calendar-outline' as const,
        color: '#6366f1', // Indigo
        bgColor: '#e0e7ff',
        label: 'Tâche planifiée',
        emoji: '📅'
      };
    case 'help':
      return {
        icon: 'help-circle-outline' as const,
        color: '#8b5cf6', // Violet
        bgColor: '#ede9fe',
        label: 'Aide',
        emoji: '💡'
      };
    case 'manage_plot':
      return {
        icon: 'map-outline' as const,
        color: '#0d9488', // Teal
        bgColor: '#ccfbf1',
        label: 'Parcelle',
        emoji: '🗺️'
      };
    case 'manage_conversion':
      return {
        icon: 'swap-horizontal-outline' as const,
        color: '#ea580c', // Orange
        bgColor: '#ffedd5',
        label: 'Conversion',
        emoji: '📐'
      };
    case 'manage_material':
      return {
        icon: 'construct-outline' as const,
        color: '#4f46e5', // Indigo
        bgColor: '#e0e7ff',
        label: 'Matériel',
        emoji: '🔧'
      };
    case 'sale':
      return {
        icon: 'trending-up-outline' as const,
        color: '#10b981',
        bgColor: '#d1fae5',
        label: 'Vente enregistrée',
        emoji: '💰'
      };
    case 'purchase':
      return {
        icon: 'trending-down-outline' as const,
        color: '#6366f1',
        bgColor: '#e0e7ff',
        label: 'Achat enregistré',
        emoji: '🛒'
      };
    default:
      return {
        icon: 'document-text-outline' as const,
        color: '#6b7280',
        bgColor: '#f3f4f6',
        label: 'Action',
        emoji: '📝'
      };
  }
};

/** Style cohérent par type de pastille (parcelle, matériel, conversion, facture) */
const HIGHLIGHT_STYLES: Record<string, { icon: string; bgColor: string; textColor: string }> = {
  Type:       { icon: '🏷️',  bgColor: '#ccfbf1', textColor: '#0d9488' },  // Teal - type parcelle
  Dimensions: { icon: '📐',  bgColor: '#dbeafe', textColor: '#1e40af' },  // Bleu - dimensions
  Catégorie:  { icon: '📂',  bgColor: '#fef3c7', textColor: '#92400e' },  // Ambre - catégorie
  Marque:     { icon: '🏭',  bgColor: '#e0e7ff', textColor: '#4338ca' },  // Indigo - marque
  Modèle:     { icon: '📋',  bgColor: '#f1f5f9', textColor: '#475569' },  // Slate - modèle
  Planches:   { icon: '🌱',  bgColor: '#f3e8ff', textColor: '#7c3aed' },  // Violet - planches
  Conteneur:  { icon: '📦',  bgColor: '#ffedd5', textColor: '#9a3412' },  // Orange - conteneur
  Contenant:  { icon: '📦',  bgColor: '#ffedd5', textColor: '#9a3412' },  // Orange - contenant (alias)
  Culture:    { icon: '🌾',  bgColor: '#dcfce7', textColor: '#166534' },  // Vert - culture
  Équivalent: { icon: '🔄',  bgColor: '#e0f2fe', textColor: '#0369a1' },  // Cyan - conversion
  // Factures (ventes / achats)
  Client:     { icon: '👤',  bgColor: '#dbeafe', textColor: '#1e40af' },  // Bleu - client
  Fournisseur:{ icon: '🏢',  bgColor: '#e0e7ff', textColor: '#4338ca' },  // Indigo - fournisseur
  Montant:    { icon: '💰',  bgColor: '#d1fae5', textColor: '#047857' },  // Vert - montant
  Statut:     { icon: '📋',  bgColor: '#fef3c7', textColor: '#92400e' },  // Ambre - statut paiement
};
const getHighlightStyle = (label: string) =>
  HIGHLIGHT_STYLES[label] || { icon: '📌', bgColor: '#f3f4f6', textColor: '#374151' };

/** Raccourcis "Voir..." pour actions management (parcelle, matériel, conversion) */
const VIEW_SHORTCUTS: Record<string, { screen: string; label: string; bgColor: string; iconColor: string }> = {
  manage_plot:      { screen: 'PlotsSettings',      label: 'Voir les parcelles',  bgColor: '#ccfbf1', iconColor: '#0d9488' },
  manage_material:  { screen: 'MaterialsSettings',  label: 'Voir le matériel',    bgColor: '#e0e7ff', iconColor: '#4f46e5' },
  manage_conversion:{ screen: 'ConversionsSettings',label: 'Voir les conversions',bgColor: '#ffedd5', iconColor: '#ea580c' },
  sale:             { screen: 'InvoicesList',       label: 'Voir les factures',   bgColor: '#d1fae5', iconColor: '#10b981' },
  purchase:         { screen: 'InvoicesList',       label: 'Voir les factures',   bgColor: '#e0e7ff', iconColor: '#6366f1' },
};

// Tag component pour les métadonnées
const Tag: React.FC<{
  icon: string;
  text: string;
  bgColor: string;
  textColor: string;
}> = ({ icon, text, bgColor, textColor }) => (
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: bgColor,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  }}>
    <Text style={{ fontSize: 12, marginRight: 4 }}>{icon}</Text>
    <Text style={{ fontSize: 12, color: textColor, fontWeight: '500' }}>{text}</Text>
  </View>
);

const ActionCard: React.FC<{
  action: ActionData;
  index: number;
  total: number;
  currentUserFirstName?: string;
  onValidate?: (index: number, action: ActionData) => void;
  onEdit?: (index: number, action: ActionData) => void;
  onReject?: (index: number, action: ActionData) => void;
}> = memo(({ action, index, total, currentUserFirstName, onValidate, onEdit, onReject }) => {
  const config = getActionConfig(action.action_type);
  const [isExpanded, setIsExpanded] = useState(true); // Ouvert par défaut

  const data = action.extracted_data || {};
  
  // Construire le titre court: "Élément Culture" ou juste "Élément"
  const buildTitle = () => {
    const capitalizeFirst = (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    // Management: utiliser card_summary.title ou name
    if (action.action_type === 'manage_plot') {
      return data.card_summary?.title || data.name || 'Parcelle créée';
    }
    if (action.action_type === 'manage_conversion') {
      return data.card_summary?.title || `${data.container_name || 'Conversion'} ${data.crop_name || ''}`.trim() || 'Conversion créée';
    }
    if (action.action_type === 'manage_material') {
      return data.card_summary?.title || data.name || 'Matériel créé';
    }
    if (action.action_type === 'sale') {
      return data.card_summary?.title || `Vente - ${data.customer_name || 'Client'}`;
    }
    if (action.action_type === 'purchase') {
      return data.card_summary?.title || `Achat - ${data.supplier_name || 'Fournisseur'}`;
    }
    
    let mainElement = '';
    
    // Pour les observations: utiliser le problème (issue)
    if (action.action_type === 'observation' && data.issue) {
      mainElement = data.issue;
    }
    // Pour les tâches: prioriser matériel > action
    else if (data.materials && Array.isArray(data.materials) && data.materials.length > 0) {
      mainElement = data.materials[0];
    }
    else if (data.material) {
      mainElement = data.material;
    }
    else if (data.action) {
      mainElement = data.action;
    }
    else {
      // Fallback: premier mot significatif
      const words = action.decomposed_text?.split(' ') || [];
      mainElement = words.find(w => !['j\'ai', 'nous', 'on', 'je', 'a'].includes(w.toLowerCase())) || words[0] || 'Action';
    }
    
    const crop = data.crop || data.crops?.[0] || '';
    if (crop) {
      return `${capitalizeFirst(mainElement)} ${capitalizeFirst(crop)}`;
    }
    return capitalizeFirst(mainElement);
  };

  // Formater la durée avec nombre de personnes
  const formatDuration = () => {
    if (data.duration && data.duration.value > 0) {
      const unit = data.duration.unit === 'minutes' || data.duration.unit === 'min' ? 'min' : data.duration.unit;
      if (data.number_of_people && data.number_of_people > 1) {
        return `${data.duration.value} ${unit} × ${data.number_of_people}`;
      }
      return `${data.duration.value} ${unit}`;
    }
    return null;
  };

  // Formater la date (prioriser scheduled_date pour les tâches planifiées)
  const formatDate = () => {
    const displayDate = (action.action_type === 'task_planned' || data.task_type === 'planned') && data.scheduled_date
      ? data.scheduled_date
      : data.date;
    return formatDateForDisplay(displayDate);
  };

  return (
    <TouchableOpacity
      onPress={() => onEdit?.(index, action)}
      activeOpacity={0.7}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        width: '100%',
      }}>
      {/* En-tête avec titre et actions rapides */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: spacing.md,
        paddingBottom: spacing.sm,
      }}>
        <View style={{ flex: 1 }}>
          {/* Titre principal: Action + Culture */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#1f2937',
              marginRight: 8,
            }}>
              {buildTitle()}
            </Text>
            
            {/* Badge durée */}
            {!!formatDuration() && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#dbeafe',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
              }}>
                <Text style={{ fontSize: 11 }}>⏱️</Text>
                <Text style={{ fontSize: 11, color: '#1e40af', marginLeft: 3, fontWeight: '600' }}>
                  {formatDuration()}
                </Text>
              </View>
            )}
          </View>

          {/* Type d'action */}
          <Text style={{
            fontSize: 13,
            color: config.color,
            fontWeight: '500',
            marginTop: 2,
          }}>
            {config.label}
          </Text>
        </View>

        {/* Bouton supprimer */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onReject?.(index, action);
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: '#fef2f2',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Tags de métadonnées - masqués pour les récoltes */}
      {action.action_type !== 'harvest' && (
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
        }}>
          {/* Highlights pour management (parcelle, conversion, matériel) - style cohérent par label */}
          {['manage_plot', 'manage_conversion', 'manage_material', 'sale', 'purchase'].includes(action.action_type) && data.card_summary?.highlights?.map((h: { label: string; value: string }, i: number) => {
            const style = getHighlightStyle(h.label);
            return (
              <Tag
                key={i}
                icon={style.icon}
                text={`${h.label}: ${h.value}`}
                bgColor={style.bgColor}
                textColor={style.textColor}
              />
            );
          })}
          {/* Culture(s) */}
          {!!(data.crop || (data.crops && data.crops.length > 0)) && (
            <Tag 
              icon="🌱" 
              text={data.crops?.join(', ') || data.crop || ''} 
              bgColor="#dcfce7" 
              textColor="#166534" 
            />
          )}

          {/* Nombre de personnes - seulement si > 1 ou si c'est une tâche (pas observation) */}
          {!!(data.number_of_people && data.number_of_people > 1) && (
            <Tag 
              icon="👥" 
              text={`${data.number_of_people} personne${data.number_of_people > 1 ? 's' : ''}`} 
              bgColor="#e0e7ff" 
              textColor="#3730a3" 
            />
          )}

          {/* Auteur de saisie */}
          {!!currentUserFirstName && (
            <Tag
              icon="✍️"
              text={currentUserFirstName}
              bgColor="#ecfeff"
              textColor="#0e7490"
            />
          )}

          {/* Temps total de travail (durée × personnes) */}
          {!!(data.duration && data.duration.value > 0 && data.number_of_people && data.number_of_people > 1) && (
            <Tag 
              icon="⏱️" 
              text={`${data.duration.value * data.number_of_people} ${data.duration.unit} total`} 
              bgColor="#fdf4ff" 
              textColor="#86198f" 
            />
          )}

          {/* Catégorie - masqué pour manage_* (déjà dans highlights) */}
          {!!(data.custom_category || data.category) &&
            !['manage_plot', 'manage_conversion', 'manage_material', 'sale', 'purchase'].includes(action.action_type) && (
            <Tag 
              icon="📂" 
              text={data.custom_category || data.category || ''} 
              bgColor="#fef3c7" 
              textColor="#92400e" 
            />
          )}

          {/* Quantité : affichée uniquement dans la section "Informations quantité" ci-dessous pour éviter doublon */}
          {/* (supprimé ici : quand pas de conversion, on affichait 2x la même unité) */}

          {/* Parcelles */}
          {!!((data.plots && data.plots.length > 0) || (data.plot_names && data.plot_names.length > 0)) && (
            <Tag 
              icon="📍" 
              text={data.plot_names?.join(', ') || data.plots?.join(', ') || ''} 
              bgColor="#fff7ed" 
              textColor="#9a3412" 
            />
          )}

          {/* Surface units (planches) - masqué si déjà dans highlights (évite doublon après modification) */}
          {(() => {
            const suCount = data.surface_unit_count ?? (data as any).surface_units_count ?? data.surface_units_config?.count;
            if (!suCount || suCount <= 0) return null;
            const hasPlanchesHighlight = data.card_summary?.highlights?.some((h: { label: string }) => h.label === 'Planches');
            if (hasPlanchesHighlight) return null; // Déjà affiché dans highlights
            const style = getHighlightStyle('Planches');
            return (
              <Tag
                key="planches"
                icon={style.icon}
                text={`${suCount} planche${suCount > 1 ? 's' : ''}`}
                bgColor={style.bgColor}
                textColor={style.textColor}
              />
            );
          })()}

          {/* Matériel */}
          {!!((data.material_names && data.material_names.length > 0) || (data.materials && data.materials.length > 0)) && (
            <Tag 
              icon="🔧" 
              text={(data.material_names || data.materials || []).join(', ')} 
              bgColor="#e5e7eb" 
              textColor="#374151" 
            />
          )}

          {/* Problème (pour observations) */}
          {!!data.issue && (
            <Tag 
              icon="⚠️" 
              text={data.issue} 
              bgColor="#fef2f2" 
              textColor="#991b1b" 
            />
          )}
        </View>
      )}

      {/* Affichage quantité : 1 capsule si pas de conversion, 2 (unité + convertie) si conversion */}
      {!!hasQuantityData(data) && (
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
        }}>
          {/* Unité communiquée - icône adaptée: 📦 pour factures, 📊 sinon */}
          {!!(data.quantity && data.quantity.value > 0) && (
            <Tag 
              icon={['sale', 'purchase'].includes(action.action_type) ? '📦' : '📊'} 
              text={`${data.quantity.value} ${data.quantity.unit}`} 
              bgColor={['sale', 'purchase'].includes(action.action_type) ? '#d1fae5' : '#dbeafe'} 
              textColor={['sale', 'purchase'].includes(action.action_type) ? '#047857' : '#1e40af'} 
            />
          )}

          {/* Quantité convertie : 2e capsule seulement si conversion ET unité différente */}
          {!!(data.quantity_converted &&
            data.quantity_converted.value > 0 &&
            (data.quantity?.unit ?? '').toLowerCase() !== (data.quantity_converted?.unit ?? '').toLowerCase()) && (
              <Tag 
                icon="🔄" 
                text={`${data.quantity_converted.value} ${data.quantity_converted.unit}`} 
                bgColor="#e0f2fe" 
                textColor="#0369a1" 
              />
            )}

          {/* Nature de la quantité (produit) - icône 🌾 pour factures */}
          {!!data.quantity_nature && (
            <Tag 
              icon={['sale', 'purchase'].includes(action.action_type) ? '🌾' : '🏷️'} 
              text={data.quantity_nature} 
              bgColor={['sale', 'purchase'].includes(action.action_type) ? '#dcfce7' : '#e0f2fe'} 
              textColor={['sale', 'purchase'].includes(action.action_type) ? '#166534' : '#0369a1'} 
            />
          )}

          {/* Type de la quantité (garde-fou: affiché seulement si quantité réelle) */}
          {!!sanitizeQuantityType(data) && (
            <Tag 
              icon="📋" 
              text={sanitizeQuantityType(data)!} 
              bgColor="#f0f9ff" 
              textColor="#0c4a6e" 
            />
          )}
        </View>
      )}

      {/* Date */}
      {!!formatDate() && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f0fdf4',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 12 }}>📅</Text>
            <Text style={{ fontSize: 12, color: '#166534', marginLeft: 4, fontWeight: '500' }}>
              {formatDate()}
            </Text>
          </View>
        </View>
      )}

      {/* Section Commentaire (optionnel) */}
      {!!data.notes && (
        <View style={{
          backgroundColor: '#f9fafb',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 12, marginRight: 6 }}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Commentaire</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 18 }}>
                {data.notes}
              </Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

export const AIResponseWithActions: React.FC<AIResponseWithActionsProps> = ({
  message,
  actions,
  confidence,
  helpShortcut,
  onNavigateToHelp,
  onNavigate,
  onValidateAction,
  onEditAction,
  onRejectAction,
}) => {
  const hasActions = actions && actions.length > 0;
  const hasOnboardingDemoActions = actions.some((action) => action.onboarding_demo === true);
  const hasVisibleMessage = typeof message === 'string' && message.trim().length > 0;
  const { activeFarm } = useFarm();
  const { user } = useAuth();
  const currentUserFirstName = (() => {
    const metadata = (user?.user_metadata || {}) as Record<string, unknown>;
    const firstName = metadata.first_name;
    if (typeof firstName === 'string' && firstName.trim().length > 0) {
      return firstName.trim();
    }
    const fullName = metadata.full_name;
    if (typeof fullName === 'string' && fullName.trim().length > 0) {
      return fullName.trim().split(' ')[0] || '';
    }
    if (typeof user?.email === 'string' && user.email.includes('@')) {
      return user.email.split('@')[0] || '';
    }
    return '';
  })();
  
  // État pour le modal d'édition
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionData | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(0);

  // États pour les modals management
  const [showPlotModal, setShowPlotModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);

  const handleEditAction = useCallback((index: number, action: ActionData) => {
    if ((action as any).onboarding_demo === true) {
      Alert.alert(
        'Exemple onboarding',
        'Cette card est une simulation. Vous pouvez simplement observer le rendu.'
      );
      return;
    }

    setEditingAction(action);
    setEditingIndex(index);

    // Carte facture (sale/purchase) → ouvrir le détail de la facture (formulaire adapté DB)
    if ((action.action_type === 'sale' || action.action_type === 'purchase') && onNavigate) {
      const recordId = action.record_id ?? action.extracted_data?.record_id;
      if (recordId) {
        onNavigate('InvoiceDetails', { invoiceId: String(recordId) });
        return;
      }
      // Pas de record_id (erreur) → aller à la liste des factures
      onNavigate('InvoicesList');
      return;
    }

    if (action.action_type === 'manage_plot') {
      setShowPlotModal(true);
      return;
    }
    if (action.action_type === 'manage_conversion') {
      setShowConversionModal(true);
      return;
    }
    if (action.action_type === 'manage_material') {
      setShowMaterialModal(true);
      return;
    }

    setEditModalVisible(true);
  }, [onNavigate]);

  const handleSaveAction = useCallback(async (updatedAction: ActionData) => {
    console.log('✏️ Action modifiée:', updatedAction);
    
    // Marquer l'action comme modifiée/validée
    const validatedAction = {
      ...updatedAction,
      user_status: 'modified' as const
    };
    
    // Appeler le callback parent avec l'action mise à jour
    onEditAction?.(editingIndex, validatedAction);
    
    // Automatiquement créer/mettre à jour la tâche/observation correspondante
    try {
      if (!activeFarm?.farm_id || !user?.id) {
        console.warn('⚠️ [AUTO-VALIDATE] Contexte manquant - farm_id ou user_id');
        return;
      }
      
      // Priorité: record_id du pipeline > lookup DB par action ID
      const pipelineRecordId = (validatedAction as any).record_id;
      const existingRecordId = pipelineRecordId || await AIChatService.getExistingRecordId(validatedAction.id!);
      console.log('🔍 [AUTO-VALIDATE] Existing record ID:', existingRecordId, '(source:', pipelineRecordId ? 'pipeline' : 'db-lookup', ')');
      
      if (validatedAction.action_type === 'task_done' || validatedAction.action_type === 'task_planned' || validatedAction.action_type === 'harvest') {
        // Vérifier si l'action est déjà liée à une tâche existante
        if (existingRecordId) {
          console.log('🔄 [AUTO-VALIDATE] Mise à jour de la tâche existante:', existingRecordId);
          await AIChatService.updateTaskFromAction(validatedAction, existingRecordId, activeFarm.farm_id, user.id);
          console.log('✅ [AUTO-VALIDATE] Tâche mise à jour automatiquement');
        } else {
          console.log('🔄 [AUTO-VALIDATE] Création automatique de la tâche...');
          const taskId = await AIChatService.createTaskFromAction(validatedAction, activeFarm.farm_id, user.id);
          console.log('✅ [AUTO-VALIDATE] Tâche créée automatiquement:', taskId);
        }
      } else if (validatedAction.action_type === 'observation') {
        // Vérifier si l'action est déjà liée à une observation existante
        if (existingRecordId) {
          console.log('🔄 [AUTO-VALIDATE] Mise à jour de l\'observation existante:', existingRecordId);
          await AIChatService.updateObservationFromAction(validatedAction, existingRecordId, activeFarm.farm_id, user.id);
          console.log('✅ [AUTO-VALIDATE] Observation mise à jour automatiquement');
        } else {
          console.log('🔄 [AUTO-VALIDATE] Création automatique de l\'observation...');
          await AIChatService.createObservationFromAction(validatedAction, activeFarm.farm_id, user.id);
          console.log('✅ [AUTO-VALIDATE] Observation créée automatiquement');
        }
      }
    } catch (error) {
      console.error('❌ [AUTO-VALIDATE] Erreur création/mise à jour automatique:', error);
    }
    
    setEditModalVisible(false);
    setEditingAction(null);
  }, [onEditAction, editingIndex, activeFarm, user]);

  return (
    <View style={{
      alignSelf: 'flex-start',
      maxWidth: Platform.select({ web: '90%', default: '92%' }),
      marginBottom: spacing.lg,
      width: '100%',
    }}>
      {/* Message court de l'IA (optionnel) */}
      {hasVisibleMessage && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: hasActions ? spacing.sm : 0,
        }}>
          {/* Avatar Thomas */}
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: spacing.sm,
            overflow: 'hidden',
          }}>
            <Image
              source={require('../../../assets/Logocolorfull.png')}
              style={{
                width: 32,
                height: 32,
                resizeMode: 'contain',
              }}
            />
          </View>

          {/* Bulle du message */}
          <View style={{
            flex: 1,
            backgroundColor: '#ffffff',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 16,
            borderTopLeftRadius: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}>
            <Text style={{
              fontSize: 15,
              color: '#1f2937',
              lineHeight: 22,
            }}>
              {message}
            </Text>
          </View>
        </View>
      )}

      {/* Cards des actions */}
      {hasActions && (
        <View style={{ 
          marginLeft: Platform.select({ web: 40, default: 0 }),
          marginTop: spacing.sm,
        }}>
          {/* En-tête des actions */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing.xs,
            paddingLeft: spacing.xs,
          }}>
            <View style={{
              width: 3,
              height: 14,
              backgroundColor: '#10b981',
              borderRadius: 2,
              marginRight: spacing.xs,
            }} />
            <Text style={{
              fontSize: 12,
              color: '#6b7280',
              fontWeight: '500',
            }}>
              {actions.length} action{actions.length > 1 ? 's' : ''} détectée{actions.length > 1 ? 's' : ''}
            </Text>
          </View>

          {/* Liste des cards */}
          {actions.map((action, index) => {
            const cardKey = action.id ? `action-${String(action.id)}-${index}` : `action-${index}`;
            const card = (
              <ActionCard
                action={action}
                index={index}
                total={actions.length}
                currentUserFirstName={currentUserFirstName}
                onValidate={onValidateAction}
                onEdit={handleEditAction}
                onReject={onRejectAction}
              />
            );
            if (index === 0) {
              return (
                <InterfaceTourTarget key={cardKey} targetId="chat.response.card">
                  {card}
                </InterfaceTourTarget>
              );
            }
            return <React.Fragment key={cardKey}>{card}</React.Fragment>;
          })}
        </View>
      )}

      {/* Cards raccourcis "Voir..." pour actions management (parcelle, matériel, conversion) */}
      {onNavigateToHelp && !hasOnboardingDemoActions && (
        <>
          {[...new Set(actions.map(a => a.action_type).filter((t): t is string => !!t && !!VIEW_SHORTCUTS[t]))].map((actionType) => {
            const config = VIEW_SHORTCUTS[actionType];
            return (
              <View key={actionType} style={{ marginLeft: Platform.select({ web: 40, default: 0 }), marginTop: spacing.sm }}>
                <TouchableOpacity
                  onPress={() => onNavigateToHelp(config.screen)}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    marginBottom: spacing.md,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    padding: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: config.bgColor,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: spacing.sm,
                  }}>
                    <Ionicons name="open-outline" size={22} color={config.iconColor} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1f2937', flex: 1 }}>{config.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      )}

      {/* Card raccourci "Aller à..." pour réponses d'aide */}
      {helpShortcut && onNavigateToHelp && (
        <View style={{ 
          marginLeft: Platform.select({ web: 40, default: 0 }),
          marginTop: spacing.sm,
        }}>
          <TouchableOpacity
            onPress={() => onNavigateToHelp(helpShortcut.screen)}
            activeOpacity={0.7}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              marginBottom: spacing.md,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              padding: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#e0e7ff',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing.sm,
            }}>
              <Ionicons name="open-outline" size={22} color="#4f46e5" />
            </View>
            <Text style={{
              fontSize: 15,
              fontWeight: '600',
              color: '#1f2937',
              flex: 1,
            }}>
              {helpShortcut.label}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      )}

      {/* Modal d'édition (tâches, observations) */}
      <ActionEditModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setEditingAction(null);
        }}
        action={editingAction}
        onSave={handleSaveAction}
      />

      {/* Modal Parcelle (manage_plot) */}
      <PlotFormModal
        visible={showPlotModal}
        onClose={() => { setShowPlotModal(false); setEditingAction(null); }}
        onSave={async (plot: PlotData) => {
          if (!activeFarm?.farm_id) return;
          const recordId = editingAction?.extracted_data?.record_id;
          if (recordId && plot.id) {
            await PlotService.updatePlot(plot);
            Alert.alert('Succès', 'Parcelle mise à jour');
          } else {
            const { id: _id, ...plotWithoutId } = plot;
            await PlotService.createPlot(activeFarm.farm_id, plotWithoutId);
            Alert.alert('Succès', 'Parcelle créée');
          }
          const typeLabels: Record<string, string> = { serre_plastique: 'Serre plastique', serre_verre: 'Serre verre', plein_champ: 'Plein champ', tunnel: 'Tunnel', hydroponique: 'Hydroponique', pepiniere: 'Pépinière', autre: plot.customTypeLabel || 'Autre' };
          const dims = plot.length && plot.width ? `${plot.length}m × ${plot.width}m` : plot.area ? `${plot.area} m²` : null;
          const suCount = plot.surfaceUnits?.length ?? 0;
          const card_summary = {
            action_type: 'manage_plot' as const,
            title: `Parcelle ${plot.name} créée`,
            subtitle: `${typeLabels[plot.type] || plot.type}${dims ? ` • ${dims}` : ''}`,
            highlights: [
              { label: 'Type', value: typeLabels[plot.type] || plot.type },
              ...(dims ? [{ label: 'Dimensions', value: dims }] : []),
              ...(suCount > 0 ? [{ label: 'Planches', value: `${suCount} planche${suCount > 1 ? 's' : ''}` }] : []),
            ],
            record_type: 'plot' as const,
          };
          onEditAction?.(editingIndex, {
            ...editingAction!,
            extracted_data: { ...editingAction?.extracted_data, ...plot, card_summary, surface_units_count: suCount || undefined },
          });
          setShowPlotModal(false);
          setEditingAction(null);
        }}
        plot={editingAction?.action_type === 'manage_plot' ? mapToPlotData(editingAction.extracted_data || {}) as PlotData : undefined}
        isCreating={!editingAction?.extracted_data?.record_id}
        activeFarm={activeFarm ? { farm_id: activeFarm.farm_id, farm_name: activeFarm.farm_name || '' } : undefined}
      />

      {/* Modal Conversion (manage_conversion) */}
      <QuickConversionModal
        visible={showConversionModal}
        onClose={() => { setShowConversionModal(false); setEditingAction(null); }}
        onSave={async (conv) => {
          if (!activeFarm?.farm_id || !user?.id) return;
          const ext = editingAction?.extracted_data;
          if (ext?.record_id) {
            await ConversionService.updateConversion(ext.record_id as string, {
              container_name: conv.containerName,
              crop_name: conv.cropName,
              conversion_value: conv.conversionValue,
              conversion_unit: conv.conversionUnit,
              description: conv.description,
            });
            Alert.alert('Succès', 'Conversion mise à jour');
          } else {
            await ConversionService.createConversion(
              user.id,
              activeFarm.farm_id,
              conv.containerName,
              conv.cropName,
              conv.conversionValue,
              conv.conversionUnit,
              [],
              conv.description,
              conv.containerType
            );
            Alert.alert('Succès', 'Conversion créée');
          }
          const card_summary = {
            action_type: 'manage_conversion' as const,
            title: `Conversion ${conv.containerName} ${conv.cropName}`,
            subtitle: `1 ${conv.containerName} = ${conv.conversionValue} ${conv.conversionUnit}`,
            highlights: [
              { label: 'Contenant', value: conv.containerName },
              { label: 'Culture', value: conv.cropName },
              { label: 'Équivalent', value: `${conv.conversionValue} ${conv.conversionUnit}` },
            ],
            record_type: 'conversion' as const,
          };
          const updatedAction = {
            ...editingAction!,
            extracted_data: {
              ...editingAction?.extracted_data,
              container_name: conv.containerName,
              crop_name: conv.cropName,
              conversion_value: conv.conversionValue,
              conversion_unit: conv.conversionUnit,
              record_id: ext?.record_id,
              card_summary,
            },
          };
          onEditAction?.(editingIndex, updatedAction);
          setShowConversionModal(false);
          setEditingAction(null);
        }}
        editingConversion={editingAction?.action_type === 'manage_conversion' ? {
          id: editingAction.extracted_data?.record_id,
          name: `${editingAction.extracted_data?.container_name || ''} de ${editingAction.extracted_data?.crop_name || ''}`,
          fromUnit: editingAction.extracted_data?.crop_name,
          factor: editingAction.extracted_data?.conversion_value,
          toUnit: editingAction.extracted_data?.conversion_unit,
        } : undefined}
      />

      {/* Modal Matériel (manage_material) */}
      <MaterialFormModal
        visible={showMaterialModal}
        onClose={() => { setShowMaterialModal(false); setEditingAction(null); }}
        onSave={async (values) => {
          if (!activeFarm?.farm_id) return;
          const slugText = values.slugText?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];
          if (values.id) {
            await MaterialService.updateMaterial({
              id: parseInt(values.id),
              name: values.name,
              category: values.category,
              custom_category: values.customCategory,
              brand: values.brand,
              model: values.model,
              llm_keywords: slugText,
            });
            Alert.alert('Succès', 'Matériel mis à jour');
          } else {
            await MaterialService.createMaterial({
              farm_id: activeFarm.farm_id,
              name: values.name,
              category: values.category,
              custom_category: values.customCategory,
              brand: values.brand,
              model: values.model,
              llm_keywords: slugText,
            });
            Alert.alert('Succès', 'Matériel créé');
          }
          const capitalizeFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
          const catLabel = values.customCategory?.trim() || capitalizeFirst(values.category || '');
          const card_summary = {
            action_type: 'manage_material' as const,
            title: `Matériel ${values.name} créé`,
            subtitle: [catLabel, values.brand, values.model].filter(Boolean).join(' • '),
            highlights: [
              ...(values.category || values.customCategory ? [{ label: 'Catégorie', value: catLabel }] : []),
              ...(values.brand ? [{ label: 'Marque', value: values.brand }] : []),
              ...(values.model ? [{ label: 'Modèle', value: values.model }] : []),
            ],
            record_type: 'material' as const,
          };
          const updatedAction: ActionData = {
            ...editingAction!,
            extracted_data: {
              ...editingAction?.extracted_data,
              name: values.name,
              category: values.category,
              custom_category: values.customCategory || undefined,
              brand: values.brand,
              model: values.model,
              record_id: values.id ? parseInt(values.id) : editingAction?.extracted_data?.record_id,
              card_summary,
            },
          };
          onEditAction?.(editingIndex, updatedAction);
          setShowMaterialModal(false);
          setEditingAction(null);
        }}
        initialValues={editingAction?.action_type === 'manage_material' ? mapToMaterialData(editingAction.extracted_data || {}) as any : undefined}
      />
    </View>
  );
};

export default AIResponseWithActions;

