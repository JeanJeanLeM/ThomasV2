import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';

export interface ProfileData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profession?: string;
  bio?: string;
  avatar?: string;
}

export interface ProfileEditModalProps {
  visible: boolean;
  profile?: ProfileData;
  onClose: () => void;
  onSave: (profile: ProfileData) => void;
  loading?: boolean;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  visible,
  profile,
  onClose,
  onSave,
  loading = false,
}) => {
  const [formData, setFormData] = useState<Partial<ProfileData>>({});

  // Initialiser le formulaire avec les données du profil
  useEffect(() => {
    if (profile) {
      setFormData({
        ...profile,
      });
    } else {
      // Nouveau profil
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        profession: '',
        bio: '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!formData.firstName?.trim()) {
      Alert.alert('Erreur', 'Le prénom est obligatoire');
      return;
    }

    if (!formData.lastName?.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }

    if (!formData.email?.trim()) {
      Alert.alert('Erreur', 'L\'email est obligatoire');
      return;
    }

    // Validation email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      Alert.alert('Erreur', 'Veuillez entrer un email valide');
      return;
    }

    try {
      const profileToSave: ProfileData = {
        ...(profile?.id && { id: profile.id }),
        firstName: formData.firstName!.trim(),
        lastName: formData.lastName!.trim(),
        email: formData.email!.trim(),
        ...(formData.phone?.trim() && { phone: formData.phone.trim() }),
        ...(formData.profession?.trim() && { profession: formData.profession.trim() }),
        ...(formData.bio?.trim() && { bio: formData.bio.trim() }),
        ...(formData.avatar && { avatar: formData.avatar }),
      };

      await onSave(profileToSave);
      onClose();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    }
  };

  const updateFormData = (field: keyof ProfileData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getInitials = () => {
    const first = formData.firstName?.charAt(0)?.toUpperCase() || '';
    const last = formData.lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || 'U';
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Modifier le profil"
      size="fullscreen"
      primaryAction={{
        title: 'Sauvegarder',
        onPress: handleSave,
        loading: loading,
        disabled: loading || !formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email?.trim(),
      }}
      secondaryAction={{
        title: 'Annuler',
        onPress: onClose,
      }}
    >
      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={{ gap: spacing.lg }}>
          
          {/* Bannière profil */}
          <View style={{
            backgroundColor: colors.primary[50],
            borderRadius: 8,
            padding: spacing.md,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary[600],
          }}>
            <Text variant="body" style={{ 
              color: colors.primary[700],
              fontWeight: '600'
            }}>
              Profil : {getInitials()} - {formData.firstName} {formData.lastName}
            </Text>
          </View>

          {/* Avatar et photo */}
          <View style={{
            alignItems: 'center',
            paddingVertical: spacing.md,
          }}>
            <View style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.primary[600],
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}>
              <Text 
                variant="h1" 
                style={{ 
                  color: '#ffffff', 
                  fontWeight: '700',
                  fontSize: 32,
                }}
              >
                {getInitials()}
              </Text>
            </View>
            
            <TouchableOpacity
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
                borderRadius: 999,
                backgroundColor: colors.primary[50],
              }}
              activeOpacity={0.7}
              onPress={() => {
                // TODO: implémenter upload photo de profil
                Alert.alert('Info', 'Fonctionnalité à venir');
              }}
            >
              <Text variant="button" style={{ color: colors.primary[600] }}>
                Changer la photo
              </Text>
            </TouchableOpacity>
          </View>

          {/* Section Informations générales */}
          <View>
            <Text variant="h3" style={{ 
              color: colors.text.primary,
              marginBottom: spacing.md,
              fontSize: 18,
              fontWeight: '600'
            }}>
              Informations générales
            </Text>

            {/* Description */}
            <Text 
              variant="body" 
              style={{ 
                color: colors.text.secondary,
                marginBottom: spacing.lg,
              }}
            >
              Mettez à jour vos informations de compte. Ces informations seront utilisées dans l'application et sur vos documents.
            </Text>

            {/* Prénom et Nom */}
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Prénom"
                  placeholder="Votre prénom"
                  value={formData.firstName || ''}
                  onChangeText={(value) => updateFormData('firstName', value)}
                  required
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Nom"
                  placeholder="Votre nom"
                  value={formData.lastName || ''}
                  onChangeText={(value) => updateFormData('lastName', value)}
                  required
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <Input
              label="Email"
              placeholder="votre.email@exemple.com"
              value={formData.email || ''}
              onChangeText={(value) => updateFormData('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              required
            />
          </View>

          {/* Section Contact */}
          <View>
            <Text variant="h3" style={{ 
              color: colors.text.primary,
              marginBottom: spacing.md,
              fontSize: 18,
              fontWeight: '600'
            }}>
              Contact
            </Text>

            {/* Téléphone */}
            <Input
              label="Téléphone"
              placeholder="+33 6 12 34 56 78"
              value={formData.phone || ''}
              onChangeText={(value) => updateFormData('phone', value)}
              keyboardType="phone-pad"
            />

            {/* Profession */}
            <Input
              label="Profession"
              placeholder="Votre profession"
              value={formData.profession || ''}
              onChangeText={(value) => updateFormData('profession', value)}
            />

            {/* Bio */}
            <Input
              label="Bio"
              placeholder="Parlez-nous de vous..."
              value={formData.bio || ''}
              onChangeText={(value) => updateFormData('bio', value)}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
};
