import React, { ReactNode, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
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
const SCROLL_STYLE = { flex: 1 };

export const StandardFormModal: React.FC<StandardFormModalProps> = ({
  visible,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
  infoBanner,
}) => {
  const bannerStyle = useMemo(() => {
    if (!infoBanner) return null;
    const bg = infoBanner.type === 'warning' ? colors.semantic.warning + '15'
      : infoBanner.type === 'success' ? colors.semantic.success + '15'
      : colors.primary[50];
    const border = infoBanner.type === 'warning' ? colors.semantic.warning
      : infoBanner.type === 'success' ? colors.semantic.success
      : colors.primary[600];
    return { backgroundColor: bg, borderLeftColor: border };
  }, [infoBanner?.type, infoBanner?.text]);

  const bannerTextStyle = useMemo(() => {
    const color = !infoBanner
      ? colors.primary[600]
      : infoBanner.type === 'warning' ? colors.semantic.warning
      : infoBanner.type === 'success' ? colors.semantic.success
      : colors.primary[600];
    return { color };
  }, [infoBanner?.type]);

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
        style={SCROLL_STYLE}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        {...(Platform.OS === 'android' ? { collapsable: false } : {})}
      >
        {/* Bannière informative */}
        {infoBanner && bannerStyle && (
          <View style={[styles.banner, bannerStyle]}>
            <Text style={[styles.bannerText, bannerTextStyle]}>
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
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  
  sectionDescription: {
    fontSize: 13,
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