---
title: 'Cloudflare Tunnel, Proxied, DNS only 한 번에 정리하기'
description: 'Cloudflare DNS의 Proxied와 DNS only 차이, 포트를 열지 않고 서버를 공개하는 Cloudflare Tunnel을 정리했습니다.'
pubDate: '2026-11-03T02:07:00+09:00'
---

Cloudflare에 도메인을 연결하면 DNS 레코드마다 **주황색 구름(Proxied)** 과 **회색 구름(DNS only)** 토글이 보입니다. 그리고 집 서버나 사내망 서버를 공개할 때는 **Cloudflare Tunnel**이라는 선택지도 있습니다. 셋 다 "도메인으로 서버에 접속하게 만든다"는 점은 같지만, 트래픽이 흐르는 경로가 완전히 다릅니다.

## 한눈에 보기

| | DNS only (회색) | Proxied (주황) | Tunnel |
|---|---|---|---|
| DNS 응답 | 내 서버의 실제 IP | Cloudflare IP | Cloudflare IP |
| 트래픽 경로 | 사용자 → 내 서버 | 사용자 → Cloudflare → 내 서버 | 사용자 → Cloudflare ⇠ 내 서버(`cloudflared`) |
| 서버 IP 노출 | 노출됨 | 숨겨짐 (설정만 잘하면) | 숨겨짐 |
| 인바운드 포트 개방 | 필요 | 필요 | **불필요** |
| 공인 IP | 필요 | 필요 | **불필요** (NAT, CGNAT 뒤도 가능) |
| 캐시, DDoS 방어, WAF | 없음 | 있음 | 있음 |
| 지원 프로토콜 | 모든 TCP/UDP | HTTP(S) 위주 | HTTP(S), SSH, RDP, TCP 등 |

---

## 1. DNS only (회색 구름)

Cloudflare가 **순수하게 DNS 서버 역할만** 합니다.

```
사용자 ──"blog.example.com 어디야?"──▶ Cloudflare DNS
사용자 ◀──"203.0.113.10 이야"──────── Cloudflare DNS
사용자 ─────────────────────────────▶ 203.0.113.10 (내 서버)
```

