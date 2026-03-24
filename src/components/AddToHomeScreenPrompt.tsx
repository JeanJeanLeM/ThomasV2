import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type InstallChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const DISMISS_KEY = 'thomas_web_a2hs_prompt_dismissed_at_v1';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

function getWebGlobal(): any {
  return typeof globalThis !== 'undefined' ? (globalThis as any) : null;
}

function isStandaloneMode(webGlobal: any): boolean {
  const standaloneFromMedia = !!webGlobal?.matchMedia?.('(display-mode: standalone)')?.matches;
  const standaloneFromNavigator = !!webGlobal?.navigator?.standalone;
  return standaloneFromMedia || standaloneFromNavigator;
}

function isIosSafari(webGlobal: any): boolean {
  const ua = String(webGlobal?.navigator?.userAgent || '').toLowerCase();
  const isAppleDevice = /iphone|ipad|ipod/.test(ua);
  const isWebKit = /safari/.test(ua);
  const isOtherBrowser = /crios|fxios|edgios|opios/.test(ua);
  return isAppleDevice && isWebKit && !isOtherBrowser;
}

function canShowPromptNow(webGlobal: any): boolean {
  try {
    const raw = webGlobal?.localStorage?.getItem(DISMISS_KEY);
    if (!raw) return true;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts >= DISMISS_COOLDOWN_MS;
  } catch {
    return true;
  }
}

function saveDismissTimestamp(webGlobal: any): void {
  try {
    webGlobal?.localStorage?.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Ignorer les erreurs de stockage web
  }
}

export default function AddToHomeScreenPrompt(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);

  const shouldRender = Platform.OS === 'web' && visible;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const webGlobal = getWebGlobal();
    if (!webGlobal) return;

    if (isStandaloneMode(webGlobal)) return;
    if (!canShowPromptNow(webGlobal)) return;

    const iosSafari = isIosSafari(webGlobal);
    setIsIos(iosSafari);

    // iOS Safari n'a pas beforeinstallprompt: montrer directement le guide.
    if (iosSafari) {
      setVisible(true);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      saveDismissTimestamp(webGlobal);
    };

    webGlobal.addEventListener?.('beforeinstallprompt', onBeforeInstallPrompt);
    webGlobal.addEventListener?.('appinstalled', onAppInstalled);

    return () => {
      webGlobal.removeEventListener?.('beforeinstallprompt', onBeforeInstallPrompt);
      webGlobal.removeEventListener?.('appinstalled', onAppInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    const webGlobal = getWebGlobal();
    saveDismissTimestamp(webGlobal);
    setVisible(false);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      dismiss();
    } else {
      // Si refus, cacher un temps pour éviter de spammer.
      dismiss();
    }
    setDeferredPrompt(null);
  }, [deferredPrompt, dismiss]);

  const title = useMemo(() => {
    if (isIos) return 'Ajouter Thomas a l ecran d accueil';
    return 'Installer la web app';
  }, [isIos]);

  const description = useMemo(() => {
    if (isIos) {
      return 'Sur Safari: Partager puis Sur l ecran d accueil pour ouvrir Thomas comme une app.';
    }
    if (deferredPrompt) {
      return 'Installe Thomas pour un acces plus rapide depuis votre ecran d accueil.';
    }
    return 'Ajoutez Thomas a l ecran d accueil pour un acces rapide.';
  }, [isIos, deferredPrompt]);

  if (!shouldRender) return null;

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        <View style={styles.actions}>
          {deferredPrompt ? (
            <Pressable style={[styles.button, styles.primaryButton]} onPress={handleInstall}>
              <Text style={[styles.buttonText, styles.primaryButtonText]}>Installer</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.button} onPress={dismiss}>
            <Text style={styles.buttonText}>Plus tard</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 1000,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    padding: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#14532d',
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#166534',
  },
  actions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86efac',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
});
