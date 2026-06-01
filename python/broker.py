"""
broker.py — Redis Pub/Sub message broker wrapper.

EVENT-DRIVEN architecture:
  This module is the communication backbone of HotelOS.  Services never call
  each other directly.  Instead:
    - Publishers call broker.publish(channel, data)
    - Subscribers register handlers with broker.subscribe(channel, handler)
    - When an event arrives, every registered handler is called automatically.

  This decouples services: ReceptionService does not know HousekeepingService
  exists — it simply publishes "room.vacated" and Housekeeping reacts.

  Two separate Redis connections are used deliberately:
    - _pub  : blocking publish calls (can be called from any thread)
    - _sub_conn / _pubsub : subscription listener (runs in its own thread)
  Using one connection for both would cause deadlocks in redis-py.
"""

from __future__ import annotations

import fnmatch
import json
import threading
from typing import Callable, Dict, List

import redis

HandlerFn        = Callable[[dict], None]
PatternHandlerFn = Callable[[str, dict], None]


class MessageBroker:
    """
    Thin wrapper around Redis Pub/Sub.

    EVENT-DRIVEN example — publish side:
        broker.publish("room.vacated", {"room_number": "204", ...})
        → Redis fans the message to every subscribed listener.

    EVENT-DRIVEN example — subscribe side:
        broker.subscribe("room.vacated", self._on_room_vacated)
        → _on_room_vacated(data) is called automatically on every event.
    """

    def __init__(self, host: str = "localhost", port: int = 6379, db: int = 0):
        self._host     = host
        self._port     = port
        self._db       = db

        # Separate connections: one for publishing, one for subscribing.
        self._pub       = redis.Redis(host=host, port=port, db=db, decode_responses=True)
        self._sub_conn  = redis.Redis(host=host, port=port, db=db, decode_responses=True)
        self._pubsub    = self._sub_conn.pubsub(ignore_subscribe_messages=True)

        self._handlers:         Dict[str, List[HandlerFn]]        = {}
        self._pattern_handlers: Dict[str, List[PatternHandlerFn]] = {}
        self._thread  = None
        self._lock    = threading.RLock()
        self._running = False

        # Verify connection, but don't crash if unavailable at startup
        try:
            self._pub.ping()
            self._connected = True
        except Exception as exc:
            print(f"[broker] Redis ping failed at startup: {exc!r}. Running in disconnected/local fallback mode.")
            self._connected = False

    # ---- Publish ----------------------------------------------------------

    def publish(self, channel: str, data: dict) -> int:
        """
        Publish an event on a named channel.
        If Redis is connected, fans the message to Redis.
        If Redis is disconnected, dispatches directly to local subscribers.
        """
        if not self._connected:
            self._dispatch_local(channel, data)
            return 0
        try:
            payload = json.dumps(data, default=str)
            return self._pub.publish(channel, payload)
        except Exception as exc:
            print(f"[broker] publish error on {channel}: {exc!r}. Dispatching locally.")
            self._dispatch_local(channel, data)
            return 0

    # ---- Subscribe --------------------------------------------------------

    def subscribe(self, channel: str, handler: HandlerFn) -> None:
        """Register handler to be called whenever channel receives a message."""
        with self._lock:
            new = channel not in self._handlers
            self._handlers.setdefault(channel, []).append(handler)
            if new and self._connected:
                try:
                    self._pubsub.subscribe(**{channel: self._dispatch})
                except Exception as exc:
                    print(f"[broker] Failed to subscribe to Redis channel {channel}: {exc!r}")

    def subscribe_pattern(self, pattern: str, handler: PatternHandlerFn) -> None:
        """
        Register handler for all channels matching a glob pattern.
        """
        with self._lock:
            new = pattern not in self._pattern_handlers
            self._pattern_handlers.setdefault(pattern, []).append(handler)
            if new and self._connected:
                try:
                    self._pubsub.psubscribe(**{pattern: self._dispatch_pattern})
                except Exception as exc:
                    print(f"[broker] Failed to subscribe to Redis pattern {pattern}: {exc!r}")

    # ---- Dispatch ---------------------------------------------------------

    def _dispatch_local(self, channel: str, data: dict) -> None:
        """Fallback local dispatcher used in offline mode."""
        for h in list(self._handlers.get(channel, [])):
            try:
                h(data)
            except Exception as exc:
                print(f"[broker-local] handler error on {channel}: {exc!r}")
        for pattern, handlers in list(self._pattern_handlers.items()):
            if fnmatch.fnmatch(channel, pattern):
                for h in handlers:
                    try:
                        h(channel, data)
                    except Exception as exc:
                        print(f"[broker-local] pattern handler error on {channel} for {pattern}: {exc!r}")

    def _decode(self, raw) -> dict:
        """Safely decode JSON payload; return empty dict on failure."""
        if raw is None:
            return {}
        try:
            return json.loads(raw)
        except (TypeError, ValueError):
            return {"raw": raw}

    def _dispatch(self, message: dict) -> None:
        """Called by the redis-py listener thread for exact-channel subscriptions."""
        channel = message.get("channel")
        data    = self._decode(message.get("data"))
        for h in list(self._handlers.get(channel, [])):
            try:
                h(data)
            except Exception as exc:
                # Errors in handlers must not crash the listener thread.
                print(f"[broker] handler error on {channel}: {exc!r}")

    def _dispatch_pattern(self, message: dict) -> None:
        """Called by the redis-py listener thread for pattern subscriptions."""
        pattern = message.get("pattern")
        channel = message.get("channel")
        data    = self._decode(message.get("data"))
        for h in list(self._pattern_handlers.get(pattern, [])):
            try:
                h(channel, data)
            except Exception as exc:
                print(f"[broker] pattern handler error on {channel}: {exc!r}")

    # ---- Lifecycle --------------------------------------------------------

    def start(self) -> None:
        """Start the background listener thread. Must have at least one subscription."""
        with self._lock:
            if self._running:
                return
            if not (self._handlers or self._pattern_handlers):
                raise RuntimeError(
                    "MessageBroker.start() requires at least one subscription"
                )
            self._thread  = self._pubsub.run_in_thread(
                sleep_time=0.01,
                daemon=True,
                exception_handler=self._handle_listener_exception,
            )
            self._running = True

    def _handle_listener_exception(self, exc, _pubsub, _thread) -> None:
        """Prevent Redis listener errors from escaping the worker thread."""
        with self._lock:
            running = self._running
        if running:
            print(f"[broker] listener error: {exc!r}")

    def stop(self) -> None:
        """Stop the listener thread and close connections cleanly."""
        with self._lock:
            self._running = False
            t = self._thread
            self._thread  = None
        if t is not None:
            try:
                t.stop()
            except Exception:
                pass
            try:
                t.join(timeout=1.0)
            except Exception:
                pass
        try:
            self._pubsub.close()
        except Exception:
            pass
        try:
            self._pub.close()
        except Exception:
            pass
        try:
            self._sub_conn.close()
        except Exception:
            pass

    def ping(self) -> bool:
        """Health check: returns True if Redis is reachable."""
        try:
            return bool(self._pub.ping())
        except Exception:
            return False
