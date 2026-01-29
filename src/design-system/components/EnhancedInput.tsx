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
  StyleSheet,
} from 'react-native';
import { colors } from '../colors';
import { textStyles } from '../typography';
import { spacing } from '../spacing';

export interface EnhancedInputProps extends Omit<TextInputProps, 'style'> {
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

/**
 * 🎯 INPUT SIMPLE ET PROPRE - SANS DOUBLES BORDURES
 * 
 * ✅ SOLUTION DÉFINITIVE :
 * - Container View avec bordure unique
 * - TextInput SANS aucune bordure/background
 * - Styles inline (pas de CSS externe qui ne fonctionne pas)
 */
export const EnhancedInput: React.FC<EnhancedInputProps> = ({
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
  secureTextEntry,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const hasError = !!error;

  // Déterminer la couleur de bordure
  const getBorderColor = () => {
    if (hasError) return colors.semantic.error;
    if (isFocused) return colors.primary[600];
    return colors.gray[400];
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <Text style={[styles.label, hasError && styles.labelError, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      {/* Input Container - SEUL ÉLÉMENT AVEC BORDURE */}
      <View 
        style={[
          styles.inputContainer,
          { borderColor: getBorderColor() },
          isFocused && styles.inputContainerFocused,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}

        {/* TextInput - AUCUNE BORDURE, AUCUN BACKGROUND */}
        <TextInput
          style={[
            styles.input,
            props.multiline && styles.inputMultiline,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          secureTextEntry={isSecure}
          placeholderTextColor={colors.gray[400]}
          {...props}
        />

        {/* Right Icon */}
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}

        {/* Password Toggle */}
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setIsSecure(!isSecure)} style={styles.rightIcon}>
            <Text style={styles.toggleText}>
              {isSecure ? 'Voir' : 'Cacher'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}

      {/* Hint Message */}
      {hint && !error && (
        <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  
  labelError: {
    color: colors.semantic.error,
  },
  
  required: {
    color: colors.semantic.error,
  },

  // 🎯 CONTAINER UNIQUE AVEC BORDURE
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    // ✅ FOND BLANC
    backgroundColor: '#FFFFFF',
    // ✅ BORDURE UNIQUE
    borderWidth: 1,
    borderRadius: 8,
    borderColor: colors.gray[400],
  },
  
  inputContainerFocused: {
    borderWidth: 2,
    borderColor: colors.primary[600],
    // Légère ombre au focus
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  inputContainerDisabled: {
    backgroundColor: colors.gray[100],
    borderColor: colors.gray[300],
  },

  // 🎯 INPUT SANS AUCUN STYLE VISUEL
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
    // ✅ AUCUNE BORDURE
    borderWidth: 0,
    // ✅ FOND TRANSPARENT
    backgroundColor: 'transparent',
  },
  
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },

  leftIcon: {
    marginRight: spacing.sm,
  },
  
  rightIcon: {
    marginLeft: spacing.sm,
  },
  
  toggleText: {
    color: colors.primary[600],
    fontSize: 12,
    fontWeight: '500',
  },
  
  error: {
    fontSize: 12,
    color: colors.semantic.error,
    marginTop: spacing.xs,
  },
  
  hint: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
});