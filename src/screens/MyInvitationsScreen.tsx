import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../design-system/components/Text';
import { Button } from '../design-system/components/Button';
import { colors } from '../design-system/colors';
import { userInvitationService } from '../services/UserInvitationService';
import { supabase } from '../utils/supabase';
import type { FarmInvitation } from '../types';

interface MyInvitationsScreenProps {
  onBack?: () => void;
}

export const MyInvitationsScreen: React.FC<MyInvitationsScreenProps> = ({ onBack }) => {
  const [invitations, setInvitations] = useState<FarmInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      
      // Obtenir l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        setLoading(false);
        return;
      }

      setUserEmail(user.email);
      
      // Charger les invitations
      const userInvitations = await userInvitationService.getUserInvitations(user.email);
      setInvitations(userInvitations);
    } catch (error) {
      console.error('Erreur lors du chargement des invitations:', error);
      Alert.alert('Erreur', 'Impossible de charger vos invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      await userInvitationService.acceptInvitation(invitationId);
      Alert.alert('Succès', 'Invitation acceptée ! Vous êtes maintenant membre de la ferme.');
      await loadInvitations(); // Recharger les invitations
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible d\'accepter l\'invitation';
      Alert.alert('Erreur', message);
    }
  };

  const handleDeclineInvitation = (invitationId: number) => {
    Alert.alert(
      'Refuser l\'invitation',
      'Êtes-vous sûr de vouloir refuser cette invitation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            try {
              await userInvitationService.declineInvitation(invitationId);
              Alert.alert('Invitation refusée', 'L\'invitation a été refusée.');
              await loadInvitations();
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Impossible de refuser l\'invitation';
              Alert.alert('Erreur', message);
            }
          },
        },
      ]
    );
  };

  const getRoleLabel = (role: string): string => {
    const labels = {
      owner: 'Propriétaire',
      manager: 'Gestionnaire',
      employee: 'Employé',
      advisor: 'Conseiller',
      viewer: 'Observateur',
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleColor = (role: string): string => {
    const roleColors = {
      owner: colors.status.success,
      manager: colors.primary.main,
      employee: colors.secondary.main,
      advisor: colors.status.warning,
      viewer: colors.neutral.medium,
    };
    return roleColors[role as keyof typeof roleColors] || colors.neutral.medium;
  };

  const formatExpiryDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Expirée';
    } else if (diffDays === 0) {
      return 'Expire aujourd\'hui';
    } else if (diffDays === 1) {
      return 'Expire demain';
    } else {
      return `Expire dans ${diffDays} jours`;
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background.secondary }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={loadInvitations}
          colors={[colors.primary.main]}
        />
      }
    >
        {/* En-tête */}
        <View style={{
          backgroundColor: 'white',
          padding: 20,
          borderRadius: 12,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons 
              name="mail-outline" 
              size={24} 
              color={colors.primary.main} 
              style={{ marginRight: 12 }}
            />
            <Text variant="h3" weight="bold">
              Invitations reçues
            </Text>
          </View>
          <Text variant="body" color="medium">
            {invitations.length === 0 
              ? 'Aucune invitation en attente'
              : `${invitations.length} invitation${invitations.length > 1 ? 's' : ''} en attente`
            }
          </Text>
        </View>

        {/* Liste des invitations */}
        {invitations.length === 0 ? (
          <View style={{
            backgroundColor: 'white',
            padding: 40,
            borderRadius: 12,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <Ionicons 
              name="mail-open-outline" 
              size={48} 
              color={colors.neutral.medium} 
              style={{ marginBottom: 16 }}
            />
            <Text variant="h4" weight="semibold" style={{ marginBottom: 8 }}>
              Aucune invitation
            </Text>
            <Text variant="body" color="medium" style={{ textAlign: 'center' }}>
              Vous n'avez aucune invitation en attente pour le moment.
            </Text>
          </View>
        ) : (
          invitations.map((invitation) => (
            <View
              key={invitation.id}
              style={{
                backgroundColor: 'white',
                padding: 20,
                borderRadius: 12,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                borderLeftWidth: 4,
                borderLeftColor: getRoleColor(invitation.role),
              }}
            >
              {/* En-tête de l'invitation */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons 
                    name="business-outline" 
                    size={20} 
                    color={colors.primary.main} 
                    style={{ marginRight: 8 }}
                  />
                  <Text variant="h4" weight="semibold">
                    {invitation.farms?.name ?? 'Ferme'}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <View
                    style={{
                      backgroundColor: getRoleColor(invitation.role) + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      marginRight: 12,
                    }}
                  >
                    <Text
                      variant="caption"
                      style={{ color: getRoleColor(invitation.role), fontWeight: '600' }}
                    >
                      {getRoleLabel(invitation.role)}
                    </Text>
                  </View>
                  
                  <Text variant="bodySmall" color="medium">
                    {formatExpiryDate(invitation.expiresAt)}
                  </Text>
                </View>
              </View>

              {/* Message d'invitation */}
              {invitation.message && (
                <View
                  style={{
                    backgroundColor: colors.neutral.light,
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <Text variant="bodySmall" style={{ fontStyle: 'italic' }}>
                    "{invitation.message}"
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button
                  title="Refuser"
                  variant="secondary"
                  onPress={() => handleDeclineInvitation(invitation.id)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Accepter"
                  variant="primary"
                  onPress={() => handleAcceptInvitation(invitation.id)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ))
        )}

        {/* Espace en bas */}
        <View style={{ height: 20 }} />
      </ScrollView>
  );
};



