import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, ViewStyle, Animated, PanResponder, Platform, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';

export interface ChatData {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  isArchived: boolean;
  messageCount: number;
  is_shared?: boolean;
  creator_first_name?: string;
  preloadedMessages?: any[]; // Messages préchargés depuis le cache pour affichage instantané
}

export interface ChatCardMinimalProps {
  chat: ChatData;
  cardIndex?: number;
  titleEditEnabled?: boolean;
  isSelected?: boolean;
  onPress?: (chat: ChatData) => void;
  onArchive?: (chat: ChatData, onSuccess?: () => void, onError?: () => void) => void;
  onTitleEdit?: (chatId: string, newTitle: string, onSuccess?: () => void, onError?: () => void) => void;
  style?: ViewStyle;
}

export const ChatCardMinimal: React.FC<ChatCardMinimalProps> = ({
  chat,
  cardIndex = 0,
  titleEditEnabled = false,
  isSelected = false,
  onPress,
  onArchive,
  onTitleEdit,
  style,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [isSwipingToArchive, setIsSwipingToArchive] = useState(false);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleText, setEditingTitleText] = useState(chat.title);

  useEffect(() => {
    if (!isEditingTitle) {
      setEditingTitleText(chat.title);
    }
  }, [chat.title, isEditingTitle]);

  useEffect(() => {
    if (!titleEditEnabled && isEditingTitle) {
      setIsEditingTitle(false);
      setEditingTitleText(chat.title);
    }
  }, [titleEditEnabled, isEditingTitle, chat.title]);
  
  // Fonction pour réinitialiser les animations en cas d'échec
  const resetArchiveAnimation = () => {
    console.log('🔄 [OPTIMISTIC] Resetting archive animation due to failure');
    setIsArchiving(false);
    
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: false,
        tension: 150,
        friction: 8,
      }),
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: false,
        tension: 150,
        friction: 8,
      }),
    ]).start();
  };

  // Fonctions pour gérer l'édition du titre
  const handleStartTitleEdit = () => {
    if (onTitleEdit && !isSwipeActive) {
      console.log('✏️ [TITLE-EDIT] Starting title edit for:', chat.title);
      setIsEditingTitle(true);
      setEditingTitleText(chat.title);
    }
  };

  const handleTitleSubmit = () => {
    const newTitle = editingTitleText.trim();
    if (newTitle && newTitle !== chat.title && onTitleEdit) {
      console.log('💾 [TITLE-EDIT] Saving new title:', newTitle);
      onTitleEdit(
        chat.id, 
        newTitle,
        () => {
          console.log('✅ [TITLE-EDIT] Title updated successfully');
          setIsEditingTitle(false);
        },
        () => {
          console.log('❌ [TITLE-EDIT] Title update failed');
          setEditingTitleText(chat.title); // Reset au titre original
          setIsEditingTitle(false);
        }
      );
    } else {
      // Annuler si pas de changement ou titre vide
      setIsEditingTitle(false);
      setEditingTitleText(chat.title);
    }
  };

  const handleTitleCancel = () => {
    console.log('🚫 [TITLE-EDIT] Cancelling title edit');
    setIsEditingTitle(false);
    setEditingTitleText(chat.title);
  };
  
  // Configuration du PanResponder pour les swipes (seulement sur mobile)
  const panResponder = Platform.OS === 'web' ? null : PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Détecter le swipe horizontal avec plus de tolérance
      const isHorizontalSwipe = Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 30;
      const isSignificantMovement = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
      
      return isHorizontalSwipe && isSignificantMovement;
    },
    onPanResponderGrant: () => {
      // Marquer qu'un swipe est en cours pour bloquer les clics
      setIsSwipeActive(true);
    },
    onPanResponderMove: (_, gestureState) => {
      const { dx } = gestureState;
      
      // Limiter le swipe aux directions d'archivage seulement
      if (dx < -20) {
        // Swipe left -> Indicateur d'archivage
        const newValue = Math.max(dx, -120); // Limiter à -120px
        translateX.setValue(newValue);
        setIsSwipingToArchive(dx < -60);
      } else if (dx > 20) {
        // Swipe right -> Indicateur d'archivage
        const newValue = Math.min(dx, 120); // Limiter à 120px
        translateX.setValue(newValue);
        setIsSwipingToArchive(dx > 60);
      } else {
        translateX.setValue(0);
        setIsSwipingToArchive(false);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      const { dx } = gestureState;
      
      if (Math.abs(dx) > 60) {
        // ANIMATION OPTIMISTE INSTANTANÉE
        console.log('⚡ [OPTIMISTIC] Starting instant archive animation for:', chat.title);
        setIsArchiving(true);
        
        // Animation de disparition immédiate (slide out + fade)
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: dx > 0 ? 400 : -400, // Slide vers la droite ou gauche
            duration: 250,
            useNativeDriver: false,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start(() => {
          console.log('✅ [OPTIMISTIC] Archive animation completed');
        });
        
        // ARCHIVAGE RÉEL EN ARRIÈRE-PLAN
        if (onArchive) {
          setTimeout(() => {
            console.log('🔄 [BACKGROUND] Starting real archive operation');
            onArchive(
              chat,
              () => {
                console.log('✅ [BACKGROUND] Archive operation succeeded'); 
                // Succès : on laisse la card disparue
              },
              () => {
                console.log('❌ [BACKGROUND] Archive operation failed');
                // Échec : on remet la card
                resetArchiveAnimation();
              }
            );
          }, 100); // Petit délai pour que l'animation démarre
        }
      } else {
        // Swipe annulé - reset normal
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: false,
          tension: 150,
          friction: 8,
        }).start();
      }
      
      setIsSwipingToArchive(false);
      // Délai pour éviter le clic après swipe
      setTimeout(() => setIsSwipeActive(false), 300);
    },
    onPanResponderTerminate: () => {
      // En cas d'interruption du gesture
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
      setIsSwipingToArchive(false);
      setIsSwipeActive(false);
    },
  });

  // Fonction pour formater la date
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${Math.max(1, minutes)}min`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else if (days < 7) {
      return `${days}j`;
    }
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Si en cours d'archivage et opacity très faible, ne pas rendre
  if (isArchiving && opacity._value < 0.1) {
    return null;
  }

  // Design unique: on fige toutes les cards sur le style #1.
  const cardVariant = ((cardIndex % 1) + 1) - 1;
  const variantThemes = [
    {
      background: isSelected ? '#e0f2fe' : '#ffffff',
      border: isSelected ? '#0284c7' : '#e5e7eb',
      accent: '#0284c7',
      title: '#111827',
      time: '#64748b',
      countBg: '#e5e7eb',
      countText: '#4b5563',
      archivedBg: '#fef3c7',
      archivedText: '#b45309',
      icon: '#4b5563',
      avatarBg: '#f0f9ff',
    },
    {
      background: isSelected ? '#dcfce7' : '#f0fdf4',
      border: isSelected ? '#16a34a' : '#bbf7d0',
      accent: '#16a34a',
      title: '#14532d',
      time: '#166534',
      countBg: '#d1fae5',
      countText: '#166534',
      archivedBg: '#fef3c7',
      archivedText: '#b45309',
      icon: '#166534',
      avatarBg: '#dcfce7',
    },
    {
      background: isSelected ? '#ede9fe' : '#f5f3ff',
      border: isSelected ? '#7c3aed' : '#ddd6fe',
      accent: '#7c3aed',
      title: '#4c1d95',
      time: '#6d28d9',
      countBg: '#ddd6fe',
      countText: '#5b21b6',
      archivedBg: '#fee2e2',
      archivedText: '#b91c1c',
      icon: '#6d28d9',
      avatarBg: '#ede9fe',
    },
    {
      background: isSelected ? '#e2e8f0' : '#f8fafc',
      border: isSelected ? '#334155' : '#cbd5e1',
      accent: '#334155',
      title: '#0f172a',
      time: '#475569',
      countBg: '#e2e8f0',
      countText: '#334155',
      archivedBg: '#fef3c7',
      archivedText: '#92400e',
      icon: '#475569',
      avatarBg: '#e2e8f0',
    },
  ] as const;
  const theme = variantThemes[cardVariant];

  const handleArchiveFromButton = () => {
    // ANIMATION OPTIMISTE INSTANTANÉE POUR LE BOUTON WEB
    console.log('⚡ [OPTIMISTIC-WEB] Starting instant archive animation for:', chat.title);
    setIsArchiving(true);

    // Animation de disparition immédiate (fade + slide)
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -200, // Slide vers la gauche
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      console.log('✅ [OPTIMISTIC-WEB] Archive animation completed');
    });

    // ARCHIVAGE RÉEL EN ARRIÈRE-PLAN
    if (onArchive) {
      setTimeout(() => {
        console.log('🔄 [BACKGROUND-WEB] Starting real archive operation');
        onArchive(
          chat,
          () => {
            console.log('✅ [BACKGROUND-WEB] Archive operation succeeded');
            // Succès : on laisse la card disparue
          },
          () => {
            console.log('❌ [BACKGROUND-WEB] Archive operation failed');
            // Échec : on remet la card
            resetArchiveAnimation();
          }
        );
      }, 100); // Petit délai pour que l'animation démarre
    }
  };

  const renderAvatar = (size: number, borderRadius: number) => (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: theme.avatarBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
      }}
    >
      <Image
        source={require('../../../../assets/Logocolorfull.png')}
        style={{
          width: size,
          height: size,
          resizeMode: 'contain',
        }}
      />
    </View>
  );

  const renderTitle = (titleColor: string, fontSize: number = 15) => {
    if (isEditingTitle) {
      return (
        <TextInput
          style={{
            fontSize,
            fontWeight: '600',
            color: titleColor,
            flex: 1,
            marginRight: 8,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: theme.accent,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
          value={editingTitleText}
          onChangeText={setEditingTitleText}
          onSubmitEditing={handleTitleSubmit}
          onBlur={handleTitleSubmit}
          autoFocus={true}
          selectTextOnFocus={true}
          returnKeyType="done"
          placeholder="Titre du chat"
          maxLength={50}
        />
      );
    }

    if (titleEditEnabled && onTitleEdit) {
      return (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleStartTitleEdit();
          }}
          activeOpacity={0.7}
          style={{ flex: 1 }}
        >
          <Text
            style={{
              fontSize,
              fontWeight: '700',
              color: titleColor,
              marginRight: 8,
            }}
            numberOfLines={1}
          >
            {chat.title}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <Text
        style={{
          fontSize,
          fontWeight: '700',
          color: titleColor,
          marginRight: 8,
        }}
        numberOfLines={1}
      >
        {chat.title}
      </Text>
    );
  };

  const renderMessageCountBadge = () => (
    <View
      style={{
        backgroundColor: chat.messageCount > 0 ? theme.countBg : 'transparent',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 9,
        minWidth: 22,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 10,
          color: theme.countText,
          fontWeight: '600',
        }}
      >
        {chat.messageCount}
      </Text>
    </View>
  );

  const renderArchivedBadge = () =>
    chat.isArchived ? (
      <View
        style={{
          marginLeft: 6,
          backgroundColor: theme.archivedBg,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            color: theme.archivedText,
            fontWeight: '700',
          }}
        >
          ARCHIVÉ
        </Text>
      </View>
    ) : null;

  const renderVisibilityBadge = () => (
    <View
      style={{
        marginLeft: 6,
        backgroundColor: chat.is_shared ? '#dcfce7' : '#fee2e2',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Ionicons
        name={chat.is_shared ? 'people-outline' : 'lock-closed-outline'}
        size={11}
        color={chat.is_shared ? '#166534' : '#991b1b'}
        style={{ marginRight: 4 }}
      />
      <Text
        style={{
          fontSize: 10,
          color: chat.is_shared ? '#166534' : '#991b1b',
          fontWeight: '700',
        }}
      >
        {chat.is_shared ? 'PUBLIC' : 'PRIVE'}
      </Text>
    </View>
  );

  const renderCreatorBadge = () =>
    chat.creator_first_name ? (
      <View
        style={{
          marginTop: 6,
          alignSelf: 'flex-start',
          backgroundColor: '#ecfeff',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Ionicons
          name="person-outline"
          size={11}
          color="#0e7490"
          style={{ marginRight: 4 }}
        />
        <Text
          style={{
            fontSize: 10,
            color: '#0e7490',
            fontWeight: '700',
          }}
        >
          {chat.creator_first_name}
        </Text>
      </View>
    ) : null;

  const renderArchiveOrSelectedControl = () => {
    if (Platform.OS === 'web') {
      return (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleArchiveFromButton();
          }}
          style={{
            padding: 4,
            borderRadius: 6,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons name="archive-outline" size={14} color={theme.icon} />
        </TouchableOpacity>
      );
    }

    if (isSelected) {
      return <Ionicons name="chevron-forward" size={16} color={theme.accent} />;
    }

    return null;
  };

  const renderEditOrActionControls = () => {
    if (isEditingTitle) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleTitleCancel();
            }}
            style={{
              padding: 4,
              borderRadius: 6,
              backgroundColor: '#fef2f2',
              marginRight: 4,
            }}
          >
            <Ionicons name="close" size={14} color="#dc2626" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleTitleSubmit();
            }}
            style={{
              padding: 4,
              borderRadius: 6,
              backgroundColor: '#ecfeff',
            }}
          >
            <Ionicons name="checkmark" size={14} color={theme.accent} />
          </TouchableOpacity>
        </View>
      );
    }

    return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{renderArchiveOrSelectedControl()}</View>;
  };

  const renderVariantContent = () => {
    if (cardVariant === 0) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {renderAvatar(36, 18)}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>{renderTitle(theme.title, 15)}</View>
              <Text style={{ marginLeft: 8, fontSize: 12, color: theme.time, fontWeight: '600' }}>
                {formatDate(chat.timestamp)}
              </Text>
            </View>
            {renderCreatorBadge()}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {renderMessageCountBadge()}
                {renderVisibilityBadge()}
                {renderArchivedBadge()}
              </View>
              {renderEditOrActionControls()}
            </View>
          </View>
        </View>
      );
    }

    if (cardVariant === 1) {
      return (
        <View>
          <View
            style={{
              height: 3,
              backgroundColor: theme.accent,
              borderRadius: 999,
              marginBottom: 8,
              opacity: 0.8,
            }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {renderAvatar(34, 10)}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 11, color: theme.time, fontWeight: '700' }}>
                    {formatDate(chat.timestamp)}
                  </Text>
                </View>
                {renderEditOrActionControls()}
              </View>
              <View style={{ marginTop: 8 }}>{renderTitle(theme.title, 16)}</View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                {renderMessageCountBadge()}
                {renderArchivedBadge()}
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (cardVariant === 2) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
          <View
            style={{
              width: 4,
              borderRadius: 999,
              backgroundColor: theme.accent,
              marginRight: 10,
            }}
          />
          {renderAvatar(32, 16)}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>{renderTitle(theme.title, 15)}</View>
              {renderEditOrActionControls()}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: theme.border,
                  borderWidth: 1,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.time, fontWeight: '700' }}>
                  {formatDate(chat.timestamp)}
                </Text>
              </View>
              <View style={{ marginLeft: 8 }}>{renderMessageCountBadge()}</View>
              {renderArchivedBadge()}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {renderAvatar(36, 12)}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {renderMessageCountBadge()}
              <View
                style={{
                  marginLeft: 6,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.time, fontWeight: '700' }}>
                  {formatDate(chat.timestamp)}
                </Text>
              </View>
            </View>
            {renderEditOrActionControls()}
          </View>
          <View style={{ marginTop: 8 }}>{renderTitle(theme.title, 16)}</View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            {renderArchivedBadge()}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={[{
      marginVertical: 4,
      opacity: opacity,
      transform: [{ translateX: translateX }],
    }, style]}>
      
      {/* Indicateurs de swipe (background) - Seulement sur mobile */}
      {Platform.OS !== 'web' && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isSwipingToArchive ? '#fef3c7' : '#f3f4f6',
          borderRadius: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          opacity: isSwipingToArchive ? 0.9 : 0,
        }}>
          {/* Indicateur gauche */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            opacity: isSwipingToArchive ? 1 : 0.5,
          }}>
            <Ionicons 
              name="archive-outline" 
              size={20} 
              color={isSwipingToArchive ? '#d97706' : '#9ca3af'} 
            />
            <Text style={{
              marginLeft: 6,
              fontSize: 14,
              color: isSwipingToArchive ? '#d97706' : '#9ca3af',
              fontWeight: '500'
            }}>
              {chat.isArchived ? 'Désarchiver' : 'Archiver'}
            </Text>
          </View>

          {/* Indicateur droite */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            opacity: isSwipingToArchive ? 1 : 0.5,
          }}>
            <Text style={{
              marginRight: 6,
              fontSize: 14,
              color: isSwipingToArchive ? '#d97706' : '#9ca3af',
              fontWeight: '500'
            }}>
              {chat.isArchived ? 'Désarchiver' : 'Archiver'}
            </Text>
            <Ionicons 
              name="archive-outline" 
              size={20} 
              color={isSwipingToArchive ? '#d97706' : '#9ca3af'} 
            />
          </View>
        </View>
      )}

      {/* Carte principale - Style ChatGPT */}
      <Animated.View
        style={{
          transform: [{ translateX }],
        }}
        {...(panResponder?.panHandlers || {})}
      >
        <TouchableOpacity
          style={{
            backgroundColor: theme.background,
            borderRadius: 12,
            padding: 10,
            marginHorizontal: 2,
            borderWidth: isSelected ? 1.5 : 1,
            borderColor: theme.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
          onPress={() => {
            // Empêcher le clic si un swipe est en cours ou si on édite le titre
            if (!isSwipeActive && !isEditingTitle) {
              onPress?.(chat);
            }
          }}
          activeOpacity={0.7}
          delayPressIn={Platform.OS === 'web' ? 0 : 150}
          disabled={isSwipeActive || isEditingTitle}
        >
          {renderVariantContent()}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};