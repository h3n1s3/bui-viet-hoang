# GUIDE — sử dụng và quản trị website

Đây là website tĩnh dùng Astro. Không có trang admin hoặc database. Nội dung được quản lý bằng Markdown, MDX và các file TypeScript trong repository. Khi thay đổi được merge hoặc push vào `main`, GitHub Actions tự build và publish lên GitHub Pages.

- Website: <https://h3n1s3.github.io/bui-viet-hoang/>
- Research: <https://h3n1s3.github.io/bui-viet-hoang/research/>
- Project: <https://h3n1s3.github.io/bui-viet-hoang/project/>
- RSS: <https://h3n1s3.github.io/bui-viet-hoang/rss.xml>

## 1. Các file quan trọng

| Đường dẫn | Công dụng |
| --- | --- |
| `content/research/` | Bài blog, research và writeup Markdown/MDX |
| `src/content.config.ts` | Schema kiểm tra frontmatter của bài viết |
| `src/data/profile.ts` | Social, chứng chỉ, CVE/report, CTF và project |
| `src/lib/site.ts` | Tên, handle, vai trò, mô tả mặc định và GitHub footer |
| `src/pages/index.astro` | Nội dung Home, About Me và Current Interests |
| `src/pages/project.astro` | Giao diện danh sách project |
| `public/` | Ảnh, PDF, favicon và asset được phục vụ trực tiếp |
| `src/styles/global.css` | Màu sắc, typography, bố cục và animation |
| `astro.config.mjs` | Domain, base path, Markdown, MDX và redirect |
| `.github/workflows/check.yml` | Kiểm tra pull request và nhánh chưa phải `main` |
| `.github/workflows/deploy.yml` | Build và deploy khi `main` thay đổi |

## 2. Chạy website trên máy

Workflow dùng Node.js 24. Sau khi clone repository, mở terminal trong thư mục project:

```sh
npm ci
npm run dev
```

Mở:

```text
http://127.0.0.1:4321/bui-viet-hoang/
```

Các lệnh kiểm tra:

```sh
npm run check
npm test
npm run build
npm run preview
```

- `check`: kiểm tra Astro và TypeScript.
- `test`: kiểm tra Markdown, code window, heading anchor và base path.
- `build`: tạo website tĩnh trong `dist/`.
- `preview`: xem chính bản production vừa build.

`dist/`, `node_modules/`, `.astro/` và output Playwright được generate tự động; không commit chúng.

## 3. Sửa thông tin cá nhân

### Tên, handle và vai trò

Sửa `profile` trong `src/lib/site.ts`:

```ts
export const profile = {
  name: 'Bui Viet Hoang',
  handle: 'h3n1s3',
  role: 'Security Researcher · CTF Player',
  description: 'Research, experiments and field notes in cybersecurity.',
  github: 'https://github.com/h3n1s3',
};
```

`profile.github` được dùng ở footer. Nếu đổi GitHub, sửa cả GitHub entry trong mảng `socials` để nút trên Home khớp với footer.

### Nội dung About Me

Sửa trực tiếp section có `id="about"` trong `src/pages/index.astro`. Đây là nơi chứa phần giới thiệu, Current Interests và CTF & Research.

### Mạng xã hội và email

Sửa mảng `socials` trong `src/data/profile.ts`:

```ts
export const socials: Social[] = [
  { label: 'GitHub', url: 'https://github.com/h3n1s3', icon: 'github' },
  { label: 'Email', url: 'mailto:you@example.com', icon: 'mail' },
];
```

Các icon đang hỗ trợ:

```text
github, mail, facebook, linkedin, htb, patchstack
```

Email phải có tiền tố `mailto:`. Link thường mở tab mới; link email mở ứng dụng mail.

Link Hack The Box và Patchstack trong Achievements cũng lấy từ mảng `socials`, nên chỉ cần sửa một nơi.

## 4. Thêm bài blog hoặc research

Tạo file `.md` hoặc `.mdx` trong `content/research/`. Markdown `.md` là lựa chọn đơn giản nhất. Chỉ dùng `.mdx` khi cần import hoặc JSX/component.

Ví dụ `content/research/oauth-state-bypass.md`:

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
cover: /research/oauth-state/cover.webp
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

