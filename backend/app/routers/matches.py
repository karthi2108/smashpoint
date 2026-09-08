from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session, attributes

from ..auth import require_admin
from ..config import CAPS, CATEGORIES
from ..database import SessionLocal, get_db
from ..models import BracketMatch, Match
from ..routers.fixtures import advance_winner
from ..schemas import MatchCreate, MatchOut, PointIn
from ..scoring import apply_point, new_state, undo
from ..ws import broadcaster, match_payload

router = APIRouter(tags=["matches"])


@router.get("/api/matches", response_model=list[MatchOut])
def list_matches(db: Session = Depends(get_db)):
    return db.query(Match).order_by(Match.id.desc()).all()


@router.get("/api/matches/{match_id}", response_model=MatchOut)
def get_match(match_id: int, db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    return m


@router.post("/api/matches", response_model=MatchOut, dependencies=[Depends(require_admin)])
def create_match(body: MatchCreate, db: Session = Depends(get_db)):
    side_a, side_b, category, match_type = body.side_a, body.side_b, None, body.match_type

    if body.bracket_match_id:
        bm = db.get(BracketMatch, body.bracket_match_id)
        if not bm:
            raise HTTPException(status_code=404, detail="Fixture match not found")
        if bm.winner:
            raise HTTPException(status_code=400, detail="Fixture match already decided")
        if not (bm.side_a and bm.side_b):
            raise HTTPException(status_code=400, detail="Both sides are not filled yet")
        existing = (
            db.query(Match)
            .filter(Match.bracket_match_id == bm.id, Match.finished.is_(False))
            .first()
        )
        if existing:
            return existing
        side_a, side_b, category = bm.side_a, bm.side_b, bm.category
        match_type = CATEGORIES[bm.category]["type"]

    if not side_a or not side_b:
        raise HTTPException(status_code=400, detail="Both side names are required")
    if side_a == side_b:
        raise HTTPException(status_code=400, detail="Side A and side B must differ")

    m = Match(
        bracket_match_id=body.bracket_match_id,
        category=category,
        side_a=side_a,
        side_b=side_b,
        config={
            "target": body.target,
            "best_of": body.best_of,
            "match_type": match_type,
            "cap": CAPS.get(body.target, body.target + 9),
        },
        state=new_state(),
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


async def _mutate_and_broadcast(db: Session, m: Match) -> None:
    attributes.flag_modified(m, "state")
    db.commit()
    db.refresh(m)
    await broadcaster.broadcast(m.id, match_payload(m))


@router.post("/api/matches/{match_id}/point", response_model=MatchOut, dependencies=[Depends(require_admin)])
async def score_point(match_id: int, body: PointIn, db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    if m.finished:
        raise HTTPException(status_code=400, detail="Match already finished")

    result = apply_point(m.state, m.config, body.side, m.side_a, m.side_b)
    if result["finished"]:
        m.finished = True
        if m.bracket_match_id:
            bm = db.get(BracketMatch, m.bracket_match_id)
            if bm and not bm.winner:
                advance_winner(db, bm, result["winner"], result["score_text"])
    await _mutate_and_broadcast(db, m)
    return m


@router.post("/api/matches/{match_id}/undo", response_model=MatchOut, dependencies=[Depends(require_admin)])
async def undo_point(match_id: int, db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    if not undo(m.state):
        raise HTTPException(status_code=400, detail="Nothing to undo")
    if m.finished:
        m.finished = False
        if m.bracket_match_id:
            bm = db.get(BracketMatch, m.bracket_match_id)
            if bm:
                # roll back the bracket result and any advancement
                nxt = (
                    db.query(BracketMatch)
                    .filter(
                        BracketMatch.category == bm.category,
                        BracketMatch.round_idx == bm.round_idx + 1,
                        BracketMatch.slot_idx == bm.slot_idx // 2,
                    )
                    .first()
                )
                if nxt:
                    if bm.slot_idx % 2 == 0 and nxt.side_a == bm.winner:
                        nxt.side_a = None
                    elif bm.slot_idx % 2 == 1 and nxt.side_b == bm.winner:
                        nxt.side_b = None
                bm.winner = None
                bm.score_text = None
    await _mutate_and_broadcast(db, m)
    return m


@router.delete("/api/matches/{match_id}", dependencies=[Depends(require_admin)])
async def abandon_match(match_id: int, db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    db.delete(m)
    db.commit()
    await broadcaster.broadcast(match_id, {"deleted": True, "id": match_id})
    return {"ok": True}


@router.websocket("/ws/matches/{match_id}")
async def match_ws(websocket: WebSocket, match_id: int):
    await broadcaster.connect(match_id, websocket)
    db = SessionLocal()
    try:
        m = db.get(Match, match_id)
        if m:
            await websocket.send_json(match_payload(m))
    finally:
        db.close()
    try:
        while True:
            await websocket.receive_text()  # keepalive; clients don't need to send
    except WebSocketDisconnect:
        broadcaster.disconnect(match_id, websocket)
