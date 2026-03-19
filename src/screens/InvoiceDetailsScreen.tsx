import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { Text, Button } from '../design-system/components';
import { useFarm } from '../contexts/FarmContext';
import { InvoiceService } from '../services/InvoiceService';
import { CustomerService } from '../services/CustomerService';
import { SupplierService } from '../services/SupplierService';
import type { Invoice, InvoiceLine, Customer, Supplier } from '../types';
import type { ScreenName } from '../contexts/NavigationContext';

interface InvoiceDetailsScreenProps {
  navigation: { goBack: () => void };
  invoiceId: string;
  onNavigate: (screen: ScreenName, params?: Record<string, unknown>) => void;
}

export default function InvoiceDetailsScreen({ navigation, invoiceId, onNavigate }: InvoiceDetailsScreenProps) {
  const { activeFarm } = useFarm();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [counterparty, setCounterparty] = useState<Customer | Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId || !activeFarm?.farm_id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { invoice: inv, lines: ls } = await InvoiceService.getInvoiceById(invoiceId);
        setInvoice(inv ?? null);
        setLines(ls ?? []);
        if (inv?.customer_id) {
          const c = await CustomerService.getCustomerById(inv.customer_id);
          setCounterparty(c);
        } else if (inv?.supplier_id) {
          const s = await SupplierService.getSupplierById(inv.supplier_id);
          setCounterparty(s);
        } else {
          setCounterparty(null);
        }
      } catch (e) {
        console.error('[InvoiceDetails] load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [invoiceId, activeFarm?.farm_id]);

  const handleMarkPaid = async () => {
    if (!invoice) return;
    const ok = await InvoiceService.updateInvoiceStatus(invoice.id, 'paid');
    if (ok) {
      setInvoice((prev) => (prev ? { ...prev, status: 'paid' } : null));
    }
  };

  const handleDelete = () => {
    Alert.alert('Annuler la facture', 'Êtes-vous sûr ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: async () => {
          if (!invoice) return;
          await InvoiceService.deleteInvoice(invoice.id);
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading || !invoice) {
    return (
      <View style={styles.center}>
        {loading ? <ActivityIndicator size="large" color={colors.primary[600]} /> : <Text>Facture introuvable.</Text>}
      </View>
    );
  }

  const isOutgoing = invoice.direction === 'outgoing';
  const statusLabel =
    invoice.status === 'paid' ? 'Payé' : invoice.status === 'sent' ? 'À régler' : invoice.status === 'draft' ? 'Brouillon' : 'Annulé';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.number}>{invoice.invoice_number}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                invoice.status === 'paid'
                  ? colors.semantic.success + '20'
                  : invoice.status === 'sent'
                  ? colors.semantic.warning + '20'
                  : colors.gray[200],
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  invoice.status === 'paid'
                    ? colors.semantic.success
                    : invoice.status === 'sent'
                    ? colors.semantic.warning
                    : colors.gray[600],
              },
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{isOutgoing ? 'Client' : 'Fournisseur'}</Text>
        <Text style={styles.counterpartyName}>{counterparty?.company_name ?? '—'}</Text>
        {(counterparty as Customer)?.contact_name && (
          <Text style={styles.secondary}>{(counterparty as Customer).contact_name}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lignes</Text>
        {lines.map((line) => (
          <View key={line.id} style={styles.line}>
            <Text style={styles.lineName}>{line.product_name}</Text>
            <Text style={styles.lineQty}>
              {line.quantity} {line.unit} × {line.unit_price_ht?.toFixed(2)} € HT
            </Text>
            <Text style={styles.lineTotal}>{line.total_ttc?.toFixed(2) ?? '0.00'} € TTC</Text>
          </View>
        ))}
      </View>

      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total HT</Text>
          <Text style={styles.totalValue}>{invoice.total_ht?.toFixed(2) ?? '0.00'} €</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total TTC</Text>
          <Text style={[styles.totalValue, styles.totalTtc]}>{invoice.total_ttc?.toFixed(2) ?? '0.00'} €</Text>
        </View>
      </View>

      {invoice.status === 'sent' && (
        <Button variant="primary" onPress={handleMarkPaid} style={styles.btn}>
          Marquer comme payé
        </Button>
      )}

      {invoice.status !== 'cancelled' && (
        <Button variant="outline" onPress={handleDelete} style={[styles.btn, { borderColor: colors.semantic.error }]}>
          <Text style={{ color: colors.semantic.error }}>Annuler la facture</Text>
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  number: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    color: colors.gray[500],
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  counterpartyName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
  },
  secondary: {
    fontSize: 14,
    color: colors.gray[600],
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border?.primary ?? colors.gray[200],
  },
  lineName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[800],
    flex: 1,
  },
  lineQty: {
    fontSize: 12,
    color: colors.gray[500],
    width: '100%',
    marginTop: 2,
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[600],
  },
  totals: {
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.gray[600],
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[800],
  },
  totalTtc: {
    fontSize: 18,
    color: colors.primary[600],
  },
  btn: {
    marginBottom: spacing.sm,
  },
});