File trên tạo URL:

```text
https://h3n1s3.github.io/bui-viet-hoang/research/oauth-state-bypass/
```

Tên file và thư mục tương đối bên trong `content/research/` quyết định URL. Không có field `slug`. Đổi tên hoặc di chuyển file sẽ đổi URL cũ; nếu link cũ đã được chia sẻ, thêm redirect trong `astro.config.mjs`.

Nên dùng tên file lowercase kebab-case như `oauth-state-bypass.md`; GitHub Pages phân biệt chữ hoa và chữ thường. Nếu giá trị YAML chứa dấu `:`, hãy đặt toàn bộ giá trị trong dấu nháy.

### Frontmatter

| Field | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `title` | Có | Tiêu đề bài |
| `description` | Có | Mô tả trên card, metadata và RSS |
| `date` | Có | Ngày xuất bản `YYYY-MM-DD`; dùng để sắp xếp mới nhất trước |
| `updated` | Không | Ngày cập nhật; không thay đổi thứ tự bài |
| `tags` | Không | Danh sách tag hiển thị; chưa tạo trang tag riêng |
| `category` | Không | `blog` hoặc `writeup`; mặc định `blog` |
| `draft` | Không | Mặc định `false`; `true` ẩn route, danh sách, RSS và sitemap |
| `sample` | Không | Mặc định `false`; `true` vẫn public nhưng có nhãn Sample note |
| `lang` | Không | `en` hoặc `vi`; mặc định `en` |
| `cover` | Không | Ảnh bìa root-relative hoặc URL ngoài |
| `coverAlt` | Không | Mô tả ảnh bìa; luôn nên có khi dùng `cover` |

Ngày trong tương lai vẫn public ngay nếu `draft` không phải `true`; site không tự hẹn giờ xuất bản.

### Sửa, ẩn hoặc xóa bài

- Sửa bài: chỉnh chính file `.md`/`.mdx`, có thể thêm `updated`.
- Tạm ẩn: đặt `draft: true`.
- Xóa: xóa file tương ứng.
- Chuyển bài sample thành bài thật: thay nội dung và đặt `sample: false` hoặc bỏ field `sample`.

Bốn bài đi kèm ban đầu đều có `sample: true`. Sample vẫn được tính trong Research, RSS, sitemap và các bộ đếm. Nếu chỉ muốn nội dung thật, hãy thay chúng, xóa chúng hoặc đặt `draft: true`.

## 5. Markdown, MDX và Table of Contents

Website hỗ trợ heading, bold, italic, link, ảnh, danh sách, bảng, quote, inline code, code fence và công thức KaTeX.

```md
## Heading cấp 2

### Heading cấp 3

**bold** và *italic*

> Quote

| Field | Value |
| --- | --- |
| Status | Fixed |

Inline code: `state`

Công thức inline: $A(s,a,o,c)$
```

`##` và `###` tự tạo Table of Contents. Layout bài đã có H1 từ `title`, vì vậy nội dung nên bắt đầu bằng đoạn mở hoặc `##`, không cần thêm `#` lần nữa.

### Code block

Khai báo ngôn ngữ và có thể đặt `title` hoặc `filename`:

````md
```python title="exploit.py"
def verify_state(expected, received):
    return expected == received
```
````

Shiki tự highlight, code dài có thanh cuộn ngang và nút Copy được tạo tự động.

### MDX

`.mdx` dùng cùng frontmatter. Link và ảnh viết bằng cú pháp Markdown được tự thêm base `/bui-viet-hoang/`. `href`/`src` trong raw HTML hoặc JSX không được tự sửa; khi dùng chúng, phải ghi đúng base hoặc dùng một giá trị đã xử lý base path.

## 6. Thêm ảnh, PDF và asset

File trong `public/foo` được gọi bằng URL `/foo`, không có chữ `/public`.

Ví dụ:

```text
public/research/oauth-state/flow.webp
public/reports/cve-2026-xxxxx.pdf
```

Dùng trong Markdown:

```md
![Sơ đồ luồng OAuth state](/research/oauth-state/flow.webp)

[Download sanitized report](/reports/cve-2026-xxxxx.pdf)
```

