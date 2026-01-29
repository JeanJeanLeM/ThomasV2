import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';

interface NavigationTransitionProps {
  message?: string;
}

export const NavigationTransition: React.FC<NavigationTransitionProps> = ({ 
  message = "Chargement..." 
}) => {
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background?.primary || '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    }}>
      <ActivityIndicator 
        size="large" 
        color={colors.primary?.[600] || '#16A34A'} 
      />
      <Text style={{
        marginTop: spacing.md,
        fontSize: 16,
        color: colors.text?.secondary || '#6B7280',
        textAlign: 'center',
      }}>
        {message}
      </Text>
    </View>
  );
};











