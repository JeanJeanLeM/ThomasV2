import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card } from '../../design-system/components';
import { colors } from '../../design-system/colors';
import { spacing } from '../../design-system/spacing';
import { AnalyzedAction, AIChatService } from '../../services/aiChatService';
import { hasQuantityData, sanitizeQuantityType } from '../../utils/quantityUtils';

interface ActionCardProps {
  action: AnalyzedAction;
  onValidate?: (actionId: string, modifications?: any) => void;
  onReject?: (actionId: string) => void;
  onEdit?: (actionId: string) => void;
  isCompact?: boolean;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  action,
  onValidate,
  onReject,
  onEdit,
  isCompact = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(action.decomposed_text);
  const [isProcessing, setIsProcessing] = useState(false);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'observation': return 'eye-outline';
      case 'task_done': return 'checkmark-circle-outline';
      case 'task_planned': return 'calendar-outline';
      case 'config': return 'settings-outline';
      case 'help': return 'help-circle-outline';
      case 'sale': return 'trending-up-outline';
      case 'purchase': return 'trending-down-outline';
      default: return 'document-text-outline';
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'observation': return colors.warning[600];
      case 'task_done': return colors.success[600];
      case 'task_planned': return colors.primary[600];
      case 'config': return colors.purple[600];
      case 'help': return colors.gray[600];
      case 'sale': return colors.success[600];
      case 'purchase': return colors.primary[600];
      default: return colors.gray[500];
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'observation': return 'Observation';
      case 'task_done': return 'Tâche effectuée';
      case 'task_planned': return 'Tâche planifiée';
      case 'config': return 'Configuration';
      case 'help': return 'Aide';
      case 'sale': return 'Vente enregistrée';
      case 'purchase': return 'Achat enregistré';
      default: return 'Action';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return colors.success[500];
      case 'modified': return colors.primary[500];
      case 'rejected': return colors.error[500];
      case 'pending': return colors.warning[500];
      default: return colors.gray[400];
    }
  };

  const handleValidate = async () => {
    setIsProcessing(true);
    try {
      const modifications = editedText !== action.decomposed_text ? { decomposed_text: editedText } : undefined;
      await AIChatService.validateAction(action.id, modifications);
      onValidate?.(action.id, modifications);
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur validation:', error);
    }
    setIsProcessing(false);
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await AIChatService.rejectAction(action.id);
      onReject?.(action.id);
    } catch (error) {
      console.error('Erreur rejet:', error);
    }
    setIsProcessing(false);
  };

  const actionColor = getActionColor(action.action_type);

  if (isCompact) {
    return (
      <TouchableOpacity
        style={{
          backgroundColor: colors.background.primary,
          borderRadius: 8,
          padding: spacing.sm,
          marginVertical: spacing.xs,
          borderLeftWidth: 3,
          borderLeftColor: actionColor,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
        onPress={() => onEdit?.(action.id)}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons 
            name={getActionIcon(action.action_type) as any} 
            size={20} 
            color={actionColor}
            style={{ marginRight: spacing.sm }}
          />
          <View style={{ flex: 1 }}>
            <Text variant="bodySmall" numberOfLines={1}>
              {action.decomposed_text}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text variant="caption" color={colors.gray[500]}>
                {getActionLabel(action.action_type)}
              </Text>
              {action.confidence_score && (
                <Text variant="caption" color={colors.gray[400]} style={{ marginLeft: spacing.xs }}>
                  • {Math.round(action.confidence_score * 100)}%
                </Text>
              )}
            </View>
          </View>
        </View>
        
        <View style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: getStatusColor(action.user_status)
        }} />
      </TouchableOpacity>
    );
  }

  return (
    <Card style={{ marginVertical: spacing.sm }}>
      {/* En-tête avec type et confiance */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            backgroundColor: actionColor + '20',
            padding: spacing.xs,
            borderRadius: 20,
            marginRight: spacing.sm
          }}>
            <Ionicons name={getActionIcon(action.action_type) as any} size={18} color={actionColor} />
          </View>
          <Text variant="bodyMedium" weight="medium" color={actionColor}>
            {getActionLabel(action.action_type)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {action.confidence_score && (
            <View style={{
              backgroundColor: colors.gray[100],
              paddingHorizontal: spacing.xs,
              paddingVertical: 2,
              borderRadius: 12,
              marginRight: spacing.xs
            }}>
              <Text variant="caption" color={colors.gray[600]}>
                {Math.round(action.confidence_score * 100)}%
              </Text>
            </View>
          )}
          
          <View style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: getStatusColor(action.user_status)
          }} />
        </View>
      </View>

      {/* Texte de l'action */}
      <View style={{ marginBottom: spacing.sm }}>
        {isEditing ? (
          <TextInput
            style={{
              backgroundColor: colors.gray[50],
              borderRadius: 8,
              padding: spacing.sm,
              borderWidth: 1,
              borderColor: colors.primary[300],
              fontSize: 16,
              color: colors.text.primary,
              minHeight: 80
            }}
            value={editedText}
            onChangeText={setEditedText}
            multiline
            placeholder="Modifier l'action..."
            autoFocus
          />
        ) : (
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            style={{
              backgroundColor: colors.gray[25],
              borderRadius: 8,
              padding: spacing.sm,
              borderWidth: 1,
              borderColor: colors.gray[200],
              borderStyle: 'dashed'
            }}
          >
            <Text variant="body">
              {action.decomposed_text}
            </Text>
            <Text variant="caption" color={colors.gray[500]} style={{ marginTop: spacing.xs }}>
              Appuyez pour modifier
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Données extraites - masquées pour les récoltes */}
      {action.action_type !== 'harvest' && Object.keys(action.extracted_data).length > 0 && (
        <View style={{
          backgroundColor: colors.gray[50],
          borderRadius: 8,
          padding: spacing.sm,
          marginBottom: spacing.sm
        }}>
          <Text variant="caption" color={colors.gray[600]} style={{ marginBottom: spacing.xs }}>
            Données détectées:
          </Text>
          
          {action.extracted_data.crop && (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text variant="caption" color={colors.gray[500]}>Culture: </Text>
              <Text variant="caption" weight="medium">{action.extracted_data.crop}</Text>
            </View>
          )}
          
          {action.extracted_data.quantity && action.extracted_data.quantity.value > 0 && (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text variant="caption" color={colors.gray[500]}>Quantité: </Text>
              <Text variant="caption" weight="medium">
                {action.extracted_data.quantity.value} {action.extracted_data.quantity.unit}
              </Text>
              {action.extracted_data.quantity_converted && (
                <Text variant="caption" color={colors.primary[600]}>
                  {' '}→ {action.extracted_data.quantity_converted.value} {action.extracted_data.quantity_converted.unit}
                </Text>
              )}
            </View>
          )}
          
          {action.extracted_data.issue && (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text variant="caption" color={colors.gray[500]}>Problème: </Text>
              <Text variant="caption" weight="medium">{action.extracted_data.issue}</Text>
            </View>
          )}
          
          {action.context.plot_ids && action.context.plot_ids.length > 0 && (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text variant="caption" color={colors.gray[500]}>Parcelles: </Text>
              <Text variant="caption" weight="medium">{action.context.plot_ids.length} identifiée(s)</Text>
            </View>
          )}
        </View>
      )}

      {/* Affichage quantité (garde-fou: section affichée seulement si quantité réelle) */}
      {hasQuantityData(action.extracted_data) && (
        <View style={{
          backgroundColor: colors.gray[50],
          borderRadius: 8,
          padding: spacing.sm,
          marginBottom: spacing.sm
        }}>
          <Text variant="caption" color={colors.gray[600]} style={{ marginBottom: spacing.xs }}>
            Informations quantité:
          </Text>
          
          {/* Quantité utilisateur */}
          {action.extracted_data.quantity && action.extracted_data.quantity.value > 0 && (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text variant="caption" color={colors.gray[500]}>Quantité: </Text>
              <Text variant="caption" weight="medium">
                {action.extracted_data.quantity.value} {action.extracted_data.quantity.unit}
              </Text>
            </View>
          )}

          {/* Quantité convertie */}
          {action.extracted_data.quantity_converted && action.extracted_data.quantity_converted.value > 0 && (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text variant="caption" color={colors.gray[500]}>Converti: </Text>
              <Text variant="caption" weight="medium">
                {action.extracted_data.quantity_converted.value} {action.extracted_data.quantity_converted.unit}
              </Text>
            </View>
          )}
          
          {action.extracted_data.quantity_nature && (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text variant="caption" weight="medium">{action.extracted_data.quantity_nature}</Text>
            </View>
          )}
          
          {sanitizeQuantityType(action.extracted_data) && (
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text variant="caption" weight="medium">{sanitizeQuantityType(action.extracted_data)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions de validation */}
      <View style={{
        flexDirection: 'row',
        gap: spacing.sm
      }}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: colors.success[600],
                paddingVertical: spacing.sm,
                borderRadius: 8,
                alignItems: 'center',
                opacity: isProcessing ? 0.5 : 1
              }}
              onPress={handleValidate}
              disabled={isProcessing}
            >
              <Text variant="bodyMedium" color={colors.text.inverse} weight="medium">
                {isProcessing ? 'Sauvegarde...' : 'Sauvegarder'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.gray[300]
              }}
              onPress={() => {
                setEditedText(action.decomposed_text);
                setIsEditing(false);
              }}
            >
              <Text variant="bodyMedium" color={colors.text.secondary}>
                Annuler
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: colors.success[600],
                paddingVertical: spacing.sm,
                borderRadius: 8,
                alignItems: 'center',
                opacity: isProcessing ? 0.5 : 1
              }}
              onPress={handleValidate}
              disabled={isProcessing}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="checkmark" size={16} color={colors.text.inverse} />
                <Text variant="bodyMedium" color={colors.text.inverse} weight="medium" style={{ marginLeft: spacing.xs }}>
                  Valider
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.error[300],
                opacity: isProcessing ? 0.5 : 1
              }}
              onPress={handleReject}
              disabled={isProcessing}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="close" size={16} color={colors.error[600]} />
                <Text variant="bodyMedium" color={colors.error[600]} style={{ marginLeft: spacing.xs }}>
                  Rejeter
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Texte original en petit */}
      {action.original_text !== action.decomposed_text && (
        <View style={{
          marginTop: spacing.sm,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.gray[200]
        }}>
          <Text variant="caption" color={colors.gray[500]}>
            Texte original: "{action.original_text}"
          </Text>
        </View>
      )}
    </Card>
  );
};




