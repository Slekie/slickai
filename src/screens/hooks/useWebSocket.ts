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
  const isSetup = useRef(false);

  useEffect(() => {
    if (isSetup.current) return;
    isSetup.current = true;

    const onConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    const onSignal = (data: unknown) => {
      addSignal(data as Signal);
      void notificationService.showLocalNotification({
        title: 'New Trading Signal',
        body: `${(data as Signal).direction} ${(data as Signal).asset} @ ${(data as Signal).entryPrice}`,
        data: { type: 'signal', signalId: (data as Signal).signalId },
      });
    };

    const onTradeExecuted = (data: unknown) => {
      addTrade(data as Trade);
      void notificationService.showLocalNotification({
        title: 'Trade Executed',
        body: `${(data as Trade).direction} ${(data as Trade).asset} opened`,
        data: { type: 'trade_executed', tradeId: (data as Trade).tradeId },
      });
    };

    const onTradeClosed = (data: unknown) => {
      const trade = data as Trade & { exitPrice: string; profitLoss: string };
      closeTrade(trade.tradeId, trade.exitPrice ?? '0', trade.profitLoss ?? '0');
      void notificationService.showLocalNotification({
        title: 'Trade Closed',
        body: `${trade.asset} closed. P&L: ${trade.profitLoss}`,
        data: { type: 'trade_closed', tradeId: trade.tradeId },
      });
    };

    const onPositionUpdate = (data: unknown) => {
      const pos = data as OpenPosition;
      updatePosition(pos.tradeId, pos);
    };

    websocketService.onConnectionChange(onConnectionChange);
    websocketService.on('signal' as WsEventType, onSignal);
    websocketService.on('trade_executed' as WsEventType, onTradeExecuted);
    websocketService.on('trade_closed' as WsEventType, onTradeClosed);
    websocketService.on('position_update' as WsEventType, onPositionUpdate);

    return () => {
      websocketService.offConnectionChange(onConnectionChange);
      websocketService.off('signal' as WsEventType, onSignal);
      websocketService.off('trade_executed' as WsEventType, onTradeExecuted);
      websocketService.off('trade_closed' as WsEventType, onTradeClosed);
      websocketService.off('position_update' as WsEventType, onPositionUpdate);
      isSetup.current = false;
    };
  }, [addSignal, addTrade, closeTrade, updatePosition]);

  return { isConnected };
}
