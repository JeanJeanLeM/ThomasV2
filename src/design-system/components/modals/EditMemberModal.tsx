import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '../Modal';
import { Text } from '../Text';
import { Button } from '../Button';
import { DropdownSelector } from '../DropdownSelector';
import { colors } from '../../colors';
import type { FarmMember, UserRole, MemberPermissions } from '../../../types';

interface EditMemberModalProps {
  visible: boolean;
  member: FarmMember | null;
  currentUserRole: UserRole;
  onClose: () => void;
  onUpdateMember: (memberId: number, role: UserRole, permissions: MemberPermissions) => Promise<void>;
  onRemoveMember: (memberId: number) => Promise<void>;
}

const roleOptions = [
  { id: 'manager', label: 'Gestionnaire', description: 'Peut gérer la ferme et inviter des membres' },
  { id: 'employee', label: 'Employé', description: 'Peut gérer les tâches et observations' },
  { id: 'advisor', label: 'Conseiller', description: 'Peut consulter et exporter les données' },
  { id: 'viewer', label: 'Observateur', description: 'Accès en lecture seule' },
];

const permissionLabels: Record<keyof MemberPermissions, { label: string; description: string }> = {
  can_edit_farm: {
    label: 'Modifier la ferme',
    description: 'Peut modifier les informations de la ferme'
  },
  can_export_data: {
    label: 'Exporter les données',
    description: 'Peut télécharger les données au format CSV/PDF'
  },
  can_manage_tasks: {
    label: 'Gérer les tâches',
    description: 'Peut créer, modifier et supprimer des tâches'
  },
  can_invite_members: {
    label: 'Inviter des membres',
    description: 'Peut envoyer des invitations à de nouveaux membres'
  },
  can_view_analytics: {
    label: 'Voir les analytics',
    description: 'Peut accéder aux statistiques et rapports'
  },
};

