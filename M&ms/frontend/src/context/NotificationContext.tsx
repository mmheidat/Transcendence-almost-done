import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { socialService } from '../services/social.service';
import { wsClient } from '../services/socket.service';

interface NotificationContextType {
    unreadCounts: Map<number, number>;
    totalUnread: number;
    markAsRead: (userId: number) => void;
    refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [unreadCounts, setUnreadCounts] = useState<Map<number, number>>(new Map());

    // Derived state
    const totalUnread = Array.from(unreadCounts.values()).reduce((sum, count) => sum + count, 0);

    const refreshNotifications = React.useCallback(async () => {
        if (!user) return;
        try {
            const conversations = await socialService.getConversations();
            const newMap = new Map<number, number>();
            conversations.forEach(conv => {
                if (conv.unread_count > 0) {
                    newMap.set(conv.user.id, conv.unread_count);
                }
            });
            setUnreadCounts(newMap);
        } catch (e) {
            console.error("Failed to refresh notifications", e);
        }
    }, [user]);

    const markAsRead = React.useCallback((userId: number) => {
        setUnreadCounts(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
        });
    }, []);

    // Initial load
    useEffect(() => {
        if (user) {
            refreshNotifications();
            // Ensure connection for WS
            wsClient.connect();
        } else {
            setUnreadCounts(new Map());
        }
    }, [user]);

    // WebSocket Listeners
    useEffect(() => {
        if (!user) return;

        const handleNewMessage = (payload: any) => {
            // Payload: { type: 'new_message', from: userId, content: ... }
            if (payload && payload.from) {
                // Determine if we are currently looking at this chat?
                // Context doesn't know active route. 
                // Chat page should call markAsRead. 
                // Context just increments.

                // If the message is from me, ignore (shouldn't happen with correct backend)
                if (payload.from === user.id) return;

                setUnreadCounts(prev => {
                    const newMap = new Map(prev);
                    const current = newMap.get(payload.from) || 0;
                    newMap.set(payload.from, current + 1);
                    return newMap;
                });
            }
        };

        // @ts-ignore
        wsClient.on('new_message', handleNewMessage);

        // Also listen for legacy 'chat_message' if backend sends that too?
        // Backend websocket.ts: subscribeToChannel('chat:message') -> sends { type: 'new_message' }
        // BUT Chat.tsx listens to 'chat_message'?
        // Wait, did I check websocket.ts correctly?
        // In websocket.ts:
        /*
        subscribeToChannel('chat:message', (message) => {
             ...
             client.send(JSON.stringify({
                type: 'new_message',
                ...
             }));
        */
        // But Chat.tsx listens to 'chat_message'.
        // Step 670 Chat.tsx: wsClient.on('chat_message', handleMessage);
        // Is 'chat_message' ever sent?
        // Ah, `handleGamePaddleUpdate` uses `game_paddle_update`.
        // `wsHandler` in websocket.ts sends `aiDelta` etc.
        // `chatRoutes` (messages.ts) calls `publishEvent('chat:message', ...)`
        // `wsHandler` subscribes to Redis `chat:message` and forwards as `new_message`!

        // Wait, IF Chat.tsx listens to `chat_message`, and backend sends `new_message`, then Chat.tsx logic IS BROKEN?
        // Let's re-read Chat.tsx carefully (Step 670).
        // 107: wsClient.on('chat_message', handleMessage);

        // But backend sends `new_message` (Step 574 line 698).
        // So Chat functionality might be broken right now for receiving messages live?
        // Or maybe I missed where `chat_message` is sent.
        // I should fix Chat.tsx to listen to `new_message` OR fix backend to send `chat_message`.

        // User request is about notifications. If live chat is broken, that's bad.
        // But if user didn't complain about live chat... maybe they are testing by refresh?

        // I will assume backend sends `new_message` and update `NotificationContext` to listen to `new_message`.
        // I should also fix Chat.tsx to listen to `new_message` if that's indeed what is sent.

        const handleLegacy = (payload: any) => {
            // Just in case
            handleNewMessage({ ...payload, from: payload.senderId || payload.sender_id });
        }
        // @ts-ignore
        wsClient.on('chat_message', handleLegacy);

        return () => {
            // @ts-ignore
            wsClient.off('new_message', handleNewMessage);
            // @ts-ignore
            wsClient.off('chat_message', handleLegacy);
        };
    }, [user]);

    return (
        <NotificationContext.Provider value={{ unreadCounts, totalUnread, markAsRead, refreshNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within a NotificationProvider');
    return context;
};