- `dig blog.example.com`을 해 보면 **내 서버의 실제 IP**가 그대로 나옵니다.
- 이후 통신에 Cloudflare는 전혀 관여하지 않습니다. 캐시, DDoS 방어, 방화벽이 모두 없습니다.
- HTTPS 인증서도 서버에서 직접 발급하고 관리해야 합니다 (Let's Encrypt 등).
- 대신 **포트와 프로토콜 제약이 없습니다.** SSH(22), DB, 게임 서버, 메일 서버처럼 HTTP가 아닌 서비스는 이 모드여야 합니다.

**이럴 때 씁니다**
- 메일 서버 (MX 레코드가 가리키는 호스트는 프록시할 수 없습니다)
- SSH 접속용 도메인, 게임 서버, VPN 같은 비 HTTP 서비스
- Vercel이나 GitHub Pages처럼 다른 서비스가 "DNS only로 설정하라"고 안내하는 경우

## 2. Proxied (주황 구름)

Cloudflare가 **리버스 프록시**로 사용자와 내 서버 사이에 끼어듭니다.

```
사용자 ──▶ Cloudflare 엣지 (캐시, WAF, DDoS 방어) ──▶ 내 서버
           ↑ DNS 응답은 Cloudflare IP
```

- `dig`를 해 보면 `104.x.x.x`, `172.67.x.x` 같은 **Cloudflare의 IP**가 나옵니다. 내 서버 IP는 숨겨집니다.
- 정적 파일 캐시, DDoS 방어, WAF, 봇 차단, HTTPS 인증서를 Cloudflare가 처리합니다.
- A, AAAA, CNAME 레코드만 프록시할 수 있습니다.

**알아둘 제약**
- **HTTP(S) 트래픽만** 통과합니다. 주황 구름 상태로 SSH를 붙으면 접속이 안 됩니다 (TCP 프록시인 Spectrum은 유료입니다).
- 사용할 수 있는 포트가 정해져 있습니다.
  - HTTP: `80, 8080, 8880, 2052, 2082, 2086, 2095`
  - HTTPS: `443, 2053, 2083, 2087, 2096, 8443`
- 무료 플랜은 요청 본문 크기가 **100MB로 제한**됩니다. 큰 파일 업로드가 있다면 주의하세요.
- 서버에서는 접속자 IP가 전부 Cloudflare IP로 보입니다. 실제 IP는 `CF-Connecting-IP` 헤더에서 읽어야 합니다.

**SSL/TLS 모드는 꼭 확인하세요**

| 모드 | 사용자 ↔ Cloudflare | Cloudflare ↔ 서버 |
|---|---|---|
| Flexible | HTTPS | HTTP (암호화 안 됨) |
| Full | HTTPS | HTTPS (인증서 검증 안 함) |
| **Full (strict)** | HTTPS | HTTPS (인증서 검증함) ✅ 권장 |

Flexible 모드에서 서버가 HTTP를 HTTPS로 리다이렉트하면 **무한 리다이렉트 루프**가 생깁니다. 자주 겪는 문제이니 가능하면 Full (strict)를 쓰세요. 서버용 인증서는 Cloudflare의 **Origin Certificate**(무료, 최대 15년)를 발급받아 쓰면 편합니다.

**주의: 서버 IP가 이미 노출됐다면?** Proxied는 DNS 응답만 숨겨 줄 뿐입니다. 예전에 DNS only로 운영한 기록이 남아 있거나, 같은 서버의 다른 서브도메인이 DNS only라면 공격자가 서버 IP로 직접 접근할 수 있습니다. 서버 방화벽에서 [Cloudflare IP 대역](https://www.cloudflare.com/ips/)만 허용하거나, 아래의 Tunnel을 쓰는 것이 확실합니다.

## 3. Cloudflare Tunnel

앞의 두 방식은 **외부에서 내 서버로 들어오는** 구조라서 공인 IP와 포트포워딩이 필요합니다. Tunnel은 방향이 반대입니다. **내 서버가 먼저 Cloudflare에 연결을 걸어 두고**, 사용자의 요청은 그 연결을 타고 들어옵니다.

```
사용자 ──▶ Cloudflare 엣지 ◀══ 아웃바운드 연결 ══ cloudflared ──▶ localhost:4321
                                                  (내 서버 안에서 실행)
```

- 서버에서 `cloudflared`라는 데몬을 실행하면 Cloudflare 엣지로 **아웃바운드 연결**을 맺습니다.
- **인바운드 포트를 하나도 열지 않아도** 됩니다. 공유기 포트포워딩도 필요 없습니다.
- 공인 IP가 없는 환경(통신사 CGNAT, 사내망, 기숙사)에서도 동작합니다.
- 서버 IP가 어디에도 공개되지 않습니다.
- DNS에는 `<터널ID>.cfargotunnel.com`을 가리키는 **Proxied CNAME**이 만들어집니다. 그래서 Tunnel은 사실상 "Proxied + 포트 개방 없음"이라고 이해하면 됩니다.

### 빠르게 체험하기 (Quick Tunnel)

계정이나 도메인 없이 로컬 서버를 임시로 공개할 수 있습니다.

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:4321
# → https://random-words.trycloudflare.com 주소가 생성됨
```

개발 중인 화면을 잠깐 공유할 때 유용합니다. 프로세스를 끄면 주소도 사라집니다.

### 내 도메인에 연결하기

대시보드 방식이 가장 쉽습니다.

1. Cloudflare 대시보드 → **Zero Trust → Networks → Tunnels → Create a tunnel**
2. 터널 이름을 정하면 설치 명령어가 나옵니다. 서버에서 그대로 실행합니다.
   ```bash
   sudo cloudflared service install <발급된 토큰>
   ```
3. **Public Hostname**에 `blog.example.com` → `http://localhost:4321`처럼 연결할 서비스를 등록합니다.
4. DNS 레코드는 자동으로 생성됩니다.

설정을 파일로 관리하고 싶다면 CLI 방식도 있습니다.

```bash
cloudflared tunnel login                     # 브라우저 인증
cloudflared tunnel create home               # 터널 생성 (자격증명 JSON 발급)
cloudflared tunnel route dns home blog.example.com
cloudflared tunnel run home
```

```yaml
# ~/.cloudflared/config.yml
tunnel: <TUNNEL_UUID>
credentials-file: /Users/me/.cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: blog.example.com
    service: http://localhost:4321
  - hostname: api.example.com
    service: http://localhost:8000
  - hostname: ssh.example.com
    service: ssh://localhost:22
  - service: http_status:404   # 마지막 규칙은 반드시 catch-all
```

터널 하나로 여러 서비스를 호스트 이름별로 나눠서 공개할 수 있습니다.

### SSH도 터널로

`ssh://localhost:22`를 등록하면 포트를 열지 않고 집 서버에 SSH로 접속할 수 있습니다. 단, 접속하는 쪽에도 `cloudflared`가 필요합니다.

```
# 접속하는 PC의 ~/.ssh/config
Host home
  HostName ssh.example.com
  ProxyCommand cloudflared access ssh --hostname %h
```

SSH나 관리자 페이지처럼 민감한 서비스는 **Cloudflare Access**(Zero Trust)를 앞에 붙여서, 허용한 이메일로 로그인한 사람만 접근하도록 막아 두는 것을 강력히 권장합니다.

---

## 그래서 뭘 쓰면 될까?

- **웹사이트를 일반 서버(VPS)에서 운영** → Proxied + Full (strict) + 방화벽에서 Cloudflare IP만 허용
- **집 PC나 사내망처럼 공인 IP나 포트포워딩이 없는 환경** → Tunnel
- **SSH, 메일, 게임 서버처럼 HTTP가 아닌 서비스** → DNS only (또는 Tunnel + `cloudflared access`)
- **Vercel, Netlify 같은 외부 호스팅** → 해당 서비스 안내를 따르기 (대부분 DNS only)

참고로 이 블로그처럼 정적 사이트를 Cloudflare Pages에 배포하면, 이런 설정 없이 커스텀 도메인만 연결하면 됩니다. Tunnel이 빛을 발하는 건 나중에 FastAPI 백엔드를 집 서버에서 띄울 때입니다.
