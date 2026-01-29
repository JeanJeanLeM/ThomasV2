import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { colors } from '../../colors';
import type { FarmMember, UserRole } from '../../../types';

interface MemberCardProps {
  member: FarmMember;
  currentUserRole: UserRole;
  onUpdateRole?: (memberId: number, newRole: UserRole) => void;
  onRemoveMember?: (memberId: number) => void;
  onEditMember?: (member: FarmMember) => void;
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

const roleIcons: Record<UserRole, keyof typeof Ionicons.glyphMap> = {
  owner: 'star-outline',
  manager: 'shield-checkmark-outline',
  employee: 'person-outline',
  advisor: 'bulb-outline',
  viewer: 'eye-outline',
};

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  currentUserRole,
  onUpdateRole,
  onRemoveMember,
  onEditMember,
  style,
}) => {
  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'manager';

  const getPermissionsSummary = () => {
    if (member.role === 'owner') return 'Toutes permissions';
    
    const activePermissions = Object.values(member.permissions).filter(Boolean).length;
    const totalPermissions = Object.keys(member.permissions).length;
    
    return `${activePermissions}/${totalPermissions} permissions`;
  };
  const canRemove = canManageMembers && member.role !== 'owner';
  const canChangeRole = canManageMembers && member.role !== 'owner';


  return (
    <TouchableOpacity 
      onPress={() => onEditMember?.(member)}
      style={[{
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border.primary,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }, style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Nom et prénom */}
        <View style={{ flex: 1 }}>
          <Text variant="body" weight="semibold" style={{ marginBottom: 4 }}>
            {member.user?.firstName} {member.user?.lastName}
          </Text>
          <Text variant="bodySmall" color="medium">
            {getPermissionsSummary()}
          </Text>
        </View>

        {/* Chevron pour édition */}
        {canManageMembers && (
          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 8 }}>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.neutral.medium} />
          </View>
        )}
      </View>

    </TouchableOpacity>
  );
};
