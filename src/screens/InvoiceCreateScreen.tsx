import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { Text, Button, Input } from '../design-system/components';
import { useFarm } from '../contexts/FarmContext';
import { useAuth } from '../contexts/AuthContext';
import { InvoiceService, type CreateInvoiceInput, type InvoiceLineInput } from '../services/InvoiceService';
import type { Invoice } from '../types';
import { InvoiceAnalysisService } from '../services/InvoiceAnalysisService';
import { InvoiceIngestionService } from '../services/InvoiceIngestionService';
import { CustomerService } from '../services/CustomerService';
import { SupplierService } from '../services/SupplierService';
import { ProductService } from '../services/ProductService';
import type { Customer, Supplier, Product, InvoiceDocumentType, InvoiceAIOutput, InvoiceLine } from '../types';
import type { ScreenName } from '../contexts/NavigationContext';

interface InvoiceCreateScreenProps {
  navigation: { goBack: () => void };
  onNavigate: (screen: ScreenName, params?: Record<string, unknown>) => void;
  /** Si fourni → mode édition : pré-remplissage + appel updateInvoice */
  invoiceId?: string;
}

type CreationMode = 'manual' | 'ai';
type Step = 1 | 2 | 3 | 4;

const DOCUMENT_TYPE_LABELS: Record<InvoiceDocumentType, string> = {
  invoice: 'Facture',
  delivery_note: 'Bon de livraison',
  invoice_with_delivery: 'Facture valant BL',
};

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function InvoiceCreateScreen({ navigation, onNavigate, invoiceId }: InvoiceCreateScreenProps) {
  const { activeFarm } = useFarm();
  const { user } = useAuth();

  const isEditMode = !!invoiceId;

  const [creationMode, setCreationMode] = useState<CreationMode>('manual');
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(isEditMode);

  const [direction, setDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [documentType, setDocumentType] = useState<InvoiceDocumentType>('invoice');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InvoiceLineInput[]>([
    { product_name: '', quantity: 1, unit: 'unité', unit_price_ht: 0, vat_rate: 5.5 },
  ]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [aiText, setAiText] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiPreview, setAiPreview] = useState<InvoiceAIOutput | null>(null);
  const [aiIngesting, setAiIngesting] = useState(false);

  // Vrai si l'API web est configurée (sinon photo/galerie désactivées)
  const apiAvailable = useMemo(() => !!process.env['EXPO_PUBLIC_API_BASE_URL'], []);

  // Feedback inline (évite les alertes silencieuses)
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  useEffect(() => {
    if (!activeFarm?.farm_id) return;
    (async () => {
      const [cust, supp, prod] = await Promise.all([
        CustomerService.getCustomers(activeFarm.farm_id),
        SupplierService.getSuppliers(activeFarm.farm_id),
        ProductService.getProducts(activeFarm.farm_id),
      ]);
      setCustomers(cust);
      setSuppliers(supp);
      setProducts(prod);

      // Mode édition : charger la facture existante
      if (invoiceId) {
        const { invoice, lines: existingLines } = await InvoiceService.getInvoiceById(invoiceId);
        if (invoice) {
          setDirection(invoice.direction);
          setDocumentType((invoice.document_type as InvoiceDocumentType) ?? 'invoice');
          setCustomerId(invoice.customer_id ?? null);
          setSupplierId(invoice.supplier_id ?? null);
          setInvoiceDate(invoice.invoice_date ?? new Date().toISOString().slice(0, 10));
          setDeliveryDate(invoice.delivery_date ?? '');
          setDeliveryLocation(invoice.delivery_location ?? '');
          setPaymentDueDate(invoice.payment_due_date ?? '');
          setNotes(invoice.notes ?? '');
          if (existingLines.length > 0) {
            setLines(existingLines.map((l: InvoiceLine) => ({
              product_id: l.product_id ?? undefined,
              product_name: l.product_name,
              quantity: l.quantity,
              unit: l.unit,
              unit_price_ht: l.unit_price_ht,
              vat_rate: l.vat_rate,
              line_order: l.line_order,
              notes: l.notes ?? undefined,
            })));
          }
        }
        setLoadingInitial(false);
      }
    })();
  }, [activeFarm?.farm_id, invoiceId]);

  // ─── Calculs ───────────────────────────────────────────────────────────────

  const totalHt = lines.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0);
  const totalVat = lines.reduce((s, l) => s + l.quantity * l.unit_price_ht * (l.vat_rate / 100), 0);
  const totalTtc = totalHt + totalVat;

  // ─── Lignes ────────────────────────────────────────────────────────────────

  const addLine = () =>
    setLines((prev) => [...prev, { product_name: '', quantity: 1, unit: 'unité', unit_price_ht: 0, vat_rate: 5.5 }]);

  const updateLine = (idx: number, upd: Partial<InvoiceLineInput>) =>
    setLines((prev) => { const n = [...prev]; n[idx] = { ...n[idx], ...upd }; return n; });

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Validation par étape ─────────────────────────────────────────────────

  const counterpartyOk = (direction === 'outgoing' && !!customerId) || (direction === 'incoming' && !!supplierId);
  const requiresDelivery = documentType === 'invoice_with_delivery' || documentType === 'delivery_note';
  const datesOk = !requiresDelivery || !!deliveryDate;
  const validLines = lines.filter((l) => l.product_name.trim() && l.quantity > 0 && l.unit_price_ht >= 0);
  const linesOk = validLines.length > 0;

  const stepIsValid = (s: Step): boolean => {
    if (s === 1) return counterpartyOk;
    if (s === 2) return datesOk;
    if (s === 3) return linesOk;
    return true;
  };

  // ─── Sauvegarde manuelle ───────────────────────────────────────────────────

  const handleSave = async (status: 'draft' | 'sent') => {
    setSaveError(null);

    if (!activeFarm?.farm_id || !user?.id) {
      setSaveError('Session expirée. Veuillez rafraîchir l\'application.');
      return;
    }
    if (!counterpartyOk) {
      setSaveError(`Retournez à l'étape 1 et sélectionnez un ${direction === 'outgoing' ? 'client' : 'fournisseur'}.`);
      return;
    }
    if (!datesOk) {
      setSaveError('Retournez à l\'étape 2 et renseignez la date de livraison.');
      return;
    }
    if (!linesOk) {
      setSaveError('Retournez à l\'étape 3 et ajoutez au moins une ligne valide.');
      return;
    }

    setSaving(true);
    setSaveStatus('saving');
    try {
      const inputBase = {
        direction,
        document_type: documentType,
        customer_id: direction === 'outgoing' ? customerId ?? undefined : undefined,
        supplier_id: direction === 'incoming' ? supplierId ?? undefined : undefined,
        invoice_date: invoiceDate,
        delivery_date: deliveryDate || null,
        delivery_location: deliveryLocation || null,
        payment_due_date: paymentDueDate || null,
        notes: notes || null,
        status,
        lines: validLines.map((l, i) => ({ ...l, line_order: i })),
      };

      let resultInvoice: Invoice | null = null;

      if (isEditMode && invoiceId) {
        resultInvoice = await InvoiceService.updateInvoice(invoiceId, inputBase);
      } else {
        const input: CreateInvoiceInput = {
          ...inputBase,
          farm_id: activeFarm.farm_id,
          user_id: user.id,
        };
        resultInvoice = await InvoiceService.createInvoice(input);
      }

      if (resultInvoice) {
        setSaveStatus('success');
        setTimeout(() => {
          onNavigate('InvoiceDetails', { invoiceId: resultInvoice!.id });
        }, 1200);
      } else {
        setSaveError(`Le serveur n'a pas pu ${isEditMode ? 'modifier' : 'créer'} le document. Vérifiez votre connexion et réessayez.`);
        setSaveStatus('idle');
      }
    } catch (e) {
      console.error('[InvoiceCreate] handleSave error:', e);
      setSaveError('Une erreur inattendue est survenue. Réessayez dans quelques instants.');
      setSaveStatus('idle');
    } finally {
      setSaving(false);
    }
  };

  // ─── Mode IA ───────────────────────────────────────────────────────────────

  const runAnalysis = async (params: Parameters<typeof InvoiceAnalysisService.analyze>[0]) => {
    setAiAnalyzing(true);
    setAiPreview(null);
    const result = await InvoiceAnalysisService.analyze(params);
    setAiAnalyzing(false);
    if (!result.success) { Alert.alert('Erreur analyse', result.error); return; }
    setAiPreview(result.data);
  };

  const handleAnalyzeText = () => {
    if (!aiText.trim()) { Alert.alert('Erreur', 'Saisissez un texte à analyser.'); return; }
    runAnalysis({ mode: 'text', textContent: aiText, direction, currentDateIso: new Date().toISOString().slice(0, 10) });
  };

  const handleAnalyzeImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.8 });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    runAnalysis({ mode: 'base64', imageBase64: res.assets[0].base64!, mimeType: res.assets[0].mimeType ?? 'image/jpeg', direction });
  };

  const handleAnalyzeCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission requise', 'Autorisez l\'accès à la caméra.'); return; }
    const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    runAnalysis({ mode: 'base64', imageBase64: res.assets[0].base64!, mimeType: res.assets[0].mimeType ?? 'image/jpeg', direction });
  };

  const handleConfirmIngestion = async () => {
    if (!aiPreview || !activeFarm?.farm_id || !user?.id) return;
    setAiIngesting(true);
    const result = await InvoiceIngestionService.ingestInvoice({
      farmId: activeFarm.farm_id, userId: user.id, aiOutput: aiPreview, source: 'invoice_scan',
    });
    setAiIngesting(false);
    if (!result.success) { Alert.alert('Erreur', result.error ?? 'Enregistrement impossible.'); return; }
    const extras: string[] = [];
    if (result.chargesCreated) extras.push(`${result.chargesCreated} consommable${result.chargesCreated > 1 ? 's' : ''}`);
    if (result.semencesCreated) extras.push(`${result.semencesCreated} semence${result.semencesCreated > 1 ? 's' : ''}`);
    Alert.alert('Enregistrée', `Facture ${result.invoiceNumber} créée — ${result.linesCreated} ligne${result.linesCreated > 1 ? 's' : ''}${extras.length ? ', ' + extras.join(', ') : ''}.`, [
      { text: 'Voir', onPress: () => result.invoiceId && onNavigate('InvoiceDetails', { invoiceId: result.invoiceId }) },
    ]);
  };

  const handleFillFormFromAI = () => {
    if (!aiPreview) return;
    const ai = aiPreview.invoice;
    setDirection(ai.direction);
    if (ai.invoice_date) setInvoiceDate(ai.invoice_date);
    if (ai.delivery_date) setDeliveryDate(ai.delivery_date);
    if (ai.payment_due_date) setPaymentDueDate(ai.payment_due_date);
    if (ai.notes) setNotes(ai.notes);
    setLines(aiPreview.lines.map((l) => ({
      product_name: l.product_name, quantity: l.quantity, unit: l.unit,
      unit_price_ht: l.unit_price_ht, vat_rate: l.vat_rate, notes: l.notes ?? undefined,
    })));
    setCreationMode('manual');
    setAiPreview(null);
  };

  const list = direction === 'outgoing' ? customers : suppliers;

  // ── Chargement initial (mode édition) ──────────────────────────────────────
  if (loadingInitial) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary }}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={{ marginTop: spacing.md, color: colors.text.secondary }}>Chargement de la facture…</Text>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODE IA
  // ══════════════════════════════════════════════════════════════════════════

  if (creationMode === 'ai') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>

        {/* Direction */}
        <SectionCard>
          <SectionTitle>Type d'opération</SectionTitle>
          <View style={styles.chipRow}>
            {(['outgoing', 'incoming'] as const).map((d) => (
              <TouchableOpacity key={d} style={[styles.chip, direction === d && styles.chipActive]} onPress={() => setDirection(d)}>
                <Text style={[styles.chipText, direction === d && styles.chipTextActive]}>
                  {d === 'outgoing' ? 'Vente' : 'Achat'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>

        {/* Zone analyse par texte */}
        <SectionCard>
          <SectionTitle>Analyser par message</SectionTitle>
          <Text style={styles.helpText}>
            Collez le texte d'un email ou message d'achat (ex. "J'ai acheté 4 kg d'ail à 2,50 €…").
          </Text>

          <TextInput
            style={styles.textArea}
            placeholder="Collez le texte de votre facture ou message ici…"
            placeholderTextColor={colors.gray[400]}
            multiline
            numberOfLines={6}
            value={aiText}
            onChangeText={setAiText}
          />

          <Button
            title="Analyser ce texte"
            variant="primary"
            onPress={handleAnalyzeText}
            disabled={aiAnalyzing || !aiText.trim()}
            style={styles.fullBtn}
          />

          {aiAnalyzing && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary[600]} />
              <Text style={styles.loadingText}>Analyse en cours…</Text>
            </View>
          )}
        </SectionCard>

        {/* Photo / Galerie — disponible seulement si API configurée */}
        {apiAvailable ? (
          <SectionCard>
            <SectionTitle>Analyser une photo ou un PDF</SectionTitle>
            <Text style={styles.helpText}>Photographiez ou importez une facture pour l'analyser automatiquement.</Text>
            <View style={styles.twoColRow}>
              <Button title="Photo" variant="outline" onPress={handleAnalyzeCamera} disabled={aiAnalyzing} style={styles.halfBtn} />
              <Button title="Galerie" variant="outline" onPress={handleAnalyzeImage} disabled={aiAnalyzing} style={styles.halfBtn} />
            </View>
          </SectionCard>
        ) : (
          <View style={styles.devBanner}>
            <Text style={styles.devBannerTitle}>📷  Analyse photo / PDF</Text>
            <Text style={styles.devBannerBody}>
              Fonctionnalité en cours de développement.{'\n'}
              En attendant, ajoutez vos factures via le chat Thomas ou en saisie manuelle ci-dessous.
            </Text>
          </View>
        )}

        {/* Aperçu IA */}
        {aiPreview && (
          <SectionCard style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Résultat détecté</Text>
              <View style={[styles.confidenceBadge, { backgroundColor: aiPreview.confidence >= 0.7 ? colors.primary[100] : colors.warning[100] }]}>
                <Text style={[styles.confidenceText, { color: aiPreview.confidence >= 0.7 ? colors.primary[700] : colors.warning[700] }]}>
                  {Math.round(aiPreview.confidence * 100)} %
                </Text>
              </View>
            </View>

            {(aiPreview.invoice.supplier_name || aiPreview.invoice.customer_name) && (
              <Text style={styles.previewMeta}>
                {aiPreview.invoice.direction === 'incoming' ? 'Fournisseur' : 'Client'} :{' '}
                <Text style={styles.previewMetaBold}>
                  {aiPreview.invoice.supplier_name ?? aiPreview.invoice.customer_name}
                </Text>
              </Text>
            )}
            {aiPreview.invoice.invoice_date && (
              <Text style={styles.previewMeta}>Date : <Text style={styles.previewMetaBold}>{aiPreview.invoice.invoice_date}</Text></Text>
            )}
            {aiPreview.invoice.invoice_number && (
              <Text style={styles.previewMeta}>N° : <Text style={styles.previewMetaBold}>{aiPreview.invoice.invoice_number}</Text></Text>
            )}

            <View style={styles.divider} />
            <Text style={styles.linesTitle}>{aiPreview.lines.length} ligne{aiPreview.lines.length > 1 ? 's' : ''} détectée{aiPreview.lines.length > 1 ? 's' : ''}</Text>

            {aiPreview.lines.map((l, i) => (
              <View key={i} style={styles.previewLine}>
                <View style={styles.previewLineDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewLineName}>{l.product_name}</Text>
                  <Text style={styles.previewLineSub}>
                    {l.quantity} {l.unit} × {l.unit_price_ht.toFixed(2)} €
                    {l.is_charge ? '  •  consommable' : ''}
                    {l.is_semence ? '  •  semence' : ''}
                  </Text>
                </View>
              </View>
            ))}

            <Button
              title={aiIngesting ? 'Enregistrement…' : 'Confirmer et enregistrer'}
              variant="primary"
              onPress={handleConfirmIngestion}
              disabled={aiIngesting}
              style={styles.fullBtn}
            />
            <Button
              title="Modifier manuellement"
              variant="outline"
              onPress={handleFillFormFromAI}
              style={[styles.fullBtn, { marginTop: spacing.sm }]}
            />
          </SectionCard>
        )}

        <Button
          title="Retour à la saisie manuelle"
          variant="ghost"
          onPress={() => setCreationMode('manual')}
          style={styles.ghostBtn}
        />
      </ScrollView>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODE MANUEL
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>

      {/* Accès mode IA */}
      <TouchableOpacity style={styles.aiBanner} onPress={() => setCreationMode('ai')} activeOpacity={0.8}>
        <View style={styles.aiBannerDot} />
        <Text style={styles.aiBannerText}>Analyser une facture avec l'IA</Text>
        <Text style={styles.aiBannerArrow}>›</Text>
      </TouchableOpacity>

      {/* Indicateur d'étapes */}
      <View style={styles.stepIndicator}>
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <View key={s} style={[styles.stepDot, step === s && styles.stepDotActive, step > s && styles.stepDotDone]} />
        ))}
      </View>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <>
          <SectionCard>
            <SectionTitle>Type d'opération</SectionTitle>
            <View style={styles.chipRow}>
              {(['outgoing', 'incoming'] as const).map((d) => (
                <TouchableOpacity key={d} style={[styles.chip, direction === d && styles.chipActive]} onPress={() => setDirection(d)}>
                  <Text style={[styles.chipText, direction === d && styles.chipTextActive]}>
                    {d === 'outgoing' ? 'Vente' : 'Achat'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          <SectionCard>
            <SectionTitle>Type de document</SectionTitle>
            <View style={styles.chipRow}>
              {(Object.keys(DOCUMENT_TYPE_LABELS) as InvoiceDocumentType[]).map((dt) => (
                <TouchableOpacity key={dt} style={[styles.chip, documentType === dt && styles.chipActive]} onPress={() => setDocumentType(dt)}>
                  <Text style={[styles.chipText, documentType === dt && styles.chipTextActive]} numberOfLines={2}>
                    {DOCUMENT_TYPE_LABELS[dt]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          <SectionCard>
            <SectionTitle>{direction === 'outgoing' ? 'Client' : 'Fournisseur'}</SectionTitle>
            {list.length === 0 ? (
              <Text style={styles.emptyText}>
                Aucun {direction === 'outgoing' ? 'client' : 'fournisseur'}. Créez-en un dans Clients & Fournisseurs.
              </Text>
            ) : (
              <View style={styles.contactGrid}>
                {list.map((item) => {
                  const selected = (direction === 'outgoing' && item.id === customerId) || (direction === 'incoming' && item.id === supplierId);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.contactChip, selected && styles.contactChipActive]}
                      onPress={() => {
                        if (direction === 'outgoing') { setCustomerId(item.id); setSupplierId(null); }
                        else { setSupplierId(item.id); setCustomerId(null); }
                      }}
                    >
                      <Text style={[styles.contactChipText, selected && styles.contactChipTextActive]} numberOfLines={1}>
                        {item.company_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </SectionCard>
        </>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <SectionCard>
          <SectionTitle>Dates</SectionTitle>
          <Input label="Date facture" value={invoiceDate} onChangeText={setInvoiceDate} placeholder="AAAA-MM-JJ" />
          <Input
            label={documentType === 'invoice_with_delivery' ? 'Date livraison (obligatoire)' : 'Date livraison (optionnel)'}
            value={deliveryDate}
            onChangeText={setDeliveryDate}
            placeholder="AAAA-MM-JJ"
          />
          {(documentType === 'delivery_note' || documentType === 'invoice_with_delivery') && (
            <Input label="Lieu de livraison" value={deliveryLocation} onChangeText={setDeliveryLocation} placeholder="Adresse ou lieu" />
          )}
          <Input label="Échéance paiement (optionnel)" value={paymentDueDate} onChangeText={setPaymentDueDate} placeholder="AAAA-MM-JJ" />
          <Input label="Notes (optionnel)" value={notes} onChangeText={setNotes} placeholder="Notes" multiline />
        </SectionCard>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <SectionCard>
          <SectionTitle>Lignes produits</SectionTitle>

          {products.length > 0 && (
            <>
              <Text style={styles.subLabel}>Produits catalogue</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                {products.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.productTag}
                    onPress={() => {
                      const emptyIdx = lines.findIndex((l) => !l.product_name.trim());
                      const targetIdx = emptyIdx >= 0 ? emptyIdx : lines.length;
                      if (emptyIdx < 0) addLine();
                      setTimeout(() => updateLine(targetIdx, {
                        product_id: p.id, product_name: p.name, unit: p.unit,
                        unit_price_ht: p.default_price_ht ?? 0, vat_rate: p.default_vat_rate ?? 5.5,
                      }), 20);
                    }}
                  >
                    <Text style={styles.productTagText}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {lines.map((line, idx) => (
            <View key={idx} style={styles.lineCard}>
              <View style={styles.lineHeader}>
                <Text style={styles.lineNumber}>Ligne {idx + 1}</Text>
                {lines.length > 1 && (
                  <TouchableOpacity onPress={() => removeLine(idx)}>
                    <Text style={styles.removeText}>Supprimer</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Input label="Produit" value={line.product_name} onChangeText={(t) => updateLine(idx, { product_name: t })} placeholder="Nom du produit" />
              <View style={styles.lineFields}>
                <Input label="Qté" value={String(line.quantity)} onChangeText={(t) => updateLine(idx, { quantity: parseFloat(t) || 0 })} keyboardType="numeric" containerStyle={styles.lineField} />
                <Input label="Unité" value={line.unit} onChangeText={(t) => updateLine(idx, { unit: t })} containerStyle={styles.lineField} />
                <Input label="Prix HT" value={String(line.unit_price_ht)} onChangeText={(t) => updateLine(idx, { unit_price_ht: parseFloat(t) || 0 })} keyboardType="numeric" containerStyle={styles.lineField} />
                <Input label="TVA %" value={String(line.vat_rate)} onChangeText={(t) => updateLine(idx, { vat_rate: parseFloat(t) || 0 })} keyboardType="numeric" containerStyle={styles.lineField} />
              </View>
              <Text style={styles.lineTtc}>
                {(line.quantity * line.unit_price_ht * (1 + line.vat_rate / 100)).toFixed(2)} € TTC
              </Text>
            </View>
          ))}

          <Button title="+ Ajouter une ligne" variant="outline" onPress={addLine} style={styles.fullBtn} />
        </SectionCard>
      )}

      {/* ── Step 4 ── */}
      {step === 4 && (
        <SectionCard>
          <SectionTitle>Récapitulatif</SectionTitle>

          {/* Badges type + direction */}
          <View style={styles.summaryMeta}>
            <Text style={styles.summaryMetaLabel}>{DOCUMENT_TYPE_LABELS[documentType]}</Text>
            <View style={[styles.directionBadge, { backgroundColor: direction === 'outgoing' ? colors.primary[100] : '#dbeafe' }]}>
              <Text style={[styles.directionBadgeText, { color: direction === 'outgoing' ? colors.primary[700] : colors.secondary.blue }]}>
                {direction === 'outgoing' ? 'Vente' : 'Achat'}
              </Text>
            </View>
          </View>

          {/* Récap lignes */}
          {validLines.length > 0 && (
            <View style={styles.recapLines}>
              {validLines.map((l, i) => (
                <View key={i} style={styles.recapLine}>
                  <Text style={styles.recapLineName} numberOfLines={1}>{l.product_name}</Text>
                  <Text style={styles.recapLineAmt}>{(l.quantity * l.unit_price_ht).toFixed(2)} € HT</Text>
                </View>
              ))}
            </View>
          )}

          {/* Totaux */}
          <View style={styles.totalBlock}>
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

          {/* Avertissements de validation */}
          {!counterpartyOk && (
            <View style={styles.warnBanner}>
              <Text style={styles.warnText}>
                ⚠ Aucun {direction === 'outgoing' ? 'client' : 'fournisseur'} sélectionné — retournez à l'étape 1.
              </Text>
            </View>
          )}
          {!datesOk && (
            <View style={styles.warnBanner}>
              <Text style={styles.warnText}>⚠ Date de livraison manquante — retournez à l'étape 2.</Text>
            </View>
          )}
          {!linesOk && (
            <View style={styles.warnBanner}>
              <Text style={styles.warnText}>⚠ Aucune ligne valide — retournez à l'étape 3.</Text>
            </View>
          )}

          {/* Erreur d'enregistrement */}
          {saveError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{saveError}</Text>
            </View>
          )}

          {/* Succès */}
          {saveStatus === 'success' && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>
                ✓ Document {isEditMode ? 'modifié' : 'créé'} avec succès. Redirection en cours…
              </Text>
            </View>
          )}

          {/* Boutons d'action */}
          {saveStatus !== 'success' && (
            <>
              <Button
                title={saveStatus === 'saving' ? 'Enregistrement…' : isEditMode ? 'Enregistrer les modifications' : 'Valider et envoyer'}
                variant="primary"
                onPress={() => handleSave('sent')}
                disabled={saving || !counterpartyOk || !datesOk || !linesOk}
                style={styles.fullBtn}
              />
              {!isEditMode && (
                <Button
                  title={saveStatus === 'saving' ? 'Enregistrement…' : 'Enregistrer en brouillon'}
                  variant="outline"
                  onPress={() => handleSave('draft')}
                  disabled={saving || !counterpartyOk || !datesOk || !linesOk}
                  style={[styles.fullBtn, { marginTop: spacing.sm }]}
                />
              )}
            </>
          )}
        </SectionCard>
      )}

      {/* Navigation */}
      <View style={styles.stepNav}>
        {step > 1 && (
          <Button
            title="← Précédent"
            variant="outline"
            onPress={() => { setSaveError(null); setSaveStatus('idle'); setStep((s) => (s - 1) as Step); }}
            style={styles.navBtn}
          />
        )}
        {step < 4 && (
          <Button
            title={stepIsValid(step) ? 'Suivant →' : step === 1 ? `Choisir un ${direction === 'outgoing' ? 'client' : 'fournisseur'}` : step === 2 ? 'Date de livraison requise' : 'Ajouter une ligne'}
            variant="primary"
            onPress={() => setStep((s) => (s + 1) as Step)}
            disabled={!stepIsValid(step)}
            style={styles.navBtn}
          />
        )}
      </View>
    </ScrollView>
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
  screenContent: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },

  // Cards
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    ...CARD_SHADOW,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.md },
  subLabel: { fontSize: 13, color: colors.text.secondary, marginBottom: spacing.sm },

  // Mode IA banner
  aiBanner: {
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...CARD_SHADOW,
  },
  aiBannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary[200] },
  aiBannerText: { flex: 1, color: '#fff', fontWeight: '600', fontSize: 15 },
  aiBannerArrow: { color: colors.primary[200], fontSize: 22, fontWeight: '300' },

  // Step indicator
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gray[300] },
  stepDotActive: { backgroundColor: colors.primary[600], width: 20 },
  stepDotDone: { backgroundColor: colors.primary[300] },

  // Chips (direction / doc type)
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  chipText: { fontSize: 14, color: colors.text.secondary, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  // Contact grid
  contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  contactChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.border.primary,
    maxWidth: '48%',
  },
  contactChipActive: { backgroundColor: colors.primary[50], borderColor: colors.primary[600] },
  contactChipText: { fontSize: 13, color: colors.text.secondary },
  contactChipTextActive: { color: colors.primary[700], fontWeight: '600' },
  emptyText: { fontSize: 14, color: colors.text.tertiary, fontStyle: 'italic' },

  // Product tags
  productTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.gray[100],
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  productTagText: { fontSize: 12, color: colors.gray[700] },

  // Lines
  lineCard: {
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  lineNumber: { fontSize: 13, fontWeight: '600', color: colors.gray[500] },
  removeText: { fontSize: 13, color: colors.semantic.error },
  lineFields: { flexDirection: 'row', gap: spacing.xs },
  lineField: { flex: 1 },
  lineTtc: { fontSize: 14, fontWeight: '700', color: colors.primary[600], textAlign: 'right', marginTop: spacing.xs },

  // Warning / error / success banners
  warnBanner: {
    backgroundColor: colors.warning[50],
    borderLeftWidth: 3,
    borderLeftColor: colors.warning[500],
    borderRadius: 6,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  warnText: { fontSize: 13, color: colors.warning[700], lineHeight: 18 },
  errorBanner: {
    backgroundColor: colors.error[50],
    borderLeftWidth: 3,
    borderLeftColor: colors.error[500],
    borderRadius: 6,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: { fontSize: 13, color: colors.error[700], lineHeight: 18 },
  successBanner: {
    backgroundColor: colors.primary[50],
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
    borderRadius: 6,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  successText: { fontSize: 14, color: colors.primary[700], fontWeight: '600', lineHeight: 20 },

  // Recap lines
  recapLines: {
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: spacing.xs,
  },
  recapLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recapLineName: { flex: 1, fontSize: 13, color: colors.text.primary },
  recapLineAmt: { fontSize: 13, color: colors.text.secondary, marginLeft: spacing.sm },

  // Summary
  summaryMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  summaryMetaLabel: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  directionBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 12 },
  directionBadgeText: { fontSize: 12, fontWeight: '600' },
  totalBlock: {
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  totalLabel: { color: colors.text.secondary, fontSize: 14 },
  totalValue: { color: colors.text.primary, fontSize: 14 },
  totalTtcRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    marginBottom: 0,
  },
  totalTtcLabel: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
  totalTtcValue: { fontSize: 17, fontWeight: '700', color: colors.primary[600] },

  // Buttons
  fullBtn: { marginTop: spacing.md },
  halfBtn: { flex: 1 },
  twoColRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  ghostBtn: { alignSelf: 'center', marginTop: spacing.sm },
  stepNav: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  navBtn: { flex: 1 },

  // Bannière fonctionnalité en développement
  devBanner: {
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  devBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[600],
  },
  devBannerBody: {
    fontSize: 14,
    color: colors.gray[500],
    lineHeight: 21,
  },

  // Mode IA
  helpText: { fontSize: 14, color: colors.text.secondary, marginBottom: spacing.md, lineHeight: 20 },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.gray[50],
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  loadingText: { color: colors.text.secondary, fontSize: 14 },

  // Aperçu IA
  previewCard: { borderLeftWidth: 3, borderLeftColor: colors.primary[500] },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  previewTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  confidenceBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 12 },
  confidenceText: { fontSize: 12, fontWeight: '700' },
  previewMeta: { fontSize: 14, color: colors.text.secondary, marginBottom: 4 },
  previewMetaBold: { fontWeight: '600', color: colors.text.primary },
  divider: { height: 1, backgroundColor: colors.border.primary, marginVertical: spacing.md },
  linesTitle: { fontSize: 13, fontWeight: '600', color: colors.gray[500], marginBottom: spacing.sm },
  previewLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  previewLineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary[500], marginTop: 5 },
  previewLineName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  previewLineSub: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
});
