"""Connect to the dashboard WebSocket, print the first N envelopes, exit."""
from __future__ import annotations

import asyncio
import json
import sys

import websockets


async def main(url: str = "ws://localhost:8765", count: int = 8) -> int:
    try:
        async with websockets.connect(url, open_timeout=5) as ws:
            received = []
            for _ in range(count):
                raw = await asyncio.wait_for(ws.recv(), timeout=15.0)
                msg = json.loads(raw)
                received.append(msg)
                channel = msg.get("channel", "?")
                data = msg.get("data", {})
                if channel == "dashboard.full_state":
                    rooms = data.get("rooms", {})
                    print(f"[snap] {len(rooms)} rooms: {sorted(rooms.keys())}")
                else:
                    keys = list(data.keys())
                    print(f"[evt ] {channel}: keys={keys}")
            first = received[0]
            assert first.get("channel") == "dashboard.full_state", (
                f"first message must be snapshot, got {first.get('channel')}"
            )
            assert all("channel" in m for m in received), "envelope missing channel"
            print(f"\nOK: snapshot first + {count - 1} events received")
            return 0
    except Exception as exc:
        print(f"FAIL: {type(exc).__name__}: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
