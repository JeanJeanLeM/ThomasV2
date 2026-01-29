import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../design-system/components/Text';
import { colors } from '../design-system/colors';

/**
 * Exemple d'intégration de l'écran de gestion des membres
 * 
 * Ce composant montre comment ajouter un bouton pour accéder à la gestion des membres
 * depuis une carte de ferme dans l'écran FarmsScreen.
 */

interface FarmCardWithMembersProps {
  farm: {
    id: number;
    name: string;
    type: string;
    area: string;
    location: string;
    members: number;
    role: string;
  };
  onNavigateToMembers: (farmId: number, farmName: string) => void;
  onEditFarm: (farm: any) => void;
}

export const FarmCardWithMembers: React.FC<FarmCardWithMembersProps> = ({
  farm,
  onNavigateToMembers,
  onEditFarm,
}) => {
  return (
    <View
      style={{
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      {/* En-tête de la carte */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: 12 
      }}>
        <View style={{ flex: 1 }}>
          <Text variant="headingSmall" weight="semibold" style={{ marginBottom: 4 }}>
            {farm.name}
          </Text>
          <Text variant="bodySmall" color="medium">
            {farm.type}
          </Text>
        </View>
        
        <View style={{
          backgroundColor: colors.primary.light,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
        }}>
          <Text variant="caption" style={{ color: colors.primary.main, fontWeight: '600' }}>
            {farm.role}
          </Text>
        </View>
      </View>

      {/* Informations de la ferme */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center',
          marginBottom: 4 
        }}>
          <Ionicons name="location-outline" size={16} color={colors.neutral.medium} style={{ marginRight: 6 }} />
          <Text variant="bodySmall" color="medium">
            {farm.location} • {farm.area}
          </Text>
        </View>

        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center' 
        }}>
          <Ionicons name="people-outline" size={16} color={colors.neutral.medium} style={{ marginRight: 6 }} />
          <Text variant="bodySmall" color="medium">
            {farm.members} membre{farm.members > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={{ 
        flexDirection: 'row', 
        gap: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral.light,
      }}>
        {/* Bouton Gérer les membres */}
        <TouchableOpacity
          onPress={() => onNavigateToMembers(farm.id, farm.name)}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary.light,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 8,
          }}
        >
          <Ionicons 
            name="people-outline" 
            size={16} 
            color={colors.primary.main} 
            style={{ marginRight: 6 }}
          />
          <Text variant="bodySmall" style={{ color: colors.primary.main, fontWeight: '600' }}>
            Membres
          </Text>
        </TouchableOpacity>

        {/* Bouton Modifier */}
        <TouchableOpacity
          onPress={() => onEditFarm(farm)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.neutral.light,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 8,
          }}
        >
          <Ionicons 
            name="settings-outline" 
            size={16} 
            color={colors.neutral.dark} 
            style={{ marginRight: 6 }}
          />
          <Text variant="bodySmall" style={{ color: colors.neutral.dark, fontWeight: '600' }}>
            Modifier
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Exemple d'utilisation dans FarmsScreen
 * 
 * ```tsx
 * import { FarmMembersScreen } from '../screens/FarmMembersScreen';
 * 
 * // Dans votre navigation stack
 * const Stack = createStackNavigator();
 * 
 * function FarmStack() {
 *   return (
 *     <Stack.Navigator>
 *       <Stack.Screen name="FarmsList" component={FarmsScreen} />
 *       <Stack.Screen 
 *         name="FarmMembers" 
 *         component={FarmMembersScreen}
 *         options={{ title: 'Gestion des membres' }}
 *       />
 *     </Stack.Navigator>
 *   );
 * }
 * 
 * // Dans FarmsScreen
 * const handleNavigateToMembers = (farmId: number, farmName: string) => {
 *   navigation.navigate('FarmMembers', { farmId, farmName });
 * };
 * 
 * // Utilisation du composant
 * <FarmCardWithMembers
 *   farm={farm}
 *   onNavigateToMembers={handleNavigateToMembers}
 *   onEditFarm={handleEditFarm}
 * />
 * ```
 */

/**
 * Types pour la navigation
 */
export type FarmStackParamList = {
  FarmsList: undefined;
  FarmMembers: {
    farmId: number;
    farmName: string;
  };
};

/**
 * Exemple de configuration de navigation avec React Navigation
 */
export const navigationExample = `
// navigation/FarmStackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FarmsScreen } from '../screens/FarmsScreen';
import { FarmMembersScreen } from '../screens/FarmMembersScreen';

const Stack = createStackNavigator<FarmStackParamList>();

export const FarmStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background.primary,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="FarmsList" 
        component={FarmsScreen}
        options={{ title: 'Mes Fermes' }}
      />
      <Stack.Screen 
        name="FarmMembers" 
        component={FarmMembersScreen}
        options={{ title: 'Gestion des membres' }}
      />
    </Stack.Navigator>
  );
};
`;

/**
 * Exemple d'intégration dans l'écran des paramètres
 */
export const SettingsIntegrationExample: React.FC<{
  onNavigateToMembers: (farmId: number, farmName: string) => void;
  currentFarm: { id: number; name: string };
}> = ({ onNavigateToMembers, currentFarm }) => {
  return (
    <View
      style={{
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <Text variant="headingSmall" weight="semibold" style={{ marginBottom: 12 }}>
        Gestion de la ferme
      </Text>
      
      <TouchableOpacity
        onPress={() => onNavigateToMembers(currentFarm.id, currentFarm.name)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: colors.neutral.light,
          borderRadius: 8,
          marginBottom: 8,
        }}
      >
        <Ionicons 
          name="people-outline" 
          size={20} 
          color={colors.primary.main} 
          style={{ marginRight: 12 }}
        />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" weight="semibold">
            Gérer les membres
          </Text>
          <Text variant="bodySmall" color="medium">
            Inviter, modifier les rôles et gérer les permissions
          </Text>
        </View>
        <Ionicons 
          name="chevron-forward-outline" 
          size={20} 
          color={colors.neutral.medium}
        />
      </TouchableOpacity>
    </View>
  );
};
