import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeOff, Pencil, Search, ShieldCheck, Trash2, UserRoundCheck } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { useToastStore } from '@/stores/toast.store';
import { formatDateTime, formatStatus } from '@/utils/format';
import { adminAccountsApi, type AdminAccount } from '../accounts-api';

export function AdminAccountsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<'all' | 'seller' | 'customer'>('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const query = useQuery({ queryKey: ['admin', 'users', { page, type, q }], queryFn: () => adminAccountsApi.list({ page, limit: 10, type, q: q || undefined }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  const action = useMutation({
    mutationFn: ({ account, operation }: { account: AdminAccount; operation: 'suspend' | 'activate' }) => operation === 'suspend' ? adminAccountsApi.suspend(account.id) : adminAccountsApi.activate(account.id),
    onSuccess: async (_, variables) => { await refresh(); pushToast({ tone: 'success', title: variables.operation === 'suspend' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản' }); },
  });
  const remove = useMutation({ mutationFn: (account: AdminAccount) => adminAccountsApi.delete(account.id), onSuccess: async () => { await refresh(); pushToast({ tone: 'success', title: 'Đã xóa tài khoản' }); } });
  const update = useMutation({
    mutationFn: () => adminAccountsApi.update(editing!.id, { fullName: fullName.trim(), phoneNumber: phoneNumber.trim() }),
    onSuccess: async () => { await refresh(); setEditing(null); pushToast({ tone: 'success', title: 'Đã cập nhật người dùng' }); },
  });
  const openEdit = (account: AdminAccount) => { setEditing(account); setFullName(account.fullName ?? ''); setPhoneNumber(account.phoneNumber ?? ''); };
  const items = query.data?.items ?? [];

  return <main className="space-y-5">
    <header><p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Quản trị tài khoản</p><h1 className="mt-1 text-2xl font-bold">Người bán và người dùng</h1><p className="mt-1 text-sm text-muted">Khóa, mở khóa, sửa hồ sơ cơ bản hoặc xóa mềm tài khoản. Dữ liệu giao dịch và pháp lý vẫn được giữ để đối soát.</p></header>
    <section className="grid gap-3 rounded-lg border border-border bg-white p-4 sm:grid-cols-[1fr_220px]">
      <label className="relative"><span className="sr-only">Tìm tài khoản</span><Search className="pointer-events-none absolute left-3 top-3 text-muted" size={18}/><input value={q} onChange={(event: ChangeEvent<HTMLInputElement>) => { setQ(event.target.value); setPage(1); }} className="min-h-11 w-full rounded-md border border-border bg-white pl-10 pr-3" placeholder="Tên, email hoặc số điện thoại" /></label>
      <select className="min-h-11 rounded-md border border-border bg-white px-3" value={type} onChange={(event) => { setType(event.target.value as typeof type); setPage(1); }} aria-label="Loại tài khoản"><option value="all">Tất cả tài khoản</option><option value="seller">Người bán</option><option value="customer">Khách hàng</option></select>
    </section>
    {query.isError ? <Alert tone="danger">Không thể tải danh sách tài khoản.</Alert> : null}
    <section className="overflow-hidden rounded-lg border border-border bg-white"><Table><TableHead><TableRow><TableHeaderCell>Tài khoản</TableHeaderCell><TableHeaderCell>Loại</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell>Gian hàng</TableHeaderCell><TableHeaderCell>Ngày tạo</TableHeaderCell><TableHeaderCell>Thao tác</TableHeaderCell></TableRow></TableHead><TableBody>
      {items.map((account) => <TableRow key={account.id}><TableCell><p className="font-semibold">{account.fullName || 'Chưa cập nhật tên'}</p><p className="text-sm text-muted">{account.email}</p><p className="text-sm text-muted">{account.phoneNumber || 'Chưa có số điện thoại'}</p></TableCell><TableCell><Badge>{account.isSeller ? 'Người bán' : 'Khách hàng'}</Badge></TableCell><TableCell><Badge>{formatStatus(account.userStatus)}</Badge></TableCell><TableCell>{account.shops.length ? account.shops.map((shop) => <p key={shop.id} className="text-sm">{shop.shopName} · {formatStatus(shop.shopStatus)}</p>) : '—'}</TableCell><TableCell>{formatDateTime(account.createdAt)}</TableCell><TableCell><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => openEdit(account)}><Pencil size={15}/>Sửa</Button><Button variant="secondary" disabled={action.isPending} onClick={() => action.mutate({ account, operation: account.userStatus === 'Suspended' ? 'activate' : 'suspend' })}>{account.userStatus === 'Suspended' ? <UserRoundCheck size={15}/> : <EyeOff size={15}/>} {account.userStatus === 'Suspended' ? 'Mở khóa' : 'Khóa'}</Button><Button variant="danger" disabled={remove.isPending} onClick={() => { if (window.confirm(`Xóa tài khoản ${account.email}? Đây là xóa mềm và không xóa lịch sử giao dịch.`)) remove.mutate(account); }}><Trash2 size={15}/>Xóa</Button></div></TableCell></TableRow>)}
    </TableBody></Table>{!query.isLoading && !items.length ? <div className="p-8 text-center text-muted"><ShieldCheck className="mx-auto mb-2"/>Không có tài khoản phù hợp.</div> : null}</section>
    <Pagination page={page} totalPages={query.data?.meta?.totalPages ?? 1} onPageChange={setPage}/>
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Sửa thông tin tài khoản"><form className="space-y-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); update.mutate(); }}><label className="block text-sm font-medium">Họ và tên<input className="mt-1 min-h-11 w-full rounded-md border border-border px-3" value={fullName} onChange={(event: ChangeEvent<HTMLInputElement>) => setFullName(event.target.value)} required minLength={2}/></label><label className="block text-sm font-medium">Số điện thoại<input className="mt-1 min-h-11 w-full rounded-md border border-border px-3" value={phoneNumber} onChange={(event: ChangeEvent<HTMLInputElement>) => setPhoneNumber(event.target.value)}/></label><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Hủy</Button><Button type="submit" disabled={update.isPending}>Lưu thay đổi</Button></div></form></Modal>
  </main>;
}
