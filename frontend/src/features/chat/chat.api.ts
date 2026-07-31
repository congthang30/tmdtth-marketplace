import { apiDelete, apiPost } from '@/services/api';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export type PendingChatAction = {
  token: string;
  summary: string;
  expiresAt: string;
};

export type ChatResponse = {
  conversationId: string;
  message: string;
  pendingAction: PendingChatAction | null;
  suggestedActions: Array<{ label: string; href: string }>;
};

export type SendChatRequest = {
  conversationId: string | null;
  message: string;
  confirmationToken: string | null;
};

export const chatApi = {
  send: (body: SendChatRequest) =>
    apiPost<ChatResponse, SendChatRequest>('/chat/messages', body, {
      skipAuthRedirect: true,
    }),
  deleteConversation: (conversationId: string) =>
    apiDelete<{ deleted: true }>(`/chat/conversations/${conversationId}`, {
      skipAuthRedirect: true,
    }),
};

const safeChatHref =
  /^\/(?:products(?:\/[a-zA-Z0-9%._~-]+)?|cart|orders(?:\/\d+)?|addresses|checkout|login)$/;

export function isSafeChatHref(href: string): boolean {
  return safeChatHref.test(href);
}
