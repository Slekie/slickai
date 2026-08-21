/**
 * useAppStateWebSocket
 *
 * Listens to React Native AppState changes and pauses/resumes the
 * WebSocket reconnection loop accordingly:
 *
 *  'active'               → resumeReconnect() — connect if not already connected
 *  'background'/'inactive' → pauseReconnect()  — stop reconnect attempts (saves battery)
 *
 * Mount this hook inside AppContent (inside RootNavigator) alongside useWebSocket().
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { websocketService } from '../services/websocketService';

export function useAppStateWebSocket(): void {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const prevState = appState.current;
        appState.current = nextState;

        if (nextState === 'active' && prevState !== 'active') {
          // App returned to foreground — resume WebSocket
          websocketService.resumeReconnect();
        } else if (
          (nextState === 'background' || nextState === 'inactive') &&
          prevState === 'active'
        ) {
          // App went to background — pause reconnect attempts
          websocketService.pauseReconnect();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
