import React from 'react';
import { Switch as RNSwitch, SwitchProps as RNSwitchProps, Platform } from 'react-native';
import { colors } from '../colors';

interface SwitchProps extends Omit<RNSwitchProps, 'trackColor' | 'thumbColor'> {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function Switch({ value, onValueChange, disabled = false, ...props }: SwitchProps) {
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{
        false: colors.neutral[300],
        true: colors.primary[600],
      }}
      thumbColor={
        Platform.OS === 'ios' 
          ? colors.white 
          : value 
            ? colors.white 
            : colors.neutral[100]
      }
      ios_backgroundColor={colors.neutral[300]}
      {...props}
    />
  );
}













