export type SendChatMessage = {
  conversationId: string | null;
  message: string;
  confirmationToken: string | null;
};

export type ChatMessageResponse = {
  conversationId: string;
  message: string;
  pendingAction: null | {
    token: string;
    summary: string;
    expiresAt: string;
  };
  suggestedActions: Array<{
    label: string;
    href: string;
  }>;
};
