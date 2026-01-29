import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Simple fallback en mémoire pour le web si localStorage n'est pas disponible
const memoryStore: Record<string, string> = {};

const isWeb = Platform.OS === 'web';

export async function setItem(key: string, value: string) {
  if (isWeb) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      } else {
        memoryStore[key] = value;
      }
    } catch {
      memoryStore[key] = value;
    }
    return;
  }

  // Plateformes natives : utiliser SecureStore
  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const value = window.localStorage.getItem(key);
        return value ?? null;
      }
      return memoryStore[key] ?? null;
    } catch {
      return memoryStore[key] ?? null;
    }
  }

  return await SecureStore.getItemAsync(key);
}

export async function deleteItem(key: string) {
  if (isWeb) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      delete memoryStore[key];
    } catch {
      delete memoryStore[key];
    }
    return;
  }

  await SecureStore.deleteItemAsync(key);
}






