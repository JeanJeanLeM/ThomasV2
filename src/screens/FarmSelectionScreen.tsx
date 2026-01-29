import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput, Modal, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../design-system/components/Text';
import { Button } from '../design-system/components/Button';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { userInvitationService } from '../services/UserInvitationService';
import { supabase } from '../utils/supabase';
import type { FarmInvitation } from '../types';
import type { UserFarm } from '../services/SimpleInitService';

/**
 * Écran de sélection de ferme pour les nouveaux utilisateurs
 * Remplace FarmSetupScreen obligatoire
 * Permet de rejoindre une ferme via invitation ou créer une nouvelle ferme
 */
export default function FarmSelectionScreen(): JSX.Element {
  const { user } = useAuth();
  const { refreshFarms, changeActiveFarm, activeFarm, farms, createFarm, loading: farmLoading } = useFarm();
  const [invitations, setInvitations] = useState<FarmInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingInvitation, setAcceptingInvitation] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [farmData, setFarmData] = useState({
    name: '',
    description: ''
  });
  const [creatingFarm, setCreatingFarm] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, []);

  // Vérifier si l'utilisateur a maintenant une ferme active (après acceptation d'invitation)
  useEffect(() => {
    if (activeFarm && farms.length > 0) {
      // L'utilisateur a une ferme active, on peut rediriger vers le profil
      // Mais on ne peut pas utiliser useNavigation ici car on n'est pas dans NavigationProvider
      // La redirection sera gérée par App.tsx qui détectera que needsSetup = false
      console.log('✅ [FARM-SELECTION] Ferme active détectée, redirection automatique...');
    }
  }, [activeFarm, farms]);

  const loadInvitations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      if (!user?.email) {
        console.error('❌ [FARM-SELECTION] Utilisateur non connecté');
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        return;
      }
      
      // Charger les invitations
      const userInvitations = await userInvitationService.getUserInvitations(user.email);
      setInvitations(userInvitations);
    } catch (error) {
      console.error('❌ [FARM-SELECTION] Erreur chargement invitations:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    await loadInvitations(true);
  };

  const handleAcceptInvitation = async (invitation: FarmInvitation) => {
    try {
      setAcceptingInvitation(invitation.id);
      
      // Accepter l'invitation
      await userInvitationService.acceptInvitation(invitation.id);
      
      // Recharger les fermes pour obtenir la nouvelle ferme
      // refreshFarms() va mettre à jour needsSetup automatiquement
      await refreshFarms();
      
      // Créer un UserFarm temporaire à partir de l'invitation pour définir comme active
      // Même si la ferme n'est pas encore dans la liste, on peut la définir comme active
      const acceptedFarm = {
        farm_id: invitation.farmId,
        farm_name: invitation.farms?.name || 'Ferme',
        role: invitation.role,
        is_owner: false
      };
      
      // Définir la ferme acceptée comme active
      await changeActiveFarm(acceptedFarm);
      
      // Recharger à nouveau pour s'assurer que tout est synchronisé
      await refreshFarms();
      
      Alert.alert(
        'Succès',
        `Vous avez rejoint la ferme "${invitation.farms?.name || 'Ferme'}" ! Vous allez être redirigé.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ [FARM-SELECTION] Erreur acceptation invitation:', error);
      const message = error instanceof Error ? error.message : 'Impossible d\'accepter l\'invitation';
      Alert.alert('Erreur', message);
    } finally {
      setAcceptingInvitation(null);
    }
  };

  const handleCreateFarm = () => {
    setShowCreateModal(true);
  };

  const handleSubmitCreateFarm = async () => {
    if (!farmData.name.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour votre ferme');
      return;
    }

    try {
      setCreatingFarm(true);
      
      // Créer la ferme
      const newFarm = await createFarm({
        name: farmData.name.trim(),
        description: farmData.description.trim() || null,
      });

      // La ferme créée devient automatiquement active
      // refreshFarms() sera appelé automatiquement par createFarm
      // needsSetup sera mis à false automatiquement
      
      setShowCreateModal(false);
      setFarmData({ name: '', description: '' });
      
      Alert.alert(
        'Succès',
        `Votre ferme "${newFarm.farm_name}" a été créée ! Vous allez être redirigé.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ [FARM-SELECTION] Erreur création ferme:', error);
      const message = error instanceof Error ? error.message : 'Impossible de créer la ferme';
      Alert.alert('Erreur', message);
    } finally {
      setCreatingFarm(false);
    }
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text variant="body" color="medium" style={{ marginTop: spacing.md }}>
            Chargement des invitations...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary.main]}
          tintColor={colors.primary.main}
        />
      }
    >
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="business-outline" size={48} color={colors.primary.main} />
        </View>
        <Text variant="h1" weight="bold" style={styles.title}>
          Bienvenue dans Thomas V2
        </Text>
        <Text variant="body" color="medium" style={styles.subtitle}>
          Rejoignez une ferme existante ou créez votre première ferme pour commencer
        </Text>
      </View>

      {/* Section Invitations */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="h3" weight="semibold" style={styles.sectionTitle}>
            Rejoindre une ferme existante
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={refreshing || loading}
            style={styles.refreshButton}
          >
            <Ionicons
              name="refresh"
              size={24}
              color={refreshing || loading ? colors.neutral.medium : colors.primary.main}
              style={[
                refreshing && styles.refreshIconRotating
              ]}
            />
          </TouchableOpacity>
        </View>
        {invitations.length > 0 ? (
          <>
            <Text variant="bodySmall" color="medium" style={styles.sectionDescription}>
              Vous avez {invitations.length} invitation{invitations.length > 1 ? 's' : ''} en attente pour votre adresse email ({user?.email})
            </Text>

            {invitations.map((invitation) => (
            <View
              key={invitation.id}
              style={[
                styles.invitationCard,
                { borderLeftColor: getRoleColor(invitation.role) }
              ]}
            >
              <View style={styles.invitationHeader}>
                <View style={styles.invitationHeaderLeft}>
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
              </View>

              <View style={styles.invitationMeta}>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: getRoleColor(invitation.role) + '20' }
                  ]}
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

              {invitation.message && (
                <View style={styles.invitationMessage}>
                  <Text variant="bodySmall" style={{ fontStyle: 'italic' }}>
                    "{invitation.message}"
                  </Text>
                </View>
              )}

              <Button
                title={
                  acceptingInvitation === invitation.id
                    ? "Acceptation en cours..."
                    : "Rejoindre cette ferme"
                }
                variant="primary"
                onPress={() => handleAcceptInvitation(invitation)}
                disabled={acceptingInvitation !== null}
                style={styles.acceptButton}
              />
            </View>
          ))}
          </>
        ) : (
          <View style={styles.infoCard}>
            <Ionicons name="mail-outline" size={32} color={colors.neutral.medium} style={{ marginBottom: spacing.md }} />
            <Text variant="body" weight="semibold" style={{ marginBottom: spacing.xs, textAlign: 'center' }}>
              Aucune invitation en attente
            </Text>
            <Text variant="bodySmall" color="medium" style={{ textAlign: 'center', lineHeight: 20 }}>
              Pour rejoindre une ferme, vous devez être invité par le propriétaire de la ferme.{'\n\n'}
              Le propriétaire de la ferme doit inviter cette adresse email : <Text weight="semibold">{user?.email}</Text>{'\n\n'}
              Une fois l'invitation reçue, elle apparaîtra automatiquement ici.
            </Text>
          </View>
        )}
      </View>

      {/* Section Créer une ferme */}
      <View style={styles.section}>
        <Text variant="h3" weight="semibold" style={styles.sectionTitle}>
          {invitations.length > 0 ? 'Ou créez votre propre ferme' : 'Créer votre première ferme'}
        </Text>
        <Text variant="bodySmall" color="medium" style={styles.sectionDescription}>
          {invitations.length > 0
            ? 'Si vous n\'avez pas d\'invitation, vous pouvez créer votre propre ferme'
            : 'Si vous n\'avez pas d\'invitation, créez votre première ferme pour utiliser Thomas V2'}
        </Text>

        <TouchableOpacity
          style={styles.createFarmCard}
          onPress={handleCreateFarm}
        >
          <View style={styles.createFarmContent}>
            <Ionicons name="add-circle-outline" size={32} color={colors.primary.main} />
            <View style={styles.createFarmText}>
              <Text variant="h4" weight="semibold">
                Créer une nouvelle ferme
              </Text>
              <Text variant="bodySmall" color="medium" style={{ marginTop: 4 }}>
                Configurez votre ferme en quelques étapes
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.neutral.medium} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Espace en bas */}
      <View style={{ height: 40 }} />

      {/* Modal de création de ferme */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="h3" weight="bold">
                Créer votre ferme
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formField}>
                <Text variant="body" weight="semibold" style={styles.label}>
                  Nom de votre ferme *
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={farmData.name}
                    onChangeText={(text) => setFarmData(prev => ({ ...prev, name: text }))}
                    placeholder="Ex: Ferme du Soleil Levant"
                    placeholderTextColor="#9ca3af"
                    editable={!creatingFarm}
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text variant="body" weight="semibold" style={styles.label}>
                  Description (optionnel)
                </Text>
                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={farmData.description}
                    onChangeText={(text) => setFarmData(prev => ({ ...prev, description: text }))}
                    placeholder="Décrivez votre ferme en quelques mots..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    editable={!creatingFarm}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Annuler"
                  variant="secondary"
                  onPress={() => {
                    setShowCreateModal(false);
                    setFarmData({ name: '', description: '' });
                  }}
                  disabled={creatingFarm}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  title={creatingFarm ? "Création..." : "Créer"}
                  variant="primary"
                  onPress={handleSubmitCreateFarm}
                  disabled={!farmData.name.trim() || creatingFarm}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary || '#F9FAFB',
  },
  contentContainer: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50] || '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    color: colors.text.primary,
    flex: 1,
  },
  refreshButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  refreshIconRotating: {
    transform: [{ rotate: '180deg' }],
  },
  sectionDescription: {
    marginBottom: spacing.md,
  },
  invitationCard: {
    backgroundColor: 'white',
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invitationHeader: {
    marginBottom: spacing.md,
  },
  invitationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invitationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  invitationMessage: {
    backgroundColor: colors.neutral.light || '#F3F4F6',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  acceptButton: {
    marginTop: spacing.sm,
  },
  createFarmCard: {
    backgroundColor: 'white',
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary[200] || '#BBF7D0',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createFarmContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createFarmText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border?.primary || '#E5E7EB',
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.lg,
  },
  formField: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
    color: colors.text.primary,
  },
  inputContainer: {
    borderWidth: 2,
    borderColor: '#9CA3AF',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        display: 'flex',
        boxSizing: 'border-box',
      } as any,
    }),
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: spacing.md,
    fontSize: 16,
    color: '#111827',
    minHeight: 48,
    ...Platform.select({
      web: {
        outline: 'none',
        border: 'none',
        width: '100%',
        boxSizing: 'border-box',
      } as any,
    }),
  },
  textAreaContainer: {
    minHeight: 80,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border?.primary || '#E5E7EB',
  },
});
