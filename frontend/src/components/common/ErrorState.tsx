import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

type ErrorStateProps = {
  title?: string;
  message: string;
  action?: ReactNode;
};

export function ErrorState({
  title = "Đã xảy ra lỗi",
  message,
  action,
}: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-danger/30 bg-red-50 px-6 py-8 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white text-danger">
        <AlertTriangle size={20} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-danger">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-danger/90">
        {message}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
