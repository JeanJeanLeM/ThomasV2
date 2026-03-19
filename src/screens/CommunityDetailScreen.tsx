import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text, Avatar } from '../design-system/components';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { UsersIcon, CogIcon, ChevronRightIcon } from '../design-system/icons';
import { CommunityService } from '../services/CommunityService';
import { useAuth } from '../contexts/AuthContext';
import type { Community, CommunityMember } from '../types';

interface CommunityDetailScreenProps {
  navigation: { goBack: () => void };
  communityId: string;
  onNavigate: (screen: string, params?: { communityId?: string }) => void;
}

const roleLabel: Record<string, string> = {
  admin: 'Administrateur',
  advisor: 'Conseiller',
  farmer: 'Agriculteur',
};

export default function CommunityDetailScreen({
  navigation,
  communityId,
  onNavigate,
}: CommunityDetailScreenProps) {
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [membership, setMembership] = useState<CommunityMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!communityId || !user?.id) return;
    try {
      const [comm, mems, myMembership] = await Promise.all([
        CommunityService.getCommunityById(communityId),
        CommunityService.getCommunityMembers(communityId),
        CommunityService.getMembership(communityId, user.id),
      ]);
      setCommunity(comm ?? null);
      setMembers(mems);
      setMembership(myMembership);
    } catch (e) {
      console.error('[CommunityDetailScreen] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [communityId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const canManage = membership && (membership.role === 'admin' || membership.role === 'advisor');

  const handleJoin = async () => {
    if (!user?.id || !community) return;
    setActionLoading(true);
    try {
      if (community.join_policy === 'open') {
        const ok = await CommunityService.addMember(communityId, user.id, 'farmer');
        if (ok) {
          Alert.alert('Succès', 'Vous avez rejoint la communauté.');
          load();
        } else {
          Alert.alert('Erreur', 'Impossible de rejoindre la communauté.');
        }
      } else {
        const ok = await CommunityService.createJoinRequest(communityId, user.id);
        if (ok) {
          Alert.alert(
            'Demande envoyée',
            'Votre demande d\'adhésion a été envoyée. Vous serez notifié lorsqu\'elle sera traitée.'
          );
          load();
        } else {
          Alert.alert('Erreur', 'Impossible d\'envoyer la demande.');
        }
      }
    } catch (e) {
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !community) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  const isMember = !!membership;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[600]]} />
      }
    >
      {/* En-tête communauté */}
      <View style={styles.header}>
        <Text variant="h2" style={styles.name}>
          {community.name}
        </Text>
        {community.description ? (
          <Text variant="body" style={styles.description}>
            {community.description}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <UsersIcon color={colors.gray[500]} size={18} />
          <Text variant="caption" style={styles.metaText}>
            {community.member_count ?? members.length} membre{(community.member_count ?? members.length) > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {!isMember && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleJoin}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text variant="body" style={styles.primaryButtonText}>
                {community.join_policy === 'open' ? 'Rejoindre' : 'Demander à rejoindre'}
              </Text>
            )}
          </TouchableOpacity>
        )}
        {canManage && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => onNavigate('CommunitySettings', { communityId })}
            activeOpacity={0.8}
          >
            <CogIcon color={colors.primary[600]} size={20} />
            <Text variant="body" style={styles.settingsButtonText}>
              Paramètres
            </Text>
            <ChevronRightIcon color={colors.gray[400]} size={20} />
          </TouchableOpacity>
        )}
      </View>

      {/* Membres */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <UsersIcon color={colors.primary[600]} size={24} />
          <Text variant="h3" style={styles.sectionTitle}>
            Membres
          </Text>
        </View>
        {members.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text variant="body" style={styles.emptyText}>
              Aucun membre pour le moment.
            </Text>
          </View>
        ) : (
          members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <Avatar
                initials={(m.profile?.full_name || m.profile?.first_name || '?').slice(0, 2).toUpperCase()}
                size="md"
                backgroundColor={colors.primary[500]}
                textColor={colors.text?.inverse ?? '#fff'}
              />
              <View style={styles.memberInfo}>
                <Text variant="body" style={styles.memberName}>
                  {m.profile?.full_name || `${m.profile?.first_name ?? ''} ${m.profile?.last_name ?? ''}`.trim() || 'Membre'}
                </Text>
                <Text variant="caption" style={styles.memberRole}>
                  {roleLabel[m.role] ?? m.role}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background?.primary ?? colors.gray[50] },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: colors.background?.secondary ?? '#fff',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  name: { color: colors.text?.primary, marginBottom: spacing.sm },
  description: { color: colors.text?.secondary, marginBottom: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { color: colors.gray[500] },
  actions: { marginBottom: spacing.lg, gap: spacing.sm },
  primaryButton: {
    backgroundColor: colors.primary[600],
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.text?.inverse ?? '#fff', fontWeight: '600' },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background?.secondary ?? '#fff',
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  settingsButtonText: { flex: 1, color: colors.text?.primary, fontWeight: '500' },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { marginLeft: spacing.sm, color: colors.text?.primary },
  emptyCard: {
    backgroundColor: colors.background?.secondary ?? colors.gray[100],
    borderRadius: 12,
    padding: spacing.lg,
  },
  emptyText: { color: colors.text?.secondary },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background?.secondary ?? '#fff',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memberInfo: { marginLeft: spacing.md },
  memberName: { color: colors.text?.primary, fontWeight: '500' },
  memberRole: { color: colors.gray[500], marginTop: 2 },
});
