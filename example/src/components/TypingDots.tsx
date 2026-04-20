/**
 * Animated three-dot "typing…" indicator. Each dot pulses with an
 * offset so they ripple like Telegram's native indicator.
 */

import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {colors} from '../theme';

interface Props {
  color?: string;
  size?: number;
}

const TypingDots: React.FC<Props> = ({color = colors.textSecondary, size = 4}) => {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  const c = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {toValue: 1, duration: 300, useNativeDriver: true}),
          Animated.timing(value, {toValue: 0, duration: 300, useNativeDriver: true}),
          Animated.delay(600 - delay),
        ]),
      );
    const anims = [loop(a, 0), loop(b, 150), loop(c, 300)];
    anims.forEach(x => x.start());
    return () => anims.forEach(x => x.stop());
  }, [a, b, c]);

  const dotStyle = (v: Animated.Value) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    opacity: v.interpolate({inputRange: [0, 1], outputRange: [0.25, 1]}),
    transform: [
      {translateY: v.interpolate({inputRange: [0, 1], outputRange: [0, -3]})},
    ],
  });

  return (
    <View style={styles.row}>
      <Animated.View style={dotStyle(a)} />
      <Animated.View style={[dotStyle(b), styles.spaced]} />
      <Animated.View style={[dotStyle(c), styles.spaced]} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
  spaced: {marginLeft: 3},
});

export default TypingDots;
