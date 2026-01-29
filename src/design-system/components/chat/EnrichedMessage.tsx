import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../Text';
import { MessageImageGallery } from './MessageImageGallery';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../colors';
import { spacing } from '../../spacing';

interface MessageAttachment {
  id: string;
  type: 'image' | 'document' | 'location' | 'task' | 'audio';
  name: string;
  uri?: string;
  data?: any;
  transcription?: string; // Pour les fichiers audio
  uploadedUri?: string; // URL publique pour les audios
}

interface EnrichedMessageProps {
  text: string;
  isUser: boolean;
  timestamp: Date;
  attachments?: MessageAttachment[];
}

export const EnrichedMessage: React.FC<EnrichedMessageProps> = ({
  text,
  isUser,
  timestamp,
  attachments = [],
}) => {
  // Séparer les images, audios et autres pièces jointes
  const imageAttachments = attachments.filter(att => att.type === 'image' && att.uri);
  const audioAttachments = attachments.filter(att => att.type === 'audio');
  const otherAttachments = attachments.filter(att => att.type !== 'image' && att.type !== 'audio');

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getAttachmentIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'document': return 'document-text';
      case 'location': return 'location';
      case 'task': return 'checkmark-circle';
      case 'audio': return 'mic';
      default: return 'attach';
    }
  };

  const getAttachmentColor = (type: string): string => {
    switch (type) {
      case 'document': return colors.primary[500];
      case 'location': return colors.warning[500];
      case 'task': return colors.info[500];
      case 'audio': return colors.secondary?.purple || colors.primary[500];
      default: return colors.gray[500];
    }
  };

  return (
    <View style={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '80%',
      marginBottom: spacing.sm,
    }}>
      {/* Bulle de message */}
      <View style={{
        backgroundColor: isUser ? colors.primary[500] : '#ffffff',
        borderRadius: 16,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: isUser ? 0 : 1,
        borderColor: colors.border.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
      }}>
        {/* Texte du message */}
        {text.trim() && (
          <Text style={{
            fontSize: 16,
            color: isUser ? '#ffffff' : colors.gray[900],
            lineHeight: 22,
          }}>
            {text}
          </Text>
        )}

        {/* Galerie d'images */}
        {imageAttachments.length > 0 && (
          <MessageImageGallery
            images={imageAttachments.map(att => ({
              uri: att.uploadedUri || att.uri!, // Utiliser l'URI uploadée si disponible, sinon l'URI locale
              name: att.name,
            }))}
          />
        )}

        {/* Audio avec transcription */}
        {audioAttachments.length > 0 && (
          <View style={{
            marginTop: text.trim() || imageAttachments.length > 0 ? spacing.sm : 0,
            gap: spacing.xs,
          }}>
            {audioAttachments.map((attachment) => (
              <View
                key={attachment.id}
                style={{
                  backgroundColor: isUser ? 'rgba(255, 255, 255, 0.2)' : colors.gray[50],
                  borderRadius: 8,
                  padding: spacing.sm,
                }}
              >
                {/* En-tête audio */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: attachment.transcription ? spacing.xs : 0,
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: getAttachmentColor('audio'),
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: spacing.xs,
                  }}>
                    <Ionicons
                      name="mic"
                      size={12}
                      color="#ffffff"
                    />
                  </View>
                  
                  <Text style={{
                    fontSize: 14,
                    color: isUser ? '#ffffff' : colors.gray[700],
                    flex: 1,
                    fontWeight: '600',
                  }}>
                    Message vocal
                  </Text>

                  <Ionicons
                    name="play-circle"
                    size={20}
                    color={isUser ? '#ffffff' : colors.primary[500]}
                  />
                </View>

                {/* Transcription */}
                {attachment.transcription && (
                  <View style={{
                    marginTop: spacing.xs,
                    paddingTop: spacing.xs,
                    borderTopWidth: 1,
                    borderTopColor: isUser ? 'rgba(255, 255, 255, 0.2)' : colors.gray[200],
                  }}>
                    <Text style={{
                      fontSize: 12,
                      color: isUser ? 'rgba(255, 255, 255, 0.8)' : colors.gray[600],
                      fontStyle: 'italic',
                    }}>
                      📝 {attachment.transcription}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Autres pièces jointes */}
        {otherAttachments.length > 0 && (
          <View style={{
            marginTop: text.trim() || imageAttachments.length > 0 ? spacing.sm : 0,
            gap: spacing.xs,
          }}>
            {otherAttachments.map((attachment) => (
              <TouchableOpacity
                key={attachment.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isUser ? 'rgba(255, 255, 255, 0.2)' : colors.gray[50],
                  borderRadius: 8,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                }}
              >
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: getAttachmentColor(attachment.type),
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: spacing.xs,
                }}>
                  <Ionicons
                    name={getAttachmentIcon(attachment.type)}
                    size={12}
                    color="#ffffff"
                  />
                </View>
                
                <Text style={{
                  fontSize: 14,
                  color: isUser ? '#ffffff' : colors.gray[700],
                  flex: 1,
                }}>
                  {attachment.name}
                </Text>

                {attachment.type === 'location' && (
                  <Ionicons
                    name="open-outline"
                    size={14}
                    color={isUser ? '#ffffff' : colors.gray[500]}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Timestamp */}
      <Text style={{
        fontSize: 12,
        color: colors.gray[500],
        marginTop: 2,
        textAlign: isUser ? 'right' : 'left',
        marginHorizontal: spacing.xs,
      }}>
        {formatTime(timestamp)}
      </Text>
    </View>
  );
};