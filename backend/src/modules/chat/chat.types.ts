export type SendChatMessage = {
  conversationId: string | null;
  message: string;
  confirmationToken: string | null;
};

export type ChatProductPreview = {
  id: string;
  slug: string;
  productName: string;
  priceMin: string;
  priceMax: string;
  quantityAvailable: number;
  shopName: string;
  thumbnailImage: {
    imageUrl: string;
    altText: string | null;
  } | null;
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
  productPreviews: ChatProductPreview[];
};
