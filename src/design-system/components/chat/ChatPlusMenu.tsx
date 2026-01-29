import React from 'react';
import { View, TouchableOpacity, Modal, Animated } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { Ionicons } from '@expo/vector-icons';

export type PlusAction = 
  | 'camera'
  | 'gallery-multiple'
  | 'location'
  | 'document'
  | 'task'
  | 'settings';

export interface ChatPlusMenuProps {
  visible: boolean;
  onClose: () => void;
  onActionSelect: (action: PlusAction) => void;
  position: { x: number; y: number };
  activeFarm?: {
    farm_name: string;
    farm_id: number;
  };
  currentUserId?: string;
}

export const ChatPlusMenu: React.FC<ChatPlusMenuProps> = ({
  visible,
  onClose,
  onActionSelect,
  position,
  activeFarm,
  currentUserId,
}) => {
  
  const menuItems = [
    {
      id: 'camera' as PlusAction,
      icon: 'camera' as const,
      title: 'Appareil Photo',
      subtitle: 'Prendre une photo',
      color: '#ef4444',
    },
    {
      id: 'gallery-multiple' as PlusAction,
      icon: 'images' as const,
      title: 'Photos',
      subtitle: 'Sélectionner images',
      color: '#8b5cf6',
    },
    {
      id: 'location' as PlusAction,
      icon: 'location' as const,
      title: 'Localisation',
      subtitle: 'Partager position',
      color: '#10b981',
    },
    {
      id: 'document' as PlusAction,
      icon: 'document-text' as const,
      title: 'Document',
      subtitle: 'Joindre fichier',
      color: '#f59e0b',
    },
    {
      id: 'task' as PlusAction,
      icon: 'checkmark-circle' as const,
      title: 'Tâche',
      subtitle: 'Créer/Planifier',
      color: '#3b82f6',
    },
    {
      id: 'settings' as PlusAction,
      icon: 'settings' as const,
      title: 'Paramètres',
      subtitle: 'Configuration',
      color: '#6b7280',
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Overlay */}
      <TouchableOpacity 
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          justifyContent: 'flex-end', // Aligner vers le bas
        }}
        activeOpacity={1} 
        onPress={onClose}
      >
        {/* Menu contextuel - Bottom Sheet Style */}
        <View 
          style={{
            marginHorizontal: 16,
            marginBottom: 20,
            backgroundColor: '#ffffff',
            borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 25,
            elevation: 10,
            overflow: 'hidden',
          }}
        >
          {/* En-tête avec handle */}
          <View style={{
            paddingTop: spacing.sm,
            paddingBottom: spacing.md,
            paddingHorizontal: spacing.md,
            alignItems: 'center',
          }}>
            {/* Handle de glissement */}
            <View style={{
              width: 40,
              height: 4,
              backgroundColor: colors.gray[300],
              borderRadius: 2,
              marginBottom: spacing.md,
            }} />
            
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: colors.gray[900],
              textAlign: 'center',
            }}>
              Actions rapides
            </Text>
            {activeFarm && (
              <Text style={{
                fontSize: 13,
                color: colors.gray[600],
                textAlign: 'center',
                marginTop: 4,
              }}>
                📍 {activeFarm.farm_name}
              </Text>
            )}
          </View>

          {/* Liste des actions en grille 2x3 */}
          <View style={{ 
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.lg,
          }}>
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.md,
            }}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={{
                    width: '47%', // 2 colonnes avec gap
                    aspectRatio: 1, // Carré
                    backgroundColor: colors.gray[50],
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border.primary,
                  }}
                  onPress={() => {
                    onActionSelect(item.id);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  {/* Icône colorée */}
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: item.color,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: spacing.sm,
                  }}>
                    <Ionicons name={item.icon} size={24} color="#ffffff" />
                  </View>

                  {/* Texte centré */}
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: colors.gray[900],
                    textAlign: 'center',
                    marginBottom: 2,
                  }}>
                    {item.title}
                  </Text>
                  <Text style={{
                    fontSize: 11,
                    color: colors.gray[600],
                    textAlign: 'center',
                  }}>
                    {item.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};