import React, { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import {
  DocumentTextIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
} from '../design-system/icons';
import { Text, Button, Input } from '../design-system/components';
import { useFarm } from '../contexts/FarmContext';
import { InvoiceService } from '../services/InvoiceService';
import type { Invoice } from '../types';
import type { ScreenName } from '../contexts/NavigationContext';

interface InvoicesListScreenProps {
  navigation: { goBack: () => void };
  onNavigate: (screen: ScreenName, params?: Record<string, unknown>) => void;
}

type TabType = 'outgoing' | 'incoming';
type StatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'cancelled';

export default function InvoicesListScreen({ navigation, onNavigate }: InvoicesListScreenProps) {
  const { activeFarm } = useFarm();
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabType>('outgoing');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadInvoices = async (isRefresh = false) => {
    if (!activeFarm?.farm_id) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      // Load all invoices for the farm so we can compute stats
      const { data } = await InvoiceService.getInvoices(activeFarm.farm_id, {});
      setAllInvoices(data ?? []);
    } catch (e) {
      console.error('[InvoicesList] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [activeFarm?.farm_id]);

  const handleRefresh = () => loadInvoices(true);

  // ── Real stats computed from data ──
  const stats = useMemo(() => {
    const outgoing = allInvoices.filter((i) => i.direction === 'outgoing');
    const incoming = allInvoices.filter((i) => i.direction === 'incoming');

    const totalOutgoingTTC = outgoing.reduce((sum, i) => sum + (i.total_ttc ?? 0), 0);
    const totalIncomingTTC = incoming.reduce((sum, i) => sum + (i.total_ttc ?? 0), 0);
    const unpaidOutgoing = outgoing.filter((i) => i.status === 'sent').length;
    const paidOutgoing = outgoing.filter((i) => i.status === 'paid').length;
    const unpaidIncoming = incoming.filter((i) => i.status === 'sent').length;

    return {
      totalInvoices: allInvoices.length,
      outgoingCount: outgoing.length,
      incomingCount: incoming.length,
      totalOutgoingTTC,
      totalIncomingTTC,
      unpaidOutgoing,
      paidOutgoing,
      unpaidIncoming,
    };
  }, [allInvoices]);

  // ── Filtered invoices for the current tab ──
  const filteredInvoices = useMemo(() => {
    let list = allInvoices.filter((i) => i.direction === tab);

    if (statusFilter !== 'all') {
      list = list.filter((i) => i.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) => {
        const haystack = [i.invoice_number, i.notes ?? ''].join(' ').toLowerCase();
        return haystack.includes(q);
      });
    }

    return list.sort(
      (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
    );
  }, [allInvoices, tab, statusFilter, searchQuery]);

  // ── Status counts for current tab ──
  const statusCounts = useMemo(() => {
    const tabInvoices = allInvoices.filter((i) => i.direction === tab);
    return {
      all: tabInvoices.length,
      draft: tabInvoices.filter((i) => i.status === 'draft').length,
      sent: tabInvoices.filter((i) => i.status === 'sent').length,
      paid: tabInvoices.filter((i) => i.status === 'paid').length,
      cancelled: tabInvoices.filter((i) => i.status === 'cancelled').length,
    };
  }, [allInvoices, tab]);

  const handleInvoicePress = (inv: Invoice) => {
    onNavigate('InvoiceDetails', { invoiceId: inv.id });
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'paid': return 'Payé';
      case 'sent': return 'À régler';
      case 'draft': return 'Brouillon';
      case 'cancelled': return 'Annulé';
      default: return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'paid': return colors.semantic.success;
      case 'sent': return colors.semantic.warning;
      case 'draft': return colors.gray[500];
      case 'cancelled': return colors.semantic.error;
      default: return colors.gray[500];
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  };

  const hasNoInvoices = allInvoices.length === 0 && !loading;

  return (
    <ScrollView
      style={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary[600]]}
          tintColor={colors.primary[600]}
        />
      }
    >
      <View style={styles.content}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text variant="h2" style={styles.title}>
              Gestion des factures
            </Text>
            <Text variant="body" style={styles.subtitle}>
              {allInvoices.length} facture{allInvoices.length > 1 ? 's' : ''} enregistrée{allInvoices.length > 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.addButton, styles.secondaryButton]}
              onPress={() => onNavigate('CustomersList')}
            >
              <UsersIcon color="white" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => onNavigate('InvoiceCreate')}
            >
              <PlusIcon color="white" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Summary stats card ── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <DocumentTextIcon color={colors.semantic.info} size={22} />
            <Text variant="h3" style={styles.summaryTitle}>
              Aperçu de vos données
            </Text>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryNumber}>{stats.totalInvoices}</Text>
              <Text style={styles.summaryLabel}>Factures</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryNumber, { color: colors.semantic.success }]}>
                {formatCurrency(stats.totalOutgoingTTC)}
              </Text>
              <Text style={styles.summaryLabel}>CA Ventes</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryNumber, { color: colors.semantic.warning }]}>
                {stats.unpaidOutgoing}
              </Text>
              <Text style={styles.summaryLabel}>À régler</Text>
            </View>
          </View>
        </View>

        {/* ── Tutorial card when no invoices ── */}
        {hasNoInvoices && (
          <View style={styles.tutorialCard}>
            <View style={styles.tutorialIconRow}>
              <View style={styles.tutorialIconCircle}>
                <DocumentTextIcon color={colors.primary[600]} size={28} />
              </View>
            </View>
            <Text variant="h3" style={styles.tutorialTitle}>
              Bienvenue dans la facturation
            </Text>
            <Text variant="body" style={styles.tutorialText}>
              Créez votre première facture en quelques clics. Thomas peut aussi les générer pour vous depuis le chat : dites-lui simplement "Crée une facture pour..." !
            </Text>
            <View style={styles.tutorialSteps}>
              <View style={styles.tutorialStep}>
                <View style={styles.tutorialStepNumber}>
                  <Text style={styles.tutorialStepNumberText}>1</Text>
                </View>
                <Text variant="body" style={styles.tutorialStepText}>
                  Ajoutez d'abord vos clients dans l'onglet Clients
                </Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={styles.tutorialStepNumber}>
                  <Text style={styles.tutorialStepNumberText}>2</Text>
                </View>
                <Text variant="body" style={styles.tutorialStepText}>
                  Créez une facture avec les produits et quantités
                </Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={styles.tutorialStepNumber}>
                  <Text style={styles.tutorialStepNumberText}>3</Text>
                </View>
                <Text variant="body" style={styles.tutorialStepText}>
                  Suivez les paiements et le chiffre d'affaires
                </Text>
              </View>
            </View>
            <View style={styles.tutorialActions}>
              <Button
                title="Créer ma première facture"
                onPress={() => onNavigate('InvoiceCreate')}
                style={styles.tutorialButton}
              />
              <TouchableOpacity
                style={styles.tutorialSecondaryAction}
                onPress={() => onNavigate('CustomersList')}
              >
                <UsersIcon color={colors.primary[600]} size={18} />
                <Text style={styles.tutorialSecondaryText}>Gérer mes clients</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Content when invoices exist ── */}
        {!hasNoInvoices && (
          <>
            {/* Tab selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, tab === 'outgoing' && styles.tabActive]}
                onPress={() => { setTab('outgoing'); setStatusFilter('all'); }}
              >
                <Text style={[styles.tabText, tab === 'outgoing' && styles.tabTextActive]}>
                  Ventes
                </Text>
                {stats.outgoingCount > 0 && (
                  <View style={[styles.tabBadge, tab === 'outgoing' && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, tab === 'outgoing' && styles.tabBadgeTextActive]}>
                      {stats.outgoingCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'incoming' && styles.tabActive]}
                onPress={() => { setTab('incoming'); setStatusFilter('all'); }}
              >
                <Text style={[styles.tabText, tab === 'incoming' && styles.tabTextActive]}>
                  Achats
                </Text>
                {stats.incomingCount > 0 && (
                  <View style={[styles.tabBadge, tab === 'incoming' && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, tab === 'incoming' && styles.tabBadgeTextActive]}>
                      {stats.incomingCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Input
                placeholder="Rechercher une facture..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                leftIcon={<SearchIcon color={colors.gray[400]} size={20} />}
              />
            </View>

            {/* Filter chips */}
            <View style={styles.filtersContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
              >
                {([
                  { key: 'all' as StatusFilter, label: 'Toutes', color: colors.gray[600] },
                  { key: 'sent' as StatusFilter, label: 'À régler', color: colors.semantic.warning },
                  { key: 'paid' as StatusFilter, label: 'Payées', color: colors.semantic.success },
                  { key: 'draft' as StatusFilter, label: 'Brouillons', color: colors.gray[500] },
                  { key: 'cancelled' as StatusFilter, label: 'Annulées', color: colors.semantic.error },
                ]).map((filter) => {
                  const count = statusCounts[filter.key];
                  if (filter.key !== 'all' && count === 0) return null;
                  const isSelected = statusFilter === filter.key;

                  return (
                    <TouchableOpacity
                      key={filter.key}
                      style={[
                        styles.filterChip,
                        isSelected && {
                          backgroundColor: filter.color,
                          borderColor: filter.color,
                        },
                      ]}
                      onPress={() => setStatusFilter(filter.key)}
                    >
                      <Text
                        variant="caption"
                        weight="medium"
                        color={isSelected ? colors.text.inverse : colors.text.secondary}
                      >
                        {filter.label}
                      </Text>
                      {count > 0 && (
                        <View
                          style={[
                            styles.countBadge,
                            isSelected && styles.countBadgeSelected,
                          ]}
                        >
                          <Text
                            variant="caption"
                            weight="bold"
                            color={isSelected ? filter.color : colors.text.inverse}
                            style={{ fontSize: 10 }}
                          >
                            {count}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Invoice list */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary[600]} />
                <Text variant="body" style={styles.loadingText}>
                  Chargement des factures...
                </Text>
              </View>
            ) : (
              <View style={styles.invoicesList}>
                {filteredInvoices.map((inv) => (
                  <TouchableOpacity
                    key={inv.id}
                    style={styles.invoiceCard}
                    onPress={() => handleInvoicePress(inv)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.invoiceCardHeader}>
                      <View style={styles.invoiceCardLeft}>
                        <View style={[styles.invoiceIcon, { backgroundColor: statusColor(inv.status) + '15' }]}>
                          <DocumentTextIcon color={statusColor(inv.status)} size={20} />
                        </View>
                        <View style={styles.invoiceCardInfo}>
                          <Text style={styles.invoiceNumber}>{inv.invoice_number}</Text>
                          <Text style={styles.invoiceDate}>
                            {new Date(inv.invoice_date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.invoiceCardRight}>
                        <Text style={[styles.invoiceTotal, { color: statusColor(inv.status) }]}>
                          {formatCurrency(inv.total_ttc ?? 0)}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusColor(inv.status) + '18' },
                          ]}
                        >
                          <Text
                            style={[styles.statusText, { color: statusColor(inv.status) }]}
                          >
                            {statusLabel(inv.status)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {inv.notes && (
                      <Text style={styles.invoiceNotes} numberOfLines={1}>
                        {inv.notes}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}

                {filteredInvoices.length === 0 && (
                  <View style={styles.emptyFilterState}>
                    <ClipboardDocumentListIcon color={colors.gray[400]} size={48} />
                    <Text variant="body" style={styles.emptyFilterText}>
                      Aucune facture ne correspond à vos filtres
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing.lg,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: colors.gray[500],
    marginRight: spacing.sm,
  },

  // ── Summary card ──
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  summaryTitle: {
    color: colors.text.primary,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.semantic.info,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // ── Tutorial card ──
  tutorialCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tutorialIconRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tutorialIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tutorialTitle: {
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  tutorialText: {
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  tutorialSteps: {
    marginBottom: spacing.lg,
  },
  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tutorialStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  tutorialStepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary[700],
  },
  tutorialStepText: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: 14,
  },
  tutorialActions: {
    alignItems: 'center',
  },
  tutorialButton: {
    minWidth: 240,
    marginBottom: spacing.md,
  },
  tutorialSecondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tutorialSecondaryText: {
    color: colors.primary[600],
    fontSize: 14,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },

  // ── Tabs ──
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.primary[600],
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[500],
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: colors.gray[200],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: spacing.xs,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray[600],
  },
  tabBadgeTextActive: {
    color: '#fff',
  },

  // ── Search ──
  searchContainer: {
    marginBottom: spacing.lg,
  },

  // ── Filters ──
  filtersContainer: {
    marginBottom: spacing.lg,
  },
  filterScrollContent: {
    paddingHorizontal: 2,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.gray[300],
    gap: spacing.xs,
  },
  countBadge: {
    backgroundColor: colors.primary[600],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeSelected: {
    backgroundColor: colors.background.secondary,
  },

  // ── Invoice cards ──
  invoicesList: {},
  invoiceCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  invoiceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  invoiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  invoiceCardInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
  },
  invoiceDate: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 2,
  },
  invoiceCardRight: {
    alignItems: 'flex-end',
  },
  invoiceTotal: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  invoiceNotes: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },

  // ── Empty / Loading ──
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyFilterState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyFilterText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
