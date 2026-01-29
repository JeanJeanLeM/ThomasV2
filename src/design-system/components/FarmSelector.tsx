import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { FarmPhoto } from './FarmPhoto';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { ChevronDownIcon } from '../icons';
import { useFarm } from '../../contexts/FarmContext';

interface FarmSelectorProps {
  onFarmListPress?: () => void;
}

export const FarmSelector: React.FC<FarmSelectorProps> = ({ onFarmListPress }) => {
  const { activeFarm } = useFarm();

  return (
    <TouchableOpacity
      onPress={onFarmListPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.primary,
        borderWidth: 1,
        borderColor: colors.border.primary,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 44,
      }}
    >
      <FarmPhoto 
        photoUrl={null} 
        size={32} 
        borderRadius={6}
      />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text variant="body" color={colors.text.primary} weight="medium">
          {activeFarm ? activeFarm.farm_name : 'Sélectionner une ferme'}
        </Text>
        {activeFarm && (
          <Text variant="caption" color={colors.text.secondary}>
            {activeFarm.is_owner ? 'Propriétaire' : activeFarm.role}
          </Text>
        )}
      </View>
      <ChevronDownIcon color={colors.gray[500]} size={16} />
    </TouchableOpacity>
  );
};