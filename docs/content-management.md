# Hướng dẫn quản trị nội dung

Website này là site tĩnh dùng Astro. Không có trang quản trị hoặc cơ sở dữ liệu: bạn sửa file trong repository, kiểm tra bản build, rồi merge vào `main`. GitHub Actions sẽ tự xuất bản lên GitHub Pages.

## Chạy thử trên máy

Cài Node.js 24, mở terminal tại thư mục repository và chạy:

```sh
npm ci
npm run dev
```

Mở `http://127.0.0.1:4321/bui-viet-hoang/`. Trước khi push, kiểm tra:

```sh
npm run check
npm test
npm run build
```

## Sửa thông tin cá nhân và liên kết

- Tên, handle, vai trò, mô tả metadata và GitHub chính: `src/lib/site.ts`.
- Các nút GitHub, Facebook, email, Hack The Box, Patchstack và LinkedIn: mảng `socials` trong `src/data/profile.ts`.
- Nội dung giới thiệu và Current Interests: `src/pages/index.astro`, trong section có `id="about"`.

Email phải có tiền tố `mailto:`:

```ts
{ label: 'Email', url: 'mailto:you@example.com', icon: 'mail' }
```

Các giá trị `icon` đang hỗ trợ là `github`, `mail`, `facebook`, `linkedin`, `htb` và `patchstack`.

## Thêm bài research hoặc blog

Tạo file Markdown hoặc MDX trong `content/research/`. Ví dụ `content/research/oauth-state-bypass.md`:

```md
---
title: 'OAuth state validation and account linking'
description: 'Phân tích nguyên nhân, điều kiện khai thác và cách khắc phục.'
date: 2026-09-20
updated: 2026-09-21
tags: [Web Security, OAuth]
category: blog
lang: vi
draft: false
sample: false
cover: /research/oauth/cover.webp
coverAlt: 'Sơ đồ luồng OAuth và bước kiểm tra state'
---

Đoạn mở đầu của bài viết.

## Bối cảnh

Nội dung...

### Điều kiện cần

Nội dung...

## Khắc phục

Nội dung...
```

Tên file tạo URL. File trên sẽ có URL `/research/oauth-state-bypass/` bên trong website.

Các trường bắt buộc:

- `title`: tiêu đề.
- `description`: mô tả ngắn trên card và metadata.
- `date`: ngày xuất bản theo `YYYY-MM-DD`.

Các trường còn lại:

- `updated`: ngày cập nhật gần nhất.
- `tags`: danh sách nhãn.
- `category`: `blog` hoặc `writeup`; mặc định là `blog`.
- `lang`: `vi` hoặc `en`; mặc định là `en`.
- `draft: true`: ẩn bài khỏi route, danh sách, RSS và sitemap.
- `sample: true`: vẫn xuất bản nhưng hiện nhãn Sample note. Bài thật nên bỏ trường này hoặc đặt `false`.
- `cover` và `coverAlt`: ảnh bìa và mô tả ảnh.

Heading `##` và `###` tự xuất hiện trong Table of Contents. Markdown hỗ trợ bảng, quote, danh sách, link, ảnh, inline code, công thức KaTeX và code fence.

Code block có thể đặt tên file:

````md
```python title="exploit.py"
def verify_state(expected, received):
    return expected == received
```
````

## Thêm writeup CTF hoặc lab

Writeup cũng nằm trong `content/research/`, nhưng đặt:

```yaml
category: writeup
tags: [CTF, Web]
```

Bài sẽ xuất hiện trong bộ lọc Writeups và được tính vào ô `WRITEUPS` trên Home.

## Thêm ảnh cho bài viết

Đặt ảnh trong `public/research/<ten-bai>/`, ví dụ:

```text
public/research/oauth-state/flow.webp
```

Dùng trong Markdown:

```md
![Sơ đồ luồng kiểm tra OAuth state](/research/oauth-state/flow.webp)
```

Plugin của site sẽ tự thêm base `/bui-viet-hoang/` cho ảnh và link Markdown. Không commit token, cookie, dữ liệu cá nhân hoặc ảnh chụp chứa bí mật.

## Thêm chứng chỉ

1. Đặt ảnh vào `public/certifications/`, ưu tiên WebP, PNG hoặc SVG có tỷ lệ gần `1200 × 760`.
2. Thêm object vào mảng `certifications` trong `src/data/profile.ts`.

