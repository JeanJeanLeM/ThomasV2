import React, { ReactNode } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Modal } from './Modal';
import { Text } from './Text';
import { colors } from '../colors';
import { spacing } from '../spacing';

export interface StandardFormModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
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
  infoBanner?: {
    text: string;
    type?: 'info' | 'warning' | 'success';
  };
}

/**
 * 🎯 FORMULAIRE FULLSCREEN SIMPLE ET PROPRE
 * 
 * ✅ BONNES PRATIQUES :
 * - Modal fullscreen avec fond gris clair
 * - Champs blancs avec bordure unique
 * - Organisation en sections
 * - Bannière informative optionnelle
 */
export const StandardFormModal: React.FC<StandardFormModalProps> = ({
  visible,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
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
      case 'warning': return colors.semantic.warning + '15';
      case 'success': return colors.semantic.success + '15';
      default: return colors.primary[50];
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      size="fullscreen"
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
    >
      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
        {children}
      </ScrollView>
    </Modal>
  );
};

/**
 * 🎯 SECTION DE FORMULAIRE
 */
export interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  style?: any;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  style,
}) => {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description && (
        <Text style={styles.sectionDescription}>{description}</Text>
      )}
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
};

/**
 * 🎯 CHAMPS EN LIGNE
 */
export interface RowFieldsProps {
  children: ReactNode;
  gap?: number;
}

export const RowFields: React.FC<RowFieldsProps> = ({
  children,
  gap = spacing.md,
}) => {
  return (
    <View style={[styles.rowFields, { gap }]}>
      {children}
    </View>
  );
};

/**
 * 🎯 WRAPPER DE CHAMP
 */
export interface FieldWrapperProps {
  flex?: number;
  children: ReactNode;
}

export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  flex = 1,
  children,
}) => {
  return <View style={{ flex }}>{children}</View>;
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 20,
    gap: spacing.lg,
  },
  
  banner: {
    padding: spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  section: {
    gap: spacing.sm,
  },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  
  sectionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  
  sectionContent: {
    gap: spacing.sm,
  },
  
  rowFields: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});