import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Animated, Image } from 'react-native';
import { Text } from '@/design-system/components';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { Ionicons } from '@expo/vector-icons';
import { getAppVersionInfo } from '@/services/AppVersionService';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
  currentStep?: string;
  progress?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  onLoadingComplete, 
  currentStep = 'Initialisation...', 
  progress = 0 
}) => {
  const appVersionInfo = getAppVersionInfo();
  const [loadingStep, setLoadingStep] = useState(currentStep);
  const [currentProgress, setCurrentProgress] = useState(progress);
  // Initialiser avec opacity 1 pour que le contenu soit visible immédiatement
  const fadeAnim = new Animated.Value(1);
  const scaleAnim = new Animated.Value(1);
  const progressAnim = new Animated.Value(progress);

  // Mettre à jour l'étape et le progrès depuis les props
  useEffect(() => {
    setLoadingStep(currentStep);
  }, [currentStep]);

  useEffect(() => {
    setCurrentProgress(progress);
    // Animer la barre de progression
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false, // width ne peut pas utiliser useNativeDriver
    }).start();
  }, [progress]);

  // Plus besoin d'animation d'entrée - le contenu est déjà visible
  // L'animation d'entrée était le problème : elle commençait à opacity 0

  // Déclencher l'animation de sortie quand le progrès atteint 100%
  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onLoadingComplete();
        });
      }, 500);
    }
  }, [progress, onLoadingComplete]);

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background.primary,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    }}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
          width: '100%',
        }}
      >
        {/* Logo/Icône principale */}
        <View style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.xl,
          shadowColor: colors.primary[500],
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        }}>
          <Image
            source={require('../../assets/Logocolorfull.png')}
            style={{
              width: 120,
              height: 120,
              resizeMode: 'contain',
            }}
            resizeMethod="resize"
          />
        </View>

        {/* Titre de l'application */}
        <Text 
          variant="h1" 
          weight="bold" 
          color={colors.text.primary}
          style={{ marginBottom: spacing.md }}
        >
          Thomas
        </Text>

        <Text 
          variant="body" 
          color={colors.text.secondary}
          style={{ 
            marginBottom: spacing.xl,
            textAlign: 'center',
            maxWidth: 280,
          }}
        >
          Votre assistant agricole intelligent
        </Text>

        {/* Indicateur de chargement */}
        <View style={{
          alignItems: 'center',
          width: '100%',
          maxWidth: 300,
        }}>
          {/* Barre de progression */}
          <View style={{
            width: '100%',
            height: 6,
            backgroundColor: colors.gray[200],
            borderRadius: 3,
            marginBottom: spacing.md,
            overflow: 'hidden',
          }}>
            <Animated.View 
              style={{
                height: '100%',
                backgroundColor: colors.primary[500],
                borderRadius: 3,
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              }} 
            />
          </View>

          {/* Spinner et texte */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing.sm,
          }}>
            <ActivityIndicator 
              size="small" 
              color={colors.primary[500]} 
              style={{ marginRight: spacing.sm }}
            />
            <Text 
              variant="body" 
              color={colors.text.secondary}
              weight="medium"
            >
              {loadingStep}
            </Text>
          </View>

          {/* Pourcentage */}
          <Text 
            variant="caption" 
            color={colors.text.tertiary}
          >
            {Math.round(currentProgress)}%
          </Text>
        </View>
      </Animated.View>

      {/* Version en bas */}
      <View style={{
        position: 'absolute',
        bottom: spacing.xl,
        alignItems: 'center',
      }}>
        <Text 
          variant="caption" 
          color={colors.text.tertiary}
        >
          {appVersionInfo.displayVersion}
        </Text>
      </View>
    </View>
  );
};

export default LoadingScreen;
