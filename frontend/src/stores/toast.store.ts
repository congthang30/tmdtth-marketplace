import { create } from 'zustand';

export type ToastTone = 'success' | 'danger' | 'info';

export type ToastMessage = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
};

type ToastState = {
  messages: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => string;
  dismissToast: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  messages: [],
  pushToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({ messages: [...state.messages, { ...toast, id }] }));
    window.setTimeout(() => {
      useToastStore.getState().dismissToast(id);
    }, 4500);
    return id;
  },
  dismissToast: (id) =>
    set((state) => ({
      messages: state.messages.filter((message) => message.id !== id),
    })),
}));
