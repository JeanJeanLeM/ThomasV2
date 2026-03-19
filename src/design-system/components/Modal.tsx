import React, { useMemo } from 'react';
import {
  Modal as RNModal,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewStyle,
  ModalProps as RNModalProps,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { Text } from './Text';
import { Button } from './Button';

export interface ModalProps extends Omit<RNModalProps, 'children'> {
  children: React.ReactNode;
  title?: string;
  visible: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  primaryAction?: {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
  secondaryAction?: {
    title: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  title,
  visible,
  onClose,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  primaryAction,
  secondaryAction,
  style,
  ...props
}) => {
  // Modal container styles
  const getContainerStyle = (): ViewStyle => ({
    flex: 1,
    justifyContent: size === 'fullscreen' ? 'flex-start' : 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: size === 'fullscreen' ? 0 : spacing.lg,
  });

  // Modal content styles
  const getContentStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: colors.background.primary,
      borderRadius: 16,
      padding: spacing.xl,
      shadowColor: colors.gray[900],
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    };

    switch (size) {
      case 'sm':
        return {
          ...baseStyle,
          width: '80%',
          maxWidth: 300,
        };
      case 'md':
        return {
          ...baseStyle,
          width: '90%',
          maxWidth: 400,
        };
      case 'lg':
        return {
          ...baseStyle,
          width: '95%',
          maxWidth: 500,
          maxHeight: '85%', // Limiter la hauteur pour permettre le scroll
        };
      case 'fullscreen':
        return {
          ...baseStyle,
          backgroundColor: colors.gray[50], // ✅ FOND GRIS CLAIR pour contraste avec champs blancs
          width: '100%',
          height: '100%',
          borderRadius: 0,
          paddingHorizontal: spacing.layout.screenPadding,
          paddingTop: spacing.layout.screenPadding,
          paddingBottom: spacing.lg,
          justifyContent: 'space-between',
        };
      default:
        return baseStyle;
    }
  };

  // Header styles
  const getHeaderStyle = (): ViewStyle => ({
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: title ? spacing.lg : 0,
    ...(size === 'fullscreen' && {
      backgroundColor: colors.background.secondary, // Fond blanc pour le header fullscreen
      marginHorizontal: -spacing.layout.screenPadding,
      marginTop: -spacing.layout.screenPadding,
      paddingHorizontal: spacing.layout.screenPadding,
      paddingTop: spacing.layout.screenPadding,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.gray[200],
    }),
  });

  // Actions styles
  const getActionsStyle = (): ViewStyle => ({
    flexDirection: 'row',
    justifyContent: size === 'fullscreen' ? 'center' : 'flex-end',
    marginTop: size === 'fullscreen' ? 0 : spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: size === 'fullscreen' ? spacing.md : 0,
    gap: spacing.md,
    borderTopWidth: size === 'fullscreen' ? 1 : 0,
    borderTopColor: size === 'fullscreen' ? colors.gray[200] : 'transparent',
  });

  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  // Styles memoises pour eviter re-renders en boucle (Session id mismatch sur Android)
  const containerStyle = useMemo(() => getContainerStyle(), [size]);
  const contentStyle = useMemo(() => getContentStyle(), [size]);
  const headerStyle = useMemo(() => getHeaderStyle(), [size, title]);
  const actionsStyle = useMemo(() => getActionsStyle(), [size]);
  const contentAreaStyle = useMemo((): ViewStyle => ({
    flex: size === 'fullscreen' ? 1 : undefined,
    maxHeight: size === 'lg' ? 550 : size === 'md' ? 450 : size === 'sm' ? 350 : undefined,
    minHeight: 0,
    overflow: 'hidden',
  }), [size]);

  // Sur Android, ne pas utiliser KeyboardAvoidingView en fullscreen (cause layout thrash + InputConnection recree)
  const ContentWrapper = size === 'fullscreen' && Platform.OS === 'ios' ? KeyboardAvoidingView : View;
  const contentWrapperProps = useMemo(() => (
    size === 'fullscreen' && Platform.OS === 'ios'
      ? {
          behavior: 'padding' as const,
          style: [contentStyle, style],
          pointerEvents: 'auto' as const,
        }
      : {
          style: [contentStyle, style],
          pointerEvents: 'auto' as const,
        }
  ), [contentStyle, style, size]);

  const backdropStyle = useMemo<ViewStyle>(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }), []);
  const titleFlexStyle = useMemo<ViewStyle>(() => ({ flex: 1 }), []);
  const closeButtonStyle = useMemo<ViewStyle>(() => ({
    padding: spacing.sm,
    marginRight: -spacing.sm,
  }), []);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      {...props}
    >
      <View style={containerStyle}>
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={backdropStyle} />
        </TouchableWithoutFeedback>
        
        <ContentWrapper {...contentWrapperProps}>
          {/* Header */}
          {(title || showCloseButton) && (
            <View style={headerStyle}>
              {title && (
                <Text variant="h3" style={titleFlexStyle}>
                  {title}
                </Text>
              )}
              {showCloseButton && (
                <TouchableOpacity
                  onPress={onClose}
                  style={closeButtonStyle}
                >
                  <Text variant="h4" color={colors.gray[500]}>
                    ✕
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          <View style={contentAreaStyle}>
            {children}
          </View>

          {/* Actions */}
          {(primaryAction || secondaryAction) && (
            <View style={actionsStyle}>
              {secondaryAction && (
                <Button
                  title={secondaryAction.title}
                  variant="outline"
                  onPress={secondaryAction.onPress}
                />
              )}
              {primaryAction && (
                <Button
                  title={primaryAction.title}
                  variant="primary"
                  onPress={primaryAction.onPress}
                  loading={primaryAction.loading || false}
                  disabled={primaryAction.disabled || false}
                />
              )}
            </View>
          )}
        </ContentWrapper>
      </View>
    </RNModal>
  );
};
