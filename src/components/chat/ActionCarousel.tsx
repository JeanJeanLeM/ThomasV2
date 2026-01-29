import React, { useRef, useState } from 'react';
import { View, ScrollView, Dimensions } from 'react-native';
import { Text } from '../../design-system/components';
import { colors } from '../../design-system/colors';
import { spacing } from '../../design-system/spacing';
import { AnalyzedAction } from '../../services/aiChatService';
import { ActionCard } from './ActionCard';

interface ActionCarouselProps {
  actions: AnalyzedAction[];
  onValidate?: (actionId: string, modifications?: any) => void;
  onReject?: (actionId: string) => void;
  onEdit?: (actionId: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth * 0.85; // 85% de la largeur d'écran

export const ActionCarousel: React.FC<ActionCarouselProps> = ({
  actions,
  onValidate,
  onReject,
  onEdit
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / cardWidth);
    setCurrentIndex(newIndex);
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * cardWidth,
      animated: true
    });
    setCurrentIndex(index);
  };

  if (actions.length === 0) {
    return null;
  }

  if (actions.length === 1) {
    // Si une seule action, afficher directement la card
    return (
      <View style={{ paddingHorizontal: spacing.md }}>
        <ActionCard
          action={actions[0]}
          onValidate={onValidate}
          onReject={onReject}
          onEdit={onEdit}
        />
      </View>
    );
  }

  return (
    <View>
      {/* En-tête avec compteur */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm
      }}>
        <Text variant="bodyMedium" weight="medium" color={colors.gray[700]}>
          Actions détectées
        </Text>
        <Text variant="caption" color={colors.gray[500]}>
          {currentIndex + 1} sur {actions.length}
        </Text>
      </View>

      {/* Carousel des actions */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={{
          paddingHorizontal: (screenWidth - cardWidth) / 2
        }}
        snapToInterval={cardWidth}
        decelerationRate="fast"
      >
        {actions.map((action, index) => (
          <View
            key={action.id}
            style={{
              width: cardWidth,
              paddingHorizontal: spacing.xs
            }}
          >
            <ActionCard
              action={action}
              onValidate={onValidate}
              onReject={onReject}
              onEdit={onEdit}
            />
          </View>
        ))}
      </ScrollView>

      {/* Indicateurs de pagination */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.sm,
        gap: spacing.xs
      }}>
        {actions.map((_, index) => (
          <View
            key={index}
            style={{
              width: currentIndex === index ? 20 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: currentIndex === index 
                ? colors.primary[600] 
                : colors.gray[300]
            }}
          />
        ))}
      </View>

      {/* Navigation rapide si plus de 3 actions */}
      {actions.length > 3 && (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          marginTop: spacing.sm,
          gap: spacing.xs
        }}>
          {actions.map((action, index) => {
            const getActionIcon = (type: string) => {
              switch (type) {
                case 'observation': return '👁️';
                case 'task_done': return '✅';
                case 'task_planned': return '📅';
                case 'config': return '⚙️';
                case 'help': return '❓';
                default: return '📝';
              }
            };

            return (
              <View
                key={action.id}
                style={{
                  backgroundColor: currentIndex === index 
                    ? colors.primary[100] 
                    : colors.gray[100],
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 4,
                  borderRadius: 12,
                  borderWidth: currentIndex === index ? 1 : 0,
                  borderColor: colors.primary[300]
                }}
              >
                <Text variant="caption">
                  {getActionIcon(action.action_type)} {index + 1}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Actions globales */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
        gap: spacing.sm
      }}>
        <View style={{
          backgroundColor: colors.success[50],
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.success[200]
        }}>
          <Text variant="caption" color={colors.success[700]}>
            {actions.filter(a => a.user_status === 'validated' || a.user_status === 'modified').length} validées
          </Text>
        </View>
        
        <View style={{
          backgroundColor: colors.warning[50],
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.warning[200]
        }}>
          <Text variant="caption" color={colors.warning[700]}>
            {actions.filter(a => a.user_status === 'pending').length} en attente
          </Text>
        </View>
        
        {actions.filter(a => a.user_status === 'rejected').length > 0 && (
          <View style={{
            backgroundColor: colors.error[50],
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.error[200]
          }}>
            <Text variant="caption" color={colors.error[700]}>
              {actions.filter(a => a.user_status === 'rejected').length} rejetées
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};




