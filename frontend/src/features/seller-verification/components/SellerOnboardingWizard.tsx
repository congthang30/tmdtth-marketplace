import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

const steps = [
  'Loại hình bán hàng',
  'Thông tin gian hàng',
  'Thông tin pháp lý',
  'Tài khoản nhận tiền',
  'Tài liệu xác minh',
  'Rà soát và gửi',
] as const;

type SellerOnboardingWizardProps = {
  currentStep: number;
  children: ReactNode;
  isBusy?: boolean;
  canContinue?: boolean;
  onBack: () => void;
  onContinue: () => void;
};

export function SellerOnboardingWizard({
  currentStep,
  children,
  isBusy = false,
  canContinue = true,
  onBack,
  onContinue,
}: SellerOnboardingWizardProps) {
  const isLastStep = currentStep === steps.length - 1;
  const currentLabel = steps[currentStep];

  return (
    <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <nav
        aria-label="Các bước đăng ký người bán"
        className="rounded-lg border border-border bg-white p-4 shadow-panel lg:p-5"
      >
        <p className="text-sm font-semibold text-ink">Tiến trình đăng ký</p>
        <p className="mt-1 text-sm text-muted lg:hidden">
          Bước {currentStep + 1} / {steps.length}: {currentLabel}
        </p>
        <ol className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
          {steps.map((label, index) => {
            const isCurrent = index === currentStep;
            const isComplete = index < currentStep;
            return (
              <li
                key={label}
                aria-current={isCurrent ? 'step' : undefined}
                className={[
                  'flex min-h-11 min-w-[12rem] items-center gap-3 rounded-md border px-3 py-2 text-sm lg:min-w-0',
                  isCurrent
                    ? 'border-primary-600 bg-primary-50 font-semibold text-primary-800'
                    : 'border-border bg-white text-muted',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    isComplete
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : isCurrent
                        ? 'border-primary-600 text-primary-700'
                        : 'border-border text-muted',
                  ].join(' ')}
                >
                  {isComplete ? <Check size={15} /> : index + 1}
                </span>
                <span>{label}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      <section
        aria-labelledby="seller-onboarding-step-title"
        className="min-w-0 rounded-lg border border-border bg-white p-4 shadow-panel sm:p-6"
      >
        <div className="border-b border-border pb-4">
          <p className="text-sm font-medium text-primary-700">
            Bước {currentStep + 1} / {steps.length}
          </p>
          <h2 id="seller-onboarding-step-title" className="mt-1 text-xl font-semibold">
            {currentLabel}
          </h2>
        </div>

        <div className="py-5">{children}</div>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
          <Button
            id="seller-onboarding-back"
            type="button"
            variant="secondary"
            className="min-h-11"
            disabled={currentStep === 0 || isBusy}
            onClick={onBack}
          >
            Quay lại
          </Button>
          <Button
            id="seller-onboarding-continue"
            type="button"
            className="min-h-11"
            disabled={!canContinue || isBusy}
            onClick={onContinue}
          >
            {isBusy
              ? 'Đang xử lý...'
              : isLastStep
                ? 'Gửi hồ sơ xét duyệt'
                : 'Lưu và tiếp tục'}
          </Button>
        </div>
      </section>
    </div>
  );
}
