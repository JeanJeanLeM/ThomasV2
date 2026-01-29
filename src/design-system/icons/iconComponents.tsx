/**
 * Icon Components - Individual Ionicons wrappers
 *
 * Composants d'icônes utilisés partout dans l'app.
 * Basés sur @expo/vector-icons / Ionicons.
 */

import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export interface IconProps {
  color?: string;
  size?: number;
}

// Icônes de profil utilisateur
export const UserIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="person-outline" size={size} color={color} />
);

export const BuildingOfficeIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="business-outline" size={size} color={color} />
);

export const UsersIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="people-outline" size={size} color={color} />
);

export const ArrowRightOnRectangleIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="log-out-outline" size={size} color={color} />
);

export const CogIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="settings-outline" size={size} color={color} />
);

export const QuestionMarkCircleIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="help-circle-outline" size={size} color={color} />
);

export const BellIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="notifications-outline" size={size} color={color} />
);

// Icônes agriculture et navigation
export const MapIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="map-outline" size={size} color={color} />
);

export const WrenchScrewdriverIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="construct-outline" size={size} color={color} />
);

export const ClipboardDocumentListIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="clipboard-outline" size={size} color={color} />
);

export const MicrophoneIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="mic-outline" size={size} color={color} />
);

export const PlusIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="add-outline" size={size} color={color} />
);

export const TruckIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="car-outline" size={size} color={color} />
);

export const TrashIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="trash-outline" size={size} color={color} />
);

export const ArrowsRightLeftIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="swap-horizontal-outline" size={size} color={color} />
);

export const CalculatorIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="calculator-outline" size={size} color={color} />
);

export const PencilIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="create-outline" size={size} color={color} />
);

export const ChevronRightIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="chevron-forward-outline" size={size} color={color} />
);

export const ChevronLeftIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="chevron-back-outline" size={size} color={color} />
);

export const CalendarIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="calendar-outline" size={size} color={color} />
);

export const ClockIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="time-outline" size={size} color={color} />
);

export const SproutIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="leaf-outline" size={size} color={color} />
);

export const EditIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="create-outline" size={size} color={color} />
);

export const AlertTriangleIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="warning-outline" size={size} color={color} />
);

export const EyeIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="eye-outline" size={size} color={color} />
);

export const CameraIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="camera-outline" size={size} color={color} />
);

export const ImageIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="image-outline" size={size} color={color} />
);

export const ArrowPathIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="refresh-outline" size={size} color={color} />
);

export const ThermometerIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="thermometer-outline" size={size} color={color} />
);

export const DropletsIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="water-outline" size={size} color={color} />
);

export const MessageCircleIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="chatbubble-outline" size={size} color={color} />
);

export const CheckCircleIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="checkmark-circle-outline" size={size} color={color} />
);

export const InfoIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="information-circle-outline" size={size} color={color} />
);

export const MapPinIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="location-outline" size={size} color={color} />
);

// Icônes pour DropdownSelector
export const ChevronDownIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="chevron-down-outline" size={size} color={color} />
);

export const ChevronUpIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="chevron-up-outline" size={size} color={color} />
);

export const XIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="close-outline" size={size} color={color} />
);

export const SearchIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="search-outline" size={size} color={color} />
);

// Icônes pour les écrans d'aide et support
export const ChatBubbleLeftRightIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="chatbubbles-outline" size={size} color={color} />
);

export const PhoneIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="call-outline" size={size} color={color} />
);

export const EnvelopeIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="mail-outline" size={size} color={color} />
);

export const BookOpenIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="book-outline" size={size} color={color} />
);

export const VideoCameraIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="videocam-outline" size={size} color={color} />
);

export const ExclamationTriangleIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="warning-outline" size={size} color={color} />
);

export const ArrowTopRightOnSquareIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="open-outline" size={size} color={color} />
);

export const InformationCircleIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="information-circle-outline" size={size} color={color} />
);

export const HeartIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="heart-outline" size={size} color={color} />
);

export const ShieldCheckIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="shield-checkmark-outline" size={size} color={color} />
);

export const DocumentTextIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="document-text-outline" size={size} color={color} />
);

export const StarIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="star-outline" size={size} color={color} />
);

export const UserGroupIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="people-outline" size={size} color={color} />
);

export const CodeBracketIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="code-outline" size={size} color={color} />
);

// Icônes pour les documents
export const DocumentIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="document-outline" size={size} color={color} />
);

export const CloudArrowUpIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="cloud-upload-outline" size={size} color={color} />
);

export const CheckmarkIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="checkmark-outline" size={size} color={color} />
);

export const ArrowDownTrayIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="download-outline" size={size} color={color} />
);

export const LanguageIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="language-outline" size={size} color={color} />
);

// Icônes pour le toggle d'affichage (liste/grille)
export const ViewListIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="list-outline" size={size} color={color} />
);

export const ViewGridIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
  <Ionicons name="grid-outline" size={size} color={color} />
);


