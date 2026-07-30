import axios from "axios";
import type { ApiErrorPayload } from "@/types/api";

const apiErrorMessages: Record<string, string> = {
  ADDRESS_NOT_FOUND: "Không tìm thấy địa chỉ.",
  CART_ITEM_NOT_FOUND: "Không tìm thấy sản phẩm trong giỏ hàng.",
  CATEGORY_NOT_FOUND: "Không tìm thấy danh mục.",
  CATEGORY_PARENT_CYCLE: "Không thể chọn danh mục con làm danh mục cha.",
  CHECKOUT_CART_EMPTY: "Giỏ hàng chưa có sản phẩm để thanh toán.",
  CHECKOUT_ITEM_UNAVAILABLE: "Một hoặc nhiều sản phẩm không còn khả dụng.",
  CHECKOUT_SHIPPING_SELECTION_DUPLICATED:
    "Mỗi gian hàng chỉ được chọn một dịch vụ vận chuyển.",
  CHECKOUT_SHIPPING_SELECTION_INVALID:
    "Lựa chọn dịch vụ vận chuyển không hợp lệ.",
  CHECKOUT_SHIPPING_SELECTION_REQUIRED:
    "Vui lòng chọn dịch vụ vận chuyển cho từng gian hàng.",
  CARRIER_ORDER_CREATE_FAILED:
    "GHN chưa tiếp nhận vận đơn. Vui lòng kiểm tra cấu hình giao hàng rồi thử lại.",
  CARRIER_QUOTE_FAILED:
    "Không thể tính phí vận chuyển cho địa chỉ này. Vui lòng kiểm tra lại tỉnh, phường/xã và địa chỉ chi tiết.",
  CARRIER_STATUS_SYNC_FAILED:
    "Không thể lấy trạng thái mới nhất từ GHN. Vui lòng thử đồng bộ lại sau.",
  DUPLICATE_OPTION_GROUP: "Tên nhóm phân loại không được trùng nhau.",
  DUPLICATE_OPTION_VALUE: "Giá trị trong cùng một nhóm phân loại không được trùng nhau.",
  DUPLICATE_VARIANT_OPTIONS: "Tổ hợp phân loại này đã tồn tại. Vui lòng chọn tổ hợp khác.",
  EMAIL_EXISTS: "Địa chỉ email này đã được sử dụng.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  INTERNAL_SERVER_ERROR: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
  INVALID_ADDRESS_ID: "Mã địa chỉ không hợp lệ.",
  INVALID_CATEGORY_ID: "Mã danh mục không hợp lệ.",
  INVALID_COMPARE_AT_PRICE: "Giá so sánh phải lớn hơn hoặc bằng giá bán.",
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không chính xác.",
  INVALID_DATE_OF_BIRTH: "Ngày sinh không hợp lệ.",
  INVALID_ID: "Mã dữ liệu không hợp lệ.",
  INCOMPLETE_VARIANT_OPTIONS: "Vui lòng chọn một giá trị cho mỗi nhóm phân loại.",
  INVALID_INVENTORY_QUANTITY: "Số lượng tồn kho không hợp lệ.",
  INVALID_MONEY: "Giá trị tiền không hợp lệ.",
  INVALID_ORDER_ID: "Mã đơn hàng không hợp lệ.",
  INVALID_ORDER_ITEM_ID: "Mã sản phẩm trong đơn hàng không hợp lệ.",
  INVALID_PAYMENT_ID: "Mã thanh toán không hợp lệ.",
  INVALID_PRICE: "Giá bán phải lớn hơn 0.",
  INVALID_PRICE_RANGE: "Khoảng giá không hợp lệ.",
  INVALID_PRODUCT_NAME: "Tên sản phẩm không hợp lệ.",
  INVALID_SHIPMENT_ID: "Mã vận đơn không hợp lệ.",
  INVALID_SHIPPING_COMPANY_ID: "Mã đơn vị vận chuyển không hợp lệ.",
  INVALID_SHIPPING_QUOTE_ID: "Mã báo giá vận chuyển không hợp lệ.",
  INVALID_SHIPPING_SERVICE_ID: "Mã dịch vụ vận chuyển không hợp lệ.",
  INVALID_SHOP_ID: "Mã gian hàng không hợp lệ.",
  INVALID_SHOP_NAME: "Tên gian hàng không hợp lệ.",
  INVALID_SHOP_ORDER_ID: "Mã đơn hàng của gian hàng không hợp lệ.",
  INVALID_VARIANT_OPTION_JSON: "Thông tin tùy chọn phân loại không hợp lệ.",
  INVALID_VARIANT_OPTION_VALUE: "Giá trị phân loại không thuộc sản phẩm này. Vui lòng tải lại trang.",
  INVENTORY_NOT_FOUND: "Không tìm thấy thông tin tồn kho.",
  INVENTORY_RESERVATION_INVALID: "Số lượng hàng đã giữ không hợp lệ.",
  ORDER_CANNOT_BE_CANCELLED: "Đơn hàng này không thể hủy.",
  ORDER_ITEM_NOT_FOUND: "Không tìm thấy sản phẩm trong đơn hàng.",
  ORDER_ITEM_NOT_REVIEWABLE: "Sản phẩm này chưa đủ điều kiện để đánh giá.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  ORDER_PAYMENT_ALREADY_PROCESSED: "Thanh toán của đơn hàng đã được xử lý.",
  OUT_OF_STOCK: "Sản phẩm không đủ số lượng tồn kho.",
  PAYMENT_METHOD_NOT_FAKE_ONLINE:
    "Phương thức thanh toán này không hỗ trợ xác nhận giả lập.",
  PAYMENT_METHOD_NOT_FOUND: "Không tìm thấy phương thức thanh toán.",
  PAYMENT_NOT_FOUND: "Không tìm thấy giao dịch thanh toán.",
  PAYMENT_NOT_PENDING: "Giao dịch này không còn ở trạng thái chờ thanh toán.",
  PRODUCT_IMAGE_NOT_FOUND: "Không tìm thấy hình ảnh sản phẩm.",
  PRODUCT_NOT_FOUND: "Không tìm thấy sản phẩm.",
  PRODUCT_REVIEW_ALREADY_EXISTS: "Bạn đã đánh giá sản phẩm này.",
  PRODUCT_OPTIONS_IN_USE: "Không thể thêm, xóa hoặc đổi tên nhóm đã dùng. Bạn chỉ có thể thêm giá trị mới.",
  PRODUCT_SLUG_EXISTS: "Đường dẫn sản phẩm đã tồn tại trong gian hàng.",
  PRODUCT_VARIANT_NOT_FOUND: "Không tìm thấy phân loại sản phẩm.",
  PRODUCT_VARIANT_SKU_EXISTS: "Mã SKU đã tồn tại trong sản phẩm này.",
  SELLER_LEGAL_DATA_ALREADY_USED:
    "Số CCCD, mã số thuế hoặc mã đăng ký kinh doanh này đã được dùng cho một hồ sơ khác. Vui lòng kiểm tra lại hoặc liên hệ bộ phận hỗ trợ.",
  SELLER_CONTACT_VERIFICATION_REQUIRED:
    "Chưa thể gửi hồ sơ. Vui lòng xác minh email và nhập số điện thoại liên hệ.",
  SELLER_DOCUMENT_CONTENT_INVALID:
    "Nội dung tệp không đúng định dạng ảnh. Vui lòng chọn một tệp JPG hoặc PNG hợp lệ.",
  SELLER_DOCUMENT_DUPLICATE:
    "Ảnh này đã được tải lên. Vui lòng chọn ảnh khác hoặc giữ ảnh hiện có.",
  SELLER_DOCUMENT_EMPTY:
    "Tệp đã chọn không có nội dung. Vui lòng chọn lại ảnh giấy tờ.",
  SELLER_DOCUMENT_EXTENSION_INVALID:
    "Đuôi tệp không khớp với định dạng ảnh. Vui lòng chọn tệp JPG hoặc PNG hợp lệ.",
  SELLER_DOCUMENT_ID_INVALID: "Mã tài liệu không hợp lệ. Vui lòng tải lại trang.",
  SELLER_DOCUMENT_ISSUED_IN_FUTURE:
    "Ngày cấp giấy tờ không được sau ngày hiện tại. Vui lòng kiểm tra lại ngày cấp.",
  SELLER_DOCUMENT_LIMIT_REACHED:
    "Đã đủ 3 ảnh giấy chứng nhận đăng ký. Hãy xóa một ảnh trước khi tải ảnh khác.",
  SELLER_DOCUMENT_MIME_INVALID:
    "Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh JPG hoặc PNG.",
  SELLER_DOCUMENT_NOT_FOUND:
    "Không tìm thấy tài liệu này. Tài liệu có thể đã bị xóa; vui lòng tải lại trang.",
  SELLER_DOCUMENT_REQUIRED: "Vui lòng chọn ảnh giấy tờ cần tải lên.",
  SELLER_DOCUMENT_TOO_LARGE:
    "Ảnh vượt quá dung lượng cho phép. Vui lòng giảm dung lượng hoặc chọn ảnh khác.",
  SELLER_DOCUMENT_EXPIRY_INVALID:
    "Ngày hết hạn phải sau ngày cấp giấy tờ. Vui lòng kiểm tra lại hai ngày.",
  SELLER_DOCUMENTS_REQUIRED: "Hồ sơ còn thiếu tài liệu bắt buộc.",
  SELLER_VERIFICATION_ID_INVALID: "Mã hồ sơ xác minh không hợp lệ.",
  SELLER_VERIFICATION_NOT_FOUND: "Không tìm thấy hồ sơ xác minh người bán.",
  SELLER_VERIFICATION_NOT_SUBMITTABLE:
    "Hồ sơ hiện không thể gửi xét duyệt. Vui lòng tải lại trang để kiểm tra trạng thái mới nhất.",
  SELLER_VERIFICATION_TRANSITION_INVALID:
    "Không thể đổi hồ sơ sang trạng thái này từ trạng thái hiện tại.",
  SELLER_MINIMUM_AGE_REQUIRED: "Người đăng ký phải đủ 18 tuổi. Vui lòng kiểm tra lại ngày sinh.",
  SELLER_VERIFICATION_NOT_EDITABLE:
    "Hồ sơ đã được gửi xét duyệt nên hiện không thể chỉnh sửa.",
  EMAIL_VERIFICATION_CODE_INVALID:
    "Mã xác minh email không đúng hoặc đã hết hạn. Vui lòng kiểm tra mã hoặc gửi mã mới.",
  PROFILE_FULL_NAME_REQUIRED: "Vui lòng nhập họ và tên.",
  PICKUP_STATION_INVALID:
    "Bưu cục GHN đã chọn không còn khả dụng. Vui lòng tải lại danh sách và chọn bưu cục khác.",
  PICKUP_STATION_REQUIRED: "Vui lòng chọn bưu cục GHN để gửi hàng.",
  SHIPMENT_INVALID_STATUS_TRANSITION:
    "Trạng thái mới từ GHN không phù hợp với hành trình hiện tại. Vui lòng tải lại sau.",
  SHIPMENT_LABEL_CREATE_FAILED:
    "Không thể tạo nhãn GHN. Vui lòng thử lại.",
  SHIPMENT_LABEL_NOT_READY:
    "GHN chưa cấp mã vận đơn nên chưa thể in nhãn.",
  SHIPMENT_NOT_FOUND: "Không tìm thấy vận đơn.",
  SHIPMENT_RETRY_REQUIRED:
    "Vận đơn trước đó chưa được GHN tiếp nhận. Vui lòng dùng nút Thử đăng ký lại.",
  SHIPMENT_SYNC_NOT_RETRIABLE:
    "Vận đơn này chưa thể đồng bộ. Vui lòng tải lại trang.",
  SHIPPING_COMPANY_NOT_APPROVED: "Đơn vị vận chuyển chưa được phê duyệt.",
  SHIPPING_COMPANY_NOT_FOUND: "Không tìm thấy đơn vị vận chuyển.",
  SHIPPING_COMPANY_SLUG_EXISTS: "Đường dẫn đơn vị vận chuyển đã tồn tại.",
  SHIPPING_QUOTE_ADDRESS_MISMATCH:
    "Địa chỉ giao hàng không khớp với báo giá vận chuyển.",
  SHIPPING_QUOTE_EXPIRED: "Báo giá vận chuyển đã hết hạn.",
  SHIPPING_QUOTE_MISMATCH: "Báo giá vận chuyển không khớp với đơn hàng.",
  SHIPPING_QUOTE_NOT_FOUND: "Không tìm thấy báo giá vận chuyển.",
  SHIPPING_SERVICE_CODE_EXISTS: "Mã dịch vụ vận chuyển đã tồn tại.",
  SHIPPING_SERVICE_INVALID_ESTIMATE:
    "Thời gian giao hàng dự kiến không hợp lệ.",
  SHIPPING_SERVICE_NOT_ACTIVE: "Dịch vụ vận chuyển đang ngừng hoạt động.",
  SHIPPING_SERVICE_NOT_FOUND: "Không tìm thấy dịch vụ vận chuyển.",
  SHIPPING_SERVICE_UNAVAILABLE: "Dịch vụ vận chuyển hiện không khả dụng.",
  SHOP_NOT_APPROVED: "Gian hàng chưa được phê duyệt.",
  SHOP_NOT_FOUND: "Không tìm thấy gian hàng.",
  SHOP_NOT_PENDING_APPROVAL: "Gian hàng không ở trạng thái chờ phê duyệt.",
  SHOP_ORDER_HAS_NO_ITEMS: "Đơn hàng của gian hàng không có sản phẩm.",
  SHOP_ORDER_INVALID_STATUS:
    "Trạng thái đơn hàng không phù hợp với thao tác này.",
  SHOP_ORDER_NOT_FOUND: "Không tìm thấy đơn hàng của gian hàng.",
  SHOP_ORDER_SHIPPING_SELECTION_MISSING:
    "Đơn hàng chưa có lựa chọn vận chuyển của khách. Vui lòng liên hệ bộ phận hỗ trợ.",
  SHOP_ORDER_SHIPPING_SELECTION_MISMATCH:
    "Vận đơn phải dùng đúng dịch vụ vận chuyển khách đã chọn.",
  SHOP_ORDER_SHIPMENT_EXISTS: "Đơn hàng này đã có vận đơn.",
  SHOP_SLUG_EXISTS: "Đường dẫn gian hàng đã tồn tại.",
  SLUG_EXISTS: "Đường dẫn này đã tồn tại.",
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  UPLOAD_FILE_REQUIRED: "Vui lòng chọn tệp cần tải lên.",
  UPLOAD_INVALID_FILE_TYPE: "Định dạng tệp không được hỗ trợ.",
  USER_LOCKED: "Tài khoản đã bị khóa.",
  VALIDATION_ERROR: "Thông tin nhập vào chưa hợp lệ.",
  VOUCHER_ALREADY_USED: "Bạn đã sử dụng mã giảm giá này rồi.",
  VOUCHER_CODE_EXISTS: "Mã giảm giá đã tồn tại.",
  VOUCHER_DUPLICATE_SHOP_SELECTION:
    "Mỗi gian hàng chỉ được áp dụng một mã giảm giá.",
  VOUCHER_INACTIVE: "Mã giảm giá không còn hoạt động.",
  VOUCHER_INVALID_DISCOUNT_VALUE: "Giá trị giảm giá không hợp lệ.",
  VOUCHER_INVALID_MAX_DISCOUNT:
    "Giảm tối đa chỉ áp dụng cho mã giảm theo phần trăm.",
  VOUCHER_INVALID_WINDOW: "Thời gian kết thúc phải sau thời gian bắt đầu.",
  VOUCHER_LIMIT_REACHED: "Mã giảm giá đã hết lượt sử dụng.",
  VOUCHER_MIN_ORDER_NOT_MET:
    "Đơn hàng chưa đạt giá trị tối thiểu để dùng mã này.",
  VOUCHER_NOT_FOUND: "Không tìm thấy mã giảm giá.",
  VOUCHER_NOT_SUPPORTED: "Mã giảm giá hiện chưa được hỗ trợ.",
  VOUCHER_NO_LONGER_AVAILABLE: "Mã giảm giá đã hết lượt sử dụng.",
  VOUCHER_SHOP_MISMATCH: "Mã giảm giá này không áp dụng cho gian hàng này.",
};

