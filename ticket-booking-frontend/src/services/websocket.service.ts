import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface SeatUpdate {
    flightId: number;
    seatId: number;
    available: boolean;
    status: string;
    timestamp: number;
}

export interface SeatSelectionRequest {
    seatId: number;
    flightId: number;
    userId?: string; // Optional user ID
}

class WebSocketService {
    private client: Client | null = null;
    private subscriptions = new Map<string, { subscription: any; callback: Function }>();
    private connectionPromise: Promise<void> | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectDelay = 1000;
    private _connected = false;
    private userId: string;

    constructor() {
        // Generate or retrieve a user-specific ID that's consistent across tabs/browsers
        // First try to get the user ID from the token
        const token = localStorage.getItem('token');
        const tokenUserId = this.getUserIdFromToken(token);
        
        // If we have a user ID from token, use that as base
        if (tokenUserId) {
            // Create a consistent ID based on the actual user ID from token
            this.userId = `auth_user_${tokenUserId}`;
            localStorage.setItem('websocket_user_id', this.userId);
            console.log('[WebSocket] Using authenticated user ID:', this.userId);
        } else {
            // Fall back to the stored ID or generate a new one
            const storedUserId = localStorage.getItem('websocket_user_id');
            if (storedUserId) {
                this.userId = storedUserId;
            } else {
                // Generate random ID as fallback
                this.userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
                localStorage.setItem('websocket_user_id', this.userId);
            }
            console.log('[WebSocket] Using anonymous user ID:', this.userId);
        }
        
        this.initializeConnection();
        
        // Set up listener for auth changes to update user ID
        window.addEventListener('storage', (event) => {
            if (event.key === 'token') {
                this.updateUserIdFromToken();
            }
        });
    }
    
    // Get user ID from the token
    private getUserIdFromToken(token: string | null): string | null {
        if (!token) return null;
        
        try {
            // Basic parsing of JWT token
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            return payload.sub || payload.user_id || payload.id || null;
        } catch (error) {
            console.error('[WebSocket] Error extracting user ID from token:', error);
            return null;
        }
    }
    
    // Update user ID when token changes
    private updateUserIdFromToken() {
        const token = localStorage.getItem('token');
        const tokenUserId = this.getUserIdFromToken(token);
        
        if (tokenUserId) {
            const newUserId = `auth_user_${tokenUserId}`;
            
            // Only update if changed
            if (this.userId !== newUserId) {
                console.log('[WebSocket] User ID changed, reconnecting...');
                this.userId = newUserId;
                localStorage.setItem('websocket_user_id', this.userId);
                
                // Force reconnect to use new user ID
                this.forceReconnect();
            }
        }
    }

    // Add this getter to check connection status
    get isConnected(): boolean {
        return this._connected;
    }

    // Make this method public so we can call it from test panel
    public connect(): Promise<void> {
        return this.initializeConnection();
    }

    // Force reconnect method to ensure a fresh connection
    public forceReconnect(): Promise<void> {
        console.log('[WebSocket] Forcing reconnect...');
        
        // Disconnect if connected
        if (this.client && this._connected) {
            this.client.deactivate();
            this._connected = false;
        }
        
        // Clear connection promise to allow new connection
        this.connectionPromise = null;
        
        // Initialize new connection
        return this.initializeConnection();
    }

