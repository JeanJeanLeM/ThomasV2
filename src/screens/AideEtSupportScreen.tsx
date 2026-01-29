import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { 
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  BookOpenIcon,
  VideoCameraIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon
} from '../design-system/icons';
import { Text } from '../design-system/components';

export default function AideEtSupportScreen() {
  const handleContactPress = (type: 'email' | 'phone') => {
    if (type === 'email') {
      Linking.openURL('mailto:support@thomas-app.com');
    } else if (type === 'phone') {
      Linking.openURL('tel:+33123456789');
    }
  };

  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  const supportOptions = [
    {
      id: 'faq',
      title: 'Questions fréquentes',
      subtitle: 'En cours de production',
      icon: <QuestionMarkCircleIcon color={colors.gray[400]} size={24} />,
      onPress: () => {},
      hasExternalLink: false,
      disabled: true
    },
    {
      id: 'tutorials',
      title: 'Tutoriels vidéo',
      subtitle: 'En cours de production',
      icon: <VideoCameraIcon color={colors.gray[400]} size={24} />,
      onPress: () => {},
      hasExternalLink: false,
      disabled: true
    },
    {
      id: 'documentation',
      title: 'Documentation',
      subtitle: 'En cours de production',
      icon: <BookOpenIcon color={colors.gray[400]} size={24} />,
      onPress: () => {},
      hasExternalLink: false,
      disabled: true
    },
    {
      id: 'chat',
      title: 'Chat en direct',
      subtitle: 'En cours de production',
      icon: <ChatBubbleLeftRightIcon color={colors.gray[400]} size={24} />,
      onPress: () => {},
      hasExternalLink: false,
      disabled: true
    }
  ];

  const contactMethods = [
    {
      id: 'email',
      title: 'Email',
      subtitle: 'En cours de production',
      description: 'Bientôt disponible',
      icon: <EnvelopeIcon color={colors.gray[400]} size={24} />,
      onPress: () => {},
      disabled: true
    },
    {
      id: 'phone',
      title: 'Téléphone',
      subtitle: 'En cours de production',
      description: 'Bientôt disponible',
      icon: <PhoneIcon color={colors.gray[400]} size={24} />,
      onPress: () => {},
      disabled: true
    }
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.headerIcon}>
              <QuestionMarkCircleIcon color={colors.primary[600]} size={32} />
            </View>
            <Text variant="h2" style={styles.headerTitle}>
              Aide et support
            </Text>
            <Text variant="body" style={styles.headerSubtitle}>
              Nous sommes là pour vous accompagner dans l'utilisation de Thomas
            </Text>
          </View>

          {/* Options d'aide */}
          <View style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Centre d'aide
            </Text>
            <View style={styles.optionsContainer}>
              {supportOptions.map((option) => (
                <View
                  key={option.id}
                  style={[styles.optionCard, option.disabled && styles.disabledCard]}
                >
                  <View style={styles.optionIcon}>
                    {option.icon}
                  </View>
                  
                  <View style={styles.optionContent}>
                    <View style={styles.optionHeader}>
                      <Text variant="h4" style={[styles.optionTitle, option.disabled && styles.disabledText]}>
                        {option.title}
                      </Text>
                    </View>
                    <Text variant="caption" style={[styles.optionSubtitle, option.disabled && styles.disabledText]}>
                      {option.subtitle}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Contact direct */}
          <View style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Nous contacter
            </Text>
            <View style={styles.contactContainer}>
              {contactMethods.map((method) => (
                <View
                  key={method.id}
                  style={[styles.contactCard, method.disabled && styles.disabledCard]}
                >
                  <View style={styles.contactIcon}>
                    {method.icon}
                  </View>
                  
                  <View style={styles.contactContent}>
                    <Text variant="h4" style={[styles.contactTitle, method.disabled && styles.disabledText]}>
                      {method.title}
                    </Text>
                    <Text variant="body" style={[styles.contactSubtitle, method.disabled && styles.disabledText]}>
                      {method.subtitle}
                    </Text>
                    <Text variant="caption" style={[styles.contactDescription, method.disabled && styles.disabledText]}>
                      {method.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Signaler un problème */}
          <View style={styles.section}>
            <View style={[styles.reportCard, styles.disabledCard]}>
              <View style={styles.reportIcon}>
                <ExclamationTriangleIcon color={colors.gray[400]} size={24} />
              </View>
              
              <View style={styles.reportContent}>
                <Text variant="h4" style={[styles.reportTitle, styles.disabledText]}>
                  Signaler un problème
                </Text>
                <Text variant="caption" style={[styles.reportSubtitle, styles.disabledText]}>
                  En cours de production
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footerSection}>
            <Text variant="caption" style={styles.footerText}>
              Notre équipe support est disponible du lundi au vendredi de 9h à 18h.
              Nous nous efforçons de répondre à toutes les demandes dans les plus brefs délais.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  // Header
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  // Options d'aide
  optionsContainer: {
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  optionTitle: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  optionSubtitle: {
    color: colors.text.secondary,
    lineHeight: 18,
  },
  // Contact
  contactContainer: {
    gap: spacing.md,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  contactSubtitle: {
    color: colors.primary[600],
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  contactDescription: {
    color: colors.text.secondary,
  },
  // Signaler un problème
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.semantic.error + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.semantic.error + '20',
    padding: spacing.lg,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.semantic.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    color: colors.semantic.error,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  reportSubtitle: {
    color: colors.text.secondary,
    lineHeight: 18,
  },
  // Footer
  footerSection: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Styles pour les éléments désactivés
  disabledCard: {
    opacity: 0.5,
    backgroundColor: colors.gray[50],
  },
  disabledText: {
    color: colors.gray[400],
  },
});
