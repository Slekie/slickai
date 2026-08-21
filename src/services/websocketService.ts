import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../config/api';

export type WsChannel = 'signals' | 'trades' | 'positions';

export interface WsSignalEvent {
  type: 'signal';
  data: unknown;
}

export interface WsTradeExecutedEvent {
  type: 'trade_executed';
  data: unknown;
}

export interface WsTradeClosedEvent {
  type: 'trade_closed';
  data: unknown;
}

export interface WsPositionUpdateEvent {
  type: 'position_update';
  data: unknown;
}

export type WsEvent =
  | WsSignalEvent
  | WsTradeExecutedEvent
  | WsTradeClosedEvent
  | WsPositionUpdateEvent;

export type WsEventType = WsEvent['type'];

type WsEventListener = (data: unknown) => void;

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

class WebSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private listeners: Map<WsEventType, Set<WsEventListener>> = new Map();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private reconnectAttempts = 0;
  private isConnecting = false;
  private shouldBeConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  setToken(token: string): void {
    this.token = token;
  }

  connect(): void {
    if (this.isConnecting || (this.socket && this.socket.connected)) return;
    if (!this.token) {
      console.warn('[WS] No auth token set. Cannot connect.');
      return;
    }
    this.shouldBeConnected = true;
    this._connect();
  }

  disconnect(): void {
    this.shouldBeConnected = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this._notifyConnectionListeners(false);
  }

  /**
   * Pause reconnection attempts (e.g. when app goes to background).
   * Preserves the socket instance — does NOT disconnect.
   */
  pauseReconnect(): void {
    this.shouldBeConnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Resume reconnection attempts (e.g. when app returns to foreground).
   * Immediately attempts to connect if not already connected.
   */
  resumeReconnect(): void {
    this.shouldBeConnected = true;
    if (!this.isConnecting && !(this.socket?.connected)) {
      this._connect();
    }
  }

  subscribe(channel: WsChannel): void {
    if (!this.socket) return;
    this.socket.emit('subscribe', { channel });
  }

  on(event: WsEventType, listener: WsEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: WsEventType, listener: WsEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  onConnectionChange(listener: (connected: boolean) => void): void {
    this.connectionListeners.add(listener);
  }

  offConnectionChange(listener: (connected: boolean) => void): void {
    this.connectionListeners.delete(listener);
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private _connect(): void {
    this.isConnecting = true;

    this.socket = io(WS_URL, {
      auth: { token: this.token },
      transports: ['websocket'],
      reconnection: false, // manual reconnection
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this._notifyConnectionListeners(true);

      // Subscribe to all channels after connecting
      (['signals', 'trades', 'positions'] as WsChannel[]).forEach((ch) =>
        this.subscribe(ch)
      );
    });

    this.socket.on('disconnect', () => {
      this._notifyConnectionListeners(false);
      if (this.shouldBeConnected) {
        this._scheduleReconnect();
      }
    });

    this.socket.on('connect_error', () => {
      this.isConnecting = false;
      if (this.shouldBeConnected) {
        this._scheduleReconnect();
      }
    });

    // Register event handlers
    const eventTypes: WsEventType[] = [
      'signal',
      'trade_executed',
      'trade_closed',
      'position_update',
    ];
    eventTypes.forEach((eventType) => {
      this.socket!.on(eventType, (data: unknown) => {
        this._emit(eventType, data);
      });
    });
  }

  private _scheduleReconnect(): void {
    if (!this.shouldBeConnected) return; // paused — don't schedule
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[WS] Max reconnect attempts reached.');
      return;
    }
    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * Math.min(this.reconnectAttempts, 5);
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldBeConnected) {
        this._connect();
      }
    }, delay);
  }

  private _emit(event: WsEventType, data: unknown): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error(`[WS] Listener error for ${event}:`, err);
      }
    });
  }

  private _notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (err) {
        console.error('[WS] Connection listener error:', err);
      }
    });
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
