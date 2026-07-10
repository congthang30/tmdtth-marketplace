# Design tokens TMDTTH

> Trạng thái: **target state, chưa được triển khai đầy đủ trong Tailwind**. Đây là nguồn giá trị chuẩn duy nhất. Không dùng class như `primary-300`, `sale-*` hoặc biến CSS dưới đây trước khi Phase 1 trong [`../ui-implementation-plan.md`](../ui-implementation-plan.md) hoàn tất.

## Nguyên tắc

- Dùng semantic token trong component; chỉ dùng scale gốc khi xây theme.
- CSS variables là nguồn runtime, Tailwind chỉ ánh xạ tới variables.
- Không đổi API, enum hoặc logic nghiệp vụ để phục vụ token.
- Light theme là phạm vi hiện tại; chưa tạo dark mode khi chưa có yêu cầu sản phẩm.

## Color primitives

```css
:root {
  /* Azure — brand primary */
  --azure-50: #eef8ff;
  --azure-100: #d9efff;
  --azure-200: #b8dfff;
  --azure-300: #82c4f0;
  --azure-400: #3e99d8;
  --azure-500: #1677c7;
  --azure-600: #0f66ad;
  --azure-700: #0b528e;
  --azure-800: #104573;
  --azure-900: #123b5f;
  --azure-950: #08253d;

  /* Slate — neutral secondary */
  --slate-50: #f8fafc;
  --slate-100: #f1f5f9;
  --slate-200: #e2e8f0;
  --slate-300: #cbd5e1;
  --slate-400: #94a3b8;
  --slate-500: #64748b;
  --slate-600: #475569;
  --slate-700: #334155;
  --slate-800: #1e293b;
  --slate-900: #0f172a;
  --slate-950: #020617;

  /* Cyan — accent */
  --cyan-50: #ecfeff;
  --cyan-100: #cffafe;
  --cyan-200: #a5f3fc;
  --cyan-300: #67e8f9;
  --cyan-400: #22d3ee;
  --cyan-500: #06b6d4;
  --cyan-600: #0891b2;
  --cyan-700: #0e7490;
  --cyan-800: #155e75;
  --cyan-900: #164e63;
  --cyan-950: #083344;
}
```

## Semantic colors

```css
:root {
  --color-primary: var(--azure-600);
  --color-primary-hover: var(--azure-700);
  --color-primary-active: var(--azure-800);
  --color-primary-soft: var(--azure-50);
  --color-primary-foreground: #ffffff;

  --color-secondary: var(--slate-700);
  --color-secondary-hover: var(--slate-800);
  --color-secondary-soft: var(--slate-100);
  --color-secondary-foreground: #ffffff;

  --color-accent: var(--cyan-700);
  --color-accent-hover: var(--cyan-800);
  --color-accent-soft: var(--cyan-50);
  --color-accent-foreground: #ffffff;

  --color-background: #f6f8fb;
  --color-surface: #ffffff;
  --color-surface-elevated: #ffffff;
  --color-border: #d9dee7;
  --color-border-strong: #b8c1ce;
  --color-text-primary: #17202f;
  --color-text-secondary: #475569;
  --color-text-muted: #667085;
  --color-text-disabled: #94a3b8;
  --color-control-disabled: #e2e8f0;
  --color-focus: #0f66ad;
  --color-overlay: rgb(23 32 47 / 55%);

  --color-success: #15803d;
  --color-success-text: #166534;
  --color-success-soft: #f0fdf4;
  --color-warning: #b45309;
  --color-warning-text: #92400e;
  --color-warning-soft: #fffbeb;
  --color-error: #b91c1c;
  --color-error-text: #991b1b;
  --color-error-soft: #fef2f2;
  --color-info: #0369a1;
  --color-info-text: #075985;
  --color-info-soft: #f0f9ff;

  --color-sale: #be123c;
  --color-sale-soft: #fff1f2;
  --color-flash-sale: #be123c;
  --color-voucher: #6d28d9;
  --color-voucher-soft: #f5f3ff;
  --color-freeship: #047857;
  --color-freeship-soft: #ecfdf5;
  --color-rating: #b45309;
  --color-rating-star: #f59e0b;
  --color-official: #4338ca;
  --color-new: #0e7490;
  --color-best-seller: #92400e;
}
```

