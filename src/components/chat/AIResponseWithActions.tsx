import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../design-system/components';
import { spacing } from '../../design-system/spacing';
import { ActionEditModal } from './ActionEditModal';
import { AIChatService } from '../../services/aiChatService';
import { useFarm } from '../../contexts/FarmContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateForDisplay } from '../../utils/dateUtils';

// Interface alignée avec le schéma DB tasks + chat_analyzed_actions
export interface ActionData {
  id?: string;
  action_type: 'observation' | 'task_done' | 'task_planned' | 'harvest' | 'help';
  original_text?: string;
  decomposed_text?: string;
  confidence?: number;
  extracted_data?: {
    // Données de base
    title?: string;
    action?: string;           // Action principale (récolter, planter, traiter...)
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
    total_work_time?: { value: number; unit: string };  // Temps total = duration × personnes
    
    // Temps
    date?: string;             // Date de la tâche
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
  };
  user_status?: 'pending' | 'validated' | 'modified' | 'rejected';
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
    case 'harvest':
      return {
        icon: 'nutrition-outline' as const,
        color: '#22c55e', // Green
        bgColor: '#dcfce7',
        label: 'Récolte',
        emoji: '🥕'
      };
    case 'help':
      return {
        icon: 'help-circle-outline' as const,
        color: '#8b5cf6', // Violet
        bgColor: '#ede9fe',
        label: 'Aide',
        emoji: '💡'
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
  onValidate?: () => void;
  onEdit?: () => void;
  onReject?: () => void;
}> = ({ action, index, total, onValidate, onEdit, onReject }) => {
  const config = getActionConfig(action.action_type);
  const [isExpanded, setIsExpanded] = useState(true); // Ouvert par défaut

  const data = action.extracted_data || {};
  
  // Construire le titre court: "Élément Culture" ou juste "Élément"
  const buildTitle = () => {
    const capitalizeFirst = (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };
    
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

  // Formater la date
  const formatDate = () => {
    const formatted = formatDateForDisplay(data.date);
    if (action.action_type === 'task_planned') {
      console.log(`📅 [ActionCard] Date pour action ${action.id}:`, {
        'data.date': data.date,
        'formatted': formatted,
        'extracted_data': action.extracted_data,
        'action_data': (action as any).action_data
      });
    }
    return formatted;
  };

  return (
    <TouchableOpacity
      onPress={onEdit}
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
            {formatDuration() && (
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
            onReject?.();
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
          {/* Culture(s) */}
          {(data.crop || data.crops?.length) && (
            <Tag 
              icon="🌱" 
              text={data.crops?.join(', ') || data.crop || ''} 
              bgColor="#dcfce7" 
              textColor="#166534" 
            />
          )}

          {/* Nombre de personnes - seulement si > 1 ou si c'est une tâche (pas observation) */}
          {data.number_of_people && data.number_of_people > 1 && (
            <Tag 
              icon="👥" 
              text={`${data.number_of_people} personne${data.number_of_people > 1 ? 's' : ''}`} 
              bgColor="#e0e7ff" 
              textColor="#3730a3" 
            />
          )}

          {/* Temps total de travail (durée × personnes) */}
          {data.duration && data.duration.value > 0 && data.number_of_people && data.number_of_people > 1 && (
            <Tag 
              icon="⏱️" 
              text={`${data.duration.value * data.number_of_people} ${data.duration.unit} total`} 
              bgColor="#fdf4ff" 
              textColor="#86198f" 
            />
          )}

          {/* Catégorie */}
          {data.category && (
            <Tag 
              icon="📂" 
              text={data.category} 
              bgColor="#fef3c7" 
              textColor="#92400e" 
            />
          )}

          {/* Quantité */}
          {data.quantity && data.quantity.value > 0 && (
            <Tag 
              icon="📊" 
              text={`${data.quantity.value} ${data.quantity.unit}`} 
              bgColor="#dbeafe" 
              textColor="#1e40af" 
            />
          )}

          {/* Parcelles */}
          {(data.plots?.length || data.plot_names?.length) && (
            <Tag 
              icon="📍" 
              text={data.plot_names?.join(', ') || data.plots?.join(', ') || ''} 
              bgColor="#fff7ed" 
              textColor="#9a3412" 
            />
          )}

          {/* Surface units (planches) */}
          {data.surface_unit_count && data.surface_unit_count > 0 && (
            <Tag 
              icon="📐" 
              text={`${data.surface_unit_count} planche${data.surface_unit_count > 1 ? 's' : ''}`} 
              bgColor="#f3e8ff" 
              textColor="#7c3aed" 
            />
          )}

          {/* Matériel */}
          {(data.material_names?.length || data.materials?.length) && (
            <Tag 
              icon="🔧" 
              text={(data.material_names || data.materials || []).join(', ')} 
              bgColor="#e5e7eb" 
              textColor="#374151" 
            />
          )}

          {/* Problème (pour observations) */}
          {data.issue && (
            <Tag 
              icon="⚠️" 
              text={data.issue} 
              bgColor="#fef2f2" 
              textColor="#991b1b" 
            />
          )}
        </View>
      )}

      {/* Affichage quantité utilisateur, quantity_nature et quantity_type pour toutes les actions */}
      {(data.quantity || data.quantity_nature || data.quantity_type || data.quantity_converted) && (
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
        }}>
          {/* Quantité utilisateur (toujours visible) */}
          {data.quantity && data.quantity.value > 0 && (
            <Tag 
              icon="📊" 
              text={`${data.quantity.value} ${data.quantity.unit}`} 
              bgColor="#dbeafe" 
              textColor="#1e40af" 
            />
          )}

          {/* Quantité convertie si disponible */}
          {data.quantity_converted && data.quantity_converted.value > 0 && (
            <Tag 
              icon="🔄" 
              text={`${data.quantity_converted.value} ${data.quantity_converted.unit}`} 
              bgColor="#e0f2fe" 
              textColor="#0369a1" 
            />
          )}

          {/* Nature de la quantité */}
          {data.quantity_nature && (
            <Tag 
              icon="🏷️" 
              text={data.quantity_nature} 
              bgColor="#e0f2fe" 
              textColor="#0369a1" 
            />
          )}

          {/* Type de la quantité */}
          {data.quantity_type && (
            <Tag 
              icon="📋" 
              text={data.quantity_type} 
              bgColor="#f0f9ff" 
              textColor="#0c4a6e" 
            />
          )}
        </View>
      )}

      {/* Date */}
      {formatDate() && (
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
      {data.notes && (
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
};

export const AIResponseWithActions: React.FC<AIResponseWithActionsProps> = ({
  message,
  actions,
  confidence,
  onValidateAction,
  onEditAction,
  onRejectAction,
}) => {
  const hasActions = actions && actions.length > 0;
  const { activeFarm } = useFarm();
  const { user } = useAuth();
  
  // État pour le modal d'édition
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionData | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(0);

  const handleEditAction = (index: number, action: ActionData) => {
    setEditingAction(action);
    setEditingIndex(index);
    setEditModalVisible(true);
  };

  const handleSaveAction = async (updatedAction: ActionData) => {
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
      
      // Récupérer created_record_id depuis la DB
      const existingRecordId = await AIChatService.getExistingRecordId(validatedAction.id!);
      console.log('🔍 [AUTO-VALIDATE] Existing record ID:', existingRecordId);
      
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
  };

  return (
    <View style={{
      alignSelf: 'flex-start',
      maxWidth: Platform.select({ web: '90%', default: '92%' }),
      marginBottom: spacing.lg,
      width: '100%',
    }}>
      {/* Message court de l'IA */}
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
          {actions.map((action, index) => (
            <ActionCard
              key={action.id || index}
              action={action}
              index={index}
              total={actions.length}
              onValidate={() => onValidateAction?.(index, action)}
              onEdit={() => handleEditAction(index, action)}
              onReject={() => onRejectAction?.(index, action)}
            />
          ))}
        </View>
      )}

      {/* Modal d'édition */}
      <ActionEditModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setEditingAction(null);
        }}
        action={editingAction}
        onSave={handleSaveAction}
      />
    </View>
  );
};

export default AIResponseWithActions;

