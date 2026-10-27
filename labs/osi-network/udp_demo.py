"""UDP 실습 (4계층): 비연결 + 데이터그램.

1) 받는 쪽이 없어도 sendto는 에러 없이 끝난다 (연결이 없다).
2) sendto 세 번은 recvfrom 세 번으로 그대로 나뉘어 도착한다 (메시지 경계 유지).
3) 수신 버퍼가 넘치면 데이터그램이 조용히 사라진다 (전달 보장 없음).
"""

import socket
import struct
import time

HOST = "127.0.0.1"


def demo_no_connection():
    print("[1] 아무도 듣지 않는 포트로 sendto")
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    n = s.sendto(b"anyone?", (HOST, 9002))
    print(f"    -> {n}바이트 전송, 에러 없음 (상대가 있는지 모름)")
    s.close()


def demo_boundaries():
    print("[2] sendto 3번")
    server = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server.bind((HOST, 9003))
    client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    for m in [b"hello", b"world", b"udp"]:
        client.sendto(m, (HOST, 9003))
    received = [server.recvfrom(1024)[0] for _ in range(3)]
    print(f"    받은 것: {received}  -> recvfrom 3번, 경계 유지")
    client.close()
    server.close()


def demo_loss(total=5000, size=1024):
    print(f"[3] 수신 측이 읽지 않는 동안 {total}개 연속 전송 ({size}B씩, 번호 붙임)")
    server = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 64 * 1024)
    server.bind((HOST, 9004))
    client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    send_errors = 0
    for seq in range(total):
        payload = struct.pack("!I", seq) + b"x" * (size - 4)
        try:
            client.sendto(payload, (HOST, 9004))
        except OSError:  # 보내는 쪽 버퍼가 꽉 차도 실패할 수 있다
            send_errors += 1

    time.sleep(0.2)
    server.setblocking(False)
    got = []
    while True:
        try:
            data, _ = server.recvfrom(size)
        except BlockingIOError:
            break
        got.append(struct.unpack("!I", data[:4])[0])

    missing = total - len(got)
    print(f"    받은 개수: {len(got)} / {total}  (사라짐 {missing}개, 송신 실패 {send_errors}개)")
    print(f"    받은 번호 범위: {got[0]} ~ {got[-1]}" if got else "    하나도 못 받음")
    print("    -> 아무 에러 없이 사라졌다. 재전송도, 순서 보장도 없다.")
    client.close()
    server.close()


if __name__ == "__main__":
    demo_no_connection()
    demo_boundaries()
    demo_loss()
