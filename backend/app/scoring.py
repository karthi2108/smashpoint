"""Badminton rally-point scoring engine.

State shape:
    {
      "pts": {"a": 0, "b": 0},
      "sets_won": {"a": 0, "b": 0},
      "set_log": [[21, 15], ...],
      "server": "a" | "b",
      "note": str,
      "history": [snapshot, ...],   # for undo
    }
Config shape:
    {"target": 21, "best_of": 3, "match_type": "singles", "cap": 30}

Rules implemented:
- Rally point: every rally scores.
- Deuce at target-1 all: play continues until 2-point lead, sudden death at cap.
- Mid-game interval when the leader first reaches floor(target/2)+1.
- Winner of the rally serves next; service court = right on even score, left on odd.
"""

from copy import deepcopy


def new_state() -> dict:
    return {
        "pts": {"a": 0, "b": 0},
        "sets_won": {"a": 0, "b": 0},
        "set_log": [],
        "server": "a",
        "note": "",
        "history": [],
    }


def interval_at(target: int) -> int:
    return target // 2 + 1


def _snapshot(state: dict) -> dict:
    return {k: deepcopy(state[k]) for k in ("pts", "sets_won", "set_log", "server", "note")}


def apply_point(state: dict, config: dict, side: str, name_a: str, name_b: str) -> dict:
    """Award a rally to `side`. Returns {"finished": bool, "winner": str|None, "score_text": str|None}."""
    other = "b" if side == "a" else "a"
    state["history"].append(_snapshot(state))
    state["pts"][side] += 1
    state["server"] = side
    state["note"] = ""

    target, cap = config["target"], config["cap"]
    p, o = state["pts"][side], state["pts"][other]
    side_name = name_a if side == "a" else name_b

    iv = interval_at(target)
    if p == iv and o < iv:
        state["note"] = f"Interval — {side_name} leads at the mid-game break."
    if p == target - 1 and o == target - 1:
        state["note"] = f"{target - 1} all — setting. Win by 2, sudden death at {cap}."

    game_won = (p >= target and p - o >= 2) or p == cap
    if not game_won:
        return {"finished": False, "winner": None, "score_text": None}

    state["set_log"].append([state["pts"]["a"], state["pts"]["b"]])
    state["sets_won"][side] += 1
    need = (config["best_of"] + 1) // 2

    if state["sets_won"][side] == need:
        score_text = ", ".join(f"{a}\u2013{b}" for a, b in state["set_log"])
        state["note"] = f"Match won by {side_name} — {score_text}"
        return {"finished": True, "winner": side_name, "score_text": score_text}

    state["pts"] = {"a": 0, "b": 0}
    game_no = len(state["set_log"])
    state["note"] = f"Game {game_no} to {side_name}. Change ends — game {game_no + 1}."
    return {"finished": False, "winner": None, "score_text": None}


def undo(state: dict) -> bool:
    """Revert the last rally. Returns True if something was undone."""
    if not state["history"]:
        return False
    snap = state["history"].pop()
    for k, v in snap.items():
        state[k] = v
    return True
