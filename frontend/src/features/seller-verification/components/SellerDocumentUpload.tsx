import { CheckCircle2, Camera, FileText, ScanFace, Trash2, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/services/errors';
import type { BusinessType, SellerDocumentType, SellerVerificationDocument, SellerType } from '../types';

const labels: Record<SellerDocumentType, string> = {
  IdentityFront: 'Mặt trước giấy tờ định danh', IdentityBack: 'Mặt sau giấy tờ định danh', Passport: 'Hộ chiếu',
  BusinessRegistration: 'Giấy đăng ký kinh doanh', LegalRepresentativeIdentity: 'Giấy tờ người đại diện',
  FaceVerification: 'Ảnh quét khuôn mặt đối chiếu giấy tờ', BankAccountProof: 'Xác nhận tài khoản ngân hàng',
};

type Props = {
  sellerType: SellerType; businessType?: BusinessType; documents: SellerVerificationDocument[]; isUploading: boolean;
  deletingId: string | null; accessingId: string | null; uploadError: unknown;
  onUpload: (type: SellerDocumentType, file: File) => void; onDelete: (id: string) => void; onAccess: (id: string) => void;
};

type UploadCardProps = {
  type: SellerDocumentType; title: string; hint: string; document?: SellerVerificationDocument; busy: boolean;
  deletingId: string | null; accessingId: string | null; onUpload: Props['onUpload']; onDelete: Props['onDelete']; onAccess: Props['onAccess'];
};

function UploadCard({ type, title, hint, document, busy, deletingId, accessingId, onUpload, onDelete, onAccess }: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!document || document.mimeType === 'application/pdf') { setPreviewUrl(null); return; }
    let active = true;
    import('../api').then(({ sellerVerificationApi }) => sellerVerificationApi.accessDocument(document.id)).then(({ signedUrl }) => { if (active) setPreviewUrl(signedUrl); }).catch(() => { if (active) setPreviewUrl(null); });
    return () => { active = false; };
  }, [document]);
  return <section className="rounded-lg border border-border bg-white p-4" aria-labelledby={`upload-${type}-title`}>
    <div className="flex items-start justify-between gap-3"><div><h3 id={`upload-${type}-title`} className="font-semibold text-ink">{title}</h3><p className="mt-1 text-sm text-muted">{hint}</p></div>{document ? <CheckCircle2 className="shrink-0 text-success" size={21} aria-label="Đã tải lên"/> : null}</div>
    {document ? <div className="mt-4 rounded-md bg-surface p-3">{previewUrl ? <img src={previewUrl} alt={`${title} đã tải lên`} className="mb-3 aspect-[4/3] w-full rounded-md border border-border bg-white object-contain"/> : null}<div className="flex min-w-0 items-center gap-2"><FileText size={18} className="shrink-0 text-primary-700"/><p className="truncate text-sm font-medium">{document.originalFileName}</p></div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={busy || accessingId === document.id} onClick={() => onAccess(document.id)}>{accessingId === document.id ? 'Đang mở...' : 'Xem ảnh gốc'}</Button><Button type="button" variant="danger" disabled={busy || deletingId === document.id} onClick={() => onDelete(document.id)}><Trash2 size={16}/>{deletingId === document.id ? 'Đang xóa...' : 'Xóa'}</Button></div></div> : <>
      <input ref={inputRef} id={`seller-file-${type}`} type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" disabled={busy} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(type, file); event.currentTarget.value = ''; }}/>
      <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="mt-4 flex min-h-32 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-4 text-center transition hover:border-primary-600 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:cursor-not-allowed disabled:opacity-60"><UploadCloud size={25} className="text-primary-700" aria-hidden="true"/><span className="mt-2 font-medium text-ink">{busy ? 'Đang tải lên...' : 'Tải lên'}</span><span className="mt-1 text-xs text-muted">JPG hoặc PNG</span></button>
    </>}
  </section>;
}