    private initializeConnection() {
        if (this.connectionPromise) return this.connectionPromise;

        console.log('[WebSocket] Initializing connection...');

        this.client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
            debug: (str) => {
                if (process.env.NODE_ENV === 'development') {
                    console.log('[WebSocket] Debug:', str);
                }
            },
            reconnectDelay: this.reconnectDelay,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
        });

        this.connectionPromise = new Promise((resolve, reject) => {
            if (!this.client) return reject('Client not initialized');

            this.client.onConnect = (frame) => {
                console.log('[WebSocket] Connected!', frame);
                const wasDisconnected = !this._connected;
                this._connected = true;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;

                // Resubscribe to all topics
                this.resubscribeAll();

                // If this was a reconnection (not the initial connection)
                if (wasDisconnected) {
                    // Dispatch a custom event that components can listen for
                    const reconnectEvent = new CustomEvent('webSocketReconnected');
                    document.dispatchEvent(reconnectEvent);
                }

                resolve();
            };

            this.client.onStompError = (frame) => {
                console.error('[WebSocket] STOMP error', frame);
                this._connected = false;
                reject(frame);
            };

            this.client.onWebSocketClose = () => {
                console.log('[WebSocket] Connection closed');
                this._connected = false;
                this.handleReconnect();
            };

            this.client.activate();
        });

        return this.connectionPromise;
    }

    private handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[WebSocket] Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;

        // Exponential backoff: 1s, 2s, 4s, 8s, etc. up to 30s max
        const delay = Math.min(30000, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));

        console.log(`[WebSocket] Attempting to reconnect in ${delay / 1000} seconds... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        // Clear previous promise to allow new connection attempt
        this.connectionPromise = null;

        setTimeout(() => {
            if (!this._connected) {
                this.initializeConnection();
            }
        }, delay);
    }

    // Method to resubscribe to all topics
    private resubscribeAll() {
        console.log('[WebSocket] Resubscribing to all topics');

        // Store subscriptions temporarily
        const oldSubscriptions = new Map(this.subscriptions);
        this.subscriptions.clear();

        // Resubscribe to each topic
        oldSubscriptions.forEach(({ callback }, topic) => {
            console.log('[WebSocket] Resubscribing to:', topic);
            if (this.client) {
                const subscription = this.client.subscribe(topic, (message) => {
                    try {
                        const data = JSON.parse(message.body);
                        callback(data);
                    } catch (error) {
                        console.error('[WebSocket] Error parsing message:', error);
                    }
                });
                this.subscriptions.set(topic, { subscription, callback });
            }
        });
    }

    async subscribeSeatUpdates(flightId: number, callback: (update: SeatUpdate) => void) {
        try {
            await this.ensureConnection();
            const topic = `/topic/flight/${flightId}/seats`;

            if (!this.subscriptions.has(topic) && this.client) {
                const subscription = this.client.subscribe(topic, (message) => {
                    try {
                        const update: SeatUpdate = JSON.parse(message.body);
                        callback(update);
                    } catch (error) {
                        console.error('[WebSocket] Error parsing seat update:', error);
                    }
                });
                this.subscriptions.set(topic, { subscription, callback });
            }
            return true;
        } catch (error) {
            console.error('[WebSocket] Failed to subscribe:', error);
            return false;
        }
    }

    unsubscribeSeatUpdates(flightId: number) {
        const topic = `/topic/flight/${flightId}/seats`;
        const subscription = this.subscriptions.get(topic);
        if (subscription) {
            subscription.subscription.unsubscribe();
            this.subscriptions.delete(topic);
        }
    }

    // Method to ensure connection is established
    private async ensureConnection() {
        if (!this._connected || !this.connectionPromise) {
            // If connection is stale (more than 2 minutes old), force a new connection
            const staleConnectionTime = 2 * 60 * 1000; // 2 minutes
            const lastConnectionAttempt = localStorage.getItem('websocket_last_connect');
            const now = Date.now();
            
            if (lastConnectionAttempt && (now - parseInt(lastConnectionAttempt)) > staleConnectionTime) {
                console.log('[WebSocket] Connection might be stale, forcing reconnect');
                return this.forceReconnect();
            }
            
            // Normal connection
            this.connectionPromise = this.initializeConnection();
            // Store last connection time
            localStorage.setItem('websocket_last_connect', now.toString());
        }
        return this.connectionPromise;
    }

    // Method to send seat selection
    async selectSeat(request: SeatSelectionRequest): Promise<boolean> {
        // Ensure userId is included
        return this.sendMessage('/app/seats/hold', { 
            ...request, 
            userId: this.userId 
        });
    }

    // Method to send seat release
    async releaseSeat(request: SeatSelectionRequest): Promise<boolean> {
        // Ensure userId is included
        return this.sendMessage('/app/seats/release', { 
            ...request, 
            userId: this.userId 
        });
    }

    // Method to send seat hold
    async holdSeat(request: SeatSelectionRequest): Promise<boolean> {
        // Ensure userId is included
        return this.sendMessage('/app/seats/hold', { 
            ...request, 
            userId: this.userId 
        });
    }

    // Generic method to send messages
    private async sendMessage(destination: string, data: any, retryCount = 0): Promise<boolean> {
        try {
            await this.ensureConnection();
            
            // Add a short delay to ensure connection is fully established
            // This is only needed on the first attempt
            if (retryCount === 0) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // Double-check connection again after delay
            if (!this.client || !this._connected) {
                console.warn('[WebSocket] Cannot send message, not connected');
                
                // Add retry logic for initial seat selection attempts
                if (retryCount < 2) {
                    console.log(`[WebSocket] Retrying in 500ms (attempt ${retryCount + 1}/3)`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return this.sendMessage(destination, data, retryCount + 1);
                }
                
                return false;
            }

            this.client.publish({
                destination,
                body: JSON.stringify(data)
            });

            return true;
        } catch (error) {
            console.error(`[WebSocket] Failed to send message to ${destination}:`, error);
            
            // Also retry on errors for initial attempts
            if (retryCount < 2) {
                console.log(`[WebSocket] Retrying after error (attempt ${retryCount + 1}/3)`);
                await new Promise(resolve => setTimeout(resolve, 500));
                return this.sendMessage(destination, data, retryCount + 1);
            }
            
            return false;
        }
    }

    disconnect() {
        if (this.client) {
            this.subscriptions.forEach(({ subscription }) => subscription.unsubscribe());
            this.subscriptions.clear();
            this.client.deactivate();
            this.client = null;
            this.connectionPromise = null;
            this.reconnectAttempts = 0;
            this._connected = false;
            console.log('[WebSocket] Disconnected');
        }
    }
}

export const webSocketService = new WebSocketService();