const documentNames: Record<string, string> = {
  BusinessRegistration: "giấy chứng nhận đăng ký",
  IdentityFront: "mặt trước giấy tờ tùy thân",
  IdentityBack: "mặt sau giấy tờ tùy thân",
  FaceVerification: "ảnh khuôn mặt",
  LegalRepresentativeIdentity: "giấy tờ người đại diện pháp luật",
  Passport: "hộ chiếu",
};

const fieldNames: Record<string, string> = {
  shopName: "tên cửa hàng",
  legalName: "họ tên hoặc tên pháp lý",
  identityNumber: "số CCCD/số định danh",
  dateOfBirth: "ngày sinh",
  registeredAddress: "địa chỉ cư trú hoặc đăng ký",
  businessRegistrationNumber: "mã số đăng ký kinh doanh",
  legalRepresentativeName: "người đại diện pháp luật",
  contactName: "người liên hệ",
  contactEmail: "địa chỉ email",
  contactPhone: "số điện thoại",
  code: "mã xác minh email",
};

type ErrorDetail = { field?: unknown; documentType?: unknown; message?: unknown };

function detailObjects(details: unknown[]): ErrorDetail[] {
  return details.filter((detail): detail is ErrorDetail => typeof detail === "object" && detail !== null);
}

function getDetailedApiErrorMessage(code: string, details: unknown[], status?: number) {
  const parsedDetails = detailObjects(details);
  if (code === "PRODUCT_NOT_READY_FOR_REVIEW") {
    const missing = parsedDetails
      .map((detail) =>
        "label" in detail && typeof detail.label === "string"
          ? detail.label
          : undefined,
      )
      .filter((label): label is string => Boolean(label));
    if (missing.length) {
      return `Sản phẩm chưa đủ điều kiện gửi phê duyệt: ${missing.join(", ")}. Vui lòng bổ sung rồi thử lại.`;
    }
  }
  if (code === "SELLER_DOCUMENTS_REQUIRED") {
    const missing = parsedDetails
      .map((detail) => typeof detail.documentType === "string" ? documentNames[detail.documentType] : undefined)
      .filter((name): name is string => Boolean(name));
    if (missing.length) return `Hồ sơ còn thiếu ${missing.join(", ")}. Vui lòng tải đủ trước khi gửi xét duyệt.`;
  }
  if (code === "VALIDATION_ERROR") {
    const fields = parsedDetails
      .map((detail) => typeof detail.field === "string" ? fieldNames[detail.field] : undefined)
      .filter((name): name is string => Boolean(name));
    if (fields.length) return `Thông tin ${[...new Set(fields)].join(", ")} chưa hợp lệ. Vui lòng kiểm tra lại.`;
  }
  return getApiErrorMessage(code, status);
}

