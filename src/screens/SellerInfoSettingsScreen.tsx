import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { Text, Button, Input, Switch } from '../design-system/components';
import { useFarm } from '../contexts/FarmContext';
import { SellerInfoService } from '../services/SellerInfoService';
import { SireneService } from '../services/SireneService';
import type { SellerInfo } from '../types';

interface SellerInfoSettingsScreenProps {
  navigation: { goBack: () => void };
}

export default function SellerInfoSettingsScreen({ navigation }: SellerInfoSettingsScreenProps) {
  const { activeFarm } = useFarm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siretInput, setSiretInput] = useState('');
  const [siretLoading, setSiretLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    legal_status: '',
    address: '',
    postal_code: '',
    city: '',
    country: 'France',
    siret: '',
    siren: '',
    vat_number: '',
    email: '',
    phone: '',
    vat_not_applicable: false,
  });

  useEffect(() => {
    if (!activeFarm?.farm_id) return;
    (async () => {
      setLoading(true);
      const info = await SellerInfoService.getByFarm(activeFarm.farm_id);
      if (info) {
        setForm({
          company_name: info.company_name ?? '',
          legal_status: info.legal_status ?? '',
          address: info.address ?? '',
          postal_code: info.postal_code ?? '',
          city: info.city ?? '',
          country: info.country ?? 'France',
          siret: info.siret ?? '',
          siren: info.siren ?? '',
          vat_number: info.vat_number ?? '',
          email: info.email ?? '',
          phone: info.phone ?? '',
          vat_not_applicable: info.vat_not_applicable ?? false,
        });
      } else {
        setForm((f) => ({ ...f, company_name: activeFarm.farm_name ?? '' }));
      }
      setLoading(false);
    })();
  }, [activeFarm?.farm_id, activeFarm?.farm_name]);

  const handleSiretLookup = async () => {
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
        siret: result.siret || f.siret,
        siren: result.siren || f.siren,
        company_name: result.company_name || f.company_name,
        address: result.address || f.address,
        postal_code: result.postal_code || f.postal_code,
        city: result.city || f.city,
        vat_number: result.vat_number || f.vat_number,
      }));
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
      const ok = await SellerInfoService.upsert({
        farm_id: activeFarm.farm_id,
        company_name: form.company_name.trim(),
        legal_status: form.legal_status || undefined,
        address: form.address || undefined,
        postal_code: form.postal_code || undefined,
        city: form.city || undefined,
        country: form.country || 'France',
        siret: form.siret || undefined,
        siren: form.siren || undefined,
        vat_number: form.vat_number || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        vat_not_applicable: form.vat_not_applicable,
      });
      if (ok) {
        Alert.alert('Enregistré', 'Les informations vendeur ont été mises à jour.');
      } else {
        Alert.alert('Erreur', 'Impossible d\'enregistrer.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.siretCard}>
        <Text style={styles.siretTitle}>Rechercher par SIRET</Text>
        <Text style={styles.siretSubtitle}>
          Saisissez le SIRET (14 chiffres) de votre entreprise pour pré-remplir les champs ci-dessous.
        </Text>
        <Input
          label="SIRET"
          value={siretInput}
          onChangeText={setSiretInput}
          placeholder="14 chiffres"
          keyboardType="number-pad"
          maxLength={14}
        />
        <Button
          title={siretLoading ? 'Recherche...' : 'Rechercher'}
          onPress={handleSiretLookup}
          disabled={siretLoading}
          style={styles.siretButton}
        />
        {siretLoading && (
          <ActivityIndicator size="small" color={colors.primary[600]} style={styles.siretLoader} />
        )}
      </View>

      <Text style={styles.sectionTitle}>Informations entreprise</Text>
      <Input
        label="Nom de l'entreprise *"
        value={form.company_name}
        onChangeText={(t) => setForm((f) => ({ ...f, company_name: t }))}
        placeholder="Raison sociale"
      />
      <Input
        label="Statut juridique"
        value={form.legal_status}
        onChangeText={(t) => setForm((f) => ({ ...f, legal_status: t }))}
        placeholder="EI, EARL, GAEC, SCEA..."
      />
      <Input
        label="Adresse"
        value={form.address}
        onChangeText={(t) => setForm((f) => ({ ...f, address: t }))}
        placeholder="Adresse"
      />
      <Input
        label="Code postal"
        value={form.postal_code}
        onChangeText={(t) => setForm((f) => ({ ...f, postal_code: t }))}
        placeholder="Code postal"
      />
      <Input
        label="Ville"
        value={form.city}
        onChangeText={(t) => setForm((f) => ({ ...f, city: t }))}
        placeholder="Ville"
      />
      <Input
        label="SIRET"
        value={form.siret}
        onChangeText={(t) => setForm((f) => ({ ...f, siret: t }))}
        placeholder="14 chiffres"
      />
      <Input
        label="N° TVA intracommunautaire"
        value={form.vat_number}
        onChangeText={(t) => setForm((f) => ({ ...f, vat_number: t }))}
        placeholder="FR..."
      />
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
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>TVA non applicable (art. 293B CGI)</Text>
        <Switch
          value={form.vat_not_applicable}
          onValueChange={(v) => setForm((f) => ({ ...f, vat_not_applicable: v }))}
        />
      </View>
      <Button variant="primary" onPress={handleSave} disabled={saving} style={styles.btn}>
        Enregistrer
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  switchLabel: { fontSize: 16, color: colors.gray[700] },
  btn: { marginTop: spacing.md },
  siretCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[600],
  },
  siretTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  siretSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  siretButton: { marginTop: spacing.sm },
  siretLoader: { marginTop: spacing.sm },
});
