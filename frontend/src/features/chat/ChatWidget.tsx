import { useMutation } from '@tanstack/react-query';
import {
  Bot,
  Check,
  ExternalLink,
  MessageCircle,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/services/errors';
import { chatApi, isSafeChatHref } from './chat.api';
import type {
  ChatMessage,
  ChatResponse,
  PendingChatAction,
  SendChatRequest,
} from './chat.api';
import { ChatMessageContent } from './ChatMessageContent';
import { ChatProductPreviews } from './ChatProductPreviews';

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Xin chào! Tôi có thể giúp bạn tìm sản phẩm và hỗ trợ các thao tác mua sắm trên sàn.',
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [pendingAction, setPendingAction] = useState<PendingChatAction | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<
    ChatResponse['suggestedActions']
  >([]);
  const [lastRequest, setLastRequest] = useState<SendChatRequest | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const sendMutation = useMutation({
    mutationFn: chatApi.send,
    onSuccess: (response) => {
      setConversationId(response.conversationId);
      setPendingAction(response.pendingAction);
      setSuggestedActions(response.suggestedActions);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.message,
          productPreviews: response.productPreviews ?? [],
        },
      ]);
    },
  });
  const deleteMutation = useMutation({ mutationFn: chatApi.deleteConversation });
  const isBusy = sendMutation.isPending || deleteMutation.isPending;

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], textarea:not([disabled])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [messages, pendingAction, sendMutation.isPending]);

  const send = (message: string, confirmationToken: string | null) => {
    const content = message.trim();
    if (!content || isBusy) return;
    sendMutation.reset();
    setSuggestedActions([]);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', content },
    ]);
    const request = { conversationId, message: content, confirmationToken };
    setLastRequest(request);
    sendMutation.mutate(request);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft;
    setDraft('');
    send(message, null);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const confirmAction = () => {
    if (!pendingAction) return;
    const token = pendingAction.token;
    setPendingAction(null);
    send('Tôi xác nhận thực hiện hành động trên.', token);
  };

  const clearConversation = async () => {
    try {
      if (conversationId) await deleteMutation.mutateAsync(conversationId);
      setConversationId(null);
      setMessages([welcomeMessage]);
      setPendingAction(null);
      setSuggestedActions([]);
      setLastRequest(null);
      sendMutation.reset();
      inputRef.current?.focus();
    } catch {
      // Error remains visible inline; existing conversation is intentionally preserved.
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id="open-shopping-assistant"
        type="button"
        aria-label="Mở trợ lý mua sắm"
        aria-expanded={isOpen}
        aria-controls="shopping-assistant-dialog"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-100 sm:bottom-6 sm:right-6"
      >
        <MessageCircle size={20} aria-hidden="true" />
        <span className="hidden sm:inline">Trợ lý mua sắm</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-ink/40 sm:flex sm:items-end sm:justify-end sm:p-6">
          <section
            ref={panelRef}
            id="shopping-assistant-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(44rem,calc(100vh-3rem))] sm:max-w-md sm:rounded-xl sm:border sm:border-border"
          >
            <header className="flex items-start justify-between gap-3 border-b border-border bg-primary-50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-600 text-white">
                  <Bot size={22} aria-hidden="true" />
                </span>
                <div>
                  <h2 id={titleId} className="font-semibold text-ink">
                    Trợ lý mua sắm
                  </h2>
                  <p id={descriptionId} className="text-xs text-muted">
                    Tìm kiếm và hỗ trợ thao tác với dữ liệu thật
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  id="clear-shopping-assistant"
                  type="button"
                  aria-label="Xóa cuộc trò chuyện"
                  onClick={() => void clearConversation()}
                  disabled={isBusy}
                  className="grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60"
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
                <button
                  id="close-shopping-assistant"
                  type="button"
                  aria-label="Đóng trợ lý mua sắm"
                  onClick={() => setIsOpen(false)}
                  className="grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            </header>

            <div
              className="flex-1 space-y-4 overflow-y-auto bg-surface px-4 py-5"
              aria-live="polite"
              aria-busy={sendMutation.isPending}
            >
              {messages.map((message) =>
                message.role === 'user' ? (
                  <article
                    key={message.id}
                    className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary-600 px-4 py-3 text-sm leading-6 text-white"
                  >
                    <span className="sr-only">Bạn: </span>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </article>
                ) : (
                  <div key={message.id} className="mr-auto w-full max-w-[94%]">
                    <article className="rounded-2xl rounded-bl-sm border border-border bg-white px-4 py-3 text-sm leading-6 text-ink shadow-panel">
                      <span className="sr-only">Trợ lý: </span>
                      <ChatMessageContent content={message.content} />
                    </article>
                    {message.productPreviews?.length ? (
                      <ChatProductPreviews
                        products={message.productPreviews}
                        onNavigate={() => setIsOpen(false)}
                      />
                    ) : null}
                  </div>
                ),
              )}

              {sendMutation.isPending ? (
                <div className="mr-auto flex items-center gap-2 rounded-2xl rounded-bl-sm border border-border bg-white px-4 py-3 text-sm text-muted">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary-600 motion-reduce:animate-none" />
                  Đang xử lý yêu cầu...
                </div>
              ) : null}

              {sendMutation.isError || deleteMutation.isError ? (
                <div role="alert" className="rounded-lg border border-danger bg-white p-3 text-sm text-danger">
                  <p>{getErrorMessage(sendMutation.error ?? deleteMutation.error)}</p>
                  {sendMutation.isError && lastRequest ? (
                    <button
                      id="retry-shopping-assistant-message"
                      type="button"
                      onClick={() => {
                        sendMutation.reset();
                        sendMutation.mutate(lastRequest);
                      }}
                      className="mt-2 min-h-11 rounded-md border border-danger px-3 py-2 font-semibold hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                    >
                      Thử lại
                    </button>
                  ) : null}
                </div>
              ) : null}

              {pendingAction ? (
                <div className="rounded-xl border border-warning bg-white p-4">
                  <p className="font-medium text-ink">Cần bạn xác nhận</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {pendingAction.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" onClick={confirmAction} disabled={isBusy}>
                      <Check size={16} aria-hidden="true" />
                      Xác nhận
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPendingAction(null)}
                      disabled={isBusy}
                    >
                      Không thực hiện
                    </Button>
                  </div>
                </div>
              ) : null}

              {suggestedActions.length > 0 ? (
                <nav aria-label="Liên kết gợi ý" className="flex flex-wrap gap-2">
                  {suggestedActions.filter((action) => isSafeChatHref(action.href)).map((action) => (
                    <Link
                      key={`${action.href}-${action.label}`}
                      to={action.href}
                      onClick={() => setIsOpen(false)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-primary-600 bg-white px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      {action.label}
                      <ExternalLink size={15} aria-hidden="true" />
                    </Link>
                  ))}
                </nav>
              ) : null}
              <div ref={endRef} />
            </div>

            <form onSubmit={handleSubmit} className="border-t border-border bg-white p-3 sm:p-4">
              <label htmlFor="shopping-assistant-message" className="sr-only">
                Nhập câu hỏi cho trợ lý mua sắm
              </label>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  id="shopping-assistant-message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  maxLength={2000}
                  rows={2}
                  disabled={isBusy}
                  placeholder="Ví dụ: Tìm gạo ngon dưới 200.000 ₫"
                  className="min-h-11 flex-1 resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-surface disabled:text-muted"
                />
                <button
                  id="send-shopping-assistant-message"
                  type="submit"
                  disabled={isBusy || draft.trim().length === 0}
                  aria-label="Gửi tin nhắn"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-600 text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={19} aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">
                Trợ lý có thể nhầm. Hãy kiểm tra lại thông tin quan trọng trước khi mua.
              </p>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
