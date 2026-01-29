import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../colors';
import { spacing } from '../../spacing';

export interface ChatAttachment {
  id: string;
  type: 'image' | 'document' | 'location' | 'task' | 'audio';
  name: string;
  uri?: string;
  data?: any;
  size?: number;
  uploadedUri?: string;
  uploaded?: boolean;
  transcription?: string; // Transcription du fichier audio (Whisper API)
}

interface AttachmentPreviewProps {
  attachments: ChatAttachment[];
  onRemoveAttachment: (id: string) => void;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachments,
  onRemoveAttachment,
}) => {
  if (attachments.length === 0) {
    return null;
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAttachmentIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'image': return 'image';
      case 'document': return 'document-text';
      case 'location': return 'location';
      case 'task': return 'checkmark-circle';
      case 'audio': return 'mic';
      default: return 'attach';
    }
  };

  const getAttachmentColor = (type: string): string => {
    switch (type) {
      case 'image': return colors.success[500];
      case 'document': return colors.primary[500];
      case 'location': return colors.warning[500];
      case 'task': return colors.semantic.info;
      case 'audio': return colors.secondary.purple;
      default: return colors.gray[500];
    }
  };

  return (
    <View style={{
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.gray[50],
      borderTopWidth: 1,
      borderTopColor: colors.border.primary,
    }}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {attachments.map((attachment) => (
          <View
            key={attachment.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              borderRadius: 8,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderWidth: 1,
              borderColor: colors.border.primary,
              maxWidth: 200,
              minWidth: 120,
            }}
          >
            {/* Icône ou miniature */}
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              backgroundColor: getAttachmentColor(attachment.type),
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing.xs,
            }}>
              {attachment.type === 'image' && attachment.uri ? (
                <Image
                  source={{ uri: attachment.uri }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name={getAttachmentIcon(attachment.type)}
                  size={16}
                  color="#ffffff"
                />
              )}
            </View>

            {/* Informations */}
            <View style={{ flex: 1, marginRight: spacing.xs }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.gray[900],
                }}
                numberOfLines={1}
              >
                {attachment.name}
              </Text>
              {attachment.size && (
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.gray[500],
                  }}
                >
                  {formatFileSize(attachment.size)}
                </Text>
              )}
            </View>

            {/* Bouton supprimer */}
            <TouchableOpacity
              onPress={() => onRemoveAttachment(attachment.id)}
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: colors.gray[200],
                justifyContent: 'center',
                alignItems: 'center',
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close"
                size={12}
                color={colors.gray[600]}
              />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Indicateur du nombre de pièces jointes */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.xs,
      }}>
        <Text style={{
          fontSize: 11,
          color: colors.gray[600],
        }}>
          {attachments.length} pièce{attachments.length > 1 ? 's' : ''} jointe{attachments.length > 1 ? 's' : ''}
        </Text>
        
        <Text style={{
          fontSize: 11,
          color: colors.gray[500],
        }}>
          Appuyez sur ✕ pour supprimer
        </Text>
      </View>
    </View>
  );
};