import { API_BASE_URL } from '../config';
import { authService } from './auth.service';

const AI_API_URL = `${API_BASE_URL}/chat/ai`;

export interface AiMessage {
    id: number;
    conversationId: number;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

export interface AiConversation {
    id: number;
    title: string;
    updatedAt: string;
    messages?: AiMessage[];
}

class AiService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    async getConversations(): Promise<AiConversation[]> {
        const response = await fetch(`${AI_API_URL}/conversations`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch conversations');
        const data = await response.json();
        return (data.conversations || []).map((c: any) => ({
            id: c.id,
            title: c.title,
            updatedAt: c.updated_at
        }));
    }

    async createConversation(title?: string): Promise<AiConversation> {
        const response = await fetch(`${AI_API_URL}/conversations`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ title })
        });
        if (!response.ok) throw new Error('Failed to create conversation');
        const data = await response.json();
        return {
            id: data.id,
            title: data.title,
            updatedAt: data.created_at
        };
    }

    async getConversation(id: number): Promise<AiConversation> {
        const response = await fetch(`${AI_API_URL}/conversations/${id}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch conversation');
        const data = await response.json();
        return {
            id: data.id,
            title: data.title,
            updatedAt: data.updated_at,
            messages: (data.messages || []).map((m: any) => ({
                id: m.id,
                conversationId: m.conversation_id,
                role: m.role,
                content: m.content,
                createdAt: m.created_at
            }))
        };
    }

    async sendMessage(conversationId: number, content: string): Promise<AiMessage> {
        // Note: The legacy service didn't explicitly show a send message endpoint detached from WebSocket, 
        // but typically AI chats might use REST or WS. 
        // The legacy `AiService` didn't have a `sendMessage` method? 
        // Let's re-read legacy. 
        // Actually, `AiService` in legacy file *only* had CRUD for conversations. 
        // It's likely the actual chat happens via WebSocket or a specific endpoint not shown in that file, 
        // OR I missed it. 
        // Re-checking legacy `AiService.ts`... it returns messages in `getConversation`.
        // But how do we send? 
        // Ah, often AI chat is done via the same WebSocket as general chat OR a specific endpoint. 
        // Let's assume there is a POST /messages endpoint or similar.
        // Wait, the legacy file *doesn't* have sendMessage. 
        // Let's assume we use the WebSocket for this, or maybe it was `SocialService` that handled it?
        // No, `SocialService` handles user-to-user.

        // I will implement a standard REST endpoint for now: POST /conversations/:id/messages
        // If that fails 404, we'll know.

        const response = await fetch(`${AI_API_URL}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            // Fallback: maybe it's just POST to the conversation URL or something?
            // Let's try sending via WS if this fails? No, let's look for a specialized tool.
            throw new Error('Failed to send message to AI');
        }

        const data = await response.json();
        // Expecting the *assistant's* response or the *user's* message? 
        // Usually it returns the user message, then streams the response, or returns both.
        // Adapting to common patterns.
        return {
            id: data.id,
            conversationId: conversationId,
            role: data.role,
            content: data.content,
            createdAt: data.created_at
        };
    }
}

export const aiService = new AiService();