function getApiErrorMessage(code: string, status?: number) {
  if (apiErrorMessages[code]) {
    return apiErrorMessages[code];
  }

  if (status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }

  if (status === 404) {
    return "Không tìm thấy dữ liệu yêu cầu.";
  }

  return "Không thể hoàn tất yêu cầu. Vui lòng thử lại.";
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details: unknown[];

  constructor(params: {
    code: string;
    message: string;
    status?: number;
    details?: unknown[];
  }) {
    super(params.message);
    this.name = "ApiClientError";
    this.code = params.code;
    this.status = params.status;
    this.details = params.details ?? [];
  }
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as { success: unknown }).success === false &&
    "error" in value
  );
}

export function normalizeApiError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const payload = error.response?.data;

    if (isApiErrorPayload(payload)) {
      return new ApiClientError({
        code: payload.error.code,
        message: getDetailedApiErrorMessage(payload.error.code, payload.error.details ?? [], status),
        status,
        details: payload.error.details,
      });
    }

    return new ApiClientError({
      code: status ? `HTTP_${status}` : "NETWORK_ERROR",
      message:
        status === undefined
          ? "Không thể kết nối đến hệ thống. Vui lòng kiểm tra kết nối và thử lại."
          : getApiErrorMessage(
              status ? `HTTP_${status}` : "NETWORK_ERROR",
              status,
            ),
      status,
    });
  }

  if (error instanceof Error) {
    return new ApiClientError({
      code: "CLIENT_ERROR",
      message: error.message || "Không thể hoàn tất thao tác. Vui lòng thử lại.",
    });
  }

  return new ApiClientError({
    code: "UNKNOWN_ERROR",
    message: "Đã xảy ra lỗi. Vui lòng thử lại.",
  });
}

export function getErrorMessage(error: unknown) {
  return normalizeApiError(error).message;
}
