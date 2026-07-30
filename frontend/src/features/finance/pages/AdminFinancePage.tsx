import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpFromLine, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { getErrorMessage } from '@/services/errors';
import { formatDateTime, formatMoney } from '@/utils/format';
import {
  adminFinanceApi,
  adminFinanceKeys,
  type BankTransaction,
  type BankTransactionParams,
  type PayoutParams,
  type SellerPayout,
  type TransferInstruction,
} from '../api';
import {
  matchBadgeTone,
  matchStatusLabel,
  matchStatusOptions,
  payoutBadgeTone,
  payoutStatusLabel,
  payoutStatusOptions,
} from '../presentation';

type View = 'payouts' | 'transactions';
type PayoutAction = 'approve' | 'reject' | 'process' | 'fail';
type PayoutDialog = { action: PayoutAction; payout: SellerPayout } | null;

export function AdminFinancePage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('payouts');
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutStatus, setPayoutStatus] = useState<PayoutParams['status']>();
  const [payoutSearch, setPayoutSearch] = useState('');
  const [transactionPage, setTransactionPage] = useState(1);
  const [matchStatus, setMatchStatus] = useState<BankTransactionParams['matchStatus']>();
  const [transferType, setTransferType] = useState<BankTransactionParams['transferType']>();
  const [transactionSearch, setTransactionSearch] = useState('');
  const [payoutDialog, setPayoutDialog] = useState<PayoutDialog>(null);
  const [reason, setReason] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [note, setNote] = useState('');
  const [instruction, setInstruction] = useState<TransferInstruction | null>(null);
  const [matchTransaction, setMatchTransaction] = useState<BankTransaction | null>(null);
  const [matchPayoutId, setMatchPayoutId] = useState('');
  const [matchReason, setMatchReason] = useState('');

  const payoutParams: PayoutParams = {
    page: payoutPage,
    limit: 10,
    q: payoutSearch.trim() || undefined,
    status: payoutStatus,
  };
  const transactionParams: BankTransactionParams = {
    page: transactionPage,
    limit: 10,
    q: transactionSearch.trim() || undefined,
    matchStatus,
    transferType,
  };
  const payoutsQuery = useQuery({
    queryKey: adminFinanceKeys.payouts(payoutParams),
    queryFn: () => adminFinanceApi.payouts(payoutParams),
  });
  const transactionsQuery = useQuery({
    queryKey: adminFinanceKeys.transactions(transactionParams),
    queryFn: () => adminFinanceApi.transactions(transactionParams),
  });

  const refreshFinance = async () => {
    await queryClient.invalidateQueries({ queryKey: adminFinanceKeys.all });
  };
  const closePayoutDialog = () => {
    setPayoutDialog(null);
    setReason('');
    setBankReference('');
    setNote('');
    payoutMutation.reset();
  };
  const payoutMutation = useMutation({
    mutationFn: async () => {
      if (!payoutDialog) throw new Error('Chưa chọn yêu cầu rút tiền.');
      const { action, payout } = payoutDialog;
      if (action === 'approve') return adminFinanceApi.approve(payout.id);
      if (action === 'reject') return adminFinanceApi.reject(payout.id, reason);
      if (action === 'fail') return adminFinanceApi.fail(payout.id, reason);
      return adminFinanceApi.process(payout.id, {
        bankReference,
        note: note.trim() || undefined,
      });
    },
    onSuccess: async (result) => {
      if (hasTransferInstruction(result)) setInstruction(result.transferInstruction);
      closePayoutDialog();
      await refreshFinance();
    },
  });
  const matchMutation = useMutation({
    mutationFn: () => {
      if (!matchTransaction) throw new Error('Chưa chọn giao dịch ngân hàng.');
      return adminFinanceApi.match(matchTransaction.id, {
        payoutId: matchPayoutId,
        reason: matchReason,
      });
    },
    onSuccess: async () => {
      setMatchTransaction(null);
      setMatchPayoutId('');
      setMatchReason('');
      await refreshFinance();
    },
  });

  const reasonRequired = payoutDialog?.action === 'reject' || payoutDialog?.action === 'fail';
  const payoutActionDisabled =
    payoutMutation.isPending ||
    (reasonRequired && reason.trim().length < 5) ||
    (payoutDialog?.action === 'process' && bankReference.trim().length < 2);
  const manualMatchEnabled =
    matchTransaction?.transferType === 'out' &&
    (matchTransaction.matchStatus === 'Unmatched' || matchTransaction.matchStatus === 'AmountMismatch');
  const matchDisabled =
    matchMutation.isPending || !/^\d+$/.test(matchPayoutId) || matchReason.trim().length < 5;

  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-border bg-white p-5 shadow-panel sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Đối soát tài chính</p>
            <h1 className="mt-2 text-2xl font-semibold">Payout và giao dịch ngân hàng</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Phê duyệt lệnh chi, ghi nhận tham chiếu chuyển khoản và xử lý các giao dịch SePay chưa khớp.
            </p>
          </div>
          <div className="inline-flex w-full rounded-lg border border-border bg-surface p-1 sm:w-auto" aria-label="Chọn nội dung đối soát">
            <button id="admin-finance-payout-tab" type="button" className={tabClass(view === 'payouts')} aria-pressed={view === 'payouts'} onClick={() => setView('payouts')}>Yêu cầu rút tiền</button>
            <button id="admin-finance-transaction-tab" type="button" className={tabClass(view === 'transactions')} aria-pressed={view === 'transactions'} onClick={() => setView('transactions')}>Giao dịch ngân hàng</button>
          </div>
        </div>
      </header>

      <Alert>
        <span className="inline-flex items-start gap-2"><ShieldCheck className="mt-0.5 shrink-0" size={17} aria-hidden="true" /><span>Không đánh dấu đã chi thủ công. Payout chỉ hoàn tất khi giao dịch chuyển ra được SePay hoặc Quản trị viên đối soát đúng số tiền.</span></span>
      </Alert>

      {view === 'payouts' ? (
        <section className="space-y-4" aria-labelledby="admin-payout-heading">
          <div className="rounded-lg border border-border bg-white p-4 shadow-panel">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_280px_auto] xl:items-end">
              <TextInput id="admin-payout-search" label="Tìm mã payout hoặc gian hàng" value={payoutSearch} onChange={(event) => { setPayoutSearch(event.target.value); setPayoutPage(1); }} />
              <SelectInput id="admin-payout-status" label="Trạng thái" value={payoutStatus ?? ''} onChange={(event) => { setPayoutStatus((event.target.value || undefined) as PayoutParams['status']); setPayoutPage(1); }}><option value="">Tất cả</option>{payoutStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectInput>
              <Button variant="secondary" onClick={() => void payoutsQuery.refetch()}><RefreshCcw size={16} aria-hidden="true" />Tải lại</Button>
            </div>
          </div>
          <div><h2 id="admin-payout-heading" className="text-lg font-semibold">Hàng đợi payout</h2><p className="text-sm text-muted">Chỉ các hành động hợp lệ ở trạng thái hiện tại được hiển thị.</p></div>
          {payoutsQuery.isPending ? <Skeleton className="h-96 w-full" /> : null}
          {payoutsQuery.isError ? <ErrorState title="Không thể tải hàng đợi payout" message="Vui lòng thử tải lại dữ liệu." action={<Button onClick={() => void payoutsQuery.refetch()}>Thử lại</Button>} /> : null}
          {payoutsQuery.data?.items.length === 0 ? <EmptyState title="Không có payout phù hợp" description="Thử thay đổi từ khóa hoặc bộ lọc trạng thái." /> : null}
          {payoutsQuery.data?.items.length ? <AdminPayoutList items={payoutsQuery.data.items} onAction={(action, payout) => setPayoutDialog({ action, payout })} /> : null}
          {payoutsQuery.data?.items.length ? <Pagination page={payoutsQuery.data.meta?.page ?? payoutPage} totalPages={payoutsQuery.data.meta?.totalPages ?? 1} onPageChange={setPayoutPage} /> : null}
        </section>
      ) : (
        <section className="space-y-4" aria-labelledby="admin-transactions-heading">
          <div className="rounded-lg border border-border bg-white p-4 shadow-panel">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_240px_220px_auto] xl:items-end">
              <TextInput id="admin-transaction-search" label="Tìm mã giao dịch, nội dung hoặc tham chiếu" value={transactionSearch} onChange={(event) => { setTransactionSearch(event.target.value); setTransactionPage(1); }} />
              <SelectInput id="admin-match-status" label="Trạng thái đối soát" value={matchStatus ?? ''} onChange={(event) => { setMatchStatus((event.target.value || undefined) as BankTransactionParams['matchStatus']); setTransactionPage(1); }}><option value="">Tất cả</option>{matchStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectInput>
              <SelectInput id="admin-transfer-type" label="Chiều giao dịch" value={transferType ?? ''} onChange={(event) => { setTransferType((event.target.value || undefined) as BankTransactionParams['transferType']); setTransactionPage(1); }}><option value="">Tất cả</option><option value="out">Tiền chuyển ra</option><option value="in">Tiền chuyển vào</option></SelectInput>
              <Button variant="secondary" onClick={() => void transactionsQuery.refetch()}><RefreshCcw size={16} aria-hidden="true" />Tải lại</Button>
            </div>
          </div>
          <div><h2 id="admin-transactions-heading" className="text-lg font-semibold">Giao dịch SePay</h2><p className="text-sm text-muted">Số tài khoản đã được che; dữ liệu gốc không hiển thị trên giao diện.</p></div>
          {transactionsQuery.isPending ? <Skeleton className="h-96 w-full" /> : null}
          {transactionsQuery.isError ? <ErrorState title="Không thể tải giao dịch ngân hàng" message="Vui lòng thử tải lại dữ liệu." action={<Button onClick={() => void transactionsQuery.refetch()}>Thử lại</Button>} /> : null}
          {transactionsQuery.data?.items.length === 0 ? <EmptyState title="Không có giao dịch phù hợp" description="Thử thay đổi từ khóa hoặc bộ lọc đối soát." /> : null}
          {transactionsQuery.data?.items.length ? <TransactionList items={transactionsQuery.data.items} onMatch={setMatchTransaction} /> : null}
          {transactionsQuery.data?.items.length ? <Pagination page={transactionsQuery.data.meta?.page ?? transactionPage} totalPages={transactionsQuery.data.meta?.totalPages ?? 1} onPageChange={setTransactionPage} /> : null}
        </section>
      )}

      <Modal open={Boolean(payoutDialog)} title={payoutDialogTitle(payoutDialog?.action)} closeDisabled={payoutMutation.isPending} onClose={closePayoutDialog} footer={<><Button type="button" variant="secondary" disabled={payoutMutation.isPending} onClick={closePayoutDialog}>Quay lại</Button><Button id="admin-confirm-payout-action-button" type="button" variant={payoutDialog?.action === 'reject' || payoutDialog?.action === 'fail' ? 'danger' : 'primary'} disabled={payoutActionDisabled} onClick={() => payoutMutation.mutate()}>{payoutMutation.isPending ? 'Đang xử lý...' : payoutActionLabel(payoutDialog?.action)}</Button></>}>
        <div className="space-y-4">
          <PayoutSummary payout={payoutDialog?.payout} />
          {payoutDialog?.action === 'approve' ? <p className="text-sm leading-6">Sau khi phê duyệt, số tiền vẫn được giữ và chờ Quản trị viên thực hiện chuyển khoản.</p> : null}
          {reasonRequired ? <Textarea id="admin-payout-reason" label={payoutDialog?.action === 'reject' ? 'Lý do từ chối' : 'Lý do chuyển khoản thất bại'} required error={reason && reason.trim().length < 5 ? 'Lý do phải có ít nhất 5 ký tự.' : undefined} value={reason} onChange={(event) => setReason(event.target.value)} /> : null}
          {payoutDialog?.action === 'process' ? <><TextInput id="admin-bank-reference" label="Mã tham chiếu ngân hàng" required value={bankReference} onChange={(event) => setBankReference(event.target.value)} /><Textarea id="admin-payout-note" label="Ghi chú nội bộ (không bắt buộc)" value={note} onChange={(event) => setNote(event.target.value)} /><Alert>Nội dung chuyển khoản bắt buộc là mã payout. Hệ thống chỉ xác nhận đã chi khi giao dịch chuyển ra khớp tuyệt đối mã và số tiền.</Alert></> : null}
          {payoutMutation.isError ? <Alert tone="danger">{getErrorMessage(payoutMutation.error)}</Alert> : null}
        </div>
      </Modal>

      <Modal open={Boolean(instruction)} title="Thông tin chuyển khoản" onClose={() => setInstruction(null)} footer={<Button id="admin-close-transfer-instruction-button" type="button" onClick={() => setInstruction(null)}>Đã ghi nhận</Button>}>
        {instruction ? <div className="space-y-4"><Alert>Chuyển đúng số tiền và giữ nguyên nội dung. Payout đang chờ webhook ngân hàng xác nhận.</Alert><dl className="grid gap-4 rounded-lg border border-border bg-surface p-4 text-sm sm:grid-cols-2"><Detail label="Ngân hàng" value={`${instruction.bankName} (${instruction.bankCode})`} /><Detail label="Chủ tài khoản" value={instruction.accountHolderName} /><Detail label="Số tài khoản" value={instruction.accountNumber} mono /><Detail label="Số tiền" value={formatMoney(instruction.amount)} /><Detail label="Nội dung bắt buộc" value={instruction.content} mono /></dl></div> : null}
      </Modal>

      <Modal open={Boolean(matchTransaction)} title="Đối soát giao dịch thủ công" closeDisabled={matchMutation.isPending} onClose={() => { setMatchTransaction(null); matchMutation.reset(); }} footer={<><Button type="button" variant="secondary" disabled={matchMutation.isPending} onClick={() => setMatchTransaction(null)}>Quay lại</Button><Button id="admin-confirm-manual-match-button" type="button" disabled={matchDisabled || !manualMatchEnabled} onClick={() => matchMutation.mutate()}>{matchMutation.isPending ? 'Đang đối soát...' : 'Xác nhận khớp'}</Button></>}>
        <div className="space-y-4">
          {matchTransaction ? <div className="rounded-lg border border-border bg-surface p-4"><p className="font-mono text-sm font-semibold">#{matchTransaction.providerTransactionId}</p><p className="mt-2 text-xl font-semibold">{formatMoney(matchTransaction.transferAmount)}</p><p className="mt-1 text-sm text-muted">{matchTransaction.gateway} · {matchTransaction.accountNumberMasked}</p></div> : null}
          {!manualMatchEnabled ? <Alert tone="danger">Chỉ giao dịch chuyển ra chưa khớp hoặc lệch số tiền mới được đối soát thủ công.</Alert> : <Alert>Payout được chọn phải đang chờ đối soát và có số tiền bằng đúng giao dịch ngân hàng.</Alert>}
          <TextInput id="admin-manual-match-payout-id" label="ID payout cần khớp" inputMode="numeric" required error={matchPayoutId && !/^\d+$/.test(matchPayoutId) ? 'ID payout chỉ gồm chữ số.' : undefined} value={matchPayoutId} onChange={(event) => setMatchPayoutId(event.target.value.trim())} />
          <Textarea id="admin-manual-match-reason" label="Lý do đối soát thủ công" required error={matchReason && matchReason.trim().length < 5 ? 'Lý do phải có ít nhất 5 ký tự.' : undefined} value={matchReason} onChange={(event) => setMatchReason(event.target.value)} />
          {matchMutation.isError ? <Alert tone="danger">{getErrorMessage(matchMutation.error)}</Alert> : null}
        </div>
      </Modal>
    </div>
  );
}

