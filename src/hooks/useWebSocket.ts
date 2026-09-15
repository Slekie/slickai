import { useEffect, useRef, useState } from 'react';
import { websocketService } from '../services/websocketService';
import type { WsEventType } from '../services/websocketService';
import { useSignalStore } from '../store/signalStore';
import { useTradeStore } from '../store/tradeStore';
import type { Signal } from '../store/signalStore';
import type { Trade, OpenPosition } from '../store/tradeStore';
import { notificationService } from '../services/notificationService';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(websocketService.isConnected);
  const addSignal = useSignalStore((s) => s.addSignal);
  const addTrade = useTradeStore((s) => s.addTrade);
  const closeTrade = useTradeStore((s) => s.closeTrade);
  const updatePosition = useTradeStore((s) => s.updatePosition);

  // Keep stable refs to the latest store actions so the effect never needs to
  // re-register listeners just because a Zustand selector returned a new function
  // reference (which can happen on every render with some selector patterns).
  const addSignalRef = useRef(addSignal);
  const addTradeRef = useRef(addTrade);
  const closeTradeRef = useRef(closeTrade);
  const updatePositionRef = useRef(updatePosition);
  addSignalRef.current = addSignal;
  addTradeRef.current = addTrade;
  closeTradeRef.current = closeTrade;
  updatePositionRef.current = updatePosition;

  useEffect(() => {
    const onConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    const onSignal = (data: unknown) => {
      addSignalRef.current(data as Signal);
      void notificationService.showLocalNotification({
        title: 'New Trading Signal',
        body: `${(data as Signal).direction} ${(data as Signal).asset} @ ${(data as Signal).entryPrice}`,
        data: { type: 'signal', signalId: (data as Signal).signalId },
      });
    };

    const onTradeExecuted = (data: unknown) => {
      addTradeRef.current(data as Trade);
      void notificationService.showLocalNotification({
        title: 'Trade Executed',
        body: `${(data as Trade).direction} ${(data as Trade).asset} opened`,
        data: { type: 'trade_executed', tradeId: (data as Trade).tradeId },
      });
    };

    const onTradeClosed = (data: unknown) => {
      const trade = data as Trade & { exitPrice: string; profitLoss: string };
      closeTradeRef.current(trade.tradeId, trade.exitPrice ?? '0', trade.profitLoss ?? '0');
      void notificationService.showLocalNotification({
        title: 'Trade Closed',
        body: `${trade.asset} closed. P&L: ${trade.profitLoss}`,
        data: { type: 'trade_closed', tradeId: trade.tradeId },
      });
    };

    const onPositionUpdate = (data: unknown) => {
      const pos = data as OpenPosition;
      updatePositionRef.current(pos.tradeId, pos);
    };

    websocketService.onConnectionChange(onConnectionChange);
    websocketService.on('signal' as WsEventType, onSignal);
    websocketService.on('trade_executed' as WsEventType, onTradeExecuted);
    websocketService.on('trade_closed' as WsEventType, onTradeClosed);
    websocketService.on('position_update' as WsEventType, onPositionUpdate);

    // Sync initial connection state in case it changed before this effect ran
    setIsConnected(websocketService.isConnected);

    return () => {
      websocketService.offConnectionChange(onConnectionChange);
      websocketService.off('signal' as WsEventType, onSignal);
      websocketService.off('trade_executed' as WsEventType, onTradeExecuted);
      websocketService.off('trade_closed' as WsEventType, onTradeClosed);
      websocketService.off('position_update' as WsEventType, onPositionUpdate);
    };
  // Empty deps: listeners are registered once per mount. Stable refs keep
  // them up-to-date without re-registering on every render.
  }, []);

  return { isConnected };
}