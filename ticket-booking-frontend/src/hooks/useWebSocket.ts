import { useEffect, useCallback } from 'react';
import { webSocketService, SeatUpdate } from '../services/websocket.service';

export const useWebSocket = (flightId: number, onUpdate: (update: SeatUpdate) => void) => {
    const handleSeatUpdate = useCallback((update: SeatUpdate) => {
        onUpdate(update);
    }, [onUpdate]);

    useEffect(() => {
        const subscribe = async () => {
            try {
                await webSocketService.subscribeSeatUpdates(flightId, handleSeatUpdate);
            } catch (error) {
                console.error('WebSocket subscription failed:', error);
            }
        };

        subscribe();

        return () => {
            webSocketService.unsubscribeSeatUpdates(flightId);
        };
    }, [flightId, handleSeatUpdate]);
};