import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound, Building2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { SelectInput } from "@/components/ui/SelectInput";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { useAuthStore } from "@/stores/auth.store";
import { authApi } from "@/features/auth/api";
import { sellerVerificationApi, sellerVerificationQueryKey } from "@/features/seller-verification/api";
import { SellerDocumentUpload } from "@/features/seller-verification/components/SellerDocumentUpload";
import { SellerOnboardingWizard } from "@/features/seller-verification/components/SellerOnboardingWizard";
import { SellerVerificationReview } from "@/features/seller-verification/components/SellerVerificationReview";
import { SellerVerificationStatus } from "@/features/seller-verification/components/SellerVerificationStatus";
import type { BusinessType, IdentityDocumentType, SellerType } from "@/features/seller-verification/types";
import { sellerShopApi } from "../api";

const shopSchema = z.object({
  shopName: z
    .string()
    .trim()
    .min(2, "Tên gian hàng phải có ít nhất 2 ký tự")
    .max(150, "Tên gian hàng quá dài"),
  description: z.string().trim().max(1000, "Mô tả quá dài").optional(),
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .max(255, "Email quá dài")
    .or(z.literal(""))
    .optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^[0-9+().\-\s]{7,20}$/, "Số điện thoại không hợp lệ")
    .or(z.literal(""))
    .optional(),
  province: z.string().trim().max(100, "Tên tỉnh/thành phố quá dài").optional(),
  district: z.string().trim().max(100, "Tên quận/huyện quá dài").optional(),
  ward: z.string().trim().max(100, "Tên phường/xã quá dài").optional(),
  streetAddress: z
    .string()
    .trim()
    .max(255, "Địa chỉ đường/phố quá dài")
    .optional(),
  taxCode: z.string().trim().max(50, "Mã số thuế quá dài").optional(),
});

type ShopFormValues = z.infer<typeof shopSchema>;

const legalSchema = z.object({
  businessType: z.enum(["Company", "HouseholdBusiness"]).optional(),
  legalName: z.string().trim().min(2, "Tên pháp lý phải có ít nhất 2 ký tự").max(200),
  identityDocumentType: z.enum(["CitizenId", "LegacyId", "Passport"]).optional(),
  identityNumber: z.string().trim().max(30).optional(),
  identityIssuedAt: z.string().optional(),
  identityIssuedBy: z.string().trim().max(200).optional(),
  identityExpiresAt: z.string().optional(),
  taxCode: z.string().trim().regex(/^\d{10}$/, "Mã số thuế phải gồm đúng 10 chữ số"),
  businessRegistrationNumber: z.string().trim().max(50).optional(),
  businessRegistrationIssuedAt: z.string().optional(),
  businessRegistrationIssuedBy: z.string().trim().max(200).optional(),
  legalRepresentativeName: z.string().trim().max(200).optional(),
  registeredAddress: z.string().trim().max(600).optional(),
});
type LegalFormValues = z.infer<typeof legalSchema>;

const payoutSchema = z.object({
  bankCode: z.string().trim().regex(/^[A-Z0-9_-]{2,30}$/, "Mã ngân hàng chỉ gồm chữ in hoa, số, gạch ngang hoặc gạch dưới"),
  bankName: z.string().trim().min(2, "Tên ngân hàng phải có ít nhất 2 ký tự").max(200),
  accountNumber: z.string().trim().regex(/^\d{6,20}$/, "Số tài khoản phải gồm từ 6 đến 20 chữ số"),
  accountHolderName: z.string().trim().min(2, "Tên chủ tài khoản phải có ít nhất 2 ký tự").max(200),
});
type PayoutFormValues = z.infer<typeof payoutSchema>;

const cleanOptional = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
};

