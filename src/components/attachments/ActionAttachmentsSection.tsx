import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../design-system/components';
import { colors } from '../../design-system/colors';
import { spacing } from '../../design-system/spacing';
import { ActionAttachment, ActionAttachmentRecordType, ActionAttachmentService } from '../../services/ActionAttachmentService';
import { mediaService } from '../../services/MediaService';
import { locationService } from '../../services/LocationService';

interface ActionAttachmentsSectionProps {
  recordType: ActionAttachmentRecordType;
  recordId?: string | null | undefined;
  farmId?: number | null | undefined;
  userId?: string | null | undefined;
}

export const ActionAttachmentsSection: React.FC<ActionAttachmentsSectionProps> = ({
  recordType,
  recordId,
  farmId,
  userId,
}) => {
  const [attachments, setAttachments] = useState<ActionAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const canManage = !!recordId && !!farmId && !!userId;
  const imageAttachments = attachments.filter(item => item.attachment_type === 'image');
  const locationAttachments = attachments.filter(item => item.attachment_type === 'location');

  useEffect(() => {
    if (!recordId) {
      setAttachments([]);
      return;
    }
    loadAttachments();
  }, [recordType, recordId]);

  const loadAttachments = async () => {
    if (!recordId) return;
    setIsLoading(true);
    try {
      const data = recordType === 'task'
        ? await ActionAttachmentService.getForTask(recordId)
        : await ActionAttachmentService.getForObservation(recordId);
      setAttachments(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddImages = async (source: 'camera' | 'gallery') => {
    if (!canManage) return;
    setIsMutating(true);
    try {
      const mediaResults = source === 'camera'
        ? [await mediaService.takePhoto()].filter(Boolean)
        : await mediaService.pickMultipleFromGallery(5);

      const photos = mediaResults.map(result => mediaService.createAttachedPhoto(result!));
      if (photos.length === 0) return;

      await ActionAttachmentService.addImagesToRecord({
        recordType,
        recordId: recordId!,
        farmId: farmId!,
        userId: userId!,
        photos,
      });
      await loadAttachments();
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible d’ajouter les photos');
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddPhotoPress = () => {
    Alert.alert(
      'Ajouter une photo',
      'Choisissez une source',
      [
        { text: 'Appareil photo', onPress: () => handleAddImages('camera') },
        { text: 'Galerie', onPress: () => handleAddImages('gallery') },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const handleAddLocation = async () => {
    if (!canManage) return;
    setIsMutating(true);
    try {
      const location = await locationService.getCurrentLocation();
      if (!location) return;
      await ActionAttachmentService.addLocationToRecord({
        recordType,
        recordId: recordId!,
        farmId: farmId!,
        userId: userId!,
        location,
      });
      await loadAttachments();
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible d’ajouter la localisation');
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = (attachment: ActionAttachment) => {
    Alert.alert(
      'Supprimer la pièce jointe ?',
      'Elle disparaîtra de cette tâche/observation, mais le message chat historique reste inchangé.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setIsMutating(true);
            try {
              await ActionAttachmentService.softDeleteAttachment(attachment.id);
              setAttachments(prev => prev.filter(item => item.id !== attachment.id));
            } catch (error: any) {
              Alert.alert('Erreur', error?.message || 'Suppression impossible');
            } finally {
              setIsMutating(false);
            }
          },
        },
      ]
    );
  };

  const openLocation = (attachment: ActionAttachment) => {
    const url = attachment.maps_url || (
      attachment.latitude != null && attachment.longitude != null
        ? locationService.generateMapsUrl(attachment.latitude, attachment.longitude)
        : undefined
    );
    if (url) Linking.openURL(url);
  };

  return (
    <View style={{
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.gray[50],
      borderWidth: 1,
      borderColor: colors.border.secondary,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text variant="h3" style={{ color: colors.text.primary, fontSize: 18, fontWeight: '600' }}>
            Pièces jointes
          </Text>
          <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 2 }}>
            Photos et localisation liées à cette {recordType === 'task' ? 'tâche' : 'observation'}
          </Text>
        </View>
        {(isLoading || isMutating) && <ActivityIndicator size="small" color={colors.primary[500]} />}
      </View>

      {attachments.length === 0 && !isLoading && (
        <Text variant="body" style={{ color: colors.text.secondary }}>
          Aucune pièce jointe pour le moment.
        </Text>
      )}

      {imageAttachments.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {imageAttachments.map((attachment) => (
            <View key={attachment.id} style={{ width: 118 }}>
              <Image
                source={{ uri: attachment.public_url || '' }}
                style={{
                  width: 118,
                  height: 86,
                  borderRadius: 10,
                  backgroundColor: colors.gray[200],
                }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => handleDelete(attachment)}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: 'rgba(0, 0, 0, 0.55)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="trash-outline" size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {locationAttachments.map((attachment) => (
        <TouchableOpacity
          key={attachment.id}
          onPress={() => openLocation(attachment)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.sm,
            borderRadius: 10,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: colors.border.primary,
          }}
        >
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.warning[100] || '#fef3c7',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.sm,
          }}>
            <Ionicons name="location" size={16} color={colors.warning[600] || '#d97706'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" style={{ color: colors.text.primary }}>
              {attachment.address || 'Localisation'}
            </Text>
            <Text variant="caption" style={{ color: colors.text.secondary }}>
              {attachment.latitude?.toFixed(5)}, {attachment.longitude?.toFixed(5)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(attachment)} style={{ padding: spacing.xs }}>
            <Ionicons name="trash-outline" size={18} color={colors.semantic.error} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <TouchableOpacity
          disabled={!canManage || isMutating}
          onPress={handleAddPhotoPress}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            paddingVertical: spacing.sm,
            borderRadius: 10,
            backgroundColor: colors.primary[50],
            opacity: !canManage || isMutating ? 0.5 : 1,
          }}
        >
          <Ionicons name="image" size={16} color={colors.primary[600]} />
          <Text variant="label" style={{ color: colors.primary[700] }}>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!canManage || isMutating}
          onPress={handleAddLocation}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            paddingVertical: spacing.sm,
            borderRadius: 10,
            backgroundColor: colors.warning[50] || '#fffbeb',
            opacity: !canManage || isMutating ? 0.5 : 1,
          }}
        >
          <Ionicons name="location" size={16} color={colors.warning[600] || '#d97706'} />
          <Text variant="label" style={{ color: colors.warning[700] || '#b45309' }}>Localisation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
