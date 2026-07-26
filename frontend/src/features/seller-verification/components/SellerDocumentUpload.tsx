import { FileText, Trash2, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { SelectInput } from '@/components/ui/SelectInput';
import { getErrorMessage } from '@/services/errors';
import type {
  SellerDocumentType,
  SellerVerificationDocument,
  SellerType,
} from '../types';

const labels: Record<SellerDocumentType, string> = {
  IdentityFront: 'Mặt trước giấy tờ định danh',
  IdentityBack: 'Mặt sau giấy tờ định danh',
  Passport: 'Hộ chiếu',
  BusinessRegistration: 'Giấy đăng ký kinh doanh',
  LegalRepresentativeIdentity: 'Giấy tờ người đại diện',
  BankAccountProof: 'Xác nhận tài khoản ngân hàng',
};

type SellerDocumentUploadProps = {
  sellerType: SellerType;
  documents: SellerVerificationDocument[];
  isUploading: boolean;
  deletingId: string | null;
  accessingId: string | null;
  uploadError: unknown;
  onUpload: (type: SellerDocumentType, file: File) => void;
  onDelete: (documentId: string) => void;
  onAccess: (documentId: string) => void;
};

export function SellerDocumentUpload({
  sellerType,
  documents,
  isUploading,
  deletingId,
  accessingId,
  uploadError,
  onUpload,
  onDelete,
  onAccess,
}: SellerDocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<SellerDocumentType>(
    sellerType === 'Individual' ? 'IdentityFront' : 'BusinessRegistration',
  );
  const [file, setFile] = useState<File | null>(null);
  const options: SellerDocumentType[] =
    sellerType === 'Individual'
      ? ['IdentityFront', 'IdentityBack', 'Passport', 'BankAccountProof']
      : ['BusinessRegistration', 'LegalRepresentativeIdentity', 'BankAccountProof'];

  const submit = () => {
    if (!file || isUploading) return;
    onUpload(documentType, file);
  };

  return (
    <div className="space-y-5">
      <Alert>
        Chỉ tải JPG, PNG hoặc PDF. Hệ thống kiểm tra cả phần mở rộng và nội dung tệp trước khi lưu riêng tư.
      </Alert>
      {uploadError ? <Alert tone="danger">{getErrorMessage(uploadError)}</Alert> : null}
      <div className="grid gap-4 rounded-lg border border-border p-4 md:grid-cols-2">
        <SelectInput
          id="seller-document-type"
          label="Loại tài liệu"
          value={documentType}
          disabled={isUploading}
          onChange={(event) => setDocumentType(event.target.value as SellerDocumentType)}
        >
          {options.map((type) => <option key={type} value={type}>{labels[type]}</option>)}
        </SelectInput>
        <label className="block" htmlFor="seller-document-file">
          <span className="text-sm font-medium text-ink">Chọn tệp</span>
          <input
            ref={inputRef}
            id="seller-document-file"
            type="file"
            accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
            disabled={isUploading}
            className="mt-1 block min-h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary-50 file:px-3 file:py-1 file:text-primary-700"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <div className="md:col-span-2">
          <Button type="button" className="min-h-11" disabled={!file || isUploading} onClick={submit}>
            <UploadCloud size={18} aria-hidden="true" />
            {isUploading ? 'Đang tải lên...' : 'Tải tài liệu lên'}
          </Button>
        </div>
      </div>

      <section aria-labelledby="uploaded-documents-title">
        <h3 id="uploaded-documents-title" className="font-semibold">Tài liệu đã tải lên</h3>
        {documents.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted">
            Chưa có tài liệu. Hãy tải giấy tờ phù hợp với loại hình đăng ký.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {documents.map((document) => (
              <li key={document.id} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <FileText size={20} className="shrink-0 text-primary-700" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{labels[document.documentType]}</p>
                    <p className="truncate text-sm text-muted">{document.originalFileName} · {Math.ceil(document.bytes / 1024)} KB</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11"
                    disabled={accessingId === document.id || isUploading}
                    onClick={() => onAccess(document.id)}
                  >
                    {accessingId === document.id ? 'Đang mở...' : 'Xem tài liệu'}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="min-h-11"
                    disabled={deletingId === document.id || isUploading}
                    onClick={() => onDelete(document.id)}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                    {deletingId === document.id ? 'Đang xóa...' : 'Xóa tài liệu'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