function hasTransferInstruction(
  result: SellerPayout | (SellerPayout & { transferInstruction: TransferInstruction }),
): result is SellerPayout & { transferInstruction: TransferInstruction } {
  return 'transferInstruction' in result;
}

function tabClass(active: boolean) {
  return ['min-h-11 flex-1 rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 sm:flex-none', active ? 'bg-white text-primary-700 shadow-panel' : 'text-muted hover:text-ink'].join(' ');
}

function payoutDialogTitle(action?: PayoutAction) {
  return { approve: 'Phê duyệt yêu cầu rút tiền', reject: 'Từ chối yêu cầu rút tiền', process: 'Ghi nhận đã chuyển khoản', fail: 'Ghi nhận chuyển khoản thất bại' }[action ?? 'approve'];
}
function payoutActionLabel(action?: PayoutAction) {
  return { approve: 'Phê duyệt', reject: 'Từ chối yêu cầu', process: 'Ghi nhận chuyển khoản', fail: 'Xác nhận thất bại' }[action ?? 'approve'];
}

function PayoutSummary({ payout }: { payout?: SellerPayout }) {
  if (!payout) return null;
  return <div className="rounded-lg border border-border bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-sm font-semibold">{payout.payoutCode}</p><p className="mt-1 text-sm text-muted">{payout.shop?.shopName ?? 'Gian hàng'}</p></div><Badge tone={payoutBadgeTone(payout.status)}>{payoutStatusLabel(payout.status)}</Badge></div><p className="mt-4 text-2xl font-semibold">{formatMoney(payout.amount)}</p><p className="mt-2 text-sm text-muted">{payout.bankName} · {payout.maskedAccountNumber} · {payout.accountHolderName}</p></div>;
}

