import React, { useState, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { Text } from '../../design-system/components/Text';
import { colors } from '../../design-system/colors';
import { spacing } from '../../design-system/spacing';
import { ONBOARDING_STEPS } from '../../constants/onboarding';

// Images des steps (ordre = index des ONBOARDING_STEPS).
// Un seul format suffit : Metro/Expo gère le scaling. Pour un rendu plein zone sans marge
// blanche dans le PNG, privilégier des assets recadrés (illustration bord à bord).
const ONBOARDING_IMAGES: (ImageSourcePropType | null)[] = [
  require('../../../assets/Onboarding/ONBOARDING 1.1.png'),
  require('../../../assets/Onboarding/ONBOARDING 1.2.png'),
  require('../../../assets/Onboarding/ONBOARDING 1.3.png'),
  require('../../../assets/Onboarding/ONBOARDING 1.4.png'),
  require('../../../assets/Onboarding/ONBOARDING 1.5.png'),
  require('../../../assets/Onboarding/ONBOARDING 1.6.png'),
  require('../../../assets/Onboarding/ONBOARDING 2.png'),
  require('../../../assets/Onboarding/ONBOARDING 3.png'),
];

interface OnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ visible, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const step = ONBOARDING_STEPS[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === ONBOARDING_STEPS.length - 1;
  const total = ONBOARDING_STEPS.length;

  const handlePrevious = useCallback(() => {
    if (!isFirst) setCurrentIndex((i) => i - 1);
  }, [isFirst]);

  const handleNext = useCallback(() => {
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
    } else {
      onClose();
    }
  }, [isLast, onClose]);

  const handleClose = useCallback(() => {
    setCurrentIndex(0);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.chapterBadge}>
            <Text variant="caption" style={styles.chapterText}>
              {step.chapter}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text variant="body" style={styles.closeText}>Fermer l'aide</Text>
          </TouchableOpacity>
        </View>

        {/* Content area */}
        <View style={styles.content}>
          {/* Image zone – 50% (fond blanc avec image réelle pour matcher le PNG) */}
          <View style={[styles.imageZone, { backgroundColor: ONBOARDING_IMAGES[currentIndex] ? '#ffffff' : step.imageBackgroundColor }]}>
            {ONBOARDING_IMAGES[currentIndex] ? (
              <Image
                source={ONBOARDING_IMAGES[currentIndex]!}
                style={styles.stepImage}
                resizeMode="contain"
              />
            ) : (
              <>
                <Text style={styles.imagePlaceholderEmoji}>{step.imagePlaceholderIcon}</Text>
                <Text variant="caption" style={styles.imagePlaceholderLabel}>
                  Illustration à venir
                </Text>
              </>
            )}
          </View>

          {/* Text zone – 50% */}
          <ScrollView
            style={styles.textZone}
            contentContainerStyle={styles.textZoneContent}
            showsVerticalScrollIndicator={false}
          >
            <Text variant="h2" style={styles.stepTitle}>{step.title}</Text>
            <Text variant="body" style={styles.stepDescription}>{step.description}</Text>

            <View style={styles.subPointsContainer}>
              {step.subPoints.map((point) => (
                <View
                  key={point.id}
                  style={[styles.subPointRow, point.badge ? styles.subPointRowHighlighted : null]}
                >
                  {point.icon ? (
                    <Text style={styles.subPointIcon}>{point.icon}</Text>
                  ) : (
                    <View style={styles.bullet} />
                  )}
                  <Text variant="body" style={[styles.subPointText, point.badge ? styles.subPointTextHighlighted : null]}>
                    {point.text}
                  </Text>
                  {point.badge && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{point.badge}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Indicateur d'étape */}
          <View style={styles.stepIndicator}>
            {ONBOARDING_STEPS.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.stepDot,
                  idx === currentIndex ? styles.stepDotActive : styles.stepDotInactive,
                ]}
              />
            ))}
          </View>

          <Text variant="caption" style={styles.stepCounter}>
            {currentIndex + 1} / {total}
          </Text>

          <View style={styles.navButtons}>
            <TouchableOpacity
              onPress={handlePrevious}
              disabled={isFirst}
              style={[styles.navButton, styles.navButtonSecondary, isFirst && styles.navButtonDisabled]}
            >
              <Text variant="body" style={[styles.navButtonText, isFirst && styles.navButtonTextDisabled]}>
                ← Précédent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              style={[styles.navButton, styles.navButtonPrimary]}
            >
              <Text variant="body" style={styles.navButtonTextPrimary}>
                {isLast ? 'Terminer ✓' : 'Suivant →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    backgroundColor: colors.background.secondary,
  },
  chapterBadge: {
    backgroundColor: colors.primary[100],
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chapterText: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  closeText: {
    color: colors.gray[500],
    fontSize: 14,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  imageZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  stepImage: {
    width: '100%',
    height: '100%',
    minHeight: 200,
  },
  imagePlaceholderEmoji: {
    fontSize: 72,
    marginBottom: spacing.sm,
  },
  imagePlaceholderLabel: {
    color: colors.gray[400],
  },
  textZone: {
    flex: 1,
  },
  textZoneContent: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
  },
  stepTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  stepDescription: {
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  subPointsContainer: {
    gap: spacing.md,
  },
  subPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 10,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  subPointRowHighlighted: {
    backgroundColor: colors.primary[50],
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
    marginTop: 7,
    flexShrink: 0,
  },
  subPointIcon: {
    fontSize: 18,
    lineHeight: 24,
    flexShrink: 0,
    width: 26,
    textAlign: 'center',
  },
  subPointText: {
    flex: 1,
    color: colors.text.primary,
    lineHeight: 22,
  },
  subPointTextHighlighted: {
    color: colors.primary[800],
    fontWeight: '500',
  },
  badgeContainer: {
    backgroundColor: colors.primary[600],
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    flexShrink: 0,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.background.secondary,
    gap: spacing.sm,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepDotActive: {
    backgroundColor: colors.primary[600],
    width: 20,
  },
  stepDotInactive: {
    backgroundColor: colors.gray[300],
  },
  stepCounter: {
    textAlign: 'center',
    color: colors.gray[400],
    marginBottom: spacing.sm,
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  navButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  navButtonPrimary: {
    backgroundColor: colors.primary[600],
  },
  navButtonSecondary: {
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navButtonText: {
    color: colors.gray[700],
    fontWeight: '500',
    fontSize: 15,
  },
  navButtonTextDisabled: {
    color: colors.gray[400],
  },
  navButtonTextPrimary: {
    color: colors.text.inverse,
    fontWeight: '600',
    fontSize: 15,
  },
});

export default OnboardingModal;
