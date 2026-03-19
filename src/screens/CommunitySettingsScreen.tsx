import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Text, Button } from '../design-system/components';
import { FormSection } from '../design-system/components/StandardFormModal';
import { EnhancedInput } from '../design-system/components/EnhancedInput';
import { DropdownSelector } from '../design-system/components';
import { Switch } from '../design-system/components/Switch';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { CommunityService } from '../services/CommunityService';
import { useAuth } from '../contexts/AuthContext';
import type { Community, CommunityStatus, CommunityJoinPolicy } from '../types';

const JOIN_POLICY_OPTIONS: { id: CommunityJoinPolicy; label: string }[] = [
  { id: 'open', label: 'Ouverte' },
  { id: 'approval_required', label: 'Sur approbation' },
  { id: 'invite_only', label: 'Sur invitation uniquement' },
];

const STATUS_OPTIONS: { id: CommunityStatus; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'archived', label: 'Archivée' },
];

interface CommunitySettingsScreenProps {
  navigation: { goBack: () => void };
  communityId: string;
  onNavigate: (screen: string, params?: { communityId?: string }) => void;
}

export default function CommunitySettingsScreen({
  navigation,
  communityId,
}: CommunitySettingsScreenProps) {
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    address: '',
    city: '',
    postal_code: '',
    department: '',
    region: '',
    country: 'France',
    contact_email: '',
    contact_phone: '',
    website_url: '',
    join_policy: 'approval_required' as CommunityJoinPolicy,
    requires_approval: true,
    max_members: '',
    join_message: '',
    status: 'active' as CommunityStatus,
  });

  const load = useCallback(async () => {
    if (!communityId) return;
    try {
      const c = await CommunityService.getCommunityById(communityId);
      if (c) {
        setCommunity(c);
        setFormData({
          name: c.name,
          description: c.description ?? '',
          logo_url: c.logo_url ?? '',
          address: c.address ?? '',
          city: c.city ?? '',
          postal_code: c.postal_code ?? '',
          department: c.department ?? '',
          region: c.region ?? '',
          country: c.country ?? 'France',
          contact_email: c.contact_email ?? '',
          contact_phone: c.contact_phone ?? '',
          website_url: c.website_url ?? '',
          join_policy: c.join_policy,
          requires_approval: c.requires_approval,
          max_members: c.max_members != null ? String(c.max_members) : '',
          join_message: c.join_message ?? '',
          status: c.status,
        });
      }
    } catch (e) {
      console.error('[CommunitySettingsScreen] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const name = formData.name.trim();
    if (!name) {
      Alert.alert('Erreur', 'Le nom est obligatoire.');
      return;
    }
    if (!communityId) return;

    setSaving(true);
    try {
      const ok = await CommunityService.updateCommunity(communityId, {
        name,
        description: formData.description.trim() || null,
        logo_url: formData.logo_url.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        department: formData.department.trim() || null,
        region: formData.region.trim() || null,
        country: formData.country.trim() || 'France',
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        website_url: formData.website_url.trim() || null,
        join_policy: formData.join_policy,
        requires_approval: formData.requires_approval,
        max_members: formData.max_members ? parseInt(formData.max_members, 10) : null,
        join_message: formData.join_message.trim() || null,
        status: formData.status,
      });
      if (ok) {
        Alert.alert('Enregistré', 'Les paramètres ont été mis à jour.');
        load();
      } else {
        Alert.alert('Erreur', 'Impossible d\'enregistrer.');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !community) {
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
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary[600]]} />
      }
      keyboardShouldPersistTaps="handled"
    >
      <FormSection title="Identité">
        <EnhancedInput label="Nom" value={formData.name} onChangeText={(v) => updateFormData('name', v)} required />
        <EnhancedInput label="Description" value={formData.description} onChangeText={(v) => updateFormData('description', v)} multiline numberOfLines={3} />
        <EnhancedInput label="Logo (URL)" value={formData.logo_url} onChangeText={(v) => updateFormData('logo_url', v)} />
      </FormSection>

      <FormSection title="Localisation">
        <EnhancedInput label="Adresse" value={formData.address} onChangeText={(v) => updateFormData('address', v)} />
        <EnhancedInput label="Ville" value={formData.city} onChangeText={(v) => updateFormData('city', v)} />
        <EnhancedInput label="Code postal" value={formData.postal_code} onChangeText={(v) => updateFormData('postal_code', v)} />
        <EnhancedInput label="Département" value={formData.department} onChangeText={(v) => updateFormData('department', v)} />
        <EnhancedInput label="Région" value={formData.region} onChangeText={(v) => updateFormData('region', v)} />
        <EnhancedInput label="Pays" value={formData.country} onChangeText={(v) => updateFormData('country', v)} />
      </FormSection>

      <FormSection title="Contact">
        <EnhancedInput label="Email" value={formData.contact_email} onChangeText={(v) => updateFormData('contact_email', v)} keyboardType="email-address" />
        <EnhancedInput label="Téléphone" value={formData.contact_phone} onChangeText={(v) => updateFormData('contact_phone', v)} keyboardType="phone-pad" />
        <EnhancedInput label="Site web" value={formData.website_url} onChangeText={(v) => updateFormData('website_url', v)} keyboardType="url" />
      </FormSection>

      <FormSection title="Adhésion">
        <DropdownSelector
          label="Politique d'adhésion"
          items={JOIN_POLICY_OPTIONS}
          selectedItems={JOIN_POLICY_OPTIONS.filter((o) => o.id === formData.join_policy)}
          onSelectionChange={(items) => updateFormData('join_policy', items[0]?.id ?? 'approval_required')}
        />
        <View style={styles.switchRow}>
          <Text variant="body">Exiger une approbation</Text>
          <Switch value={formData.requires_approval} onValueChange={(v) => updateFormData('requires_approval', v)} />
        </View>
        <EnhancedInput
          label="Nombre max de membres"
          value={formData.max_members}
          onChangeText={(v) => updateFormData('max_members', v)}
          keyboardType="number-pad"
          placeholder="Illimité si vide"
        />
        <EnhancedInput
          label="Message d'accueil"
          value={formData.join_message}
          onChangeText={(v) => updateFormData('join_message', v)}
          multiline
          numberOfLines={2}
        />
      </FormSection>

      <FormSection title="Statut">
        <DropdownSelector
          label="Statut de la communauté"
          items={STATUS_OPTIONS}
          selectedItems={STATUS_OPTIONS.filter((o) => o.id === formData.status)}
          onSelectionChange={(items) => updateFormData('status', items[0]?.id ?? 'active')}
        />
      </FormSection>

      <View style={styles.saveButton}>
        <Button title="Enregistrer" onPress={handleSave} loading={saving} disabled={saving} />
      </View>

      <View style={{ height: spacing.xl * 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background?.primary ?? colors.gray[50] },
  content: { padding: spacing.lg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  saveButton: { marginTop: spacing.lg },
});
