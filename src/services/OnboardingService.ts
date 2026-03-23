import AsyncStorage from '@react-native-async-storage/async-storage';

/** Clé par utilisateur : premier passage onboarding = premier usage de ce compte sur l'app */
const ONBOARDING_SEEN_KEY_PREFIX = 'thomas_onboarding_seen_v1_';

/** Ancienne clé globale (appareil) — migrée une fois vers la clé utilisateur si besoin */
const LEGACY_ONBOARDING_SEEN_KEY = 'thomas_onboarding_seen_v1';

function keyForUser(userId: string): string {
  return `${ONBOARDING_SEEN_KEY_PREFIX}${userId}`;
}

const OnboardingService = {
  /**
   * Retourne true si ce compte utilisateur a déjà terminé / fermé l'onboarding.
   * Flux produit : création profil → parcours ferme → app principale → onboarding (si jamais vu pour ce user).
   *
   * NOTE: on ne migre plus la legacy key vers le nouveau user — cela marquait
   * à tort les nouveaux comptes comme ayant déjà vu l'onboarding quand le
   * navigateur avait déjà accueilli un autre utilisateur.
   * La legacy key est simplement purgée silencieusement.
   */
  async hasSeenOnboarding(userId: string): Promise<boolean> {
    if (!userId) return true;
    try {
      // Purger l'ancienne clé globale (device-level) sans la transférer au nouveau user
      const legacy = await AsyncStorage.getItem(LEGACY_ONBOARDING_SEEN_KEY);
      if (legacy !== null) {
        await AsyncStorage.removeItem(LEGACY_ONBOARDING_SEEN_KEY);
      }

      // Vérifier uniquement la clé propre à ce compte
      const userKey = keyForUser(userId);
      const userValue = await AsyncStorage.getItem(userKey);
      return userValue === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Marque l'onboarding comme vu pour ce compte.
   */
  async markOnboardingSeen(userId: string): Promise<void> {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(keyForUser(userId), 'true');
      await AsyncStorage.removeItem(LEGACY_ONBOARDING_SEEN_KEY);
    } catch {
      // Silencieux
    }
  },

  /**
   * Réinitialise pour un utilisateur (debug / tests).
   */
  async resetOnboardingSeen(userId: string): Promise<void> {
    if (!userId) return;
    try {
      await AsyncStorage.removeItem(keyForUser(userId));
    } catch {
      // Silencieux
    }
  },
};

export default OnboardingService;
