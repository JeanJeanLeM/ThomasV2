import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { Text, Button, Input } from '../design-system/components';
import { PlusIcon, TrashIcon, MapPinIcon } from '../design-system/icons';
import { useFarm } from '../contexts/FarmContext';
import { CustomerService } from '../services/CustomerService';
import { SupplierService } from '../services/SupplierService';
import { SireneService } from '../services/SireneService';
import type { Customer, Supplier, CustomerAddress } from '../types';
import type { ScreenName } from '../contexts/NavigationContext';

interface CustomerEditScreenProps {
  navigation: { goBack: () => void };
  customerId?: string;
  mode: 'customer' | 'supplier';
  onNavigate: (screen: ScreenName, params?: Record<string, unknown>) => void;
}

const emptyAddress: CustomerAddress = {
  label: 'Livraison',
  address: '',
  postal_code: '',
  city: '',
};

export default function CustomerEditScreen({
  navigation,
  customerId,
  mode,
  onNavigate,
}: CustomerEditScreenProps) {
  const { activeFarm } = useFarm();
  const [loading, setLoading] = useState(!!customerId);
  const [saving, setSaving] = useState(false);
  const [siretLoading, setSiretLoading] = useState(false);
  const [siretInput, setSiretInput] = useState('');
  const [showForm, setShowForm] = useState(!!customerId);
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    address: '',
    postal_code: '',
    city: '',
    country: 'France',
    siret: '',
    siren: '',
    vat_number: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [deliveryAddresses, setDeliveryAddresses] = useState<CustomerAddress[]>([]);

  useEffect(() => {
    if (!customerId || !activeFarm?.farm_id) {
      if (!customerId) setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        if (mode === 'customer') {
          const c = await CustomerService.getCustomerById(customerId);
          if (c) {
            setForm({
              company_name: c.company_name ?? '',
              contact_name: c.contact_name ?? '',
              address: c.address ?? '',
              postal_code: c.postal_code ?? '',
              city: c.city ?? '',
              country: c.country ?? 'France',
              siret: c.siret ?? '',
              siren: c.siren ?? '',
              vat_number: c.vat_number ?? '',
              email: c.email ?? '',
              phone: c.phone ?? '',
              notes: c.notes ?? '',
            });
            setDeliveryAddresses(Array.isArray(c.delivery_addresses) ? c.delivery_addresses : []);
            setShowForm(true);
          }
        } else {
          const s = await SupplierService.getSupplierById(customerId);
          if (s) {
            setForm({
              company_name: s.company_name ?? '',
              contact_name: s.contact_name ?? '',
              address: s.address ?? '',
              postal_code: s.postal_code ?? '',
              city: s.city ?? '',
              country: s.country ?? 'France',
              siret: s.siret ?? '',
              siren: s.siren ?? '',
              vat_number: s.vat_number ?? '',
              email: s.email ?? '',
              phone: s.phone ?? '',
              notes: s.notes ?? '',
            });
            setShowForm(true);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId, mode, activeFarm?.farm_id]);

  const handleSiretValidate = async () => {
    const siret = siretInput.replace(/\s/g, '').replace(/\D/g, '');
    if (siret.length !== 14) {
      Alert.alert('SIRET invalide', 'Le SIRET doit contenir 14 chiffres.');
      return;
    }
    setSiretLoading(true);
    try {
      const result = await SireneService.lookupBySiret(siret);
      setForm((f) => ({
        ...f,
        company_name: result.company_name || f.company_name,
        address: result.address || f.address,
        postal_code: result.postal_code || f.postal_code,
        city: result.city || f.city,
        siret: result.siret || f.siret,
        siren: result.siren || f.siren,
        vat_number: result.vat_number || f.vat_number,
      }));
      setShowForm(true);
    } catch (e: any) {
      Alert.alert('Recherche SIRET', e?.message ?? 'Impossible de récupérer les informations (vérifiez le SIRET ou votre connexion).');
    } finally {
      setSiretLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activeFarm?.farm_id || !form.company_name.trim()) {
      Alert.alert('Erreur', 'Le nom de l\'entreprise est requis.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        company_name: form.company_name.trim(),
        contact_name: form.contact_name || undefined,
        address: form.address || undefined,
        postal_code: form.postal_code || undefined,
        city: form.city || undefined,
        country: form.country || 'France',
        siret: form.siret || undefined,
        siren: form.siren || undefined,
        vat_number: form.vat_number || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
        ...(mode === 'customer' && { delivery_addresses: deliveryAddresses.length > 0 ? deliveryAddresses : undefined }),
      };
      if (customerId) {
        const ok =
          mode === 'customer'
            ? await CustomerService.updateCustomer(customerId, payload)
            : await SupplierService.updateSupplier(customerId, payload);
        if (ok) {
          Alert.alert('Enregistré', 'Modifications enregistrées.');
          navigation.goBack();
        } else {
          Alert.alert('Erreur', 'Impossible d\'enregistrer.');
        }
      } else {
        const result =
          mode === 'customer'
            ? await CustomerService.createCustomer({
                farm_id: activeFarm.farm_id,
                ...payload,
              })
            : await SupplierService.createSupplier({
                farm_id: activeFarm.farm_id,
                ...payload,
              });
        if (result) {
          Alert.alert('Créé', `${mode === 'customer' ? 'Client' : 'Fournisseur'} créé.`);
          navigation.goBack();
        } else {
          Alert.alert('Erreur', 'Impossible de créer.');
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const addDeliveryAddress = () => {
    setDeliveryAddresses((prev) => [...prev, { ...emptyAddress, label: `Adresse ${prev.length + 1}` }]);
  };

  const updateDeliveryAddress = (index: number, field: keyof CustomerAddress, value: string) => {
    setDeliveryAddresses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeDeliveryAddress = (index: number) => {
    setDeliveryAddresses((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const title = mode === 'customer' ? 'Client' : 'Fournisseur';
  const isCreating = !customerId;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>
        {customerId ? `Modifier le ${title.toLowerCase()}` : `Nouveau ${title.toLowerCase()}`}
      </Text>

      {/* Étape 1 : Ajouter un SIRET (création uniquement, tant que le formulaire n'est pas affiché) */}
      {isCreating && !showForm && (
        <View style={styles.siretCard}>
          <Text style={styles.siretTitle}>Rechercher par SIRET</Text>
          <Text style={styles.siretSubtitle}>
            Saisissez le SIRET (14 chiffres) de l'entreprise. Les informations seront récupérées automatiquement, puis vous pourrez les vérifier et enregistrer.
          </Text>
          <Input
            label="SIRET"
            value={siretInput}
            onChangeText={setSiretInput}
            placeholder="Ex. 123 456 789 00012"
            keyboardType="number-pad"
            maxLength={17}
          />
          <Button
            title="Valider"
            onPress={handleSiretValidate}
            disabled={siretLoading}
            style={styles.siretButton}
          />
          {siretLoading && (
            <ActivityIndicator size="small" color={colors.primary[600]} style={styles.siretLoader} />
          )}
          <TouchableOpacity style={styles.manualLink} onPress={() => setShowForm(true)}>
            <Text style={styles.manualLinkText}>Saisir manuellement sans SIRET</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Formulaire principal (après SIRET validé ou en édition ou saisie manuelle) */}
      {showForm && (
        <>
          {isCreating && form.company_name && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>
                Les informations ci-dessous ont été remplies. Vérifiez-les puis enregistrez.
              </Text>
            </View>
          )}

          <Text style={styles.blockLabel}>Entreprise</Text>
          <Input
            label="Nom de l'entreprise *"
            value={form.company_name}
            onChangeText={(t) => setForm((f) => ({ ...f, company_name: t }))}
            placeholder="Raison sociale"
          />
          <Input
            label="Nom du contact"
            value={form.contact_name}
            onChangeText={(t) => setForm((f) => ({ ...f, contact_name: t }))}
            placeholder="Contact"
          />

          <Text style={styles.blockLabel}>Adresse du siège</Text>
          <Input
            label="Adresse"
            value={form.address}
            onChangeText={(t) => setForm((f) => ({ ...f, address: t }))}
            placeholder="Adresse"
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="Code postal"
                value={form.postal_code}
                onChangeText={(t) => setForm((f) => ({ ...f, postal_code: t }))}
                placeholder="CP"
              />
            </View>
            <View style={styles.half}>
              <Input
                label="Ville"
                value={form.city}
                onChangeText={(t) => setForm((f) => ({ ...f, city: t }))}
                placeholder="Ville"
              />
            </View>
          </View>
          <Input
            label="Pays"
            value={form.country}
            onChangeText={(t) => setForm((f) => ({ ...f, country: t }))}
            placeholder="France"
          />

          <Text style={styles.blockLabel}>Identification</Text>
          <Input
            label="SIRET"
            value={form.siret}
            onChangeText={(t) => setForm((f) => ({ ...f, siret: t }))}
            placeholder="14 chiffres"
            keyboardType="number-pad"
          />
          <Input
            label="N° TVA intracommunautaire"
            value={form.vat_number}
            onChangeText={(t) => setForm((f) => ({ ...f, vat_number: t }))}
            placeholder="FR..."
          />

          <Text style={styles.blockLabel}>Contact</Text>
          <Input
            label="Email"
            value={form.email}
            onChangeText={(t) => setForm((f) => ({ ...f, email: t }))}
            placeholder="contact@..."
            keyboardType="email-address"
          />
          <Input
            label="Téléphone"
            value={form.phone}
            onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))}
            placeholder="Téléphone"
            keyboardType="phone-pad"
          />
          <Input
            label="Notes"
            value={form.notes}
            onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))}
            placeholder="Notes"
            multiline
          />

          {/* Adresses de livraison (clients uniquement) */}
          {mode === 'customer' && (
            <>
              <View style={styles.addressesHeader}>
                <Text style={styles.blockLabel}>Adresses de livraison</Text>
                <TouchableOpacity style={styles.addAddressButton} onPress={addDeliveryAddress}>
                  <PlusIcon color={colors.primary[600]} size={20} />
                  <Text style={styles.addAddressText}>Ajouter une adresse</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.addressesHint}>
                Ajoutez des adresses de livraison différentes du siège (ex. point de livraison, dépôt).
              </Text>
              {deliveryAddresses.map((addr, index) => (
                <View key={index} style={styles.deliveryCard}>
                  <View style={styles.deliveryCardHeader}>
                    <MapPinIcon color={colors.gray[500]} size={18} />
                    <Text style={styles.deliveryCardTitle}>{addr.label || `Adresse ${index + 1}`}</Text>
                    <TouchableOpacity onPress={() => removeDeliveryAddress(index)} hitSlop={12}>
                      <TrashIcon color={colors.semantic.error} size={20} />
                    </TouchableOpacity>
                  </View>
                  <Input
                    label="Libellé"
                    value={addr.label}
                    onChangeText={(v) => updateDeliveryAddress(index, 'label', v)}
                    placeholder="Ex. Livraison, Dépôt..."
                  />
                  <Input
                    label="Adresse"
                    value={addr.address}
                    onChangeText={(v) => updateDeliveryAddress(index, 'address', v)}
                    placeholder="Voie, numéro"
                  />
                  <View style={styles.row}>
                    <View style={styles.half}>
                      <Input
                        label="Code postal"
                        value={addr.postal_code}
                        onChangeText={(v) => updateDeliveryAddress(index, 'postal_code', v)}
                        placeholder="CP"
                      />
                    </View>
                    <View style={styles.half}>
                      <Input
                        label="Ville"
                        value={addr.city}
                        onChangeText={(v) => updateDeliveryAddress(index, 'city', v)}
                        placeholder="Ville"
                      />
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          <Button
            variant="primary"
            title={saving ? 'Enregistrement...' : 'Enregistrer'}
            onPress={handleSave}
            disabled={saving}
            style={styles.btn}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.sm, color: colors.text.secondary },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },

  siretCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  siretTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  siretSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  siretButton: { marginTop: spacing.sm },
  siretLoader: { marginTop: spacing.sm },
  manualLink: { marginTop: spacing.md, alignItems: 'center' },
  manualLinkText: { fontSize: 14, color: colors.primary[600], fontWeight: '500' },

  infoBanner: {
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
  },
  infoBannerText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },

  blockLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[700],
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  btn: { marginTop: spacing.xl },

  addressesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  addAddressText: { fontSize: 14, color: colors.primary[600], fontWeight: '600' },
  addressesHint: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  deliveryCard: {
    backgroundColor: colors.gray[50],
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  deliveryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  deliveryCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[800],
  },
});
