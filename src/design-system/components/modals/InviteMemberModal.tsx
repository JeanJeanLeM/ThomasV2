import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '../Modal';
import { Text } from '../Text';
import { Input } from '../Input';
import { Button } from '../Button';
import { DropdownSelector } from '../DropdownSelector';
import { colors } from '../../colors';
import type { UserRole, InviteMemberData } from '../../../types';

interface InviteMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite: (data: InviteMemberData) => Promise<void>;
  currentUserRole: UserRole;
}

const roleOptions = [
  { id: 'manager', label: 'Gestionnaire', description: 'Peut gérer la ferme et inviter des membres' },
  { id: 'employee', label: 'Employé', description: 'Peut gérer les tâches et observations' },
  { id: 'advisor', label: 'Conseiller', description: 'Peut consulter et exporter les données' },
  { id: 'viewer', label: 'Observateur', description: 'Accès en lecture seule' },
];

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  visible,
  onClose,
  onInvite,
  currentUserRole,
}) => {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    role?: string;
  }>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'L\'adresse email est requise';
    } else if (!validateEmail(email.trim())) {
      newErrors.email = 'Veuillez saisir une adresse email valide';
    }

    if (!selectedRole) {
      newErrors.role = 'Veuillez sélectionner un rôle';
    }

    // Vérifier que l'utilisateur actuel peut assigner ce rôle
    if (currentUserRole === 'manager' && selectedRole === 'manager') {
      newErrors.role = 'Seul le propriétaire peut nommer des gestionnaires';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInvite = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onInvite({
        email: email.trim(),
        role: selectedRole,
        message: message.trim() || undefined,
      });

      // Réinitialiser le formulaire
      setEmail('');
      setSelectedRole('employee');
      setMessage('');
      setErrors({});
      
      onClose();
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : 'Impossible d\'envoyer l\'invitation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail('');
      setSelectedRole('employee');
      setMessage('');
      setErrors({});
      onClose();
    }
  };

  // Filtrer les rôles selon les permissions de l'utilisateur actuel
  const availableRoles = roleOptions.filter(option => {
    if (currentUserRole === 'owner') return true;
    if (currentUserRole === 'manager') return option.id !== 'manager';
    return false; // Les autres rôles ne peuvent pas inviter
  });

  const getDefaultMessage = (role: UserRole): string => {
    const messages = {
      manager: 'Vous êtes invité(e) à rejoindre notre ferme en tant que gestionnaire. Vous pourrez gérer tous les aspects de la ferme.',
      employee: 'Vous êtes invité(e) à rejoindre notre équipe ! Vous pourrez gérer les tâches et observations de la ferme.',
      advisor: 'Nous aimerions vous avoir comme conseiller pour notre ferme. Vous aurez accès aux données pour nous accompagner.',
      viewer: 'Vous êtes invité(e) à consulter les données de notre ferme.',
      owner: '', // Ne devrait pas arriver
    };
    return messages[role];
  };

  React.useEffect(() => {
    if (selectedRole && !message.trim()) {
      setMessage(getDefaultMessage(selectedRole));
    }
  }, [selectedRole]);

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Inviter un nouveau membre"
      size="fullscreen"
      primaryAction={{
        title: 'Envoyer l\'invitation',
        onPress: handleInvite,
        loading: isLoading,
        disabled: isLoading || !email.trim() || !selectedRole,
      }}
      secondaryAction={{
        title: 'Annuler',
        onPress: handleClose,
      }}
    >
      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={{ padding: 24, gap: 24 }}>
          {/* Badge informatif */}
          <View
            style={{
              backgroundColor: colors.primary.light,
              borderRadius: 8,
              padding: 16,
              borderLeftWidth: 4,
              borderLeftColor: colors.primary.main,
            }}
          >
            <Text variant="body" style={{ 
              color: colors.primary.main,
              fontWeight: '600'
            }}>
              La personne verra l'invitation dans sa page "Mes invitations" si elle utilise la même adresse email. L'invitation expire dans 7 jours.
            </Text>
          </View>

          {/* Section Informations */}
          <View>
            <Text variant="h3" style={{ 
              color: colors.text.primary,
              marginBottom: 16,
              fontSize: 18,
              fontWeight: '600'
            }}>
              Informations du membre
            </Text>
            
            <Input
              label="Adresse email"
              placeholder="exemple@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
              disabled={isLoading}
              required
            />
            
            <DropdownSelector
              label="Rôle"
              placeholder="Sélectionner un rôle"
              items={availableRoles}
              selectedItems={availableRoles.filter(role => role.id === selectedRole)}
              onSelectionChange={(items) => {
                if (items.length > 0 && items[0]) {
                  setSelectedRole(items[0].id as UserRole);
                }
              }}
              disabled={isLoading}
            />
            {errors.role && (
              <Text variant="bodySmall" style={{ color: colors.status.error, marginTop: 4 }}>
                {errors.role}
              </Text>
            )}
          </View>

          {/* Section Permissions */}
          {selectedRole && (
            <View>
              <Text variant="h3" style={{ 
                color: colors.text.primary,
                marginBottom: 16,
                fontSize: 18,
                fontWeight: '600'
              }}>
                Permissions du rôle
              </Text>
              
              <View
                style={{
                  backgroundColor: colors.neutral.light,
                  padding: 16,
                  borderRadius: 8,
                }}
              >
                <Text variant="body" weight="semibold" style={{ marginBottom: 12 }}>
                  {roleOptions.find(r => r.id === selectedRole)?.label}
                </Text>
                
                <View style={{ gap: 8 }}>
                  {getPermissionsForRole(selectedRole).map((permission, index) => (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={colors.status.success}
                        style={{ marginRight: 8 }}
                      />
                      <Text variant="bodySmall" color="medium">
                        {permission}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Section Message */}
          <View>
            <Text variant="h3" style={{ 
              color: colors.text.primary,
              marginBottom: 16,
              fontSize: 18,
              fontWeight: '600'
            }}>
              Message d'invitation
            </Text>
            
            <Input
              label="Message personnalisé"
              placeholder="Ajouter un message personnalisé..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              maxLength={500}
              disabled={isLoading}
              hint={`${message.length}/500 caractères`}
            />
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
};

// Fonction helper pour obtenir les permissions d'un rôle
const getPermissionsForRole = (role: UserRole): string[] => {
  const permissions: Record<UserRole, string[]> = {
    owner: [
      'Gérer tous les aspects de la ferme',
      'Inviter et gérer les membres',
      'Exporter toutes les données',
      'Voir les analytics avancées',
      'Modifier les paramètres de la ferme',
    ],
    manager: [
      'Gérer les tâches et observations',
      'Inviter des employés et conseillers',
      'Exporter les données',
      'Voir les analytics',
      'Modifier les paramètres de la ferme',
    ],
    employee: [
      'Créer et gérer les tâches',
      'Ajouter des observations',
      'Consulter les données de la ferme',
    ],
    advisor: [
      'Consulter toutes les données',
      'Exporter les données',
      'Voir les analytics',
      'Ajouter des observations et conseils',
    ],
    viewer: [
      'Consulter les données en lecture seule',
      'Voir les tâches et observations',
    ],
  };

  return permissions[role] || [];
};
