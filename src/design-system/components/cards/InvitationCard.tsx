import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { colors } from '../../colors';
import type { FarmInvitation, UserRole } from '../../../types';

interface InvitationCardProps {
  invitation: FarmInvitation;
  /** Annuler l'invitation (équivalent "Supprimer") */
  onCancelInvitation?: (invitationId: number) => void;
  /** Renvoyer l'invitation (prolonge l'expiration) */
  onResendInvitation?: (invitationId: number) => void;
  /** @deprecated Préférer onCancelInvitation. Si seul fourni, affiche "Supprimer" et appelle au lieu d'annuler. */
  onDeleteInvitation?: (invitationId: number) => void;
  style?: any;
}

const roleLabels: Record<UserRole, string> = {
  owner: 'Propriétaire',
  manager: 'Gestionnaire',
  employee: 'Employé',
  advisor: 'Conseiller',
  viewer: 'Observateur',
};

const roleColors: Record<UserRole, string> = {
  owner: colors.status.success,
  manager: colors.primary.main,
  employee: colors.secondary.main,
  advisor: colors.secondary.purple,
  viewer: colors.neutral.medium,
};

export const InvitationCard: React.FC<InvitationCardProps> = ({
  invitation,
  onCancelInvitation,
  onResendInvitation,
  onDeleteInvitation,
  style,
}) => {
  const hasCancel = !!onCancelInvitation || !!onDeleteInvitation;
  const cancelHandler = onCancelInvitation ?? onDeleteInvitation;
  const hasResend = !!onResendInvitation;

  const handleCancel = () => {
    Alert.alert(
      'Annuler l\'invitation',
      `Êtes-vous sûr de vouloir annuler l'invitation envoyée à ${invitation.email} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: () => cancelHandler?.(invitation.id),
        },
      ]
    );
  };

  const handleResend = () => {
    onResendInvitation?.(invitation.id);
  };

  return (
    <View
      style={[
        {
          padding: 16,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border.primary,
          borderLeftWidth: 4,
          borderLeftColor: colors.status.warning,
          backgroundColor: 'white',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 120 }}>
          <Text variant="body" weight="semibold">
            {invitation.email}
          </Text>
          <View
            style={{
              marginTop: 4,
              alignSelf: 'flex-start',
              backgroundColor: (roleColors[invitation.role as UserRole] ?? colors.neutral.medium) + '20',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
            }}
          >
            <Text variant="caption" style={{ color: roleColors[invitation.role as UserRole] ?? colors.neutral.medium, fontWeight: '600' }}>
              {roleLabels[invitation.role as UserRole] ?? invitation.role}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {hasResend && (
            <TouchableOpacity
              onPress={handleResend}
              style={{
                padding: 8,
                borderRadius: 6,
                backgroundColor: colors.primary.light ?? colors.primary[50],
              }}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.primary.main} />
            </TouchableOpacity>
          )}
          {hasCancel && (
            <TouchableOpacity
              onPress={handleCancel}
              style={{
                padding: 8,
                borderRadius: 6,
                backgroundColor: colors.status.errorLight,
              }}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.status.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};
