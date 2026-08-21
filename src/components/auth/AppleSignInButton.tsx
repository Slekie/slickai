import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { RADIUS, SPACING } from '../../theme';

// ---------------------------------------------------------------------------
// expo-apple-authentication is a native module — it requires a dev/production
// build and is NOT available in Expo Go.  We lazy-import it so that:
//   1. Android: the module is never touched (returns null immediately).
//   2. iOS + Expo Go: isAvailableAsync() returns false → renders nothing.
//   3. iOS + dev build: fully functional Apple Sign-In button.
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
 * Renders only on iOS with the native Sign-In-with-Apple SDK available.
 * Returns null on Android and in Expo Go (where the native module is absent).
 */
export const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const authStore = useAuthStore();

  // `null` = not yet determined; `false` = unavailable; `true` = available.
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Keep a ref to the dynamically-imported module so we only import once.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appleAuthRef = useRef<any>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Skip entirely on Android — Apple Sign-In is iOS-only.
    if (Platform.OS !== 'ios') {
      return;
    }

    void (async () => {
      try {
        // Dynamic import so a missing native module doesn't crash at parse time.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const AppleAuth = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
        appleAuthRef.current = AppleAuth;

        const available = await AppleAuth.isAvailableAsync();
        if (mounted.current) {
          setIsAvailable(available);
        }
      } catch {
        // Module not linked (Expo Go) — treat as unavailable.
        if (mounted.current) {
          setIsAvailable(false);
        }
      }
    })();
  }, []);

  // Not iOS, or availability not yet resolved, or explicitly unavailable.
  if (Platform.OS !== 'ios' || isAvailable !== true || !appleAuthRef.current) {
    return null;
  }

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

      const { user, token } = await authService.loginWithApple(
        credential.identityToken,
        credential.email ?? null,
      );
      await authStore.login(user, token);
      onSuccess();
    } catch (err: unknown) {
      // ERR_CANCELED means the user dismissed the sheet — handle silently.
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
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 50,
    marginBottom: SPACING.sm,
  },
});
