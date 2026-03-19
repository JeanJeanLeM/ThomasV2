/**
 * Hook pour forcer la mise à jour OTA quand l'utilisateur est en ligne.
 * Au montage, vérifie s'il y a une mise à jour ; si oui, la télécharge et expose updatePending.
 */

import { useState, useEffect, useCallback } from 'react';
import { checkAndFetchUpdate, reloadToApplyUpdate } from '../services/AppUpdateService';
import { NetworkService } from '../services/NetworkService';

export function useMandatoryUpdate(): {
  updatePending: boolean;
  checking: boolean;
  reloadNow: () => Promise<void>;
} {
  const [updatePending, setUpdatePending] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const isOnline = await NetworkService.isOnline();
      if (!isOnline || cancelled) {
        setChecking(false);
        return;
      }
      const { updatePending: pending } = await checkAndFetchUpdate();
      if (!cancelled) {
        setUpdatePending(pending);
      }
      setChecking(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadNow = useCallback(async () => {
    await reloadToApplyUpdate();
  }, []);

  return { updatePending, checking, reloadNow };
}