Markdown plugin tự thêm `/bui-viet-hoang/` cho các link và ảnh root-relative. Luôn viết alt text có ý nghĩa. Không commit token, cookie, dữ liệu cá nhân, request header nhạy cảm hoặc ảnh chụp chứa secret.

## 7. Thêm CTF/lab writeup

Writeup vẫn nằm trong `content/research/`, nhưng dùng:

```yaml
category: writeup
tags: [CTF, Web]
```

Bài sẽ xuất hiện trong bộ lọc Writeup và được tính vào ô `WRITEUPS` trên Home.

## 8. Thêm chứng chỉ

1. Đặt ảnh vào `public/certifications/`.
2. Ưu tiên WebP, PNG hoặc SVG có tỷ lệ gần `1200 × 760`.
3. Thêm object vào mảng `certifications` trong `src/data/profile.ts`.

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

- `image` phải là đường dẫn local bắt đầu bằng `/certifications/`.
- `url` là tùy chọn; khi có URL, card có liên kết `VERIFY ↗`.
- Khi `certifications` có ít nhất một item, bốn ảnh SAMPLE tự biến mất.
- Bộ đếm Certifications tự cập nhật theo số phần tử thật.
- Nếu muốn ẩn toàn bộ section khi chưa có chứng chỉ, bỏ `<Certifications/>` khỏi `src/pages/index.astro`.

## 9. Thêm CVE đã công bố

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

- `date` dùng chuẩn ISO `YYYY-MM-DD`; `dateLabel` là chữ hiển thị tùy chọn.
- `url` biến title thành link.
- `advisoryUrl` tạo link advisory riêng.
- Chỉ thêm CVE, CVSS, affected/fixed version và finder credit sau khi nguồn công khai xác nhận.
- Con số bên cạnh Security Research là tổng entry published và pending, không chỉ số CVE.

Một report/advisory đã public nhưng chưa có CVE vẫn có thể dùng `status: 'published'`: đặt `title` thành tên finding hoặc sản phẩm, dùng `url` cho link chính và `advisoryUrl` cho link advisory nếu cần.

Trong kiểu dữ liệu, `date`, `dateLabel`, `meta`, `url`, `credit`, `advisoryUrl` và `advisoryLabel` là tùy chọn. `dateLabel` chỉ hiển thị khi có `date`; `advisoryLabel` chỉ có tác dụng khi có `advisoryUrl`.

## 10. Thêm report đang disclosure

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

Không đưa PoC, endpoint riêng, token hoặc chi tiết chưa được phép công bố vào website. Khi lỗ hổng public, cập nhật chính object này sang `published` và bổ sung CVE/advisory.

Nếu cần bài phân tích dài, tạo thêm một bài trong `content/research/` sau ngày disclosure được phép. Có thể dùng tag `[CVE, WordPress, Authentication]`; không có category riêng tên `cve` hoặc `report`.

## 11. Thêm thành tích CTF

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

Chỉ dùng URL bảng xếp hạng hoặc nguồn có thể xác minh. Writeup cho challenge vẫn là bài `category: writeup`.

`dateLabel` chỉ hiển thị khi có `date`; `linkLabel` chỉ hiển thị khi có `url`.

## 12. Thêm project

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

Tất cả field đều bắt buộc. Giữ `id` duy nhất và tăng dần. Giao diện hiện gắn nhãn `OPEN SOURCE` và `Source on GitHub`, vì vậy `url` nên là repository/source công khai. Trang `/project/` và bộ đếm Projects tự cập nhật.

Research tự sắp xếp mới nhất trước theo `date`. Chứng chỉ, Security Research, CTF và Projects hiển thị theo đúng thứ tự các object trong mảng tại `src/data/profile.ts`; muốn đổi thứ tự chỉ cần di chuyển object.

## 13. Favicon và ảnh ASCII Elaina

- Favicon: `public/favicon.svg`.
- Nguồn portrait: `src/assets/elaina-source.png`.
- Dữ liệu ASCII được generate: `src/data/elaina-ascii.json`.

Sau khi thay `elaina-source.png`, chạy:

```sh
node scripts/build-ascii.mjs
```

Script tạo lưới 140 × 124 ký tự. Không sửa thủ công file JSON. Chi tiết quá trình artwork nằm trong `docs/artwork.md`.

