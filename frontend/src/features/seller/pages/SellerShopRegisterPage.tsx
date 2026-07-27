import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Home, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { VietnamAddressFields } from '@/components/commerce/VietnamAddressFields';
import { getErrorMessage } from '@/services/errors';
import { useAuthStore } from '@/stores/auth.store';
import { useToastStore } from '@/stores/toast.store';
import { sellerVerificationApi, sellerVerificationQueryKey } from '@/features/seller-verification/api';
import { SellerDocumentUpload } from '@/features/seller-verification/components/SellerDocumentUpload';
import { SellerOnboardingWizard } from '@/features/seller-verification/components/SellerOnboardingWizard';
import { SellerVerificationStatus } from '@/features/seller-verification/components/SellerVerificationStatus';
import type { BusinessType, SellerType } from '@/features/seller-verification/types';
import { sellerShopApi } from '../api';

const asciiName = /^[A-Za-z]+(?:[ A-Za-z0-9'&.-]*[A-Za-z0-9])?$/;
const shopSchema = z.object({
  shopName: z.string().trim().min(2, 'Tên cửa hàng phải có ít nhất 2 ký tự').max(120, 'Tên cửa hàng tối đa 120 ký tự').regex(asciiName, 'Chỉ dùng chữ tiếng Anh; không được chỉ dùng số hoặc ký tự đặc biệt').refine((value) => !/\b(flagship|official)\b/i.test(value), 'Tên cửa hàng không được chứa “Flagship” hoặc “Official”'),
  province: z.string().trim().min(1, 'Vui lòng chọn tỉnh/thành phố'),
  ward: z.string().trim().min(1, 'Vui lòng chọn phường/xã'),
  streetAddress: z.string().trim().min(5, 'Vui lòng nhập địa chỉ cụ thể').max(255),
});
type ShopValues = z.infer<typeof shopSchema>;

const profileSchema = z.object({
  legalName: z.string().trim().min(2, 'Vui lòng nhập họ tên hoặc tên pháp lý').max(100),
  identityNumber: z.string().trim().regex(/^\d{9,12}$/, 'Số định danh phải gồm 9 đến 12 chữ số').optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  registeredAddress: z.string().trim().min(5, 'Vui lòng nhập địa chỉ cư trú hoặc đăng ký').max(600),
  businessRegistrationNumber: z.string().trim().max(50).optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

const contactSchema = z.object({
  contactName: z.string().trim().min(2, 'Vui lòng nhập người liên hệ').max(100),
  contactEmail: z.string().trim().email('Email không hợp lệ').max(255),
  verificationCode: z.string().trim().length(6, 'Mã xác minh gồm 6 chữ số'),
  contactPhone: z.string().trim().regex(/^[0-9+()\-\s]{8,20}$/, 'Số điện thoại không hợp lệ'),
});
type ContactValues = z.infer<typeof contactSchema>;

type RegistrationKind = 'individual' | 'household' | 'company';
const kindPayload = (kind: RegistrationKind): { sellerType: SellerType; businessType?: BusinessType } => kind === 'individual' ? { sellerType: 'Individual' } : { sellerType: 'Business', businessType: kind === 'household' ? 'HouseholdBusiness' : 'Company' };

export function SellerShopRegisterPage() {
  const user = useAuthStore((state) => state.user);
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<RegistrationKind>('individual');
  const [isEmailCodeSent, setIsEmailCodeSent] = useState(false);
  const [emailChallengeId, setEmailChallengeId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [accessingId, setAccessingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const shopQuery = useQuery({ queryKey: ['seller', 'shop'], queryFn: sellerShopApi.getMyShop, retry: false });
  const verificationQuery = useQuery({ queryKey: sellerVerificationQueryKey, queryFn: sellerVerificationApi.getMine, enabled: Boolean(shopQuery.data) });
  const shopForm = useForm<ShopValues>({ resolver: zodResolver(shopSchema), defaultValues: { shopName: '', province: '', ward: '', streetAddress: '' } });
  const profileForm = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { legalName: user?.profile?.fullName ?? '', identityNumber: '', dateOfBirth: user?.profile?.dateOfBirth?.slice(0, 10) ?? '', registeredAddress: '', businessRegistrationNumber: '' } });
  const contactForm = useForm<ContactValues>({ resolver: zodResolver(contactSchema), defaultValues: { contactName: user?.profile?.fullName ?? '', contactEmail: user?.email ?? '', verificationCode: '', contactPhone: user?.phoneNumber ?? '' } });

  const createShop = useMutation({ mutationFn: sellerShopApi.createShop, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['seller', 'shop'] }); setStep(1); } });
  const saveProfile = useMutation({ mutationFn: sellerVerificationApi.createDraft, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: sellerVerificationQueryKey }); setStep(3); } });
  const upload = useMutation({
    mutationFn: async ({ documentType, file }: { documentType: import('@/features/seller-verification/types').SellerDocumentType; file: File }) => {
      const isProfileValid = await profileForm.trigger();
      if (!isProfileValid) throw new Error('Hãy hoàn tất thông tin hồ sơ trước khi tải giấy tờ.');
      await sellerVerificationApi.createDraft(payload(profileForm.getValues()));
      return sellerVerificationApi.uploadDocument(documentType, file);
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: sellerVerificationQueryKey }); },
  });
  const remove = useMutation({ mutationFn: sellerVerificationApi.deleteDocument, onMutate: setDeletingId, onSuccess: () => queryClient.invalidateQueries({ queryKey: sellerVerificationQueryKey }), onSettled: () => setDeletingId(null) });
  const access = useMutation({ mutationFn: sellerVerificationApi.accessDocument, onMutate: setAccessingId, onSuccess: ({ signedUrl }) => window.open(signedUrl, '_blank', 'noopener,noreferrer'), onSettled: () => setAccessingId(null) });
  const sendEmailCode = useMutation({
    mutationFn: sellerVerificationApi.sendEmailCode,
    onSuccess: ({ challengeId, developmentCode }) => {
      setEmailChallengeId(challengeId);
      setIsEmailCodeSent(true);
      pushToast({ tone: 'success', title: 'Đã gửi mã xác minh', description: developmentCode ? `Mã development: ${developmentCode}` : 'Hãy kiểm tra hộp thư email của bạn.' });
    },
  });
  const verifyEmailCode = useMutation({ mutationFn: ({ email, challengeId, code }: { email: string; challengeId: string; code: string }) => sellerVerificationApi.verifyEmailCode(email, challengeId, code) });
  const submit = useMutation({ mutationFn: sellerVerificationApi.submit, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: sellerVerificationQueryKey }); pushToast({ tone: 'success', title: 'Đã gửi hồ sơ đến quản trị viên', description: 'Bạn có thể theo dõi trạng thái xét duyệt tại đây.' }); } });

  const profile = verificationQuery.data?.profile;
  const documents = profile?.documents ?? [];
  const locked = profile ? ['Submitted', 'UnderReview', 'Approved', 'Suspended'].includes(profile.verificationStatus) : false;
  const payload = (values: ProfileValues, contact?: ContactValues) => ({ ...kindPayload(kind), legalName: values.legalName.trim(), identityDocumentType: kind === 'individual' || kind === 'household' ? 'CitizenId' as const : undefined, identityNumber: kind === 'company' ? undefined : values.identityNumber, dateOfBirth: kind === 'company' ? undefined : values.dateOfBirth, registeredAddress: values.registeredAddress, businessRegistrationNumber: kind === 'individual' ? undefined : values.businessRegistrationNumber, contactName: contact?.contactName, contactEmail: contact?.contactEmail, contactPhone: contact?.contactPhone, useAccountPhone: contact?.contactPhone === user?.phoneNumber });
  const requiredReady = kind === 'individual' ? ['IdentityFront', 'IdentityBack', 'FaceVerification'].every((type) => documents.some((doc) => doc.documentType === type)) : kind === 'household' ? ['BusinessRegistration', 'IdentityFront', 'IdentityBack'].every((type) => documents.some((doc) => doc.documentType === type)) : documents.some((doc) => doc.documentType === 'BusinessRegistration');

  if (locked && profile) return <div className="space-y-5"><SellerVerificationStatus profile={profile} /></div>;
  return <div className="space-y-5">
    <section className="rounded-lg border border-border bg-white p-6 shadow-panel"><p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Trở thành người bán</p><h1 className="mt-2 text-2xl font-semibold">Đăng ký cửa hàng</h1><p className="mt-2 text-sm text-muted">Hoàn thành 4 bước. Toàn bộ hồ sơ sẽ được gửi đến quản trị viên để xét duyệt.</p></section>
    <SellerOnboardingWizard currentStep={step} isBusy={createShop.isPending || saveProfile.isPending || submit.isPending} canContinue={step !== 2 || requiredReady} onBack={() => setStep((value) => Math.max(0, value - 1))} onContinue={() => {
      if (step === 0) void shopForm.handleSubmit((values) => createShop.mutate({ shopName: values.shopName, province: values.province, ward: values.ward, streetAddress: values.streetAddress }))();
      if (step === 1) setStep(2);
      if (step === 2) void profileForm.handleSubmit((values) => saveProfile.mutate(payload(values)))();
      if (step === 3) void contactForm.handleSubmit(async (contact) => {
        try {
          await sellerVerificationApi.createDraft(payload(profileForm.getValues(), contact));
          if (!emailChallengeId) { contactForm.setError('verificationCode', { message: 'Hãy gửi mã xác minh email trước.' }); return; }
          await verifyEmailCode.mutateAsync({ email: contact.contactEmail, challengeId: emailChallengeId, code: contact.verificationCode });
          submit.mutate();
        } catch (error) {
          contactForm.setError('verificationCode', { message: getErrorMessage(error) });
        }
      })();
    }}>
      {step === 0 ? <div className="space-y-5"><Alert tone="info">Có thể dùng tên tạm thời và đổi sau. Không dùng “Flagship”, “Official”; tên chỉ dùng chữ tiếng Anh, có thể kèm số nhưng không được chỉ gồm số hoặc ký tự đặc biệt.</Alert>{createShop.isError ? <Alert tone="danger">{getErrorMessage(createShop.error)}</Alert> : null}<TextInput label="Tên cửa hàng" maxLength={120} required error={shopForm.formState.errors.shopName?.message} {...shopForm.register('shopName')} /><fieldset className="space-y-4"><legend className="font-semibold">Địa chỉ cửa hàng</legend><VietnamAddressFields value={{ province: shopForm.watch('province'), ward: shopForm.watch('ward') }} onChange={(next) => { shopForm.setValue('province', next.province, { shouldValidate: true }); shopForm.setValue('ward', next.ward, { shouldValidate: true }); }} errors={{ province: shopForm.formState.errors.province?.message, ward: shopForm.formState.errors.ward?.message }} /><TextInput label="Số nhà, tên đường" required error={shopForm.formState.errors.streetAddress?.message} {...shopForm.register('streetAddress')} /></fieldset></div> : null}
      {step === 1 ? <fieldset><legend className="font-semibold">Chọn loại hình kinh doanh</legend><div className="mt-4 grid gap-3 md:grid-cols-3">{([{ value: 'individual', title: 'Cá nhân', body: 'Không đăng ký hoặc thành lập doanh nghiệp chính thức.', icon: UserRound }, { value: 'household', title: 'Hộ kinh doanh', body: 'Quy mô nhỏ, đã đăng ký dưới danh nghĩa cá nhân hoặc gia đình.', icon: Home }, { value: 'company', title: 'Doanh nghiệp', body: 'Pháp nhân kinh doanh đăng ký riêng biệt với chủ sở hữu.', icon: Building2 }] as const).map(({ value, title, body, icon: Icon }) => <label key={value} className={`cursor-pointer rounded-lg border p-4 focus-within:ring-2 focus-within:ring-primary-600 ${kind === value ? 'border-primary-600 bg-primary-50' : 'border-border'}`}><input type="radio" name="registration-kind" value={value} checked={kind === value} onChange={() => setKind(value)} /><Icon className="mt-4 text-primary-700" aria-hidden="true"/><span className="mt-3 block font-semibold">{title}</span><span className="mt-1 block text-sm text-muted">{body}</span></label>)}</div></fieldset> : null}
      {step === 2 ? <div className="space-y-6">{saveProfile.isError ? <Alert tone="danger">{getErrorMessage(saveProfile.error)}</Alert> : null}<form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => event.preventDefault()}><TextInput label={kind === 'individual' ? 'Họ tên/chủ sở hữu' : kind === 'household' ? 'Tên hộ kinh doanh (tiếng Việt không dấu)' : 'Tên công ty'} maxLength={100} required error={profileForm.formState.errors.legalName?.message} {...profileForm.register('legalName')} />{kind !== 'company' ? <><TextInput label="Số CCCD/số định danh" inputMode="numeric" maxLength={12} required error={profileForm.formState.errors.identityNumber?.message} {...profileForm.register('identityNumber')} /><TextInput label="Ngày sinh" type="date" required error={profileForm.formState.errors.dateOfBirth?.message} {...profileForm.register('dateOfBirth')} /></> : null}{kind !== 'individual' ? <TextInput label={kind === 'household' ? 'Mã số đăng ký hộ kinh doanh' : 'Mã doanh nghiệp'} required error={profileForm.formState.errors.businessRegistrationNumber?.message} {...profileForm.register('businessRegistrationNumber')} /> : null}<Textarea label={kind === 'company' ? 'Địa chỉ đăng ký doanh nghiệp' : 'Địa chỉ cư trú'} required className="md:col-span-2" error={profileForm.formState.errors.registeredAddress?.message} {...profileForm.register('registeredAddress')} /></form><SellerDocumentUpload sellerType={kind === 'individual' ? 'Individual' : 'Business'} businessType={kind === 'household' ? 'HouseholdBusiness' : kind === 'company' ? 'Company' : undefined} documents={documents} isUploading={upload.isPending} deletingId={deletingId} accessingId={accessingId} uploadError={upload.error ?? remove.error} onUpload={(documentType, file) => upload.mutate({ documentType, file })} onDelete={(id) => remove.mutate(id)} onAccess={(id) => access.mutate(id)} /></div> : null}
      {step === 3 ? <div className="space-y-5">{submit.isError || saveProfile.isError || sendEmailCode.isError || verifyEmailCode.isError ? <Alert tone="danger">{getErrorMessage(submit.error ?? saveProfile.error ?? sendEmailCode.error ?? verifyEmailCode.error)}</Alert> : null}<TextInput label="Người liên hệ" maxLength={100} required error={contactForm.formState.errors.contactName?.message} {...contactForm.register('contactName')} /><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><TextInput label="Địa chỉ email" type="email" required error={contactForm.formState.errors.contactEmail?.message} {...contactForm.register('contactEmail')} /><button type="button" disabled={sendEmailCode.isPending} className="min-h-11 self-end rounded-md border border-primary-600 px-4 font-medium text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:opacity-60" onClick={() => void contactForm.trigger('contactEmail').then((valid) => { if (valid) sendEmailCode.mutate(contactForm.getValues('contactEmail')); })}>{sendEmailCode.isPending ? 'Đang gửi...' : isEmailCodeSent ? 'Gửi lại mã' : 'Gửi mã'}</button></div><TextInput label="Mã xác minh email" inputMode="numeric" maxLength={6} required error={contactForm.formState.errors.verificationCode?.message} {...contactForm.register('verificationCode')} /><fieldset><legend className="font-semibold">Số điện thoại di động liên hệ chính</legend><label className="mt-3 flex min-h-11 items-center gap-3"><input type="radio" name="phone-source" checked={contactForm.watch('contactPhone') === (user?.phoneNumber ?? '')} onChange={() => contactForm.setValue('contactPhone', user?.phoneNumber ?? '')}/><span>Sử dụng số trên tài khoản: {user?.phoneNumber ?? 'Chưa có số điện thoại'}</span></label><label className="mt-2 flex min-h-11 items-center gap-3"><input type="radio" name="phone-source" checked={contactForm.watch('contactPhone') !== (user?.phoneNumber ?? '')} onChange={() => contactForm.setValue('contactPhone', '')}/><span>Sử dụng thông tin khác</span></label><TextInput label="Số điện thoại khác" error={contactForm.formState.errors.contactPhone?.message} {...contactForm.register('contactPhone')} /></fieldset><Alert tone="info">Sau khi gửi, quản trị viên sẽ xem thông tin cửa hàng, hồ sơ pháp lý, tài liệu và thông tin liên hệ để xét duyệt.</Alert></div> : null}
    </SellerOnboardingWizard>
  </div>;
}