function PayoutActions({ payout, onAction }: { payout: SellerPayout; onAction: (action: PayoutAction, payout: SellerPayout) => void }) {
  if (payout.status === 'PendingApproval') return <div className="flex flex-wrap gap-2"><Button onClick={() => onAction('approve', payout)}>Phê duyệt</Button><Button variant="danger" onClick={() => onAction('reject', payout)}>Từ chối</Button></div>;
  if (payout.status === 'Approved') return <div className="flex flex-wrap gap-2"><Button onClick={() => onAction('process', payout)}>Ghi nhận chuyển khoản</Button><Button variant="danger" onClick={() => onAction('fail', payout)}>Ghi nhận thất bại</Button></div>;
  if (payout.status === 'Processing') return <Button variant="danger" onClick={() => onAction('fail', payout)}>Ghi nhận thất bại</Button>;
  return <span className="text-sm text-muted">Không có thao tác</span>;
}

function AdminPayoutList({ items, onAction }: { items: SellerPayout[]; onAction: (action: PayoutAction, payout: SellerPayout) => void }) {
  return <><div className="space-y-3 xl:hidden">{items.map((payout) => <article key={payout.id} className="rounded-lg border border-border bg-white p-4 shadow-panel"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-sm font-semibold">{payout.payoutCode}</p><p className="mt-1 text-sm text-muted">{payout.shop?.shopName ?? 'Gian hàng'}</p></div><Badge tone={payoutBadgeTone(payout.status)}>{payoutStatusLabel(payout.status)}</Badge></div><p className="mt-4 text-xl font-semibold">{formatMoney(payout.amount)}</p><p className="mt-2 text-sm text-muted">{payout.bankName} · {payout.maskedAccountNumber}</p><div className="mt-4"><PayoutActions payout={payout} onAction={onAction} /></div></article>)}</div><div className="hidden xl:block"><Table aria-label="Hàng đợi payout"><TableHead><TableRow><TableHeaderCell>Yêu cầu</TableHeaderCell><TableHeaderCell>Gian hàng</TableHeaderCell><TableHeaderCell>Ngày gửi</TableHeaderCell><TableHeaderCell>Tài khoản</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell className="text-right">Số tiền</TableHeaderCell><TableHeaderCell>Thao tác</TableHeaderCell></TableRow></TableHead><TableBody>{items.map((payout) => <TableRow key={payout.id}><TableCell className="font-mono font-semibold">{payout.payoutCode}</TableCell><TableCell>{payout.shop?.shopName ?? '—'}</TableCell><TableCell>{formatDateTime(payout.requestedAt)}</TableCell><TableCell><p>{payout.bankName}</p><p className="text-xs text-muted">{payout.maskedAccountNumber}</p></TableCell><TableCell><Badge tone={payoutBadgeTone(payout.status)}>{payoutStatusLabel(payout.status)}</Badge></TableCell><TableCell className="text-right font-semibold">{formatMoney(payout.amount)}</TableCell><TableCell><PayoutActions payout={payout} onAction={onAction} /></TableCell></TableRow>)}</TableBody></Table></div></>;
}

function TransactionDirection({ type }: { type: 'in' | 'out' }) {
  return <span className="inline-flex items-center gap-1.5 text-sm font-medium">{type === 'out' ? <ArrowUpFromLine size={16} aria-hidden="true" /> : <ArrowDownToLine size={16} aria-hidden="true" />}{type === 'out' ? 'Chuyển ra' : 'Chuyển vào'}</span>;
}

function canManualMatch(transaction: BankTransaction) {
  return transaction.transferType === 'out' && (transaction.matchStatus === 'Unmatched' || transaction.matchStatus === 'AmountMismatch');
}

function TransactionList({ items, onMatch }: { items: BankTransaction[]; onMatch: (transaction: BankTransaction) => void }) {
  return <><div className="space-y-3 xl:hidden">{items.map((transaction) => <article key={transaction.id} className="rounded-lg border border-border bg-white p-4 shadow-panel"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-sm font-semibold">#{transaction.providerTransactionId}</p><p className="mt-1 text-xs text-muted">{formatDateTime(transaction.transactionDate)}</p></div><Badge tone={matchBadgeTone(transaction.matchStatus)}>{matchStatusLabel(transaction.matchStatus)}</Badge></div><div className="mt-4 flex items-center justify-between gap-3"><TransactionDirection type={transaction.transferType} /><p className="text-lg font-semibold">{formatMoney(transaction.transferAmount)}</p></div><p className="mt-3 break-words text-sm text-muted">{transaction.content || 'Không có nội dung'}</p>{transaction.payout ? <p className="mt-2 font-mono text-xs">{transaction.payout.payoutCode}</p> : null}{canManualMatch(transaction) ? <Button className="mt-4 w-full" variant="secondary" onClick={() => onMatch(transaction)}>Đối soát thủ công</Button> : null}</article>)}</div><div className="hidden xl:block"><Table aria-label="Giao dịch ngân hàng SePay"><TableHead><TableRow><TableHeaderCell>Giao dịch</TableHeaderCell><TableHeaderCell>Thời gian</TableHeaderCell><TableHeaderCell>Chiều</TableHeaderCell><TableHeaderCell>Nội dung</TableHeaderCell><TableHeaderCell>Payout</TableHeaderCell><TableHeaderCell>Đối soát</TableHeaderCell><TableHeaderCell className="text-right">Số tiền</TableHeaderCell><TableHeaderCell className="text-right">Thao tác</TableHeaderCell></TableRow></TableHead><TableBody>{items.map((transaction) => <TableRow key={transaction.id}><TableCell><p className="font-mono font-semibold">#{transaction.providerTransactionId}</p><p className="text-xs text-muted">{transaction.gateway} · {transaction.accountNumberMasked}</p></TableCell><TableCell>{formatDateTime(transaction.transactionDate)}</TableCell><TableCell><TransactionDirection type={transaction.transferType} /></TableCell><TableCell><p className="max-w-xs break-words">{transaction.content || '—'}</p></TableCell><TableCell className="font-mono text-xs">{transaction.payout?.payoutCode ?? '—'}</TableCell><TableCell><Badge tone={matchBadgeTone(transaction.matchStatus)}>{matchStatusLabel(transaction.matchStatus)}</Badge></TableCell><TableCell className="text-right font-semibold">{formatMoney(transaction.transferAmount)}</TableCell><TableCell className="text-right">{canManualMatch(transaction) ? <Button variant="secondary" onClick={() => onMatch(transaction)}>Đối soát</Button> : <span className="text-sm text-muted">—</span>}</TableCell></TableRow>)}</TableBody></Table></div></>;
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><dt className="text-muted">{label}</dt><dd className={['mt-1 break-words font-semibold', mono ? 'font-mono' : ''].join(' ')}>{value}</dd></div>;
}
