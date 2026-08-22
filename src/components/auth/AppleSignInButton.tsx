import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { FONTS, RADIUS, SPACING } from '../../theme';

// ---------------------------------------------------------------------------
// expo-apple-authentication is a native module — it requires a dev/production
// build and is NOT available in Expo Go.  We lazy-import it so that:
//   1. Android: the component is not rendered at all (returns null).
//   2. iOS + Expo Go: isAvailableAsync() returns false → renders a styled
//      placeholder button that explains the build requirement when tapped.
//   3. iOS + dev/production build: fully functional Apple Sign-In button.
// ---------------------------------------------------------------------------

export interface AppleSignInButtonProps {
  /** Called after a successful sign-in and authStore update. */
  onSuccess: () => void;
  /** Called on unexpected errors (not on user cancellation). */
  onError: (err: Error) => void;
}

/**
 * Apple Sign-In button.
 *
 * On Android: renders nothing (Apple Sign-In is iOS-only per Apple guidelines).
 * On iOS + Expo Go: renders a styled placeholder so the layout is visible.
 * On iOS + dev/production build: renders the real AppleAuthenticationButton.
 */
export const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onSuccess,
  onError,
}) => {
  // Apple Sign-In is iOS-only — never render on Android
  if (Platform.OS !== 'ios') return null;

  return <AppleSignInButtonIOS onSuccess={onSuccess} onError={onError} />;
};

// Inner component only mounted on iOS
const AppleSignInButtonIOS: React.FC<AppleSignInButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const authStore = useAuthStore();

  // null = checking; false = unavailable (Expo Go); true = SDK available
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appleAuthRef = useRef<any>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const AppleAuth = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
        appleAuthRef.current = AppleAuth;
        const available = await AppleAuth.isAvailableAsync();
        if (mounted.current) setIsAvailable(available);
      } catch {
        // Native module not linked — Expo Go
        if (mounted.current) setIsAvailable(false);
      }
    })();
  }, []);

  // Still checking — render placeholder to avoid layout shift
  if (isAvailable === null) {
    return <View style={styles.button} />;
  }

  // SDK available — use the real native button
  if (isAvailable && appleAuthRef.current) {
    const AppleAuth = appleAuthRef.current as typeof import('expo-apple-authentication');

    const handlePress = async () => {
      try {
        const credential = await AppleAuth.signInAsync({
          requestedScopes: [
            AppleAuth.AppleAuthenticationScope.EMAIL,
            AppleAuth.AppleAuthenticationScope.FULL_NAME,
          ],
        });

        if (!credential.identityToken) {
          onError(new Error('Apple Sign-In did not return an identity token.'));
          return;
        }

        const { user, token, refreshToken } = await authService.loginWithApple(
          credential.identityToken,
          credential.email ?? null,
        );
        await authStore.login(user, token, refreshToken);
        onSuccess();
      } catch (err: unknown) {
        // ERR_CANCELED — user dismissed the sheet, silently ignore
        if (
          err instanceof Error &&
          (err as Error & { code?: string }).code === 'ERR_CANCELED'
        ) {
          return;
        }
        onError(
          err instanceof Error
            ? err
            : new Error('Apple Sign-In failed. Please try again.'),
        );
      }
    };

    return (
      <AppleAuth.AppleAuthenticationButton
        buttonType={AppleAuth.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuth.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={RADIUS.md}
        style={styles.button}
        onPress={handlePress}
      />
    );
  }

  // SDK unavailable (Expo Go) — render a visible styled fallback so layout
  // matches what users will see in a real build.
  const handleFallbackPress = () => {
    onError(
      new Error('Sign in with Apple requires a development or production build.'),
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.button, styles.fallbackButton, pressed && styles.fallbackPressed]}
      onPress={handleFallbackPress}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Apple"
      accessibilityHint="Requires a development build — not available in Expo Go"
    >
      <View style={styles.fallbackInner}>
        {/* Apple logo rendered as styled unicode character */}
        <Text style={styles.appleLogo}></Text>
        <Text style={styles.fallbackLabel}>Sign in with Apple</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 50,
    marginBottom: SPACING.sm,
  },
  fallbackButton: {
    backgroundColor: '#000000',
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackPressed: {
    opacity: 0.8,
  },
  fallbackInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appleLogo: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 24,
    marginTop: -2, // optical alignment for the Apple glyph
  },
  fallbackLabel: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
});
