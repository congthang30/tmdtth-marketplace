---
name: vietnamese-content
description: "Viết, Việt hóa và review nội dung giao diện tiếng Việt cho TMDTTH, gồm CTA, label, validation, lỗi, empty state, toast, trạng thái, tiền tệ và ngày giờ. Áp dụng khi thêm hoặc sửa mọi chuỗi hiển thị cho người dùng."
---

# Nội dung tiếng Việt

## Mục tiêu

Tạo microcopy tiếng Việt tự nhiên, ngắn, nhất quán và hướng người dùng tới hành động tiếp theo.

## Khi nào áp dụng

- Thêm/sửa text, label, CTA, validation, error, toast, empty/loading state hoặc metadata.
- Mapping enum/error code kỹ thuật thành nhãn người dùng.

## Nguyên tắc bắt buộc

- Đọc `../../rules/content-rules.md` trước khi viết.
- Dùng tiếng Việt có dấu; CTA bắt đầu bằng động từ rõ ràng.
- Dùng thuật ngữ thống nhất: Sản phẩm, Phân loại, Gian hàng, Giỏ hàng, Thanh toán, Đơn hàng, Người bán, Quản trị viên.
- Không dịch tên riêng, thương hiệu, SKU, API, URL, JSON, email hoặc enum nội bộ khi việc dịch làm khó hiểu.
- Không đổi key, route, endpoint, enum hoặc dữ liệu do người dùng nhập.
- Lỗi phải nói rõ vấn đề và cách xử lý; không hiển thị stack trace hay thông báo HTTP thô.
- Định dạng tiền bằng `vi-VN`/VND và ngày giờ bằng `vi-VN`.

## Quy trình thực hiện

1. Xác định người đọc, ngữ cảnh và hành động mong muốn.
2. Phân loại chuỗi: hiển thị, kỹ thuật, tên riêng hoặc dữ liệu người dùng.
3. Viết bản dịch tự nhiên, giữ biến nội suy và placeholder kỹ thuật.
4. Kiểm tra consistency với `../../rules/content-rules.md`.
5. Kiểm tra độ dài trên mobile, button, table và modal.
6. Quét lại chuỗi tiếng Anh còn hiển thị.

## Checklist trước khi code

- [ ] Xác định chuỗi có thật sự hiển thị cho người dùng không.
- [ ] Xác định enum/key phải giữ nguyên và nhãn cần mapping.
- [ ] Chọn thuật ngữ đã chuẩn hóa.

## Checklist sau khi code

- [ ] Không còn giao diện nửa Anh nửa Việt ngoài thuật ngữ chủ ý.
- [ ] CTA ngắn, rõ và bắt đầu bằng động từ.
- [ ] Lỗi/empty state có bước xử lý tiếp theo.
- [ ] Biến nội suy, markup và giá trị kỹ thuật còn nguyên.
- [ ] Text dài không phá layout.

## Những lỗi phải tránh

- Dịch từng từ hoặc dùng từ máy móc.
- Dịch enum gửi API/database.
- Hiển thị trực tiếp lỗi Axios/server bằng tiếng Anh.
- Dịch tên sản phẩm hoặc nội dung do người dùng tạo.
- Viết hoa toàn bộ hoặc lạm dụng dấu chấm than.

## Ví dụ đúng

```ts
`Không thể tải đơn hàng ${orderCode}. Vui lòng thử lại.`
```

## Ví dụ sai

```ts
`Request failed with status code 500 for ${orderCode}`
```

## Tiêu chí hoàn thành

- Nội dung tự nhiên, nhất quán, có dấu và không làm thay đổi dữ liệu kỹ thuật.
- Mọi trạng thái người dùng thấy đều có nhãn tiếng Việt phù hợp.
