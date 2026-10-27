"""HTTP/2 스트리밍 서버 (7계층, TLS 위).

GET /stream/{name} 요청마다 0.3초 간격으로 청크 5개를 흘려 보낸다.
TLS + ALPN으로 h2를 협상하는 hypercorn 위에서 돈다.

    openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem \
        -days 30 -subj /CN=localhost
    python http2_server.py
"""

import asyncio

from hypercorn.asyncio import serve
from hypercorn.config import Config


async def app(scope, receive, send):
    if scope["type"] == "lifespan":
        while True:
            message = await receive()
            if message["type"] == "lifespan.startup":
                await send({"type": "lifespan.startup.complete"})
            elif message["type"] == "lifespan.shutdown":
                await send({"type": "lifespan.shutdown.complete"})
                return

    name = scope["path"].rsplit("/", 1)[-1]
    print(f"[server] HTTP/{scope['http_version']} {scope['method']} {scope['path']}")
    await send({"type": "http.response.start", "status": 200, "headers": [(b"content-type", b"text/plain")]})
    for i in range(5):
        await send({"type": "http.response.body", "body": f"{name}-{i}\n".encode(), "more_body": True})
        await asyncio.sleep(0.3)
    await send({"type": "http.response.body", "body": b"", "more_body": False})


if __name__ == "__main__":
    config = Config()
    config.bind = ["127.0.0.1:8443"]
    config.certfile, config.keyfile = "cert.pem", "key.pem"
    config.alpn_protocols = ["h2"]
    asyncio.run(serve(app, config))
