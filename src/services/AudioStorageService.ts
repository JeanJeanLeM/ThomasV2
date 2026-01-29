/**
 * Service de stockage local des fichiers audio
 * 
 * Utilise expo-file-system sur mobile et IndexedDB sur web
 * pour sauvegarder les fichiers audio de manière persistante.
 */

import { Platform } from 'react-native';

export interface AudioMetadata {
  duration: number;
  file_size: number;
  mime_type: string;
  original_uri?: string;
}

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
const DB_NAME = 'thomas_audio_storage';
const DB_VERSION = 1;
const STORE_NAME = 'audios';

// Import conditionnel pour mobile
let FileSystem: any = null;
if (Platform.OS !== 'web') {
  try {
    FileSystem = require('expo-file-system');
  } catch (error) {
    console.warn('⚠️ [AUDIO-STORAGE] expo-file-system not available');
  }
}

const AUDIO_DIR = FileSystem ? `${FileSystem.documentDirectory}offline_audios/` : null;

/**
 * Initialise IndexedDB sur web
 */
async function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Initialise le répertoire de stockage audio (mobile uniquement)
 */
async function ensureAudioDirectory(): Promise<void> {
  if (Platform.OS === 'web' || !FileSystem) {
    return; // Pas nécessaire sur web
  }
  
  try {
    const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
      console.log('📁 [AUDIO-STORAGE] Répertoire audio créé');
    }
  } catch (error) {
    console.error('❌ [AUDIO-STORAGE] Error creating directory:', error);
    throw error;
  }
}

