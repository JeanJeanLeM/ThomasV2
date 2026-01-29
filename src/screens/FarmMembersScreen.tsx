import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  UnifiedHeader,
  Text,
  Card,
  MemberCard,
  InvitationCard,
  InviteMemberModal,
  FarmSelectorModal,
} from '../design-system';
import { colors } from '../design-system/colors';
import { farmMemberService } from '../services/FarmMemberService';
import { useFarmSelector } from '../hooks/useFarmSelector';
import { supabase } from '../utils/supabase';
import type {
  FarmMember,
  FarmInvitation,
  InviteMemberData,
  UserRole,
} from '../types';

interface FarmMembersScreenProps {
  navigation?: {
    goBack?: () => void;
  };
}

export const FarmMembersScreen: React.FC<FarmMembersScreenProps> = ({
  navigation,
}) => {
  const farmSelector = useFarmSelector();
  const activeFarm = farmSelector.activeFarm;
  const farmId = activeFarm?.farm_id ?? null;

  const [members, setMembers] = useState<FarmMember[]>([]);
  const [invitations, setInvitations] = useState<FarmInvitation[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('viewer');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const loadData = async (showRefresh = false) => {
    if (!farmId || !activeFarm) return;
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const userRole = await farmMemberService.getUserRole(farmId, user.id);
        if (userRole) setCurrentUserRole(userRole);
      }

      const [membersData, invitationsData] = await Promise.all([
        farmMemberService.getFarmMembers(farmId),
        farmMemberService.getFarmInvitations(farmId),
      ]);

      setMembers(membersData);
      setInvitations(invitationsData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger les membres de la ferme'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (farmId && activeFarm) {
      loadData();
    } else {
      setMembers([]);
      setInvitations([]);
      setCurrentUserRole('viewer');
      setCurrentUserId(null);
    }
  }, [farmId, activeFarm?.farm_id]);

  const handleRefresh = () => {
    loadData(true);
  };

  const handleInviteMember = async (data: InviteMemberData) => {
    if (!farmId) return;
    try {
      await farmMemberService.inviteMember(farmId, data);
      Alert.alert(
        'Invitation envoyée',
        `L'invitation a été envoyée à ${data.email}. La personne la verra dans "Mes invitations" en se connectant avec le même email.`
      );
      const newInvitations = await farmMemberService.getFarmInvitations(farmId);
      setInvitations(newInvitations);
    } catch (error) {
      throw error;
    }
  };

  const handleUpdateMemberRole = async (memberId: number, newRole: UserRole) => {
    if (!farmId) return;
    try {
      await farmMemberService.updateMemberRole(farmId, memberId, newRole);
      Alert.alert('Rôle modifié', 'Le rôle du membre a été mis à jour avec succès');
      const updatedMembers = await farmMemberService.getFarmMembers(farmId);
      setMembers(updatedMembers);
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : 'Impossible de modifier le rôle'
      );
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!farmId) return;
    try {
      await farmMemberService.removeMember(farmId, memberId);
      Alert.alert('Membre supprimé', 'Le membre a été retiré de la ferme');
      const updatedMembers = await farmMemberService.getFarmMembers(farmId);
      setMembers(updatedMembers);
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : 'Impossible de supprimer le membre'
      );
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      await farmMemberService.cancelInvitation(invitationId);
      Alert.alert('Invitation annulée', "L'invitation a été annulée");
      if (farmId) {
        const updatedInvitations = await farmMemberService.getFarmInvitations(farmId);
        setInvitations(updatedInvitations);
      }
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : "Impossible d'annuler l'invitation"
      );
    }
  };

  const handleResendInvitation = async (invitationId: number) => {
    try {
      await farmMemberService.resendInvitation(invitationId);
      Alert.alert('Invitation renvoyée', "L'invitation a été renvoyée avec succès");
      if (farmId) {
        const updatedInvitations = await farmMemberService.getFarmInvitations(farmId);
        setInvitations(updatedInvitations);
      }
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : "Impossible de renvoyer l'invitation"
      );
    }
  };

  const canInviteMembers = currentUserRole === 'owner' || currentUserRole === 'manager';
  const hasActiveFarm = !!activeFarm && !!farmId;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background?.secondary ?? colors.gray[50] }}>
      <UnifiedHeader
        title="Membres de la ferme"
        onBack={navigation?.goBack}
        onFarmSelector={farmSelector.openFarmSelector}
        showBackButton={!!navigation?.goBack}
      />

      {!hasActiveFarm ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <Ionicons
            name="business-outline"
            size={48}
            color={colors.neutral.medium}
            style={{ marginBottom: 16 }}
          />
          <Text variant="h4" weight="semibold" style={{ marginBottom: 8, textAlign: 'center' }}>
            Aucune ferme sélectionnée
          </Text>
          <Text variant="body" color="medium" style={{ textAlign: 'center', marginBottom: 24 }}>
            Sélectionnez une ferme pour gérer les membres et les invitations.
          </Text>
          <TouchableOpacity
            onPress={farmSelector.openFarmSelector}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: colors.primary.main,
            }}
          >
            <Text variant="body" weight="semibold" style={{ color: '#fff' }}>
              Choisir une ferme
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 8,
            }}
          >
            <Text variant="body" color="medium">
              {activeFarm.farm_name}
            </Text>
            {canInviteMembers && (
              <TouchableOpacity
                onPress={() => setShowInviteModal(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: colors.primary.main,
                }}
              >
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text variant="body" weight="semibold" style={{ color: '#fff' }}>
                  Inviter un membre
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingTop: 8 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary.main]}
              />
            }
          >
            <View style={{ flexDirection: 'row', marginBottom: 24, gap: 12 }}>
              <Card variant="elevated" style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="headingSmall" weight="bold" style={{ color: colors.primary.main }}>
                  {members.length}
                </Text>
                <Text variant="bodySmall" color="medium">
                  Membres actifs
                </Text>
              </Card>
              <Card variant="elevated" style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="headingSmall" weight="bold" style={{ color: colors.status.warning }}>
                  {invitations.length}
                </Text>
                <Text variant="bodySmall" color="medium">
                  Invitations en cours
                </Text>
              </Card>
            </View>

            {invitations.length > 0 && (
              <View style={{ marginBottom: 32 }}>
                {invitations.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    onCancelInvitation={handleCancelInvitation}
                    onResendInvitation={handleResendInvitation}
                  />
                ))}
              </View>
            )}

            <View>
              {members.length === 0 ? (
                <View
                  style={{
                    backgroundColor: colors.neutral.light,
                    padding: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                >
                  <Ionicons
                    name="people-outline"
                    size={48}
                    color={colors.neutral.medium}
                    style={{ marginBottom: 12 }}
                  />
                  <Text variant="bodyMedium" weight="semibold" style={{ marginBottom: 4 }}>
                    Aucun membre pour le moment
                  </Text>
                  <Text variant="bodySmall" color="medium" style={{ textAlign: 'center' }}>
                    {canInviteMembers
                      ? 'Commencez par inviter des membres à rejoindre votre ferme'
                      : 'Les membres apparaîtront ici une fois invités'}
                  </Text>
                </View>
              ) : (
                members.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    currentUserRole={currentUserRole}
                    onUpdateRole={handleUpdateMemberRole}
                    onRemoveMember={handleRemoveMember}
                  />
                ))
              )}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </>
      )}

      <InviteMemberModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteMember}
        currentUserRole={currentUserRole}
      />

      <FarmSelectorModal
        visible={farmSelector.showModal}
        onClose={farmSelector.closeFarmSelector}
        currentFarmId={farmSelector.activeFarm?.farm_id ?? null}
        onFarmSelect={(farm) => {
          farmSelector.selectFarm(farm);
          farmSelector.closeFarmSelector();
        }}
        onCreateFarm={() => {
          farmSelector.createFarm();
          farmSelector.closeFarmSelector();
        }}
      />
    </View>
  );
};
