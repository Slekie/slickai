import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

import { COLORS, RADIUS, SPACING } from '../../theme/index';

interface AutomatedBannerProps {
  message?: string;
}

export const AutomatedBanner: React.FC<AutomatedBannerProps> = ({
  message = 'AI is managing trades — manual trading is disabled',
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-8);

  useEffect(() => {
    opacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(100, withTiming(0, { duration: 400 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, animStyle]}>
      <LinearGradient
        colors={['rgba(0,200,81,0.18)', 'rgba(0,158,63,0.12)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Ionicons name="hardware-chip" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>🤖 Automated Trading Active</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
          <View style={styles.lockContainer}>
            <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,200,81,0.3)',
  },
  gradient: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  lockContainer: {
    marginLeft: 8,
  },
});
