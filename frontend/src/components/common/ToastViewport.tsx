import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useToastStore } from "@/stores/toast.store";
import type { ToastTone } from "@/stores/toast.store";

const toneClass: Record<ToastTone, string> = {
  success: "border-success/30 bg-green-50 text-success",
  danger: "border-danger/30 bg-red-50 text-danger",
  info: "border-primary-100 bg-primary-50 text-primary-700",
};

const toneIcon = {
  success: CheckCircle2,
  danger: TriangleAlert,
  info: Info,
};

export function ToastViewport() {
  const messages = useToastStore((state) => state.messages);
  const dismissToast = useToastStore((state) => state.dismissToast);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
      {messages.map((message) => {
        const Icon = toneIcon[message.tone];

        return (
          <div
            key={message.id}
            className={[
              "flex gap-3 rounded-lg border p-4 shadow-lg",
              toneClass[message.tone],
            ].join(" ")}
            role="status"
          >
            <Icon className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{message.title}</p>
              {message.description ? (
                <p className="mt-1 text-sm opacity-90">{message.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md hover:bg-white/60"
              aria-label="Đóng thông báo"
              onClick={() => dismissToast(message.id)}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
