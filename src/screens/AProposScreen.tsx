import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { 
  InformationCircleIcon,
  HeartIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  StarIcon,
  ArrowTopRightOnSquareIcon,
  UserGroupIcon,
  CodeBracketIcon
} from '../design-system/icons';
import { Text } from '../design-system/components';
import { getAppVersionInfo } from '../services/AppVersionService';

export default function AProposScreen() {
  const appVersionInfo = getAppVersionInfo();
  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  const appInfo = {
    name: 'Thomas - Assistant Agricole',
    version: appVersionInfo.appVersion,
    build: appVersionInfo.buildVersion || 'N/A',
    description: 'Votre compagnon numérique pour une agriculture moderne et efficace'
  };

  const legalLinks = [
    {
      id: 'terms',
      title: 'Conditions d\'utilisation',
      subtitle: 'En cours de production',
      icon: <DocumentTextIcon color={colors.gray[400]} size={24} />,
      onPress: () => {},
      disabled: true
    },
    {
      id: 'privacy',
      title: 'Politique de confidentialité',
      subtitle: 'En cours de production',
      icon: <ShieldCheckIcon color={colors.gray[400]} size={24} />,
      onPress: () => {},
      disabled: true
    },
    {
      id: 'licenses',
      title: 'Licences open source',
      subtitle: 'En cours de production',
      icon: <CodeBracketIcon color={colors.gray[400]} size={24} />,
      onPress: () => {},
      disabled: true
    }
  ];

  const teamInfo = [
    {
      id: 'mission',
      title: 'Notre mission',
      description: 'Simplifier le quotidien des agriculteurs grâce à la technologie et l\'intelligence artificielle.',
      icon: <HeartIcon color={colors.semantic.error} size={24} />
    },
    {
      id: 'team',
      title: 'L\'équipe',
      description: 'Une équipe passionnée d\'ingénieurs, designers et experts agricoles unis pour révolutionner l\'agriculture.',
      icon: <UserGroupIcon color={colors.primary[600]} size={24} />
    },
    {
      id: 'values',
      title: 'Nos valeurs',
      description: 'Innovation, simplicité, respect de l\'environnement et accompagnement des agriculteurs.',
      icon: <StarIcon color={colors.semantic.warning} size={24} />
    }
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header avec logo et infos app */}
          <View style={styles.headerSection}>
            <View style={styles.appIcon}>
              <Text style={styles.appIconText}>T</Text>
            </View>
            <Text variant="h2" style={styles.appName}>
              {appInfo.name}
            </Text>
            <Text variant="body" style={styles.appDescription}>
              {appInfo.description}
            </Text>
            
            <View style={styles.versionContainer}>
              <View style={styles.versionItem}>
                <Text variant="caption" style={styles.versionLabel}>Version</Text>
                <Text variant="body" style={styles.versionValue}>{appInfo.version}</Text>
              </View>
              <View style={styles.versionDivider} />
              <View style={styles.versionItem}>
                <Text variant="caption" style={styles.versionLabel}>Build</Text>
                <Text variant="body" style={styles.versionValue}>{appInfo.build}</Text>
              </View>
            </View>
            {!!appVersionInfo.updateId && (
              <Text variant="caption" style={styles.footerSubtext}>
                Update OTA: {appVersionInfo.updateId}
              </Text>
            )}
          </View>

          {/* À propos de nous */}
          <View style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              À propos de nous
            </Text>
            <View style={styles.teamContainer}>
              {teamInfo.map((item) => (
                <View key={item.id} style={styles.teamCard}>
                  <View style={styles.teamIcon}>
                    {item.icon}
                  </View>
                  <View style={styles.teamContent}>
                    <Text variant="h4" style={styles.teamTitle}>
                      {item.title}
                    </Text>
                    <Text variant="body" style={styles.teamDescription}>
                      {item.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Informations légales */}
          <View style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Informations légales
            </Text>
            <View style={styles.legalContainer}>
              {legalLinks.map((link) => (
                <View
                  key={link.id}
                  style={[styles.legalCard, link.disabled && styles.disabledCard]}
                >
                  <View style={styles.legalIcon}>
                    {link.icon}
                  </View>
                  
                  <View style={styles.legalContent}>
                    <Text variant="h4" style={[styles.legalTitle, link.disabled && styles.disabledText]}>
                      {link.title}
                    </Text>
                    <Text variant="caption" style={[styles.legalSubtitle, link.disabled && styles.disabledText]}>
                      {link.subtitle}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Remerciements */}
          <View style={styles.section}>
            <View style={styles.thanksCard}>
              <View style={styles.thanksIcon}>
                <HeartIcon color={colors.semantic.error} size={32} />
              </View>
              <Text variant="h3" style={styles.thanksTitle}>
                Merci !
              </Text>
              <Text variant="body" style={styles.thanksDescription}>
                Merci de faire confiance à Thomas pour accompagner votre activité agricole. 
                Votre feedback nous aide à améliorer continuellement l'application.
              </Text>
              
              <View style={[styles.feedbackButton, styles.disabledButton]}>
                <Text style={[styles.feedbackButtonText, styles.disabledButtonText]}>
                  En cours de production
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footerSection}>
            <Text variant="caption" style={styles.footerText}>
              © 2024 Thomas App. Tous droits réservés.
            </Text>
            <Text variant="caption" style={styles.footerSubtext}>
              Développé avec ❤️ pour les agriculteurs
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
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  appIconText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.background.secondary,
  },
  appName: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  appDescription: {
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: spacing.md,
  },
  versionItem: {
    alignItems: 'center',
    flex: 1,
  },
  versionDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.gray[200],
    marginHorizontal: spacing.md,
  },
  versionLabel: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  versionValue: {
    color: colors.text.primary,
    fontWeight: '600',
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
  // À propos de nous
  teamContainer: {
    gap: spacing.md,
  },
  teamCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  teamContent: {
    flex: 1,
  },
  teamTitle: {
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  teamDescription: {
    color: colors.text.secondary,
    lineHeight: 20,
  },
  // Informations légales
  legalContainer: {
    gap: spacing.sm,
  },
  legalCard: {
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
  legalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  legalContent: {
    flex: 1,
  },
  legalTitle: {
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  legalSubtitle: {
    color: colors.text.secondary,
    lineHeight: 18,
  },
  // Remerciements
  thanksCard: {
    backgroundColor: colors.primary[50],
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  thanksIcon: {
    marginBottom: spacing.md,
  },
  thanksTitle: {
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  thanksDescription: {
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  feedbackButtonText: {
    color: colors.background.secondary,
    fontWeight: '600',
    fontSize: 16,
  },
  // Footer
  footerSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  footerSubtext: {
    color: colors.text.secondary,
  },
  // Styles pour les éléments désactivés
  disabledCard: {
    opacity: 0.5,
    backgroundColor: colors.gray[50],
  },
  disabledText: {
    color: colors.gray[400],
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: colors.gray[300],
  },
  disabledButtonText: {
    color: colors.gray[500],
  },
});
