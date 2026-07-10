import assert from "node:assert/strict";
import test from "node:test";
import {
  canAddVariantToCart,
  getFirstAvailableVariantId,
} from "../src/features/catalog/purchase-state.ts";

test("chọn phân loại còn hàng đầu tiên", () => {
  const variants = [
    { id: "het-hang", quantityAvailable: 0 },
    { id: "con-hang", quantityAvailable: 3 },
  ];

  assert.equal(getFirstAvailableVariantId(variants), "con-hang");
});

test("không chọn phân loại khi tất cả đều hết hàng", () => {
  const variants = [
    { id: "het-hang-1", quantityAvailable: 0 },
    { id: "het-hang-2", quantityAvailable: 0 },
  ];

  assert.equal(getFirstAvailableVariantId(variants), null);
});

test("không chọn phân loại khi danh sách trống", () => {
  assert.equal(getFirstAvailableVariantId([]), null);
});

test("chỉ cho thêm số lượng nguyên dương không vượt tồn kho", () => {
  const availableVariant = { id: "con-hang", quantityAvailable: 3 };
  const outOfStockVariant = { id: "het-hang", quantityAvailable: 0 };

  assert.equal(canAddVariantToCart(availableVariant, 1), true);
  assert.equal(canAddVariantToCart(availableVariant, 3), true);
  assert.equal(canAddVariantToCart(availableVariant, 4), false);
  assert.equal(canAddVariantToCart(availableVariant, 0), false);
  assert.equal(canAddVariantToCart(availableVariant, 1.5), false);
  assert.equal(canAddVariantToCart(outOfStockVariant, 1), false);
  assert.equal(canAddVariantToCart(null, 1), false);
});
