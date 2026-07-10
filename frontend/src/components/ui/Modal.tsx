import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
};

export function Modal({ open, title, children, onClose, footer }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-white shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink"
            aria-label="Close modal"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
