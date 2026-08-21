import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { COLORS, FONTS, RADIUS, SPACING } from '../../theme';

// ---------------------------------------------------------------------------
// Client IDs — replace with real values from Google Cloud Console.
// These are read from env vars so they are never committed to source control.
// In Expo Go the redirect URI will be exp://..., which requires the
// "Authorized redirect URIs" in the GCP OAuth 2.0 Web client to include the
// Expo Go redirect (e.g. exp://u.expo.dev/...) or, for local dev,
// exp://127.0.0.1:8081 / exp://localhost:8081.
// ---------------------------------------------------------------------------
const IOS_CLIENT_ID =
  (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID as string) ?? '';
const ANDROID_CLIENT_ID =
  (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID as string) ?? '';
const WEB_CLIENT_ID =
  (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID as string) ?? '';

export interface GoogleSignInButtonProps {
  /** Called after a successful sign-in, JWT has been stored. */
  onSuccess: () => void;
  /** Called when an unexpected error occurs (not on user cancellation). */
  onError: (err: Error) => void;
}

/**
 * Google OAuth sign-in button using expo-auth-session/providers/google.
 *
 * In Expo Go the redirect URI resolves to an exp:// URL.  For this to work
 * you must add that URL as an authorised redirect in your GCP OAuth 2.0
 * Web client.  In a development build the custom scheme "slickai" is used
 * automatically once `expo.scheme` is set in app.json.
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const authStore = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const [request, response, promptAsync] = Google.useAuthRequest(
    {
      iosClientId: IOS_CLIENT_ID,
      androidClientId: ANDROID_CLIENT_ID,
      webClientId: WEB_CLIENT_ID,
    },
    { scheme: 'slickai' },
  );

  // Track whether this component is still mounted so we don't call setState
  // after unmount (e.g. if the screen is unmounted before the async chain
  // resolves).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // React to every new response from the OAuth session.
  useEffect(() => {
    if (!response) return;

    if (response.type === 'cancel' || response.type === 'dismiss') {
      // User cancelled — silently do nothing.
      if (mounted.current) setIsLoading(false);
      return;
    }

    if (response.type === 'error') {
      if (mounted.current) setIsLoading(false);
      onError(
        new Error(
          response.error?.message ?? 'Google sign-in failed. Please try again.',
        ),
      );
      return;
    }

    if (response.type === 'success') {
      const idToken = response.params['id_token'];
      if (!idToken) {
        if (mounted.current) setIsLoading(false);
        onError(new Error('Google sign-in did not return an ID token.'));
        return;
      }

      void (async () => {
        try {
          const { user, token } = await authService.loginWithGoogle(idToken);
          await authStore.login(user, token);
          if (mounted.current) {
            setIsLoading(false);
            onSuccess();
          }
        } catch (err) {
          if (mounted.current) {
            setIsLoading(false);
            onError(
              err instanceof Error
                ? err
                : new Error('Google sign-in failed. Please try again.'),
            );
          }
        }
      })();
    }
  }, [response]);

  const handlePress = async () => {
    setIsLoading(true);
    try {
      await promptAsync();
    } catch (err) {
      if (mounted.current) {
        setIsLoading(false);
        onError(
          err instanceof Error
            ? err
            : new Error('Google sign-in failed. Please try again.'),
        );
      }
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        (!request || isLoading) && styles.buttonDisabled,
      ]}
      onPress={handlePress}
      disabled={!request || isLoading}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityHint="Opens a browser window to sign in with your Google account"
    >
      {isLoading ? (
        <ActivityIndicator color={COLORS.textSecondary} />
      ) : (
        <View style={styles.inner}>
          {/* Google "G" logo rendered as styled text — avoids @expo/vector-icons dependency */}
          <Text style={styles.googleG} aria-hidden>G</Text>
          <Text style={styles.label}>Continue with Google</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleG: {
    color: '#4285F4',
    fontSize: 18,
    fontWeight: '700' as const,
    marginRight: 10,
    lineHeight: 20,
  },
  label: {
    color: '#3C4043',
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.medium,
  },
});
