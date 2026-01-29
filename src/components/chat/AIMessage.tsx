import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../design-system/components';
import { colors } from '../../design-system/colors';
import { spacing } from '../../design-system/spacing';
import { AnalyzedAction, AIChatService } from '../../services/aiChatService';
import { ActionCard } from './ActionCard';
import { ActionCarousel } from './ActionCarousel';
import { TypingIndicator } from './TypingIndicator';
import { useFarm } from '../../contexts/FarmContext';
import { useAuth } from '../../contexts/AuthContext';

interface AIMessageProps {
  messageId: string;
  content: string;
  isAnalyzing?: boolean;
  onActionValidated?: (actionId: string, action: AnalyzedAction) => void;
  onActionRejected?: (actionId: string, action: AnalyzedAction) => void;
  onAllActionsProcessed?: () => void;
}

export const AIMessage: React.FC<AIMessageProps> = ({
  messageId,
  content,
  isAnalyzing = false,
  onActionValidated,
  onActionRejected,
  onAllActionsProcessed
}) => {
  const [actions, setActions] = useState<AnalyzedAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const { activeFarm } = useFarm();
  const { user } = useAuth();

  // Charger les actions analysées au montage
  useEffect(() => {
    loadActions();
  }, [messageId]);

  // Vérifier si toutes les actions sont traitées
  useEffect(() => {
    const pendingActions = actions.filter(a => a.user_status === 'pending');
    if (actions.length > 0 && pendingActions.length === 0) {
      onAllActionsProcessed?.();
    }
  }, [actions]);

  const loadActions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const loadedActions = await AIChatService.getActionsForMessage(messageId);
      setActions(loadedActions);
      
      // Calculer la confiance moyenne
      if (loadedActions.length > 0) {
        const avgConfidence = loadedActions.reduce((sum, action) => sum + (action.confidence_score || 0), 0) / loadedActions.length;
        setConfidence(avgConfidence);
      }
    } catch (err) {
      console.error('Erreur chargement actions:', err);
      setError('Impossible de charger les actions analysées');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async (actionId: string, modifications?: any) => {
    try {
      const action = actions.find(a => a.id === actionId);
      if (!action) return;

      // Mettre à jour localement
      setActions(prevActions =>
        prevActions.map(a =>
          a.id === actionId
            ? {
                ...a,
                user_status: modifications ? 'modified' : 'validated',
                user_modifications: modifications || a.user_modifications
              }
            : a
        )
      );

      onActionValidated?.(actionId, action);

      // Créer la tâche/observation correspondante
      if (!activeFarm?.farm_id || !user?.id) {
        console.warn('⚠️ [VALIDATE] Contexte manquant - farm_id ou user_id');
        return;
      }
      
      if (action.action_type === 'task_done' || action.action_type === 'task_planned' || action.action_type === 'harvest') {
        const taskId = await AIChatService.createTaskFromAction(action, activeFarm.farm_id, user.id);
        console.log('✅ [VALIDATE] Tâche créée:', taskId);
      } else if (action.action_type === 'observation') {
        await AIChatService.createObservationFromAction(action, activeFarm.farm_id, user.id);
      }
    } catch (error) {
      console.error('Erreur validation action:', error);
      // Recharger en cas d'erreur
      loadActions();
    }
  };

  const handleReject = async (actionId: string) => {
    try {
      const action = actions.find(a => a.id === actionId);
      if (!action) return;

      // Mettre à jour localement
      setActions(prevActions =>
        prevActions.map(a =>
          a.id === actionId
            ? { ...a, user_status: 'rejected' }
            : a
        )
      );

      onActionRejected?.(actionId, action);
    } catch (error) {
      console.error('Erreur rejet action:', error);
      // Recharger en cas d'erreur
      loadActions();
    }
  };

  const handleEdit = (actionId: string) => {
    // L'édition est gérée directement dans ActionCard
    console.log('Édition action:', actionId);
  };

  // Message d'analyse en cours - avec animation typing moderne
  if (isAnalyzing) {
    return (
      <TypingIndicator 
        statusMessages={[
          "Thomas analyse votre message...",
          "Classification des données agricoles...",
          "Identification des cultures et parcelles...",
          "Extraction des quantités et dates...",
          "Préparation de la réponse..."
        ]}
        messageInterval={2500}
        showIcon={true}
      />
    );
  }

  // Erreur de chargement
  if (error) {
    return (
      <View style={{
        backgroundColor: colors.error[50],
        borderRadius: 16,
        padding: spacing.md,
        marginVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.error[200]
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.sm
        }}>
          <Ionicons name="warning" size={18} color={colors.error[600]} />
          <Text variant="bodyMedium" weight="medium" color={colors.error[700]} style={{ marginLeft: spacing.sm }}>
            Erreur d'analyse
          </Text>
        </View>
        <Text variant="body" color={colors.error[600]}>
          {error}
        </Text>
      </View>
    );
  }

  // Chargement des actions
  if (isLoading) {
    return (
      <View style={{
        backgroundColor: colors.gray[50],
        borderRadius: 16,
        padding: spacing.md,
        marginVertical: spacing.sm,
        alignItems: 'center'
      }}>
        <ActivityIndicator size="small" color={colors.gray[400]} />
        <Text variant="caption" color={colors.gray[500]} style={{ marginTop: spacing.xs }}>
          Chargement des actions...
        </Text>
      </View>
    );
  }

  // Message d'aide ou sans actions
  if (actions.length === 0) {
    return (
      <View style={{
        backgroundColor: colors.gray[50],
        borderRadius: 16,
        padding: spacing.md,
        marginVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.gray[200]
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.sm
        }}>
          <View style={{
            backgroundColor: colors.gray[200],
            padding: spacing.xs,
            borderRadius: 20,
            marginRight: spacing.sm
          }}>
            <Ionicons name="chatbubble" size={18} color={colors.gray[600]} />
          </View>
          <Text variant="bodyMedium" weight="medium" color={colors.gray[700]}>
            Assistant IA
          </Text>
        </View>
        <Text variant="body" color={colors.gray[600]}>
          {content}
        </Text>
      </View>
    );
  }

  // Actions analysées
  return (
    <View style={{
      backgroundColor: colors.primary[25],
      borderRadius: 16,
      padding: spacing.md,
      marginVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.primary[200]
    }}>
      {/* En-tête de l'IA */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            backgroundColor: colors.primary[100],
            padding: spacing.xs,
            borderRadius: 20,
            marginRight: spacing.sm
          }}>
            <Ionicons name="bulb" size={18} color={colors.primary[600]} />
          </View>
          <Text variant="bodyMedium" weight="medium" color={colors.primary[700]}>
            Assistant IA
          </Text>
        </View>

        {confidence !== null && (
          <View style={{
            backgroundColor: colors.primary[100],
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: 12
          }}>
            <Text variant="caption" color={colors.primary[700]} weight="medium">
              Confiance: {Math.round(confidence * 100)}%
            </Text>
          </View>
        )}
      </View>

      {/* Message d'analyse */}
      <Text variant="body" color={colors.primary[700]} style={{ marginBottom: spacing.md }}>
        J'ai analysé votre message et identifié {actions.length} action{actions.length > 1 ? 's' : ''} :
      </Text>

      {/* Carousel ou carte unique */}
      <ActionCarousel
        actions={actions}
        onValidate={handleValidate}
        onReject={handleReject}
        onEdit={handleEdit}
      />
    </View>
  );
};




