import React from 'react';
import {
  View,
  TouchableOpacity,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { Text } from './Text';
import { FarmSelector } from './FarmSelector';
import { Ionicons } from '@expo/vector-icons';

export interface UnifiedHeaderProps {
  title: string;
  onBack?: (() => void) | undefined;
  onFarmSelector?: () => void;
  showBackButton?: boolean;
  style?: ViewStyle;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  title,
  onBack,
  onFarmSelector,
  showBackButton = true,
  style,
}) => {
  const { width } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  // Une seule zone de sécurité : celle du téléphone (insets), pas de padding supplémentaire
  const safeAreaTop = insets.top;
  
  // Hauteur fixe du header content pour un centrage parfait
  const headerContentHeight = 56;
  
  // Largeur des zones latérales (boutons)
  const sideWidth = 48;
  
  // Header container styles - responsive et sans contraintes
  const getContainerStyle = (): ViewStyle => ({
    backgroundColor: '#FFFFFF',
    paddingTop: safeAreaTop,
    paddingHorizontal: 0, // Pas de padding horizontal pour éviter les contraintes
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray?.[200] || '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  });

  // Header content styles - centrage parfait
  const getContentStyle = (): ViewStyle => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centrage principal
    height: headerContentHeight,
    paddingHorizontal: spacing.md,
    position: 'relative',
  });

  // Title container styles - centrage absolu
  const getTitleContainerStyle = (): ViewStyle => ({
    position: 'absolute',
    left: sideWidth + spacing.md,
    right: sideWidth + spacing.md,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  });

  // Side button container styles
  const getSideButtonContainerStyle = (isLeft: boolean): ViewStyle => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    [isLeft ? 'left' : 'right']: spacing.md,
    width: sideWidth,
    alignItems: isLeft ? 'flex-start' : 'flex-end',
    justifyContent: 'center',
    zIndex: 2,
  });

  // Back button styles
  const getBackButtonStyle = (): ViewStyle => ({
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray?.[100] || '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray?.[200] || '#E5E7EB',
    zIndex: 1000, // Assurer que le bouton reste cliquable
  });

  // Farm selector button styles
  const getFarmSelectorButtonStyle = (): ViewStyle => ({
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary?.[50] || '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary?.[200] || '#BBF7D0',
    zIndex: 1000, // Assurer que le bouton reste cliquable
  });

  return (
    <View style={[getContainerStyle(), style]}>
      <View style={getContentStyle()}>
        {/* Left side - Back button avec positionnement absolu */}
        <View style={getSideButtonContainerStyle(true)}>
          {showBackButton && onBack ? (
            <TouchableOpacity
              style={getBackButtonStyle()}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="chevron-back-outline" 
                color={colors.gray?.[700] || '#374151'} 
                size={20} 
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Center - Title avec positionnement absolu pour centrage parfait */}
        <View style={getTitleContainerStyle()}>
          <Text
            variant="h3"
            color={colors.text?.primary || '#111827'}
            align="center"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontWeight: '600',
              fontSize: 18,
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
        </View>

        {/* Right side - Farm selector avec positionnement absolu */}
        <View style={getSideButtonContainerStyle(false)}>
          {onFarmSelector ? (
            <TouchableOpacity
              style={getFarmSelectorButtonStyle()}
              onPress={onFarmSelector}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="business-outline" 
                color={colors.primary?.[600] || '#16A34A'} 
                size={20} 
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};
