import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Modal, ScrollView, Dimensions } from 'react-native';
import { Text } from '../Text';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../colors';
import { spacing } from '../../spacing';

interface MessageImage {
  uri: string;
  name?: string;
}

interface MessageImageGalleryProps {
  images: MessageImage[];
  maxPreviewImages?: number;
}

export const MessageImageGallery: React.FC<MessageImageGalleryProps> = ({
  images,
  maxPreviewImages = 4,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  if (!images || images.length === 0) {
    return null;
  }

  const { width: screenWidth } = Dimensions.get('window');
  const imageSize = Math.min((screenWidth - 80) / 2, 150); // Max 150px, responsive

  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index);
    setModalVisible(true);
  };

  const closeImageViewer = () => {
    setModalVisible(false);
    setSelectedImageIndex(null);
  };

  const renderImageGrid = () => {
    const visibleImages = images.slice(0, maxPreviewImages);
    const remainingCount = images.length - maxPreviewImages;

    return (
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginTop: spacing.sm,
      }}>
        {visibleImages.map((image, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => openImageViewer(index)}
            style={{
              width: imageSize,
              height: imageSize,
              borderRadius: 8,
              overflow: 'hidden',
              backgroundColor: colors.gray[100],
              position: 'relative',
            }}
          >
            <Image
              source={{ uri: image.uri }}
              style={{
                width: '100%',
                height: '100%',
              }}
              resizeMode="cover"
            />
            
            {/* Overlay pour le dernier élément si il y a plus d'images */}
            {index === maxPreviewImages - 1 && remainingCount > 0 && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{
                  color: '#ffffff',
                  fontSize: 18,
                  fontWeight: '700',
                }}>
                  +{remainingCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderImageViewer = () => {
    if (selectedImageIndex === null) return null;

    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Header avec bouton fermer */}
          <View style={{
            position: 'absolute',
            top: 50,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: spacing.md,
            zIndex: 1,
          }}>
            <Text style={{
              color: '#ffffff',
              fontSize: 16,
              fontWeight: '600',
            }}>
              {selectedImageIndex + 1} / {images.length}
            </Text>
            
            <TouchableOpacity
              onPress={closeImageViewer}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Galerie scrollable */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: selectedImageIndex * screenWidth, y: 0 }}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              setSelectedImageIndex(newIndex);
            }}
          >
            {images.map((image, index) => (
              <View
                key={index}
                style={{
                  width: screenWidth,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: spacing.md,
                }}
              >
                <Image
                  source={{ uri: image.uri }}
                  style={{
                    width: screenWidth - (spacing.md * 2),
                    height: (screenWidth - (spacing.md * 2)) * 0.75, // Ratio 4:3
                    maxHeight: '70%',
                  }}
                  resizeMode="contain"
                />
                
                {/* Nom de l'image si disponible */}
                {image.name && (
                  <Text style={{
                    color: '#ffffff',
                    fontSize: 14,
                    marginTop: spacing.sm,
                    textAlign: 'center',
                  }}>
                    {image.name}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Indicateurs de pagination */}
          {images.length > 1 && (
            <View style={{
              position: 'absolute',
              bottom: 50,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: spacing.xs,
            }}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index === selectedImageIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>
    );
  };

  return (
    <>
      {renderImageGrid()}
      {renderImageViewer()}
    </>
  );
};