import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { FormScreen } from '../design-system/components/FormScreen';
import { FormSection } from '../design-system/components/StandardFormModal';
import { EnhancedInput } from '../design-system/components/EnhancedInput';
import { DropdownSelector } from '../design-system/components';
import { CommunityService } from '../services/CommunityService';
import { useAuth } from '../contexts/AuthContext';
import type { CommunityJoinPolicy } from '../types';

const JOIN_POLICY_OPTIONS: { id: CommunityJoinPolicy; label: string }[] = [
  { id: 'open', label: 'Ouverte (tout le monde peut rejoindre)' },
  { id: 'approval_required', label: 'Sur approbation' },
  { id: 'invite_only', label: 'Sur invitation uniquement' },
];

interface CommunityCreateScreenProps {
  navigation: { goBack: () => void };
  onNavigate: (screen: string, params?: { communityId?: string }) => void;
}

export default function CommunityCreateScreen({ navigation, onNavigate }: CommunityCreateScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    postal_code: '',
    department: '',
    region: '',
    country: 'France',
    contact_email: '',
    contact_phone: '',
    website_url: '',
    logo_url: '',
    join_policy: 'approval_required' as CommunityJoinPolicy,
    requires_approval: true,
    max_members: '',
    join_message: '',
  });

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    const name = formData.name.trim();
    if (!name) {
      Alert.alert('Erreur', 'Le nom de la communauté est obligatoire.');
      return;
    }
    if (name.length < 2 || name.length > 100) {
      Alert.alert('Erreur', 'Le nom doit contenir entre 2 et 100 caractères.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Erreur', 'Vous devez être connecté pour créer une communauté.');
      return;
    }

    setLoading(true);
    try {
      const result = await CommunityService.createCommunity({
        name,
        description: formData.description.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        region: formData.region.trim() || null,
        department: formData.department.trim() || null,
        country: formData.country.trim() || 'France',
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        website_url: formData.website_url.trim() || null,
        logo_url: formData.logo_url.trim() || null,
        join_policy: formData.join_policy,
        requires_approval: formData.join_policy === 'approval_required',
        max_members: formData.max_members ? parseInt(formData.max_members, 10) : null,
        join_message: formData.join_message.trim() || null,
        created_by: user.id,
      });

      if (result?.id) {
        if (Platform.OS === 'web') {
          console.log('Communaute créée:', result.id);
          navigation.goBack();
        } else {
          Alert.alert('Succès', 'La communauté a été créée.', [
            { text: 'OK', onPress: () => onNavigate('CommunityDetail', { communityId: result.id }) },
          ]);
        }
      } else {
        Alert.alert('Erreur', 'Impossible de créer la communauté.');
      }
    } catch (e) {
      console.error('[CommunityCreateScreen] create error:', e);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormScreen
      title="Créer une communauté"
      onBack={() => navigation.goBack()}
      primaryAction={{
        title: 'Créer',
        onPress: handleCreate,
        loading,
        disabled: !formData.name.trim() || loading,
      }}
      infoBanner={{ text: 'Remplissez au moins le nom. Les autres champs sont optionnels.', type: 'info' }}
    >
      <FormSection title="Identité" description="Nom et présentation">
        <EnhancedInput
          label="Nom"
          placeholder="Ex: Cuma du Val"
          value={formData.name}
          onChangeText={(v) => updateFormData('name', v)}
          required
          hint="Entre 2 et 100 caractères"
        />
        <EnhancedInput
          label="Description"
          placeholder="Description de la communauté"
          value={formData.description}
          onChangeText={(v) => updateFormData('description', v)}
          multiline
          numberOfLines={3}
        />
        <EnhancedInput
          label="Logo (URL)"
          placeholder="https://..."
          value={formData.logo_url}
          onChangeText={(v) => updateFormData('logo_url', v)}
        />
      </FormSection>

      <FormSection title="Localisation">
        <EnhancedInput
          label="Adresse"
          placeholder="Adresse"
          value={formData.address}
          onChangeText={(v) => updateFormData('address', v)}
        />
        <EnhancedInput label="Ville" placeholder="Ville" value={formData.city} onChangeText={(v) => updateFormData('city', v)} />
        <EnhancedInput
          label="Code postal"
          placeholder="Code postal"
          value={formData.postal_code}
          onChangeText={(v) => updateFormData('postal_code', v)}
        />
        <EnhancedInput
          label="Département"
          placeholder="Département"
          value={formData.department}
          onChangeText={(v) => updateFormData('department', v)}
        />
        <EnhancedInput label="Région" placeholder="Région" value={formData.region} onChangeText={(v) => updateFormData('region', v)} />
        <EnhancedInput
          label="Pays"
          placeholder="France"
          value={formData.country}
          onChangeText={(v) => updateFormData('country', v)}
        />
      </FormSection>

      <FormSection title="Contact">
        <EnhancedInput
          label="Email"
          placeholder="contact@exemple.fr"
          value={formData.contact_email}
          onChangeText={(v) => updateFormData('contact_email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <EnhancedInput
          label="Téléphone"
          placeholder="Téléphone"
          value={formData.contact_phone}
          onChangeText={(v) => updateFormData('contact_phone', v)}
          keyboardType="phone-pad"
        />
        <EnhancedInput
          label="Site web"
          placeholder="https://..."
          value={formData.website_url}
          onChangeText={(v) => updateFormData('website_url', v)}
          keyboardType="url"
          autoCapitalize="none"
        />
      </FormSection>

      <FormSection title="Adhésion" description="Qui peut rejoindre la communauté">
        <DropdownSelector
          label="Politique d'adhésion"
          placeholder="Choisir"
          items={JOIN_POLICY_OPTIONS}
          selectedItems={JOIN_POLICY_OPTIONS.filter((o) => o.id === formData.join_policy)}
          onSelectionChange={(items) => updateFormData('join_policy', items[0]?.id ?? 'approval_required')}
        />
        <EnhancedInput
          label="Nombre max de membres (optionnel)"
          placeholder="Ex: 50"
          value={formData.max_members}
          onChangeText={(v) => updateFormData('max_members', v)}
          keyboardType="number-pad"
        />
        <EnhancedInput
          label="Message d'accueil / instructions"
          placeholder="Message affiché aux nouveaux membres"
          value={formData.join_message}
          onChangeText={(v) => updateFormData('join_message', v)}
          multiline
          numberOfLines={2}
        />
      </FormSection>
    </FormScreen>
  );
}