`rating-star` chỉ dành cho hình ngôi sao trang trí; chữ rating dùng `rating` để đạt tương phản. `flash-sale` chia sẻ hue với sale nhưng là tên vai trò riêng để có thể thay đổi theo campaign sau này.

## Typography tokens

```css
:root {
  --font-sans: Inter, ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --font-size-display: 2.25rem;
  --line-height-display: 2.75rem;
  --font-size-h1: 1.875rem;
  --line-height-h1: 2.375rem;
  --font-size-h2: 1.5rem;
  --line-height-h2: 2rem;
  --font-size-h3: 1.25rem;
  --line-height-h3: 1.75rem;
  --font-size-h4: 1.125rem;
  --line-height-h4: 1.625rem;
  --font-size-body-lg: 1rem;
  --line-height-body-lg: 1.5rem;
  --font-size-body-md: 0.875rem;
  --line-height-body-md: 1.375rem;
  --font-size-body-sm: 0.8125rem;
  --line-height-body-sm: 1.25rem;
  --font-size-caption: 0.75rem;
  --line-height-caption: 1.125rem;
  --font-size-price-lg: 1.75rem;
  --line-height-price-lg: 2.125rem;
  --font-size-price-md: 1.25rem;
  --line-height-price-md: 1.75rem;
  --font-size-price-sm: 1rem;
  --line-height-price-sm: 1.5rem;
}
```

## Spacing, radius, shadow và layout

```css
:root {
  --space-0: 0;
  --space-0-5: 0.125rem; /* 2px */
  --space-1: 0.25rem;
  --space-1-5: 0.375rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;

  --radius-xs: 0.25rem;
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-pill: 999px;

  --shadow-xs: 0 1px 2px rgb(18 25 38 / 8%);
  --shadow-sm: 0 2px 8px rgb(18 25 38 / 10%);
  --shadow-md: 0 8px 24px rgb(18 25 38 / 12%);
  --shadow-lg: 0 16px 40px rgb(18 25 38 / 16%);
  --shadow-focus: 0 0 0 3px rgb(15 102 173 / 25%);

  --container-max: 80rem; /* 1280px */
  --touch-target-min: 2.75rem; /* 44px */
}
```

Chi tiết áp dụng nằm ở [`colors.md`](colors.md), [`typography.md`](typography.md), [`spacing.md`](spacing.md), [`radius-shadow.md`](radius-shadow.md) và [`layouts.md`](layouts.md).

## Bridge sang Tailwind 3

Khi triển khai PLAN-102, Tailwind chỉ tham chiếu variables, không lặp hex:

```ts
extend: {
  colors: {
    background: 'var(--color-background)',
    surface: 'var(--color-surface)',
    ink: 'var(--color-text-primary)',
    muted: 'var(--color-text-muted)',
    border: 'var(--color-border)',
    primary: {
      50: 'var(--azure-50)',
      600: 'var(--azure-600)',
      700: 'var(--azure-700)',
      800: 'var(--azure-800)',
    },
    sale: 'var(--color-sale)',
    error: 'var(--color-error)',
  },
}
```

Trong migration phải ánh xạ đủ scale được code dùng, không chỉ đoạn ví dụ. Vì variables hiện lưu màu hoàn chỉnh, không mặc định dùng modifier opacity như `bg-primary-600/50`; dùng semantic overlay/soft token. Nếu sau này cần opacity utility rộng, thêm bộ channel RGB được sinh từ cùng nguồn, không đổi thủ công sang nguồn hex thứ hai.
