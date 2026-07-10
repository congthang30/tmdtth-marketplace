export function formatMoney(value: number | string, currency = "VND") {
  const amount = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(amount)) {
    return "Không có";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return "Không có";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "Không có";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
  }).format(date);
}

export function formatStatus(value: string | null | undefined) {
  if (!value) {
    return "Không xác định";
  }

  const statusLabels: Record<string, string> = {
    Active: "Đang hoạt động",
    Approved: "Đã phê duyệt",
    Cancelled: "Đã hủy",
    Completed: "Đã hoàn tất",
    Confirmed: "Đã xác nhận",
    Created: "Đã tạo",
    Delivered: "Đã giao hàng",
    Deleted: "Đã xóa",
    Draft: "Bản nháp",
    Failed: "Thất bại",
    Inactive: "Ngừng hoạt động",
    InTransit: "Đang vận chuyển",
    Paid: "Đã thanh toán",
    Pending: "Đang chờ",
    PendingApproval: "Chờ phê duyệt",
    PendingPayment: "Chờ thanh toán",
    PendingVerification: "Chờ xác minh",
    Prepared: "Đã chuẩn bị",
    PickedUp: "Đã lấy hàng",
    Processing: "Đang xử lý",
    Published: "Đã đăng bán",
    ReadyToShip: "Sẵn sàng giao hàng",
    Refunded: "Đã hoàn tiền",
    Rejected: "Đã từ chối",
    Shipped: "Đang giao hàng",
    Shipping: "Đang giao hàng",
    Suspended: "Tạm ngưng",
    Unpaid: "Chưa thanh toán",
    WaitingForSeller: "Chờ người bán xác nhận",
  };

  if (statusLabels[value]) {
    return statusLabels[value];
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
