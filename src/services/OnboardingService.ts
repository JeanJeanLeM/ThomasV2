import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_SEEN_KEY = 'thomas_onboarding_seen_v1';

const OnboardingService = {
  /**
   * Retourne true si le tutoriel a déjà été vu/terminé sur ce device.
   */
  async hasSeenOnboarding(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Marque le tutoriel comme vu. Appelé à la fermeture ou au Terminer.
   */
  async markOnboardingSeen(): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    } catch {
      // Silencieux: si le stockage échoue, l'onboarding pourra se réafficher
    }
  },

  /**
   * Réinitialise l'état (utile pour debug / relance forcée depuis code).
   */
  async resetOnboardingSeen(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ONBOARDING_SEEN_KEY);
    } catch {
      // Silencieux
    }
  },
};

export default OnboardingService;
