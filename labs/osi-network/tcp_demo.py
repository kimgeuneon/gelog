"""TCP 실습 (4계층): 연결 지향 + 바이트 스트림.

1) 서버가 없으면 연결 자체가 실패한다.
2) send를 세 번 해도 받는 쪽은 경계 없이 한 덩어리로 받을 수 있다.
3) 길이 접두사(length prefix)로 프레이밍하면 메시지 경계를 되살릴 수 있다.
"""

import asyncio
import struct

HOST, PORT = "127.0.0.1", 9001
MESSAGES = [b"hello", b"world", b"tcp"]


async def demo_refused():
    print("[1] 서버 없이 연결 시도")
    try:
        await asyncio.open_connection(HOST, PORT)
    except ConnectionRefusedError as e:
        print(f"    -> ConnectionRefusedError: {e.strerror}")


async def run(handler, payloads):
    server = await asyncio.start_server(handler, HOST, PORT)
    _, writer = await asyncio.open_connection(HOST, PORT)
    local = writer.get_extra_info("sockname")
    print(f"    client {local[0]}:{local[1]} -> server {HOST}:{PORT}")
    for p in payloads:
        writer.write(p)
    await writer.drain()
    writer.close()
    await writer.wait_closed()
    await asyncio.sleep(0.1)
    server.close()
    await server.wait_closed()


async def demo_stream():
    print("[2] 프레이밍 없이 write 3번")
    received = []

    async def handle(reader, writer):
        while chunk := await reader.read(1024):
            received.append(chunk)
        writer.close()

    await run(handle, MESSAGES)
    print(f"    보낸 것: {MESSAGES}")
    print(f"    받은 것: {received}  -> read {len(received)}번")


async def demo_framing():
    print("[3] 4바이트 길이 + 본문으로 프레이밍")
    received = []

    async def handle(reader, writer):
        while True:
            try:
                (length,) = struct.unpack("!I", await reader.readexactly(4))
            except asyncio.IncompleteReadError:
                break
            received.append(await reader.readexactly(length))
        writer.close()

    await run(handle, [struct.pack("!I", len(m)) + m for m in MESSAGES])
    print(f"    받은 것: {received}  -> 메시지 {len(received)}개로 복원")


async def main():
    await demo_refused()
    await demo_stream()
    await demo_framing()


if __name__ == "__main__":
    asyncio.run(main())
