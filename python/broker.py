from __future__ import annotations

import json
import threading
from typing import Callable, Dict, List, Optional

import redis


HandlerFn = Callable[[dict], None]
PatternHandlerFn = Callable[[str, dict], None]


class MessageBroker:
    """Thin Redis Pub/Sub wrapper with separate pub and sub connections."""

    def __init__(self, host: str = "localhost", port: int = 6379, db: int = 0):
        self._host = host
        self._port = port
        self._db = db
        self._pub = redis.Redis(host=host, port=port, db=db, decode_responses=True)
        self._sub_conn = redis.Redis(host=host, port=port, db=db, decode_responses=True)
        self._pubsub = self._sub_conn.pubsub(ignore_subscribe_messages=True)
        self._handlers: Dict[str, List[HandlerFn]] = {}
        self._pattern_handlers: Dict[str, List[PatternHandlerFn]] = {}
        self._thread = None
        self._lock = threading.RLock()
        self._running = False
        # Verify connection eagerly so failures are obvious.
        self._pub.ping()

    # ---- Publish ----------------------------------------------------------
    def publish(self, channel: str, data: dict) -> int:
        payload = json.dumps(data, default=str)
        return self._pub.publish(channel, payload)

    # ---- Subscribe --------------------------------------------------------
    def subscribe(self, channel: str, handler: HandlerFn) -> None:
        with self._lock:
            new = channel not in self._handlers
            self._handlers.setdefault(channel, []).append(handler)
            if new:
                self._pubsub.subscribe(**{channel: self._dispatch})

    def subscribe_pattern(self, pattern: str, handler: PatternHandlerFn) -> None:
        with self._lock:
            new = pattern not in self._pattern_handlers
            self._pattern_handlers.setdefault(pattern, []).append(handler)
            if new:
                self._pubsub.psubscribe(**{pattern: self._dispatch_pattern})

    # ---- Dispatch ---------------------------------------------------------
    def _decode(self, raw) -> dict:
        if raw is None:
            return {}
        try:
            return json.loads(raw)
        except (TypeError, ValueError):
            return {"raw": raw}

    def _dispatch(self, message: dict) -> None:
        channel = message.get("channel")
        data = self._decode(message.get("data"))
        for h in list(self._handlers.get(channel, [])):
            try:
                h(data)
            except Exception as exc:
                print(f"[broker] handler error on {channel}: {exc!r}")

    def _dispatch_pattern(self, message: dict) -> None:
        pattern = message.get("pattern")
        channel = message.get("channel")
        data = self._decode(message.get("data"))
        for h in list(self._pattern_handlers.get(pattern, [])):
            try:
                h(channel, data)
            except Exception as exc:
                print(f"[broker] pattern handler error on {channel}: {exc!r}")

    # ---- Lifecycle --------------------------------------------------------
    def start(self) -> None:
        with self._lock:
            if self._running:
                return
            if not (self._handlers or self._pattern_handlers):
                raise RuntimeError(
                    "MessageBroker.start() requires at least one subscription"
                )
            self._thread = self._pubsub.run_in_thread(
                sleep_time=0.01, daemon=True
            )
            self._running = True

    def stop(self) -> None:
        with self._lock:
            self._running = False
            t = self._thread
            self._thread = None
        if t is not None:
            try:
                t.stop()
            except Exception:
                pass
        try:
            self._pubsub.close()
        except Exception:
            pass

    def ping(self) -> bool:
        try:
            return bool(self._pub.ping())
        except Exception:
            return False
