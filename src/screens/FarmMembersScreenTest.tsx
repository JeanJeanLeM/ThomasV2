import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  Screen, 
  UnifiedHeader, 
  Text, 
  Button, 
  Card,
  MemberCard, 
  InvitationCard,
  InviteMemberModal,
  EditMemberModal,
  FloatingActionButton
} from '../design-system';
import { colors } from '../design-system/colors';
import { farmMemberService } from '../services/FarmMemberService';
import { useFarm } from '../contexts/FarmContext';
import { supabase } from '../utils/supabase';
import type { 
  FarmMember, 
  FarmInvitation, 
  InviteMemberData, 
  UserRole,
  MemberPermissions
} from '../types';

interface FarmMembersScreenTestProps {
  onBack?: () => void;
}

// Données de test (supprimées - utilisation des vraies données)
/*const mockMembers: FarmMember[] = [
  {
    id: 1,
    farmId: 1,
    userId: 'user-1',
    user: {
      id: 'user-1',
      email: 'proprietaire@ferme.com',
      firstName: 'Jean',
      lastName: 'Dupont',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    },
    role: 'owner',
    permissions: {
      can_edit_farm: true,
      can_export_data: true,
      can_manage_tasks: true,
      can_invite_members: true,
      can_view_analytics: true,
    },
    isActive: true,
    joinedAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 2,
    farmId: 1,
    userId: 'user-2',
    user: {
      id: 'user-2',
      email: 'marie.martin@email.com',
      firstName: 'Marie',
      lastName: 'Martin',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15'
    },
    role: 'manager',
    permissions: {
      can_edit_farm: true,
      can_export_data: true,
      can_manage_tasks: true,
      can_invite_members: true,
      can_view_analytics: true,
    },
    isActive: true,
    joinedAt: '2024-01-15',
    updatedAt: '2024-01-15'
  },
  {
    id: 3,
    farmId: 1,
    userId: 'user-3',
    user: {
      id: 'user-3',
      email: 'pierre.bernard@email.com',
      firstName: 'Pierre',
      lastName: 'Bernard',
      createdAt: '2024-02-01',
      updatedAt: '2024-02-01'
    },
    role: 'employee',
    permissions: {
      can_edit_farm: false,
      can_export_data: false,
      can_manage_tasks: true,
      can_invite_members: false,
      can_view_analytics: false,
    },
    isActive: true,
    joinedAt: '2024-02-01',
    updatedAt: '2024-02-01'
  }
];

const mockInvitations: FarmInvitation[] = [
  {
    id: 1,
    farmId: 1,
    invitedBy: 'user-1',
    email: 'nouveau@membre.com',
    role: 'employee',
    message: 'Rejoignez notre équipe pour la saison prochaine !',
    invitationToken: 'token-123',
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Dans 5 jours
    status: 'pending',
    createdAt: '2024-11-15',
    updatedAt: '2024-11-15'
  },
  {
    id: 2,
    farmId: 1,
    invitedBy: 'user-1',
    email: 'conseiller@expert.com',
    role: 'advisor',
    message: 'Nous aimerions votre expertise pour nos cultures bio.',
    invitationToken: 'token-456',
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Dans 2 jours
    status: 'pending',
    createdAt: '2024-11-17',
    updatedAt: '2024-11-17'
  }
];*/

