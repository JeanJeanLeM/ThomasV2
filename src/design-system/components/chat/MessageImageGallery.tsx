import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Image, Modal, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Text } from '../Text';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { supabase } from '../../../utils/supabase';

interface MessageImage {
  uri: string;
  name?: string;
  storagePath?: string;
}

interface MessageImageGalleryProps {
  images: MessageImage[];
  maxPreviewImages?: number;
}

export const MessageImageGallery: React.FC<MessageImageGalleryProps> = ({
  images,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [resolvedUris, setResolvedUris] = useState<Record<number, string>>({});
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  if (!images || images.length === 0) {
    return null;
  }

  const { width: screenWidth } = Dimensions.get('window');
  const previewWidth = Math.min(screenWidth * 0.58, 220);
  const previewHeight = Math.round(previewWidth * 0.68);

  useEffect(() => {
    let isMounted = true;

    const resolveImageUris = async () => {
      const entries = await Promise.all(
        images.map(async (image, index) => {
          if (image.storagePath) {
            try {
              const { data, error } = await supabase.storage
                .from('photos')
                .createSignedUrl(image.storagePath, 60 * 60);

              if (!error && data?.signedUrl) {
                return [index, data.signedUrl] as const;
              }
            } catch (error) {
              console.warn('⚠️ [CHAT-IMAGE] Signed URL unavailable:', error);
            }
          }

          return [index, image.uri] as const;
        })
      );

      if (isMounted) {
        setResolvedUris(Object.fromEntries(entries));
        setFailedImages({});
      }
    };

    resolveImageUris();

    return () => {
      isMounted = false;
    };
  }, [images]);

  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index);
    setModalVisible(true);
  };

  const closeImageViewer = () => {
    setModalVisible(false);
    setSelectedImageIndex(null);
  };

  const renderImageCarousel = () => {
    return (
      <View style={{ marginTop: spacing.sm }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={previewWidth + spacing.xs}
          decelerationRate="fast"
          contentContainerStyle={{ gap: spacing.xs, paddingRight: spacing.xs }}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / (previewWidth + spacing.xs));
            setActivePreviewIndex(Math.max(0, Math.min(images.length - 1, nextIndex)));
          }}
        >
          {images.map((image, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => openImageViewer(index)}
              style={{
                width: previewWidth,
                height: previewHeight,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: colors.gray[100],
                position: 'relative',
              }}
            >
              {resolvedUris[index] && !failedImages[index] ? (
                <Image
                  source={{ uri: resolvedUris[index] }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                  onError={() => {
                    if (image.storagePath && resolvedUris[index] !== image.uri) {
                      setResolvedUris(prev => ({ ...prev, [index]: image.uri }));
                      return;
                    }
                    setFailedImages(prev => ({ ...prev, [index]: true }));
                  }}
                />
              ) : failedImages[index] ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.sm }}>
                  <Ionicons name="image-outline" size={24} color={colors.gray[400]} />
                  <Text style={{ marginTop: spacing.xs, fontSize: 11, color: colors.gray[500], textAlign: 'center' }}>
                    Image indisponible
                  </Text>
                </View>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                </View>
              )}

              {images.length > 1 && (
                <View style={{
                  position: 'absolute',
                  right: spacing.xs,
                  bottom: spacing.xs,
                  backgroundColor: 'rgba(0, 0, 0, 0.55)',
                  borderRadius: 999,
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 2,
                }}>
                  <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                    {index + 1}/{images.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {images.length > 1 && (
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 4,
            marginTop: spacing.xs,
          }}>
            {images.map((_, index) => (
              <View
                key={index}
                style={{
                  width: index === activePreviewIndex ? 14 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: index === activePreviewIndex ? colors.primary[500] : colors.gray[300],
                }}
              />
            ))}
          </View>
        )}
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
                  source={{ uri: resolvedUris[index] || image.uri }}
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
      {renderImageCarousel()}
      {renderImageViewer()}
    </>
  );
};