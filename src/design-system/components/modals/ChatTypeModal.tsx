import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { Text } from '../Text';
import { Button } from '../Button';

export interface ChatTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onCreatePrivateChat: () => void;
  onCreateSharedChat: () => void;
  onCreateOnboardingChat: () => void;
}

export const ChatTypeModal: React.FC<ChatTypeModalProps> = ({
  visible,
  onClose,
  onCreatePrivateChat,
  onCreateSharedChat,
  onCreateOnboardingChat,
}) => {
  const handlePrivateChat = () => {
    onCreatePrivateChat();
    onClose();
  };

  const handleSharedChat = () => {
    onCreateSharedChat();
    onClose();
  };

  const handleOnboardingChat = () => {
    onCreateOnboardingChat();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="chatbubbles" size={20} color="#366603" />
                  </View>
                  <Text variant="h3" style={styles.title}>
                    Nouveau chat
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={styles.content}>
                <Text variant="body" color={colors.text.secondary} style={styles.message}>
                  Quel type de conversation souhaitez-vous créer ?
                </Text>
              </View>

              {/* Chat Type Options */}
              <View style={styles.options}>
                <TouchableOpacity 
                  style={styles.optionCard}
                  onPress={handlePrivateChat}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons name="person" size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text variant="h4" style={styles.optionTitle}>
                      Chat privé
                    </Text>
                    <Text variant="caption" color={colors.text.secondary}>
                      Conversation personnelle visible par vous uniquement
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.optionCard}
                  onPress={handleSharedChat}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIcon, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="people" size={24} color="#f59e0b" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text variant="h4" style={styles.optionTitle}>
                      Chat partagé
                    </Text>
                    <Text variant="caption" color={colors.text.secondary}>
                      Conversation visible par tous les membres de la ferme
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={handleOnboardingChat}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIcon, { backgroundColor: '#ede9fe' }]}>
                    <Ionicons name="rocket" size={24} color="#7c3aed" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text variant="h4" style={styles.optionTitle}>
                      Chat onboarding
                    </Text>
                    <Text variant="caption" color={colors.text.secondary}>
                      Crée un chat partagé avec un message de démarrage en 1 clic
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <Button
                  title="Annuler"
                  variant="outline"
                  onPress={onClose}
                  style={styles.cancelButton}
                />
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text.primary,
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  message: {
    lineHeight: 22,
  },
  options: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: colors.text.primary,
    marginBottom: 2,
  },
  actions: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  cancelButton: {
    width: '100%',
  },
});


