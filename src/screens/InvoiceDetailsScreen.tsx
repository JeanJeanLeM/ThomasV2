import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { Text, Button } from '../design-system/components';
import { useFarm } from '../contexts/FarmContext';
import { InvoiceService } from '../services/InvoiceService';
import { CustomerService } from '../services/CustomerService';
import { SupplierService } from '../services/SupplierService';
import type { Invoice, InvoiceLine, Customer, Supplier, InvoiceDocumentType } from '../types';
import type { ScreenName } from '../contexts/NavigationContext';

interface InvoiceDetailsScreenProps {
  navigation: { goBack: () => void };
  invoiceId: string;
  onNavigate: (screen: ScreenName, params?: Record<string, unknown>) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<InvoiceDocumentType, string> = {
  invoice: 'Facture',
  delivery_note: 'Bon de livraison',
  invoice_with_delivery: 'Facture valant BL',
};

const STATUS_CONFIG = {
  paid:      { label: 'Payé',      bg: colors.primary[100],   text: colors.primary[700] },
  sent:      { label: 'À régler',  bg: colors.warning[100],   text: colors.warning[700] },
  draft:     { label: 'Brouillon', bg: colors.gray[200],      text: colors.gray[600]    },
  cancelled: { label: 'Annulé',    bg: colors.error[100],     text: colors.error[700]   },
} as const;

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function InvoiceDetailsScreen({ navigation, invoiceId, onNavigate }: InvoiceDetailsScreenProps) {
  const { activeFarm } = useFarm();
  const insets = useSafeAreaInsets();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [counterparty, setCounterparty] = useState<Customer | Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!invoiceId || !activeFarm?.farm_id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { invoice: inv, lines: ls } = await InvoiceService.getInvoiceById(invoiceId);
        setInvoice(inv ?? null);
        setLines(ls ?? []);
        if (inv?.customer_id) {
          setCounterparty(await CustomerService.getCustomerById(inv.customer_id));
        } else if (inv?.supplier_id) {
          setCounterparty(await SupplierService.getSupplierById(inv.supplier_id));
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
    setActionLoading(true);
    const ok = await InvoiceService.updateInvoiceStatus(invoice.id, 'paid');
    if (ok) setInvoice((prev) => (prev ? { ...prev, status: 'paid' } : null));
    setActionLoading(false);
  };

  const handleMarkUnpaid = async () => {
    if (!invoice) return;
    setActionLoading(true);
    const ok = await InvoiceService.updateInvoiceStatus(invoice.id, 'sent');
    if (ok) setInvoice((prev) => (prev ? { ...prev, status: 'sent' } : null));
    setActionLoading(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Annuler la facture',
      `Voulez-vous vraiment annuler ${invoice?.invoice_number} ? Cette action est irréversible.`,
      [
        { text: 'Retour', style: 'cancel' },
        {
          text: 'Annuler la facture',
          style: 'destructive',
          onPress: async () => {
            if (!invoice) return;
            setActionLoading(true);
            await InvoiceService.deleteInvoice(invoice.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  // ── Chargement ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Facture introuvable.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Données dérivées ───────────────────────────────────────────────────────

  const isOutgoing = invoice.direction === 'outgoing';
  const status = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.draft;
  const docLabel = DOC_TYPE_LABELS[invoice.document_type] ?? 'Document';
  const totalHt = invoice.total_ht ?? 0;
  const totalVat = invoice.total_vat ?? 0;
  const totalTtc = invoice.total_ttc ?? 0;

  // Hauteur de la barre sticky : boutons + padding bottom safe area
  const STICKY_HEIGHT = (invoice.status === 'cancelled' ? 0 : (invoice.status === 'sent' ? 3 : 2)) * 52 + spacing.lg * 2 + insets.bottom;

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
    <ScrollView contentContainerStyle={[styles.screenContent, { paddingBottom: STICKY_HEIGHT }]} showsVerticalScrollIndicator={false}>

      {/* ── En-tête ── */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            <Text style={styles.docTypeLabel}>{docLabel}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.directionRow}>
          <View style={[styles.directionBadge, { backgroundColor: isOutgoing ? colors.primary[50] : '#dbeafe' }]}>
            <Text style={[styles.directionText, { color: isOutgoing ? colors.primary[700] : colors.secondary.blue }]}>
              {isOutgoing ? '↑ Vente' : '↓ Achat'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Tiers (client / fournisseur) ── */}
      <View style={styles.card}>
        <Text style={styles.cardSection}>{isOutgoing ? 'Client' : 'Fournisseur'}</Text>
        {counterparty ? (
          <>
            <Text style={styles.counterpartyName}>{counterparty.company_name}</Text>
            {(counterparty as Customer).contact_name && (
              <Text style={styles.counterpartyDetail}>{(counterparty as Customer).contact_name}</Text>
            )}
            {counterparty.email && <Text style={styles.counterpartyDetail}>{counterparty.email}</Text>}
            {counterparty.phone && <Text style={styles.counterpartyDetail}>{counterparty.phone}</Text>}
            {counterparty.siret && (
              <Text style={styles.counterpartyDetail}>SIRET : {counterparty.siret}</Text>
            )}
          </>
        ) : (
          <Text style={styles.emptyText}>Non renseigné</Text>
        )}
      </View>

      {/* ── Dates ── */}
      <View style={styles.card}>
        <Text style={styles.cardSection}>Dates</Text>
        <InfoRow label="Date de facture" value={invoice.invoice_date} />
        <InfoRow label="Date de livraison" value={invoice.delivery_date} />
        <InfoRow label="Lieu de livraison" value={invoice.delivery_location} />
        <InfoRow label="Échéance paiement" value={invoice.payment_due_date} />
        {!invoice.delivery_date && !invoice.payment_due_date && !invoice.delivery_location && (
          <Text style={styles.emptyText}>Aucune date complémentaire</Text>
        )}
      </View>

      {/* ── Lignes produits ── */}
      <View style={styles.card}>
        <Text style={styles.cardSection}>Lignes ({lines.length})</Text>
        {lines.length === 0 ? (
          <Text style={styles.emptyText}>Aucune ligne</Text>
        ) : (
          lines.map((line, idx) => (
            <View key={line.id} style={[styles.lineItem, idx < lines.length - 1 && styles.lineItemBorder]}>
              <View style={styles.lineTop}>
                <Text style={styles.lineName} numberOfLines={2}>{line.product_name}</Text>
                <Text style={styles.lineTtc}>{(line.total_ttc ?? 0).toFixed(2)} € TTC</Text>
              </View>
              <Text style={styles.lineDetail}>
                {line.quantity} {line.unit}  ×  {(line.unit_price_ht ?? 0).toFixed(2)} € HT
                {line.vat_rate ? `  ·  TVA ${line.vat_rate} %` : ''}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* ── Totaux ── */}
      <View style={styles.card}>
        <Text style={styles.cardSection}>Montants</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total HT</Text>
          <Text style={styles.totalValue}>{totalHt.toFixed(2)} €</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total TVA</Text>
          <Text style={styles.totalValue}>{totalVat.toFixed(2)} €</Text>
        </View>
        <View style={[styles.totalRow, styles.totalTtcRow]}>
          <Text style={styles.totalTtcLabel}>Total TTC</Text>
          <Text style={styles.totalTtcValue}>{totalTtc.toFixed(2)} €</Text>
        </View>
      </View>

      {/* ── Notes ── */}
      {!!invoice.notes && (
        <View style={styles.card}>
          <Text style={styles.cardSection}>Notes</Text>
          <Text style={styles.notesText}>{invoice.notes}</Text>
        </View>
      )}

    </ScrollView>

    {/* ── Barre d'actions sticky ── */}
    <View style={[styles.stickyBar, { paddingBottom: insets.bottom + spacing.md }]}>

      {invoice.status === 'cancelled' ? (
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledNote}>Cette facture a été annulée.</Text>
        </View>
      ) : (
        <>
          <Button
            title="Modifier"
            variant="outline"
            onPress={() => onNavigate('InvoiceCreate', { invoiceId: invoice.id })}
            disabled={actionLoading}
            style={styles.stickyBtnOutline}
          />

          {invoice.status === 'sent' && (
            <Button
              title={actionLoading ? 'Mise à jour…' : 'Marquer payé'}
              variant="primary"
              onPress={handleMarkPaid}
              disabled={actionLoading}
              style={styles.stickyBtnPrimary}
            />
          )}

          {invoice.status === 'paid' && (
            <Button
              title={actionLoading ? 'Mise à jour…' : '↩ Non payé'}
              variant="outline"
              onPress={handleMarkUnpaid}
              disabled={actionLoading}
              style={styles.stickyBtnPrimary}
            />
          )}

          <Button
            title="Annuler"
            variant="danger"
            onPress={handleDelete}
            disabled={actionLoading}
            style={styles.stickyBtnDanger}
          />
        </>
      )}
    </View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  screenContent: { padding: spacing.lg, gap: spacing.md },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingText: { marginTop: spacing.md, color: colors.text.secondary },
  notFoundText: { fontSize: 16, color: colors.text.secondary, marginBottom: spacing.md },
  backLink: { paddingVertical: spacing.sm },
  backLinkText: { color: colors.primary[600], fontWeight: '600' },

  // Card
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    ...CARD_SHADOW,
  },
  cardSection: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary[600],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  invoiceNumber: { fontSize: 22, fontWeight: '800', color: colors.text.primary },
  docTypeLabel: { fontSize: 14, color: colors.text.secondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 20, marginLeft: spacing.sm },
  statusText: { fontSize: 13, fontWeight: '700' },
  directionRow: { flexDirection: 'row' },
  directionBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 12 },
  directionText: { fontSize: 13, fontWeight: '600' },

  // Counterparty
  counterpartyName: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.xs },
  counterpartyDetail: { fontSize: 14, color: colors.text.secondary, marginTop: 2 },

  // Info rows (dates)
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  infoLabel: { fontSize: 14, color: colors.text.secondary, flex: 1 },
  infoValue: { fontSize: 14, fontWeight: '500', color: colors.text.primary, textAlign: 'right' },

  emptyText: { fontSize: 14, color: colors.text.tertiary, fontStyle: 'italic' },

  // Lines
  lineItem: { paddingVertical: spacing.md },
  lineItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  lineTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  lineName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text.primary, marginRight: spacing.sm },
  lineTtc: { fontSize: 15, fontWeight: '700', color: colors.primary[600] },
  lineDetail: { fontSize: 13, color: colors.text.secondary },

  // Totals
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  totalLabel: { fontSize: 14, color: colors.text.secondary },
  totalValue: { fontSize: 14, color: colors.text.primary, fontWeight: '500' },
  totalTtcRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  totalTtcLabel: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  totalTtcValue: { fontSize: 18, fontWeight: '800', color: colors.primary[600] },

  // Notes
  notesText: { fontSize: 14, color: colors.text.primary, lineHeight: 22 },

  // ── Sticky action bar ──
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
  },
  stickyBtnOutline: { flex: 1 },
  stickyBtnPrimary: { flex: 2 },
  stickyBtnDanger: { flex: 1 },

  paidIcon: { fontSize: 16, color: colors.primary[600] },
  paidText: { fontSize: 14, fontWeight: '700', color: colors.primary[700] },

  cancelledBanner: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelledNote: { fontSize: 14, color: colors.error[600], fontStyle: 'italic' },
});
