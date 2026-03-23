import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Linking, Image, ActivityIndicator, Switch, PanResponder } from 'react-native';
import { Text, Card, FarmSelectorModal, SoundWave } from '../design-system/components';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { Ionicons } from '@expo/vector-icons';
import { Chat } from './ChatList';
import { ChatServiceDirect, ChatSession, ChatMessage } from '../services/ChatServiceDirect';
import { AIChatService, AnalyzedAction } from '../services/aiChatService';
import { ChatCacheService } from '../services/ChatCacheService';
import { CropSplitterService } from '../services/CropSplitterService';
import { AIMessage } from './chat/AIMessage';
import { AIResponseWithActions } from './chat/AIResponseWithActions';
import { TypingIndicator } from './chat/TypingIndicator';
import { useFarm } from '../contexts/FarmContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, type ScreenName } from '../contexts/NavigationContext';
import { DirectSupabaseService } from '../services/DirectSupabaseService';
import { ChatPlusMenu, PlusAction } from '../design-system/components/chat/ChatPlusMenu';
import { AttachmentPreview, ChatAttachment } from '../design-system/components/chat/AttachmentPreview';
import { EnrichedMessage } from '../design-system/components/chat/EnrichedMessage';
import { DocumentPickerModal } from '../design-system/components/modals/DocumentPickerModal';
import { TaskEditModal, TaskData } from '../design-system/components/modals/TaskEditModal';
import { ActionEditModal } from './chat/ActionEditModal';
import { ActionData } from './chat/AIResponseWithActions';
import { sanitizeQuantityType } from '../utils/quantityUtils';
import { TaskService } from '../services/TaskService';
import { ObservationService } from '../services/ObservationService';
import { mediaService, AttachedPhoto } from '../services/MediaService';
import { locationService, LocationResult } from '../services/LocationService';
import { Document } from '../services/DocumentService';
import { supabase } from '../utils/supabase';
import { TranscriptionService, TranscriptionResult } from '../services/TranscriptionService';
import { AgricultureGlossaryService } from '../services/AgricultureGlossaryService';
import { TranscriptionCorrectionService, AppliedCorrection } from '../services/TranscriptionCorrectionService';
import { UserPhytosanitaryPreferencesService } from '../services/UserPhytosanitaryPreferencesService';
import { NetworkService } from '../services/NetworkService';
import { OfflineQueueService, PendingMessage } from '../services/OfflineQueueService';
import { AudioStorageService } from '../services/AudioStorageService';
import { SyncService } from '../services/SyncService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { useUnifiedSpeechRecognition } from '../hooks/useUnifiedSpeechRecognition';
import { WebSpeechCorrectionService, WebSpeechContextualCorrection, ExactCorrectionRule } from '../services/WebSpeechCorrectionService';
import type { VocabEntry } from '../services/WebSpeechCorrectionService';
import { OfflineIndicator } from './OfflineIndicator';

// Importation conditionnelle pour éviter les erreurs sur web
let ImagePicker: any = null;
let Audio: any = null;
let FileSystem: any = null;

if (Platform.OS !== 'web') {
  try {
    ImagePicker = require('expo-image-picker');
    Audio = require('expo-av').Audio;
    FileSystem = require('expo-file-system');
  } catch (error) {
    console.warn('Expo modules non disponibles:', error);
  }
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isAI?: boolean;
  isAnalyzing?: boolean;
  analysis_id?: string;
  realMessageId?: string; // UUID réel du message de la DB pour l'analyse
  actions?: any[]; // Actions détectées par l'IA
  hasActions?: boolean;
  helpShortcut?: { screen: string; label: string }; // Card "Aller à..." pour réponses d'aide
  attachments?: any[]; // Pièces jointes du message
  hasAttachments?: boolean;
  confidence?: number;
}

type InputMode = 'vocal_direct' | 'dictation';

interface PendingTranscribedAudio {
  audioAttachment: ChatAttachment;
  audioFileId?: string | null;
  rawText: string;
  correctedText: string;
  appliedCorrections: AppliedCorrection[];
  language?: string;
  // Champs pour la traçabilité de la source de transcription
  source?: 'whisper' | 'web_speech' | 'both';
  webSpeechTranscript?: string;
  whisperTranscript?: string;
}

interface ProcessTranscribedAudioParams {
  text: string | null;
  language?: string;
  audioAttachment: ChatAttachment;
  audioFileId?: string | null;
  tempMessageId: string;
  appliedCorrections?: AppliedCorrection[];
  rawText?: string | null;
}

interface VoiceHelpTag {
  icon: string;
  label: string;
  value: string;
  highlight?: string; // texte à surligner dans la phrase (si différent de value)
  bgColor: string;
  textColor: string;
}

interface VoiceHelpExample {
  shortcutLabel: string;
  category: 'template' | 'action' | 'observation' | 'parametering' | 'question';
  sentence: string;
  essentials: VoiceHelpTag[];
  optional: VoiceHelpTag[];
}

const VOICE_HELP_EXAMPLES: VoiceHelpExample[] = [
  {
    shortcutLabel: 'Template',
    category: 'template',
    sentence: '',
    essentials: [
      { icon: '🏷️', label: 'Action', value: 'action', bgColor: '#fef3c7', textColor: '#92400e' },
      { icon: '🌾', label: 'Culture', value: 'culture', bgColor: '#dcfce7', textColor: '#166534' },
      { icon: '⏱️', label: 'Durée', value: 'durée', bgColor: '#dbeafe', textColor: '#1e40af' },
    ],
    optional: [
      { icon: '📍', label: 'Parcelle', value: 'parcelle', bgColor: '#ccfbf1', textColor: '#0d9488' },
      { icon: '🌱', label: 'Planche', value: 'planche', bgColor: '#f3e8ff', textColor: '#7c3aed' },
      { icon: '👥', label: 'Personnes', value: 'nb personnes', highlight: 'nb personnes', bgColor: '#e0e7ff', textColor: '#4338ca' },
      { icon: '🔢', label: 'Quantité', value: 'quantité', bgColor: '#ffedd5', textColor: '#9a3412' },
      { icon: '📏', label: 'Unité', value: 'unité', bgColor: '#ffedd5', textColor: '#9a3412' },
      { icon: '📦', label: 'Nature', value: 'nature', bgColor: '#ffedd5', textColor: '#9a3412' },
      { icon: '🔧', label: 'Matériel', value: 'matériel', bgColor: '#f1f5f9', textColor: '#475569' },
    ],
  },
  {
    shortcutLabel: 'Traitement',
    category: 'action',
    sentence: "J'ai traité les salades pendant 45 minutes sur la parcelle Est, planche 3, avec 2 personnes.",
    essentials: [
      { icon: '🏷️', label: 'Action', value: 'traiter', bgColor: '#fef3c7', textColor: '#92400e' },
      { icon: '🌾', label: 'Culture', value: 'salades', bgColor: '#dcfce7', textColor: '#166534' },
      { icon: '⏱️', label: 'Durée', value: '45 min', highlight: '45 minutes', bgColor: '#dbeafe', textColor: '#1e40af' },
    ],
    optional: [
      { icon: '📍', label: 'Parcelle', value: 'Parcelle Est', bgColor: '#ccfbf1', textColor: '#0d9488' },
      { icon: '🌱', label: 'Planche', value: 'Planche 3', bgColor: '#f3e8ff', textColor: '#7c3aed' },
      { icon: '👥', label: 'Personnes', value: '2', highlight: '2 personnes', bgColor: '#e0e7ff', textColor: '#4338ca' },
    ],
  },
  {
    shortcutLabel: 'Plantation',
    category: 'action',
    sentence: "J'ai planté 1200 plants de poivrons pendant 3 heures avec le transplanteur.",
    essentials: [
      { icon: '🏷️', label: 'Action', value: 'planter', bgColor: '#fef3c7', textColor: '#92400e' },
      { icon: '🌾', label: 'Culture', value: 'poivrons', bgColor: '#dcfce7', textColor: '#166534' },
      { icon: '⏱️', label: 'Durée', value: '3 heures', bgColor: '#dbeafe', textColor: '#1e40af' },
    ],
    optional: [
      { icon: '📦', label: 'Quantité', value: '1200 plants', bgColor: '#ffedd5', textColor: '#9a3412' },
      { icon: '🔧', label: 'Matériel', value: 'transplanteur', bgColor: '#f1f5f9', textColor: '#475569' },
    ],
  },
  {
    shortcutLabel: 'Désherbage',
    category: 'action',
    sentence: "J'ai désherbé les carottes pendant 1 heure sur la parcelle Nord.",
    essentials: [
      { icon: '🏷️', label: 'Action', value: 'désherber', bgColor: '#fef3c7', textColor: '#92400e' },
      { icon: '🌾', label: 'Culture', value: 'carottes', bgColor: '#dcfce7', textColor: '#166534' },
      { icon: '⏱️', label: 'Durée', value: '1 heure', bgColor: '#dbeafe', textColor: '#1e40af' },
    ],
    optional: [
      { icon: '📍', label: 'Parcelle', value: 'Parcelle Nord', bgColor: '#ccfbf1', textColor: '#0d9488' },
    ],
  },
  {
    shortcutLabel: 'Planification',
    category: 'action',
    sentence: "Demain je dois planter des laitues pendant 2 heures sur la parcelle Nord avec 3 personnes.",
    essentials: [
      { icon: '📅', label: 'Date', value: 'Demain', bgColor: '#e0e7ff', textColor: '#4338ca' },
      { icon: '🏷️', label: 'Action', value: 'planter', bgColor: '#fef3c7', textColor: '#92400e' },
      { icon: '🌾', label: 'Culture', value: 'laitues', bgColor: '#dcfce7', textColor: '#166534' },
      { icon: '⏱️', label: 'Durée', value: '2 heures', bgColor: '#dbeafe', textColor: '#1e40af' },
    ],
    optional: [
      { icon: '📍', label: 'Parcelle', value: 'parcelle Nord', bgColor: '#ccfbf1', textColor: '#0d9488' },
      { icon: '👥', label: 'Personnes', value: '3 personnes', bgColor: '#e0e7ff', textColor: '#4338ca' },
    ],
  },
  {
    shortcutLabel: 'Param parcelle',
    category: 'parametering',
    sentence: "Crée une parcelle Maraîchage Nord avec 8 planches de 25 mètres.",
    essentials: [
      { icon: '🗺️', label: 'Action', value: 'Crée', bgColor: '#fef3c7', textColor: '#92400e' },
      { icon: '📍', label: 'Type', value: 'parcelle', bgColor: '#ccfbf1', textColor: '#0d9488' },
      { icon: '🏷️', label: 'Nom', value: 'Maraîchage Nord', bgColor: '#dcfce7', textColor: '#166534' },
    ],
    optional: [
      { icon: '🌱', label: 'Planches', value: '8 planches', bgColor: '#f3e8ff', textColor: '#7c3aed' },
      { icon: '📐', label: 'Dimensions', value: '25 mètres', bgColor: '#dbeafe', textColor: '#1e40af' },
    ],
  },
  {
    shortcutLabel: 'Param matériel',
    category: 'parametering',
    sentence: "Ajoute un matériel Motoculteur Honda F560 dans la catégorie Préparation du sol.",
    essentials: [
      { icon: '🔧', label: 'Action', value: 'Ajoute', bgColor: '#fef3c7', textColor: '#92400e' },
      { icon: '🛠️', label: 'Type', value: 'matériel', bgColor: '#f1f5f9', textColor: '#475569' },
      { icon: '🏷️', label: 'Nom', value: 'Motoculteur', bgColor: '#dcfce7', textColor: '#166534' },
    ],
    optional: [
      { icon: '🏭', label: 'Modèle', value: 'Honda F560', bgColor: '#e0e7ff', textColor: '#4338ca' },
      { icon: '📂', label: 'Catégorie', value: 'Préparation du sol', bgColor: '#ffedd5', textColor: '#9a3412' },
    ],
  },
  {
    shortcutLabel: 'Param conversion',
    category: 'parametering',
    sentence: "Crée une conversion : 1 caisse de tomates équivaut à 12 kg.",
    essentials: [
      { icon: '📐', label: 'Action', value: 'conversion', bgColor: '#fef3c7', textColor: '#92400e' },
      { icon: '📦', label: 'Contenant', value: '1 caisse', bgColor: '#ffedd5', textColor: '#9a3412' },
      { icon: '🌾', label: 'Nature', value: 'tomates', bgColor: '#dcfce7', textColor: '#166534' },
    ],
    optional: [
      { icon: '🔄', label: 'Équivalent', value: '12 kg', bgColor: '#dbeafe', textColor: '#1e40af' },
    ],
  },
  {
    shortcutLabel: 'Obs ravageurs',
    category: 'observation',
    sentence: "J'ai observé des pucerons sur les laitues dans la parcelle Tunnel, gravité moyenne.",
    essentials: [
      { icon: '👁️', label: 'Action', value: 'observé', bgColor: '#fef3c7', textColor: '#92400e' },
      { icon: '🌾', label: 'Culture', value: 'laitues', bgColor: '#dcfce7', textColor: '#166534' },
      { icon: '🐛', label: 'Problème', value: 'pucerons', bgColor: '#fee2e2', textColor: '#991b1b' },
    ],
    optional: [
      { icon: '📍', label: 'Parcelle', value: 'parcelle Tunnel', bgColor: '#ccfbf1', textColor: '#0d9488' },
      { icon: '⚠️', label: 'Gravité', value: 'moyenne', bgColor: '#e0e7ff', textColor: '#4338ca' },
    ],
  },
  {
    shortcutLabel: 'Obs maladie',
    category: 'observation',
    sentence: "J'ai observé du mildiou sur les tomates dans la serre 2, gravité élevée.",
    essentials: [
      { icon: '👁️', label: 'Action', value: 'observé', bgColor: '#fef3c7', textColor: '#92400e' },
      { icon: '🌾', label: 'Culture', value: 'tomates', bgColor: '#dcfce7', textColor: '#166534' },
      { icon: '🦠', label: 'Problème', value: 'mildiou', bgColor: '#fee2e2', textColor: '#991b1b' },
    ],
    optional: [
      { icon: '📍', label: 'Parcelle', value: 'serre 2', bgColor: '#ccfbf1', textColor: '#0d9488' },
      { icon: '⚠️', label: 'Gravité', value: 'élevée', bgColor: '#e0e7ff', textColor: '#4338ca' },
    ],
  },
  {
    shortcutLabel: 'Vente',
    category: 'action',
    sentence: "J'ai vendu 4 caisses de tomates à Bernard à 20 euros la caisse, paiement dimanche.",
    essentials: [
      { icon: '💰', label: 'Action', value: 'vendu', bgColor: '#fef3c7', textColor: '#92400e' },
      { icon: '🌾', label: 'Nature', value: 'tomates', bgColor: '#dcfce7', textColor: '#166534' },
      { icon: '📦', label: 'Quantité', value: '4 caisses', bgColor: '#ffedd5', textColor: '#9a3412' },
    ],
    optional: [
      { icon: '👤', label: 'Client', value: 'Bernard', bgColor: '#dbeafe', textColor: '#1e40af' },
      { icon: '💶', label: 'Prix', value: '20 euros la caisse', bgColor: '#d1fae5', textColor: '#047857' },
      { icon: '📅', label: 'Paiement', value: 'dimanche', bgColor: '#fef3c7', textColor: '#92400e' },
    ],
  },
  {
    shortcutLabel: 'Question',
    category: 'question',
    sentence: "Quelle dose de traitement recommandes-tu pour les tomates contre le mildiou ?",
    essentials: [
      { icon: '❓', label: 'Type', value: 'Quelle dose', bgColor: '#ede9fe', textColor: '#6d28d9' },
      { icon: '🌾', label: 'Culture', value: 'tomates', bgColor: '#dcfce7', textColor: '#166534' },
      { icon: '🦠', label: 'Sujet', value: 'mildiou', bgColor: '#fee2e2', textColor: '#991b1b' },
    ],
    optional: [
      { icon: '🧪', label: 'Action', value: 'traitement', bgColor: '#dbeafe', textColor: '#1e40af' },
    ],
  },
];

const VOICE_HELP_CATEGORY_STYLES: Record<
  VoiceHelpExample['category'],
  {
    label: string;
    activeBg: string;
    activeBorder: string;
    activeText: string;
    inactiveBg: string;
    inactiveBorder: string;
    inactiveText: string;
  }
> = {
  template: {
    label: 'Template',
    activeBg: '#ecfeff',
    activeBorder: '#a5f3fc',
    activeText: '#0e7490',
    inactiveBg: '#f8fafc',
    inactiveBorder: '#e2e8f0',
    inactiveText: '#64748b',
  },
  action: {
    label: 'Action',
    activeBg: '#dcfce7',
    activeBorder: '#86efac',
    activeText: '#166534',
    inactiveBg: '#f0fdf4',
    inactiveBorder: '#bbf7d0',
    inactiveText: '#15803d',
  },
  observation: {
    label: 'Observation',
    activeBg: '#fef3c7',
    activeBorder: '#fcd34d',
    activeText: '#92400e',
    inactiveBg: '#fffbeb',
    inactiveBorder: '#fde68a',
    inactiveText: '#b45309',
  },
  parametering: {
    label: 'Paramétrage',
    activeBg: '#e5e7eb',
    activeBorder: '#9ca3af',
    activeText: '#374151',
    inactiveBg: '#f3f4f6',
    inactiveBorder: '#d1d5db',
    inactiveText: '#4b5563',
  },
  question: {
    label: 'Question',
    activeBg: '#dbeafe',
    activeBorder: '#93c5fd',
    activeText: '#1d4ed8',
    inactiveBg: '#eff6ff',
    inactiveBorder: '#bfdbfe',
    inactiveText: '#2563eb',
  },
};

interface ChatConversationProps {
  chat: Chat | null;
  onUpdateChat: (chatId: string, updates: Partial<Chat>) => void;
  onGoBack?: () => void;
  onFarmSelector?: () => void;
}

// Fonction pour adapter ChatMessage vers Message pour l'UI
function adaptChatMessageToMessage(chatMessage: ChatMessage): Message {
  // Extraire les actions et pièces jointes des métadonnées si présentes
  const metadata = chatMessage.metadata as any || {};
  let actions = metadata.actions || [];
  
  // Mapper les actions pour s'assurer que la date est dans extracted_data.date
  actions = actions.map((action: any) => {
    // Si la date est dans action_data.date mais pas dans extracted_data.date, l'ajouter
    if (action.action_data?.date && !action.extracted_data?.date) {
      if (!action.extracted_data) {
        action.extracted_data = {};
      }
      action.extracted_data.date = action.action_data.date;
      console.log(`📅 [adaptChatMessage] Date ajoutée depuis action_data.date: ${action.action_data.date}`);
    }
    
    // Log pour déboguer
    if (action.action_type === 'task_planned') {
      console.log(`📅 [adaptChatMessage] Action ${action.id} (task_planned):`, {
        'action_data.date': action.action_data?.date,
        'extracted_data.date': action.extracted_data?.date,
        'extracted_data': action.extracted_data
      });
    }
    
    return action;
  });
  
  const hasActions = metadata.has_actions || actions.length > 0;
  const attachments = metadata.attachments || [];
  const hasAttachments = metadata.has_attachments || attachments.length > 0;
  const analysisId = metadata.analysis_id;
  const helpShortcut = metadata.help_shortcut as { screen: string; label: string } | undefined;

  return {
    id: chatMessage.id,
    text: chatMessage.content,
    isUser: chatMessage.role === 'user',
    timestamp: new Date(chatMessage.created_at),
    isAI: chatMessage.role === 'assistant',
    isAnalyzing: false,
    realMessageId: chatMessage.id, // UUID réel pour l'analyse
    actions: actions,
    hasActions: hasActions,
    helpShortcut: helpShortcut,
    attachments: attachments,
    hasAttachments: hasAttachments,
    confidence: chatMessage.ai_confidence || metadata.confidence,
    analysis_id: analysisId
  };
}

