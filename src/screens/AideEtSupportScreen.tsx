import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import {
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '../design-system/icons';
import { Text } from '../design-system/components';
import { FAQ_CHAPTERS, type FaqChapter } from '../constants/onboarding';
import InterfaceTourTarget from '../components/interface-tour/InterfaceTourTarget';

interface AideEtSupportScreenProps {
  onStartTutorial?: () => void;
  onStartInterfaceTour?: () => void;
}

export default function AideEtSupportScreen({
  onStartTutorial,
  onStartInterfaceTour,
}: AideEtSupportScreenProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

          {/* Bouton tutoriel */}
          <View style={styles.section}>
            <InterfaceTourTarget targetId="help.shortcut.interface">
              <TouchableOpacity
                style={styles.tutorialCard}
                onPress={onStartInterfaceTour}
                activeOpacity={0.8}
              >
                <View style={styles.tutorialIconContainer}>
                  <Text style={styles.tutorialEmoji}>🧭</Text>
                </View>
                <View style={styles.tutorialContent}>
                  <Text variant="h4" style={styles.tutorialTitle}>
                    Presentation de l interface
                  </Text>
                  <Text variant="caption" style={styles.tutorialSubtitle}>
                    Relancer la visite guidee des 4 onglets
                  </Text>
                </View>
                <ChevronRightIcon color={colors.primary[600]} size={20} />
              </TouchableOpacity>
            </InterfaceTourTarget>

            <TouchableOpacity
              style={styles.tutorialCard}
              onPress={onStartTutorial}
              activeOpacity={0.8}
            >
              <View style={styles.tutorialIconContainer}>
                <Text style={styles.tutorialEmoji}>🎓</Text>
              </View>
              <View style={styles.tutorialContent}>
                <Text variant="h4" style={styles.tutorialTitle}>
                  Tutoriel d'utilisation
                </Text>
                <Text variant="caption" style={styles.tutorialSubtitle}>
                  Relancer le guide pas à pas (3 étapes)
                </Text>
              </View>
              <ChevronRightIcon color={colors.primary[600]} size={20} />
            </TouchableOpacity>
          </View>

          {/* FAQ chapitrée */}
          <View style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Questions fréquentes
            </Text>
            <View style={styles.chaptersContainer}>
              {FAQ_CHAPTERS.map((chapter: FaqChapter) => {
                const isChapterOpen = expandedChapters.has(chapter.id);
                return (
                  <View key={chapter.id} style={styles.chapterCard}>
                    {/* En-tête du chapitre */}
                    <TouchableOpacity
                      style={styles.chapterHeader}
                      onPress={() => toggleChapter(chapter.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.chapterHeaderLeft}>
                        <Text style={styles.chapterEmoji}>{chapter.icon}</Text>
                        <Text variant="h4" style={styles.chapterTitle}>
                          {chapter.title}
                        </Text>
                      </View>
                      {isChapterOpen ? (
                        <ChevronDownIcon color={colors.primary[600]} size={20} />
                      ) : (
                        <ChevronRightIcon color={colors.gray[400]} size={20} />
                      )}
                    </TouchableOpacity>

                    {/* Sous-points du chapitre */}
                    {isChapterOpen && (
                      <View style={styles.subPointsList}>
                        {chapter.subPoints.map((point, index) => {
                          const isQuestionOpen = expandedQuestions.has(point.id);
                          return (
                            <View
                              key={point.id}
                              style={[
                                styles.questionItem,
                                index < chapter.subPoints.length - 1 && styles.questionItemBorder,
                              ]}
                            >
                              <TouchableOpacity
                                style={styles.questionRow}
                                onPress={() => toggleQuestion(point.id)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.questionBullet} />
                                <Text variant="body" style={styles.questionText}>
                                  {point.question}
                                </Text>
                                {isQuestionOpen ? (
                                  <ChevronDownIcon color={colors.primary[500]} size={16} />
                                ) : (
                                  <ChevronRightIcon color={colors.gray[400]} size={16} />
                                )}
                              </TouchableOpacity>
                              {isQuestionOpen && (
                                <View style={styles.answerContainer}>
                                  <Text variant="body" style={styles.answerText}>
                                    {point.answer}
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Contact direct */}
          <View style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Nous contacter
            </Text>
            <View style={styles.contactContainer}>
              <View style={[styles.contactCard, styles.disabledCard]}>
                <View style={styles.contactIcon}>
                  <EnvelopeIcon color={colors.gray[400]} size={24} />
                </View>
                <View style={styles.contactContent}>
                  <Text variant="h4" style={[styles.contactTitle, styles.disabledText]}>
                    Email
                  </Text>
                  <Text variant="caption" style={[styles.contactDescription, styles.disabledText]}>
                    Bientôt disponible
                  </Text>
                </View>
              </View>

              <View style={[styles.contactCard, styles.disabledCard]}>
                <View style={styles.contactIcon}>
                  <PhoneIcon color={colors.gray[400]} size={24} />
                </View>
                <View style={styles.contactContent}>
                  <Text variant="h4" style={[styles.contactTitle, styles.disabledText]}>
                    Téléphone
                  </Text>
                  <Text variant="caption" style={[styles.contactDescription, styles.disabledText]}>
                    Bientôt disponible
                  </Text>
                </View>
              </View>

              <View style={[styles.contactCard, styles.disabledCard]}>
                <View style={styles.contactIcon}>
                  <ChatBubbleLeftRightIcon color={colors.gray[400]} size={24} />
                </View>
                <View style={styles.contactContent}>
                  <Text variant="h4" style={[styles.contactTitle, styles.disabledText]}>
                    Chat en direct
                  </Text>
                  <Text variant="caption" style={[styles.contactDescription, styles.disabledText]}>
                    Bientôt disponible
                  </Text>
                </View>
              </View>
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
  // Tutoriel card
  tutorialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primary[200],
  },
  tutorialIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  tutorialEmoji: {
    fontSize: 24,
  },
  tutorialContent: {
    flex: 1,
  },
  tutorialTitle: {
    color: colors.primary[700],
    fontWeight: '600',
    marginBottom: 2,
  },
  tutorialSubtitle: {
    color: colors.primary[600],
  },
  // Chapitres FAQ
  chaptersContainer: {
    gap: spacing.sm,
  },
  chapterCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  chapterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  chapterEmoji: {
    fontSize: 20,
  },
  chapterTitle: {
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  subPointsList: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  questionItem: {
    paddingVertical: spacing.sm,
  },
  questionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  questionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[400],
    flexShrink: 0,
  },
  questionText: {
    flex: 1,
    color: colors.text.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  answerContainer: {
    marginTop: spacing.sm,
    marginLeft: spacing.lg + spacing.sm,
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: spacing.md,
  },
  answerText: {
    color: colors.text.secondary,
    lineHeight: 20,
    fontSize: 13,
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
  // Éléments désactivés
  disabledCard: {
    opacity: 0.5,
    backgroundColor: colors.gray[50],
  },
  disabledText: {
    color: colors.gray[400],
  },
});
