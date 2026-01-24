// API Configuration
export const API_BASE_URL = '/api';

export const getWebSocketUrl = (path: string = '/chat/ws'): string => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api${path}`;
};