```ts
export const certifications: Certification[] = [
  {
    title: 'Tên chứng chỉ',
    issuer: 'Đơn vị cấp',
    date: 'Sep 2026',
    image: '/certifications/ten-chung-chi.webp',
    url: 'https://example.com/verify/credential-id',
  },
];
```

`url` là tùy chọn. Khi có URL, card sẽ có liên kết `VERIFY ↗`. Ngay khi mảng có ít nhất một chứng chỉ thật, bốn ảnh SAMPLE tự biến mất và bộ đếm Certifications tự cập nhật.

## Thêm CVE đã công bố

Thêm object vào `securityAchievements` trong `src/data/profile.ts`:

```ts
{
  status: 'published',
  statusLabel: 'PUBLISHED',
  title: 'CVE-20XX-XXXXX',
  description: 'Mô tả ngắn về sản phẩm, phiên bản ảnh hưởng và tác động đã xác minh.',
  date: '2026-09-20',
  dateLabel: '20 Sep 2026',
  meta: 'CVSS 8.1 / High',
  url: 'https://www.cve.org/CVERecord?id=CVE-20XX-XXXXX',
  credit: 'Credited as h3n1s3 through ...',
  advisoryUrl: 'https://example.com/advisory',
  advisoryLabel: 'Read advisory',
},
```

Chỉ thêm CVE, CVSS, phiên bản và finder credit sau khi nguồn công khai xác nhận chúng.

## Thêm report đang disclosure

Report chưa có advisory hoặc CVE dùng trạng thái `in-disclosure`:

```ts
{
  status: 'in-disclosure',
  statusLabel: 'IN DISCLOSURE',
  title: 'Tên sản phẩm — loại lỗ hổng',
  description: 'Mô tả mức cao, không tiết lộ chi tiết chưa được phép công bố.',
  meta: 'Patch & CVE assignment pending',
  credit: 'Reported through the vendor VDP on 20 Sep 2026.',
},
```

Khi lỗ hổng được công bố, cập nhật chính object này sang `published` và bổ sung CVE/advisory. Nếu muốn viết phân tích dài, tạo thêm một bài trong `content/research/` sau ngày disclosure được phép.

## Thêm thành tích CTF

Thêm object vào `ctfAchievements` trong `src/data/profile.ts`:

```ts
export const ctfAchievements: CtfAchievement[] = [
  {
    title: 'Tên giải — vị trí hoặc thành tích',
    description: 'Tên đội, hạng mục và phạm vi kết quả.',
    date: '2026-09-20',
    dateLabel: '20 Sep 2026',
    url: 'https://ctftime.org/event/...',
    linkLabel: 'View result',
  },
];
```

Chỉ dùng URL bảng xếp hạng hoặc nguồn có thể xác minh. Writeup cho challenge vẫn được tạo dưới dạng bài `category: writeup`.

## Thêm project

Thêm object vào mảng `projects` trong `src/data/profile.ts`:

```ts
{
  id: 'PR-002',
  title: 'Tên project',
  description: 'Một câu mô tả chức năng và mục tiêu.',
  tags: ['Python', 'Security Tooling'],
  url: 'https://github.com/h3n1s3/project-name',
},
```

Trang `/project/` và bộ đếm Projects tự cập nhật.

## Xuất bản lên GitHub Pages

Workflow `.github/workflows/deploy.yml` chỉ deploy khi `main` thay đổi. Quy trình an toàn:

```sh
git checkout -b content/ten-thay-doi
git add content public src/data/profile.ts
git commit -m "Add research article"
git push -u origin content/ten-thay-doi
```

Sau đó mở Pull Request, chờ workflow **Check website** chạy xanh và merge vào `main`. Workflow **Deploy to GitHub Pages** sẽ tự chạy. Trong **Settings → Pages**, mục **Source** phải là **GitHub Actions**.

Website chính thức:

```text
https://h3n1s3.github.io/bui-viet-hoang/
```

Nếu vừa deploy xong mà vẫn thấy bản cũ, chờ khoảng một phút rồi hard refresh bằng `Ctrl+Shift+R`. Không đổi `base` trong `astro.config.mjs`; repository project site này cần base `/bui-viet-hoang/`.
