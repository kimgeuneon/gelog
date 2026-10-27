"""HTTP/2 스트리밍 클라이언트 (h2 라이브러리로 프레임을 직접 다룸).

TCP 연결 하나를 열고, 그 위에서 TLS로 h2를 협상한 뒤
요청 3개를 동시에 보낸다. 각 응답 청크가 어느 스트림에서 왔는지 출력한다.
"""

import socket
import ssl
import time

import h2.connection
import h2.events

HOST, PORT = "127.0.0.1", 8443
NAMES = ["a", "b", "c"]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE  # 실습용 자체 서명 인증서
ctx.set_alpn_protocols(["h2"])

raw = socket.create_connection((HOST, PORT))  # 4계층: TCP 연결 1개
tls = ctx.wrap_socket(raw, server_hostname="localhost")  # 6계층: TLS
print(f"[L4] TCP  {tls.getsockname()[0]}:{tls.getsockname()[1]} -> {HOST}:{PORT}")
print(f"[L6] TLS  {tls.version()}, {tls.cipher()[0]}")
print(f"[L7] ALPN 협상 결과: {tls.selected_alpn_protocol()}")

conn = h2.connection.H2Connection()
conn.initiate_connection()
tls.sendall(conn.data_to_send())

for name in NAMES:  # 같은 연결 위에 스트림 3개
    sid = conn.get_next_available_stream_id()
    conn.send_headers(
        sid,
        [(":method", "GET"), (":path", f"/stream/{name}"), (":scheme", "https"), (":authority", "localhost")],
        end_stream=True,
    )
    print(f"[req] stream {sid} -> /stream/{name}")
tls.sendall(conn.data_to_send())

t0 = time.perf_counter()
ended = 0
while ended < len(NAMES):
    for event in conn.receive_data(tls.recv(65535)):
        if isinstance(event, h2.events.DataReceived):
            conn.acknowledge_received_data(event.flow_controlled_length, event.stream_id)
            if event.data:
                print(f"  {time.perf_counter() - t0:4.1f}s  stream {event.stream_id}: {event.data.decode().strip()}")
        elif isinstance(event, h2.events.StreamEnded):
            ended += 1
    tls.sendall(conn.data_to_send())

conn.close_connection()
tls.sendall(conn.data_to_send())
tls.close()
print(f"총 {time.perf_counter() - t0:.1f}s, TCP 연결 1개로 스트림 {len(NAMES)}개 완료")
