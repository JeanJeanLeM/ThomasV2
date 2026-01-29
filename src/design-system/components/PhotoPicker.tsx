import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from './Text';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { CameraIcon, ImageIcon, TrashIcon } from '../icons';

interface PhotoPickerProps {
  value?: string | null;
  onImageSelected: (uri: string | null) => void;
  label?: string;
  hint?: string;
  placeholder?: string;
}

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  value,
  onImageSelected,
  label = "Photo",
  hint,
  placeholder = "Ajouter une photo",
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Demander les permissions
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      // Permission pour la galerie
      const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (galleryStatus !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre permission pour accéder à vos photos.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Permission pour la caméra
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre permission pour utiliser la caméra.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  // Ouvrir la galerie
  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Format paysage pour les fermes
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    } finally {
      setIsLoading(false);
    }
  };

  // Ouvrir la caméra
  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9], // Format paysage pour les fermes
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur prise photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    } finally {
      setIsLoading(false);
    }
  };

  // Supprimer la photo
  const removePhoto = () => {
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => onImageSelected(null) },
      ]
    );
  };

  // Afficher les options
  const showOptions = () => {
    Alert.alert(
      'Ajouter une photo',
      'Choisissez une option',
      [
        { text: 'Galerie', onPress: pickImageFromGallery },
        { text: 'Caméra', onPress: takePhoto },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {/* Label */}
      {label && (
        <Text variant="label" color={colors.text.primary} style={{ marginBottom: spacing.sm }}>
          {label}
        </Text>
      )}

      {/* Photo ou placeholder */}
      <TouchableOpacity
        onPress={value ? undefined : showOptions}
        disabled={isLoading}
        style={{
          borderWidth: 2,
          borderColor: value ? colors.primary[200] : colors.gray[300],
          borderStyle: value ? 'solid' : 'dashed',
          borderRadius: 12,
          backgroundColor: value ? colors.background.primary : colors.gray[50],
          minHeight: 120,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {value ? (
          // Image sélectionnée
          <View style={{ width: '100%', height: 120, position: 'relative' }}>
            <Image
              source={{ uri: value }}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 10,
              }}
              resizeMode="cover"
            />
            
            {/* Overlay avec actions */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
              gap: spacing.md,
            }}>
              <TouchableOpacity
                onPress={showOptions}
                style={{
                  backgroundColor: colors.primary[600],
                  padding: spacing.sm,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <CameraIcon size={16} color={colors.text.inverse} />
                <Text variant="caption" color={colors.text.inverse} weight="medium">
                  Changer
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={removePhoto}
                style={{
                  backgroundColor: colors.semantic.error,
                  padding: spacing.sm,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <TrashIcon size={16} color={colors.text.inverse} />
                <Text variant="caption" color={colors.text.inverse} weight="medium">
                  Supprimer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Placeholder
          <View style={{ alignItems: 'center', padding: spacing.lg }}>
            <ImageIcon size={32} color={colors.gray[400]} />
            <Text variant="body" color={colors.text.secondary} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
              {isLoading ? 'Chargement...' : placeholder}
            </Text>
            <Text variant="caption" color={colors.gray[500]} style={{ marginTop: spacing.xs, textAlign: 'center' }}>
              Appuyez pour ajouter une photo
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Hint */}
      {hint && (
        <Text variant="caption" color={colors.text.secondary} style={{ marginTop: spacing.xs }}>
          {hint}
        </Text>
      )}
    </View>
  );
};
