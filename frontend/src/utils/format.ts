export function formatMoney(value: number | string, currency = 'VND') {
  const amount = typeof value === 'string' ? Number(value) : value;

  if (!Number.isFinite(amount)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(date);
}

export function formatStatus(value: string | null | undefined) {
  if (!value) {
    return 'Unknown';
  }

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
