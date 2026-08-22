import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../theme';

interface SkeletonLineProps {
  width?: ViewStyle['width'];
  height?: number;
  style?: ViewStyle;
}

const SkeletonLine: React.FC<SkeletonLineProps> = ({
  width = '100%',
  height = 14,
  style,
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 700 }),
        withTiming(0.3, { duration: 700 })
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius: height / 2 },
        animStyle,
        style,
      ]}
    />
  );
};

interface SkeletonCardProps {
  style?: ViewStyle;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ style }) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <SkeletonLine width={120} height={18} />
        <SkeletonLine width={48} height={22} style={styles.badge} />
        <SkeletonLine width={60} height={18} />
      </View>
      <View style={styles.detailRow}>
        <SkeletonLine width={70} height={13} />
        <SkeletonLine width={70} height={13} />
        <SkeletonLine width={70} height={13} />
        <SkeletonLine width={70} height={13} />
      </View>
      <SkeletonLine width="100%" height={8} style={{ borderRadius: 4, marginTop: 8 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.bgCardElevated,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  badge: {
    borderRadius: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
