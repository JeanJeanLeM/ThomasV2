/**
 * Service de mise à jour OTA (expo-updates).
 * Vérifie et applique les mises à jour uniquement quand l'utilisateur est en ligne.
 * Ne bloque pas l'app en dev ou quand expo-updates est désactivé.
 */

import * as Updates from 'expo-updates';
import { NetworkService } from './NetworkService';

export type AppUpdateState = {
  updatePending: boolean;
  checking: boolean;
  error: string | null;
};

/**
 * Vérifie si expo-updates est actif (false en dev / Expo Go / build sans EAS Update).
 */
function isUpdatesEnabled(): boolean {
  try {
    return typeof Updates.isEnabled === 'boolean' ? Updates.isEnabled : false;
  } catch {
    return false;
  }
}

/**
 * Vérifie s'il y a une mise à jour disponible et la télécharge si oui.
 * Ne fait rien si hors ligne ou si expo-updates est désactivé.
 * @returns { updatePending: true } si une mise à jour a été téléchargée et est en attente de redémarrage
 */
export async function checkAndFetchUpdate(): Promise<{ updatePending: boolean }> {
  if (!(await NetworkService.isOnline())) {
    return { updatePending: false };
  }

  if (!isUpdatesEnabled()) {
    return { updatePending: false };
  }

  try {
    const checkResult = await Updates.checkForUpdateAsync();
    if (!checkResult.isAvailable) {
      return { updatePending: false };
    }

    const fetchResult = await Updates.fetchUpdateAsync();
    const updatePending = fetchResult.isNew === true;
    if (updatePending) {
      console.log('✅ [APP-UPDATE] Mise à jour téléchargée, redémarrage requis');
    }
    return { updatePending };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('⚠️ [APP-UPDATE] Vérification mise à jour:', message);
    return { updatePending: false };
  }
}

/**
 * Redémarre l'app avec la mise à jour téléchargée.
 * À appeler après avoir affiché l'écran « Redémarrer pour mettre à jour ».
 * Rejette si expo-updates n'est pas actif.
 */
export async function reloadToApplyUpdate(): Promise<void> {
  if (!isUpdatesEnabled()) {
    console.warn('⚠️ [APP-UPDATE] reloadAsync ignoré (expo-updates désactivé)');
    return;
  }
  await Updates.reloadAsync();
}
