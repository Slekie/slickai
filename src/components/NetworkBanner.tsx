import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { websocketService } from '../services/websocketService';
import { COLORS, FONTS, SPACING } from '../theme';

/**
 * NetworkBanner
 *
 * Renders a persistent bottom banner when the device has no internet connection.
 * Auto-dismisses when connectivity is restored and triggers WebSocket reconnect.
 *
 * Mount this component above (or inside) MainTabNavigator so it is visible
 * on all authenticated screens.
 */
export const NetworkBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  // Track first render to avoid false positives before NetInfo resolves
  const hasInitialized = useRef(false);

  const translateY = useSharedValue(60); // starts off-screen below
  const opacity = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Show / hide banner with smooth animation
  useEffect(() => {
    if (isOffline) {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(60, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isOffline]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      // Skip first event on mount — it can briefly report null/false
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        // Only mark offline if explicitly false (not null/unknown)
        if (state.isConnected === false) {
          setIsOffline(true);
        }
        return;
      }

      const offline = state.isConnected === false;
      setIsOffline((prev) => {
        if (prev && !offline) {
          // Connection restored — reconnect WebSocket
          websocketService.resumeReconnect();
        }
        return offline;
      });
    });

    return () => unsubscribe();
  }, []);

  // Don't render anything in the tree when online (keeps layout clean)
  if (!isOffline && opacity.value === 0) return null;

  return (
    <Animated.View style={[styles.banner, animStyle]} pointerEvents="none">
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    zIndex: 9999,
  },
  text: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
});
