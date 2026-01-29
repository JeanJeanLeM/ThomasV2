import React from 'react';
import { View, Image, ViewStyle } from 'react-native';
import { BuildingOfficeIcon } from '../icons';
import { colors } from '../colors';

interface FarmPhotoProps {
  photoUrl?: string | null;
  size?: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export const FarmPhoto: React.FC<FarmPhotoProps> = ({
  photoUrl,
  size = 24,
  style,
  borderRadius = 6,
}) => {
  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...style,
  };

  // Si pas de photo, afficher l'icône par défaut
  if (!photoUrl) {
    return (
      <View style={containerStyle}>
        <BuildingOfficeIcon 
          color={colors.gray[500]} 
          size={Math.round(size * 0.6)} 
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Image
        source={{ uri: photoUrl }}
        style={{
          width: size,
          height: size,
          borderRadius,
        }}
        resizeMode="cover"
        onError={() => {
          // En cas d'erreur de chargement, on pourrait setter un état pour afficher l'icône
          console.warn('Erreur de chargement de la photo de ferme:', photoUrl);
        }}
      />
    </View>
  );
};



