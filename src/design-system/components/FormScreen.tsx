import React, { ReactNode } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { UnifiedHeader } from './UnifiedHeader';
import { Button } from './Button';
import { Text } from './Text';

export interface FormScreenProps {
  title: string;
  onBack: () => void;
  primaryAction: {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
  secondaryAction?: {
    title: string;
    onPress: () => void;
  };
  children: ReactNode;
  infoBanner?: {
    text: string;
    type?: 'info' | 'warning' | 'success';
  };
}

/**
 * 🎯 COMPOSANT FORMSCREEN STANDARDISÉ
 * 
 * ✅ UTILISATION :
 * - Pour les formulaires en plein écran (non-modals)
 * - Structure unifiée avec header et boutons sticky
 * - Bannière informative optionnelle
 * - Scroll automatique avec padding approprié
 * 
 * 🚨 RÈGLES :
 * - Utiliser FormSection pour organiser le contenu
 * - EnhancedInput pour tous les champs de saisie
 * - Boutons sticky en bas d'écran
 * - Background gris avec sections blanches
 */
export const FormScreen: React.FC<FormScreenProps> = ({
  title,
  onBack,
  primaryAction,
  secondaryAction,
  children,
  infoBanner,
}) => {
  const getBannerColor = () => {
    switch (infoBanner?.type) {
      case 'warning': return colors.semantic.warning;
      case 'success': return colors.semantic.success;
      default: return colors.primary[600];
    }
  };

  const getBannerBgColor = () => {
    switch (infoBanner?.type) {
      case 'warning': return colors.semantic.warning + '10';
      case 'success': return colors.semantic.success + '10';
      default: return colors.primary[50];
    }
  };

  return (
    <View style={styles.container}>
      <UnifiedHeader title={title} onBack={onBack} showBackButton />
      
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* Bannière informative */}
        {infoBanner && (
          <View style={[
            styles.banner,
            {
              backgroundColor: getBannerBgColor(),
              borderLeftColor: getBannerColor(),
            }
          ]}>
            <Text style={[styles.bannerText, { color: getBannerColor() }]}>
              {infoBanner.text}
            </Text>
          </View>
        )}
        
        {/* Contenu du formulaire */}
        <View style={styles.content}>
          {children}
        </View>
      </ScrollView>
      
      {/* Boutons sticky */}
      <View style={styles.stickyButtons}>
        <View style={styles.buttonContainer}>
          {secondaryAction && (
            <Button 
              title={secondaryAction.title} 
              variant="outline" 
              onPress={secondaryAction.onPress}
              style={styles.button}
            />
          )}
          <Button 
            title={primaryAction.title} 
            variant="primary" 
            onPress={primaryAction.onPress}
            loading={primaryAction.loading}
            disabled={primaryAction.disabled}
            style={styles.button}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollContent: {
    paddingBottom: 100, // Espace pour les boutons sticky
  },
  banner: {
    margin: spacing.lg,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  bannerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  stickyButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
});
