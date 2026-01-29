import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, Image } from 'react-native';
import { Text } from '../../design-system/components';
import { spacing } from '../../design-system/spacing';

interface TypingIndicatorProps {
  /** Message à afficher */
  message?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  message = "Thomas analyse..."
}) => {
  // Animation des 3 points
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true
          }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'flex-start',
      maxWidth: '80%',
    }}>
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
          source={require('../../../assets/Logocolorfull.png')}
          style={{
            width: 32,
            height: 32,
            resizeMode: 'contain',
          }}
        />
      </View>

      {/* Bulle de message simple */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        borderTopLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Text style={{
          fontSize: 15,
          color: '#6b7280',
          marginRight: 4,
        }}>
          {message}
        </Text>
        
        {/* Points animés */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 2 }}>
          <Animated.View style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: '#9ca3af',
            marginHorizontal: 1.5,
            opacity: dot1,
          }} />
          <Animated.View style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: '#9ca3af',
            marginHorizontal: 1.5,
            opacity: dot2,
          }} />
          <Animated.View style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: '#9ca3af',
            marginHorizontal: 1.5,
            opacity: dot3,
          }} />
        </View>
      </View>
    </View>
  );
};

export default TypingIndicator;

