import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

export type AppVersionInfo = {
  appVersion: string;
  buildVersion: string | null;
  runtimeVersion: string | null;
  updateId: string | null;
  channel: string | null;
  isUpdatesEnabled: boolean;
  displayVersion: string;
  displayVersionWithUpdate: string;
};

const FALLBACK_APP_VERSION = '0.0.0';

function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function shortenUpdateId(updateId: string | null): string | null {
  if (!updateId) return null;
  return updateId.length > 8 ? updateId.slice(0, 8) : updateId;
}

export function getAppVersionInfo(): AppVersionInfo {
  const appVersionFromNative = normalizeText(Application.nativeApplicationVersion ?? null);
  const appVersionFromExpo = normalizeText(Constants.expoConfig?.version);
  const appVersion = appVersionFromNative ?? appVersionFromExpo ?? FALLBACK_APP_VERSION;

  const buildVersionFromNative = normalizeText(Application.nativeBuildVersion ?? null);
  const buildVersionFromExpo =
    normalizeText(Constants.expoConfig?.ios?.buildNumber) ??
    normalizeText(
      Constants.expoConfig?.android?.versionCode !== undefined
        ? String(Constants.expoConfig.android.versionCode)
        : null
    );
  const buildVersion = buildVersionFromNative ?? buildVersionFromExpo;

  const runtimeVersion =
    normalizeText(Updates.runtimeVersion ?? null) ??
    normalizeText(
      typeof Constants.expoConfig?.runtimeVersion === 'string'
        ? Constants.expoConfig.runtimeVersion
        : null
    );
  const updateId = normalizeText(Updates.updateId ?? null);
  const channel = normalizeText((Updates as any).channel ?? null);
  const isUpdatesEnabled = Updates.isEnabled === true;

  const displayVersion = buildVersion
    ? `Version ${appVersion} (build ${buildVersion})`
    : `Version ${appVersion}`;
  const shortUpdateId = shortenUpdateId(updateId);
  const displayVersionWithUpdate = shortUpdateId
    ? `${displayVersion} · update ${shortUpdateId}`
    : displayVersion;

  return {
    appVersion,
    buildVersion,
    runtimeVersion,
    updateId,
    channel,
    isUpdatesEnabled,
    displayVersion,
    displayVersionWithUpdate,
  };
}