export const FarmMembersScreenTest: React.FC<FarmMembersScreenTestProps> = ({
  onBack
}) => {
  const { activeFarm } = useFarm();
  const [members, setMembers] = useState<FarmMember[]>([]);
  const [invitations, setInvitations] = useState<FarmInvitation[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FarmMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('owner');

  // Charger les données réelles
  useEffect(() => {
    console.log('🔄 [DEBUG] useEffect activeFarm changé:', activeFarm?.id);
    if (activeFarm?.id) {
      console.log('✅ [DEBUG] Ferme active détectée, lancement loadData()');
      loadData();
    } else {
      console.log('⚠️ [DEBUG] Pas de ferme active, pas de chargement');
    }
  }, [activeFarm?.id]);

  const loadData = async () => {
    console.log('🚀 [DEBUG] loadData - Début du chargement');
    console.log('🚀 [DEBUG] activeFarm:', activeFarm);
    
    if (!activeFarm?.id) {
      console.log('❌ [DEBUG] Aucune ferme active, impossible de charger les données');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 [DEBUG] setLoading(true)');
      setLoading(true);
      
      // Obtenir l'utilisateur actuel
      console.log('👤 [DEBUG] Récupération de l\'utilisateur actuel...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 [DEBUG] Utilisateur récupéré:', user?.id, user?.email);
      
      if (!user) {
        console.log('❌ [DEBUG] Aucun utilisateur connecté');
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return;
      }
      
      setCurrentUserId(user.id);
      console.log('✅ [DEBUG] CurrentUserId défini:', user.id);
      
      // Obtenir le rôle réel de l'utilisateur dans cette ferme
      console.log('🔍 [DEBUG] Récupération du rôle utilisateur pour ferme:', activeFarm.id);
      let userRole = await farmMemberService.getUserRole(activeFarm.id, user.id);
      console.log('🔍 [DEBUG] Rôle utilisateur récupéré:', userRole);
      
      // Si l'utilisateur n'est pas membre mais est propriétaire de la ferme, l'ajouter automatiquement
      if (!userRole && activeFarm.owner_id === user.id) {
        console.log('🔧 [DEBUG] Propriétaire non membre détecté, ajout automatique...');
        console.log('🔧 [DEBUG] activeFarm.owner_id:', activeFarm.owner_id, 'user.id:', user.id);
        try {
          await ensureOwnerIsMember(activeFarm.id, user.id);
          userRole = 'owner';
          console.log('✅ [DEBUG] Propriétaire ajouté avec succès, rôle défini à owner');
        } catch (error) {
          console.error('❌ [DEBUG] Erreur lors de l\'ajout du propriétaire comme membre:', error);
          userRole = 'owner'; // On assume le rôle owner même si l'ajout échoue
          console.log('⚠️ [DEBUG] Rôle défini à owner par défaut malgré l\'erreur');
        }
      }
      
      setCurrentUserRole(userRole || 'viewer');
      console.log('✅ [DEBUG] CurrentUserRole défini:', userRole || 'viewer');
      
      // Charger les membres et invitations
      console.log('📊 [DEBUG] Début du chargement des membres et invitations...');
      await Promise.all([
        loadMembers(),
        loadInvitations()
      ]);
      console.log('✅ [DEBUG] Chargement des membres et invitations terminé');
      
    } catch (error) {
      console.error('❌ [DEBUG] Erreur lors du chargement des données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données des membres');
    } finally {
      console.log('🔄 [DEBUG] setLoading(false)');
      setLoading(false);
      console.log('✅ [DEBUG] loadData - Fin du chargement');
    }
  };

  const loadMembers = async () => {
    console.log('👥 [DEBUG] loadMembers - Début');
    if (!activeFarm?.id) {
      console.log('❌ [DEBUG] loadMembers - Pas de ferme active');
      return;
    }
    
    try {
      console.log('📡 [DEBUG] Appel farmMemberService.getFarmMembers avec farmId:', activeFarm.id);
      const farmMembers = await farmMemberService.getFarmMembers(activeFarm.id);
      console.log('✅ [DEBUG] Membres récupérés:', farmMembers.length, 'membres');
      console.log('📋 [DEBUG] Détail des membres:', farmMembers);
      setMembers(farmMembers);
      console.log('✅ [DEBUG] setMembers terminé');
    } catch (error) {
      console.error('❌ [DEBUG] Erreur lors du chargement des membres:', error);
      setMembers([]);
      console.log('⚠️ [DEBUG] setMembers([]) par défaut suite à l\'erreur');
    }
    console.log('✅ [DEBUG] loadMembers - Fin');
  };


  const loadInvitations = async () => {
    console.log('📧 [DEBUG] loadInvitations - Début');
    if (!activeFarm?.id) {
      console.log('❌ [DEBUG] loadInvitations - Pas de ferme active');
      return;
    }
    
    try {
      console.log('📡 [DEBUG] Appel farmMemberService.getFarmInvitations avec farmId:', activeFarm.id);
      const farmInvitations = await farmMemberService.getFarmInvitations(activeFarm.id);
      console.log('✅ [DEBUG] Invitations récupérées:', farmInvitations.length, 'invitations');
      console.log('📋 [DEBUG] Détail des invitations:', farmInvitations);
      setInvitations(farmInvitations);
      console.log('✅ [DEBUG] setInvitations terminé');
    } catch (error) {
      console.error('❌ [DEBUG] Erreur lors du chargement des invitations:', error);
      setInvitations([]);
      console.log('⚠️ [DEBUG] setInvitations([]) par défaut suite à l\'erreur');
    }
    console.log('✅ [DEBUG] loadInvitations - Fin');
  };

  // Fonction pour s'assurer que le propriétaire est membre de sa ferme
  const ensureOwnerIsMember = async (farmId: number, userId: string) => {
    console.log('🔧 [DEBUG] ensureOwnerIsMember - Début');
    console.log('🔧 [DEBUG] farmId:', farmId, 'userId:', userId);
    
    try {
      // Créer le profil utilisateur s'il n'existe pas
      console.log('👤 [DEBUG] Création/mise à jour du profil utilisateur...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 [DEBUG] Données utilisateur pour profil:', user?.email, user?.user_metadata);
      
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: user?.email,
          first_name: user?.user_metadata?.['first_name'] || 'Propriétaire',
          last_name: user?.user_metadata?.['last_name'] || 'Ferme'
        });

      if (profileError) {
        console.warn('⚠️ [DEBUG] Erreur profil (non bloquant):', profileError);
      } else {
        console.log('✅ [DEBUG] Profil créé/mis à jour avec succès');
      }

      // Ajouter le propriétaire comme membre owner
      console.log('👥 [DEBUG] Ajout du propriétaire comme membre...');
      const memberData = {
        farm_id: farmId,
        user_id: userId,
        role: 'owner',
        permissions: {
          can_edit_farm: true,
          can_export_data: true,
          can_manage_tasks: true,
          can_invite_members: true,
          can_view_analytics: true,
        },
        is_active: true,
        joined_at: new Date().toISOString(),
      };
      console.log('👥 [DEBUG] Données membre à insérer:', memberData);
      
      const { error: memberError } = await supabase
        .from('farm_members')
        .insert(memberData);

      if (memberError) {
        console.error('❌ [DEBUG] Erreur lors de l\'ajout du membre propriétaire:', memberError);
        throw memberError;
      }

      console.log('✅ [DEBUG] Propriétaire ajouté comme membre avec succès');
    } catch (error) {
      console.error('❌ [DEBUG] Erreur dans ensureOwnerIsMember:', error);
      throw error;
    }
    console.log('✅ [DEBUG] ensureOwnerIsMember - Fin');
  };

  // Inviter un nouveau membre
  const handleInviteMember = async (data: InviteMemberData) => {
    if (!activeFarm?.id) {
      Alert.alert('Erreur', 'Aucune ferme sélectionnée');
      return;
    }

    try {
      await farmMemberService.inviteMember(activeFarm.id, data);
      await loadInvitations(); // Recharger les invitations
      Alert.alert('Succès', `Invitation créée pour ${data.email}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible d\'envoyer l\'invitation';
      Alert.alert('Erreur', message);
      throw error;
    }
  };

  // Modifier un membre (rôle et permissions)
  const handleUpdateMember = async (memberId: number, newRole: UserRole, newPermissions: MemberPermissions) => {
    if (!activeFarm?.id) {
      Alert.alert('Erreur', 'Aucune ferme sélectionnée');
      return;
    }

    try {
      await farmMemberService.updateMemberRole(activeFarm.id, memberId, newRole);
      await loadMembers(); // Recharger les membres
      Alert.alert('Succès', 'Les permissions du membre ont été mises à jour');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de modifier le membre';
      Alert.alert('Erreur', message);
      throw error;
    }
  };

  // Ouvrir le modal d'édition
  const handleEditMember = (member: FarmMember) => {
    setSelectedMember(member);
    setShowEditModal(true);
  };

  // Supprimer un membre
  const handleRemoveMember = async (memberId: number) => {
    if (!activeFarm?.id) {
      Alert.alert('Erreur', 'Aucune ferme sélectionnée');
      return;
    }

    try {
      await farmMemberService.removeMember(activeFarm.id, memberId);
      await loadMembers(); // Recharger les membres
      Alert.alert('Succès', 'Le membre a été retiré de la ferme');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de supprimer le membre';
      Alert.alert('Erreur', message);
      throw error;
    }
  };

  // Supprimer une invitation
  const handleDeleteInvitation = async (invitationId: number) => {
    try {
      await farmMemberService.cancelInvitation(invitationId);
      await loadInvitations(); // Recharger les invitations
      Alert.alert('Succès', 'L\'invitation a été supprimée');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de supprimer l\'invitation';
      Alert.alert('Erreur', message);
    }
  };

  const canInviteMembers = currentUserRole === 'owner' || currentUserRole === 'manager';
  
  // Debug log
  console.log('Current user role:', currentUserRole, 'Can invite:', canInviteMembers);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {!activeFarm ? (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: 32
        }}>
          <Ionicons name="business-outline" size={80} color={colors.neutral.medium} style={{ marginBottom: 24 }} />
          <Text variant="h3" weight="semibold" style={{ marginBottom: 12, textAlign: 'center', color: colors.text.primary }}>
            Aucune ferme sélectionnée
          </Text>
          <Text variant="body" style={{ textAlign: 'center', marginBottom: 24, color: colors.text.secondary }}>
            Veuillez sélectionner une ferme pour gérer ses membres et invitations.
          </Text>
          <Button
            title="Retour"
            variant="primary"
            onPress={onBack}
          />
        </View>
      ) : (
        <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            colors={[colors.primary.main]}
          />
        }
      >
        {/* Ligne de titre avec bouton + */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: 16 
        }}>
          <View style={{ flex: 1 }}>
            <Text variant="h2" weight="bold" style={{ color: colors.text.primary, marginBottom: 4 }}>
              Équipe de la ferme
            </Text>
            <Text variant="body" style={{ color: colors.text.secondary }}>
              {members.length} membre{members.length > 1 ? 's' : ''} configuré{members.length > 1 ? 's' : ''}
            </Text>
          </View>
          
          {canInviteMembers && (
            <TouchableOpacity
              onPress={() => setShowInviteModal(true)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primary.main,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {/* En-tête avec statistiques */}
        <View style={{
          backgroundColor: colors.background.secondary,
          padding: 20,
          borderRadius: 12,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <View style={{ marginBottom: 16 }}>
            <Text variant="h3" weight="bold" style={{ marginBottom: 4, color: colors.text.primary }}>
              Aperçu
            </Text>
            <Text variant="body" style={{ color: colors.text.secondary }}>
              {members.length} membre{members.length > 1 ? 's' : ''} • {invitations.length} invitation{invitations.length > 1 ? 's' : ''}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text variant="h2" weight="bold" style={{ color: colors.primary.main }}>
                {members.length}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.text.secondary }}>
                Membres
              </Text>
            </View>
            
            <View style={{ width: 1, backgroundColor: colors.border.primary, marginVertical: 8 }} />
            
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text variant="h2" weight="bold" style={{ color: colors.status.warning }}>
                {invitations.length}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.text.secondary }}>
                Invitations
              </Text>
            </View>
          </View>
        </View>

        {/* Invitations en attente */}
        {invitations.length > 0 && (
          <View style={{
            backgroundColor: colors.background.secondary,
            padding: 20,
            borderRadius: 12,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  color={colors.status.warning} 
                  style={{ marginRight: 8 }}
                />
                <Text variant="h3" weight="semibold" style={{ color: colors.text.primary }}>
                  Invitations en attente
                </Text>
                <View style={{
                  backgroundColor: colors.status.warning,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  marginLeft: 8,
                }}>
                  <Text variant="caption" style={{ color: 'white', fontWeight: '600' }}>
                    {invitations.length}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={{ gap: 12 }}>
              {invitations.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onDeleteInvitation={handleDeleteInvitation}
                />
              ))}
            </View>
          </View>
        )}

        {/* Membres actifs */}
        <View style={{
          backgroundColor: colors.background.secondary,
          padding: 20,
          borderRadius: 12,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons 
                name="people-outline" 
                size={20} 
                color={colors.primary.main} 
                style={{ marginRight: 8 }}
              />
              <Text variant="h3" weight="semibold" style={{ color: colors.text.primary }}>
                Membres actifs
              </Text>
              <View style={{
                backgroundColor: colors.primary.main,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 12,
                marginLeft: 8,
              }}>
                <Text variant="caption" style={{ color: 'white', fontWeight: '600' }}>
                  {members.length}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={{ gap: 12 }}>
            {members.length === 0 ? (
              <View style={{ 
                padding: 20, 
                alignItems: 'center',
                backgroundColor: colors.background.primary,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border.primary,
                borderStyle: 'dashed'
              }}>
                <Ionicons name="person-outline" size={32} color={colors.neutral.medium} style={{ marginBottom: 8 }} />
                <Text variant="body" style={{ color: colors.text.secondary, textAlign: 'center' }}>
                  Chargement des membres...
                </Text>
                {!loading && (
                  <Text variant="bodySmall" style={{ color: colors.text.secondary, textAlign: 'center', marginTop: 4 }}>
                    Si le problème persiste, essayez de rafraîchir la page
                  </Text>
                )}
              </View>
            ) : (
              members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  currentUserRole={currentUserRole}
                  onEditMember={handleEditMember}
                />
              ))
            )}
          </View>
        </View>

        {/* Espace en bas */}
        <View style={{ height: 20 }} />
      </ScrollView>
        )}

      {/* Modales (toujours disponibles) */}
      <InviteMemberModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteMember}
        currentUserRole={currentUserRole}
      />

      <EditMemberModal
        visible={showEditModal}
        member={selectedMember}
        currentUserRole={currentUserRole}
        onClose={() => {
          setShowEditModal(false);
          setSelectedMember(null);
        }}
        onUpdateMember={handleUpdateMember}
        onRemoveMember={handleRemoveMember}
      />
    </View>
  );
};
