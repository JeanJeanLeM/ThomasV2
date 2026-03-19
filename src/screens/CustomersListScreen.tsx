import React, { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
  TruckIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
} from '../design-system/icons';
import { Text, Button, Input } from '../design-system/components';
import { useFarm } from '../contexts/FarmContext';
import { CustomerService } from '../services/CustomerService';
import { SupplierService } from '../services/SupplierService';
import type { Customer, Supplier } from '../types';
import type { ScreenName } from '../contexts/NavigationContext';

interface CustomersListScreenProps {
  navigation: { goBack: () => void };
  onNavigate: (screen: ScreenName, params?: Record<string, unknown>) => void;
}

type TabType = 'customers' | 'suppliers';

export default function CustomersListScreen({ navigation, onNavigate }: CustomersListScreenProps) {
  const { activeFarm } = useFarm();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabType>('customers');
  const [searchQuery, setSearchQuery] = useState('');

  const loadAll = async (isRefresh = false) => {
    if (!activeFarm?.farm_id) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [customersList, suppliersList] = await Promise.all([
        CustomerService.getCustomers(activeFarm.farm_id),
        SupplierService.getSuppliers(activeFarm.farm_id),
      ]);
      setCustomers(customersList);
      setSuppliers(suppliersList);
    } catch (e) {
      console.error('[CustomersList] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [activeFarm?.farm_id]);

  const handleRefresh = () => loadAll(true);

  // ── Real stats ──
  const stats = useMemo(() => {
    const customersWithEmail = customers.filter((c) => c.email).length;
    const customersWithPhone = customers.filter((c) => c.phone).length;
    const customersWithCity = customers.filter((c) => c.city).length;
    const suppliersWithEmail = suppliers.filter((s) => s.email).length;

    return {
      totalCustomers: customers.length,
      totalSuppliers: suppliers.length,
      customersWithEmail,
      customersWithPhone,
      customersWithCity,
      suppliersWithEmail,
      totalContacts: customers.length + suppliers.length,
    };
  }, [customers, suppliers]);

  // ── Filtered items ──
  const filteredItems = useMemo(() => {
    const list = tab === 'customers' ? customers : suppliers;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter((item) => {
      const haystack = [
        item.company_name,
        (item as Customer).contact_name ?? '',
        item.city ?? '',
        item.email ?? '',
        item.phone ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [tab, customers, suppliers, searchQuery]);

  const handleEdit = (id: string) => {
    onNavigate('CustomerEdit', {
      customerId: id,
      mode: tab === 'customers' ? 'customer' : 'supplier',
    });
  };

  const handleAdd = () => {
    onNavigate('CustomerEdit', {
      mode: tab === 'customers' ? 'customer' : 'supplier',
    });
  };

  const hasNoContacts = customers.length === 0 && suppliers.length === 0 && !loading;
  const currentTabEmpty = (tab === 'customers' ? customers.length : suppliers.length) === 0 && !loading;

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
              Carnet de contacts
            </Text>
            <Text variant="body" style={styles.subtitle}>
              {stats.totalContacts} contact{stats.totalContacts > 1 ? 's' : ''} enregistré{stats.totalContacts > 1 ? 's' : ''}
            </Text>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <PlusIcon color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* ── Summary stats card ── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <UsersIcon color={colors.semantic.info} size={22} />
            <Text variant="h3" style={styles.summaryTitle}>
              Aperçu de vos données
            </Text>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryNumber}>{stats.totalCustomers}</Text>
              <Text style={styles.summaryLabel}>Clients</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryNumber, { color: colors.semantic.warning }]}>
                {stats.totalSuppliers}
              </Text>
              <Text style={styles.summaryLabel}>Fournisseurs</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryNumber, { color: colors.semantic.success }]}>
                {stats.customersWithEmail + stats.suppliersWithEmail}
              </Text>
              <Text style={styles.summaryLabel}>Avec email</Text>
            </View>
          </View>
        </View>

        {/* ── Tutorial card when no contacts at all ── */}
        {hasNoContacts && (
          <View style={styles.tutorialCard}>
            <View style={styles.tutorialIconRow}>
              <View style={styles.tutorialIconCircle}>
                <UsersIcon color={colors.primary[600]} size={28} />
              </View>
            </View>
            <Text variant="h3" style={styles.tutorialTitle}>
              Gérez vos contacts
            </Text>
            <Text variant="body" style={styles.tutorialText}>
              Ajoutez vos clients et fournisseurs pour simplifier la création de factures. Thomas peut aussi les ajouter pour vous depuis le chat !
            </Text>
            <View style={styles.tutorialSteps}>
              <View style={styles.tutorialStep}>
                <View style={styles.tutorialStepNumber}>
                  <Text style={styles.tutorialStepNumberText}>1</Text>
                </View>
                <Text variant="body" style={styles.tutorialStepText}>
                  Ajoutez un client avec son nom et ses coordonnées
                </Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={styles.tutorialStepNumber}>
                  <Text style={styles.tutorialStepNumberText}>2</Text>
                </View>
                <Text variant="body" style={styles.tutorialStepText}>
                  Renseignez le SIRET pour la facturation officielle
                </Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={styles.tutorialStepNumber}>
                  <Text style={styles.tutorialStepNumberText}>3</Text>
                </View>
                <Text variant="body" style={styles.tutorialStepText}>
                  Retrouvez-les facilement lors de la création de factures
                </Text>
              </View>
            </View>
            <Button
              title="Ajouter mon premier client"
              onPress={() => onNavigate('CustomerEdit', { mode: 'customer' })}
              style={styles.tutorialButton}
            />
          </View>
        )}

        {/* ── Content when contacts exist ── */}
        {!hasNoContacts && (
          <>
            {/* Tab selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, tab === 'customers' && styles.tabActive]}
                onPress={() => { setTab('customers'); setSearchQuery(''); }}
              >
                <UserIcon color={tab === 'customers' ? '#fff' : colors.gray[500]} size={18} />
                <Text style={[styles.tabText, tab === 'customers' && styles.tabTextActive]}>
                  Clients
                </Text>
                {stats.totalCustomers > 0 && (
                  <View style={[styles.tabBadge, tab === 'customers' && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, tab === 'customers' && styles.tabBadgeTextActive]}>
                      {stats.totalCustomers}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'suppliers' && styles.tabActive]}
                onPress={() => { setTab('suppliers'); setSearchQuery(''); }}
              >
                <TruckIcon color={tab === 'suppliers' ? '#fff' : colors.gray[500]} size={18} />
                <Text style={[styles.tabText, tab === 'suppliers' && styles.tabTextActive]}>
                  Fournisseurs
                </Text>
                {stats.totalSuppliers > 0 && (
                  <View style={[styles.tabBadge, tab === 'suppliers' && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, tab === 'suppliers' && styles.tabBadgeTextActive]}>
                      {stats.totalSuppliers}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Input
                placeholder={tab === 'customers' ? 'Rechercher un client...' : 'Rechercher un fournisseur...'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                leftIcon={<SearchIcon color={colors.gray[400]} size={20} />}
              />
            </View>

            {/* List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary[600]} />
                <Text variant="body" style={styles.loadingText}>
                  Chargement...
                </Text>
              </View>
            ) : currentTabEmpty ? (
              // ── Tab-specific tutorial when that tab is empty ──
              <View style={styles.emptyTabCard}>
                <View style={styles.emptyTabIconCircle}>
                  {tab === 'customers' ? (
                    <UserIcon color={colors.primary[600]} size={32} />
                  ) : (
                    <TruckIcon color={colors.semantic.warning} size={32} />
                  )}
                </View>
                <Text variant="h3" style={styles.emptyTabTitle}>
                  {tab === 'customers' ? 'Aucun client ajouté' : 'Aucun fournisseur ajouté'}
                </Text>
                <Text variant="body" style={styles.emptyTabText}>
                  {tab === 'customers'
                    ? 'Ajoutez vos clients pour créer des factures de vente rapidement.'
                    : 'Ajoutez vos fournisseurs pour suivre vos achats et dépenses.'}
                </Text>
                <Button
                  title={tab === 'customers' ? 'Ajouter un client' : 'Ajouter un fournisseur'}
                  onPress={handleAdd}
                  style={styles.emptyTabButton}
                />
              </View>
            ) : (
              <View style={styles.contactsList}>
                {filteredItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.contactCard}
                    onPress={() => handleEdit(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.contactCardHeader}>
                      <View style={styles.contactAvatar}>
                        <Text style={styles.contactAvatarText}>
                          {item.company_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.contactCardInfo}>
                        <Text style={styles.contactName}>{item.company_name}</Text>
                        {(item as Customer).contact_name && (
                          <Text style={styles.contactDetail}>
                            {(item as Customer).contact_name}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Contact details row */}
                    <View style={styles.contactDetailsRow}>
                      {item.city && (
                        <View style={styles.contactDetailChip}>
                          <MapPinIcon color={colors.gray[400]} size={14} />
                          <Text style={styles.contactDetailText}>{item.city}</Text>
                        </View>
                      )}
                      {item.email && (
                        <View style={styles.contactDetailChip}>
                          <EnvelopeIcon color={colors.gray[400]} size={14} />
                          <Text style={styles.contactDetailText} numberOfLines={1}>{item.email}</Text>
                        </View>
                      )}
                      {item.phone && (
                        <View style={styles.contactDetailChip}>
                          <PhoneIcon color={colors.gray[400]} size={14} />
                          <Text style={styles.contactDetailText}>{item.phone}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}

                {filteredItems.length === 0 && searchQuery.trim() !== '' && (
                  <View style={styles.emptyFilterState}>
                    <SearchIcon color={colors.gray[400]} size={48} />
                    <Text variant="body" style={styles.emptyFilterText}>
                      Aucun résultat pour "{searchQuery}"
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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
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
  tutorialButton: {
    minWidth: 240,
    alignSelf: 'center',
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
    gap: spacing.xs,
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

  // ── Contact cards ──
  contactsList: {},
  contactCard: {
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
  contactCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contactAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary[700],
  },
  contactCardInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
  },
  contactDetail: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: 2,
  },
  contactDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contactDetailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  contactDetailText: {
    fontSize: 12,
    color: colors.gray[600],
    maxWidth: 150,
  },

  // ── Empty tab card ──
  emptyTabCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderStyle: 'dashed',
  },
  emptyTabIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTabTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyTabText: {
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  emptyTabButton: {
    minWidth: 220,
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
