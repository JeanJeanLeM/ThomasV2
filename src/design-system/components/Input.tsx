import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Platform,
} from 'react-native';
import { colors } from '../colors';
import { textStyles } from '../typography';
import { spacing } from '../spacing';
import { getWebInputStyle, getWebTextAreaStyle } from '../styles/webInputStyles';

// Import CSS pour supprimer les styles natifs sur web
if (typeof window !== 'undefined') {
  require('./Input.css');
}

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  required = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const hasError = !!error;

  // Container styles
  const getContainerStyle = (): ViewStyle => ({
    marginBottom: spacing.md,
  });

  // Input container styles
  const getInputContainerStyle = (): ViewStyle => ({
    flexDirection: 'row',
    alignItems: props.multiline ? 'flex-start' : 'center', // Alignement en haut pour multiline
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    minHeight: props.multiline && props.numberOfLines 
      ? (props.numberOfLines * 20) + (spacing.md * 2) // Hauteur approximative par ligne + padding
      : spacing.interactive.inputHeight,
    backgroundColor: disabled ? colors.gray[50] : colors.background.secondary,
    borderColor: hasError
      ? colors.border.error
      : isFocused
      ? colors.border.focus
      : colors.border.primary,
    // Éviter les effets de superposition
    overflow: 'hidden',
    // Ombre subtile au focus pour améliorer la visibilité
    ...(isFocused && !hasError && {
      shadowColor: colors.border.focus,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    }),
    // Styles spécifiques pour le web
    ...Platform.select({
      web: {
        display: 'flex',
        boxSizing: 'border-box',
        width: '100%',
        // ✅ FORCER le fond blanc sur web
        backgroundColor: disabled ? '#f9fafb' : '#ffffff',
      } as any,
    }),
  });

  // Input styles
  const getInputStyle = (): TextStyle => {
    const baseStyle = {
      ...textStyles.input,
      flex: 1,
      color: disabled ? colors.text.tertiary : colors.text.primary,
      paddingVertical: props.multiline ? spacing.sm : spacing.md, // Moins de padding pour multiline
      // Supprimer complètement toutes les bordures natives
      borderWidth: 0,
      outline: 'none', // Pour le web
      boxShadow: 'none', // Pour le web
      WebkitAppearance: 'none', // Pour Safari
      appearance: 'none', // Pour les autres navigateurs
      // Assurer que le texte prend toute la largeur disponible
      width: '100%',
      textAlignVertical: props.multiline ? 'top' : 'center', // Alignement en haut pour multiline
      // Styles spécifiques pour le web
      ...Platform.select({
        web: {
          resize: 'none', // Empêcher le redimensionnement sur web
          fontFamily: 'inherit', // Utiliser la police du parent
          fontSize: 16, // Taille fixe pour éviter le zoom sur mobile
          lineHeight: 20, // Hauteur de ligne cohérente
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: props.multiline ? 'pre-wrap' : 'nowrap',
          minWidth: 0, // Important pour le flex
          maxWidth: '100%',
          width: '100%', // Forcer la largeur à 100% pour le placeholder
          boxSizing: 'border-box', // Inclure padding dans la largeur
        } as any,
      }),
    } as TextStyle;

    // ✅ Appliquer les styles web pour forcer le fond blanc
    if (Platform.OS === 'web') {
      if (props.multiline) {
        return getWebTextAreaStyle(baseStyle);
      } else {
        return getWebInputStyle(baseStyle);
      }
    }

    return baseStyle;
  };

  // Label styles
  const getLabelStyle = (): TextStyle => ({
    ...textStyles.label,
    marginBottom: spacing.sm,
    color: hasError ? colors.text.error : colors.text.secondary,
  });

  // iOS: `numeric` / `number-pad` n'affichent pas toujours de séparateur décimal.
  // On force un clavier décimal pour permettre la saisie de valeurs non entières.
  const effectiveKeyboardType =
    Platform.OS === 'ios' && keyboardType === 'numeric'
      ? 'decimal-pad'
      : keyboardType;

  const handleChangeText = (text: string) => {
    if (!onChangeText) return;
    // Permet `,` ou `.` sur iOS tout en gardant un format exploitable par parseFloat.
    const normalizedText =
      Platform.OS === 'ios' && effectiveKeyboardType === 'decimal-pad'
        ? text.replace(',', '.')
        : text;
    onChangeText(normalizedText);
  };

  const toggleSecureEntry = () => {
    setIsSecure(!isSecure);
  };

  return (
    <View style={[getContainerStyle(), containerStyle]}>
      {/* Label */}
      {label && (
        <Text style={[getLabelStyle(), labelStyle]}>
          {label}
          {required && <Text style={{ color: colors.semantic.error }}> *</Text>}
        </Text>
      )}

      {/* Input Container */}
      <View 
        style={getInputContainerStyle()}
        {...(Platform.OS === 'web' && props.multiline && { 
          className: 'thomas-input-container-multiline' 
        })}
      >
        {/* Left Icon */}
        {leftIcon && (
          <View style={{ 
            marginRight: spacing.sm,
            alignSelf: props.multiline ? 'flex-start' : 'center',
            marginTop: props.multiline ? spacing.sm : 0,
          }}>
            {leftIcon}
          </View>
        )}

        {/* Text Input */}
        <TextInput
          style={[
            getInputStyle(), 
            inputStyle,
            // Assurer que le TextInput prend toute la largeur disponible
            Platform.OS === 'web' && {
              flex: 1,
              minWidth: 0,
              width: '100%',
            } as any,
          ]}
          // Classe CSS spécifique pour supprimer tous les styles natifs
          {...(typeof window !== 'undefined' && { className: 'thomas-input' })}
          value={value}
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          secureTextEntry={isSecure}
          placeholderTextColor={colors.text.tertiary}
          {...props}
          keyboardType={effectiveKeyboardType}
        />

        {/* Right Icon */}
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={{ 
              marginLeft: spacing.sm,
              alignSelf: props.multiline ? 'flex-start' : 'center',
              marginTop: props.multiline ? spacing.sm : 0,
            }}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}

        {/* Password Toggle */}
        {secureTextEntry && (
          <TouchableOpacity
            onPress={toggleSecureEntry}
            style={{ marginLeft: spacing.sm }}
          >
            <Text style={{ color: colors.primary[600], fontSize: 12 }}>
              {isSecure ? 'Voir' : 'Cacher'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text style={[textStyles.error, { marginTop: spacing.xs }]}>
          {error}
        </Text>
      )}

      {/* Hint Message */}
      {hint && !error && (
        <Text style={[textStyles.caption, { marginTop: spacing.xs }]}>
          {hint}
        </Text>
      )}
    </View>
  );
};
