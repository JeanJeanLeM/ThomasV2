import React, { useRef, useState } from 'react';
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
  preloadedMessages?: any[]; // Messages préchargés depuis le cache pour affichage instantané
}

export interface ChatCardMinimalProps {
  chat: ChatData;
  isSelected?: boolean;
  onPress?: (chat: ChatData) => void;
  onArchive?: (chat: ChatData, onSuccess?: () => void, onError?: () => void) => void;
  onTitleEdit?: (chatId: string, newTitle: string, onSuccess?: () => void, onError?: () => void) => void;
  style?: ViewStyle;
}

export const ChatCardMinimal: React.FC<ChatCardMinimalProps> = ({
  chat,
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
  const handleTitleLongPress = () => {
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
      return `${minutes}min`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else if (days < 7) {
      return `${days}j`;
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric',
        month: 'short' 
      });
    }
  };

  // Si en cours d'archivage et opacity très faible, ne pas rendre
  if (isArchiving && opacity._value < 0.1) {
    return null;
  }

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
            backgroundColor: isSelected ? '#e0f2fe' : '#ffffff',
            borderRadius: 12,
            padding: 12,
            marginHorizontal: 2,
            borderWidth: isSelected ? 1.5 : 0,
            borderColor: isSelected ? '#0284c7' : 'transparent',
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
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center',
          }}>
            {/* Avatar simple */}
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
              overflow: 'hidden',
            }}>
              <Image
                source={require('../../../../assets/Logocolorfull.png')}
                style={{
                  width: 32,
                  height: 32,
                  resizeMode: 'contain',
                }}
              />
            </View>

            {/* Contenu principal */}
            <View style={{ flex: 1 }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 2,
              }}>
                {isEditingTitle ? (
                  <TextInput
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: '#1f2937',
                      flex: 1,
                      marginRight: 8,
                      backgroundColor: '#f9fafb',
                      borderWidth: 1,
                      borderColor: '#3b82f6',
                      borderRadius: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
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
                ) : (
                  <TouchableOpacity 
                    onLongPress={handleTitleLongPress}
                    onPress={(e) => {
                      // Sur web, un simple clic active l'édition
                      if (Platform.OS === 'web') {
                        e.stopPropagation();
                        handleTitleLongPress();
                      }
                    }}
                    style={{ flex: 1 }}
                    activeOpacity={0.7}
                  >
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: '#1f2937',
                      marginRight: 8,
                    }} numberOfLines={1}>
                      {chat.title}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {!isEditingTitle && onTitleEdit && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleTitleLongPress();
                      }}
                      style={{
                        padding: 2,
                        marginRight: 4,
                        borderRadius: 3,
                        opacity: 0.6,
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name="pencil" 
                        size={12} 
                        color="#6b7280" 
                      />
                    </TouchableOpacity>
                  )}
                  <Text style={{
                    fontSize: 12,
                    color: '#6b7280',
                    fontWeight: '500',
                  }}>
                    {formatDate(chat.timestamp)}
                  </Text>
                </View>
              </View>
              
              <Text style={{
                fontSize: 13,
                color: '#9ca3af',
                lineHeight: 18,
              }} numberOfLines={1}>
                {chat.lastMessage}
              </Text>

              {/* Indicateurs en bas */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 4,
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <View style={{
                    backgroundColor: chat.messageCount > 0 ? '#e5e7eb' : 'transparent',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 8,
                    minWidth: 20,
                    alignItems: 'center',
                  }}>
                    <Text style={{
                      fontSize: 10,
                      color: '#6b7280',
                      fontWeight: '500',
                    }}>
                      {chat.messageCount}
                    </Text>
                  </View>
                  
                  {chat.isArchived && (
                    <View style={{
                      marginLeft: 6,
                      backgroundColor: '#fef3c7',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}>
                      <Text style={{
                        fontSize: 9,
                        color: '#d97706',
                        fontWeight: '600',
                      }}>
                        ARCHIVÉ
                      </Text>
                    </View>
                  )}
                </View>

                {/* Boutons d'édition ou d'archivage/sélection */}
                {isEditingTitle ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Bouton Annuler */}
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleTitleCancel();
                      }}
                      style={{
                        padding: 4,
                        borderRadius: 4,
                        backgroundColor: '#fef3f3',
                        marginRight: 4,
                      }}
                    >
                      <Ionicons 
                        name="close" 
                        size={14} 
                        color="#dc2626" 
                      />
                    </TouchableOpacity>
                    
                    {/* Bouton Valider */}
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleTitleSubmit();
                      }}
                      style={{
                        padding: 4,
                        borderRadius: 4,
                        backgroundColor: '#f0f9ff',
                      }}
                    >
                      <Ionicons 
                        name="checkmark" 
                        size={14} 
                        color="#0284c7" 
                      />
                    </TouchableOpacity>
                  </View>
                ) : Platform.OS === 'web' ? (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      
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
                    }}
                    style={{
                      padding: 4,
                      borderRadius: 4,
                      backgroundColor: '#f3f4f6',
                    }}
                  >
                    <Ionicons 
                      name="archive-outline" 
                      size={14} 
                      color="#6b7280" 
                    />
                  </TouchableOpacity>
                ) : isSelected ? (
                  <Ionicons 
                    name="chevron-forward" 
                    size={16} 
                    color="#0284c7" 
                  />
                ) : null}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};