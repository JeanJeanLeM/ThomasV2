import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import {
  UserIcon,
  BuildingOfficeIcon,
  UsersIcon,
  EnvelopeIcon,
  ChevronRightIcon,
} from '../design-system/icons';
import { Text } from '../design-system/components';
import { useFarm } from '../contexts/FarmContext';
import { useAuth } from '../contexts/AuthContext';
import { userInvitationService } from '../services/UserInvitationService';
import InterfaceTourTarget from '../components/interface-tour/InterfaceTourTarget';

interface ProfileAndFarmSettingsScreenProps {
  navigation: { goBack: () => void };
  onEditProfile: () => void;
  onFarmEdit: () => void;
  onFarmMembers: () => void;
  onMyInvitations: () => void;
  onCommunity: () => void;
}

export default function ProfileAndFarmSettingsScreen({
  onEditProfile,
  onFarmEdit,
  onFarmMembers,
  onMyInvitations,
  onCommunity,
}: ProfileAndFarmSettingsScreenProps) {
  const { activeFarm } = useFarm();
  const { user: authUser } = useAuth();
  const [invitationCount, setInvitationCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (authUser?.email) {
        try {
          const count = await userInvitationService.getInvitationCount(authUser.email);
          setInvitationCount(count);
        } catch {
          setInvitationCount(0);
        }
      }
    };
    load();
  }, [authUser?.email]);

  const options = [
    {
      id: 'profile',
      title: 'Modifier le profil',
      subtitle: 'Nom, email, photo de profil',
      icon: <UserIcon color={colors.primary[600]} size={28} />,
      borderColor: colors.primary[600],
      onPress: onEditProfile,
    },
    {
      id: 'farm',
      title: 'Modifier les informations de la ferme',
      subtitle: activeFarm ? `Ferme : ${activeFarm.farm_name}` : 'Créer ou sélectionner une ferme',
      icon: <BuildingOfficeIcon color={colors.semantic.success} size={28} />,
      borderColor: colors.semantic.success,
      onPress: onFarmEdit,
    },
    {
      id: 'members',
      title: 'Gérer les membres',
      subtitle: 'Inviter et gérer les membres de vos fermes',
      icon: <UsersIcon color={colors.semantic.success} size={28} />,
      borderColor: colors.semantic.success,
      onPress: onFarmMembers,
    },
    {
      id: 'invitations',
      title: 'Mes invitations',
      subtitle: 'Voir et accepter les invitations reçues',
      icon: <EnvelopeIcon color={colors.secondary.blue} size={28} />,
      borderColor: colors.secondary.blue,
      onPress: onMyInvitations,
      badge: invitationCount > 0 ? invitationCount : undefined,
    },
    {
      id: 'community',
      title: 'Communauté',
      subtitle: 'Rejoindre ou gérer une communauté',
      icon: <UsersIcon color={colors.primary[600]} size={28} />,
      borderColor: colors.primary[600],
      onPress: onCommunity,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.optionsContainer}>
            {options.map((option) => {
              const card = (
                <TouchableOpacity
                  style={[styles.optionCard, { borderLeftColor: option.borderColor }]}
                  onPress={option.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionHeader}>
                    <View style={styles.optionIcon}>
                      {option.icon}
                    </View>
                    <View style={styles.optionContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text variant="h4" style={styles.optionTitle}>
                          {option.title}
                        </Text>
                        {option.badge != null && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{option.badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text variant="caption" style={styles.optionSubtitle}>
                        {option.subtitle}
                      </Text>
                    </View>
                    <ChevronRightIcon color={colors.gray[400]} size={20} />
                  </View>
                </TouchableOpacity>
              );

              if (option.id !== 'members') {
                return <View key={option.id}>{card}</View>;
              }

              return (
                <InterfaceTourTarget key={option.id} targetId="profile-farm.option.members">
                  {card}
                </InterfaceTourTarget>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
    fontSize: 18,
    fontWeight: '600',
  },
  optionSubtitle: {
    color: colors.text.secondary,
    lineHeight: 18,
  },
  badge: {
    backgroundColor: colors.semantic.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
  },
});
