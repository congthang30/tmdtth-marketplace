import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Clock3, Landmark, LockKeyhole, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { SelectInput } from '@/components/ui/SelectInput';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/Table';
import { TextInput } from '@/components/ui/TextInput';
import { getErrorMessage } from '@/services/errors';
import { formatDateTime, formatMoney } from '@/utils/format';
import {
  sellerFinanceApi,
  sellerFinanceKeys,
  type LedgerParams,
  type PayoutParams,
  type SellerPayout,
} from '../api';
import {
  ledgerTypeLabel,
  ledgerTypeOptions,
  payoutBadgeTone,
  payoutStatusLabel,
  payoutStatusOptions,
} from '../presentation';

type Dialog = 'account' | 'payout' | null;
const blankAccount = {
  bankCode: '',
  bankName: '',
  accountNumber: '',
  accountHolderName: '',
};

export function SellerFinancePage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [accountForm, setAccountForm] = useState(blankAccount);
  const [bankQuery, setBankQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerType, setLedgerType] = useState<LedgerParams['entryType']>();
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutStatus, setPayoutStatus] = useState<PayoutParams['status']>();
  const [cancelPayout, setCancelPayout] = useState<SellerPayout | null>(null);

  const summaryQuery = useQuery({
    queryKey: sellerFinanceKeys.summary(),
    queryFn: sellerFinanceApi.summary,
  });
  const banksQuery = useQuery({
    queryKey: sellerFinanceKeys.banks(),
    queryFn: sellerFinanceApi.banks,
    staleTime: Infinity,
  });
  const accountQuery = useQuery({
    queryKey: sellerFinanceKeys.account(),
    queryFn: sellerFinanceApi.account,
  });
  const ledgerParams: LedgerParams = { page: ledgerPage, limit: 10, entryType: ledgerType };
  const ledgerQuery = useQuery({
    queryKey: sellerFinanceKeys.ledger(ledgerParams),
    queryFn: () => sellerFinanceApi.ledger(ledgerParams),
  });
  const payoutParams: PayoutParams = { page: payoutPage, limit: 10, status: payoutStatus };
  const payoutsQuery = useQuery({
    queryKey: sellerFinanceKeys.payouts(payoutParams),
    queryFn: () => sellerFinanceApi.payouts(payoutParams),
  });

  const refreshFinance = async () => {
    await queryClient.invalidateQueries({ queryKey: sellerFinanceKeys.all });
  };
  const accountMutation = useMutation({
    mutationFn: sellerFinanceApi.saveAccount,
    onSuccess: async () => {
      setDialog(null);
      setAccountForm(blankAccount);
      await refreshFinance();
    },
  });
  const payoutMutation = useMutation({
    mutationFn: sellerFinanceApi.createPayout,
    onSuccess: async () => {
      setDialog(null);
      setAmount('');
      await refreshFinance();
    },
  });
  const cancelMutation = useMutation({
    mutationFn: sellerFinanceApi.cancelPayout,
    onSuccess: async () => {
      setCancelPayout(null);
      await refreshFinance();
    },
  });

  const summary = summaryQuery.data;
  const account = accountQuery.data;
  const available = Number(summary?.availableAmount ?? 0);
  const normalizedAmount = Number(amount);
  const amountError =
    amount && (!Number.isFinite(normalizedAmount) || normalizedAmount < 100_000)
      ? 'Số tiền rút tối thiểu là 100.000 ₫.'
      : amount && normalizedAmount > available
        ? 'Số tiền vượt quá số dư khả dụng.'
        : undefined;
  const accountNumberError =
    accountForm.accountNumber && !/^\d{6,30}$/.test(accountForm.accountNumber)
      ? 'Số tài khoản phải gồm 6–30 chữ số.'
      : undefined;
  const accountFormComplete = Object.values(accountForm).every((value) => value.trim());
  const normalizedBankQuery = bankQuery.trim().toLocaleLowerCase('vi');
  const bankOptions = (banksQuery.data ?? [])
    .filter(
      (bank) =>
        !normalizedBankQuery ||
        `${bank.name} ${bank.fullName} ${bank.code}`
          .toLocaleLowerCase('vi')
          .includes(normalizedBankQuery),
    )
    .map((bank) => ({
      value: bank.code,
      label: `${bank.name} (${bank.code})`,
      description: bank.fullName === bank.name ? undefined : bank.fullName,
      imageUrl: bank.logoUrl,
    }));

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-lg border border-border bg-white shadow-panel">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Tài chính gian hàng</p>
            <h1 className="mt-2 text-2xl font-semibold">Số dư và yêu cầu rút tiền</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Theo dõi doanh thu đã hoàn tất, thời gian giữ tiền và trạng thái chi trả qua đối soát ngân hàng.
            </p>
          </div>
          <Button
            id="seller-create-payout-button"
            type="button"
            disabled={!account || available < 100_000 || summaryQuery.isError}
            onClick={() => setDialog('payout')}
          >
            <Banknote size={18} aria-hidden="true" />
            Tạo yêu cầu rút tiền
          </Button>
        </div>
        <div className="border-t border-border bg-primary-50 px-5 py-3 text-sm text-primary-700 sm:px-6">
          <span className="inline-flex items-center gap-2">
            <LockKeyhole size={16} aria-hidden="true" />
            Doanh thu khả dụng sau {summary?.holdDays ?? 7} ngày kể từ khi đơn của gian hàng hoàn tất.
          </span>
        </div>
      </header>

      {summaryQuery.isPending ? <SummarySkeleton /> : null}
      {summaryQuery.isError ? (
        <ErrorState
          title="Không thể tải số dư tài chính"
          message="Vui lòng thử lại để kiểm tra số dư trước khi tạo yêu cầu rút tiền."
          action={<Button onClick={() => void summaryQuery.refetch()}>Thử lại</Button>}
        />
      ) : null}
      {summary ? (
        <section aria-labelledby="seller-finance-summary-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="seller-finance-summary-heading" className="text-lg font-semibold">Tổng quan số dư</h2>
              <p className="text-sm text-muted">Cập nhật {formatDateTime(summary.asOf)}</p>
            </div>
            <p className="text-sm font-medium">{summary.shop.shopName}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Clock3} label="Đang trong thời gian giữ" value={summary.pendingAmount} note={`Khả dụng sau ${summary.holdDays} ngày`} />
            <SummaryCard icon={WalletCards} label="Có thể rút" value={summary.availableAmount} note="Đã trừ khoản đang xử lý" emphasized />
            <SummaryCard icon={LockKeyhole} label="Đang giữ cho payout" value={summary.reservedAmount} note="Chờ phê duyệt hoặc đối soát" />
            <SummaryCard icon={Landmark} label="Đã chi trả" value={summary.paidAmount} note="Tổng payout đã xác nhận" />
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Lịch sử số dư</h2>
              <p className="text-sm text-muted">Mỗi khoản tăng hoặc giảm được ghi thành một bút toán riêng.</p>
            </div>
            <div className="w-full sm:w-64">
              <SelectInput
                id="seller-ledger-type-filter"
                label="Loại bút toán"
                value={ledgerType ?? ''}
                onChange={(event) => {
                  setLedgerType((event.target.value || undefined) as LedgerParams['entryType']);
                  setLedgerPage(1);
                }}
              >
                <option value="">Tất cả</option>
                {ledgerTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectInput>
            </div>
          </div>
          {ledgerQuery.isPending ? <Skeleton className="h-80 w-full" /> : null}
          {ledgerQuery.isError ? <ErrorState title="Không thể tải lịch sử số dư" message="Vui lòng thử lại sau." action={<Button onClick={() => void ledgerQuery.refetch()}>Thử lại</Button>} /> : null}
          {ledgerQuery.data?.items.length === 0 ? <EmptyState title="Chưa có bút toán" description="Doanh thu sẽ xuất hiện khi đơn hàng của gian hàng hoàn tất." /> : null}
          {ledgerQuery.data?.items.length ? (
            <>
              <div className="space-y-3 md:hidden">
                {ledgerQuery.data.items.map((entry) => (
                  <article key={entry.id} className="rounded-lg border border-border bg-white p-4 shadow-panel">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-medium">{ledgerTypeLabel(entry.entryType)}</p><p className="mt-1 text-xs text-muted">{formatDateTime(entry.createdAt)}</p></div>
                      <MoneyChange amount={entry.amount} />
                    </div>
                    <p className="mt-3 text-sm text-muted">{entry.description}</p>
                    <p className="mt-2 text-xs text-muted">Khả dụng: {formatDateTime(entry.availableAt)}</p>
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table aria-label="Lịch sử số dư người bán">
                  <TableHead><TableRow><TableHeaderCell>Thời gian</TableHeaderCell><TableHeaderCell>Loại bút toán</TableHeaderCell><TableHeaderCell>Nội dung</TableHeaderCell><TableHeaderCell>Khả dụng</TableHeaderCell><TableHeaderCell className="text-right">Số tiền</TableHeaderCell></TableRow></TableHead>
                  <TableBody>{ledgerQuery.data.items.map((entry) => <TableRow key={entry.id}><TableCell>{formatDateTime(entry.createdAt)}</TableCell><TableCell>{ledgerTypeLabel(entry.entryType)}</TableCell><TableCell><p className="max-w-xs break-words">{entry.description}</p></TableCell><TableCell>{formatDateTime(entry.availableAt)}</TableCell><TableCell className="text-right"><MoneyChange amount={entry.amount} /></TableCell></TableRow>)}</TableBody>
                </Table>
              </div>
              <Pagination page={ledgerQuery.data.meta?.page ?? ledgerPage} totalPages={ledgerQuery.data.meta?.totalPages ?? 1} onPageChange={setLedgerPage} />
            </>
          ) : null}
        </div>

        <aside className="h-fit rounded-lg border border-border bg-white p-5 shadow-panel" aria-labelledby="payout-account-heading">
          <div className="flex items-start justify-between gap-3">
            <div><h2 id="payout-account-heading" className="text-lg font-semibold">Tài khoản nhận tiền</h2><p className="mt-1 text-sm text-muted">Thông tin được mã hóa và chỉ hiển thị số cuối.</p></div>
            <Landmark className="text-primary-600" size={22} aria-hidden="true" />
          </div>
          {accountQuery.isPending ? <Skeleton className="mt-5 h-32 w-full" /> : null}
          {accountQuery.isError ? <Alert className="mt-5" tone="danger">Không thể tải tài khoản ngân hàng. Vui lòng thử lại.</Alert> : null}
          {account ? (
            <dl className="mt-5 space-y-3 text-sm">
              <div><dt className="text-muted">Ngân hàng</dt><dd className="mt-1 font-medium">{account.bankName} ({account.bankCode})</dd></div>
              <div><dt className="text-muted">Số tài khoản</dt><dd className="mt-1 font-mono font-semibold tracking-wide">{account.maskedAccountNumber}</dd></div>
              <div><dt className="text-muted">Chủ tài khoản</dt><dd className="mt-1 font-medium">{account.accountHolderName}</dd></div>
              <div><dt className="text-muted">Cập nhật</dt><dd className="mt-1">{formatDateTime(account.updatedAt)}</dd></div>
            </dl>
          ) : !accountQuery.isPending && !accountQuery.isError ? <p className="mt-5 text-sm text-muted">Chưa thiết lập tài khoản nhận tiền.</p> : null}
          <Button id="seller-edit-payout-account-button" className="mt-5 w-full" type="button" variant="secondary" disabled={accountQuery.isError} onClick={() => setDialog('account')}>{account ? 'Cập nhật tài khoản' : 'Thiết lập tài khoản'}</Button>
        </aside>
      </section>

      <section className="space-y-4" aria-labelledby="seller-payout-history-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 id="seller-payout-history-heading" className="text-lg font-semibold">Yêu cầu rút tiền</h2><p className="text-sm text-muted">Theo dõi từ lúc gửi yêu cầu đến khi ngân hàng xác nhận.</p></div>
          <div className="w-full sm:w-64"><SelectInput id="seller-payout-status-filter" label="Trạng thái" value={payoutStatus ?? ''} onChange={(event) => { setPayoutStatus((event.target.value || undefined) as PayoutParams['status']); setPayoutPage(1); }}><option value="">Tất cả</option>{payoutStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectInput></div>
        </div>
        {payoutsQuery.isPending ? <Skeleton className="h-72 w-full" /> : null}
        {payoutsQuery.isError ? <ErrorState title="Không thể tải yêu cầu rút tiền" message="Vui lòng thử lại sau." action={<Button onClick={() => void payoutsQuery.refetch()}>Thử lại</Button>} /> : null}
        {payoutsQuery.data?.items.length === 0 ? <EmptyState title="Chưa có yêu cầu rút tiền" description="Khi số dư khả dụng đạt tối thiểu 100.000 ₫, Bạn có thể tạo yêu cầu đầu tiên." /> : null}
        {payoutsQuery.data?.items.length ? <PayoutList items={payoutsQuery.data.items} onCancel={setCancelPayout} /> : null}
        {payoutsQuery.data?.items.length ? <Pagination page={payoutsQuery.data.meta?.page ?? payoutPage} totalPages={payoutsQuery.data.meta?.totalPages ?? 1} onPageChange={setPayoutPage} /> : null}
      </section>

      <Modal open={dialog === 'account'} title={account ? 'Cập nhật tài khoản nhận tiền' : 'Thiết lập tài khoản nhận tiền'} closeDisabled={accountMutation.isPending} onClose={() => { setDialog(null); accountMutation.reset(); }} footer={<><Button type="button" variant="secondary" disabled={accountMutation.isPending} onClick={() => setDialog(null)}>Quay lại</Button><Button id="seller-save-payout-account-button" type="submit" form="seller-payout-account-form" disabled={accountMutation.isPending || banksQuery.isPending || banksQuery.isError || !accountFormComplete || Boolean(accountNumberError)}>{accountMutation.isPending ? 'Đang lưu...' : 'Lưu tài khoản'}</Button></>}>
        <form id="seller-payout-account-form" className="space-y-4" onSubmit={(event) => { event.preventDefault(); accountMutation.mutate(accountForm); }}>
          <Alert>Sau khi có payout đang xử lý, tài khoản sẽ tạm khóa thay đổi để giữ đúng thông tin chuyển khoản.</Alert>
          {banksQuery.isError ? <Alert tone="danger">Không thể tải danh sách ngân hàng. Vui lòng thử lại trước khi lưu tài khoản.</Alert> : null}
          {banksQuery.isError ? <Button id="seller-retry-payout-banks-button" type="button" variant="secondary" onClick={() => void banksQuery.refetch()}>Tải lại danh sách ngân hàng</Button> : null}
          {accountMutation.isError ? <Alert tone="danger">{getErrorMessage(accountMutation.error)}</Alert> : null}
          <Combobox
            id="seller-payout-bank"
            label="Ngân hàng"
            required
            disabled={banksQuery.isPending || banksQuery.isError}
            disabledHint={banksQuery.isPending ? 'Đang tải danh sách ngân hàng...' : 'Không thể tải danh sách ngân hàng'}
            placeholder="Tìm theo tên hoặc mã ngân hàng"
            emptyMessage="Không tìm thấy ngân hàng phù hợp"
            value={accountForm.bankCode}
            query={bankQuery}
            options={bankOptions}
            onQueryChange={setBankQuery}
            onChange={(bankCode) => {
              const bank = banksQuery.data?.find(({ code }) => code === bankCode);
              setAccountForm((current) => ({
                ...current,
                bankCode: bank?.code ?? '',
                bankName: bank?.name ?? '',
              }));
            }}
          />
          <TextInput id="seller-bank-account-number" label="Số tài khoản" inputMode="numeric" autoComplete="off" required error={accountNumberError} value={accountForm.accountNumber} onChange={(event) => setAccountForm((current) => ({ ...current, accountNumber: event.target.value.replace(/\s/g, '') }))} />
          <TextInput id="seller-bank-account-holder" label="Tên chủ tài khoản" autoComplete="name" required value={accountForm.accountHolderName} onChange={(event) => setAccountForm((current) => ({ ...current, accountHolderName: event.target.value }))} />
          <p className="text-sm leading-6 text-muted">Vui lòng kiểm tra số tài khoản và tên người nhận trong ứng dụng ngân hàng trước khi gửi yêu cầu rút tiền.</p>
        </form>
      </Modal>

      <Modal open={dialog === 'payout'} title="Tạo yêu cầu rút tiền" closeDisabled={payoutMutation.isPending} onClose={() => { setDialog(null); payoutMutation.reset(); }} footer={<><Button type="button" variant="secondary" disabled={payoutMutation.isPending} onClick={() => setDialog(null)}>Quay lại</Button><Button id="seller-submit-payout-button" type="submit" form="seller-payout-form" disabled={payoutMutation.isPending || !amount || Boolean(amountError)}>{payoutMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}</Button></>}>
        <form id="seller-payout-form" className="space-y-4" onSubmit={(event) => { event.preventDefault(); payoutMutation.mutate(amount); }}>
          <div className="rounded-lg border border-border bg-surface p-4"><p className="text-sm text-muted">Số dư có thể rút</p><p className="mt-1 text-2xl font-semibold text-primary-700">{formatMoney(summary?.availableAmount ?? 0)}</p><p className="mt-2 text-sm text-muted">Nhận vào {account?.bankName} · {account?.maskedAccountNumber}</p></div>
          {payoutMutation.isError ? <Alert tone="danger">{getErrorMessage(payoutMutation.error)}</Alert> : null}
          <TextInput id="seller-payout-amount" label="Số tiền muốn rút" inputMode="decimal" required error={amountError} value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ''))} />
          <p className="text-sm text-muted">Yêu cầu sẽ giữ số dư ngay khi được tạo. Bạn chỉ có thể hủy khi yêu cầu còn chờ phê duyệt.</p>
        </form>
      </Modal>

      <Modal open={Boolean(cancelPayout)} title="Hủy yêu cầu rút tiền" closeDisabled={cancelMutation.isPending} onClose={() => { setCancelPayout(null); cancelMutation.reset(); }} footer={<><Button type="button" variant="secondary" disabled={cancelMutation.isPending} onClick={() => setCancelPayout(null)}>Giữ yêu cầu</Button><Button id="seller-confirm-cancel-payout-button" type="button" variant="danger" disabled={cancelMutation.isPending || !cancelPayout} onClick={() => cancelPayout && cancelMutation.mutate(cancelPayout.id)}>{cancelMutation.isPending ? 'Đang hủy...' : 'Hủy yêu cầu'}</Button></>}>
        <p className="text-sm leading-6">Bạn sắp hủy <strong>{cancelPayout?.payoutCode}</strong> trị giá <strong>{formatMoney(cancelPayout?.amount ?? 0)}</strong>. Số tiền giữ sẽ trở lại số dư khả dụng.</p>
        {cancelMutation.isError ? <Alert className="mt-4" tone="danger">{getErrorMessage(cancelMutation.error)}</Alert> : null}
      </Modal>
    </div>
  );
}

function SummarySkeleton() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 w-full" />)}</div>;
}