## 14. Xuất bản bằng GitHub Web

Phù hợp khi chỉ sửa một bài hoặc upload ảnh:

1. Mở repository trên GitHub.
2. Upload ảnh vào đúng thư mục trong `public/` trước.
3. Mở `content/research/`, chọn **Add file → Create new file** hoặc sửa file hiện có.
4. Chọn tạo branch mới thay vì commit thẳng vào `main`.
5. Mở Pull Request.
6. Chờ workflow **Check website** chạy xanh.
7. Merge PR vào `main`.
8. Mở tab **Actions**, chờ **Deploy to GitHub Pages** hoàn tất.

## 15. Xuất bản bằng Git CLI

Lấy bản `main` mới nhất và tạo branch:

```sh
git switch main
git pull --ff-only origin main
git switch -c content/ten-thay-doi
```

Sau khi sửa:

```sh
npm run check
npm test
npm run build
git status
git add <cac-file-da-kiem-tra>
git commit -m "Add research article"
git push -u origin content/ten-thay-doi
```

Mở Pull Request, chờ check xanh và merge. Không dùng `git add -A` nếu chưa xem `git status`, vì có thể vô tình commit file tạm hoặc dữ liệu nhạy cảm.

Push trực tiếp vào `main` sẽ publish ngay và bỏ qua bước review; chỉ dùng khi bạn chủ động muốn deploy trực tiếp.

## 16. GitHub Pages

`.github/workflows/deploy.yml` chạy khi `main` thay đổi hoặc khi workflow được dispatch thủ công. Trong repository:

```text
Settings → Pages → Build and deployment → Source: GitHub Actions
```

Base path production phải là:

```text
/bui-viet-hoang/
```

Không đổi lại thành `/thpt-2026/`. Với custom domain hoặc host ở root, cấu hình build bằng `SITE_URL` và `SITE_BASE=/` thay vì hard-code asset path.

Sau deploy, kiểm tra:

- Home tải đúng CSS và ảnh.
- Research và một bài chi tiết mở được.
- Project mở được.
- RSS trả XML.
- Workflow **Deploy to GitHub Pages** màu xanh.

Nếu CDN vẫn hiện bản cũ, đợi khoảng một phút rồi nhấn `Ctrl+Shift+R`.

## 17. Troubleshooting

### Trang trắng hoặc mất CSS

- Kiểm tra workflow deploy có thành công không.
- Kiểm tra Pages Source là GitHub Actions.
- Kiểm tra asset URL bắt đầu bằng `/bui-viet-hoang/`, không phải `/thpt-2026/`.

### Bài không xuất hiện

- Kiểm tra file nằm trong `content/research/`.
- Kiểm tra `draft` không phải `true`.
- Kiểm tra `title`, `description` và `date` hợp lệ.
- Chạy `npm run check` để xem lỗi schema.

### Ảnh bị 404

- File phải nằm trong `public/`.
- URL không được chứa `/public`.
- Với Markdown, dùng đường dẫn như `/research/post/image.webp`.
- Với chứng chỉ, dùng `/certifications/image.webp`.
- Phân biệt chữ hoa và chữ thường vì GitHub Pages chạy trên Linux.

### Không có Table of Contents

Bài cần ít nhất một heading `##` hoặc `###`. Heading `#` không được đưa vào TOC.

### Sample vẫn xuất hiện

`sample: true` chỉ hiện nhãn, không ẩn bài. Đặt `draft: true`, xóa file hoặc thay bằng nội dung thật và bỏ `sample`.

### Đổi tên bài làm link cũ hỏng

Đường dẫn phụ thuộc tên file. Khi đổi slug đã public, thêm redirect tương ứng trong `redirects` của `astro.config.mjs`.

## 18. Checklist trước khi publish

- Nội dung không chứa secret hoặc dữ liệu cá nhân.
- CVE, CVSS, phiên bản và credit có nguồn xác minh.
- Report pending không tiết lộ chi tiết chưa được phép.
- Ảnh có alt text và đúng path.
- Bài thật không còn `sample: true`.
- Bài muốn public không có `draft: true`.
- `npm run check`, `npm test` và `npm run build` đều đạt.
- Đã xem `git status` trước khi commit.
- PR checks và Pages deployment đều xanh.
