import * as ImagePicker from 'expo-image-picker';
import { Platform, Alert, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { supabase, SUPABASE_CONFIG } from '../utils/supabase';
import { AudioFileService } from './AudioFileService';

export interface MediaResult {
  uri: string;
  type: 'image' | 'video';
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface MediaUploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  filePath?: string;
  audioFileId?: string; // ID de l'enregistrement dans audio_files
  error?: string;
}

export interface AttachedPhoto {
  id: string;
  uri: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  uploadUrl?: string;
  uploadPath?: string;
  isUploaded?: boolean;
}

class MediaService {
  
  /**
   * Vérifier et demander les permissions nécessaires
   */
  async requestPermissions(): Promise<{
    camera: boolean;
    mediaLibrary: boolean;
  }> {
    try {
      const [cameraResult, mediaResult] = await Promise.all([
        ImagePicker.requestCameraPermissionsAsync(),
        ImagePicker.requestMediaLibraryPermissionsAsync(),
      ]);

      return {
        camera: cameraResult.status === 'granted',
        mediaLibrary: mediaResult.status === 'granted',
      };
    } catch (error) {
      console.error('Erreur lors de la demande de permissions:', error);
      return { camera: false, mediaLibrary: false };
    }
  }

  /**
   * Prendre une photo avec l'appareil photo
   */
  async takePhoto(): Promise<MediaResult | null> {
    try {
      // Vérifier les permissions
      const permissions = await this.requestPermissions();
      if (!permissions.camera) {
        Alert.alert(
          'Permission requise',
          'L\'accès à l\'appareil photo est nécessaire pour prendre des photos.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => this.openAppSettings() }
          ]
        );
        return null;
      }

      // Lancer l'appareil photo
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false, // Pas besoin des métadonnées GPS pour les tâches
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      const asset = result.assets[0];
      return this.formatMediaResult(asset);
      
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
      return null;
    }
  }

  /**
   * Sélectionner une image depuis la galerie
   */
  async pickFromGallery(): Promise<MediaResult | null> {
    try {
      // Vérifier les permissions
      const permissions = await this.requestPermissions();
      if (!permissions.mediaLibrary) {
        Alert.alert(
          'Permission requise',
          'L\'accès à la galerie est nécessaire pour sélectionner des photos.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => this.openAppSettings() }
          ]
        );
        return null;
      }

      // Ouvrir la galerie
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      const asset = result.assets[0];
      return this.formatMediaResult(asset);
      
    } catch (error) {
      console.error('Erreur lors de la sélection d\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
      return null;
    }
  }

  /**
   * Sélectionner plusieurs images depuis la galerie
   */
  async pickMultipleFromGallery(maxSelection: number = 5): Promise<MediaResult[]> {
    try {
      // Vérifier les permissions
      const permissions = await this.requestPermissions();
      if (!permissions.mediaLibrary) {
        Alert.alert(
          'Permission requise',
          'L\'accès à la galerie est nécessaire pour sélectionner des photos.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => this.openAppSettings() }
          ]
        );
        return [];
      }

      // Ouvrir la galerie avec sélection multiple (1 à maxSelection)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: maxSelection > 1, // Permettre multiple seulement si maxSelection > 1
        selectionLimit: maxSelection,
        quality: 0.8,
        exif: false,
        allowsEditing: false, // Désactiver l'édition pour la sélection multiple
      });

      if (result.canceled || !result.assets) {
        return [];
      }

      return result.assets.map(asset => this.formatMediaResult(asset));
      
    } catch (error) {
      console.error('Erreur lors de la sélection multiple d\'images:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner les images');
      return [];
    }
  }

  /**
   * Uploader une image vers Supabase Storage
   */
  async uploadImage(
    mediaResult: MediaResult, 
    farmId: number,
    category: 'tasks' | 'observations' | 'chat' | 'documents' = 'tasks'
  ): Promise<MediaUploadResult> {
    try {
      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const extension = this.getFileExtension(mediaResult.fileName || 'image.jpg');
      const fileName = `${category}/${farmId}/${timestamp}_${mediaResult.fileName || `image.${extension}`}`;

      console.log('🔄 [MEDIA] Début upload image:', { 
        uri: mediaResult.uri, 
        mimeType: mediaResult.mimeType,
        farmId,
        category 
      });

      // Convertir l'image en Blob pour React Native Web
      let fileData: Blob | FormData;
      
      if (Platform.OS === 'web') {
        // Pour le web, convertir l'URI en Blob
        console.log('🌐 [MEDIA] Mode web - conversion en Blob');
        const response = await fetch(mediaResult.uri);
        if (!response.ok) {
          throw new Error(`Impossible de récupérer l'image: ${response.statusText}`);
        }
        fileData = await response.blob();
        console.log('✅ [MEDIA] Image convertie en Blob:', fileData.size, 'bytes');
      } else {
        // Pour mobile, utiliser FormData avec URI
        console.log('📱 [MEDIA] Mode mobile - création FormData');
        const formData = new FormData();
        formData.append('file', {
          uri: mediaResult.uri,
          type: mediaResult.mimeType,
          name: fileName,
        } as any);
        fileData = formData;
      }

      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, fileData, {
          cacheControl: '3600',
          upsert: false,
          contentType: mediaResult.mimeType,
        });

      if (error) {
        console.error('❌ [MEDIA] Erreur upload Supabase:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [MEDIA] Upload réussi:', data);

      // Générer l'URL publique
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(data.path);

      console.log('🔗 [MEDIA] URL publique générée:', urlData.publicUrl);

      return {
        success: true,
        fileUrl: urlData.publicUrl,
        fileName: fileName,
        filePath: data.path,
      };
      
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      return { success: false, error: error.message || 'Erreur inconnue' };
    }
  }

  /**
   * Uploader un fichier audio vers Supabase Storage
   */
  async uploadAudioFile(
    audioUri: string,
    farmId: number,
    userId: string,
    category: 'chat' | 'tasks' | 'observations' = 'chat',
    durationSeconds?: number
  ): Promise<MediaUploadResult> {
    try {
      console.log('🔄 [AUDIO] Début upload audio:', { 
        uri: audioUri, 
        farmId,
        category,
        platform: Platform.OS
      });

      // Convertir l'audio en Blob/FormData pour l'upload
      let fileData: Blob | FormData;
      let contentType: string = 'audio/m4a';
      let fileExtension: string = 'm4a';
      let fileSize: number = 0; // Taille du fichier en bytes
      
      if (Platform.OS === 'web') {
        // Pour le web, convertir l'URI en Blob
        console.log('🌐 [AUDIO] Mode web - conversion en Blob');
        const response = await fetch(audioUri);
        if (!response.ok) {
          throw new Error(`Impossible de récupérer l'audio: ${response.statusText}`);
        }
        fileData = await response.blob();
        fileSize = fileData.size; // Obtenir la taille depuis le Blob
        
        // Détecter le type MIME du blob
        contentType = fileData.type || 'audio/webm';
        console.log('📦 [AUDIO] Type MIME détecté:', contentType);
        
        // Déterminer l'extension selon le type
        if (contentType.includes('webm')) {
          fileExtension = 'webm';
        } else if (contentType.includes('mp4') || contentType.includes('m4a')) {
          fileExtension = 'm4a';
        } else if (contentType.includes('wav')) {
          fileExtension = 'wav';
        } else {
          // Par défaut, utiliser webm pour le web
          fileExtension = 'webm';
          contentType = 'audio/webm';
        }
        
        console.log('✅ [AUDIO] Audio converti en Blob:', fileSize, 'bytes', contentType);
      } else {
        // Pour mobile, obtenir la taille du fichier pour validation
        console.log('📱 [AUDIO] Mode mobile - vérification taille fichier...');
        try {
          const fileInfo = await FileSystem.getInfoAsync(audioUri);
          if (!fileInfo.exists) {
            throw new Error('Le fichier audio n\'existe pas sur le système');
          }
          
          // Obtenir la taille depuis FileSystem
          fileSize = fileInfo.size || 0;
          console.log('📊 [AUDIO] Taille fichier obtenue via FileSystem:', fileSize, 'bytes');
          
          // Validation de la taille
          if (fileSize < 1024) {
            console.error('❌ [AUDIO] Fichier audio trop petit:', fileSize, 'bytes');
            throw new Error('Le fichier audio est trop petit (probablement vide). Veuillez réessayer l\'enregistrement.');
          }
          
          if (fileSize > 50 * 1024 * 1024) {
            console.error('❌ [AUDIO] Fichier audio trop volumineux:', fileSize, 'bytes');
            throw new Error('Le fichier audio est trop volumineux (max 50MB). Veuillez raccourcir l\'enregistrement.');
          }
          
          console.log('✅ [AUDIO] Taille fichier valide:', Math.round(fileSize / 1024), 'KB');
        } catch (fsError: any) {
          console.error('❌ [AUDIO] Erreur vérification fichier:', fsError);
          throw new Error(`Impossible de vérifier le fichier audio: ${fsError.message || 'Erreur inconnue'}`);
        }
        
        // Sur mobile, on utilisera FileSystem.uploadAsync() directement avec l'URI
        // Pas besoin de créer FormData
        contentType = 'audio/m4a';
        fileExtension = 'm4a';
        fileData = null as any; // Non utilisé sur mobile, on utilise FileSystem.uploadAsync()
      }

      // Générer un nom de fichier unique avec la bonne extension
      const timestamp = Date.now();
      const uuid = Math.random().toString(36).substring(2, 15);
      const fileName = `${category}/${farmId}/audio/${timestamp}_${uuid}.${fileExtension}`;

      console.log('📤 [AUDIO] Upload vers Supabase:', { fileName, contentType, size: fileSize });

      let uploadResult: { path: string; fullPath: string } | null = null;

      if (Platform.OS === 'web') {
        // Pour le web, utiliser le client Supabase JS
        const { data, error } = await supabase.storage
          .from('photos')
          .upload(fileName, fileData as Blob, {
            cacheControl: '3600',
            upsert: false,
            contentType: contentType,
          });

        if (error) {
          console.error('❌ [AUDIO] Erreur upload Supabase:', error);
          return { success: false, error: error.message };
        }

        uploadResult = {
          path: data.path,
          fullPath: data.path,
        };
        console.log('✅ [AUDIO] Upload réussi (web):', uploadResult);
      } else {
        // Pour mobile, utiliser fetch directement avec FormData (plus fiable que supabase.storage.upload())
        console.log('📱 [AUDIO] Upload via fetch + FormData (mobile)...');
        
        try {
          // Obtenir le token d'authentification
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !sessionData?.session?.access_token) {
            throw new Error('Impossible d\'obtenir le token d\'authentification');
          }
          const accessToken = sessionData.session.access_token;

          // Construire l'URL de l'API Supabase Storage
          // Format: https://<project-ref>.supabase.co/storage/v1/object/<bucket>/<path>
          const supabaseUrl = SUPABASE_CONFIG.url;
          const bucketName = 'photos';
          const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`;

          console.log('🔗 [AUDIO] URL upload:', uploadUrl.substring(0, 80) + '...');

          // Créer FormData pour l'upload
          const formData = new FormData();
          formData.append('file', {
            uri: audioUri,
            type: contentType,
            name: fileName.split('/').pop() || 'audio.m4a',
          } as any);

          // Upload avec fetch
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': SUPABASE_CONFIG.anonKey,
              'x-upsert': 'false',
            },
            body: formData as any,
          });

          console.log('📊 [AUDIO] Réponse upload:', {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('❌ [AUDIO] Erreur upload (status):', uploadResponse.status, errorText);
            throw new Error(`Erreur upload: ${uploadResponse.status} - ${errorText}`);
          }

          // Parser la réponse JSON
          let uploadData: any;
          try {
            const responseText = await uploadResponse.text();
            uploadData = JSON.parse(responseText || '{}');
          } catch (parseError) {
            console.warn('⚠️ [AUDIO] Impossible de parser la réponse JSON, utilisation du path par défaut');
            uploadData = { path: fileName };
          }

          uploadResult = {
            path: uploadData.path || fileName,
            fullPath: uploadData.path || fileName,
          };
          console.log('✅ [AUDIO] Upload réussi (mobile):', uploadResult);
        } catch (uploadError: any) {
          console.error('❌ [AUDIO] Erreur upload mobile:', uploadError);
          return { success: false, error: uploadError.message || 'Erreur upload inconnue' };
        }
      }

      if (!uploadResult) {
        return { success: false, error: 'Aucun résultat d\'upload' };
      }

      // Générer l'URL publique
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(uploadResult.path);

      console.log('🔗 [AUDIO] URL publique générée:', urlData.publicUrl);

      // Créer l'enregistrement dans audio_files
      // fileSize est déjà défini plus haut
      const audioFileResult = await AudioFileService.createAudioFile({
        farm_id: farmId,
        user_id: userId,
        file_name: fileName.split('/').pop() || fileName,
        file_path: uploadResult.path,
        file_size: fileSize,
        mime_type: contentType,
        duration_seconds: durationSeconds || null,
      });

      if (!audioFileResult.success) {
        console.warn('⚠️ [AUDIO] Impossible de créer l\'enregistrement audio_files:', audioFileResult.error);
        // On continue quand même, l'upload a réussi
      }

      return {
        success: true,
        fileUrl: urlData.publicUrl,
        fileName: fileName,
        filePath: uploadResult.path,
        audioFileId: audioFileResult.audioFileId,
      };
      
    } catch (error: any) {
      console.error('❌ [AUDIO] Erreur lors de l\'upload:', error);
      return { success: false, error: error.message || 'Erreur inconnue' };
    }
  }

  /**
   * Créer un objet AttachedPhoto à partir d'un MediaResult
   */
  createAttachedPhoto(mediaResult: MediaResult): AttachedPhoto {
    return {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uri: mediaResult.uri,
      fileName: mediaResult.fileName,
      fileSize: mediaResult.fileSize,
      mimeType: mediaResult.mimeType,
      width: mediaResult.width,
      height: mediaResult.height,
      isUploaded: false,
    };
  }

  /**
   * Uploader plusieurs photos attachées
   */
  async uploadAttachedPhotos(
    photos: AttachedPhoto[], 
    farmId: number,
    category: 'tasks' | 'observations' = 'tasks'
  ): Promise<AttachedPhoto[]> {
    const uploadedPhotos: AttachedPhoto[] = [];

    for (const photo of photos) {
      if (photo.isUploaded) {
        // Déjà uploadée
        uploadedPhotos.push(photo);
        continue;
      }

      try {
        const mediaResult: MediaResult = {
          uri: photo.uri,
          type: 'image',
          fileName: photo.fileName,
          fileSize: photo.fileSize,
          mimeType: photo.mimeType,
          width: photo.width,
          height: photo.height,
        };

        const uploadResult = await this.uploadImage(mediaResult, farmId, category);
        
        if (uploadResult.success) {
          uploadedPhotos.push({
            ...photo,
            uploadUrl: uploadResult.fileUrl,
            uploadPath: uploadResult.filePath,
            isUploaded: true,
          });
        } else {
          console.error(`Erreur upload photo ${photo.fileName}:`, uploadResult.error);
          // Garder la photo même si l'upload échoue, on réessaiera plus tard
          uploadedPhotos.push(photo);
        }
      } catch (error) {
        console.error(`Erreur upload photo ${photo.fileName}:`, error);
        uploadedPhotos.push(photo);
      }
    }

    return uploadedPhotos;
  }

  /**
   * Formater le résultat d'ImagePicker
   */
  private formatMediaResult(asset: ImagePicker.ImagePickerAsset): MediaResult {
    return {
      uri: asset.uri,
      type: asset.type || 'image',
      fileName: asset.fileName || `image_${Date.now()}.jpg`,
      fileSize: asset.fileSize || 0,
      mimeType: asset.mimeType || 'image/jpeg',
      width: asset.width,
      height: asset.height,
    };
  }

  /**
   * Extraire l'extension d'un fichier
   */
  private getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || 'jpg';
  }

  /**
   * Ouvrir les paramètres de l'application
   */
  private openAppSettings(): void {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  /**
   * Formater la taille d'un fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const mediaService = new MediaService();