function SummaryCard({ icon: Icon, label, value, note, emphasized = false }: { icon: typeof WalletCards; label: string; value: string; note: string; emphasized?: boolean }) {
  return <article className={['rounded-lg border p-4 shadow-panel', emphasized ? 'border-primary-100 bg-primary-50' : 'border-border bg-white'].join(' ')}><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-muted">{label}</p><Icon className={emphasized ? 'text-primary-700' : 'text-muted'} size={20} aria-hidden="true" /></div><p className={['mt-3 text-2xl font-semibold', emphasized ? 'text-primary-700' : 'text-ink'].join(' ')}>{formatMoney(value)}</p><p className="mt-2 text-xs text-muted">{note}</p></article>;
}

function MoneyChange({ amount }: { amount: string }) {
  const positive = Number(amount) >= 0;
  return <span className={['whitespace-nowrap font-semibold', positive ? 'text-success' : 'text-danger'].join(' ')}>{positive ? '+' : '−'}{formatMoney(Math.abs(Number(amount)))}</span>;
}

function PayoutList({ items, onCancel }: { items: SellerPayout[]; onCancel: (payout: SellerPayout) => void }) {
  return <><div className="space-y-3 lg:hidden">{items.map((payout) => <article key={payout.id} className="rounded-lg border border-border bg-white p-4 shadow-panel"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-sm font-semibold">{payout.payoutCode}</p><p className="mt-1 text-xs text-muted">{formatDateTime(payout.requestedAt)}</p></div><Badge tone={payoutBadgeTone(payout.status)}>{payoutStatusLabel(payout.status)}</Badge></div><p className="mt-4 text-xl font-semibold">{formatMoney(payout.amount)}</p><p className="mt-2 text-sm text-muted">{payout.bankName} · {payout.maskedAccountNumber}</p>{payout.rejectionReason ? <p className="mt-3 text-sm text-danger">Lý do: {payout.rejectionReason}</p> : null}{payout.status === 'PendingApproval' ? <Button className="mt-4 w-full" variant="secondary" onClick={() => onCancel(payout)}>Hủy yêu cầu</Button> : null}</article>)}</div><div className="hidden lg:block"><Table aria-label="Yêu cầu rút tiền"><TableHead><TableRow><TableHeaderCell>Mã yêu cầu</TableHeaderCell><TableHeaderCell>Ngày gửi</TableHeaderCell><TableHeaderCell>Tài khoản nhận</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell className="text-right">Số tiền</TableHeaderCell><TableHeaderCell className="text-right">Thao tác</TableHeaderCell></TableRow></TableHead><TableBody>{items.map((payout) => <TableRow key={payout.id}><TableCell className="font-mono font-semibold">{payout.payoutCode}</TableCell><TableCell>{formatDateTime(payout.requestedAt)}</TableCell><TableCell><p>{payout.bankName}</p><p className="text-xs text-muted">{payout.maskedAccountNumber}</p></TableCell><TableCell><Badge tone={payoutBadgeTone(payout.status)}>{payoutStatusLabel(payout.status)}</Badge>{payout.rejectionReason ? <p className="mt-2 max-w-xs text-xs text-danger">{payout.rejectionReason}</p> : null}</TableCell><TableCell className="text-right font-semibold">{formatMoney(payout.amount)}</TableCell><TableCell className="text-right">{payout.status === 'PendingApproval' ? <Button variant="secondary" onClick={() => onCancel(payout)}>Hủy</Button> : <span className="text-sm text-muted">—</span>}</TableCell></TableRow>)}</TableBody></Table></div></>;
}
