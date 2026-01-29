import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../../colors';

interface SoundWaveProps {
  color?: string;
  barCount?: number;
  minHeight?: number;
  maxHeight?: number;
  width?: number;
  spacing?: number;
  animationDuration?: number;
}

const SoundWave: React.FC<SoundWaveProps> = ({
  color = colors.primary[500],
  barCount = 5,
  minHeight = 8,
  maxHeight = 32,
  width = 4,
  spacing = 4,
  animationDuration = 600,
}) => {
  const animatedValues = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(minHeight))
  ).current;

  useEffect(() => {
    // Créer des animations décalées pour chaque barre
    const animations = animatedValues.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay((animationDuration / barCount) * index),
          Animated.sequence([
            Animated.timing(anim, {
              toValue: maxHeight,
              duration: animationDuration / 2,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: minHeight,
              duration: animationDuration / 2,
              useNativeDriver: false,
            }),
          ]),
        ])
      );
    });

    // Démarrer toutes les animations
    Animated.parallel(animations).start();

    // Cleanup
    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, []);

  return (
    <View style={[styles.container, { gap: spacing }]}>
      {animatedValues.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              width,
              height: anim,
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  bar: {
    borderRadius: 2,
  },
});

export default SoundWave;
