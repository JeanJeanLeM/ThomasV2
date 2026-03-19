import React, { useState, useEffect } from 'react';
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
import { InvoiceAnalysisService } from '../services/InvoiceAnalysisService';
import { InvoiceIngestionService } from '../services/InvoiceIngestionService';
import { CustomerService } from '../services/CustomerService';
import { SupplierService } from '../services/SupplierService';
import { ProductService } from '../services/ProductService';
import type { Customer, Supplier, Product, InvoiceDocumentType, InvoiceAIOutput } from '../types';
import type { ScreenName } from '../contexts/NavigationContext';

interface InvoiceCreateScreenProps {
  navigation: { goBack: () => void };
  onNavigate: (screen: ScreenName, params?: Record<string, unknown>) => void;
}

// ─── Types internes ────────────────────────────────────────────────────────

type CreationMode = 'manual' | 'ai';
type Step = 1 | 2 | 3 | 4;

const DOCUMENT_TYPE_LABELS: Record<InvoiceDocumentType, string> = {
  invoice: 'Facture',
  delivery_note: 'Bon de livraison (BL)',
  invoice_with_delivery: 'Facture valant BL',
};

// ─── Composant ────────────────────────────────────────────────────────────

export default function InvoiceCreateScreen({ navigation, onNavigate }: InvoiceCreateScreenProps) {
  const { activeFarm } = useFarm();
  const { user } = useAuth();

  // Mode de création
  const [creationMode, setCreationMode] = useState<CreationMode>('manual');

  // Étapes du formulaire manuel
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  // Champs du formulaire
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

  // Référentiels
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Mode IA
  const [aiText, setAiText] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiPreview, setAiPreview] = useState<InvoiceAIOutput | null>(null);
  const [aiIngesting, setAiIngesting] = useState(false);

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
    })();
  }, [activeFarm?.farm_id]);

  // ─── Totaux ──────────────────────────────────────────────────────────────

  const totalHt = lines.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0);
  const totalVat = lines.reduce((s, l) => s + l.quantity * l.unit_price_ht * (l.vat_rate / 100), 0);
  const totalTtc = totalHt + totalVat;

  // ─── Lignes ──────────────────────────────────────────────────────────────

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { product_name: '', quantity: 1, unit: 'unité', unit_price_ht: 0, vat_rate: 5.5 },
    ]);

  const updateLine = (idx: number, upd: Partial<InvoiceLineInput>) =>
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...upd };
      return next;
    });

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const applyProductToLine = (idx: number, product: Product) => {
    updateLine(idx, {
      product_id: product.id,
      product_name: product.name,
      unit: product.unit,
      unit_price_ht: product.default_price_ht ?? 0,
      vat_rate: product.default_vat_rate ?? 5.5,
    });
  };

  // ─── Sauvegarde manuelle ──────────────────────────────────────────────────

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!activeFarm?.farm_id || !user?.id) return;

    const counterpartyOk =
      (direction === 'outgoing' && customerId) || (direction === 'incoming' && supplierId);
    if (!counterpartyOk) {
      Alert.alert('Erreur', 'Veuillez sélectionner un client ou un fournisseur.');
      return;
    }

    const requiresDelivery = documentType === 'invoice_with_delivery' || documentType === 'delivery_note';
    if (requiresDelivery && !deliveryDate) {
      Alert.alert('Erreur', 'Un bon de livraison nécessite une date de livraison.');
      return;
    }

    const validLines = lines.filter(
      (l) => l.product_name.trim() && l.quantity > 0 && l.unit_price_ht >= 0
    );
    if (validLines.length === 0) {
      Alert.alert('Erreur', 'Ajoutez au moins une ligne valide.');
      return;
    }

    setSaving(true);
    try {
      const input: CreateInvoiceInput = {
        farm_id: activeFarm.farm_id,
        user_id: user.id,
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
      const created = await InvoiceService.createInvoice(input);
      if (created) {
        Alert.alert(
          'Créé',
          `${DOCUMENT_TYPE_LABELS[documentType]} ${created.invoice_number} enregistré(e).`,
          [{ text: 'OK', onPress: () => onNavigate('InvoiceDetails', { invoiceId: created.id }) }]
        );
      } else {
        Alert.alert('Erreur', 'Impossible de créer le document.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Mode IA : analyse texte ──────────────────────────────────────────────

  const handleAnalyzeText = async () => {
    if (!aiText.trim()) {
      Alert.alert('Erreur', 'Saisissez un texte à analyser.');
      return;
    }
    setAiAnalyzing(true);
    setAiPreview(null);
    const result = await InvoiceAnalysisService.analyze({
      mode: 'text',
      textContent: aiText,
      direction,
      currentDateIso: new Date().toISOString().slice(0, 10),
    });
    setAiAnalyzing(false);
    if (!result.success) {
      Alert.alert('Erreur analyse', result.error);
      return;
    }
    setAiPreview(result.data);
  };

  // ─── Mode IA : analyse image ──────────────────────────────────────────────

  const handleAnalyzeImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour analyser une photo de facture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('Erreur', 'Impossible de lire l\'image sélectionnée.');
      return;
    }

    setAiAnalyzing(true);
    setAiPreview(null);
    const analyzeResult = await InvoiceAnalysisService.analyze({
      mode: 'base64',
      imageBase64: asset.base64,
      mimeType: asset.mimeType ?? 'image/jpeg',
      direction,
      currentDateIso: new Date().toISOString().slice(0, 10),
    });
    setAiAnalyzing(false);

    if (!analyzeResult.success) {
      Alert.alert('Erreur analyse', analyzeResult.error);
      return;
    }
    setAiPreview(analyzeResult.data);
  };

  // ─── Mode IA : prendre une photo ─────────────────────────────────────────

  const handleAnalyzeCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', 'Autorisez l\'accès à la caméra pour photographier une facture.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('Erreur', 'Impossible de lire la photo.');
      return;
    }

    setAiAnalyzing(true);
    setAiPreview(null);
    const analyzeResult = await InvoiceAnalysisService.analyze({
      mode: 'base64',
      imageBase64: asset.base64,
      mimeType: asset.mimeType ?? 'image/jpeg',
      direction,
      currentDateIso: new Date().toISOString().slice(0, 10),
    });
    setAiAnalyzing(false);

    if (!analyzeResult.success) {
      Alert.alert('Erreur analyse', analyzeResult.error);
      return;
    }
    setAiPreview(analyzeResult.data);
  };

  // ─── Mode IA : confirmer et ingérer ──────────────────────────────────────

  const handleConfirmIngestion = async () => {
    if (!aiPreview || !activeFarm?.farm_id || !user?.id) return;

    setAiIngesting(true);
    const result = await InvoiceIngestionService.ingestInvoice({
      farmId: activeFarm.farm_id,
      userId: user.id,
      aiOutput: aiPreview,
      source: 'invoice_scan',
    });
    setAiIngesting(false);

    if (!result.success) {
      Alert.alert('Erreur ingestion', result.error ?? 'Impossible d\'enregistrer la facture.');
      return;
    }

    const lines_txt = `${result.linesCreated} ligne${result.linesCreated > 1 ? 's' : ''}`;
    const extras: string[] = [];
    if (result.chargesCreated > 0) extras.push(`${result.chargesCreated} consommable${result.chargesCreated > 1 ? 's' : ''}`);
    if (result.semencesCreated > 0) extras.push(`${result.semencesCreated} semence${result.semencesCreated > 1 ? 's' : ''}`);

    Alert.alert(
      'Facture enregistrée',
      `Facture ${result.invoiceNumber} créée (${lines_txt}${extras.length ? ', ' + extras.join(', ') : ''}).`,
      [{ text: 'Voir', onPress: () => result.invoiceId && onNavigate('InvoiceDetails', { invoiceId: result.invoiceId }) }]
    );
  };

  // ─── Préremplir le formulaire depuis l'aperçu IA ─────────────────────────

  const handleFillFormFromAI = () => {
    if (!aiPreview) return;
    const ai = aiPreview.invoice;
    setDirection(ai.direction);
    if (ai.invoice_date) setInvoiceDate(ai.invoice_date);
    if (ai.delivery_date) setDeliveryDate(ai.delivery_date);
    if (ai.payment_due_date) setPaymentDueDate(ai.payment_due_date);
    if (ai.notes) setNotes(ai.notes);
    setLines(
      aiPreview.lines.map((l) => ({
        product_name: l.product_name,
        quantity: l.quantity,
        unit: l.unit,
        unit_price_ht: l.unit_price_ht,
        vat_rate: l.vat_rate,
        notes: l.notes ?? undefined,
      }))
    );
    setCreationMode('manual');
    setAiPreview(null);
  };

  // ─── Contenu selon mode ───────────────────────────────────────────────────

  const list = direction === 'outgoing' ? customers : suppliers;

  if (creationMode === 'ai') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Direction */}
        <Text style={styles.sectionTitle}>Type d'opération</Text>
        <View style={styles.row}>
          {(['outgoing', 'incoming'] as const).map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, direction === d && styles.chipActive]}
              onPress={() => setDirection(d)}
            >
              <Text style={[styles.chipText, direction === d && styles.chipTextActive]}>
                {d === 'outgoing' ? 'Vente' : 'Achat'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Saisie texte */}
        <Text style={styles.sectionTitle}>Analyser une facture</Text>
        <Text style={styles.hint}>
          Collez le texte d'un email/message d'achat ou photographiez une facture.
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

        <View style={styles.aiButtonRow}>
          <Button variant="outline" onPress={handleAnalyzeText} disabled={aiAnalyzing || !aiText.trim()} style={styles.aiBtn}>
            Analyser le texte
          </Button>
          <Button variant="outline" onPress={handleAnalyzeImage} disabled={aiAnalyzing} style={styles.aiBtn}>
            Galerie
          </Button>
          <Button variant="outline" onPress={handleAnalyzeCamera} disabled={aiAnalyzing} style={styles.aiBtn}>
            Caméra
          </Button>
        </View>

        {aiAnalyzing && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary[600]} />
            <Text style={styles.loadingText}>Analyse en cours…</Text>
          </View>
        )}

        {/* Aperçu résultat IA */}
        {aiPreview && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Aperçu détecté</Text>
            <Text style={styles.previewRow}>
              Confiance : {Math.round(aiPreview.confidence * 100)} %
            </Text>
            {aiPreview.invoice.supplier_name && (
              <Text style={styles.previewRow}>Fournisseur : {aiPreview.invoice.supplier_name}</Text>
            )}
            {aiPreview.invoice.customer_name && (
              <Text style={styles.previewRow}>Client : {aiPreview.invoice.customer_name}</Text>
            )}
            {aiPreview.invoice.invoice_date && (
              <Text style={styles.previewRow}>Date : {aiPreview.invoice.invoice_date}</Text>
            )}
            {aiPreview.invoice.invoice_number && (
              <Text style={styles.previewRow}>N° : {aiPreview.invoice.invoice_number}</Text>
            )}
            <Text style={[styles.previewRow, { marginTop: spacing.sm }]}>
              Lignes détectées ({aiPreview.lines.length}) :
            </Text>
            {aiPreview.lines.map((l, i) => (
              <Text key={i} style={styles.previewLine}>
                • {l.product_name} — {l.quantity} {l.unit} × {l.unit_price_ht.toFixed(2)} €
                {l.is_charge ? ' [consommable]' : ''}
                {l.is_semence ? ' [semence]' : ''}
              </Text>
            ))}

            <View style={styles.previewActions}>
              <Button
                variant="primary"
                onPress={handleConfirmIngestion}
                disabled={aiIngesting}
                style={styles.previewBtn}
              >
                {aiIngesting ? 'Enregistrement…' : 'Confirmer et enregistrer'}
              </Button>
              <Button variant="outline" onPress={handleFillFormFromAI} style={styles.previewBtn}>
                Éditer manuellement
              </Button>
            </View>
          </View>
        )}

        <View style={styles.stepNav}>
          <Button variant="outline" onPress={() => setCreationMode('manual')} style={styles.stepBtn}>
            Retour saisie manuelle
          </Button>
        </View>
      </ScrollView>
    );
  }

  // ─── Mode manuel ─────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Bouton basculer vers mode IA */}
      <TouchableOpacity style={styles.aiToggle} onPress={() => setCreationMode('ai')}>
        <Text style={styles.aiToggleText}>Analyser une facture avec l'IA</Text>
      </TouchableOpacity>

      {/* Step 1 : direction + document_type + tiers */}
      {step === 1 && (
        <>
          <Text style={styles.sectionTitle}>Type d'opération</Text>
          <View style={styles.row}>
            {(['outgoing', 'incoming'] as const).map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, direction === d && styles.chipActive]}
                onPress={() => setDirection(d)}
              >
                <Text style={[styles.chipText, direction === d && styles.chipTextActive]}>
                  {d === 'outgoing' ? 'Vente' : 'Achat'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Type de document</Text>
          <View style={styles.row}>
            {(Object.keys(DOCUMENT_TYPE_LABELS) as InvoiceDocumentType[]).map((dt) => (
              <TouchableOpacity
                key={dt}
                style={[styles.chip, documentType === dt && styles.chipActive]}
                onPress={() => setDocumentType(dt)}
              >
                <Text style={[styles.chipText, documentType === dt && styles.chipTextActive]} numberOfLines={2}>
                  {DOCUMENT_TYPE_LABELS[dt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>
            {direction === 'outgoing' ? 'Client' : 'Fournisseur'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
            {list.map((item) => {
              const selected =
                (direction === 'outgoing' && item.id === customerId) ||
                (direction === 'incoming' && item.id === supplierId);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.pickerItem, selected && styles.pickerItemActive]}
                  onPress={() => {
                    if (direction === 'outgoing') { setCustomerId(item.id); setSupplierId(null); }
                    else { setSupplierId(item.id); setCustomerId(null); }
                  }}
                >
                  <Text style={[styles.pickerText, selected && styles.pickerTextActive]} numberOfLines={1}>
                    {item.company_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {list.length === 0 && (
            <Text style={styles.hint}>
              Aucun {direction === 'outgoing' ? 'client' : 'fournisseur'}. Créez-en un dans Clients & Fournisseurs.
            </Text>
          )}
        </>
      )}

      {/* Step 2 : dates */}
      {step === 2 && (
        <>
          <Text style={styles.sectionTitle}>Dates</Text>
          <Input label="Date facture" value={invoiceDate} onChangeText={setInvoiceDate} placeholder="AAAA-MM-JJ" />
          <Input
            label={documentType === 'invoice_with_delivery' ? 'Date livraison (obligatoire)' : 'Date livraison (optionnel)'}
            value={deliveryDate}
            onChangeText={setDeliveryDate}
            placeholder="AAAA-MM-JJ"
          />
          {(documentType === 'delivery_note' || documentType === 'invoice_with_delivery') && (
            <Input
              label="Lieu de livraison"
              value={deliveryLocation}
              onChangeText={setDeliveryLocation}
              placeholder="Adresse ou lieu"
            />
          )}
          <Input
            label="Échéance paiement (optionnel)"
            value={paymentDueDate}
            onChangeText={setPaymentDueDate}
            placeholder="AAAA-MM-JJ"
          />
          <Input label="Notes (optionnel)" value={notes} onChangeText={setNotes} placeholder="Notes" multiline />
        </>
      )}

      {/* Step 3 : lignes */}
      {step === 3 && (
        <>
          <Text style={styles.sectionTitle}>Lignes produits</Text>

          {/* Produits suggérés */}
          {products.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productSuggest}>
              {products.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.productChip}
                  onPress={() => {
                    const emptyIdx = lines.findIndex((l) => !l.product_name.trim());
                    if (emptyIdx >= 0) applyProductToLine(emptyIdx, p);
                    else {
                      addLine();
                      setTimeout(() => applyProductToLine(lines.length, p), 50);
                    }
                  }}
                >
                  <Text style={styles.productChipText} numberOfLines={1}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {lines.map((line, idx) => (
            <View key={idx} style={styles.lineCard}>
              <Input
                label="Produit"
                value={line.product_name}
                onChangeText={(t) => updateLine(idx, { product_name: t })}
                placeholder="Nom du produit"
              />
              <View style={styles.lineRow}>
                <Input
                  label="Qté"
                  value={String(line.quantity)}
                  onChangeText={(t) => updateLine(idx, { quantity: parseFloat(t) || 0 })}
                  keyboardType="numeric"
                  containerStyle={styles.lineField}
                />
                <Input
                  label="Unité"
                  value={line.unit}
                  onChangeText={(t) => updateLine(idx, { unit: t })}
                  containerStyle={styles.lineField}
                />
                <Input
                  label="Prix HT"
                  value={String(line.unit_price_ht)}
                  onChangeText={(t) => updateLine(idx, { unit_price_ht: parseFloat(t) || 0 })}
                  keyboardType="numeric"
                  containerStyle={styles.lineField}
                />
                <Input
                  label="TVA %"
                  value={String(line.vat_rate)}
                  onChangeText={(t) => updateLine(idx, { vat_rate: parseFloat(t) || 0 })}
                  keyboardType="numeric"
                  containerStyle={styles.lineField}
                />
              </View>
              <View style={styles.lineFooter}>
                <Text style={styles.lineTotal}>
                  {(line.quantity * line.unit_price_ht * (1 + line.vat_rate / 100)).toFixed(2)} € TTC
                </Text>
                {lines.length > 1 && (
                  <TouchableOpacity onPress={() => removeLine(idx)}>
                    <Text style={styles.removeText}>Supprimer</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          <Button variant="outline" onPress={addLine} style={styles.addBtn}>
            Ajouter une ligne
          </Button>
        </>
      )}

      {/* Step 4 : récapitulatif + enregistrement */}
      {step === 4 && (
        <>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Type</Text>
              <Text>{DOCUMENT_TYPE_LABELS[documentType]}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Direction</Text>
              <Text>{direction === 'outgoing' ? 'Vente' : 'Achat'}</Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: spacing.sm }]}>
              <Text>Total HT</Text>
              <Text>{totalHt.toFixed(2)} €</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Total TVA</Text>
              <Text>{totalVat.toFixed(2)} €</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowTtc]}>
              <Text style={styles.summaryTtc}>Total TTC</Text>
              <Text style={styles.summaryTtc}>{totalTtc.toFixed(2)} €</Text>
            </View>
          </View>
          <Button variant="primary" onPress={() => handleSave('sent')} disabled={saving} style={styles.btn}>
            Valider et envoyer
          </Button>
          <Button variant="outline" onPress={() => handleSave('draft')} disabled={saving} style={styles.btn}>
            Enregistrer brouillon
          </Button>
        </>
      )}

      {/* Navigation entre étapes */}
      <View style={styles.stepNav}>
        {step > 1 && (
          <Button variant="outline" onPress={() => setStep((s) => (s - 1) as Step)} style={styles.stepBtn}>
            Précédent
          </Button>
        )}
        {step < 4 && (
          <Button variant="primary" onPress={() => setStep((s) => (s + 1) as Step)} style={styles.stepBtn}>
            Suivant
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  aiToggle: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  aiToggleText: { color: colors.primary[700], fontWeight: '600', fontSize: 15 },

  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.gray[900], marginBottom: spacing.md },
  label: { fontSize: 14, color: colors.gray[600], marginBottom: spacing.xs },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8, backgroundColor: colors.gray[100] },
  chipActive: { backgroundColor: colors.primary[100] },
  chipText: { fontSize: 14, color: colors.gray[600] },
  chipTextActive: { color: colors.primary[600], fontWeight: '600' },

  pickerRow: { marginBottom: spacing.md },
  pickerItem: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: 8, backgroundColor: colors.gray[100], marginRight: spacing.sm,
  },
  pickerItemActive: { backgroundColor: colors.primary[600] },
  pickerText: { fontSize: 14, color: colors.gray[700] },
  pickerTextActive: { color: 'white', fontWeight: '600' },

  hint: { fontSize: 14, color: colors.gray[500], fontStyle: 'italic', marginBottom: spacing.sm },

  productSuggest: { marginBottom: spacing.md },
  productChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 6,
    backgroundColor: colors.gray[100], marginRight: spacing.xs, borderWidth: 1, borderColor: colors.gray[200],
  },
  productChipText: { fontSize: 12, color: colors.gray[700] },

  lineCard: { backgroundColor: colors.gray[50], borderRadius: 8, padding: spacing.md, marginBottom: spacing.md },
  lineRow: { flexDirection: 'row', gap: spacing.xs },
  lineField: { flex: 1 },
  lineFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  lineTotal: { fontWeight: '600', color: colors.primary[600] },
  removeText: { color: colors.semantic.error, fontSize: 14 },
  addBtn: { marginBottom: spacing.md },

  summary: { backgroundColor: colors.gray[50], borderRadius: 8, padding: spacing.md, marginBottom: spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  summaryLabel: { color: colors.gray[500], fontSize: 13 },
  summaryRowTtc: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.gray[200] },
  summaryTtc: { fontSize: 18, fontWeight: '700', color: colors.primary[600] },
  btn: { marginBottom: spacing.sm },

  stepNav: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  stepBtn: { minWidth: 120 },

  // Mode IA
  textArea: {
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  aiButtonRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  aiBtn: { flex: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  loadingText: { color: colors.gray[600] },

  previewCard: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  previewTitle: { fontSize: 16, fontWeight: '700', color: colors.primary[700], marginBottom: spacing.sm },
  previewRow: { fontSize: 14, color: colors.gray[800], marginBottom: 4 },
  previewLine: { fontSize: 13, color: colors.gray[700], marginLeft: spacing.sm, marginBottom: 2 },
  previewActions: { marginTop: spacing.md, gap: spacing.sm },
  previewBtn: { marginBottom: spacing.xs },
});
