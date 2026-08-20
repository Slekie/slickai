import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { COLORS, FONTS, RADIUS, SPACING } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = 'slickai_onboarding_done';

interface Slide {
  id: string;
  icon: string;
  iconBg: string[];
  title: string;
  subtitle: string;
  points: string[];
}

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'trending-up',
    iconBg: ['#00C851', '#009E3F'],
    title: 'AI-Powered Trading',
    subtitle: "Slick AI analyzes markets 24/7",
    points: [
      'Real-time signal generation from deep learning models',
      'High-confidence trade signals with risk/reward analysis',
      'Live P&L tracking and performance metrics',
    ],
  },
  {
    id: '2',
    icon: 'link',
    iconBg: ['#0A84FF', '#0060CC'],
    title: 'Connect Your Broker',
    subtitle: 'Secure, encrypted broker integration',
    points: [
      'Support for Deriv, MetaTrader 5, and Oanda',
      'API keys stored with military-grade encryption',
      'Real-time account balance and position sync',
    ],
  },
  {
    id: '3',
    icon: 'options',
    iconBg: ['#FF9500', '#CC7700'],
    title: 'Choose Your Mode',
    subtitle: 'You decide how AI works for you',
    points: [
      'Signal Delivery: Receive signals, trade manually',
      'Automated Trading: AI executes trades on your behalf',
      'Switch modes anytime from Settings',
    ],
  },
];

interface SlideViewProps {
  slide: Slide;
  index: number;
  scrollX: Animated.SharedValue<number>;
}

const SlideView: React.FC<SlideViewProps> = ({ slide, index, scrollX }) => {
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const animStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [30, 0, -30], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.slideContent, animStyle]}>
        <LinearGradient
          colors={slide.iconBg}
          style={styles.iconCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={slide.icon as any} size={48} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.slideTitle}>{slide.title}</Text>
        <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
        <View style={styles.pointsList}>
          {slide.points.map((p, i) => (
            <View key={i} style={styles.pointRow}>
              <View style={styles.pointDot} />
              <Text style={styles.pointText}>{p}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const first = viewableItems[0];
        if (first?.index != null) {
          setCurrentIndex(first.index);
        }
      }
    }
  ).current;

  const markComplete = async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    onComplete();
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      void markComplete();
    }
  };

  const handleSkip = () => void markComplete();

  return (
    <LinearGradient colors={COLORS.gradientBg} style={styles.container}>
      {/* Skip button */}
      {currentIndex < SLIDES.length - 1 && (
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        onScroll={(e) => {
          scrollX.value = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <SlideView slide={item} index={index} scrollX={scrollX} />
        )}
      />

      {/* Pagination dots */}
      <View style={styles.pagination}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, currentIndex === i && styles.dotActive]} />
        ))}
      </View>

      {/* CTA button */}
      <View style={styles.footer}>
        <Pressable style={styles.nextButton} onPress={handleNext}>
          <LinearGradient
            colors={COLORS.gradientBuy}
            style={styles.nextGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons
              name={currentIndex === SLIDES.length - 1 ? 'checkmark' : 'arrow-forward'}
              size={18}
              color="#FFFFFF"
              style={{ marginLeft: 8 }}
            />
          </LinearGradient>
        </Pressable>
      </View>
    </LinearGradient>
  );
};

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: SPACING.md,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 80,
  },
  slideContent: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  slideTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes['3xl'],
    fontWeight: FONTS.weights.extrabold,
    textAlign: 'center',
    marginBottom: 10,
  },
  slideSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  pointsList: {
    alignSelf: 'stretch',
    gap: 12,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  pointText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
    flex: 1,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: SPACING.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 48,
  },
  nextButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
});
