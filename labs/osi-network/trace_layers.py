"""example.com에 HTTPS 요청 하나를 보내면서 계층마다 실제 값을 확인한다.

영상(KodeKloud, OSI 7 Layers with HTTP Request)의 예시 값을
내 컴퓨터에서 직접 관찰한 값으로 바꿔 보는 실습.
개인 정보(사설 IP, MAC)는 일부를 가려서 출력한다.
"""

import re
import socket
import ssl
import subprocess

HOST = "example.com"


def mask_ip(ip: str) -> str:
    a, b, *_ = ip.split(".")
    return f"{a}.{b}.x.x"


def mask_mac(mac: str) -> str:
    octets = [o.zfill(2) for o in mac.split(":")]
    return ":".join(octets[:2] + ["xx"] * 4)


def sh(cmd: str) -> str:
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout


# 3계층: 이름 → IP (DNS)
server_ip = socket.getaddrinfo(HOST, 443, socket.AF_INET, socket.SOCK_STREAM)[0][4][0]

# 4계층: TCP 연결
raw = socket.create_connection((server_ip, 443), timeout=10)
local_ip, local_port = raw.getsockname()

# 6계층: TLS
ctx = ssl.create_default_context()
ctx.set_alpn_protocols(["http/1.1"])
tls = ctx.wrap_socket(raw, server_hostname=HOST)
cert = dict(x[0] for x in tls.getpeercert()["subject"])
tls_version, tls_cipher = tls.version(), tls.cipher()[0]

# 7계층: HTTP (5계층 역할: keep-alive로 같은 연결에서 두 번 요청)
buf = b""


def read_until(sep: bytes) -> bytes:
    global buf
    while sep not in buf:
        buf += tls.recv(65536)
    out, buf = buf.split(sep, 1)
    return out


def read_exact(n: int) -> bytes:
    global buf
    while len(buf) < n:
        buf += tls.recv(65536)
    out, buf = buf[:n], buf[n:]
    return out


statuses = []
for path in ["/", "/index.html"]:
    req = f"GET {path} HTTP/1.1\r\nHost: {HOST}\r\nUser-Agent: osi-lab\r\nConnection: keep-alive\r\n\r\n"
    tls.sendall(req.encode())
    head = read_until(b"\r\n\r\n")
    status_line = head.split(b"\r\n", 1)[0].decode()
    if m := re.search(rb"(?i)content-length:\s*(\d+)", head):
        read_exact(int(m.group(1)))
    elif re.search(rb"(?i)transfer-encoding:\s*chunked", head):
        while (size := int(read_until(b"\r\n").split(b";")[0], 16)) > 0:
            read_exact(size + 2)
        read_until(b"\r\n")
    statuses.append((path, status_line, tls.getsockname()[1]))
tls.close()

# 2계층·1계층: 기본 게이트웨이(첫 라우터)와 인터페이스
route = sh("route -n get default")
gateway = re.search(r"gateway: (\S+)", route).group(1)
iface = re.search(r"interface: (\S+)", route).group(1)
gw_mac = re.search(r"at (\S+)", sh(f"arp -n {gateway}")).group(1)
my_mac = re.search(r"ether (\S+)", sh(f"ifconfig {iface}")).group(1)
wifi = sh("system_profiler SPAirPortDataType")
wifi = wifi[wifi.find("Current Network Information"):]
phy = re.search(r"PHY Mode: (\S+)", wifi)
channel = re.search(r"Channel: (.+)", wifi)
media = f"Wi-Fi {phy.group(1)}, 채널 {channel.group(1).strip()}" if phy and channel else "유선 또는 확인 불가"

print(f"[7 Application ] {statuses[0][1]}  <- GET / ")
print(f"[6 Presentation] {tls_version}, {tls_cipher}, 인증서 CN={cert.get('commonName')}")
print(f"[5 Session     ] keep-alive: 요청 2번 모두 같은 연결 (local port {statuses[0][2]}, {statuses[1][2]})")
print(f"[4 Transport   ] TCP {mask_ip(local_ip)}:{local_port} -> {server_ip}:443")
print(f"[3 Network     ] {HOST} = {server_ip}, 첫 라우터(게이트웨이) {mask_ip(gateway)}")
print(f"[2 Data Link   ] {iface} MAC {mask_mac(my_mac)} -> 게이트웨이 MAC {mask_mac(gw_mac)}")
print(f"[1 Physical    ] {iface}: {media}")
