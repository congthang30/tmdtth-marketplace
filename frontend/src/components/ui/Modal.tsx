import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

const focusableSelector = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[contenteditable="true"]:not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

let bodyScrollLockCount = 0;
let bodyOverflowBeforeLock = "";

function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  bodyScrollLockCount += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);

    if (bodyScrollLockCount === 0) {
      document.body.style.overflow = bodyOverflowBeforeLock;
    }
  };
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter((element) => {
    if (element.hidden || element.getAttribute("aria-hidden") === "true") {
      return false;
    }

    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
};

export function Modal({ open, title, children, onClose, footer }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const releaseBodyScroll = lockBodyScroll();

    closeButtonRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = getFocusableElements(dialogRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus({ preventScroll: true });
        return;
      }

      const activeElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      const activeIndex = activeElement
        ? focusableElements.indexOf(activeElement)
        : -1;

      if (event.shiftKey && activeIndex <= 0) {
        event.preventDefault();
        focusableElements.at(-1)?.focus({ preventScroll: true });
      } else if (
        !event.shiftKey &&
        (activeIndex === -1 || activeIndex === focusableElements.length - 1)
      ) {
        event.preventDefault();
        focusableElements[0]?.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      releaseBodyScroll();

      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/45 p-3 sm:p-6">
      <div
        ref={dialogRef}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-white shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 sm:max-h-[calc(100dvh-3rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <h2
            id={titleId}
            className="min-w-0 break-words text-lg font-semibold text-ink"
          >
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            aria-label="Đóng hộp thoại"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {children}
        </div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-4 py-3 sm:px-5 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