export const EditMemberModal: React.FC<EditMemberModalProps> = ({
  visible,
  member,
  currentUserRole,
  onClose,
  onUpdateMember,
  onRemoveMember,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [permissions, setPermissions] = useState<MemberPermissions>({
    can_edit_farm: false,
    can_export_data: false,
    can_manage_tasks: false,
    can_invite_members: false,
    can_view_analytics: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedPermissions, setShowAdvancedPermissions] = useState(true);

  // Initialiser les valeurs quand le membre change
  useEffect(() => {
    if (member) {
      setSelectedRole(member.role);
      setPermissions(member.permissions);
    }
  }, [member]);

  // Mettre à jour les permissions selon le rôle sélectionné seulement en mode standard
  useEffect(() => {
    const defaultPermissions = getDefaultPermissions(selectedRole);
    if (!showAdvancedPermissions) {
      setPermissions(defaultPermissions);
    }
  }, [selectedRole, showAdvancedPermissions]);

  const getDefaultPermissions = (role: UserRole): MemberPermissions => {
    const defaultPerms: Record<UserRole, MemberPermissions> = {
      owner: {
        can_edit_farm: true,
        can_export_data: true,
        can_manage_tasks: true,
        can_invite_members: true,
        can_view_analytics: true,
      },
      manager: {
        can_edit_farm: true,
        can_export_data: true,
        can_manage_tasks: true,
        can_invite_members: true,
        can_view_analytics: true,
      },
      employee: {
        can_edit_farm: false,
        can_export_data: false,
        can_manage_tasks: true,
        can_invite_members: false,
        can_view_analytics: false,
      },
      advisor: {
        can_edit_farm: false,
        can_export_data: true,
        can_manage_tasks: false,
        can_invite_members: false,
        can_view_analytics: true,
      },
      viewer: {
        can_edit_farm: false,
        can_export_data: false,
        can_manage_tasks: false,
        can_invite_members: false,
        can_view_analytics: false,
      },
    };

    return defaultPerms[role];
  };

  const handleSave = async () => {
    if (!member) return;

    setIsLoading(true);
    try {
      await onUpdateMember(member.id, selectedRole, permissions);
      onClose();
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : 'Impossible de modifier le membre'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    if (!member) return;

    Alert.alert(
      'Supprimer le membre',
      `Êtes-vous sûr de vouloir supprimer ${member.user?.firstName} ${member.user?.lastName} de la ferme ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await onRemoveMember(member.id);
              onClose();
            } catch (error) {
              Alert.alert(
                'Erreur',
                error instanceof Error ? error.message : 'Impossible de supprimer le membre'
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const canManage = currentUserRole === 'owner' || currentUserRole === 'manager';
  const canRemove = canManage && member?.role !== 'owner';
  const canChangeRole = canManage && member?.role !== 'owner';

  // Filtrer les rôles selon les permissions
  const availableRoles = roleOptions.filter(option => {
    if (currentUserRole === 'owner') return true;
    if (currentUserRole === 'manager') return option.id !== 'manager';
    return false;
  });

  if (!member) return null;

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Modifier le membre"
      size="fullscreen"
    >
      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={{ padding: 20 }}>
          {/* Header avec informations du membre */}
          <View
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 12,
              marginBottom: 24,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primary.main,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Ionicons name="person" size={24} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h4" weight="semibold" style={{ marginBottom: 2 }}>
                {member.user?.firstName} {member.user?.lastName}
              </Text>
              <Text variant="body" color="medium">
                {member.user?.email}
              </Text>
            </View>
          </View>

          {/* Sélection du rôle */}
          {canChangeRole && (
            <View
              style={{
                backgroundColor: 'white',
                padding: 20,
                borderRadius: 12,
                marginBottom: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text variant="h4" weight="semibold" style={{ marginBottom: 12 }}>
                Rôle
              </Text>
              <DropdownSelector
                items={availableRoles}
                selectedItems={availableRoles.filter(role => role.id === selectedRole)}
                onSelectionChange={(items) => {
                  if (items.length > 0 && items[0]) {
                    setSelectedRole(items[0].id as UserRole);
                  }
                }}
                placeholder="Sélectionner un rôle"
                disabled={isLoading}
              />
            </View>
          )}

          {/* Permissions */}
          <View
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 12,
              marginBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text variant="h4" weight="semibold">
                Permissions
              </Text>
              {canChangeRole && (
                <Button
                  variant="secondary"
                  size="sm"
                  title={showAdvancedPermissions ? 'Standard' : 'Personnaliser'}
                  onPress={() => setShowAdvancedPermissions(!showAdvancedPermissions)}
                />
              )}
            </View>

            <View>
              {Object.entries(permissionLabels).map(([key, { label, description }]) => {
                const permissionKey = key as keyof MemberPermissions;
                const hasPermission = permissions[permissionKey];

                return (
                  <View
                    key={key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border.primary,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text variant="body" weight="semibold" style={{ marginBottom: 4 }}>
                        {label}
                      </Text>
                      <Text variant="bodySmall" color="medium">
                        {description}
                      </Text>
                    </View>
                    
                    {canChangeRole ? (
                      <Switch
                        value={hasPermission}
                        onValueChange={(value) => 
                          setPermissions(prev => ({ ...prev, [permissionKey]: value }))
                        }
                        trackColor={{ false: colors.neutral.medium, true: colors.primary.light }}
                        thumbColor={hasPermission ? colors.primary.main : colors.neutral.light}
                        disabled={isLoading}
                      />
                    ) : (
                      <Ionicons
                        name={hasPermission ? "checkmark-circle" : "close-circle"}
                        size={20}
                        color={hasPermission ? colors.status.success : colors.neutral.medium}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Actions */}
          <View
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 12,
              marginBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                variant="secondary"
                title="Annuler"
                onPress={handleClose}
                style={{ flex: 1 }}
                disabled={isLoading}
              />
              
              <Button
                variant="primary"
                title="Modifier"
                onPress={handleSave}
                style={{ flex: 1 }}
                loading={isLoading}
                disabled={isLoading}
              />
            </View>
          </View>

          {/* Bouton de suppression */}
          {canRemove && (
            <View style={{ marginTop: 16 }}>
              <Button
                variant="secondary"
                title="Supprimer de la ferme"
                onPress={handleRemove}
                disabled={isLoading}
                style={{
                  borderColor: colors.status.error,
                  backgroundColor: colors.status.errorLight,
                }}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
};