function FaceCapture({ document: faceDocument, busy, deletingId, accessingId, onUpload, onDelete, onAccess }: Omit<UploadCardProps, 'type' | 'title' | 'hint'>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraOpen(false);
  };
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      setIsCameraOpen(true);
      requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play(); } });
    } catch {
      setCameraError('Không thể mở camera. Hãy cấp quyền truy cập camera trong trình duyệt rồi thử lại.');
    }
  };
  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.translate(canvas.width, 0); context.scale(-1, 1); context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (!blob) return; onUpload('FaceVerification', new File([blob], `face-verification-${Date.now()}.jpg`, { type: 'image/jpeg' })); stopCamera(); }, 'image/jpeg', 0.92);
  };

  if (faceDocument) return <UploadCard type="FaceVerification" title="Ảnh khuôn mặt đã chụp" hint="Ảnh được chụp trực tiếp bằng camera." document={faceDocument} busy={busy} deletingId={deletingId} accessingId={accessingId} onUpload={onUpload} onDelete={onDelete} onAccess={onAccess}/>;
  return <div className="mt-4">
    {cameraError ? <Alert tone="danger" className="mb-4">{cameraError}</Alert> : null}
    {!isCameraOpen ? <Button type="button" className="min-h-11" disabled={busy || !navigator.mediaDevices?.getUserMedia} onClick={() => void startCamera()}><Camera size={18} aria-hidden="true"/>Bắt đầu quét khuôn mặt</Button> : <div className="overflow-hidden rounded-lg border border-border bg-black">
      <div className="relative aspect-video"><video ref={videoRef} autoPlay muted playsInline aria-label="Hình ảnh trực tiếp từ camera" className="size-full -scale-x-100 object-cover"/><div aria-hidden="true" className="pointer-events-none absolute inset-[12%_28%] rounded-[50%] border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,.25)]"/></div>
      <div className="flex flex-col gap-2 bg-white p-3 sm:flex-row sm:justify-center"><Button type="button" disabled={busy} onClick={capture}><Camera size={18}/>Chụp và lưu vào hồ sơ</Button><Button type="button" variant="secondary" disabled={busy} onClick={stopCamera}><X size={18}/>Hủy</Button></div>
    </div>}
    <p className="mt-3 text-sm text-muted">Giữ khuôn mặt trong khung, nhìn thẳng, đủ sáng và không che mặt. Hệ thống chỉ chấp nhận ảnh được chụp trực tiếp trong bước này.</p>
  </div>;
}

export function SellerDocumentUpload({ sellerType, businessType, documents, isUploading, deletingId, accessingId, uploadError, onUpload, onDelete, onAccess }: Props) {
  const find = (type: SellerDocumentType) => documents.find((item) => item.documentType === type);
  const cards: Array<{ type: SellerDocumentType; title: string; hint: string }> = sellerType === 'Individual' || businessType === 'HouseholdBusiness'
    ? [{ type: 'IdentityFront', title: 'Mặt trước', hint: 'Ảnh rõ nét, đủ bốn góc giấy tờ.' }, { type: 'IdentityBack', title: 'Mặt sau', hint: 'Ảnh rõ nét, không bị lóa hoặc che khuất.' }]
    : [];
  const registrations = documents.filter((item) => item.documentType === 'BusinessRegistration');
  return <div className="space-y-6">
    {uploadError ? <Alert tone="danger">{getErrorMessage(uploadError)}</Alert> : null}
    {cards.length ? <section aria-labelledby="identity-upload-title"><h2 id="identity-upload-title" className="text-lg font-semibold">Tải lên giấy tờ tùy thân</h2><p className="mt-1 text-sm text-muted">Tải riêng mặt trước và mặt sau để quản trị viên có thể đối chiếu.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{cards.map((card) => <UploadCard key={card.type} {...card} document={find(card.type)} busy={isUploading} deletingId={deletingId} accessingId={accessingId} onUpload={onUpload} onDelete={onDelete} onAccess={onAccess}/>)}</div></section> : null}
    {sellerType === 'Business' ? <section aria-labelledby="registration-upload-title"><h2 id="registration-upload-title" className="text-lg font-semibold">Giấy chứng nhận đăng ký</h2><p className="mt-1 text-sm text-muted">Tải tối đa 3 ảnh, mỗi ảnh rõ nét và đầy đủ nội dung.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{registrations.map((document, index) => <UploadCard key={document.id} type="BusinessRegistration" title={`Ảnh ${index + 1}`} hint={labels.BusinessRegistration} document={document} busy={isUploading} deletingId={deletingId} accessingId={accessingId} onUpload={onUpload} onDelete={onDelete} onAccess={onAccess}/>)}{registrations.length < 3 ? <UploadCard type="BusinessRegistration" title={`Ảnh ${registrations.length + 1}`} hint="Tải ảnh giấy chứng nhận đăng ký" busy={isUploading} deletingId={deletingId} accessingId={accessingId} onUpload={onUpload} onDelete={onDelete} onAccess={onAccess}/> : null}</div></section> : null}
    {sellerType === 'Individual' ? <section className="rounded-lg border border-border bg-surface p-5" aria-labelledby="face-title"><div className="flex gap-3"><ScanFace className="shrink-0 text-primary-700"/><div><h2 id="face-title" className="font-semibold">Quét khuôn mặt realtime</h2><p className="mt-1 text-sm text-muted">Bắt buộc mở camera và chụp trực tiếp để lưu vào hồ sơ đối chiếu.</p></div></div><FaceCapture document={find('FaceVerification')} busy={isUploading} deletingId={deletingId} accessingId={accessingId} onUpload={onUpload} onDelete={onDelete} onAccess={onAccess}/></section> : null}
  </div>;
}
