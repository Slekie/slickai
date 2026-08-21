import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import { COLORS, FONTS, RADIUS, SPACING } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * ErrorBoundary
 *
 * Class component that catches unhandled JS errors propagating up from its
 * children. On error it renders a graceful error screen with a "Restart"
 * button that reloads the app via expo-updates.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MainTabNavigator />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message ?? 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }
  }

  private handleRestart = (): void => {
    void Updates.reloadAsync().catch(() => {
      // If reloadAsync fails (e.g. in Expo Go without OTA), reset state to retry
      this.setState({ hasError: false, errorMessage: '' });
    });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        {__DEV__ && (
          <Text style={styles.detail} numberOfLines={4}>
            {this.state.errorMessage}
          </Text>
        )}
        <Text style={styles.body}>
          An unexpected error occurred. Please restart the app to continue.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={this.handleRestart}
          accessibilityRole="button"
          accessibilityLabel="Restart the app"
        >
          <Text style={styles.buttonText}>Restart</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  icon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes['2xl'],
    fontWeight: FONTS.weights.bold,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  body: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  detail: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
});
