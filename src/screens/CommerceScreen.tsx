import React, { useMemo, useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { textStyles } from '../design-system/typography';
import {
  DocumentTextIcon,
  UsersIcon,
  UserIcon,
  SproutIcon,
  ClipboardDocumentListIcon,
  MicrophoneIcon,
  QuestionMarkCircleIcon,
} from '../design-system/icons';
import { Text } from '../design-system/components';
import { useFarm } from '../contexts/FarmContext';
import { InvoiceService } from '../services/InvoiceService';
import { CustomerService } from '../services/CustomerService';
import { SupplierService } from '../services/SupplierService';
import { ProductService } from '../services/ProductService';
import type { Invoice, Customer, Supplier, Product } from '../types';
import type { ScreenName } from '../contexts/NavigationContext';

interface CommerceScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

export default function CommerceScreen({ onNavigate }: CommerceScreenProps) {
  const { activeFarm } = useFarm();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!activeFarm?.farm_id) return;

      try {
        const [invoicesRes, customersList, suppliersList, productsList] = await Promise.all([
          InvoiceService.getInvoices(activeFarm.farm_id, {}),
          CustomerService.getCustomers(activeFarm.farm_id),
          SupplierService.getSuppliers(activeFarm.farm_id),
          ProductService.getProducts(activeFarm.farm_id),
        ]);

        setInvoices(invoicesRes.data ?? []);
        setCustomers(customersList);
        setSuppliers(suppliersList);
        setProducts(productsList);
      } catch (err) {
        console.error('[CommerceScreen] load error:', err);
      }
    };

    loadData();
  }, [activeFarm?.farm_id]);

  // ── Real stats ──
  const stats = useMemo(() => {
    const outgoing = invoices.filter((i) => i.direction === 'outgoing');
    const totalCA = outgoing.reduce((sum, i) => sum + (i.total_ttc ?? 0), 0);

    return {
      invoices: invoices.length,
      customers: customers.length + suppliers.length,
      products: products.length,
      totalCA,
    };
  }, [invoices, customers, suppliers, products]);

  const settingsOptions = [
    {
      id: 'invoices',
      title: 'Factures',
      subtitle: 'Créez et suivez vos factures de vente et d\'achat, gérez les paiements',
      icon: <DocumentTextIcon color={colors.semantic.success} size={28} />,
      borderColor: colors.semantic.success,
      onPress: () => onNavigate('InvoicesList'),
      hasVoiceAI: true,
      hasForm: true,
    },
    {
      id: 'customers',
      title: 'Clients & Fournisseurs',
      subtitle: 'Gérez votre carnet de contacts : clients, fournisseurs et leurs coordonnées',
      icon: <UsersIcon color={colors.primary[600]} size={28} />,
      borderColor: colors.primary[600],
      onPress: () => onNavigate('CustomersList'),
      hasVoiceAI: true,
      hasForm: true,
    },
    {
      id: 'products',
      title: 'Produits & Prix',
      subtitle: 'Configurez vos produits, tarifs par défaut et taux de TVA pour vos factures',
      icon: <SproutIcon color={colors.semantic.warning} size={28} />,
      borderColor: colors.semantic.warning,
      onPress: () => onNavigate('ProductsList'),
      hasVoiceAI: false,
      hasForm: true,
    },
    {
      id: 'sellerInfo',
      title: 'Vos informations',
      subtitle: 'Vos informations légales affichées sur les factures (SIRET, adresse, etc.)',
      icon: <UserIcon color={colors.gray[600]} size={28} />,
      borderColor: colors.gray[500],
      onPress: () => onNavigate('SellerInfoSettings'),
      hasVoiceAI: false,
      hasForm: true,
    },
  ];

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* ── Aperçu des données ── */}
          <View style={styles.dataOverviewSection}>
            <View style={styles.dataOverviewHeader}>
              <DocumentTextIcon color={colors.primary[600]} size={24} />
              <Text variant="h3" style={styles.dataOverviewTitle}>
                Aperçu de vos données
              </Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.invoices}</Text>
                <Text style={styles.statLabel}>Factures</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.customers}</Text>
                <Text style={styles.statLabel}>Contacts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.products}</Text>
                <Text style={styles.statLabel}>Produits</Text>
              </View>
            </View>
          </View>

          {/* ── Option cards ── */}
          <View style={styles.optionsContainer}>
            {settingsOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, { borderLeftColor: option.borderColor }]}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.optionHeader}>
                  <View style={styles.optionIcon}>
                    {option.icon}
                  </View>

                  <View style={styles.optionContent}>
                    <Text variant="h4" style={styles.optionTitle}>
                      {option.title}
                    </Text>
                    <Text variant="caption" style={styles.optionSubtitle}>
                      {option.subtitle}
                    </Text>
                  </View>

                  <UserIcon color={colors.gray[400]} size={20} />
                </View>

                {/* Method badges */}
                <View style={styles.methodsRow}>
                  {option.hasForm && (
                    <View style={styles.methodBadge}>
                      <ClipboardDocumentListIcon color={colors.primary[600]} size={16} />
                      <Text style={styles.methodBadgeText}>Formulaire guidé</Text>
                    </View>
                  )}
                  {option.hasVoiceAI && (
                    <View style={styles.methodBadge}>
                      <MicrophoneIcon color={colors.semantic.success} size={16} />
                      <Text style={styles.methodBadgeText}>IA vocale</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Section Comment ça marche ── */}
          <View style={styles.howItWorksSection}>
            <View style={styles.howItWorksHeader}>
              <QuestionMarkCircleIcon color={colors.semantic.warning} size={24} />
              <Text variant="h3" style={styles.howItWorksTitle}>
                Comment ça marche ?
              </Text>
            </View>

            <View style={styles.methodsContainer}>
              <View style={styles.methodCard}>
                <ClipboardDocumentListIcon color={colors.primary[600]} size={20} />
                <Text variant="body" style={styles.methodTitle}>Formulaire guidé</Text>
                <Text variant="caption" style={styles.methodCardSubtitle}>
                  Créez vos factures étape par étape avec un formulaire intuitif
                </Text>
              </View>

              <View style={styles.methodCard}>
                <MicrophoneIcon color={colors.semantic.success} size={20} />
                <Text variant="body" style={styles.methodTitle}>IA vocale</Text>
                <Text variant="caption" style={styles.methodCardSubtitle}>
                  Dites à Thomas "Fais une facture pour..." et il s'occupe du reste
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },

  // ── Data overview ──
  dataOverviewSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dataOverviewTitle: {
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...textStyles.statNumber,
    color: colors.primary[600],
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // ── Option cards ──
  optionsContainer: {
    gap: spacing.md,
  },
  optionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
    fontSize: 18,
    fontWeight: '600',
  },
  optionSubtitle: {
    color: colors.text.secondary,
    lineHeight: 18,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 16,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  methodBadgeText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },

  // ── How it works ──
  howItWorksSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  howItWorksTitle: {
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  methodsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  methodCard: {
    flex: 1,
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  methodTitle: {
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  methodCardSubtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
