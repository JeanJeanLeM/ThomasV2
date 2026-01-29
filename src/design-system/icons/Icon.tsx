/**
 * Icon Component - Wrapper unifié pour Ionicons
 * 
 * Composant wrapper simplifié avec props standardisées,
 * système de couleurs intégré et type safety complet.
 */

import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { IconName, IconColors, IconSizes, IconColor, IconSize } from './types';

export interface IconProps {
  /** Nom de l'icône Ionicons */
  name: IconName;
  /** Taille de l'icône (xs, sm, md, lg, xl) ou nombre personnalisé */
  size?: IconSize | number;
  /** Couleur de l'icône (primary, secondary, etc.) ou hex personnalisé */
  color?: IconColor | string;
  /** Style additionnel */
  style?: any;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  color = 'dark',
  style,
}) => {
  // Résolution de la taille
  const iconSize = typeof size === 'string' ? IconSizes[size] : size;
  
  // Résolution de la couleur
  const iconColor = typeof color === 'string' && color in IconColors 
    ? IconColors[color as IconColor]
    : color;

  return (
    <Ionicons
      name={name}
      size={iconSize}
      color={iconColor}
      style={style}
    />
  );
};

export default Icon;