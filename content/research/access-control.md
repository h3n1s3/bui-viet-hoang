---
sample: true
lang: vi
title: "Access control: kiểm thử ranh giới, không chỉ endpoint"
date: 2026-09-05
updated: 2026-09-10
tags: [Web Security, Pentest]
description: "Dùng ma trận chủ thể, hành động và đối tượng để tổ chức kiểm thử quyền truy cập."
cover: /access-matrix.svg
coverAlt: "Ma trận quyền: chủ sở hữu được đọc và sửa; người dùng khác và khách bị từ chối."
---

Một endpoint có yêu cầu đăng nhập chưa trả lời được câu hỏi: tài khoản này có quyền thực hiện hành động đó trên đối tượng này không? Ghi chép theo quan hệ quyền giúp tổ chức ca kiểm thử rõ ràng hơn.

## Mô hình quyền tối thiểu

Xem quyết định truy cập như một hàm của chủ thể, hành động, đối tượng và ngữ cảnh:

$$
A(s,a,o,c) \in \{\mathrm{allow},\mathrm{deny}\}
$$

Trong đó $s$ là tài khoản thử nghiệm, $a$ là hành động, $o$ là đối tượng và $c$ là ngữ cảnh như tổ chức hoặc tenant. Cùng một vai trò không nhất thiết có cùng quyền trên mọi đối tượng.

## Xây dựng ma trận kiểm thử

Với một ứng dụng ghi chú giả định trong lab, policy có thể quy định chỉ chủ sở hữu được đọc hoặc sửa ghi chú riêng tư.

| Chủ thể | Đọc ghi chú | Sửa ghi chú |
| --- | --- | --- |
| Chủ sở hữu | Allow | Allow |
| Tài khoản khác | Deny | Deny |
| Chưa đăng nhập | Deny | Deny |

Đây là policy của ví dụ, không phải mặc định cho mọi sản phẩm. Trước khi kiểm thử, cần đối chiếu với yêu cầu thực tế.

## Kiểm tra policy bằng unit test

Ví dụ tối giản này chạy cục bộ, không gửi yêu cầu mạng:

```python
def can_read_note(user, note):
    return user is not None and user["id"] == note["owner_id"]

note = {"id": "note-1", "owner_id": "alice"}
assert can_read_note({"id": "alice"}, note)
assert not can_read_note({"id": "bob"}, note)
assert not can_read_note(None, note)
```

Unit test giúp kiểm tra logic policy. Kiểm thử tích hợp cần xác nhận ứng dụng thật sự gọi policy tại từng đường truy cập dữ liệu.

## Đọc kết quả đúng ngữ cảnh

Không chỉ nhìn status code. Đối chiếu dữ liệu phản hồi, thay đổi trạng thái và quyền thực tế. Một phản hồi bị từ chối nhưng vẫn tạo thay đổi trong hệ thống là một kết quả cần điều tra.

Giữ ca kiểm thử hợp lệ bên cạnh ca bị từ chối. Sau bản vá, kiểm tra cả hai nhóm để phát hiện hồi quy.
