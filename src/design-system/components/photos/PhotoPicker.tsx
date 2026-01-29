import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text } from '../Text';
import { Button } from '../Button';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { Ionicons } from '@expo/vector-icons';
import { mediaService, AttachedPhoto, MediaResult } from '../../../services/MediaService';

export interface PhotoPickerProps {
  photos: AttachedPhoto[];
  onPhotosChange: (photos: AttachedPhoto[]) => void;
  maxPhotos?: number;
  style?: any;
}

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  style,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleTakePhoto = async () => {
    try {
      setIsLoading(true);
      const mediaResult = await mediaService.takePhoto();
      
      if (mediaResult) {
        const newPhoto = mediaService.createAttachedPhoto(mediaResult);
        const updatedPhotos = [...photos, newPhoto];
        onPhotosChange(updatedPhotos);
      }
    } catch (error) {
      console.error('Erreur prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      setIsLoading(true);
      const remainingSlots = maxPhotos - photos.length;
      
      if (remainingSlots <= 0) {
        Alert.alert('Limite atteinte', `Vous ne pouvez ajouter que ${maxPhotos} photos maximum.`);
        return;
      }

      const mediaResults = await mediaService.pickMultipleFromGallery(remainingSlots);
      
      if (mediaResults.length > 0) {
        const newPhotos = mediaResults.map(result => mediaService.createAttachedPhoto(result));
        const updatedPhotos = [...photos, ...newPhotos];
        onPhotosChange(updatedPhotos);
      }
    } catch (error) {
      console.error('Erreur sélection galerie:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner les photos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const updatedPhotos = photos.filter(photo => photo.id !== photoId);
            onPhotosChange(updatedPhotos);
          },
        },
      ]
    );
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <View style={[{ gap: spacing.md }, style]}>
      
      {/* En-tête avec compteur */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="label">Photos</Text>
        <Text style={{ fontSize: 12, color: colors.gray[500] }}>
          {photos.length}/{maxPhotos}
        </Text>
      </View>

      {/* Boutons d'ajout */}
      {canAddMore && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            title="📷 Appareil Photo"
            variant="outline"
            size="sm"
            onPress={handleTakePhoto}
            loading={isLoading}
            style={{ flex: 1 }}
          />
          <Button
            title="🖼️ Galerie"
            variant="outline"
            size="sm"
            onPress={handlePickFromGallery}
            loading={isLoading}
            style={{ flex: 1 }}
          />
        </View>
      )}

      {/* Grille des photos */}
      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {photos.map((photo) => (
            <View
              key={photo.id}
              style={{
                position: 'relative',
                width: 80,
                height: 80,
                borderRadius: 8,
                overflow: 'hidden',
                backgroundColor: colors.gray[100],
              }}
            >
              {/* Image */}
              <Image
                source={{ uri: photo.uri }}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="cover"
              />

              {/* Indicateur d'upload */}
              {!photo.isUploaded && (
                <View style={{
                  position: 'absolute',
                  bottom: 2,
                  left: 2,
                  backgroundColor: colors.warning[500],
                  borderRadius: 8,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                }}>
                  <Text style={{
                    fontSize: 8,
                    color: '#ffffff',
                    fontWeight: '600',
                  }}>
                    LOCAL
                  </Text>
                </View>
              )}

              {photo.isUploaded && (
                <View style={{
                  position: 'absolute',
                  bottom: 2,
                  left: 2,
                  backgroundColor: colors.success[500],
                  borderRadius: 8,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                }}>
                  <Text style={{
                    fontSize: 8,
                    color: '#ffffff',
                    fontWeight: '600',
                  }}>
                    ✓
                  </Text>
                </View>
              )}

              {/* Bouton de suppression */}
              <TouchableOpacity
                onPress={() => handleRemovePhoto(photo.id)}
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  backgroundColor: colors.error[500],
                  borderRadius: 12,
                  width: 20,
                  height: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="close" size={12} color="#ffffff" />
              </TouchableOpacity>

              {/* Overlay pour les infos */}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  paddingVertical: 2,
                  paddingHorizontal: 4,
                }}
                onPress={() => {
                  Alert.alert(
                    'Informations de la photo',
                    `Nom: ${photo.fileName}\n` +
                    `Taille: ${mediaService.formatFileSize(photo.fileSize)}\n` +
                    `Dimensions: ${photo.width}x${photo.height}\n` +
                    `Statut: ${photo.isUploaded ? 'Uploadée' : 'Locale'}`,
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={{
                  fontSize: 8,
                  color: '#ffffff',
                  textAlign: 'center',
                }} numberOfLines={1}>
                  {photo.fileName}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Message d'aide */}
      {photos.length === 0 && (
        <View style={{
          padding: spacing.lg,
          backgroundColor: colors.gray[50],
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.gray[200],
          borderStyle: 'dashed',
          alignItems: 'center',
        }}>
          <Ionicons name="camera-outline" size={32} color={colors.gray[400]} />
          <Text style={{
            marginTop: spacing.sm,
            fontSize: 14,
            color: colors.gray[600],
            textAlign: 'center',
          }}>
            Ajoutez des photos pour documenter cette tâche
          </Text>
          <Text style={{
            marginTop: spacing.xs,
            fontSize: 12,
            color: colors.gray[500],
            textAlign: 'center',
          }}>
            Jusqu'à {maxPhotos} photos
          </Text>
        </View>
      )}

      {/* Limite atteinte */}
      {!canAddMore && photos.length > 0 && (
        <View style={{
          padding: spacing.sm,
          backgroundColor: colors.warning[50],
          borderRadius: 6,
          borderWidth: 1,
          borderColor: colors.warning[200],
        }}>
          <Text style={{
            fontSize: 12,
            color: colors.warning[700],
            textAlign: 'center',
          }}>
            Limite de {maxPhotos} photos atteinte
          </Text>
        </View>
      )}
    </View>
  );
};