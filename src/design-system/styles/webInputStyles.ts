import { Platform, TextStyle } from 'react-native';
import { colors } from '../colors';
import { spacing } from '../spacing';

/**
 * Styles spécifiques pour les TextInput sur web
 * Corrige les problèmes de fond et bordure
 */
export const getWebInputStyle = (baseStyle?: TextStyle | TextStyle[]): TextStyle => {
  if (Platform.OS !== 'web') {
    return Array.isArray(baseStyle) ? {} : (baseStyle || {});
  }

  // Si baseStyle est un array, on le merge
  const mergedBaseStyle = Array.isArray(baseStyle) 
    ? Object.assign({}, ...baseStyle.filter(Boolean))
    : (baseStyle || {});

  return {
    ...mergedBaseStyle,
    // 🔥 FORCER les styles sur web
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.gray[400],
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
    // Ombres légères
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  };
};

/**
 * Style pour les TextInput avec erreur sur web
 */
export const getWebInputErrorStyle = (baseStyle?: TextStyle | TextStyle[]): TextStyle => {
  if (Platform.OS !== 'web') {
    return Array.isArray(baseStyle) ? {} : (baseStyle || {});
  }

  return {
    ...getWebInputStyle(baseStyle),
    borderColor: colors.semantic.error,
    borderWidth: 2,
  };
};

/**
 * Style pour les TextArea sur web
 */
export const getWebTextAreaStyle = (baseStyle?: TextStyle | TextStyle[]): TextStyle => {
  if (Platform.OS !== 'web') {
    return Array.isArray(baseStyle) ? {} : (baseStyle || {});
  }

  // Si baseStyle est un array, on le merge
  const mergedBaseStyle = Array.isArray(baseStyle) 
    ? Object.assign({}, ...baseStyle.filter(Boolean))
    : (baseStyle || {});

  return {
    ...getWebInputStyle(mergedBaseStyle),
    height: 80,
    textAlignVertical: 'top' as const,
  };
};
