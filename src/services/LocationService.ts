import * as Location from 'expo-location';
import { Platform, Alert, Linking } from 'react-native';

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  address?: string;
  timestamp: number;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.LocationPermissionResponse['status'];
}

class LocationService {
  
  /**
   * Vérifier et demander les permissions de géolocalisation
   */
  async requestLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      // Vérifier les permissions actuelles
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'granted') {
        return { granted: true, canAskAgain: true, status: existingStatus };
      }

      // Demander les permissions
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      
      return {
        granted: status === 'granted',
        canAskAgain,
        status,
      };
      
    } catch (error) {
      console.error('Erreur lors de la demande de permission de localisation:', error);
      return { granted: false, canAskAgain: false, status: 'denied' };
    }
  }

  /**
   * Obtenir la position actuelle
   */
  async getCurrentLocation(): Promise<LocationResult | null> {
    try {
      // Vérifier les permissions
      const permission = await this.requestLocationPermission();
      
      if (!permission.granted) {
        Alert.alert(
          'Permission requise',
          'L\'accès à la localisation est nécessaire pour partager votre position.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => this.openLocationSettings() }
          ]
        );
        return null;
      }

      // Obtenir la position
      console.log('📍 [LOCATION] Récupération position...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 10,
      });

      // Géocodage inverse pour obtenir l'adresse
      let address: string | undefined;
      try {
        const [addressResult] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (addressResult) {
          address = this.formatAddress(addressResult);
        }
      } catch (geocodeError) {
        console.warn('Erreur géocodage inverse:', geocodeError);
        // Continuer sans adresse
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        altitude: location.coords.altitude || undefined,
        address,
        timestamp: location.timestamp,
      };
      
    } catch (error) {
      console.error('Erreur lors de l\'obtention de la position:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position');
      return null;
    }
  }

  /**
   * Formater l'adresse depuis le géocodage inverse
   */
  private formatAddress(addressComponent: Location.LocationGeocodedAddress): string {
    const parts = [];
    
    if (addressComponent.streetNumber && addressComponent.street) {
      parts.push(`${addressComponent.streetNumber} ${addressComponent.street}`);
    } else if (addressComponent.street) {
      parts.push(addressComponent.street);
    }
    
    if (addressComponent.city) {
      parts.push(addressComponent.city);
    }
    
    if (addressComponent.postalCode) {
      parts.push(addressComponent.postalCode);
    }
    
    if (addressComponent.region) {
      parts.push(addressComponent.region);
    }

    return parts.join(', ') || 'Adresse inconnue';
  }

  /**
   * Générer une URL Google Maps pour la position
   */
  generateMapsUrl(latitude: number, longitude: number): string {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  /**
   * Ouvrir les paramètres de localisation
   */
  private openLocationSettings(): void {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }
}

export const locationService = new LocationService();