export class AudioStorageService {
  /**
   * Sauvegarde un fichier audio localement
   * Retourne l'URI locale du fichier sauvegardé (ou l'ID pour IndexedDB sur web)
   */
  static async saveAudio(
    sourceUri: string,
    metadata: AudioMetadata
  ): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        // Sur web, utiliser IndexedDB
        return await this.saveAudioToIndexedDB(sourceUri, metadata);
      } else {
        // Sur mobile, utiliser expo-file-system
        await ensureAudioDirectory();

        // Générer un nom de fichier unique
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const extension = sourceUri.split('.').pop() || 'm4a';
        const fileName = `audio_${timestamp}_${randomId}.${extension}`;
        const destUri = `${AUDIO_DIR}${fileName}`;

        // Copier le fichier
        await FileSystem.copyAsync({
          from: sourceUri,
          to: destUri,
        });

        console.log('💾 [AUDIO-STORAGE] Audio sauvegardé:', destUri);
        return destUri;
      }
    } catch (error) {
      console.error('❌ [AUDIO-STORAGE] Error saving audio:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde un audio dans IndexedDB (web uniquement)
   */
  private static async saveAudioToIndexedDB(
    sourceUri: string,
    metadata: AudioMetadata
  ): Promise<string> {
    try {
      const db = await initIndexedDB();
      
      // Convertir le blob en ArrayBuffer
      const response = await fetch(sourceUri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      
      // Générer un ID unique
      const id = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Stocker dans IndexedDB
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          id,
          audioData: arrayBuffer,
          metadata,
          timestamp: Date.now(),
        });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      console.log('💾 [AUDIO-STORAGE] Audio sauvegardé dans IndexedDB:', id);
      return id; // Retourner l'ID comme URI
    } catch (error) {
      console.error('❌ [AUDIO-STORAGE] Error saving to IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Récupère l'URI d'un fichier audio sauvegardé
   * Sur web, reconstitue un blob URL depuis IndexedDB
   */
  static async getAudioUri(id: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // Sur web, récupérer depuis IndexedDB et créer un blob URL
        const db = await initIndexedDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const audioData = await new Promise<any>((resolve, reject) => {
          const request = store.get(id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        if (!audioData) {
          console.warn('⚠️ [AUDIO-STORAGE] Audio not found in IndexedDB:', id);
          return null;
        }
        
        // Reconstituer le blob
        const blob = new Blob([audioData.audioData], { type: audioData.metadata.mime_type });
        const blobUrl = URL.createObjectURL(blob);
        
        return blobUrl;
      } else {
        // Sur mobile, vérifier que le fichier existe
        if (!FileSystem) return null;
        
        const fileInfo = await FileSystem.getInfoAsync(id);
        
        if (fileInfo.exists) {
          return id;
        }
        
        console.warn('⚠️ [AUDIO-STORAGE] Audio file not found:', id);
        return null;
      }
    } catch (error) {
      console.error('❌ [AUDIO-STORAGE] Error getting audio URI:', error);
      return null;
    }
  }

  /**
   * Vérifie si un fichier audio existe
   */
  static async audioExists(uri: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        const db = await initIndexedDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const audioData = await new Promise<any>((resolve) => {
          const request = store.get(uri);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        });
        
        return audioData !== null && audioData !== undefined;
      } else {
        if (!FileSystem) return false;
        const fileInfo = await FileSystem.getInfoAsync(uri);
        return fileInfo.exists;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Supprime un fichier audio
   */
  static async deleteAudio(uri: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        const db = await initIndexedDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(uri);
          request.onsuccess = () => {
            console.log('🗑️ [AUDIO-STORAGE] Audio supprimé de IndexedDB:', uri);
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      } else {
        if (!FileSystem) return;
        
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          console.log('🗑️ [AUDIO-STORAGE] Audio supprimé:', uri);
        }
      }
    } catch (error) {
      console.error('❌ [AUDIO-STORAGE] Error deleting audio:', error);
      // Ne pas throw, on continue même si la suppression échoue
    }
  }

  /**
   * Nettoie les fichiers audio anciens (plus de MAX_AGE_MS)
   */
  static async cleanupOldAudios(maxAge: number = MAX_AGE_MS): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        const db = await initIndexedDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        
        const now = Date.now();
        let deletedCount = 0;
        
        // Parcourir tous les enregistrements
        const request = index.openCursor();
        await new Promise<void>((resolve, reject) => {
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
              const age = now - cursor.value.timestamp;
              if (age > maxAge) {
                cursor.delete();
                deletedCount++;
              }
              cursor.continue();
            } else {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
        
        if (deletedCount > 0) {
          console.log(`🧹 [AUDIO-STORAGE] ${deletedCount} fichiers audio anciens supprimés de IndexedDB`);
        }
      } else {
        if (!FileSystem) return;
        
        await ensureAudioDirectory();
        
        const files = await FileSystem.readDirectoryAsync(AUDIO_DIR);
        const now = Date.now();
        let deletedCount = 0;

        for (const file of files) {
          const fileUri = `${AUDIO_DIR}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          
          if (fileInfo.exists && fileInfo.modificationTime) {
            const age = now - fileInfo.modificationTime * 1000; // modificationTime est en secondes
            
            if (age > maxAge) {
              await FileSystem.deleteAsync(fileUri, { idempotent: true });
              deletedCount++;
            }
          }
        }

        if (deletedCount > 0) {
          console.log(`🧹 [AUDIO-STORAGE] ${deletedCount} fichiers audio anciens supprimés`);
        }
      }
    } catch (error) {
      console.error('❌ [AUDIO-STORAGE] Error cleaning up old audios:', error);
    }
  }

  /**
   * Obtient la taille totale du répertoire audio
   */
  static async getStorageSize(): Promise<number> {
    try {
      if (Platform.OS === 'web') {
        const db = await initIndexedDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        let totalSize = 0;
        
        const request = store.openCursor();
        await new Promise<void>((resolve, reject) => {
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
              const audioData = cursor.value.audioData;
              if (audioData instanceof ArrayBuffer) {
                totalSize += audioData.byteLength;
              }
              cursor.continue();
            } else {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
        
        return totalSize;
      } else {
        if (!FileSystem) return 0;
        
        await ensureAudioDirectory();
        
        const files = await FileSystem.readDirectoryAsync(AUDIO_DIR);
        let totalSize = 0;

        for (const file of files) {
          const fileUri = `${AUDIO_DIR}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          
          if (fileInfo.exists && fileInfo.size) {
            totalSize += fileInfo.size;
          }
        }

        return totalSize;
      }
    } catch (error) {
      console.error('❌ [AUDIO-STORAGE] Error getting storage size:', error);
      return 0;
    }
  }

  /**
   * Obtient le nombre de fichiers audio stockés
   */
  static async getAudioCount(): Promise<number> {
    try {
      if (Platform.OS === 'web') {
        const db = await initIndexedDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        return await new Promise<number>((resolve, reject) => {
          const request = store.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      } else {
        if (!FileSystem) return 0;
        
        await ensureAudioDirectory();
        const files = await FileSystem.readDirectoryAsync(AUDIO_DIR);
        return files.length;
      }
    } catch (error) {
      console.error('❌ [AUDIO-STORAGE] Error getting audio count:', error);
      return 0;
    }
  }
}