export default function ChatConversation({ 
  chat, 
  onUpdateChat, 
  onGoBack, 
  onFarmSelector = () => console.warn('⚠️ [CHAT-CONVERSATION] onFarmSelector not provided - using default noop function')
}: ChatConversationProps) {
  const { activeFarm } = useFarm();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true); // Nouvel état pour le chargement des messages
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>('');
  // Utiliser directement user?.id au lieu de currentUserId
  const currentUserId = user?.id || null;
  
  // Hooks pour le mode offline
  const networkStatus = useNetworkStatus();
  const { messages: pendingMessages, refreshQueue } = useOfflineQueue();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [pendingTranscribedAudio, setPendingTranscribedAudio] = useState<PendingTranscribedAudio | null>(null);
  const [isTranscriptionAutocorrectEnabled, setIsTranscriptionAutocorrectEnabled] = useState(true);
  const [showVoiceHelpOverlay, setShowVoiceHelpOverlay] = useState(false);
  const [voiceHelpExampleIndex, setVoiceHelpExampleIndex] = useState(0);

  // ===== Mode d'enregistrement : Vocal direct (Whisper) ou Dictée (Web Speech en temps réel) =====
  const [inputMode, setInputMode] = useState<InputMode>('vocal_direct');
  // Texte interim Web Speech (affiché en live pendant la dictée, avant validation segment)
  const [webSpeechInterim, setWebSpeechInterim] = useState('');
  // Texte finalisé Web Speech avant que l'utilisateur ne l'envoie (pour metadata raw_transcription)
  const webSpeechFinalizedRef = useRef('');
  // Vocabulaire contextuel pré-calculé pour la correction Web Speech (fuzzy)
  const webSpeechVocabRef = useRef<VocabEntry[]>([]);
  // Règles exactes (phonetic aliases) chargées depuis user_speech_corrections
  const webSpeechExactRulesRef = useRef<ExactCorrectionRule[]>([]);
  // Corrections contextuelles accumulées sur la session de dictée en cours
  const webSpeechCorrectionsRef = useRef<WebSpeechContextualCorrection[]>([]);

  const webSpeech = useUnifiedSpeechRecognition({
    language: 'fr-FR',
    onFinalSegment: (_segment, fullFinalized) => {
      // Appliquer la correction contextuelle sur le texte finalisé complet
      let displayText = fullFinalized;
      if (webSpeechVocabRef.current.length > 0 || webSpeechExactRulesRef.current.length > 0) {
        const result = WebSpeechCorrectionService.correct(
          fullFinalized,
          webSpeechVocabRef.current,
          webSpeechExactRulesRef.current
        );
        if (result.corrections.length > 0) {
          displayText = result.correctedText;
          // Accumuler les corrections pour les métadonnées
          webSpeechCorrectionsRef.current = [
            ...webSpeechCorrectionsRef.current,
            ...result.corrections,
          ];
        }
      }

      // Mettre à jour le ref brut (avant correction) + l'input (après correction)
      webSpeechFinalizedRef.current = fullFinalized;
      setInputText(displayText);
      setWebSpeechInterim('');
      // Recalculer la hauteur de l'input
      const lineCount = displayText
        .split('\n')
        .reduce((acc: number, line: string) => acc + Math.max(1, Math.ceil(line.length / 60)), 0);
      const computedHeight = Math.min(
        MAX_INPUT_HEIGHT,
        Math.max(MIN_INPUT_HEIGHT, lineCount * LINE_HEIGHT + 16)
      );
      setInputHeight(computedHeight);
    },
    onInterim: (interim) => {
      setWebSpeechInterim(interim);
    },
    onStop: () => {
      setWebSpeechInterim('');
    },
    onError: (error) => {
      console.error('❌ [WEB-SPEECH] Erreur reconnaissance:', error);
      if (error !== 'no-speech') {
        Alert.alert('Erreur dictée', `La reconnaissance vocale a rencontré une erreur : ${error}`);
      }
    },
  });

  // Fonction unifiée pour scroller vers le bas
  const scrollToBottom = (animated: boolean = true, delay: number = 100) => {
    // Annuler le scroll précédent pour éviter les conflits
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      try {
        scrollViewRef.current?.scrollToEnd({ animated });
        
        // Double-check après un court délai pour s'assurer que le scroll a bien eu lieu
        // (utile si le contenu change pendant le scroll)
        if (!animated) {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }, 50);
        }
      } catch (error) {
        console.warn('⚠️ [SCROLL] Erreur scroll vers le bas:', error);
      }
    }, delay);
  };

  // Fonction pour mettre à jour les métadonnées du message en DB
  const updateMessageMetadata = async (messageId: string, updatedActions: any[]) => {
    try {
      console.log('🔄 [METADATA] Mise à jour métadonnées message:', messageId);
      
      const metadata = {
        actions: updatedActions,
        has_actions: updatedActions.length > 0,
        analysis_id: updatedActions[0]?.analysis_id || null
      };

      await DirectSupabaseService.directUpdate(
        'chat_messages',
        { metadata: metadata },
        [{ column: 'id', value: messageId }]
      );

      console.log('✅ [METADATA] Métadonnées message mises à jour en DB');
    } catch (error) {
      console.error('❌ [METADATA] Erreur mise à jour métadonnées:', error);
    }
  };
  
  // Pagination
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const MESSAGES_PER_PAGE = 20;

  // États pour le menu du bouton plus
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionData | undefined>();
  
  // États pour les pièces jointes en brouillon
  const [draftAttachments, setDraftAttachments] = useState<ChatAttachment[]>([]);

  // États pour l'enregistrement audio
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const recording = useRef<any>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingDurationInterval = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs pour l'enregistrement web (MediaRecorder API)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Constantes pour l'enregistrement
  const MAX_RECORDING_DURATION = 5 * 60; // 5 minutes en secondes
  const RECORDING_WARNING_DURATION = 4.5 * 60; // 4:30 en secondes

  // L'aide vocale couvre les messages uniquement pendant l'enregistrement/dictée.
  useEffect(() => {
    if (!isRecording) {
      setShowVoiceHelpOverlay(false);
    }
  }, [isRecording]);

  useEffect(() => {
    if (!navigation.voiceHelpEnabled) {
      setShowVoiceHelpOverlay(false);
    }
  }, [navigation.voiceHelpEnabled]);

  // Fonction centralisée pour réinitialiser l'état audio
  const resetAudioState = () => {
    console.log('🧹 [AUDIO] Réinitialisation état audio...');
    
    // Arrêter timer de durée
    if (recordingDurationInterval.current) {
      clearInterval(recordingDurationInterval.current);
      recordingDurationInterval.current = null;
    }
    
    // Arrêter timeout d'enregistrement
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    // Nettoyer refs mobile
    if (recording.current) {
      try {
        recording.current.stopAndUnloadAsync().catch(() => {});
      } catch (error) {
        console.warn('⚠️ [AUDIO] Erreur cleanup recording mobile:', error);
      }
      recording.current = null;
    }
    
    // Nettoyer refs web
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch (error) {
        console.warn('⚠️ [AUDIO] Erreur arrêt MediaRecorder:', error);
      }
      mediaRecorderRef.current = null;
    }
    
    audioChunksRef.current = [];
    
    // Arrêter stream web
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      } catch (error) {
        console.warn('⚠️ [AUDIO] Erreur arrêt stream:', error);
      }
      audioStreamRef.current = null;
    }
    
    // Reset états
    setIsRecording(false);
    setRecordingDuration(0);
    
    console.log('✅ [AUDIO] État audio réinitialisé');
  };

  // État pour la hauteur dynamique du TextInput multiline
  const [inputHeight, setInputHeight] = useState(40);
  const MIN_INPUT_HEIGHT = 40;
  const MAX_INPUT_HEIGHT = 136; // 5 lignes (24px * 5 + 16px padding)
  const LINE_HEIGHT = 24;

  // Configuration d'enregistrement audio
  const getRecordingOptions = () => {
    if (!Audio) return null;
    
    // IMPORTANT: Android force parfois AMR-NB (audio/3gpp) qui n'est PAS supporté par Whisper
    // On utilise des valeurs numériques explicites pour forcer AAC
    // AndroidOutputFormat.MPEG_4 = 2, AndroidAudioEncoder.AAC = 3
    return {
      android: {
        extension: '.m4a',
        outputFormat: 2, // MPEG_4 (forcer AAC, pas AMR-NB)
        audioEncoder: 3, // AAC (pas AMR_NB qui est 1)
        sampleRate: 16000, // 16kHz recommandé par Whisper pour la voix
        numberOfChannels: 1, // Mono pour réduire la taille
        bitRate: 64000, // Bitrate optimal pour la voix
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
        audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    };
  };

  // Démarrer la dictée (Web Speech sur navigateur, ExpoSpeechRecognition sur mobile)
  const startDictation = () => {
    if (!webSpeech.isDictationAvailable) {
      Alert.alert(
        'Non disponible',
        'La dictée en temps réel nécessite Chrome ou Edge sur navigateur, ou un development build sur téléphone.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (pendingTranscribedAudio) {
      setPendingTranscribedAudio(null);
    }

    // Réinitialiser le texte brut Web Speech pour cette session (pas l'inputText existant)
    webSpeechFinalizedRef.current = '';
    webSpeechCorrectionsRef.current = [];
    setWebSpeechInterim('');
    // Vider aussi l'input pour accumuler uniquement le transcript de cette session
    setInputText('');
    setInputHeight(MIN_INPUT_HEIGHT);

    console.log('🎙️ [DICTATION] Démarrage dictée Web Speech...');
    webSpeech.start();
    setIsRecording(true);
    if (navigation.voiceHelpEnabled) {
      setVoiceHelpExampleIndex(0);
      setShowVoiceHelpOverlay(true);
    }
  };

  // Arrêter la dictée Web Speech
  const stopDictation = () => {
    console.log('🛑 [DICTATION] Arrêt dictée Web Speech...');
    webSpeech.stop();
    setIsRecording(false);
    setWebSpeechInterim('');
  };

  // Démarrer l'enregistrement audio
  const startRecording = async () => {
    try {
      // PROTECTION: Vérifier qu'aucun enregistrement n'est déjà en cours
      if (isRecording) {
        console.warn('⚠️ [AUDIO] Enregistrement déjà en cours, ignore le double appel');
        return;
      }

      if (pendingTranscribedAudio) {
        setPendingTranscribedAudio(null);
      }

      // PROTECTION: Nettoyer tout timeout/interval restant (sécurité)
      if (recordingTimeoutRef.current) {
        console.warn('⚠️ [AUDIO] Timeout restant détecté, nettoyage préventif');
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      if (recordingDurationInterval.current) {
        console.warn('⚠️ [AUDIO] Interval restant détecté, nettoyage préventif');
        clearInterval(recordingDurationInterval.current);
        recordingDurationInterval.current = null;
      }

      console.log('🎤 [AUDIO] Démarrage enregistrement...', { platform: Platform.OS });

      if (Platform.OS === 'web') {
        // Enregistrement web avec MediaRecorder API
        console.log('🌐 [AUDIO] Mode web - utilisation MediaRecorder API');
        
        try {
          // Demander l'accès au microphone
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100,
            } 
          });
          
          console.log('✅ [AUDIO] Permission microphone accordée (web)');
          audioStreamRef.current = stream;

          // Vérifier si MediaRecorder est disponible
          if (!window.MediaRecorder) {
            throw new Error('MediaRecorder API non disponible dans ce navigateur');
          }

          // Sélectionner le meilleur format audio supporté par le navigateur.
          // Ordre de priorité : webm (Chrome/Edge) → mp4 (Safari iOS 14.1+) → aac → laisser le navigateur choisir.
          const MIME_CANDIDATES = ['audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg'];
          const mimeType = MIME_CANDIDATES.find(t => MediaRecorder.isTypeSupported(t)) ?? '';

          console.log('📹 [AUDIO] Création MediaRecorder avec type:', mimeType || '(navigateur choisit)');

          const recorderOptions: MediaRecorderOptions = { audioBitsPerSecond: 128000 };
          if (mimeType) recorderOptions.mimeType = mimeType;

          const mediaRecorder = new MediaRecorder(stream, recorderOptions);

          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          // Écouter les données enregistrées
          mediaRecorder.ondataavailable = (event) => {
            console.log('📦 [AUDIO] Données audio reçues:', event.data.size, 'bytes');
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          // Gérer la fin de l'enregistrement
          mediaRecorder.onstop = () => {
            console.log('🛑 [AUDIO] MediaRecorder arrêté');
            // L'URI sera créée dans stopRecording
          };

          // Démarrer l'enregistrement
          mediaRecorder.start(1000); // Collecter les données toutes les secondes
          console.log('✅ [AUDIO] MediaRecorder démarré (web)');

          setIsRecording(true);
          if (navigation.voiceHelpEnabled) {
            setVoiceHelpExampleIndex(0);
            setShowVoiceHelpOverlay(true);
          }
          setRecordingDuration(0);

          // Démarrer le timer
          recordingDurationInterval.current = setInterval(() => {
            setRecordingDuration(prev => {
              const newDuration = prev + 1;
              
              // Avertissement à 4:30
              if (newDuration === RECORDING_WARNING_DURATION) {
                Alert.alert(
                  'Limite d\'enregistrement',
                  'Votre enregistrement atteindra bientôt la durée maximale (5 minutes). Il sera automatiquement arrêté dans 30 secondes.',
                  [{ text: 'OK' }]
                );
              }
              
              return newDuration;
            });
          }, 1000);
          
          // Timeout de 5 minutes
          recordingTimeoutRef.current = setTimeout(async () => {
            console.warn('⚠️ [AUDIO] Timeout atteint, arrêt automatique');
            
            // CRITIQUE: Nettoyer le timeout AVANT d'appeler sendAudioMessage
            if (recordingTimeoutRef.current) {
              clearTimeout(recordingTimeoutRef.current);
              recordingTimeoutRef.current = null;
            }
            
            Alert.alert(
              'Enregistrement arrêté',
              'La durée maximale d\'enregistrement (5 minutes) a été atteinte. Le message audio a été enregistré.',
              [{ text: 'OK' }]
            );
            await sendAudioMessage();
          }, MAX_RECORDING_DURATION * 1000);

        } catch (error: any) {
          console.error('❌ [AUDIO] Erreur enregistrement web:', error);
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            Alert.alert(
              'Permission requise',
              'L\'accès au microphone est nécessaire. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.',
              [{ text: 'OK' }]
            );
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            Alert.alert(
              'Microphone introuvable',
              'Aucun microphone n\'a été détecté. Veuillez connecter un microphone et réessayer.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Erreur',
              `Impossible de démarrer l'enregistrement: ${error.message || 'Erreur inconnue'}`
            );
          }
          setIsRecording(false);
          return;
        }
      } else {
        // Enregistrement mobile avec expo-av
        if (!Audio) {
          Alert.alert('Erreur', 'Module Audio non disponible');
          return;
        }

        console.log('📱 [AUDIO] Mode mobile - utilisation expo-av');
        
        // Re-vérifier les permissions avant chaque enregistrement
        console.log('🔍 [AUDIO] Vérification permissions actuelles...');
        let permission = await Audio.getPermissionsAsync();
        
        if (permission.status !== 'granted') {
          console.log('🎤 [AUDIO] Permission non accordée, demande permission...');
          permission = await Audio.requestPermissionsAsync();
        } else {
          console.log('✅ [AUDIO] Permission déjà accordée');
        }
        
        if (!permission.granted) {
          Alert.alert(
            'Permission requise',
            'L\'accès au microphone est nécessaire pour enregistrer des messages vocaux.',
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Paramètres', onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }}
            ]
          );
          return;
        }

        // Configurer le mode audio
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const recordingOptions = getRecordingOptions();
        if (!recordingOptions) {
          Alert.alert('Erreur', 'Configuration d\'enregistrement non disponible');
          return;
        }

        console.log('🎤 [AUDIO] Démarrage enregistrement mobile...');
        console.log('🎤 [AUDIO] Options:', JSON.stringify(recordingOptions));
        const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
        
        recording.current = newRecording;
        console.log('✅ [AUDIO] Recording object créé:', !!recording.current);
        
        // Vérifier immédiatement le status
        const initialStatus = await recording.current.getStatusAsync();
        console.log('📊 [AUDIO] Status initial:', {
          canRecord: initialStatus.canRecord,
          isRecording: initialStatus.isRecording,
          durationMillis: initialStatus.durationMillis
        });
        
        setIsRecording(true);
        if (navigation.voiceHelpEnabled) {
          setVoiceHelpExampleIndex(0);
          setShowVoiceHelpOverlay(true);
        }
        setRecordingDuration(0);

        // Démarrer le timer
        recordingDurationInterval.current = setInterval(() => {
          setRecordingDuration(prev => {
            const newDuration = prev + 1;
            
            // Avertissement à 4:30
            if (newDuration === RECORDING_WARNING_DURATION) {
              Alert.alert(
                'Limite d\'enregistrement',
                'Votre enregistrement atteindra bientôt la durée maximale (5 minutes). Il sera automatiquement arrêté dans 30 secondes.',
                [{ text: 'OK' }]
              );
            }
            
            return newDuration;
          });
        }, 1000);
        
        // Timeout de 5 minutes
        recordingTimeoutRef.current = setTimeout(async () => {
          console.warn('⚠️ [AUDIO] Timeout atteint, arrêt automatique');
          Alert.alert(
            'Enregistrement arrêté',
            'La durée maximale d\'enregistrement (5 minutes) a été atteinte. Le message audio a été enregistré.',
            [{ text: 'OK' }]
          );
          await sendAudioMessage();
        }, MAX_RECORDING_DURATION * 1000);

        console.log('✅ [AUDIO] Enregistrement démarré (mobile)');
      }
      
    } catch (error: any) {
      console.error('❌ [AUDIO] Erreur démarrage enregistrement:', error);
      Alert.alert('Erreur', `Impossible de démarrer l'enregistrement: ${error.message || 'Erreur inconnue'}`);
      setIsRecording(false);
      recording.current = null;
      mediaRecorderRef.current = null;
    }
  };

  // Arrêter l'enregistrement
  const stopRecording = async (): Promise<string | null> => {
    try {
      console.log('🛑 [AUDIO] Arrêt enregistrement...', { platform: Platform.OS });

      // CRITIQUE: Arrêter le timeout de 5 minutes AVANT tout
      if (recordingTimeoutRef.current) {
        console.log('🧹 [AUDIO] Nettoyage timeout 5 minutes');
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      // Arrêter le timer de durée
      if (recordingDurationInterval.current) {
        clearInterval(recordingDurationInterval.current);
        recordingDurationInterval.current = null;
      }

      if (Platform.OS === 'web') {
        // Arrêt enregistrement web
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
          console.warn('⚠️ [AUDIO] MediaRecorder déjà arrêté ou non initialisé');
          setIsRecording(false);
          setRecordingDuration(0);
          return null;
        }

        console.log('🌐 [AUDIO] Arrêt MediaRecorder (web)...');
        
        return new Promise((resolve) => {
          if (!mediaRecorderRef.current) {
            resolve(null);
            return;
          }

          // Écouter la fin de l'enregistrement
          mediaRecorderRef.current.onstop = () => {
            console.log('📦 [AUDIO] Création blob audio...');
            
            // Validation: vérifier qu'il y a des chunks
            if (audioChunksRef.current.length === 0) {
              console.error('❌ [AUDIO] Aucune donnée audio enregistrée');
              resetAudioState();
              resolve(null);
              return;
            }
            
            // Créer le blob audio — utiliser le mimeType réel du recorder (peut être vide si le navigateur a choisi)
            const blobType = mediaRecorderRef.current?.mimeType || '';
            const audioBlob = new Blob(audioChunksRef.current, { 
              type: blobType,
            });
            
            console.log('✅ [AUDIO] Blob créé:', audioBlob.size, 'bytes', audioBlob.type);

            // Validation: vérifier la taille minimum
            if (audioBlob.size < 1024) {
              console.error('❌ [AUDIO] Fichier audio trop petit:', audioBlob.size, 'bytes');
              resetAudioState();
              resolve(null);
              return;
            }

            // Créer une URL temporaire pour le blob
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log('🔗 [AUDIO] URL blob créée:', audioUrl);

            // Arrêter le stream
            if (audioStreamRef.current) {
              audioStreamRef.current.getTracks().forEach(track => track.stop());
              audioStreamRef.current = null;
            }

            // Nettoyer
            mediaRecorderRef.current = null;
            audioChunksRef.current = [];
            setIsRecording(false);
            setRecordingDuration(0);

            resolve(audioUrl);
          };

          // Arrêter l'enregistrement
          if (mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          } else {
            // Si déjà arrêté, créer le blob immédiatement
            const audioBlob = new Blob(audioChunksRef.current, { 
              type: mediaRecorderRef.current.mimeType || '',
            });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            if (audioStreamRef.current) {
              audioStreamRef.current.getTracks().forEach(track => track.stop());
              audioStreamRef.current = null;
            }
            
            mediaRecorderRef.current = null;
            audioChunksRef.current = [];
            setIsRecording(false);
            setRecordingDuration(0);
            
            resolve(audioUrl);
          }
        });
      } else {
        // Arrêt enregistrement mobile
        if (!recording.current) {
          console.warn('⚠️ [AUDIO] Recording déjà arrêté ou non initialisé');
          resetAudioState();
          return null;
        }

        console.log('📱 [AUDIO] Arrêt enregistrement mobile...');
        console.log('🔄 [AUDIO] Stratégie multi-fallback pour récupérer l\'URI');
        
        let uri: string | null = null;
        const recordingInstance = recording.current;
        
        // ========== MÉTHODE 1: getURI() après stopAndUnloadAsync() ==========
        try {
          console.log('🛑 [AUDIO] Méthode 1: Appel stopAndUnloadAsync() + getURI()...');
          await recordingInstance.stopAndUnloadAsync();
          console.log('✅ [AUDIO] stopAndUnloadAsync() terminé');
          
          // Vérifier si getURI() existe et l'appeler
          if (typeof recordingInstance.getURI === 'function') {
            console.log('🔍 [AUDIO] Tentative getURI() (méthode synchrone)...');
            uri = recordingInstance.getURI();
            if (uri) {
              console.log('✅ [AUDIO] ✨ URI récupérée via getURI() - Méthode 1 réussie!');
              console.log('📁 [AUDIO] URI:', uri.substring(0, 80) + '...');
            } else {
              console.warn('⚠️ [AUDIO] getURI() retourné null');
            }
          } else {
            console.warn('⚠️ [AUDIO] getURI() non disponible sur ce recording');
          }
        } catch (error) {
          console.error('❌ [AUDIO] Méthode 1 échouée:', error);
        }
        
        // ========== MÉTHODE 2: Valeur de retour de stopAndUnloadAsync() ==========
        if (!uri) {
          try {
            console.log('🔄 [AUDIO] Méthode 2: Vérification valeur de retour stopAndUnloadAsync()...');
            // Note: stopAndUnloadAsync() a déjà été appelé, on ne peut plus obtenir sa valeur de retour
            // Cette méthode ne fonctionnera que si on refait l'appel, mais c'est trop tard
            // On la garde pour référence future si on restructure le code
            console.warn('⚠️ [AUDIO] Méthode 2 ignorée (déjà appelé stopAndUnloadAsync)');
          } catch (error) {
            console.error('❌ [AUDIO] Méthode 2 échouée:', error);
          }
        }
        
        // ========== MÉTHODE 3: Séparer stop() et getStatusAsync().uri ==========
        if (!uri) {
          try {
            console.log('🔄 [AUDIO] Méthode 3: Tentative getStatusAsync() après stop...');
            const statusAfterStop = await recordingInstance.getStatusAsync();
            console.log('📊 [AUDIO] Status après stop:', {
              canRecord: statusAfterStop.canRecord,
              isRecording: statusAfterStop.isRecording,
              isDoneRecording: statusAfterStop.isDoneRecording,
              durationMillis: statusAfterStop.durationMillis,
              uri: statusAfterStop.uri ? 'PRESENT' : 'NULL'
            });
            
            if (statusAfterStop.uri) {
              uri = statusAfterStop.uri;
              console.log('✅ [AUDIO] ✨ URI récupérée via getStatusAsync() - Méthode 3 réussie!');
              console.log('📁 [AUDIO] URI:', uri.substring(0, 80) + '...');
            } else {
              console.warn('⚠️ [AUDIO] getStatusAsync().uri est null après stop');
            }
          } catch (error) {
            console.error('❌ [AUDIO] Méthode 3 échouée:', error);
          }
        }
        
        // ========== MÉTHODE 4: Accès aux propriétés internes ==========
        if (!uri) {
          try {
            console.log('🔄 [AUDIO] Méthode 4: Tentative accès propriétés internes...');
            const internalUri = (recordingInstance as any)._uri || 
                               (recordingInstance as any)._finalUri ||
                               (recordingInstance as any).uri ||
                               null;
            
            if (internalUri) {
              uri = internalUri;
              console.log('✅ [AUDIO] ✨ URI récupérée via propriété interne - Méthode 4 réussie!');
              console.log('📁 [AUDIO] URI:', uri.substring(0, 80) + '...');
            } else {
              console.warn('⚠️ [AUDIO] Aucune propriété interne contenant l\'URI trouvée');
              
              // Debug: afficher toutes les propriétés disponibles
              console.log('🔍 [AUDIO] Propriétés disponibles sur recording:', Object.keys(recordingInstance));
            }
          } catch (error) {
            console.error('❌ [AUDIO] Méthode 4 échouée:', error);
          }
        }
        
        // ========== VALIDATION FINALE ==========
        if (!uri) {
          console.error('❌ [AUDIO] ⛔ TOUTES LES MÉTHODES ONT ÉCHOUÉ');
          console.error('❌ [AUDIO] Impossible de récupérer l\'URI de l\'enregistrement');
          console.error('❌ [AUDIO] Type de recording:', typeof recordingInstance);
          console.error('❌ [AUDIO] Recording instance:', recordingInstance ? 'EXISTS' : 'NULL');
          
          Alert.alert(
            'Erreur d\'enregistrement',
            'L\'enregistrement n\'a pas généré de fichier audio. Cela peut être dû à:\n\n' +
            '• Permissions microphone manquantes\n' +
            '• Enregistrement trop court (minimum 1 seconde)\n' +
            '• Problème avec le microphone\n' +
            '• Incompatibilité de l\'appareil\n\n' +
            'Veuillez vérifier vos paramètres et réessayer.',
            [{ text: 'OK' }]
          );
          
          resetAudioState();
          return null;
        }
        
        console.log('🎉 [AUDIO] URI récupérée avec succès!');
        console.log('📍 [AUDIO] URI complète:', uri);
        
        console.log('✅ [AUDIO] Enregistrement arrêté avec succès');
        console.log('📁 [AUDIO] URI fichier:', uri);
        
        // Vérification existence fichier sur mobile (optionnel car FileSystem peut ne pas être disponible)
        if (Platform.OS !== 'web' && FileSystem) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(uri);
            console.log('📊 [AUDIO] Info fichier:', {
              exists: fileInfo.exists,
              size: fileInfo.size,
              uri: fileInfo.uri
            });
            
            if (!fileInfo.exists) {
              console.error('❌ [AUDIO] Fichier audio introuvable sur le système');
              resetAudioState();
              return null;
            }
            
            if (fileInfo.size < 1024) {
              console.error('❌ [AUDIO] Fichier audio trop petit:', fileInfo.size, 'bytes');
              resetAudioState();
              return null;
            }
          } catch (fsError) {
            console.warn('⚠️ [AUDIO] Impossible de vérifier le fichier (FileSystem non disponible):', fsError);
            // On continue quand même, l'URI est valide
          }
        }
        
        recording.current = null;
        setIsRecording(false);
        setRecordingDuration(0);

        return uri;
      }
    } catch (error: any) {
      console.error('❌ [AUDIO] Erreur arrêt enregistrement:', error);
      Alert.alert('Erreur', `Impossible d'arrêter l'enregistrement: ${error.message || 'Erreur inconnue'}`);
      setIsRecording(false);
      recording.current = null;
      mediaRecorderRef.current = null;
      
      // Nettoyer le stream web si présent
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      
      return null;
    }
  };

  // Annuler l'enregistrement
  const cancelRecording = async () => {
    try {
      console.log('❌ [AUDIO] Annulation enregistrement...', { platform: Platform.OS, inputMode });

      // Si mode dictée : annuler la Web Speech et vider l'input
      if (inputMode === 'dictation') {
        webSpeech.abort();
        setWebSpeechInterim('');
        webSpeechFinalizedRef.current = '';
        webSpeechCorrectionsRef.current = [];
        setInputText('');
        setInputHeight(MIN_INPUT_HEIGHT);
        setIsRecording(false);
        console.log('✅ [DICTATION] Dictée annulée');
        return;
      }

      if (Platform.OS !== 'web') {
        // Mobile: essayer de supprimer le fichier avant nettoyage
        if (recording.current) {
          try {
            const status = await recording.current.getStatusAsync();
            const uri = status.uri;
            
            if (uri) {
              const FileSystem = require('expo-file-system');
              await FileSystem.deleteAsync(uri, { idempotent: true });
              console.log('🗑️ [AUDIO] Fichier supprimé:', uri);
            }
          } catch (error) {
            console.warn('⚠️ [AUDIO] Impossible de supprimer le fichier:', error);
          }
        }
      }

      // Utiliser la fonction centralisée de nettoyage
      resetAudioState();
      console.log('✅ [AUDIO] Enregistrement annulé');

    } catch (error: any) {
      console.error('❌ [AUDIO] Erreur annulation enregistrement:', error);
      // En cas d'erreur, forcer le nettoyage
      resetAudioState();
    }
  };

  // Envoyer le message audio avec transcription automatique
  const sendAudioMessage = async () => {
    // Protection contre les opérations concurrentes
    if (isProcessingAudio) {
      console.warn('⚠️ [AUDIO] Opération audio déjà en cours, ignoré');
      return;
    }

    // Vérifier qu'un enregistrement est en cours (web ou mobile)
    const isRecordingActive = Platform.OS === 'web' 
      ? (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive')
      : recording.current;
    
    if (!chat || !isRecordingActive) {
      console.warn('⚠️ [AUDIO] Aucun enregistrement actif:', { 
        platform: Platform.OS,
        hasRecording: !!recording.current,
        hasMediaRecorder: !!mediaRecorderRef.current,
        mediaRecorderState: mediaRecorderRef.current?.state
      });
      return;
    }

    // Vérifier que l'utilisateur est chargé
    if (!currentUserId) {
      console.error('❌ [AUDIO] User ID non disponible');
      Alert.alert(
        'Erreur', 
        'Impossible d\'identifier l\'utilisateur. Veuillez vous reconnecter.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Activer le verrou pour éviter les opérations concurrentes
    setIsProcessingAudio(true);

    try {
      console.log('📤 [AUDIO] Envoi message audio...', { platform: Platform.OS });
      
      // Arrêter l'enregistrement et récupérer l'URI (retry géré dans stopRecording)
      console.log('🛑 [AUDIO] Arrêt enregistrement avant envoi...');
      const audioUri = await stopRecording();
      
      if (!audioUri) {
        console.error('❌ [AUDIO] URI audio null après stopRecording');
        Alert.alert(
          'Erreur d\'enregistrement', 
          'L\'enregistrement n\'a pas généré de fichier audio. Cela peut être dû à:\n\n' +
          '• Permissions microphone manquantes\n' +
          '• Enregistrement trop court\n' +
          '• Problème avec le microphone\n\n' +
          'Veuillez vérifier vos paramètres et réessayer.',
          [{ text: 'OK' }]
        );
        resetAudioState();
        return;
      }

      console.log('✅ [AUDIO] URI audio récupérée:', audioUri.substring(0, 50) + '...');

      // Vérifier la connexion avant d'uploader
      const isOnline = await NetworkService.isOnline();
      
      if (!isOnline) {
        console.log('📴 [OFFLINE] Mode hors ligne, sauvegarde audio localement');
        
        // Sauvegarder l'audio localement
        const savedAudioUri = await AudioStorageService.saveAudio(audioUri, {
          duration: recordingDuration,
          file_size: 0, // Sera calculé par AudioStorageService
          mime_type: Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a',
          original_uri: audioUri,
        });
        
        // Obtenir la taille du fichier
        let fileSize = 0;
        if (Platform.OS === 'web') {
          try {
            // Sur web, récupérer depuis IndexedDB
            const response = await fetch(audioUri);
            const blob = await response.blob();
            fileSize = blob.size;
          } catch (error) {
            console.warn('⚠️ [OFFLINE] Impossible d\'obtenir la taille du fichier (web):', error);
          }
        } else if (FileSystem) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(savedAudioUri);
            fileSize = fileInfo.size || 0;
          } catch (error) {
            console.warn('⚠️ [OFFLINE] Impossible d\'obtenir la taille du fichier:', error);
          }
        }
        
        // Ajouter à la queue locale
        const queueId = await OfflineQueueService.addMessage({
          type: 'audio',
          session_id: chat.id,
          user_id: currentUserId || '',
          farm_id: activeFarm?.farm_id || 0,
          audio_uri: savedAudioUri,
          audio_metadata: {
            duration: recordingDuration,
            file_size: fileSize,
            mime_type: Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a',
          },
        });
        
        console.log('✅ [OFFLINE] Audio ajouté à la queue:', queueId);
        
        // Créer un message temporaire pour affichage immédiat dans le chat
        const tempAudioMessage: Message = {
          id: queueId, // Utiliser l'ID de la queue pour correspondre avec l'effet
          text: '🎤 Message vocal en attente de synchronisation...',
          isUser: true,
          timestamp: new Date(),
          hasAttachments: true,
          attachments: [{
            id: queueId,
            type: 'audio' as const,
            name: `audio_${Date.now()}.${Platform.OS === 'web' ? 'webm' : 'm4a'}`,
            uri: audioUri, // Utiliser l'URI originale (blob URL) pour l'affichage
            size: fileSize,
          }]
        };
        
        // Ajouter immédiatement à l'UI
        setMessages(prev => {
          // Vérifier si le message n'existe pas déjà
          const exists = prev.some(m => m.id === queueId);
          if (exists) {
            return prev;
          }
          return [...prev, tempAudioMessage];
        });
        
        // Défiler vers le bas
        scrollToBottom(true, 50);
        
        // Rafraîchir la queue (pour mettre à jour le statut)
        await refreshQueue();
        
        // Afficher un message informatif
        Alert.alert(
          'Mode hors ligne',
          'Votre message vocal sera envoyé et transcrit automatiquement dès que la connexion sera rétablie.',
          [{ text: 'OK' }]
        );
        
        resetAudioState();
        return;
      }

      // Uploader l'audio vers Supabase
      console.log('☁️ [AUDIO] Upload audio vers Supabase...');
      
      // Vérifier que la méthode existe
      if (typeof mediaService.uploadAudioFile !== 'function') {
        console.error('❌ [AUDIO] uploadAudioFile n\'est pas une fonction:', typeof mediaService.uploadAudioFile);
        Alert.alert('Erreur', 'La fonctionnalité d\'upload audio n\'est pas disponible');
        return;
      }
      
      const uploadResult = await mediaService.uploadAudioFile(
        audioUri,
        activeFarm?.farm_id || 0,
        currentUserId || '',
        'chat',
        recordingDuration // Durée en secondes
      );

      if (!uploadResult.success || !uploadResult.fileUrl) {
        const errorMsg = uploadResult.error || 'Erreur inconnue';
        console.error('❌ [AUDIO] Upload échoué:', errorMsg);
        Alert.alert(
          'Erreur d\'envoi', 
          `Impossible d\'envoyer l\'audio: ${errorMsg}\n\n` +
          'Vérifiez votre connexion Internet et réessayez.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('✅ [AUDIO] Upload réussi:', uploadResult.fileUrl);
      console.log('💾 [AUDIO] Audio file ID:', uploadResult.audioFileId);

      // Stocker l'audioFileId pour lier les tâches créées
      const audioFileId = uploadResult.audioFileId;

      // 🆕 Créer le message temporaire IMMÉDIATEMENT après l'upload (avant transcription)
      // Cela donne un feedback visuel à l'utilisateur
      const audioAttachment: ChatAttachment = {
        id: `audio_${Date.now()}`,
        type: 'audio',
        name: `audio_${Date.now()}.m4a`,
        uri: audioUri,
        uploadedUri: uploadResult.fileUrl,
        uploaded: true,
      };

      const tempMessageId = `temp-audio-${Date.now()}`;
      const tempMessage: Message = {
        id: tempMessageId,
        text: '🎤 Message vocal',
        isUser: true,
        timestamp: new Date(),
        attachments: [audioAttachment],
        hasAttachments: true,
        isProcessing: true, // Indicateur de traitement en cours
      };

      // Ajouter immédiatement à l'UI pour feedback visuel
      setMessages(prev => [...prev, tempMessage]);
      scrollToBottom(true, 50);

      // 🆕 Transcrire l'audio automatiquement
      console.log('🎙️ [AUDIO] Transcription en cours...');
      
      // Mettre à jour le message avec indicateur de transcription
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessageId
          ? { ...msg, text: '🎤 Message vocal\n⏳ Transcription en cours...' }
          : msg
      ));
      scrollToBottom(true, 50);

      // Charger les noms de produits phytosanitaires de l'utilisateur pour améliorer la transcription
      let productNames: string[] = [];
      try {
        if (user?.id && activeFarm?.farm_id) {
          const userProducts = await UserPhytosanitaryPreferencesService.getUserProducts(
            user.id,
            activeFarm.farm_id
          );
          productNames = userProducts.map(p => p.name);
          console.log('🌿 [AUDIO] Produits phytosanitaires chargés pour transcription:', productNames.length);
        }
      } catch (error) {
        console.warn('⚠️ [AUDIO] Erreur lors du chargement des produits phytosanitaires:', error);
        // Continuer sans les produits si erreur
      }

      let vocabularyTerms: string[] = [];
      try {
        vocabularyTerms = await AgricultureGlossaryService.getCoreTerms();
        console.log('📚 [AUDIO] Termes agricoles chargés:', vocabularyTerms.length);
      } catch (error) {
        console.warn('⚠️ [AUDIO] Erreur chargement glossaire agricole:', error);
      }

      // Utiliser filePath si disponible (plus fiable que l'URL publique)
      let transcription: TranscriptionResult;
      try {
        transcription = await TranscriptionService.transcribeFromUrl(
          uploadResult.fileUrl,
          'fr',
          uploadResult.filePath,
          {
            productNames: productNames.length > 0 ? productNames : undefined,
            vocabularyTerms: vocabularyTerms.length > 0 ? vocabularyTerms : undefined,
          }
        );
      } catch (transcriptionError: any) {
        console.error('❌ [AUDIO] Erreur lors de la transcription:', transcriptionError);
        transcription = {
          success: false,
          error: transcriptionError.message || 'Erreur de transcription',
        };
      }

      const rawTranscriptionText = transcription.text ?? '';
      const rawTrimmedTranscription = rawTranscriptionText.trim();
      const hasRawTranscription = transcription.success && rawTrimmedTranscription.length > 0;

      let correctionOutcome = {
        correctedText: rawTrimmedTranscription,
        appliedCorrections: [] as AppliedCorrection[],
      };

      if (hasRawTranscription && isTranscriptionAutocorrectEnabled) {
        correctionOutcome = TranscriptionCorrectionService.apply(rawTrimmedTranscription);
        if (correctionOutcome.appliedCorrections.length > 0) {
          console.log(
            '🛠️ [AUDIO] Corrections auto appliquées:',
            correctionOutcome.appliedCorrections.map(c => `${c.id} x${c.occurrences}`).join(', ')
          );
          console.log('📝 [AUDIO] Aperçu correction', {
            before: rawTrimmedTranscription.substring(0, 120),
            after: correctionOutcome.correctedText.substring(0, 120),
          });
        } else {
          console.log('ℹ️ [AUDIO] Aucune correction auto appliquée (texte conforme)');
        }
      } else if (!isTranscriptionAutocorrectEnabled) {
        console.log('ℹ️ [AUDIO] Corrections automatiques désactivées');
      }

      const correctedTrimmed = correctionOutcome.correctedText.trim();
      const hasValidTranscription = hasRawTranscription && correctedTrimmed.length > 0;
      const finalTranscriptionText = hasValidTranscription ? correctedTrimmed : rawTrimmedTranscription;
      const appliedCorrections = hasRawTranscription ? correctionOutcome.appliedCorrections : [];

      if (!hasRawTranscription) {
        console.warn('⚠️ [AUDIO] Transcription indisponible ou vide:', transcription.error);
        console.log('📤 [AUDIO] Envoi audio sans transcription');
        await processTranscribedAudio({
          text: null,
          language: transcription.language || 'fr',
          audioAttachment,
          audioFileId,
          tempMessageId,
          appliedCorrections,
          rawText: rawTrimmedTranscription,
        });
        resetAudioState();
        return;
      }

      console.log('✅ [AUDIO] Transcription prête pour édition:', finalTranscriptionText.substring(0, 100));
      if (rawTrimmedTranscription !== finalTranscriptionText) {
        console.log('📝 [AUDIO] Whisper vs texte corrigé', {
          raw: rawTrimmedTranscription,
          corrected: finalTranscriptionText,
        });
      }

      // Retirer le message temporaire (il sera remplacé par l'envoi manuel)
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));

      setPendingTranscribedAudio({
        audioAttachment,
        audioFileId,
        rawText: rawTrimmedTranscription,
        correctedText: finalTranscriptionText,
        appliedCorrections,
        language: transcription.language || 'fr',
      });

      setInputText(finalTranscriptionText);
      const lineCount = finalTranscriptionText
        .split('\n')
        .reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / 60)), 0);
      const computedHeight = Math.min(
        MAX_INPUT_HEIGHT,
        Math.max(MIN_INPUT_HEIGHT, lineCount * LINE_HEIGHT + 16)
      );
      setInputHeight(computedHeight);

      resetAudioState();
      return;

    } catch (error: any) {
      console.error('❌ [AUDIO] Erreur envoi message audio:', error);
      Alert.alert(
        'Erreur', 
        `Impossible d'envoyer le message audio: ${error.message || 'Erreur inconnue'}\n\n` +
        'Veuillez réessayer.',
        [{ text: 'OK' }]
      );
      resetAudioState();
    } finally {
      // Toujours débloquer le verrou à la fin
      setIsProcessingAudio(false);
    }
  };

  // Fonction améliorée pour déterminer si un message nécessite une analyse IA
  // Système hybride : critères élargis + possibilité de forcer l'analyse
  const needsAIAnalysis = (text: string): boolean => {
    const trimmedText = text.trim();
    const lowerText = trimmedText.toLowerCase();
    
    // Messages trop courts = conversationnels
    if (trimmedText.length < 10) {
      return false;
    }
    
    // Critère 0: Questions (intent help) - mots interrogatifs ou point d'interrogation
    const isQuestion = /\?/.test(trimmedText) || /\b(comment|où|quand|pourquoi|quel|quelle|quels|quelles|qui|aide|expliquer)\b/i.test(lowerText);
    
    // Critère 1: Verbes d'action agricole (patterns courants)
    const hasActionVerb = /\b(j'ai|je|fait|faite|effectué|récolté|planté|semé|observé|inspecté|surveillé|vérifié|contrôlé|arrosé|traité|taillé|désherbé|paillé|bâché|installé|posé|enlevé|retiré|vais|prévu|planifie|dois|besoin)\b/i.test(lowerText);
    
    // Critère 2: Contient des chiffres (quantités, durées, etc.)
    const hasNumbers = /\d+/.test(lowerText);
    
    // Critère 3: Mots-clés agricoles spécifiques
    const agricultureKeywords = [
      'parcelle', 'planche', 'serre', 'tunnel', 'voile', 'plein champ',
      'kg', 'gramme', 'litre', 'hectare', 'mètre', 'heure', 'minute',
      'tomate', 'laitue', 'carotte', 'salade', 'chou', 'culture',
      'puceron', 'maladie', 'ravageur', 'dégât', 'problème',
      'conversion', 'caisse', 'panier', 'matériel', 'tracteur', 'outil'
    ];
    const hasAgricultureKeyword = agricultureKeywords.some(keyword => lowerText.includes(keyword));
    
    // Critère 4: Prépositions de contexte agricole
    const hasContext = /\b(sur|dans|pendant|avec|pour|depuis|jusqu'à|entre)\b/i.test(lowerText) && trimmedText.length > 20;
    
    // Déclenchement si:
    // - Question (?, comment, où, etc.)
    // - OU (Verbe d'action OU chiffres) ET message > 15 caractères
    // - OU mot-clé agricole présent
    // - OU (contexte + longueur suffisante)
    return (
      isQuestion ||
      (trimmedText.length > 15 && (hasActionVerb || hasNumbers)) ||
      hasAgricultureKeyword ||
      hasContext
    );
  };

  async function processTranscribedAudio({
    text,
    language,
    audioAttachment,
    audioFileId,
    tempMessageId,
    appliedCorrections,
    rawText,
  }: ProcessTranscribedAudioParams): Promise<void> {
    const hasTranscription = !!(text && text.trim().length > 0);
    const normalizedText = hasTranscription ? text!.trim() : '';
    const messageContent = hasTranscription ? normalizedText : '🎤 Message vocal';

    const attachments = [{
      ...audioAttachment,
      transcription: hasTranscription ? normalizedText : undefined,
    }];

    const serializedCorrections = appliedCorrections?.map(correction => ({
      id: correction.id,
      occurrences: correction.occurrences,
      description: correction.description,
    }));

    const metadata: any = {
      attachments,
      has_attachments: true,
      has_transcription: hasTranscription,
    };

    if (serializedCorrections && serializedCorrections.length > 0) {
      metadata.transcription_corrections = serializedCorrections;
      console.log('🧾 [AUDIO] Corrections enregistrées dans le metadata:', serializedCorrections);
    }

    if (rawText && text && rawText !== text) {
      metadata.raw_transcription = rawText;
    }

    if (audioFileId) {
      try {
        const { AudioFileService } = await import('../services/AudioFileService');
        await AudioFileService.updateAudioFile(
          audioFileId,
          hasTranscription
            ? {
                transcription: normalizedText,
                transcription_language: language || 'fr',
              }
            : {
                transcription: null,
                transcription_language: null,
              }
        );
        console.log('✅ [AUDIO] Métadonnées audio mises à jour');
      } catch (updateError) {
        console.error('❌ [AUDIO] Erreur mise à jour audio_files:', updateError);
      }
    }

    const isTemporaryChat = chat.id.startsWith('temp-');

    if (isTemporaryChat) {
      console.log('⚡ [OPTIMISTIC] Message audio envoyé en mode temporaire');
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessageId
          ? {
              ...msg,
              text: messageContent,
              isProcessing: false,
              attachments,
            }
          : msg
      ));
      return;
    }

    try {
      console.log('💬 [REAL-CHAT] Sending audio message to real chat:', chat.id);

      const dbMessage = await ChatServiceDirect.sendMessage({
        session_id: chat.id,
        role: 'user',
        content: messageContent,
        metadata,
      });

      if (audioFileId && dbMessage.id) {
        const { AudioFileService } = await import('../services/AudioFileService');
        await AudioFileService.updateAudioFile(audioFileId, {
          chat_message_id: dbMessage.id,
        });
        console.log('🔗 [AUDIO] Fichier audio lié au message chat:', dbMessage.id);
      }

      setMessages(prev => prev.map(msg =>
        msg.id === tempMessageId ? adaptChatMessageToMessage(dbMessage) : msg
      ));

      await ChatCacheService.invalidateCache(chat.id);
      console.log('🔄 [CACHE] Invalidated cache after audio message');

      onUpdateChat(chat.id, {
        lastMessage: messageContent,
        timestamp: new Date(),
        messageCount: messages.length + 1,
      });

      scrollToBottom(true);

      if (hasTranscription && needsAIAnalysis(normalizedText)) {
        console.log('🤖 [AUDIO] Analyse IA de la transcription...');
        setIsAnalyzing(true);

        const analysisStatusMessage: Message = {
          id: `analysis-audio-${Date.now()}`,
          text: "🧠 Thomas analyse votre message vocal...\n\n📝 Étape 1/4: Extraction des données agricoles\n⏳ Classification des entités...",
          isUser: false,
          timestamp: new Date(),
          isAnalyzing: true,
        };
        setMessages(prev => [...prev, analysisStatusMessage]);
        scrollToBottom(true, 50);

        try {
          setMessages(prev => prev.map(msg =>
            msg.id === analysisStatusMessage.id
              ? {
                  ...msg,
                  text: "🧠 Thomas analyse votre message vocal...\n\n✅ Étape 1/4: Données extraites\n📊 Étape 2/4: Classification des intentions\n⏳ Identification des actions...",
                }
              : msg
          ));

          const analysisResult = await AIChatService.analyzeMessage(
            dbMessage.id,
            normalizedText,
            chat.id,
            activeFarm?.farm_id
          );

          if (analysisResult.success && analysisResult.actions && analysisResult.actions.length > 0) {
            console.log('✅ [AUDIO] Analyse IA terminée:', analysisResult.actions.length, 'actions détectées');

            setMessages(prev => prev.map(msg =>
              msg.id === analysisStatusMessage.id
                ? {
                    ...msg,
                    text: "🧠 Thomas analyse votre message vocal...\n\n✅ Étape 1/4: Données extraites\n✅ Étape 2/4: Intentions classifiées\n✅ Étape 3/4: Actions générées\n🎯 Finalisation...",
                  }
                : msg
            ));

            const processedActions: any[] = [];
            for (const action of analysisResult.actions) {
              if (CropSplitterService.shouldSplit(action)) {
                const splitActions = CropSplitterService.splitAction(action);
                processedActions.push(...splitActions);
              } else {
                processedActions.push(action);
              }
            }

            const aiResponseContent = `Parfait ! J'ai identifié ${processedActions.length} action${processedActions.length > 1 ? 's' : ''} dans votre message vocal.`;

            const aiMessage: Message = {
              id: `ai-audio-${Date.now()}`,
              text: aiResponseContent,
              isUser: false,
              isAI: true,
              timestamp: new Date(),
              actions: processedActions,
              hasActions: true,
              confidence: analysisResult.confidence,
              analysis_id: analysisResult.analysis_id,
            };

            setMessages(prev => prev.map(msg =>
              msg.id === analysisStatusMessage.id ? aiMessage : msg
            ));

            const aiDbMessage = await ChatServiceDirect.sendMessage({
              session_id: chat.id,
              role: 'assistant',
              content: aiResponseContent,
              ai_confidence: analysisResult.confidence,
              metadata: {
                actions: processedActions,
                has_actions: true,
                analysis_id: analysisResult.analysis_id,
              },
            });

            // Les tâches/observations sont déjà créées par le pipeline server-side.
            // Ici on lie seulement le fichier audio via record_id retourné par le pipeline.
            for (const action of processedActions) {
              try {
                const recordId = action.record_id;
                if (!audioFileId || !recordId) {
                  console.log('ℹ️ [AUDIO] Pas de liaison audio:', { audioFileId, recordId: recordId || 'none', actionType: action.action_type });
                  continue;
                }
                const { DirectSupabaseService } = await import('../services/DirectSupabaseService');
                if (action.action_type === 'observation') {
                  await DirectSupabaseService.directUpdate(
                    'observations',
                    { audio_file_id: audioFileId },
                    [{ column: 'id', value: recordId }]
                  );
                  console.log('🔗 [AUDIO] Observation liée au fichier audio:', recordId);
                } else {
                  await DirectSupabaseService.directUpdate(
                    'tasks',
                    { audio_file_id: audioFileId },
                    [{ column: 'id', value: recordId }]
                  );
                  console.log('🔗 [AUDIO] Tâche liée au fichier audio:', recordId);
                }
              } catch (error) {
                console.error('❌ [AUDIO] Erreur liaison action audio:', error);
              }
            }

            await ChatCacheService.invalidateCache(chat.id);
            scrollToBottom(true);
          } else {
            setMessages(prev => prev.filter(msg => msg.id !== analysisStatusMessage.id));
          }
        } catch (analysisError: any) {
          console.error('❌ [AUDIO] Erreur analyse IA:', analysisError);
          setMessages(prev => prev.filter(msg => msg.id !== analysisStatusMessage.id));
          Alert.alert(
            'Analyse indisponible',
            'L\'analyse automatique n\'a pas pu être effectuée. Votre message vocal a bien été enregistré.',
            [{ text: 'OK' }]
          );
        } finally {
          setIsAnalyzing(false);
        }
      } else {
        console.log('ℹ️ [AUDIO] Pas d\'analyse IA nécessaire pour ce message audio');
      }
    } catch (error: any) {
      console.error('❌ [AUDIO] Erreur envoi message audio:', error);
      Alert.alert('Erreur', `Impossible d'envoyer le message audio: ${error.message || 'Erreur inconnue'}`);
      throw error;
    }
  }

  // Fonction pour analyser rétroactivement un message
  const analyzeMessageRetroactively = async (messageId: string, messageText: string) => {
    if (!chat?.id || !activeFarm?.farm_id || !currentUserId) {
      Alert.alert('Erreur', 'Impossible d\'analyser : informations manquantes');
      return;
    }

    // Vérifier la connexion
    const isOnline = await NetworkService.isOnline();
    if (!isOnline) {
      Alert.alert('Hors ligne', 'L\'analyse nécessite une connexion Internet. Veuillez vous connecter et réessayer.');
      return;
    }

    try {
      console.log('🔄 [RETROACTIVE-ANALYSIS] Analyse rétroactive du message:', messageId);
      setIsAnalyzing(true);

      // Si le message est en attente (offline), créer un message temporaire sur le serveur pour l'analyse
      let actualMessageId = messageId;
      if (messageId.startsWith('offline_') || messageId.startsWith('temp-')) {
        console.log('📤 [RETROACTIVE-ANALYSIS] Message en attente, création message temporaire pour analyse');
        const tempMessage = await ChatServiceDirect.sendMessage({
          session_id: chat.id,
          role: 'user',
          content: messageText
        });
        actualMessageId = tempMessage.id;
        console.log('✅ [RETROACTIVE-ANALYSIS] Message temporaire créé:', actualMessageId);
      }

      // Ajouter message de statut d'analyse
      const analysisStatusMessage: Message = {
        id: `analysis-retro-${Date.now()}`,
        text: "🧠 Thomas analyse votre message...\n\n📝 Étape 1/4: Extraction des données agricoles\n⏳ Classification des entités...",
        isUser: false,
        timestamp: new Date(),
        isAnalyzing: true,
        realMessageId: actualMessageId
      };
      setMessages(prev => [...prev, analysisStatusMessage]);

      // Défiler vers le bas
      scrollToBottom(true);

      // Lancer l'analyse
      const result = await AIChatService.analyzeMessage(actualMessageId, messageText, chat.id, activeFarm?.farm_id);
      console.log('✅ [RETROACTIVE-ANALYSIS] Résultat:', result);

      // Préparer les actions
      const actionsCount = result.actions?.length || 0;
      const aiResponseText = actionsCount > 0 
        ? `Parfait ! J'ai identifié ${actionsCount} action${actionsCount > 1 ? 's' : ''} dans votre message.`
        : `J'ai bien noté votre message.`;

      const actionsWithData = (result.actions || []).map((action: any) => ({
        ...action,
        extracted_data: action.extracted_data || action.action_data?.extracted_data || {},
        decomposed_text: action.decomposed_text || action.action_data?.decomposed_text || action.original_text,
        original_text: action.original_text || action.action_data?.original_text,
        matched_entities: action.matched_entities || action.action_data?.context || {},
      }));

      // 🌱 NOUVEAU : Diviser les actions multi-cultures AVANT affichage
      const expandedActions: AnalyzedAction[] = [];
      for (const action of actionsWithData) {
        if (CropSplitterService.shouldSplit(action)) {
          console.log(`🌱 [RETROACTIVE-ANALYSIS] Division action multi-cultures: ${action.id}`);
          const splitActions = CropSplitterService.splitAction(action);
          expandedActions.push(...splitActions);
        } else {
          expandedActions.push(action);
        }
      }

      console.log(`📊 [RETROACTIVE-ANALYSIS] Actions après expansion: ${expandedActions.length} (avant: ${actionsWithData.length})`);

      // Mettre à jour le message user original avec is_help_request si nécessaire
      if (result.is_help_request) {
        try {
          await DirectSupabaseService.directUpdate(
            'chat_messages',
            {
              metadata: {
                is_help_request: true,
                analysis_id: result.analysis_id,
                analyzed: true
              }
            },
            [{ column: 'id', value: actualMessageId }]
          );
          console.log('✅ [RETROACTIVE-ANALYSIS] Message user marqué comme help_request');
        } catch (updateError) {
          console.error('⚠️ [RETROACTIVE-ANALYSIS] Échec mise à jour metadata user:', updateError);
        }
      }

      // Pour les demandes d'aide, filtrer les actions "help" (ne pas les afficher comme cards)
      const displayableActions = result.is_help_request 
        ? expandedActions.filter(action => action.action_type !== 'help')
        : expandedActions;

      console.log(`📊 [RETROACTIVE-ANALYSIS] Actions affichables: ${displayableActions.length} (après filtrage help)`);

      // Créer un message de réponse dans le chat avec les actions
      const aiResponseMessage = await ChatServiceDirect.sendMessage({
        session_id: chat.id,
        role: 'assistant',
        content: aiResponseText,
        ai_confidence: result.confidence,
        metadata: {
          analysis_id: result.analysis_id,
          actions: displayableActions, // Actions filtrées (sans help)
          actions_count: displayableActions.length,
          has_actions: displayableActions.length > 0, // false pour help
          processing_time_ms: result.processing_time_ms,
          is_help_request: result.is_help_request || false,
          ...(result.help_shortcut && { help_shortcut: result.help_shortcut })
        }
      });

      console.log('✅ [RETROACTIVE-ANALYSIS] Message de réponse créé:', aiResponseMessage.id);

      // Remplacer le message de statut par la réponse finale avec l'ID du serveur
      const finalMessage: Message = {
        id: aiResponseMessage.id,
        text: aiResponseText,
        isUser: false,
        timestamp: new Date(aiResponseMessage.created_at),
        isAI: true,
        hasActions: displayableActions.length > 0, // false pour help
        actions: displayableActions, // Actions filtrées (sans help)
        helpShortcut: result.help_shortcut,
        confidence: result.confidence
      };

      setMessages(prev => prev.map(msg => 
        msg.id === analysisStatusMessage.id ? finalMessage : msg
      ));

      // Défiler vers le bas
      scrollToBottom(true);

    } catch (error) {
      console.error('❌ [RETROACTIVE-ANALYSIS] Erreur:', error);
      Alert.alert('Erreur', 'Impossible d\'analyser ce message');
      
      // Retirer le message d'analyse en cas d'erreur
      setMessages(prev => prev.filter(msg => !msg.id.includes('analysis-retro')));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Fonction pour générer une réponse d'aide simple
  const generateHelpResponse = (userText: string): string => {
    const lowerText = userText.toLowerCase();
    
    if (lowerText.includes('aide') || lowerText.includes('comment')) {
      return "Je suis Thomas, votre assistant agricole ! 🌱\n\nVoici ce que je peux vous aider à faire :\n\n• 📝 Ajouter des tâches réalisées\n• 📅 Planifier de futures tâches\n• 👁️ Enregistrer des observations\n• ⚙️ Configurer l'application\n\nTapez simplement ce que vous avez fait aujourd'hui, par exemple :\n\"J'ai récolté 5kg de tomates\" ou \"J'ai observé des pucerons sur les laitues\"";
    }
    
    if (lowerText.includes('bonjour') || lowerText.includes('salut')) {
      return "Bonjour ! 👋 Comment puis-je vous aider dans votre travail agricole aujourd'hui ?";
    }
    
    return "Je suis là pour vous aider avec vos activités agricoles. Dites-moi ce que vous avez fait ou ce que vous souhaitez planifier ! 🌱";
  };

  // Effet pour scroller au bas quand les messages changent (ouverture de conversation)
  useEffect(() => {
    if (messages.length > 0 && !isInitialLoad) {
      // Scroll automatique après chargement initial des messages
      scrollToBottom(false, 200);
    }
  }, [messages.length, isInitialLoad]);

  // Charger les messages au changement de chat (avec préchargement + cache intelligent)
  const loadMessages = async () => {
    if (!chat?.id) {
      setMessages([]);
      setHasMoreMessages(false);
      setIsLoadingMessages(false);
      return;
    }

    // Démarrer le chargement
    setIsLoadingMessages(true);

    // Vérifier si c'est un chat temporaire
    const isTemporaryChat = chat.id.startsWith('temp-');
    
    if (isTemporaryChat) {
      console.log('⚡ [OPTIMISTIC] Temporary chat detected - showing welcome message only:', chat.id);
      const welcomeMessage: Message = {
        id: 'welcome',
        text: "Bonjour ! Je suis Thomas, votre assistant agricole. Comment puis-je vous aider aujourd'hui ? 🌱",
        isUser: false,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      setHasMoreMessages(false);
      setLoading(false);
      setIsLoadingMessages(false);
      return;
    }

    // ========== STRATÉGIE CACHE-FIRST ==========
    // 1. Charger le cache D'ABORD (toujours disponible, même offline)
    // 2. Afficher le cache immédiatement
    // 3. Vérifier la connexion (attendre que le statut soit déterminé)
    // 4. Si connexion OK, charger les messages frais depuis la DB
    // 5. Si pas de connexion ET pas de cache, afficher message "hors ligne"
    // ================================================================

    // Étape 1: Afficher les messages préchargés si disponibles
    if (chat.preloadedMessages && chat.preloadedMessages.length > 0) {
      console.log('⚡⚡⚡ [INSTANT-DISPLAY] Found', chat.preloadedMessages.length, 'preloaded messages, displaying NOW!');
      // Les actions sont déjà dans metadata, extraites par adaptChatMessageToMessage
      const adaptedPreloadedMessages = chat.preloadedMessages.map(adaptChatMessageToMessage);
      setMessages(adaptedPreloadedMessages);
      setLoading(false);
      setIsLoadingMessages(false);
      scrollToBottom(false, 50);
    } else {
      setLoading(true);
      setIsInitialLoad(true);
    }

    // Étape 2: Charger le cache (toujours disponible, même offline)
    let hasCache = false;
    let cachedMessagesCount = 0;
    try {
      const cachedMessages = await ChatCacheService.getCachedMessages(chat.id);
      
      if (cachedMessages && cachedMessages.length > 0) {
        console.log('⚡ [CACHE-HIT] Found', cachedMessages.length, 'cached messages, displaying');
        // Les actions sont déjà dans metadata, extraites par adaptChatMessageToMessage
        const adaptedCachedMessages = cachedMessages.map(adaptChatMessageToMessage);
        setMessages(adaptedCachedMessages);
        setLoading(false);
        setIsLoadingMessages(false);
        hasCache = true;
        cachedMessagesCount = cachedMessages.length;
        scrollToBottom(false, 100);
      } else {
        console.log('💾 [CACHE-MISS] No cache found for chat:', chat.id);
      }
    } catch (error) {
      console.error('❌ [CACHE] Error loading cache:', error);
    }

    // Étape 3: Vérifier la connexion (en parallèle, ne pas bloquer)
    const checkConnection = async () => {
      try {
        // Attendre que le statut réseau soit déterminé (max 2 secondes)
        let retries = 0;
        const maxRetries = 4;
        while (networkStatus.isLoading && retries < maxRetries) {
          console.log('⏳ [NETWORK] Attente de la détermination du statut réseau...');
          await new Promise(resolve => setTimeout(resolve, 500));
          retries++;
        }
        
        const isOnline = await NetworkService.isOnline();
        
        if (!isOnline) {
          console.log('📴 [OFFLINE] Pas de connexion détectée');
          
          // Si pas de cache ET pas de messages préchargés, afficher message "hors ligne"
          if (!hasCache && (!chat.preloadedMessages || chat.preloadedMessages.length === 0)) {
            console.log('📴 [OFFLINE] Pas de cache, affichage message offline');
            const offlineMessage: Message = {
              id: 'offline',
              text: "📴 Vous êtes actuellement hors ligne.\n\nVos messages seront synchronisés automatiquement dès que la connexion sera rétablie.\n\nVous pouvez continuer à envoyer des messages, ils seront sauvegardés localement.",
              isUser: false,
              timestamp: new Date()
            };
            setMessages([offlineMessage]);
            setHasMoreMessages(false);
            setLoading(false);
            setIsInitialLoad(false);
            setIsLoadingMessages(false);
            return;
          } else {
            console.log('✅ [OFFLINE] Cache ou messages préchargés disponibles, conservation des messages');
            setLoading(false);
            setIsInitialLoad(false);
            setIsLoadingMessages(false);
            return; // Garder les messages du cache/préchargés
          }
        }

        // Étape 4: Connexion OK, charger les messages frais depuis la DB
        console.log('🌐 [DB-LOAD] Connexion OK, chargement messages frais depuis la DB...');
        const { messages: freshMessages, hasMore } = await ChatServiceDirect.getChatMessages(chat.id, MESSAGES_PER_PAGE);
        console.log('✅ [DB-LOAD] Loaded', freshMessages.length, 'fresh messages');
        
        // Les actions sont déjà dans metadata, extraites par adaptChatMessageToMessage
        const adaptedFreshMessages = freshMessages.map(adaptChatMessageToMessage);
        setHasMoreMessages(hasMore);
        
        if (adaptedFreshMessages.length > 0) {
          // Mettre à jour avec les messages frais
          setMessages(adaptedFreshMessages);
          
          // Sauvegarder en cache pour la prochaine fois
          await ChatCacheService.cacheMessages(chat.id, freshMessages);
          console.log('💾 [CACHE-SAVE] Saved', freshMessages.length, 'messages to cache');
          
          scrollToBottom(false, 150);
        } else if (!hasCache && (!chat.preloadedMessages || chat.preloadedMessages.length === 0)) {
          // Pas de messages - afficher message de bienvenue
          const welcomeMessage: Message = {
            id: 'welcome',
            text: "Bonjour ! Je suis Thomas, votre assistant agricole. Comment puis-je vous aider aujourd'hui ? 🌱",
            isUser: false,
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error('❌ [CHAT-CONVERSATION] Error loading messages:', error);
        
        // En cas d'erreur réseau, utiliser le cache si disponible (mode offline)
        if (!hasCache) {
          const cachedMessages = await ChatCacheService.getCachedMessages(chat.id);
          if (cachedMessages && cachedMessages.length > 0) {
            console.log('🔄 [FALLBACK] Using cached messages due to error');
            // Les actions sont déjà dans metadata, extraites par adaptChatMessageToMessage
            const adaptedCachedMessages = cachedMessages.map(adaptChatMessageToMessage);
            setMessages(adaptedCachedMessages);
            hasCache = true;
          } else {
            // Dernier recours: message de bienvenue
            const welcomeMessage: Message = {
              id: 'welcome',
              text: "Bonjour ! Je suis Thomas, votre assistant agricole. Comment puis-je vous aider aujourd'hui ? 🌱",
              isUser: false,
              timestamp: new Date()
            };
            setMessages([welcomeMessage]);
          }
        }
      } finally {
        setLoading(false);
        setIsInitialLoad(false);
        setIsLoadingMessages(false);
      }
    };

    // Lancer la vérification de connexion en arrière-plan
    checkConnection();
  };

  // Charger plus de messages anciens
  const loadMoreMessages = async () => {
    if (!chat?.id || loadingMore || !hasMoreMessages) return;
    
    setLoadingMore(true);
    
    try {
      // Trouver le message le plus ancien pour pagination
      const oldestMessage = messages.find(m => m.id !== 'welcome');
      const beforeDate = oldestMessage?.timestamp?.toISOString();
      
      if (!beforeDate) {
        setHasMoreMessages(false);
        setLoadingMore(false);
        return;
      }
      
      console.log('📜 [CHAT-CONVERSATION] Loading more messages before:', beforeDate);
      const { messages: olderMessages, hasMore } = await ChatServiceDirect.getChatMessages(
        chat.id, 
        MESSAGES_PER_PAGE,
        beforeDate
      );
      
      const adaptedOlderMessages = olderMessages.map(adaptChatMessageToMessage);
      setHasMoreMessages(hasMore);
      
      if (adaptedOlderMessages.length > 0) {
        // Ajouter les anciens messages au début
        setMessages(prev => [...adaptedOlderMessages, ...prev.filter(m => m.id !== 'welcome')]);
      }
    } catch (error) {
      console.error('❌ [CHAT-CONVERSATION] Error loading more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [chat?.id]);

  // Charger le vocabulaire contextuel pour la correction Web Speech
  // (uniquement si Web Speech disponible et ferme active connue)
  useEffect(() => {
    if (!webSpeech.isDictationAvailable || !activeFarm?.farm_id) return;

    let cancelled = false;

    const loadVocab = async () => {
      try {
        console.log('📚 [WEB-SPEECH-VOCAB] Chargement vocabulaire contextuel...');

        // On garde les objets produit pour extraire aussi les speech_aliases
        let userProducts: any[] = [];
        const [glossaryTerms] = await Promise.all([
          AgricultureGlossaryService.getCoreTerms().catch(() => [] as string[]),
          (async () => {
            if (!user?.id) return;
            try {
              userProducts = await UserPhytosanitaryPreferencesService.getUserProducts(
                user.id,
                activeFarm.farm_id
              );
            } catch { /* non bloquant */ }
          })(),
        ]);
        const productNames = userProducts.map((p: any) => p.name as string);

        if (cancelled) return;

        // Récupérer parcelles et cultures depuis le FarmContext (déjà chargées)
        // Note: farmData est accessible via useFarm() mais on ne peut pas appeler
        // des hooks conditionnellement — on passe par activeFarm directement.
        // Les plots sont dans farmData mais ChatConversation n'expose que activeFarm.
        // On charge les noms via PlotService pour avoir aliases + unités.
        let plotNames: string[] = [];
        try {
          const { PlotService } = await import('../services/plotService');
          const plots = await PlotService.getPlotsByFarm(activeFarm.farm_id);
          plotNames = plots.flatMap(p => [
            p.name,
            ...(p.aliases || []),
            ...(p.surfaceUnits || []).map((u: any) => u.name),
            ...(p.surfaceUnits || []).flatMap((u: any) => [u.fullName]),
          ]).filter(Boolean) as string[];
        } catch { /* non bloquant */ }

        if (cancelled) return;

        const vocabEntries = WebSpeechCorrectionService.buildVocabulary({
          products: productNames,
          plots: plotNames,
          glossary: glossaryTerms,
        });

        webSpeechVocabRef.current = vocabEntries;

        // Construire les règles exactes depuis speech_aliases de chaque produit
        const exactRules: ExactCorrectionRule[] = [];
        for (const product of userProducts) {
          if (Array.isArray(product.speech_aliases)) {
            for (const alias of product.speech_aliases) {
              if (alias && alias.trim()) {
                exactRules.push({ alias: alias.trim(), corrected_term: product.name });
              }
            }
          }
        }
        webSpeechExactRulesRef.current = exactRules;

        console.log(
          `✅ [WEB-SPEECH-VOCAB] ${vocabEntries.length} entrées fuzzy + ${exactRules.length} règles exactes`,
          `(produits: ${productNames.length}, parcelles: ${plotNames.length}, glossaire: ${glossaryTerms.length})`
        );
      } catch (err) {
        console.warn('⚠️ [WEB-SPEECH-VOCAB] Erreur chargement vocabulaire:', err);
      }
    };

    loadVocab();
    return () => { cancelled = true; };
  }, [activeFarm?.farm_id, user?.id, webSpeech.isDictationAvailable]);

  // Nettoyer l'enregistrement si l'utilisateur quitte l'écran ou change de chat
  useEffect(() => {
    return () => {
      // CRITIQUE: Nettoyer TOUS les timeouts/intervals même si pas d'enregistrement actif
      // (protection contre les timeouts orphelins)
      if (recordingTimeoutRef.current) {
        console.log('🧹 [AUDIO] Cleanup: nettoyage timeout 5 minutes orphelin');
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      if (recordingDurationInterval.current) {
        console.log('🧹 [AUDIO] Cleanup: nettoyage interval durée orphelin');
        clearInterval(recordingDurationInterval.current);
        recordingDurationInterval.current = null;
      }
      
      // Cleanup: arrêter l'enregistrement si actif
      if (isRecording && recording.current) {
        console.log('🧹 [AUDIO] Cleanup: arrêt enregistrement au démontage');
        cancelRecording();
      }
    };
  }, [isRecording, chat?.id]);

  // Synchronisation automatique quand la connexion revient
  useEffect(() => {
    if (!networkStatus.isConnected) {
      setIsSyncing(false);
      setSyncProgress('');
      return;
    }

    // Attendre un peu pour s'assurer que la connexion est stable
    const timeoutId = setTimeout(async () => {
      const stats = await OfflineQueueService.getStats();
      if (stats.pending > 0 || stats.failed > 0) {
        console.log('🔄 [OFFLINE] Connexion retrouvée, synchronisation automatique...');
        setIsSyncing(true);
        setSyncProgress(`Synchronisation de ${stats.pending} message${stats.pending > 1 ? 's' : ''}...`);
        
        try {
          const result = await SyncService.syncPendingItems();
          if (result.success) {
            console.log('✅ [OFFLINE] Synchronisation automatique réussie');
            setSyncProgress('Rechargement des messages...');
            await refreshQueue();
            // Recharger les messages pour afficher les transcriptions et analyses
            console.log('🔄 [OFFLINE] Rechargement des messages après synchronisation...');
            await loadMessages();
            // Scroll vers les nouveaux messages
            setTimeout(() => scrollToBottom(true, 300), 500);
            setSyncProgress('Synchronisation terminée !');
            setTimeout(() => {
              setIsSyncing(false);
              setSyncProgress('');
            }, 2000);
          } else {
            console.warn('⚠️ [OFFLINE] Synchronisation automatique partielle:', result);
            setSyncProgress('Rechargement des messages...');
            await refreshQueue();
            // Recharger quand même pour afficher les messages synchronisés
            await loadMessages();
            setTimeout(() => scrollToBottom(true, 300), 500);
            setSyncProgress('Synchronisation partielle');
            setTimeout(() => {
              setIsSyncing(false);
              setSyncProgress('');
            }, 2000);
          }
        } catch (error) {
          console.error('❌ [OFFLINE] Erreur synchronisation automatique:', error);
          setSyncProgress('Erreur de synchronisation');
          setTimeout(() => {
            setIsSyncing(false);
            setSyncProgress('');
          }, 3000);
        }
      }
    }, 2000); // Attendre 2 secondes après la reconnexion

    return () => {
      clearTimeout(timeoutId);
    };
  }, [networkStatus.isConnected, refreshQueue]);

  // Afficher les messages en attente dans le chat (texte et audio)
  useEffect(() => {
    if (!chat?.id) return;
    
    const chatPendingMessages = pendingMessages.filter(
      msg => msg.session_id === chat.id && (msg.type === 'text' || msg.type === 'audio') && msg.status === 'pending'
    );
    
    if (chatPendingMessages.length > 0) {
      // Fonction async pour récupérer les URIs audio
      const loadPendingMessages = async () => {
        const pendingMessagesAsChatMessages: Message[] = await Promise.all(
          chatPendingMessages.map(async (pending) => {
            if (pending.type === 'audio') {
              // Message audio en attente - récupérer l'URI réelle depuis le stockage
              let audioUri = pending.audio_uri || '';
              try {
                const actualUri = await AudioStorageService.getAudioUri(pending.audio_uri || '');
                if (actualUri) {
                  audioUri = actualUri;
                }
              } catch (error) {
                console.warn('⚠️ [OFFLINE] Impossible de récupérer l\'URI audio:', error);
              }
              
              return {
                id: pending.id,
                text: '🎤 Message vocal en attente de synchronisation...',
                isUser: true,
                timestamp: new Date(pending.created_at),
                hasAttachments: true,
                attachments: [{
                  type: 'audio',
                  uri: audioUri,
                  duration: pending.audio_metadata?.duration || 0,
                }]
              };
            } else {
              // Message texte en attente
              return {
                id: pending.id,
                text: pending.content || '',
                isUser: true,
                timestamp: new Date(pending.created_at)
              };
            }
          })
        );
        
        // Ajouter les messages en attente à la liste des messages s'ils n'y sont pas déjà
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newPending = pendingMessagesAsChatMessages.filter(m => !existingIds.has(m.id));
          return [...prev, ...newPending];
        });
      };
      
      loadPendingMessages();
    }
  }, [pendingMessages, chat?.id]);

  // Écouter les nouveaux messages en temps réel (seulement pour les vrais chats)
  useEffect(() => {
    if (!chat?.id) return;
    
    // Pas de subscription pour les chats temporaires
    const isTemporaryChat = chat.id.startsWith('temp-');
    if (isTemporaryChat) {
      console.log('⚡ [OPTIMISTIC] Skipping real-time subscription for temporary chat:', chat.id);
      return;
    }

    console.log('🔊 [REAL-TIME] Setting up subscription for real chat:', chat.id);
    
    const subscription = ChatServiceDirect.subscribeToMessages(
      chat.id,
      (newMessage) => {
        const adaptedMessage = adaptChatMessageToMessage(newMessage);
        
        // Éviter les doublons
        setMessages(prev => {
          const messageExists = prev.some(msg => 
            (msg.id === adaptedMessage.id) || 
            (msg.id.startsWith('temp-') && msg.text === adaptedMessage.text && msg.isUser === adaptedMessage.isUser)
          );
          
          if (messageExists) {
            return prev;
          }
          
          return [...prev, adaptedMessage];
        });
        
        // Défiler vers le bas automatiquement
        scrollToBottom(true);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [chat?.id]);

  const sendMessage = async () => {
    if ((!inputText.trim() && draftAttachments.length === 0) || !chat) return;

    const originalText = inputText.trim();
    const pendingAudio = pendingTranscribedAudio;
    const attachments = [...draftAttachments]; // Copie des pièces jointes
    setInputText('');
    setInputHeight(MIN_INPUT_HEIGHT); // Réinitialiser la hauteur
    setDraftAttachments([]); // Vider les pièces jointes

    // Préparer le contenu du message avec pièces jointes
    let messageContent = originalText;
    let metadata: any = {};

    let processedAttachments: ChatAttachment[] = [];
    if (attachments.length > 0) {
      console.log('📎 [CHAT] Traitement de', attachments.length, 'pièces jointes');
      
      processedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          if (attachment.type === 'image' && attachment.data) {
            console.log('☁️ [CHAT] Upload image:', attachment.name);
            const uploadResult = await mediaService.uploadImage(
              attachment.data,
              activeFarm?.farm_id || 0,
              'chat'
            );
            
            if (uploadResult.success) {
              return {
                ...attachment,
                uploadedUri: uploadResult.fileUrl,
                uploaded: true
              };
            }
          }
          return attachment;
        })
      );
    }

    if (pendingAudio) {
      processedAttachments = [
        ...processedAttachments,
        {
          ...pendingAudio.audioAttachment,
          transcription: originalText,
        },
      ];
    }

    if (processedAttachments.length > 0) {
      metadata.attachments = processedAttachments;
      metadata.has_attachments = true;
    }

    if (!originalText && processedAttachments.length > 0) {
      const attachmentTypes = processedAttachments.map(att => {
        switch (att.type) {
          case 'image': return '📸 Photo';
          case 'document': return '📄 Document';
          case 'location': return '📍 Localisation';
          case 'task': return '✅ Tâche';
          case 'audio': return '🎧 Audio';
          default: return '📎 Fichier';
        }
      });
      messageContent = `${attachmentTypes.join(', ')} partagé${processedAttachments.length > 1 ? 's' : ''}`;
    }

    if (pendingAudio) {
      // Métadonnées de transcription Whisper (mode vocal direct)
      metadata.has_transcription = true;
      metadata.raw_transcription = pendingAudio.rawText;
      metadata.transcription_language = pendingAudio.language || 'fr';
      metadata.transcription_source = pendingAudio.source || 'whisper';
      if (pendingAudio.appliedCorrections.length > 0) {
        metadata.transcription_corrections = pendingAudio.appliedCorrections.map(correction => ({
          id: correction.id,
          occurrences: correction.occurrences,
          description: correction.description,
        }));
      }
      metadata.transcription_user_modified = pendingAudio.correctedText !== originalText;
      // Transcriptions optionnelles pour comparaison (si les deux sources sont disponibles)
      if (pendingAudio.webSpeechTranscript) {
        metadata.web_speech_transcript = pendingAudio.webSpeechTranscript;
      }
      if (pendingAudio.whisperTranscript) {
        metadata.whisper_transcript = pendingAudio.whisperTranscript;
      }

      console.log('📝 [AUDIO] Comparaison finale', {
        source: pendingAudio.source || 'whisper',
        raw: pendingAudio.rawText,
        corrected: pendingAudio.correctedText,
        final: originalText,
      });
    } else if (webSpeechFinalizedRef.current && !pendingAudio) {
      // Mode dictée Web Speech seul (pas d'audio Whisper) :
      // Le texte dans l'input EST la transcription finale Web Speech
      const webSpeechRaw = webSpeechFinalizedRef.current;
      if (webSpeechRaw) {
        metadata.has_transcription = true;
        metadata.raw_transcription = webSpeechRaw;
        metadata.transcription_source = 'web_speech';
        metadata.web_speech_transcript = webSpeechRaw;
        metadata.transcription_user_modified = webSpeechRaw !== originalText;
        // Corrections contextuelles appliquées pendant la dictée
        if (webSpeechCorrectionsRef.current.length > 0) {
          metadata.web_speech_contextual_corrections = webSpeechCorrectionsRef.current.map(c => ({
            original: c.original,
            corrected: c.corrected,
            similarity: Math.round(c.similarity * 100) / 100,
            gramSize: c.gramSize,
          }));
          console.log(
            '✏️ [DICTATION] Corrections contextuelles enregistrées:',
            webSpeechCorrectionsRef.current.map(c => `"${c.original}" → "${c.corrected}"`).join(', ')
          );
        }
        console.log('📝 [DICTATION] Métadonnées Web Speech', {
          webSpeechRaw,
          final: originalText,
          modified: webSpeechRaw !== originalText,
          contextualCorrections: webSpeechCorrectionsRef.current.length,
        });
      }
      // Réinitialiser les refs de la session de dictée
      webSpeechFinalizedRef.current = '';
      webSpeechCorrectionsRef.current = [];
    }

    // Vérifier si c'est un chat temporaire
    const isTemporaryChat = chat.id.startsWith('temp-');
    
    if (isTemporaryChat) {
      console.log('⚡ [OPTIMISTIC] Message sent to temporary chat - will be saved once real chat is created');
      
      // Créer le message local pour affichage immédiat
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        text: messageContent,
        isUser: true,
        timestamp: new Date(),
        attachments: attachments.length > 0 ? attachments : undefined,
        hasAttachments: attachments.length > 0
      };

      // Ajouter immédiatement à l'UI pour réactivité
      setMessages(prev => [...prev, tempMessage]);
      scrollToBottom(true, 50);
      
      // Réponse immédiate pour les chats temporaires
      setTimeout(() => {
        const responseText = needsAIAnalysis(originalText) 
          ? "🧠 Thomas sera bientôt disponible pour analyser votre message !" 
          : generateHelpResponse(originalText);
        
        const responseMessage: Message = {
          id: `temp-response-${Date.now()}`,
          text: responseText,
          isUser: false,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, responseMessage]);
        scrollToBottom(true);
      }, 1000);
      
      return;
    }

      // Pour les vrais chats, traitement normal
    // Déclarer tempMessage avant le try pour qu'il soit accessible dans le catch
    let tempMessage: Message | null = null;
    
    try {
      // Vérifier la connexion avant d'envoyer
      const isOnline = await NetworkService.isOnline();
      
      if (!isOnline) {
        if (pendingAudio) {
          Alert.alert(
            'Mode hors ligne',
            'La transcription ne peut pas être envoyée hors ligne. Vérifiez votre connexion et réessayez.',
            [{ text: 'OK' }]
          );
          setInputText(originalText);
          const restoreLines = originalText
            .split('\n')
            .reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / 60)), 0);
          const restoreHeight = Math.min(
            MAX_INPUT_HEIGHT,
            Math.max(MIN_INPUT_HEIGHT, restoreLines * LINE_HEIGHT + 16)
          );
          setInputHeight(restoreHeight);
          setDraftAttachments(attachments);
          return;
        }

        console.log('📴 [OFFLINE] Mode hors ligne, ajout à la queue locale');
        
        const queueId = await OfflineQueueService.addMessage({
          type: 'text',
          session_id: chat.id,
          user_id: currentUserId || '',
          farm_id: activeFarm?.farm_id || 0,
          content: messageContent,
        });
        
        console.log('✅ [OFFLINE] Message ajouté à la queue:', queueId);
        
        await refreshQueue();
        
        Alert.alert(
          'Mode hors ligne',
          'Votre message sera envoyé automatiquement dès que la connexion sera rétablie.',
          [{ text: 'OK' }]
        );
        
        return;
      }

      // Créer le message local pour affichage immédiat (seulement si en ligne)
      const hasAnyAttachments = processedAttachments.length > 0;

      tempMessage = {
        id: `temp-${Date.now()}`,
        text: messageContent,
        isUser: true,
        timestamp: new Date(),
        attachments: hasAnyAttachments ? processedAttachments : undefined,
        hasAttachments: hasAnyAttachments
      };

      // Ajouter immédiatement à l'UI pour réactivité
      setMessages(prev => [...prev, tempMessage!]);
      scrollToBottom(true, 50);
      
      console.log('💬 [REAL-CHAT] Sending message to real chat:', chat.id);
      
      const dbMessage = await ChatServiceDirect.sendMessage({
        session_id: chat.id,
        role: 'user',
        content: messageContent,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      });

      if (pendingAudio?.audioFileId && dbMessage.id) {
        const { AudioFileService } = await import('../services/AudioFileService');
        await AudioFileService.updateAudioFile(pendingAudio.audioFileId, {
          transcription: originalText,
          transcription_language: pendingAudio.language || 'fr',
          chat_message_id: dbMessage.id,
        });
        console.log('🔗 [AUDIO] Fichier audio lié au message envoyé:', dbMessage.id);
      }

      // Remplacer le message temporaire par celui de la DB
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? adaptChatMessageToMessage(dbMessage) : msg
      ));

      // Invalider le cache car nouveau message ajouté
      // Le cache sera régénéré au prochain chargement avec le nouveau message
      await ChatCacheService.invalidateCache(chat.id);
      console.log('🔄 [CACHE] Invalidated cache after new message');

      // Mettre à jour le chat localement
      onUpdateChat(chat.id, {
        lastMessage: originalText,
        timestamp: new Date(),
        messageCount: messages.length + 1
      });

      // Défiler vers le bas
      scrollToBottom(true);

      if (pendingAudio) {
        setPendingTranscribedAudio(null);
      }
      // Réinitialiser le transcript Web Speech après envoi
      webSpeechFinalizedRef.current = '';

      // Déterminer si le message nécessite une analyse IA
      // Ne pas analyser les messages avec des images pour éviter d'envoyer les images à l'API
      const hasImages = processedAttachments.some(att => att.type === 'image');
      const shouldAnalyze = needsAIAnalysis(originalText);
      
      console.log('🤔 [ANALYSIS-DECISION]', {
        shouldAnalyze,
        hasImages,
        textLength: originalText.length,
        willAnalyze: shouldAnalyze && !hasImages
      });
      
      if (shouldAnalyze && !hasImages) {
        // Vérifier que la session de chat est valide
        if (!chat?.id) {
          console.error('❌ [CHAT-ANALYSIS] Session de chat invalide, analyse IA ignorée');
          return;
        }

        // Message complexe nécessitant l'IA
        setIsAnalyzing(true);

        // Ajouter message de statut d'analyse avec étapes
        const analysisStatusMessage: Message = {
          id: `analysis-${Date.now()}`,
          text: "🧠 Thomas analyse votre message...\n\n📝 Étape 1/4: Extraction des données agricoles\n⏳ Classification des entités...",
          isUser: false,
          timestamp: new Date(),
          isAnalyzing: true,
          realMessageId: dbMessage.id // Stocker l'UUID réel pour l'analyse
        };
        setMessages(prev => [...prev, analysisStatusMessage]);

        try {
          console.log('🤖 [CHAT-ANALYSIS] Démarrage analyse IA pour:', originalText);
          
          // Étape 2
          setMessages(prev => prev.map(msg => 
            msg.id === analysisStatusMessage.id 
              ? { ...msg, text: "🧠 Thomas analyse votre message...\n\n✅ Étape 1/4: Données extraites\n📊 Étape 2/4: Classification des intentions\n⏳ Identification des actions..." }
              : msg
          ));

          // Appel à l'IA avec l'ID du message de la DB (UUID valide)
          const result = await AIChatService.analyzeMessage(dbMessage.id, originalText, chat.id, activeFarm?.farm_id);
          console.log('✅ [CHAT-ANALYSIS] Résultat analyse IA:', result);
          
          // Mettre à jour le message user original avec is_help_request si nécessaire
          if (result.is_help_request) {
            try {
              await DirectSupabaseService.directUpdate(
                'chat_messages',
                {
                  metadata: {
                    is_help_request: true,
                    analysis_id: result.analysis_id,
                    analyzed: true
                  }
                },
                [{ column: 'id', value: dbMessage.id }]
              );
              console.log('✅ [CHAT-ANALYSIS] Message user marqué comme help_request');
            } catch (updateError) {
              console.error('⚠️ [CHAT-ANALYSIS] Échec mise à jour metadata user:', updateError);
            }
          }
          
          // Étape 3
          setMessages(prev => prev.map(msg => 
            msg.id === analysisStatusMessage.id 
              ? { ...msg, text: "🧠 Thomas analyse votre message...\n\n✅ Étape 1/4: Données extraites\n✅ Étape 2/4: Intentions classifiées\n🎯 Étape 3/4: Génération des actions\n⏳ Finalisation..." }
              : msg
          ));

          // Message court + actions dans metadata pour affichage cards
          const actionsCount = result.actions?.length || 0;
          
          // Si c'est une demande d'aide, utiliser le message du pipeline directement
          const aiResponseText = result.is_help_request && result.message
            ? result.message
            : actionsCount > 0 
              ? `Parfait ! J'ai identifié ${actionsCount} action${actionsCount > 1 ? 's' : ''} dans votre message.`
              : `J'ai bien noté votre message.`;

          // Préparer les actions avec les données extraites complètes
          const actionsWithData = (result.actions || []).map((action: any) => ({
            ...action,
            // S'assurer que extracted_data est bien présent
            extracted_data: action.extracted_data || action.action_data?.extracted_data || {},
            // Copier les données de action_data si présentes
            decomposed_text: action.decomposed_text || action.action_data?.decomposed_text || action.original_text,
            original_text: action.original_text || action.action_data?.original_text,
            matched_entities: action.matched_entities || action.action_data?.context || {},
          }));

          console.log('📦 [CHAT-ANALYSIS] Actions préparées:', JSON.stringify(actionsWithData, null, 2));

          // 🌱 NOUVEAU : Diviser les actions multi-cultures AVANT affichage
          const expandedActions: AnalyzedAction[] = [];
          for (const action of actionsWithData) {
            if (CropSplitterService.shouldSplit(action)) {
              console.log(`🌱 [CHAT-ANALYSIS] Division action multi-cultures: ${action.id}`);
              const splitActions = CropSplitterService.splitAction(action);
              CropSplitterService.logSplitSummary(action, splitActions);
              expandedActions.push(...splitActions);
            } else {
              expandedActions.push(action);
            }
          }

          console.log(`📊 [CHAT-ANALYSIS] Actions après expansion: ${expandedActions.length} (avant: ${actionsWithData.length})`);

          // Pour les demandes d'aide, filtrer les actions "help" (elles ne doivent pas être affichées comme des cards)
          const displayableActions = result.is_help_request 
            ? expandedActions.filter(action => action.action_type !== 'help')
            : expandedActions;

          console.log(`📊 [CHAT-ANALYSIS] Actions affichables: ${displayableActions.length} (après filtrage help)`);

          // Les tâches/observations sont déjà créées par le pipeline server-side (thomas-agent-pipeline).
          // Pas de création client-side pour éviter les doublons.
          if (displayableActions.length > 0) {
            console.log(`ℹ️ [AUTO-VALIDATE] ${displayableActions.length} action(s) déjà créées par le pipeline (record_ids: ${displayableActions.map((a: any) => a.record_id || 'none').join(', ')})`);
          } else if (result.is_help_request) {
            console.log('ℹ️ [AUTO-VALIDATE] Help request détecté, pas d\'actions');
          }

          // Envoyer à la DB
          const sentAIMessage = await ChatServiceDirect.sendMessage({
            session_id: chat.id,
            role: 'assistant',
            content: aiResponseText,
            ai_confidence: result.confidence || 0.8,
            metadata: { 
              analysis_id: result.analysis_id,
              actions: displayableActions, // Actions filtrées (sans help)
              actions_count: displayableActions.length,
              processing_time: result.processing_time_ms || 0,
              has_actions: displayableActions.length > 0, // false pour help
              auto_validated: true,
              is_help_request: result.is_help_request || false,
              ...(result.help_shortcut && { help_shortcut: result.help_shortcut })
            }
          });

          // ✅ CORRECTION: Remplacer le message d'analyse par la réponse IA LOCALEMENT
          const aiResponseMessage: Message = {
            id: sentAIMessage.id,
            text: aiResponseText,
            isUser: false,
            timestamp: new Date(),
            isAI: true,
            isAnalyzing: false,
            actions: displayableActions, // Actions filtrées (sans help)
            hasActions: displayableActions.length > 0, // false pour help
            helpShortcut: result.help_shortcut,
            confidence: result.confidence || 0.8,
            analysis_id: result.analysis_id
          };

          // Remplacer le message d'analyse par la vraie réponse
          setMessages(prev => prev.map(msg => 
            msg.id === analysisStatusMessage.id ? aiResponseMessage : msg
          ));

          console.log('✅ [CHAT-ANALYSIS] Réponse IA affichée localement');
          
          // Scroll vers le bas
        scrollToBottom(true);

        } catch (error) {
          console.log('❌ [CHAT-ANALYSIS] IA non disponible, réponse de secours:', error);
          
          // Réponse de secours si l'IA n'est pas disponible
          const fallbackText = `Désolé, je n'ai pas pu analyser votre message. Réessayez dans quelques instants.`;
          
          const sentFallback = await ChatServiceDirect.sendMessage({
            session_id: chat.id,
            role: 'assistant',
            content: fallbackText,
            metadata: { fallback_mode: true, original_message: originalText }
          });

          // ✅ CORRECTION: Remplacer le message d'analyse par le fallback LOCALEMENT
          const fallbackMessage: Message = {
            id: sentFallback.id,
            text: fallbackText,
            isUser: false,
            timestamp: new Date(),
            isAI: true,
            isAnalyzing: false
          };

          setMessages(prev => prev.map(msg => 
            msg.id === analysisStatusMessage.id ? fallbackMessage : msg
          ));
        }
        
        setIsAnalyzing(false);
      } else {
        // Message conversationnel simple - réponse après un délai
        console.log('💬 [NO-ANALYSIS] Message conversationnel détecté, pas d\'analyse IA');
        console.log('💡 [NO-ANALYSIS] L\'utilisateur peut utiliser le bouton "Analyser avec Thomas" si besoin');
        
        setTimeout(async () => {
          const responseText = generateHelpResponse(originalText);
          
          await ChatServiceDirect.sendMessage({
            session_id: chat.id,
            role: 'assistant',
            content: responseText
          });
        }, 1000);
      }

    } catch (error) {
      console.error('❌ [CHAT-CONVERSATION] Erreur lors de l\'envoi du message:', error);
      
      // Supprimer le message temporaire en cas d'erreur
      if (tempMessage) {
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage!.id));
      }
      
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
      // Remettre le texte dans l'input en cas d'erreur
      setInputText(originalText);
    }
  };

  // ===== HANDLERS POUR LE BOUTON PLUS =====

  // Handler pour ouvrir le menu du bouton plus
  const handlePlusPress = () => {
    console.log('➕ [CHAT] Ouverture menu du bouton plus');
    setShowPlusMenu(true);
  };

  // Handler principal pour les actions du menu plus
  const handlePlusAction = async (action: PlusAction) => {
    switch (action) {
      case 'camera':
        await handleCameraAction();
        break;
      case 'gallery-multiple':
        await handleGalleryMultipleAction();
        break;
      case 'location':
        await handleLocationAction();
        break;
      case 'document':
        handleDocumentAction();
        break;
      case 'task':
        handleTaskAction();
        break;
      case 'settings':
        handleSettingsAction();
        break;
    }
  };

  // Handler pour appareil photo
  const handleCameraAction = async () => {
    try {
      console.log('📷 [CHAT] Ouverture appareil photo...');
      
      const mediaResult = await mediaService.takePhoto();
      if (!mediaResult) {
        console.log('📷 [CHAT] Prise de photo annulée');
        return;
      }

      // Ajouter aux pièces jointes au lieu d'envoyer immédiatement
      const attachment: ChatAttachment = {
        id: `camera_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'image',
        name: mediaResult.fileName || 'Photo.jpg',
        uri: mediaResult.uri,
        size: mediaResult.fileSize,
        data: mediaResult,
      };
      
      setDraftAttachments(prev => [...prev, attachment]);
      console.log('📎 [CHAT] Photo ajoutée aux pièces jointes');
      
    } catch (error) {
      console.error('❌ [CHAT] Erreur appareil photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };


  // Handler pour sélection d'images (1 à 5)
  const handleGalleryMultipleAction = async () => {
    try {
      console.log('🖼️ [CHAT] Ouverture sélection d\'images...');
      
      // Permettre de sélectionner de 1 à 5 images
      const mediaResults = await mediaService.pickMultipleFromGallery(5);
      if (!mediaResults || mediaResults.length === 0) {
        console.log('🖼️ [CHAT] Sélection annulée');
        return;
      }

      console.log(`📸 [CHAT] ${mediaResults.length} image(s) sélectionnée(s)`);

      // Ajouter toutes les images aux pièces jointes
      const newAttachments: ChatAttachment[] = mediaResults.map((mediaResult, index) => ({
        id: `gallery_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'image',
        name: mediaResult.fileName || `Image_${index + 1}.jpg`,
        uri: mediaResult.uri,
        size: mediaResult.fileSize,
        data: mediaResult,
      }));
      
      setDraftAttachments(prev => [...prev, ...newAttachments]);
      console.log(`📎 [CHAT] ${newAttachments.length} image(s) ajoutée(s) aux pièces jointes`);
      
    } catch (error) {
      console.error('❌ [CHAT] Erreur sélection images:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner les images');
    }
  };

  // Handler pour supprimer une pièce jointe
  const handleRemoveAttachment = (attachmentId: string) => {
    setDraftAttachments(prev => prev.filter(att => att.id !== attachmentId));
    console.log('🗑️ [CHAT] Pièce jointe supprimée:', attachmentId);
  };

  // Handler pour localisation
  const handleLocationAction = async () => {
    try {
      console.log('📍 [CHAT] Récupération localisation...');
      
      const locationResult = await locationService.getCurrentLocation();
      if (!locationResult) {
        console.log('📍 [CHAT] Localisation annulée');
        return;
      }

      // Ajouter aux pièces jointes au lieu d'envoyer immédiatement
      const attachment: ChatAttachment = {
        id: `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'location',
        name: locationResult.address || 'Position actuelle',
        data: locationResult,
      };
      
      setDraftAttachments(prev => [...prev, attachment]);
      console.log('📎 [CHAT] Localisation ajoutée aux pièces jointes');
      
    } catch (error) {
      console.error('❌ [CHAT] Erreur localisation:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir la localisation');
    }
  };

  // Handler pour documents
  const handleDocumentAction = () => {
    console.log('📄 [CHAT] Ouverture sélecteur de documents...');
    setShowDocumentPicker(true);
  };

  // Handler pour tâches
  const handleTaskAction = () => {
    console.log('✅ [CHAT] Ouverture création de tâche...');
    
    // Créer une action vide pré-remplie avec la ferme active
    const newAction: ActionData = {
      id: `temp_${Date.now()}`, // ID temporaire pour identifier les nouvelles actions
      action_type: 'task_planned', // Type par défaut
      action: '',
      extracted_data: {
        action_type: 'task_planned',
        action_verb: '',
        date: new Date().toISOString().split('T')[0], // Date actuelle
        farm_id: activeFarm?.farm_id,
        user_id: currentUserId
      },
      message_id: null,
      chat_id: null
    };
    
    setEditingAction(newAction);
    setShowActionModal(true);
  };

  // Handler pour paramètres
  const handleSettingsAction = () => {
    console.log('⚙️ [CHAT] Navigation vers paramètres...');
    
    // Pour l'instant, juste fermer le chat et retourner à la liste
    // La navigation vers les paramètres sera ajoutée plus tard
    if (onGoBack) {
      onGoBack(); // Retour à la liste des chats
    }
    
    // TODO: Ajouter navigation vers paramètres quand NavigationContainer sera disponible
    Alert.alert(
      'Paramètres',
      'Navigation vers les paramètres sera disponible prochainement.\n\nPour l\'instant, accédez aux paramètres via le menu principal.',
      [{ text: 'OK' }]
    );
  };

  // Fonction pour envoyer un message avec image
  const sendImageMessage = async (imageUrl: string, mediaInfo: any) => {
    if (!chat) return;

    try {
      // Créer le message avec métadonnées image
      const imageMessage = `📷 Image partagée\n\n[Image: ${mediaInfo.fileName}]`;
      
      const messageMetadata = {
        type: 'image',
        image_url: imageUrl,
        image_info: {
          fileName: mediaInfo.fileName,
          fileSize: mediaInfo.fileSize,
          mimeType: mediaInfo.mimeType,
          width: mediaInfo.width,
          height: mediaInfo.height,
        },
        uploaded_at: new Date().toISOString(),
      };

      // Envoyer le message avec métadonnées
      const dbMessage = await ChatServiceDirect.sendMessage({
        session_id: chat.id,
        role: 'user',
        content: imageMessage,
        metadata: messageMetadata,
      });

      console.log('✅ [CHAT] Message image envoyé:', dbMessage.id);

      // Mettre à jour l'UI localement
      const adaptedMessage = adaptChatMessageToMessage(dbMessage);
      setMessages(prev => [...prev, adaptedMessage]);

      // Défiler vers le bas
      scrollToBottom(true);

      // Mettre à jour le chat
      onUpdateChat(chat.id, {
        lastMessage: '📷 Image partagée',
        timestamp: new Date(),
        messageCount: messages.length + 1
      });

    } catch (error) {
      console.error('❌ [CHAT] Erreur envoi message image:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'image');
    }
  };

  // Fonction pour envoyer un message avec localisation
  const sendLocationMessage = async (location: LocationResult) => {
    if (!chat) return;

    try {
      // Créer le message avec informations de localisation
      const mapsUrl = locationService.generateMapsUrl(location.latitude, location.longitude);
      const locationMessage = `📍 Localisation partagée\n\n` +
        `${location.address || 'Position GPS'}\n` +
        `Coordonnées: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\n` +
        `Précision: ${Math.round(location.accuracy)}m\n\n` +
        `🗺️ Voir sur Google Maps: ${mapsUrl}`;
      
      const messageMetadata = {
        type: 'location',
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude,
          address: location.address,
          timestamp: location.timestamp,
        },
        maps_url: mapsUrl,
        shared_at: new Date().toISOString(),
      };

      // Envoyer le message avec métadonnées
      const dbMessage = await ChatServiceDirect.sendMessage({
        session_id: chat.id,
        role: 'user',
        content: locationMessage,
        metadata: messageMetadata,
      });

      console.log('✅ [CHAT] Message localisation envoyé:', dbMessage.id);

      // Mettre à jour l'UI localement
      const adaptedMessage = adaptChatMessageToMessage(dbMessage);
      setMessages(prev => [...prev, adaptedMessage]);

      // Défiler vers le bas
      scrollToBottom(true);

      // Mettre à jour le chat
      onUpdateChat(chat.id, {
        lastMessage: '📍 Localisation partagée',
        timestamp: new Date(),
        messageCount: messages.length + 1
      });

    } catch (error) {
      console.error('❌ [CHAT] Erreur envoi message localisation:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la localisation');
    }
  };

  // Handler pour la sélection d'un document
  const handleDocumentSelect = async (document: Document) => {
    try {
      console.log('📄 [CHAT] Document sélectionné:', document.name);
      
      // Ajouter aux pièces jointes au lieu d'envoyer immédiatement
      const attachment: ChatAttachment = {
        id: `document_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'document',
        name: document.name,
        size: document.file_size,
        data: document,
      };
      
      setDraftAttachments(prev => [...prev, attachment]);
      setShowDocumentPicker(false);
      console.log('📎 [CHAT] Document ajouté aux pièces jointes');
      
    } catch (error) {
      console.error('❌ [CHAT] Erreur sélection document:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le document');
    }
  };

  // Fonction pour envoyer un message avec document
  const sendDocumentMessage = async (document: Document) => {
    if (!chat) return;

    try {
      // Générer l'URL de téléchargement du document
      const { data } = supabase.storage
        .from(document.storage_bucket)
        .getPublicUrl(document.file_path);

      // Créer le message avec informations du document
      const documentMessage = `📄 Document partagé\n\n` +
        `📋 ${document.name}\n` +
        `📁 Catégorie: ${document.category}\n` +
        `📊 Taille: ${formatFileSize(document.file_size)}\n` +
        `📅 Créé le: ${new Date(document.created_at).toLocaleDateString('fr-FR')}\n\n` +
        `🔗 Télécharger: ${data.publicUrl}`;
      
      const messageMetadata = {
        type: 'document',
        document: {
          id: document.id,
          name: document.name,
          category: document.category,
          file_name: document.file_name,
          file_type: document.file_type,
          file_size: document.file_size,
          download_url: data.publicUrl,
        },
        shared_at: new Date().toISOString(),
      };

      // Envoyer le message avec métadonnées
      const dbMessage = await ChatServiceDirect.sendMessage({
        session_id: chat.id,
        role: 'user',
        content: documentMessage,
        metadata: messageMetadata,
      });

      console.log('✅ [CHAT] Message document envoyé:', dbMessage.id);

      // Mettre à jour l'UI localement
      const adaptedMessage = adaptChatMessageToMessage(dbMessage);
      setMessages(prev => [...prev, adaptedMessage]);

      // Défiler vers le bas
      scrollToBottom(true);

      // Mettre à jour le chat
      onUpdateChat(chat.id, {
        lastMessage: `📄 ${document.name}`,
        timestamp: new Date(),
        messageCount: messages.length + 1
      });

    } catch (error) {
      console.error('❌ [CHAT] Erreur envoi message document:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le document');
    }
  };

  // Handler pour la sauvegarde d'une tâche
  const handleTaskSave = async (taskData: TaskData & { photos?: AttachedPhoto[] }) => {
    try {
      console.log('✅ [CHAT] Sauvegarde tâche:', taskData.title);
      
      // Ajouter aux pièces jointes au lieu d'envoyer immédiatement
      const attachment: ChatAttachment = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'task',
        name: taskData.title,
        data: taskData,
      };
      
      setDraftAttachments(prev => [...prev, attachment]);
      setShowTaskModal(false);
      console.log('📎 [CHAT] Tâche ajoutée aux pièces jointes');
      
    } catch (error) {
      console.error('❌ [CHAT] Erreur sauvegarde tâche:', error);
      Alert.alert('Erreur', 'Impossible de créer la tâche');
    }
  };

  // Handler pour la sauvegarde d'une action (création de tâche/observation)
  const handleActionSave = async (updatedAction: ActionData) => {
    console.log('💾 [ACTION-SAVE] Sauvegarde action:', updatedAction);
    
    try {
      // Déterminer si c'est une création (ID temporaire)
      const isNewAction = updatedAction.id?.startsWith('temp_');
      
      if (isNewAction) {
        console.log('➕ [ACTION-SAVE] Création d\'un nouvel élément depuis chat');
        
        // CRÉATION : Convertir ActionData → TaskData ou ObservationData
        if (updatedAction.action_type === 'observation') {
          // Créer une observation
          const observationData: any = {
            title: updatedAction.extracted_data?.issue || updatedAction.action || 'Observation sans titre',
            category: updatedAction.extracted_data?.category || 'autre',
            nature: updatedAction.extracted_data?.notes || '',
            crop: updatedAction.extracted_data?.crops?.[0] || updatedAction.extracted_data?.crop,
            status: 'Nouvelle',
            created_at: updatedAction.extracted_data?.date || new Date().toISOString(),
            farm_id: activeFarm?.farm_id,
            user_id: currentUserId,
            is_active: true
          };
          
          console.log('📝 [ACTION-SAVE] Création observation:', observationData);
          await ObservationService.createObservation(observationData);
          Alert.alert('✅ Succès', 'Observation créée avec succès !');
          
        } else {
          // Créer une tâche (task_done ou task_planned)
          const taskData: any = {
            title: updatedAction.action || updatedAction.extracted_data?.action || 'Tâche sans titre',
            description: updatedAction.extracted_data?.notes,
            action: updatedAction.extracted_data?.action || updatedAction.action,
            date: updatedAction.extracted_data?.date || new Date().toISOString().split('T')[0],
            time: updatedAction.extracted_data?.time,
            status: updatedAction.action_type === 'task_done' ? 'terminee' : 'en_attente',
            farm_id: activeFarm?.farm_id,
            user_id: currentUserId,
            is_active: true,
            duration_minutes: updatedAction.extracted_data?.duration?.value,
            number_of_people: updatedAction.extracted_data?.number_of_people,
            plants: updatedAction.extracted_data?.crops,
            plot_ids: updatedAction.matched_entities?.plot_ids,
            surface_unit_ids: updatedAction.matched_entities?.surface_unit_ids,
            material_ids: updatedAction.matched_entities?.material_ids,
            quantity_value: updatedAction.extracted_data?.quantity?.value,
            quantity_unit: updatedAction.extracted_data?.quantity?.unit,
            quantity_nature: updatedAction.extracted_data?.quantity_nature,
            quantity_type: sanitizeQuantityType(updatedAction.extracted_data),
            notes: updatedAction.extracted_data?.notes
          };
          
          console.log('📝 [ACTION-SAVE] Création tâche:', taskData);
          await TaskService.createTask(taskData);
          Alert.alert('✅ Succès', 'Tâche créée avec succès !');
        }
        
        console.log('✅ [ACTION-SAVE] Élément créé avec succès depuis chat');
      }
      
    } catch (error) {
      console.error('❌ [ACTION-SAVE] Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'élément');
    } finally {
      setShowActionModal(false);
      setEditingAction(undefined);
    }
  };

  // Fonction pour envoyer un message avec tâche créée
  const sendTaskMessage = async (task: TaskData & { photos?: AttachedPhoto[] }) => {
    if (!chat) return;

    try {
      // Créer le message avec informations de la tâche
      let taskMessage = `✅ Tâche ${task.type === 'completed' ? 'effectuée' : 'planifiée'}\n\n` +
        `📋 ${task.title}\n` +
        `📅 Date: ${task.date.toLocaleDateString('fr-FR')}\n` +
        `⏱️ Durée: ${task.duration ? `${task.duration} min` : 'Non spécifiée'}\n` +
        `👥 Personnes: ${task.people || 1}\n` +
        `🏷️ Catégorie: ${task.category}\n` +
        (task.crops?.length ? `🌱 Cultures: ${task.crops.join(', ')}\n` : '') +
        (task.plots?.length ? `📍 Parcelles: ${task.plots.join(', ')}\n` : '') +
        (task.notes ? `📝 Notes: ${task.notes}\n` : '');

      // Ajouter info sur les photos
      if (task.photos?.length) {
        taskMessage += `📷 Photos: ${task.photos.length} image${task.photos.length > 1 ? 's' : ''} attachée${task.photos.length > 1 ? 's' : ''}\n`;
      }

      taskMessage += `\n🎯 Statut: ${task.status}`;
      
      const messageMetadata = {
        type: 'task',
        task: {
          id: task.id,
          title: task.title,
          type: task.type,
          date: task.date.toISOString(),
          duration: task.duration,
          people: task.people,
          category: task.category,
          crops: task.crops,
          plots: task.plots,
          notes: task.notes,
          status: task.status,
          photos: task.photos?.map(photo => ({
            id: photo.id,
            fileName: photo.fileName,
            uploadUrl: photo.uploadUrl,
            isUploaded: photo.isUploaded,
          })),
        },
        created_at: new Date().toISOString(),
      };

      // Envoyer le message avec métadonnées
      const dbMessage = await ChatServiceDirect.sendMessage({
        session_id: chat.id,
        role: 'user',
        content: taskMessage,
        metadata: messageMetadata,
      });

      console.log('✅ [CHAT] Message tâche envoyé:', dbMessage.id);

      // Mettre à jour l'UI localement
      const adaptedMessage = adaptChatMessageToMessage(dbMessage);
      setMessages(prev => [...prev, adaptedMessage]);

      // Défiler vers le bas
      scrollToBottom(true);

      // Mettre à jour le chat
      onUpdateChat(chat.id, {
        lastMessage: `✅ ${task.title}`,
        timestamp: new Date(),
        messageCount: messages.length + 1
      });

    } catch (error) {
      console.error('❌ [CHAT] Erreur envoi message tâche:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la tâche');
    }
  };

  // Fonction utilitaire pour formater la taille des fichiers
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderVoiceHelpTag = (tag: VoiceHelpTag, key: string) => (
    <View
      key={key}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: tag.bgColor,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      <Text style={{ fontSize: 12, marginRight: 4 }}>{tag.icon}</Text>
      <Text style={{ fontSize: 12, color: tag.textColor, fontWeight: '500' }}>
        {tag.value}
      </Text>
    </View>
  );

  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const renderHighlightedVoiceHelpSentence = (example: VoiceHelpExample) => {
    if (!example.sentence.trim()) {
      return (
        <View
          style={{
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.border.primary,
            borderRadius: 8,
            minHeight: 34,
            justifyContent: 'center',
            paddingHorizontal: 8,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 13, color: colors.text.tertiary, fontStyle: 'italic' }}>
            (phrase vide)
          </Text>
        </View>
      );
    }

    type HighlightTerm = { term: string; bgColor: string; textColor: string };
    const uniqueTerms = new Map<string, HighlightTerm>();
    for (const tag of [...example.essentials, ...example.optional]) {
      const term = (tag.highlight || tag.value).trim();
      if (term.length < 2) continue;
      const key = term.toLowerCase();
      if (!uniqueTerms.has(key)) {
        uniqueTerms.set(key, {
          term,
          bgColor: tag.bgColor,
          textColor: tag.textColor,
        });
      }
    }
    const terms = [...uniqueTerms.values()].sort((a, b) => b.term.length - a.term.length);

    type HighlightRange = { start: number; end: number; bgColor: string; textColor: string };
    const occupied: boolean[] = Array(example.sentence.length).fill(false);
    const ranges: HighlightRange[] = [];

    for (const termDef of terms) {
      const regex = new RegExp(escapeRegex(termDef.term), 'gi');
      let match: RegExpExecArray | null = regex.exec(example.sentence);
      while (match) {
        const start = match.index;
        const end = start + match[0].length;
        const hasOverlap = occupied.slice(start, end).some(Boolean);
        if (!hasOverlap) {
          ranges.push({
            start,
            end,
            bgColor: termDef.bgColor,
            textColor: termDef.textColor,
          });
          for (let i = start; i < end; i++) occupied[i] = true;
        }
        match = regex.exec(example.sentence);
      }
    }

    ranges.sort((a, b) => a.start - b.start);

    const pieces: Array<{
      text: string;
      highlighted: boolean;
      bgColor?: string;
      textColor?: string;
    }> = [];
    let cursor = 0;
    for (const range of ranges) {
      if (range.start > cursor) {
        pieces.push({ text: example.sentence.slice(cursor, range.start), highlighted: false });
      }
      pieces.push({
        text: example.sentence.slice(range.start, range.end),
        highlighted: true,
        bgColor: range.bgColor,
        textColor: range.textColor,
      });
      cursor = range.end;
    }
    if (cursor < example.sentence.length) {
      pieces.push({ text: example.sentence.slice(cursor), highlighted: false });
    }

    return (
      <Text style={{ fontSize: 14, color: colors.text.primary, marginBottom: 8, lineHeight: 22 }}>
        {'"'}
        {pieces.map((piece, index) => (
          <Text
            key={`piece-${index}`}
            style={piece.highlighted ? {
              backgroundColor: piece.bgColor,
              color: piece.textColor,
              fontWeight: '600',
              borderRadius: 8,
              paddingHorizontal: 4,
              paddingVertical: 1,
              overflow: 'hidden',
            } : undefined}
          >
            {piece.text}
          </Text>
        ))}
        {'"'}
      </Text>
    );
  };

  const currentVoiceHelpExample = VOICE_HELP_EXAMPLES[voiceHelpExampleIndex] || VOICE_HELP_EXAMPLES[0];
  const currentVoiceHelpCategoryStyle = VOICE_HELP_CATEGORY_STYLES[currentVoiceHelpExample.category];
  const goToNextVoiceHelpExample = () => {
    setVoiceHelpExampleIndex((prev) => (prev + 1) % VOICE_HELP_EXAMPLES.length);
  };
  const goToPreviousVoiceHelpExample = () => {
    setVoiceHelpExampleIndex((prev) => (prev - 1 + VOICE_HELP_EXAMPLES.length) % VOICE_HELP_EXAMPLES.length);
  };
  const voiceHelpSwipeResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_evt, gestureState) =>
      Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
    onPanResponderRelease: (_evt, gestureState) => {
      const SWIPE_THRESHOLD = 35;
      if (gestureState.dx <= -SWIPE_THRESHOLD) {
        goToNextVoiceHelpExample();
      } else if (gestureState.dx >= SWIPE_THRESHOLD) {
        goToPreviousVoiceHelpExample();
      }
    },
  });

  if (!chat) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: colors.background.primary,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
      }}>
        <Ionicons name="chatbubbles-outline" size={80} color={colors.gray[300]} />
        <Text variant="h3" color={colors.gray[500]} style={{ marginTop: spacing.lg, textAlign: 'center' }}>
          Aucune conversation sélectionnée
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* ===== BANNIÈRE DE SYNCHRONISATION ===== */}
      {isSyncing && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.primary[600],
          padding: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 5,
        }}>
          <ActivityIndicator size="small" color="white" style={{ marginRight: spacing.xs }} />
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>{syncProgress}</Text>
        </View>
      )}
      
      {/* ===== INDICATEUR OFFLINE ===== */}
      <OfflineIndicator />

      {/* ===== ZONE DES MESSAGES ===== */}
      <View style={{ flex: 1, position: 'relative' }}>
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingHorizontal: Platform.select({ web: spacing.sm, default: spacing.md }),
          paddingTop: spacing.sm,
          paddingBottom: spacing.lg,
          ...(isLoadingMessages && messages.length === 0 ? { flex: 1, justifyContent: 'center' } : {})
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* Indicateur de chargement des messages */}
        {isLoadingMessages && messages.length === 0 && (
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            paddingVertical: spacing.xl * 2,
          }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ 
              marginTop: spacing.md, 
              color: colors.text.secondary,
              fontSize: 16,
            }}>
              Chargement des messages...
            </Text>
          </View>
        )}

        {/* Bouton Charger plus (anciens messages) */}
        {hasMoreMessages && (
          <TouchableOpacity
            onPress={loadMoreMessages}
            disabled={loadingMore}
            style={{
              alignSelf: 'center',
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.md,
              backgroundColor: loadingMore ? colors.gray[100] : colors.background.secondary,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border.primary,
            }}
          >
            <Text style={{ 
              color: loadingMore ? colors.text.tertiary : colors.text.secondary, 
              fontSize: 13,
              fontWeight: '500'
            }}>
              {loadingMore ? '⏳ Chargement...' : '↑ Charger les messages précédents'}
            </Text>
          </TouchableOpacity>
        )}

        {messages.map((message) => {
          // Skip les messages d'analyse temporaires (le TypingIndicator global s'en charge)
          if (message.isAnalyzing) {
            return null;
          }

          // Messages avec pièces jointes - utiliser EnrichedMessage
          if (message.hasAttachments && message.attachments && message.attachments.length > 0) {
            return (
              <EnrichedMessage
                key={message.id}
                text={message.text}
                isUser={message.isUser}
                timestamp={message.timestamp}
                attachments={message.attachments}
              />
            );
          }

          // Messages IA avec actions (ou raccourci help "Aller à...")
          if (message.isAI && (message.hasActions || (message.actions && message.actions.length > 0) || message.helpShortcut)) {
            return (
              <AIResponseWithActions
                key={message.id}
                message={message.text}
                actions={message.actions || []}
                helpShortcut={message.helpShortcut}
                onNavigateToHelp={(screen) => {
                  navigation.navigateToTab('Profil');
                  navigation.navigateToScreen(screen as ScreenName);
                }}
                onNavigate={(screen, params) => {
                  navigation.navigateToTab('Profil');
                  navigation.navigateToScreen(screen as ScreenName, params);
                }}
                confidence={message.confidence || 0.8}
                onValidateAction={async (index, action) => {
                  console.log('✅ [VALIDATE] Action validée:', index, action);

                  // Les actions sont déjà créées par le pipeline server-side
                  // On détecte via record_id pour éviter les doublons
                  if (action.record_id) {
                    console.log('ℹ️ [VALIDATE] Action déjà créée par le pipeline:', action.record_id);
                    Alert.alert('✅ Succès', 'Action déjà enregistrée.');
                    return;
                  }

                  // Fallback: création manuelle si record_id absent (cas rare)
                  if (!activeFarm?.farm_id || !currentUserId) {
                    Alert.alert('Erreur', 'Impossible de valider: ferme ou utilisateur non identifié');
                    return;
                  }

                  try {
                    if (action.action_type === 'observation') {
                      await AIChatService.createObservationFromAction(
                        action as AnalyzedAction,
                        activeFarm.farm_id,
                        currentUserId
                      );
                      Alert.alert('✅ Succès', 'Observation créée avec succès !');
                    } else if (['task_done', 'task_planned', 'harvest'].includes(action.action_type || '')) {
                      await AIChatService.createTaskFromAction(
                        action as AnalyzedAction,
                        activeFarm.farm_id,
                        currentUserId
                      );
                      Alert.alert('✅ Succès', 'Tâche créée avec succès !');
                    }
                  } catch (error: any) {
                    console.error('❌ [VALIDATE] Erreur création:', error);
                    Alert.alert('Erreur', `Impossible de créer: ${error.message}`);
                  }
                }}
                onEditAction={async (index, action) => {
                  console.log('✏️ [EDIT] Action modifiée:', index, action);

                  const isTempId = action.id?.startsWith?.('temp_');

                  if (!action.id) {
                    console.error('❌ [EDIT] Action sans ID, impossible de sauvegarder');
                    Alert.alert('Erreur', 'Impossible de modifier cette action');
                    return;
                  }

                  try {
                    if (!isTempId) {
                      const updateData = {
                        action_type: action.action_type,
                        action_data: {
                          original_text: action.original_text,
                          decomposed_text: action.decomposed_text,
                          extracted_data: action.extracted_data,
                          context: action.matched_entities || {}
                        },
                        confidence_score: action.confidence || 0.8,
                        user_status: 'modified'
                      };

                      const { error } = await DirectSupabaseService.directUpdate(
                        'chat_analyzed_actions',
                        updateData,
                        [{ column: 'id', value: action.id }]
                      );

                      if (error) throw error;
                      console.log('✅ [EDIT] Action mise à jour en DB:', action.id);
                    } else {
                      console.log('ℹ️ [EDIT] ID temporaire - mise à jour locale uniquement (manage_* déjà persisté)');
                    }

                    // Mettre à jour l'état local pour refléter les changements
                    setMessages(prev => prev.map(msg => {
                      if (msg.actions && msg.actions.length > 0) {
                        const matchId = (a: any) => a.id === action.id || String(a.id) === String(action.id);
                        const actionExists = msg.actions.some(matchId);
                        if (actionExists) {
                          const updatedActions = msg.actions.map(a => 
                            matchId(a) ? action : a
                          );
                          console.log('🔄 [EDIT] Message mis à jour localement:', msg.id);
                          
                          // IMPORTANT: Mettre à jour aussi les métadonnées du message en DB
                          // pour que les changements persistent quand on revient dans la conversation
                          updateMessageMetadata(msg.realMessageId || msg.id, updatedActions);
                          
                          return { ...msg, actions: updatedActions };
                        }
                      }
                      return msg;
                    }));

                    Alert.alert('✅ Succès', 'Action modifiée avec succès !');
                  } catch (error: any) {
                    console.error('❌ [EDIT] Erreur sauvegarde:', error);
                    Alert.alert('Erreur', `Impossible de sauvegarder: ${error.message}`);
                  }
                }}
                onRejectAction={async (index, action) => {
                  console.log('❌ [REJECT] Action rejetée:', index, action);

                  const isTempId = action.id?.startsWith?.('temp_');

                  try {
                    if (action.id && !isTempId) {
                      await DirectSupabaseService.directUpdate(
                        'chat_analyzed_actions',
                        { user_status: 'rejected' },
                        [{ column: 'id', value: action.id }]
                      );
                      console.log('✅ [REJECT] Action marquée comme rejetée:', action.id);
                    }
                    Alert.alert('Action rejetée', 'L\'action a été ignorée.');
                  } catch (error: any) {
                    console.error('❌ [REJECT] Erreur:', error);
                    Alert.alert('Erreur', 'Impossible de rejeter l\'action');
                  }
                }}
              />
            );
          }

          // Messages utilisateur - bulle violette à droite
          if (message.isUser) {
            // Vérifier si ce message a été analysé (message IA avec actions qui suit)
            const messageIndex = messages.findIndex(m => m.id === message.id);
            const nextMessage = messageIndex >= 0 ? messages[messageIndex + 1] : null;
            const hasBeenAnalyzed = nextMessage?.isAI && nextMessage?.hasActions;
            
            // Vérifier aussi si le message a un analysis_id dans metadata (analysé mais réponse pas juste après)
            const messageMetadata = (message as any).metadata;
            const hasAnalysisMetadata = messageMetadata?.analysis_id || messageMetadata?.analyzed;
            const isHelpRequest = messageMetadata?.is_help_request === true;
            
            // Vérifier si le message nécessiterait une analyse (mais pas si c'est une demande d'aide)
            const couldBeAnalyzed = message.text.length >= 10 && !message.hasAttachments && !isHelpRequest;
            
            return (
              <View
                key={message.id}
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: Platform.select({ web: '80%', default: '90%' }),
                  marginBottom: spacing.lg,
                  width: '100%',
                }}
              >
                {/* Bulle de message */}
                <View
                  style={{
                    backgroundColor: colors.secondary.purple,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 18,
                    borderBottomRightRadius: 4,
                    shadowColor: colors.secondary.purple,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      lineHeight: 22,
                      color: colors.text.inverse,
                    }}
                  >
                    {message.text}
                  </Text>
                </View>

                {/* Bouton "Analyser avec Thomas" si pas encore analysé */}
                {!hasBeenAnalyzed && !hasAnalysisMetadata && couldBeAnalyzed && message.id && !message.id.startsWith('temp-') && !message.id.startsWith('offline') && (
                  <TouchableOpacity
                    onPress={() => analyzeMessageRetroactively(message.id, message.text)}
                    disabled={isAnalyzing}
                    style={{
                      marginTop: spacing.xs,
                      alignSelf: 'flex-end',
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: isAnalyzing ? colors.gray[200] : colors.gray[100],
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isAnalyzing ? colors.gray[300] : colors.gray[200],
                    }}
                  >
                    <Ionicons 
                      name="sparkles" 
                      size={14} 
                      color={isAnalyzing ? colors.gray[400] : colors.secondary.purple} 
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        color: isAnalyzing ? colors.gray[400] : colors.secondary.purple,
                        fontWeight: '600',
                      }}
                    >
                      {isAnalyzing ? 'Analyse...' : 'Analyser avec Thomas'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }

          // Messages assistant simples (sans actions) - bulle blanche à gauche
          return (
            <View
              key={message.id}
              style={{
                alignSelf: 'flex-start',
                maxWidth: Platform.select({ web: '85%', default: '92%' }),
                marginBottom: spacing.lg,
                width: '100%',
                flexDirection: 'row',
                alignItems: 'flex-start',
              }}
            >
              {/* Avatar Thomas */}
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.sm,
                overflow: 'hidden',
              }}>
                <Image
                  source={require('../../assets/Logocolorfull.png')}
                  style={{
                    width: 32,
                    height: 32,
                    resizeMode: 'contain',
                  }}
                />
              </View>
              
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.background.secondary,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 16,
                  borderTopLeftRadius: 4,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    lineHeight: 22,
                    color: colors.text.primary,
                  }}
                >
                  {message.text}
                </Text>
              </View>
            </View>
          );
        })}
        
        {/* Indicateur d'analyse avec animation moderne */}
        {isAnalyzing && (
          <View style={{ alignSelf: 'flex-start', marginBottom: spacing.lg }}>
            <TypingIndicator />
          </View>
        )}
      </ScrollView>
      {showVoiceHelpOverlay && isRecording && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            backgroundColor: 'rgba(255,255,255,0.97)',
            borderTopWidth: 1,
            borderTopColor: colors.border.primary,
            paddingHorizontal: Platform.select({ web: spacing.md, default: spacing.md }),
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.sm,
            }}
          >
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                Aide saisie vocale
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary }}>
                Minimum à dire : action + culture + durée
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowVoiceHelpOverlay(false)}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.gray[100],
                borderWidth: 1,
                borderColor: colors.border.primary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="close" size={16} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={goToNextVoiceHelpExample}
            >
              <View
                {...voiceHelpSwipeResponder.panHandlers}
                style={{
                  backgroundColor: colors.background.secondary,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginBottom: spacing.sm,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 12, color: colors.text.secondary, fontWeight: '600' }}>
                      Exemple {voiceHelpExampleIndex + 1}/{VOICE_HELP_EXAMPLES.length}
                    </Text>
                    <View
                      style={{
                        backgroundColor: currentVoiceHelpCategoryStyle.inactiveBg,
                        borderColor: currentVoiceHelpCategoryStyle.inactiveBorder,
                        borderWidth: 1,
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: currentVoiceHelpCategoryStyle.inactiveText,
                        }}
                      >
                        {currentVoiceHelpCategoryStyle.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                    Touchez ou glissez ← →
                  </Text>
                </View>

                {renderHighlightedVoiceHelpSentence(currentVoiceHelpExample)}

                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.secondary, marginBottom: 4 }}>
                  Essentiels
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
                  {currentVoiceHelpExample.essentials.map((tag, tagIndex) =>
                    renderVoiceHelpTag(tag, `ess-${voiceHelpExampleIndex}-${tagIndex}`)
                  )}
                </View>

                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.secondary, marginBottom: 4 }}>
                  Optionnels
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {currentVoiceHelpExample.optional.length > 0 ? (
                    currentVoiceHelpExample.optional.map((tag, tagIndex) =>
                      renderVoiceHelpTag(tag, `opt-${voiceHelpExampleIndex}-${tagIndex}`)
                    )
                  ) : (
                    <Text style={{ fontSize: 12, color: colors.text.tertiary }}>
                      Aucun pour cet exemple
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              {VOICE_HELP_EXAMPLES.map((_, idx) => (
                <View
                  key={`dot-${idx}`}
                  style={{
                    width: idx === voiceHelpExampleIndex ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      idx === voiceHelpExampleIndex ? colors.primary[500] : colors.gray[300],
                  }}
                />
              ))}
            </View>

            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ fontSize: 11, color: colors.text.tertiary, marginBottom: 6 }}>
                Raccourcis exemples
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}
              >
                {VOICE_HELP_EXAMPLES.map((example, idx) => (
                  <TouchableOpacity
                    key={`shortcut-${idx}`}
                    onPress={() => setVoiceHelpExampleIndex(idx)}
                    style={{
                      width: '31.5%',
                      marginBottom: 6,
                      backgroundColor: idx === voiceHelpExampleIndex
                        ? VOICE_HELP_CATEGORY_STYLES[example.category].activeBg
                        : VOICE_HELP_CATEGORY_STYLES[example.category].inactiveBg,
                      borderColor: idx === voiceHelpExampleIndex
                        ? VOICE_HELP_CATEGORY_STYLES[example.category].activeBorder
                        : VOICE_HELP_CATEGORY_STYLES[example.category].inactiveBorder,
                      borderWidth: idx === voiceHelpExampleIndex ? 1.5 : 1,
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      minHeight: 34,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: 11,
                        lineHeight: 13,
                        textAlign: 'center',
                        fontWeight: '600',
                        color: idx === voiceHelpExampleIndex
                          ? VOICE_HELP_CATEGORY_STYLES[example.category].activeText
                          : VOICE_HELP_CATEGORY_STYLES[example.category].inactiveText,
                      }}
                    >
                      {example.shortcutLabel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}
      </View>

      {/* ===== PIÈCES JOINTES ===== */}
      <AttachmentPreview
        attachments={draftAttachments}
        onRemoveAttachment={handleRemoveAttachment}
      />

      {/* ===== INPUT ZONE CHATGPT STYLE ===== */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ backgroundColor: colors.background.primary }}
      >
        <View style={{
          paddingHorizontal: spacing.sm,
          paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.lg,
          paddingTop: spacing.sm,
        }}>
          {/* Sélecteur Audio / Dictée : visible si dictée disponible, ou toujours sur mobile */}
          {!isRecording && (webSpeech.isDictationAvailable || Platform.OS !== 'web') && (
            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginBottom: spacing.xs,
            }}>
              <View style={{
                flexDirection: 'row',
                backgroundColor: colors.background.secondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border.primary,
                overflow: 'hidden',
              }}>
                <TouchableOpacity
                  onPress={() => setInputMode('vocal_direct')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                    backgroundColor: inputMode === 'vocal_direct' ? colors.primary[500] : 'transparent',
                    gap: 4,
                  }}
                >
                  <Ionicons
                    name="mic"
                    size={14}
                    color={inputMode === 'vocal_direct' ? colors.text.inverse : colors.text.secondary}
                  />
                  <Text style={{
                    fontSize: 12,
                    color: inputMode === 'vocal_direct' ? colors.text.inverse : colors.text.secondary,
                    fontWeight: inputMode === 'vocal_direct' ? '600' : '400',
                  }}>
                    Audio
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (!webSpeech.isDictationAvailable) {
                      Alert.alert(
                        'Dictée non disponible',
                        Platform.OS !== 'web'
                          ? 'La dictée nécessite un development build (npx expo run:android / run:ios). Utilisez le mode Audio pour enregistrer puis transcrire.'
                          : 'La dictée en temps réel nécessite Chrome ou Edge.',
                        [{ text: 'OK' }]
                      );
                      return;
                    }
                    setInputMode('dictation');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                    backgroundColor: inputMode === 'dictation' ? colors.primary[500] : 'transparent',
                    gap: 4,
                    opacity: webSpeech.isDictationAvailable ? 1 : 0.7,
                  }}
                >
                  <Ionicons
                    name="text"
                    size={14}
                    color={inputMode === 'dictation' ? colors.text.inverse : colors.text.secondary}
                  />
                  <Text style={{
                    fontSize: 12,
                    color: inputMode === 'dictation' ? colors.text.inverse : colors.text.secondary,
                    fontWeight: inputMode === 'dictation' ? '600' : '400',
                  }}>
                    Dictée
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {/* Container horizontal comme ChatGPT */}
          {isRecording ? (
            // Interface d'enregistrement (vocal direct OU dictée)
            inputMode === 'dictation' ? (
              // Mode dictée en cours : input avec texte en live
              <View style={{ gap: 8 }}>
                {/* Texte interim affiché au-dessus du vrai input */}
                {webSpeechInterim.length > 0 && (
                  <View style={{
                    backgroundColor: colors.primary[50] || '#f0f7ff',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: colors.primary[200] || '#bfdbfe',
                  }}>
                    <Text style={{
                      fontSize: 14,
                      color: colors.primary[500],
                      fontStyle: 'italic',
                    }}>
                      {webSpeechInterim}
                    </Text>
                  </View>
                )}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                }}>
                  {/* Indicateur d'écoute active — fixé en haut */}
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.semantic.error,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 2,
                  }}>
                    <ActivityIndicator size="small" color={colors.text.inverse} />
                  </View>

                  {/* Texte finalisé — grandit librement avec le contenu */}
                  <View style={{
                    flex: 1,
                    backgroundColor: colors.background.secondary,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: colors.primary[400] || '#60a5fa',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    minHeight: MIN_INPUT_HEIGHT,
                  }}>
                    <Text style={{
                      fontSize: 16,
                      color: inputText ? colors.text.primary : colors.gray[400],
                      lineHeight: LINE_HEIGHT,
                      flexShrink: 1,
                    }}>
                      {inputText || 'Dictez votre message...'}
                    </Text>
                  </View>

                  {/* Bouton Stop dictée — fixé en haut */}
                  <TouchableOpacity
                    onPress={() => {
                      console.log('🛑 [BUTTON] Stop dictée pressé');
                      stopDictation();
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: colors.semantic.success,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginTop: 2,
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.text.inverse}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Mode vocal direct en cours
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}>
                {/* Bouton Delete à gauche */}
                <TouchableOpacity
                  onPress={() => {
                    console.log('🗑️ [BUTTON] Bouton suppression audio pressé:', {
                      platform: Platform.OS,
                      isRecording,
                      hasRecording: !!recording.current,
                      hasMediaRecorder: !!mediaRecorderRef.current,
                    });
                    cancelRecording();
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.semantic.error,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons 
                    name="trash" 
                    size={18} 
                    color={colors.text.inverse}
                  />
                </TouchableOpacity>

                {/* SoundWave au centre */}
                <View style={{
                  flex: 1,
                  backgroundColor: colors.background.secondary,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: colors.border.primary,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                }}>
                  <SoundWave 
                    color={colors.primary[500]}
                    barCount={5}
                    minHeight={8}
                    maxHeight={24}
                    width={3}
                    spacing={4}
                  />
                </View>

                {/* Bouton Send à droite */}
                <TouchableOpacity
                  onPress={() => {
                    console.log('✅ [BUTTON] Bouton envoi audio pressé:', {
                      platform: Platform.OS,
                      isRecording,
                      hasRecording: !!recording.current,
                      hasMediaRecorder: !!mediaRecorderRef.current,
                      mediaRecorderState: mediaRecorderRef.current?.state,
                    });
                    sendAudioMessage();
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.semantic.success,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={colors.text.inverse}
                  />
                </TouchableOpacity>
              </View>
            )
          ) : (
            // Interface normale (input + boutons)
            <View style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 8,
            }}>
              
              {/* Logo PLUS À L'EXTÉRIEUR - comme ChatGPT */}
              <TouchableOpacity 
                onPress={handlePlusPress}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.gray[700],
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons 
                  name="add" 
                  size={22} 
                  color={colors.text.inverse}
                />
              </TouchableOpacity>

              {/* Input field séparé au centre - multiline avec croissance */}
              <View style={{
                flex: 1,
                backgroundColor: colors.background.secondary,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: colors.border.primary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                height: inputHeight,
                maxHeight: MAX_INPUT_HEIGHT,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: colors.text.primary,
                    lineHeight: LINE_HEIGHT,
                    textAlignVertical: 'top',
                    padding: 0, // Pas de padding supplémentaire
                  }}
                  multiline={true}
                  placeholder="Message Thomas..."
                  placeholderTextColor={colors.gray[400]}
                  value={inputText}
                  onChangeText={(text) => {
                    setInputText(text);
                  }}
                  onContentSizeChange={(event) => {
                    const { height } = event.nativeEvent.contentSize;
                    // Calculer la hauteur totale : hauteur du contenu + padding vertical (16px)
                    const totalHeight = height + 16; // paddingVertical: 8px * 2
                    // Limiter entre min et max
                    const newHeight = Math.max(MIN_INPUT_HEIGHT, Math.min(totalHeight, MAX_INPUT_HEIGHT));
                    setInputHeight(newHeight);
                  }}
                  onSubmitEditing={sendMessage}
                  blurOnSubmit={false}
                  returnKeyType="send"
                />
              </View>

              {/* Bouton vocal/envoi À L'EXTÉRIEUR à droite */}
              <TouchableOpacity
                onPress={() => {
                  const hasText = inputText.trim() || draftAttachments.length > 0;
                  console.log('🔘 [BUTTON] Bouton pressé:', { 
                    hasText, 
                    action: hasText ? 'sendMessage' : (inputMode === 'dictation' ? 'startDictation' : 'startRecording'),
                    platform: Platform.OS,
                    inputMode,
                  });
                  if (hasText) {
                    sendMessage();
                  } else if (inputMode === 'dictation') {
                    startDictation();
                  } else {
                    startRecording();
                  }
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: (inputText.trim() || draftAttachments.length > 0) ? colors.semantic.success : colors.gray[700],
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons 
                  name={(inputText.trim() || draftAttachments.length > 0) ? "arrow-up" : (inputMode === 'dictation' ? "text" : "mic")} 
                  size={20} 
                  color={colors.text.inverse}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Menu contextuel du bouton plus */}
      <ChatPlusMenu
        visible={showPlusMenu}
        onClose={() => setShowPlusMenu(false)}
        onActionSelect={handlePlusAction}
        position={{ x: 0, y: 0 }} // Position non utilisée maintenant
        activeFarm={activeFarm}
        currentUserId={currentUserId}
      />

      {/* Modal de sélection de documents */}
      <DocumentPickerModal
        visible={showDocumentPicker}
        onClose={() => setShowDocumentPicker(false)}
        onDocumentSelect={handleDocumentSelect}
        farmId={activeFarm?.farm_id || 0}
      />

      {/* Modal de création de tâches (ancien - via pièces jointes) */}
      <TaskEditModal
        visible={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={handleTaskSave}
        activeFarm={activeFarm}
        selectedDate={new Date()}
      />

      {/* Modal de création de tâches/observations (nouveau - création directe) */}
      <ActionEditModal
        visible={showActionModal}
        action={editingAction || null}
        onClose={() => {
          setShowActionModal(false);
          setEditingAction(undefined);
        }}
        onSave={handleActionSave}
      />

    </View>
  );
}