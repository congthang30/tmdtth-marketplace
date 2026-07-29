export type ShopOperationResponse = {
  shopId: string;
  operationMode: 'Open' | 'PausedUntil' | 'PausedIndefinitely';
  pauseStartsAt: string | null;
  pauseEndsAt: string | null;
  pauseReason: string | null;
  operationUpdatedAt: string | null;
  isAcceptingOrders: boolean;
};

export type ScheduleShopPauseRequest = {
  startsAt: string;
  endsAt: string;
  reason?: string;
};

export type PauseShopIndefinitelyRequest = {
  reason?: string;
};
