from collections import defaultdict

from fastapi import WebSocket


class MatchBroadcaster:
    """Keeps WebSocket subscribers per match id and pushes state updates."""

    def __init__(self) -> None:
        self._subs: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(self, match_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self._subs[match_id].add(ws)

    def disconnect(self, match_id: int, ws: WebSocket) -> None:
        self._subs[match_id].discard(ws)

    async def broadcast(self, match_id: int, payload: dict) -> None:
        dead = []
        for ws in self._subs[match_id]:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._subs[match_id].discard(ws)


broadcaster = MatchBroadcaster()


def match_payload(m) -> dict:
    state = {k: v for k, v in m.state.items() if k != "history"}
    return {
        "id": m.id,
        "category": m.category,
        "side_a": m.side_a,
        "side_b": m.side_b,
        "config": m.config,
        "state": state,
        "finished": m.finished,
    }
