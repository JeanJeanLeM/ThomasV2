import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../design-system/components';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { UsersIcon, PlusIcon, ChevronRightIcon } from '../design-system/icons';
import { CommunityService } from '../services/CommunityService';
import { useAuth } from '../contexts/AuthContext';
import type { Community } from '../types';

interface CommunityListScreenProps {
  navigation: { goBack: () => void };
  onNavigate: (screen: string, params?: { communityId?: string }) => void;
}

export default function CommunityListScreen({ navigation, onNavigate }: CommunityListScreenProps) {
  const { user } = useAuth();
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [discoverable, setDiscoverable] = useState<Community[]>([]);
  const [primaryRole, setPrimaryRole] = useState<string>('farmer');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [my, disc, role] = await Promise.all([
        CommunityService.getMyCommunities(user.id),
        CommunityService.getDiscoverableCommunities(),
        CommunityService.getPrimaryRole(user.id),
      ]);
      setMyCommunities(my);
      setDiscoverable(disc.filter((c) => !my.some((m) => m.id === c.id)));
      setPrimaryRole(role);
    } catch (e) {
      console.error('[CommunityListScreen] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const canCreate = primaryRole === 'advisor' || primaryRole === 'admin';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[600]]} />
      }
    >
      {/* Mes communautés */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <UsersIcon color={colors.primary[600]} size={24} />
          <Text variant="h3" style={styles.sectionTitle}>
            Mes communautés
          </Text>
        </View>
        {myCommunities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text variant="body" style={styles.emptyText}>
              Vous n'êtes membre d'aucune communauté. Découvrez-en une ci-dessous ou créez-en une.
            </Text>
          </View>
        ) : (
          myCommunities.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.card}
              onPress={() => onNavigate('CommunityDetail', { communityId: c.id })}
              activeOpacity={0.7}
            >
              <View style={styles.cardMain}>
                <Text variant="h4" style={styles.cardTitle}>
                  {c.name}
                </Text>
                {c.description ? (
                  <Text variant="caption" style={styles.cardDesc} numberOfLines={2}>
                    {c.description}
                  </Text>
                ) : null}
                <Text variant="caption" style={styles.cardMeta}>
                  {c.member_count ?? 0} membre{(c.member_count ?? 0) > 1 ? 's' : ''}
                </Text>
              </View>
              <ChevronRightIcon color={colors.gray[400]} size={20} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Découvrir */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <UsersIcon color={colors.semantic.info} size={24} />
          <Text variant="h3" style={styles.sectionTitle}>
            Découvrir
          </Text>
        </View>
        {discoverable.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text variant="body" style={styles.emptyText}>
              Aucune autre communauté disponible pour le moment.
            </Text>
          </View>
        ) : (
          discoverable.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.card}
              onPress={() => onNavigate('CommunityDetail', { communityId: c.id })}
              activeOpacity={0.7}
            >
              <View style={styles.cardMain}>
                <Text variant="h4" style={styles.cardTitle}>
                  {c.name}
                </Text>
                {c.description ? (
                  <Text variant="caption" style={styles.cardDesc} numberOfLines={2}>
                    {c.description}
                  </Text>
                ) : null}
                <Text variant="caption" style={styles.cardMeta}>
                  {c.member_count ?? 0} membre{(c.member_count ?? 0) > 1 ? 's' : ''}
                </Text>
              </View>
              <ChevronRightIcon color={colors.gray[400]} size={20} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {canCreate && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => onNavigate('CommunityCreate')}
          activeOpacity={0.8}
        >
          <PlusIcon color={colors.text.inverse} size={24} />
          <Text variant="body" style={styles.createButtonText}>
            Créer une communauté
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background?.primary ?? colors.gray[50] },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { marginLeft: spacing.sm, color: colors.text?.primary },
  emptyCard: {
    backgroundColor: colors.background?.secondary ?? colors.gray[100],
    borderRadius: 12,
    padding: spacing.lg,
  },
  emptyText: { color: colors.text?.secondary },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background?.secondary ?? '#fff',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
  },
  cardMain: { flex: 1 },
  cardTitle: { color: colors.text?.primary, marginBottom: spacing.xs },
  cardDesc: { color: colors.text?.secondary, marginBottom: spacing.xs },
  cardMeta: { color: colors.gray[500] },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  createButtonText: { color: colors.text?.inverse ?? '#fff', fontWeight: '600' },
});