export function SellerShopRegisterPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [sellerType, setSellerType] = useState<SellerType | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [accessingDocumentId, setAccessingDocumentId] = useState<string | null>(null);
  const resumedProfileId = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const shopQuery = useQuery({
    queryKey: ["seller", "shop"],
    queryFn: sellerShopApi.getMyShop,
  });
  const verificationQuery = useQuery({
    queryKey: sellerVerificationQueryKey,
    queryFn: sellerVerificationApi.getMine,
    enabled: Boolean(shopQuery.data) || currentStep >= 4,
  });
  const pushToast = useToastStore((state) => state.pushToast);
  const setUser = useAuthStore((state) => state.setUser);
  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      shopName: "",
      description: "",
      email: "",
      phoneNumber: "",
      province: "",
      district: "",
      ward: "",
      streetAddress: "",
      taxCode: "",
    },
  });

  const legalForm = useForm<LegalFormValues>({
    resolver: zodResolver(legalSchema),
    defaultValues: {
      legalName: "", taxCode: "", identityNumber: "", identityIssuedAt: "",
      identityIssuedBy: "", identityExpiresAt: "", businessRegistrationNumber: "",
      businessRegistrationIssuedAt: "", businessRegistrationIssuedBy: "",
      legalRepresentativeName: "", registeredAddress: "",
    },
  });

  const payoutForm = useForm<PayoutFormValues>({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      bankCode: "",
      bankName: "",
      accountNumber: "",
      accountHolderName: "",
    },
  });

  const mutation = useMutation({
    mutationFn: sellerShopApi.createShop,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["seller", "shop"] });
      const currentUser = await authApi.me();
      setUser(currentUser);
      pushToast({
        tone: "success",
        title: "Đã lưu thông tin gian hàng",
        description: "Tiếp tục bổ sung thông tin pháp lý để xác minh người bán.",
      });
      setCurrentStep(2);
    },
  });

  const legalMutation = useMutation({
    mutationFn: sellerVerificationApi.createDraft,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sellerVerificationQueryKey });
      pushToast({
        tone: "success",
        title: "Đã lưu thông tin pháp lý",
        description: "Tiếp tục khai báo tài khoản nhận tiền.",
      });
      setCurrentStep(3);
    },
  });

  const payoutMutation = useMutation({
    mutationFn: sellerVerificationApi.savePayout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sellerVerificationQueryKey });
      payoutForm.resetField("accountNumber");
      pushToast({
        tone: "success",
        title: "Đã lưu tài khoản nhận tiền",
        description: "Số tài khoản được mã hóa và chỉ hiển thị dạng che bớt.",
      });
      setCurrentStep(4);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ documentType, file }: { documentType: import("@/features/seller-verification/types").SellerDocumentType; file: File }) =>
      sellerVerificationApi.uploadDocument(documentType, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sellerVerificationQueryKey });
      pushToast({ tone: "success", title: "Đã tải tài liệu lên" });
    },
  });
  const deleteDocumentMutation = useMutation({
    mutationFn: sellerVerificationApi.deleteDocument,
    onMutate: (documentId) => setDeletingDocumentId(documentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sellerVerificationQueryKey });
      pushToast({ tone: "success", title: "Đã xóa tài liệu" });
    },
    onSettled: () => setDeletingDocumentId(null),
  });

  const accessDocumentMutation = useMutation({
    mutationFn: sellerVerificationApi.accessDocument,
    onMutate: (documentId) => setAccessingDocumentId(documentId),
    onSuccess: ({ signedUrl }) => {
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    },
    onError: (error) => {
      pushToast({ tone: "danger", title: "Không thể mở tài liệu", description: getErrorMessage(error) });
    },
    onSettled: () => setAccessingDocumentId(null),
  });

  const submitMutation = useMutation({
    mutationFn: sellerVerificationApi.submit,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sellerVerificationQueryKey });
      pushToast({
        tone: "success",
        title: "Đã gửi hồ sơ xét duyệt",
        description: "Bạn có thể theo dõi trạng thái hồ sơ trong trang đăng ký người bán.",
      });
    },
  });

  const documents = verificationQuery.data?.profile?.documents ?? [];
  const statusProfile = verificationQuery.data?.profile;
  const isLockedStatus = statusProfile
    ? ["Submitted", "UnderReview", "Approved", "Suspended"].includes(statusProfile.verificationStatus)
    : false;

  useEffect(() => {
    const overview = verificationQuery.data;
    if (!overview?.profile || resumedProfileId.current === overview.profile.id) return;
    const profile = overview.profile;
    resumedProfileId.current = profile.id;
    setSellerType(profile.sellerType);
    legalForm.reset({
      businessType: profile.businessType ?? undefined,
      legalName: profile.legalName,
      identityDocumentType: profile.identityDocumentType ?? undefined,
      identityNumber: "",
      identityIssuedAt: profile.identityIssuedAt?.slice(0, 10) ?? "",
      identityIssuedBy: profile.identityIssuedBy ?? "",
      identityExpiresAt: profile.identityExpiresAt?.slice(0, 10) ?? "",
      taxCode: "",
      businessRegistrationNumber: "",
      businessRegistrationIssuedAt: profile.businessRegistrationIssuedAt?.slice(0, 10) ?? "",
      businessRegistrationIssuedBy: profile.businessRegistrationIssuedBy ?? "",
      legalRepresentativeName: profile.legalRepresentativeName ?? "",
      registeredAddress: profile.registeredAddress ?? "",
    });
    if (!isLockedStatus) {
      setCurrentStep(overview.payoutAccount ? 4 : 3);
    }
  }, [isLockedStatus, legalForm, verificationQuery.data]);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Người bán
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Đăng ký gian hàng</h1>
        <p className="mt-2 text-sm text-muted">
          Gửi thông tin gian hàng để quản trị viên phê duyệt.
        </p>
      </section>

      {isLockedStatus && statusProfile ? (
        <SellerVerificationStatus profile={statusProfile} />
      ) : (
      <SellerOnboardingWizard
        currentStep={currentStep}
        isBusy={
          mutation.isPending || legalMutation.isPending || payoutMutation.isPending ||
          uploadMutation.isPending || deleteDocumentMutation.isPending ||
          accessDocumentMutation.isPending || submitMutation.isPending
        }
        canContinue={
          currentStep === 0
            ? sellerType !== null
            : currentStep >= 1 && currentStep <= 3
              ? true
              : currentStep === 4
                ? documents.length > 0
                : Boolean(verificationQuery.data?.profile && verificationQuery.data.payoutAccount)
        }
        onBack={() =>
          setCurrentStep((step) => Math.max(shopQuery.data ? 2 : 0, step - 1))
        }
        onContinue={() => {
          if (currentStep === 0 && sellerType) setCurrentStep(1);
          if (currentStep === 1) void form.handleSubmit((values) =>
            mutation.mutate({
              shopName: values.shopName.trim(),
              description: cleanOptional(values.description),
              email: cleanOptional(values.email),
              phoneNumber: cleanOptional(values.phoneNumber),
              province: cleanOptional(values.province),
              district: cleanOptional(values.district),
              ward: cleanOptional(values.ward),
              streetAddress: cleanOptional(values.streetAddress),
              taxCode: cleanOptional(values.taxCode),
            }),
          )();
          if (currentStep === 2 && sellerType) void legalForm.handleSubmit((values) =>
            legalMutation.mutate({
              sellerType,
              businessType: sellerType === "Business" ? values.businessType as BusinessType : undefined,
              legalName: values.legalName.trim(),
              identityDocumentType: sellerType === "Individual" ? values.identityDocumentType as IdentityDocumentType : undefined,
              identityNumber: sellerType === "Individual" ? cleanOptional(values.identityNumber) : undefined,
              identityIssuedAt: sellerType === "Individual" ? cleanOptional(values.identityIssuedAt) : undefined,
              identityIssuedBy: sellerType === "Individual" ? cleanOptional(values.identityIssuedBy) : undefined,
              identityExpiresAt: sellerType === "Individual" ? cleanOptional(values.identityExpiresAt) : undefined,
              taxCode: values.taxCode.trim(),
              businessRegistrationNumber: sellerType === "Business" ? cleanOptional(values.businessRegistrationNumber) : undefined,
              businessRegistrationIssuedAt: sellerType === "Business" ? cleanOptional(values.businessRegistrationIssuedAt) : undefined,
              businessRegistrationIssuedBy: sellerType === "Business" ? cleanOptional(values.businessRegistrationIssuedBy) : undefined,
              legalRepresentativeName: sellerType === "Business" ? cleanOptional(values.legalRepresentativeName) : undefined,
              registeredAddress: sellerType === "Business" ? cleanOptional(values.registeredAddress) : undefined,
            }),
          )();
          if (currentStep === 3) void payoutForm.handleSubmit((values) =>
            payoutMutation.mutate({
              bankCode: values.bankCode.trim().toUpperCase(),
              bankName: values.bankName.trim(),
              accountNumber: values.accountNumber.trim(),
              accountHolderName: values.accountHolderName.trim(),
            }),
          )();
          if (currentStep === 4 && documents.length > 0) setCurrentStep(5);
          if (currentStep === 5 && verificationQuery.data?.profile && verificationQuery.data.payoutAccount) {
            submitMutation.mutate();
          }
        }}
      >
        {currentStep === 0 ? (
          <fieldset>
            <legend className="text-base font-semibold">Bạn đăng ký bán hàng với tư cách nào?</legend>
            <p className="mt-1 text-sm text-muted">
              Lựa chọn này quyết định bộ thông tin pháp lý cần cung cấp.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {([
                ["Individual", "Cá nhân", "Dùng giấy tờ định danh và mã số thuế cá nhân.", UserRound],
                ["Business", "Doanh nghiệp hoặc hộ kinh doanh", "Dùng giấy đăng ký kinh doanh và thông tin người đại diện.", Building2],
              ] as const).map(([value, label, description, Icon]) => (
                <label
                  key={value}
                  className={[
                    "flex min-h-24 cursor-pointer gap-3 rounded-lg border p-4 focus-within:ring-2 focus-within:ring-primary-600",
                    sellerType === value ? "border-primary-600 bg-primary-50" : "border-border",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="sellerType"
                    value={value}
                    checked={sellerType === value}
                    onChange={() => setSellerType(value)}
                    className="mt-1 size-4"
                  />
                  <Icon size={22} className="shrink-0 text-primary-700" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold text-ink">{label}</span>
                    <span className="mt-1 block text-sm text-muted">{description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : currentStep === 1 ? (
          <>
            {mutation.isError ? (
              <Alert tone="danger" className="mb-5">
                {getErrorMessage(mutation.error)}
              </Alert>
            ) : null}
            <form
              id="seller-shop-information-form"
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => event.preventDefault()}
            >
              <TextInput label="Tên gian hàng" error={form.formState.errors.shopName?.message} {...form.register("shopName")} />
              <TextInput label="Email" type="email" error={form.formState.errors.email?.message} {...form.register("email")} />
              <TextInput label="Số điện thoại" error={form.formState.errors.phoneNumber?.message} {...form.register("phoneNumber")} />
              <TextInput label="Mã số thuế công khai (nếu có)" error={form.formState.errors.taxCode?.message} {...form.register("taxCode")} />
              <TextInput label="Tỉnh/Thành phố" error={form.formState.errors.province?.message} {...form.register("province")} />
              <TextInput label="Quận/Huyện" error={form.formState.errors.district?.message} {...form.register("district")} />
              <TextInput label="Phường/Xã" error={form.formState.errors.ward?.message} {...form.register("ward")} />
              <TextInput label="Địa chỉ đường/phố" error={form.formState.errors.streetAddress?.message} {...form.register("streetAddress")} />
              <Textarea label="Mô tả" rows={4} className="md:col-span-2" error={form.formState.errors.description?.message} {...form.register("description")} />
            </form>
          </>
        ) : currentStep === 2 ? (
          <>
            {legalMutation.isError ? (
              <Alert tone="danger" className="mb-5">{getErrorMessage(legalMutation.error)}</Alert>
            ) : null}
            {verificationQuery.data?.profile ? (
              <Alert className="mb-5">
                Vì lý do bảo mật, mã số thuế, số giấy tờ và số đăng ký kinh doanh không được điền lại từ dữ liệu đã che. Hãy nhập lại các giá trị này khi lưu thay đổi.
              </Alert>
            ) : null}
            <form id="seller-legal-information-form" className="grid gap-4 md:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
              {sellerType === "Business" ? (
                <SelectInput label="Loại hình kinh doanh" error={legalForm.formState.errors.businessType?.message} {...legalForm.register("businessType")}>
                  <option value="">Chọn loại hình</option>
                  <option value="Company">Doanh nghiệp</option>
                  <option value="HouseholdBusiness">Hộ kinh doanh</option>
                </SelectInput>
              ) : null}
              <TextInput label={sellerType === "Individual" ? "Họ và tên theo giấy tờ" : "Tên pháp lý"} error={legalForm.formState.errors.legalName?.message} {...legalForm.register("legalName")} />
              <TextInput label="Mã số thuế" inputMode="numeric" error={legalForm.formState.errors.taxCode?.message} {...legalForm.register("taxCode")} />
              {sellerType === "Individual" ? (
                <>
                  <SelectInput label="Loại giấy tờ định danh" error={legalForm.formState.errors.identityDocumentType?.message} {...legalForm.register("identityDocumentType")}>
                    <option value="">Chọn loại giấy tờ</option>
                    <option value="CitizenId">Căn cước công dân</option>
                    <option value="LegacyId">Chứng minh nhân dân</option>
                    <option value="Passport">Hộ chiếu</option>
                  </SelectInput>
                  <TextInput label="Số giấy tờ định danh" error={legalForm.formState.errors.identityNumber?.message} {...legalForm.register("identityNumber")} />
                  <TextInput label="Ngày cấp" type="date" error={legalForm.formState.errors.identityIssuedAt?.message} {...legalForm.register("identityIssuedAt")} />
                  <TextInput label="Nơi cấp" error={legalForm.formState.errors.identityIssuedBy?.message} {...legalForm.register("identityIssuedBy")} />
                  <TextInput label="Ngày hết hạn (nếu có)" type="date" error={legalForm.formState.errors.identityExpiresAt?.message} {...legalForm.register("identityExpiresAt")} />
                </>
              ) : (
                <>
                  <TextInput label="Số đăng ký kinh doanh" error={legalForm.formState.errors.businessRegistrationNumber?.message} {...legalForm.register("businessRegistrationNumber")} />
                  <TextInput label="Ngày cấp đăng ký" type="date" error={legalForm.formState.errors.businessRegistrationIssuedAt?.message} {...legalForm.register("businessRegistrationIssuedAt")} />
                  <TextInput label="Nơi cấp đăng ký" error={legalForm.formState.errors.businessRegistrationIssuedBy?.message} {...legalForm.register("businessRegistrationIssuedBy")} />
                  <TextInput label="Người đại diện theo pháp luật" error={legalForm.formState.errors.legalRepresentativeName?.message} {...legalForm.register("legalRepresentativeName")} />
                  <Textarea label="Địa chỉ đăng ký" className="md:col-span-2" error={legalForm.formState.errors.registeredAddress?.message} {...legalForm.register("registeredAddress")} />
                </>
              )}
            </form>
          </>
        ) : currentStep === 3 ? (
          <>
            {payoutMutation.isError ? (
              <Alert tone="danger" className="mb-5">{getErrorMessage(payoutMutation.error)}</Alert>
            ) : null}
            <Alert tone="info" className="mb-5">
              Tài khoản phải thuộc người đăng ký hoặc pháp nhân. Số tài khoản được mã hóa khi lưu.
            </Alert>
            <form id="seller-payout-account-form" className="grid gap-4 md:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
              <TextInput
                label="Mã ngân hàng"
                autoCapitalize="characters"
                placeholder="Ví dụ: VCB"
                error={payoutForm.formState.errors.bankCode?.message}
                {...payoutForm.register("bankCode", { setValueAs: (value: string) => value.toUpperCase() })}
              />
              <TextInput label="Tên ngân hàng" autoComplete="organization" error={payoutForm.formState.errors.bankName?.message} {...payoutForm.register("bankName")} />
              <TextInput label="Số tài khoản" inputMode="numeric" autoComplete="off" error={payoutForm.formState.errors.accountNumber?.message} {...payoutForm.register("accountNumber")} />
              <TextInput label="Tên chủ tài khoản" autoComplete="name" error={payoutForm.formState.errors.accountHolderName?.message} {...payoutForm.register("accountHolderName")} />
            </form>
          </>
        ) : currentStep === 4 ? (
          verificationQuery.isPending ? (
            <p role="status" className="text-sm text-muted">Đang tải danh sách tài liệu...</p>
          ) : verificationQuery.isError ? (
            <Alert tone="danger">
              {getErrorMessage(verificationQuery.error)}
              <button type="button" className="ml-2 underline" onClick={() => void verificationQuery.refetch()}>Thử lại</button>
            </Alert>
          ) : sellerType ? (
            <SellerDocumentUpload
              sellerType={sellerType}
              documents={documents}
              isUploading={uploadMutation.isPending}
              deletingId={deletingDocumentId}
              accessingId={accessingDocumentId}
              uploadError={uploadMutation.error ?? deleteDocumentMutation.error}
              onUpload={(documentType, file) => uploadMutation.mutate({ documentType, file })}
              onDelete={(documentId) => deleteDocumentMutation.mutate(documentId)}
              onAccess={(documentId) => accessDocumentMutation.mutate(documentId)}
            />
          ) : (
            <Alert tone="danger">Không xác định được loại hình người bán. Hãy quay lại bước đầu.</Alert>
          )
        ) : verificationQuery.isPending ? (
          <p role="status" className="text-sm text-muted">Đang tải thông tin rà soát...</p>
        ) : verificationQuery.isError ? (
          <Alert tone="danger">{getErrorMessage(verificationQuery.error)}</Alert>
        ) : verificationQuery.data ? (
          <>
            {submitMutation.isError ? <Alert tone="danger" className="mb-5">{getErrorMessage(submitMutation.error)}</Alert> : null}
            {verificationQuery.data.profile?.verificationStatus === "Submitted" ? (
              <Alert>Hồ sơ đã được gửi và đang chờ quản trị viên tiếp nhận.</Alert>
            ) : (
              <SellerVerificationReview overview={verificationQuery.data} />
            )}
          </>
        ) : (
          <Alert tone="danger">Không thể tải thông tin hồ sơ để rà soát.</Alert>
        )}
      </SellerOnboardingWizard>
      )}
    </div>
  );
}
