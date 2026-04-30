import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Platform, StatusBar, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Text } from '@/design-system/components/Text';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { INTERFACE_TOUR_STEPS, type InterfaceTourAction } from '@/constants/interfaceTour';
import { useInterfaceTourTargets, type InterfaceTourTargetLayout } from '@/contexts/InterfaceTourTargetsContext';
import InterfaceTourTarget from './InterfaceTourTarget';

interface InterfaceTourModalProps {
  visible: boolean;
  initialStepIndex?: number;
  onStepChange?: (stepIndex: number, action: InterfaceTourAction) => void | Promise<void>;
  onClose: () => void;
  onComplete: () => void;
}

const PREVIEW_BUTTON_WIDTH = 96;
const PREVIEW_BUTTON_HEIGHT = 40;
const PREVIEW_BUTTON_RIGHT = 20;
const PREVIEW_BUTTON_BOTTOM = 112;

const InterfaceTourModal: React.FC<InterfaceTourModalProps> = ({
  visible,
  initialStepIndex = 0,
  onStepChange,
  onClose,
  onComplete,
}) => {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const { measureTarget } = useInterfaceTourTargets();
  const [currentIndex, setCurrentIndex] = useState(initialStepIndex);
  const [targetLayout, setTargetLayout] = useState<InterfaceTourTargetLayout | null>(null);
  const [isResolvingTarget, setIsResolvingTarget] = useState(false);
  const [isPreviewPhase, setIsPreviewPhase] = useState(false);
  const hasInitializedRef = useRef(false);
  const lastFiredStepRef = useRef(-1);
  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;

  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -6, duration: 600, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, bounceAnim]);

  useEffect(() => {
    if (!visible) {
      hasInitializedRef.current = false;
      lastFiredStepRef.current = -1;
      return;
    }
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    setCurrentIndex(initialStepIndex);
    setIsPreviewPhase(false);
  }, [initialStepIndex, visible]);

  const resolveTargetLayout = useCallback(
    async (stepIndex: number) => {
      const step = INTERFACE_TOUR_STEPS[stepIndex];
      if (step?.id === 'tour-preview-next') {
        const width = PREVIEW_BUTTON_WIDTH;
        const height = PREVIEW_BUTTON_HEIGHT;
        const x = viewportWidth - PREVIEW_BUTTON_RIGHT - width;
        const y = viewportHeight - PREVIEW_BUTTON_BOTTOM - height;
        setTargetLayout({ x, y, width, height });
        setIsResolvingTarget(false);
        return;
      }

      if (!step?.targetId) {
        setTargetLayout(null);
        setIsResolvingTarget(false);
        return;
      }

      setTargetLayout(null);
      setIsResolvingTarget(true);
      let foundLayout: InterfaceTourTargetLayout | null = null;

      const shouldWaitUntilVisible =
        !step.targetId.startsWith('tab.') &&
        step.targetId !== 'tour.preview.next';

      for (let attempt = 0; attempt < 20; attempt += 1) {
        foundLayout = await measureTarget(step.targetId);
        if (foundLayout) {
          const isVisibleEnough =
            !shouldWaitUntilVisible ||
            (foundLayout.y >= 0 && foundLayout.y <= viewportHeight - 160);
          if (isVisibleEnough || attempt === 19) break;
        }
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      setTargetLayout(foundLayout);
      setIsResolvingTarget(false);
    },
    [measureTarget, viewportHeight, viewportWidth]
  );

  useEffect(() => {
    if (!visible) return;
    if (currentIndex === lastFiredStepRef.current) return;
    lastFiredStepRef.current = currentIndex;

    let cancelled = false;
    (async () => {
      const step = INTERFACE_TOUR_STEPS[currentIndex];
      if (!step) return;
      setTargetLayout(null);
      setIsResolvingTarget(!!step.targetId);
      await onStepChangeRef.current?.(currentIndex, step.autoAction);
      const settleDelay = step.targetId?.startsWith('settings.option.') ? 420 : 180;
      await new Promise((resolve) => setTimeout(resolve, settleDelay));
      if (!cancelled) {
        resolveTargetLayout(currentIndex);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentIndex, resolveTargetLayout, visible]);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === INTERFACE_TOUR_STEPS.length - 1;
  const step = INTERFACE_TOUR_STEPS[currentIndex];

  const handlePrevious = useCallback(() => {
    if (isFirst) return;
    const prevIndex = currentIndex - 1;
    const prevStep = INTERFACE_TOUR_STEPS[prevIndex];
    setIsPreviewPhase(false);
    setCurrentIndex(prevIndex);
  }, [currentIndex, isFirst]);

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
      return;
    }
    const nextIndex = currentIndex + 1;
    const nextStep = INTERFACE_TOUR_STEPS[nextIndex];
    setIsPreviewPhase(false);
    setCurrentIndex(nextIndex);
  }, [currentIndex, isLast, onComplete]);

  const handleClose = useCallback(() => {
    setCurrentIndex(0);
    setTargetLayout(null);
    setIsResolvingTarget(false);
    setIsPreviewPhase(false);
    onClose();
  }, [onClose]);

  const handlePreviewNext = useCallback(() => {
    setIsPreviewPhase(false);
  }, []);

  const isIntroStep = step?.id === 'tour-preview-next';
  const isImageStep = !!step?.image;
  const isFullScreenPreview = !!step?.fullScreenPreview;
  const effectivePreviewPhase = isPreviewPhase && !isIntroStep && !isFullScreenPreview;
  const showFloatingNextButton = effectivePreviewPhase || isFullScreenPreview || step?.targetId === 'tour.preview.next';

  const tooltipStyle = useMemo(() => {
    const horizontalMargin = 12;
    const maxCardWidth = Math.min(360, viewportWidth - horizontalMargin * 2);
    const estimatedCardHeight = 300;
    const isBottomNavStep = step?.targetId?.startsWith('tab.');

    if (isIntroStep) {
      return {
        width: maxCardWidth,
        left: Math.max(horizontalMargin, (viewportWidth - maxCardWidth) / 2),
        top: 60,
      };
    }

    if (isBottomNavStep) {
      return {
        width: maxCardWidth,
        left: Math.max(horizontalMargin, (viewportWidth - maxCardWidth) / 2),
        top: 76,
      };
    }

    if (!targetLayout) {
      return {
        width: maxCardWidth,
        left: horizontalMargin,
        right: horizontalMargin,
        top: Math.max(90, (viewportHeight - estimatedCardHeight) / 2),
      };
    }

    const centerX = targetLayout.x + targetLayout.width / 2;
    const preferredLeft = centerX - maxCardWidth / 2;
    const clampedLeft = Math.max(horizontalMargin, Math.min(preferredLeft, viewportWidth - maxCardWidth - horizontalMargin));
    const placeBelow = targetLayout.y + targetLayout.height + estimatedCardHeight + 24 < viewportHeight;
    const top = placeBelow
      ? targetLayout.y + targetLayout.height + 16
      : Math.max(56, targetLayout.y - estimatedCardHeight - 16);

    return {
      width: maxCardWidth,
      left: clampedLeft,
      top,
    };
  }, [isIntroStep, step?.targetId, targetLayout, viewportHeight, viewportWidth]);

  const highlightStyle = useMemo(() => {
    if (!targetLayout) return null;
    const padding = isIntroStep ? 3 : 8;
    return {
      left: Math.max(4, targetLayout.x - padding),
      top: Math.max(4, targetLayout.y - padding),
      width: targetLayout.width + padding * 2,
      height: targetLayout.height + padding * 2,
    };
  }, [isIntroStep, targetLayout]);

  const cutoutBounds = useMemo(() => {
    if (!targetLayout) return null;
    const padding = isIntroStep ? 3 : 8;
    const left = Math.max(0, Math.min(targetLayout.x - padding, viewportWidth));
    const top = Math.max(0, Math.min(targetLayout.y - padding, viewportHeight));
    const width = Math.max(0, Math.min(targetLayout.width + padding * 2, viewportWidth - left));
    const height = Math.max(0, Math.min(targetLayout.height + padding * 2, viewportHeight - top));
    return { left, top, width, height };
  }, [isIntroStep, targetLayout, viewportHeight, viewportWidth]);

  const shouldUseCutout = !effectivePreviewPhase && !!cutoutBounds;

  if (!step) return null;

  // ── Image + fullScreenPreview: image as background, floating Suivant only ──
  if (isImageStep && isFullScreenPreview) {
    return (
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
        <View style={styles.safe}>
          <Image source={step.image!} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <Animated.View style={[styles.previewNextAnchor, { transform: [{ translateY: bounceAnim }] }]}>
            <InterfaceTourTarget targetId="tour.preview.next">
              <TouchableOpacity style={styles.previewNextButton} onPress={handleNext} activeOpacity={0.85}>
                <Text variant="body" style={styles.previewNextButtonText}>Suivant</Text>
              </TouchableOpacity>
            </InterfaceTourTarget>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // ── Image steps with highlight: full-screen image + card top or bottom ──
  if (isImageStep && !effectivePreviewPhase) {
    const hl = step.imageHighlight;
    const highlightInBottom = hl ? (hl.top + hl.height) > 60 : false;
    const cardPosition = highlightInBottom ? 'top' : 'bottom';

    return (
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
        <View style={styles.safe}>
          <Image source={step.image!} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

          {hl ? (
            <>
              <View style={[styles.imageDim, { top: 0, left: 0, right: 0, height: `${hl.top}%` }]} />
              <View style={[styles.imageDim, { top: `${hl.top + hl.height}%`, left: 0, right: 0, bottom: 0 }]} />
              <View style={[styles.imageDim, { top: `${hl.top}%`, left: 0, width: `${hl.left}%`, height: `${hl.height}%` }]} />
              <View style={[styles.imageDim, { top: `${hl.top}%`, left: `${hl.left + hl.width}%`, right: 0, height: `${hl.height}%` }]} />
              <View style={[styles.imageHighlightRing, {
                top: `${hl.top}%`, left: `${hl.left}%`, width: `${hl.width}%`, height: `${hl.height}%`,
              }]} />
            </>
          ) : (
            <View style={styles.dimLayer} />
          )}

          <View style={cardPosition === 'top' ? styles.imageTopCard : styles.imageBottomCard}>
            <View style={styles.header}>
              <View style={styles.chapterBadge}>
                <Text variant="caption" style={styles.chapterText}>{step.chapter}</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text variant="body" style={styles.closeText}>Fermer</Text>
              </TouchableOpacity>
            </View>
            <Text variant="h3" style={styles.stepTitle}>{step.title}</Text>
            <Text variant="body" style={styles.stepDescription}>{step.description}</Text>
            <View style={styles.imageCardNav}>
              <Text variant="caption" style={styles.stepCounter}>
                {currentIndex + 1} / {INTERFACE_TOUR_STEPS.length}
              </Text>
              <View style={styles.navButtons}>
                <TouchableOpacity
                  onPress={handlePrevious}
                  disabled={isFirst}
                  style={[styles.navButton, styles.navButtonSecondary, isFirst && styles.navButtonDisabled]}
                >
                  <Text variant="body" style={[styles.navButtonText, isFirst && styles.navButtonTextDisabled]}>
                    Precedent
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNext} style={[styles.navButton, styles.navButtonPrimary]}>
                  <Text variant="body" style={styles.navButtonTextPrimary}>
                    {isLast ? 'Terminer' : 'Suivant'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Live UI steps ──
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.safe}>
        {shouldUseCutout ? (
          <>
            <View
              pointerEvents="none"
              style={[styles.dimSegment, { left: 0, top: 0, width: viewportWidth, height: cutoutBounds.top }]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.dimSegment,
                {
                  left: 0,
                  top: cutoutBounds.top,
                  width: cutoutBounds.left,
                  height: cutoutBounds.height,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.dimSegment,
                {
                  left: cutoutBounds.left + cutoutBounds.width,
                  top: cutoutBounds.top,
                  width: Math.max(0, viewportWidth - (cutoutBounds.left + cutoutBounds.width)),
                  height: cutoutBounds.height,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.dimSegment,
                {
                  left: 0,
                  top: cutoutBounds.top + cutoutBounds.height,
                  width: viewportWidth,
                  height: Math.max(0, viewportHeight - (cutoutBounds.top + cutoutBounds.height)),
                },
              ]}
            />
          </>
        ) : !effectivePreviewPhase && !isFullScreenPreview ? (
          <View pointerEvents="none" style={styles.dimLayer} />
        ) : null}

        {!effectivePreviewPhase && !isFullScreenPreview && highlightStyle ? (
          <View pointerEvents="none" style={[styles.highlightRing, highlightStyle]} />
        ) : null}

        {showFloatingNextButton ? (
          <Animated.View style={[styles.previewNextAnchor, { transform: [{ translateY: bounceAnim }] }]}>
            <InterfaceTourTarget targetId="tour.preview.next">
              <TouchableOpacity
                style={styles.previewNextButton}
                onPress={effectivePreviewPhase ? handlePreviewNext : handleNext}
                activeOpacity={0.85}
              >
                <Text variant="body" style={styles.previewNextButtonText}>
                  Suivant
                </Text>
              </TouchableOpacity>
            </InterfaceTourTarget>
          </Animated.View>
        ) : null}

        {!effectivePreviewPhase && !isFullScreenPreview ? (
        <View style={[styles.tooltipCard, tooltipStyle]}>
          <View style={styles.header}>
            <View style={styles.chapterBadge}>
              <Text variant="caption" style={styles.chapterText}>
                {step.chapter}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text variant="body" style={styles.closeText}>
                Fermer
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text variant="h3" style={styles.stepTitle}>
              {step.title}
            </Text>
            <Text variant="body" style={styles.stepDescription}>
              {step.description}
            </Text>

            <View style={styles.subPointsContainer}>
              {step.subPoints.map((point) => (
                <View key={point} style={styles.subPointRow}>
                  <View style={styles.bullet} />
                  <Text variant="body" style={styles.subPointText}>
                    {point}
                  </Text>
                </View>
              ))}
            </View>

            {isResolvingTarget && (
              <Text variant="caption" style={styles.resolveText}>
                Recherche du point a mettre en evidence...
              </Text>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.stepIndicator}>
              {INTERFACE_TOUR_STEPS.map((tourStep, index) => (
                <View
                  key={tourStep.id}
                  style={[styles.stepDot, index === currentIndex ? styles.stepDotActive : styles.stepDotInactive]}
                />
              ))}
            </View>
            <Text variant="caption" style={styles.stepCounter}>
              {currentIndex + 1} / {INTERFACE_TOUR_STEPS.length}
            </Text>
            {!isIntroStep ? (
              <View style={styles.navButtons}>
                <TouchableOpacity
                  onPress={handlePrevious}
                  disabled={isFirst}
                  style={[styles.navButton, styles.navButtonSecondary, isFirst && styles.navButtonDisabled]}
                >
                  <Text variant="body" style={[styles.navButtonText, isFirst && styles.navButtonTextDisabled]}>
                    Precedent
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNext} style={[styles.navButton, styles.navButtonPrimary]}>
                  <Text variant="body" style={styles.navButtonTextPrimary}>
                    {isLast ? 'Terminer' : 'Suivant'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  },
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    zIndex: 1,
  },
  dimSegment: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    zIndex: 1,
  },
  highlightRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 14,
    shadowColor: '#ffffff',
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 12,
    zIndex: 2,
  },
  previewNextButton: {
    width: PREVIEW_BUTTON_WIDTH,
    height: PREVIEW_BUTTON_HEIGHT,
    backgroundColor: colors.primary[600],
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 30,
    zIndex: 3000,
  },
  previewNextAnchor: {
    position: 'absolute',
    right: PREVIEW_BUTTON_RIGHT,
    bottom: PREVIEW_BUTTON_BOTTOM,
    zIndex: 3000,
    elevation: 30,
  },
  previewNextButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  imageDim: {
    position: 'absolute' as const,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  imageHighlightRing: {
    position: 'absolute' as const,
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#ffffff',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 10,
  },
  imageBottomCard: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  imageTopCard: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: spacing.md,
    paddingTop: 48,
    paddingBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  imageCardNav: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: spacing.sm,
  },
  tooltipCard: {
    position: 'absolute',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 100,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    backgroundColor: colors.gray[50],
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  closeText: {
    color: colors.gray[500],
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  stepTitle: {
    marginBottom: spacing.xs,
    color: colors.text.primary,
  },
  stepDescription: {
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 21,
  },
  subPointsContainer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  subPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary[500],
    marginTop: 7,
    marginRight: spacing.sm,
  },
  subPointText: {
    flex: 1,
    color: colors.text.primary,
  },
  resolveText: {
    marginTop: spacing.sm,
    color: colors.gray[500],
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.gray[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  stepDotActive: {
    backgroundColor: colors.primary[600],
  },
  stepDotInactive: {
    backgroundColor: colors.gray[300],
  },
  stepCounter: {
    textAlign: 'center',
    color: colors.gray[500],
  },
  navButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonSecondary: {
    backgroundColor: colors.gray[100],
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonPrimary: {
    backgroundColor: colors.primary[600],
  },
  navButtonText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: colors.gray[400],
  },
  navButtonTextPrimary: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default InterfaceTourModal;
