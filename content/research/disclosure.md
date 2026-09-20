---
sample: true
lang: vi
title: "From finding to disclosure: ghi chép một lỗ hổng"
date: 2026-09-08
updated: 2026-09-11
tags: [Vulnerability Research, Disclosure]
description: "Một cấu trúc báo cáo tập trung vào bằng chứng, nguyên nhân và khả năng tái kiểm chứng."
---

Một báo cáo hữu ích giúp người khác hiểu điều gì đã xảy ra, vì sao nó xảy ra và làm thế nào để xác nhận bản sửa. Ghi chép ngay trong quá trình nghiên cứu giúp tránh mất những chi tiết tưởng nhỏ nhưng quyết định khả năng tái lập.

## Bắt đầu từ quan sát

Tách điều đã quan sát khỏi giả thuyết. “Tài khoản thử nghiệm A đọc được đối tượng của B” là một quan sát. “Mọi người dùng đều bị ảnh hưởng” cần thêm bằng chứng.

Lưu phiên bản phần mềm, cấu hình liên quan, điều kiện ban đầu và thời điểm kiểm thử. Dùng tài khoản và dữ liệu thử nghiệm trong phạm vi được phép.

## Một báo cáo có thể tái kiểm chứng

| Phần | Nội dung cần có |
| --- | --- |
| Summary | Hành vi sai và điều kiện kích hoạt |
| Environment | Phiên bản, cấu hình, vai trò tài khoản |
| Reproduction | Bước tối thiểu và kết quả quan sát |
| Impact | Tác động đã kiểm chứng và giới hạn |
| Remediation | Vị trí cần kiểm soát và hướng khắc phục |

Ví dụ cấu trúc dữ liệu cho ghi chép nội bộ:

```yaml
finding:
  title: "Unexpected cross-account access"
  environment: "local test environment"
  status: "triage"
  evidence:
    - "sanitized-request.txt"
    - "expected-vs-actual.md"
  affected_version: "to be verified"
```

## Giữ timeline rõ ràng

Ghi ngày gửi báo cáo, ngày nhận phản hồi, các phiên bản bản vá đã kiểm thử và ngày công bố đã thống nhất. Chỉ gắn mã CVE khi có mã được xác nhận; không dùng một mã giả để làm đầy hồ sơ.

> Phân biệt phát hiện ban đầu, kết luận đã được xác minh và phần chưa biết. Báo cáo chính xác cả giới hạn của nghiên cứu.

## Kiểm tra bản sửa

Chạy lại ca kiểm thử ban đầu và bổ sung ca hợp lệ để chắc rằng chức năng bình thường vẫn hoạt động. Lưu kết quả cùng phiên bản đã kiểm tra. Khi viết bài công khai, loại bỏ token, dữ liệu cá nhân và thông tin không cần thiết cho việc giải thích lỗi.
