# OSI 계층 실습

블로그 글 "OSI 7계층 실습: HTTP 요청 하나 따라가기"의 실습 코드입니다.

| 파일 | 계층 | 내용 |
|---|---|---|
| `trace_layers.py` | 1–7 | example.com에 HTTPS 요청을 보내며 계층별 실제 값 확인 |
| `tcp_demo.py` | 4 | 연결 실패, 바이트 스트림(경계 없음), 길이 접두사 프레이밍 |
| `udp_demo.py` | 4 | 비연결, 데이터그램 경계 유지, 수신 버퍼 초과 시 손실 |
| `http2_server.py`, `http2_client.py` | 7 (TLS 위) | TCP 연결 1개에서 스트림 3개 동시 스트리밍 |

## 실행

```bash
python3.12 -m venv .venv
.venv/bin/pip install hypercorn h2

.venv/bin/python trace_layers.py
.venv/bin/python tcp_demo.py
.venv/bin/python udp_demo.py

# HTTP/2: 자체 서명 인증서를 만들고 서버를 띄운 뒤 클라이언트 실행
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 30 -subj /CN=localhost
.venv/bin/python http2_server.py &
.venv/bin/python http2_client.py
```

`trace_layers.py`의 2계층·1계층 확인은 macOS 명령(`route`, `arp`, `ifconfig`, `system_profiler`)을 씁니다.
