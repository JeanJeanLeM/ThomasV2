// Types pour le système d'icônes - Éviter les cycles d'imports
import { Ionicons } from '@expo/vector-icons';

// Type pour les noms d'icônes Ionicons
export type IconName = keyof typeof Ionicons.glyphMap;

// Mappings d'icônes par catégorie
export const ChatIcons = {
  chat: 'chatbubbles-outline' as IconName,
  message: 'chatbubble-outline' as IconName,
  send: 'send-outline' as IconName,
  archive: 'archive-outline' as IconName,
  delete: 'trash-outline' as IconName,
  search: 'search-outline' as IconName,
} as const;

export const AppIcons = {
  user: 'person-outline' as IconName,
  users: 'people-outline' as IconName,
  settings: 'settings-outline' as IconName,
  logout: 'log-out-outline' as IconName,
  help: 'help-circle-outline' as IconName,
  bell: 'notifications-outline' as IconName,
  home: 'home-outline' as IconName,
  dashboard: 'grid-outline' as IconName,
  tasks: 'list-outline' as IconName,
  profile: 'person-circle-outline' as IconName,
} as const;

export const AgricultureIcons = {
  farm: 'business-outline' as IconName,
  plot: 'map-outline' as IconName,
  material: 'construct-outline' as IconName,
  tractor: 'car-outline' as IconName,
  tool: 'hammer-outline' as IconName,
  conversion: 'swap-horizontal-outline' as IconName,
  calculator: 'calculator-outline' as IconName,
  microphone: 'mic-outline' as IconName,
  document: 'document-text-outline' as IconName,
  documentFile: 'document-outline' as IconName,
  clipboard: 'clipboard-outline' as IconName,
  cloudUpload: 'cloud-upload-outline' as IconName,
  plus: 'add-outline' as IconName,
  edit: 'create-outline' as IconName,
  chevronRight: 'chevron-forward-outline' as IconName,
} as const;

// Union type de toutes les icônes
export type AppIconName =
  | keyof typeof ChatIcons
  | keyof typeof AppIcons 
  | keyof typeof AgricultureIcons;

// Couleurs standardisées
export const IconColors = {
  primary: '#6366f1',
  secondary: '#8b5cf6', 
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  muted: '#6b7280',
  dark: '#374151',
  light: '#9ca3af',
} as const;

export type IconColor = keyof typeof IconColors;

// Tailles standardisées
export const IconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
} as const;

export type IconSize = keyof typeof IconSizes;

// Utilitaires pour sélection automatique d'icônes
export const getIconName = (category: 'chat' | 'app' | 'agriculture', iconKey: string): IconName => {
  switch (category) {
    case 'chat':
      return ChatIcons[iconKey as keyof typeof ChatIcons] || ChatIcons.chat;
    case 'app':
      return AppIcons[iconKey as keyof typeof AppIcons] || AppIcons.home;
    case 'agriculture':
      return AgricultureIcons[iconKey as keyof typeof AgricultureIcons] || AgricultureIcons.farm;
    default:
      return 'ellipse-outline' as IconName;
  }
};