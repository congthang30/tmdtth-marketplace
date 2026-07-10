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
  EMAIL_EXISTS: "Địa chỉ email này đã được sử dụng.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  INTERNAL_SERVER_ERROR: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
  INVALID_ADDRESS_ID: "Mã địa chỉ không hợp lệ.",
  INVALID_CATEGORY_ID: "Mã danh mục không hợp lệ.",
  INVALID_COMPARE_AT_PRICE: "Giá so sánh phải lớn hơn hoặc bằng giá bán.",
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không chính xác.",
  INVALID_DATE_OF_BIRTH: "Ngày sinh không hợp lệ.",
  INVALID_ID: "Mã dữ liệu không hợp lệ.",
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
  PRODUCT_SLUG_EXISTS: "Đường dẫn sản phẩm đã tồn tại trong gian hàng.",
  PRODUCT_VARIANT_NOT_FOUND: "Không tìm thấy phân loại sản phẩm.",
  PRODUCT_VARIANT_SKU_EXISTS: "Mã SKU đã tồn tại trong sản phẩm này.",
  PROFILE_FULL_NAME_REQUIRED: "Vui lòng nhập họ và tên.",
  SHIPMENT_INVALID_STATUS_TRANSITION:
    "Không thể chuyển vận đơn sang trạng thái đã chọn.",
  SHIPMENT_NOT_FOUND: "Không tìm thấy vận đơn.",
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
  SHOP_ORDER_SHIPMENT_EXISTS: "Đơn hàng này đã có vận đơn.",
  SHOP_SLUG_EXISTS: "Đường dẫn gian hàng đã tồn tại.",
  SLUG_EXISTS: "Đường dẫn này đã tồn tại.",
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  UPLOAD_FILE_REQUIRED: "Vui lòng chọn tệp cần tải lên.",
  UPLOAD_INVALID_FILE_TYPE: "Định dạng tệp không được hỗ trợ.",
  USER_LOCKED: "Tài khoản đã bị khóa.",
  VALIDATION_ERROR: "Thông tin nhập vào chưa hợp lệ.",
  VOUCHER_NOT_SUPPORTED: "Mã giảm giá hiện chưa được hỗ trợ.",
};

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
        message: getApiErrorMessage(payload.error.code, status),
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
      code: "UNKNOWN_ERROR",
      message: "Đã xảy ra lỗi. Vui lòng thử lại.",
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
