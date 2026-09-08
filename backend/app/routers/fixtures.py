import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..config import CATEGORIES
from ..database import get_db
from ..models import BracketMatch, Entry
from ..schemas import BracketMatchOut, RenameIn, WalkoverIn

router = APIRouter(prefix="/api/fixtures", tags=["fixtures"])


def _check_cat(cat: str) -> str:
    if cat not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Unknown category '{cat}'")
    return cat


def advance_winner(db: Session, bm: BracketMatch, winner: str, score_text: str) -> None:
    """Record the winner and place them into the next round's slot."""
    bm.winner = winner
    bm.score_text = score_text
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
        if bm.slot_idx % 2 == 0:
            nxt.side_a = winner
        else:
            nxt.side_b = winner


@router.get("/{category}", response_model=list[BracketMatchOut])
def get_bracket(category: str, db: Session = Depends(get_db)):
    _check_cat(category)
    return (
        db.query(BracketMatch)
        .filter(BracketMatch.category == category)
        .order_by(BracketMatch.round_idx, BracketMatch.slot_idx)
        .all()
    )


@router.post("/{category}/generate", response_model=list[BracketMatchOut], dependencies=[Depends(require_admin)])
def generate(category: str, db: Session = Depends(get_db)):
    _check_cat(category)
    names = [e.name for e in db.query(Entry).filter(Entry.category == category).all()]
    if len(names) < 2:
        raise HTTPException(status_code=400, detail="Add at least 2 entries first")

    random.shuffle(names)
    size = 2
    while size < len(names):
        size *= 2
    # Fill every match's side A first, then side B, so byes (empty side B slots)
    # are spread across matches instead of piling into all-empty matches.
    half = size // 2
    slots: list[str | None] = [None] * size
    for i, name in enumerate(names):
        if i < half:
            slots[i * 2] = name  # side A of match i
        else:
            slots[(i - half) * 2 + 1] = name  # side B of match i-half

    # wipe any previous draw for this category
    db.query(BracketMatch).filter(BracketMatch.category == category).delete()

    rounds: list[list[BracketMatch]] = []
    n, r = size // 2, 0
    while n >= 1:
        row = [
            BracketMatch(
                category=category,
                round_idx=r,
                slot_idx=i,
                side_a=slots[i * 2] if r == 0 else None,
                side_b=slots[i * 2 + 1] if r == 0 else None,
            )
            for i in range(n)
        ]
        db.add_all(row)
        rounds.append(row)
        n //= 2
        r += 1
    db.flush()

    # auto-advance byes in round 1
    for bm in rounds[0]:
        if bm.side_a and not bm.side_b:
            advance_winner(db, bm, bm.side_a, "walkover (bye)")
        elif bm.side_b and not bm.side_a:
            advance_winner(db, bm, bm.side_b, "walkover (bye)")

    db.commit()
    return get_bracket(category, db)


@router.delete("/{category}", dependencies=[Depends(require_admin)])
def delete_bracket(category: str, db: Session = Depends(get_db)):
    _check_cat(category)
    db.query(BracketMatch).filter(BracketMatch.category == category).delete()
    db.commit()
    return {"ok": True}


@router.patch("/match/{bm_id}", response_model=BracketMatchOut, dependencies=[Depends(require_admin)])
def rename_side(bm_id: int, body: RenameIn, db: Session = Depends(get_db)):
    bm = db.get(BracketMatch, bm_id)
    if not bm:
        raise HTTPException(status_code=404, detail="Fixture match not found")
    if bm.winner:
        raise HTTPException(status_code=400, detail="Match already decided")
    setattr(bm, "side_a" if body.side == "a" else "side_b", body.name.strip())
    db.commit()
    db.refresh(bm)
    return bm


@router.post("/match/{bm_id}/walkover", response_model=BracketMatchOut, dependencies=[Depends(require_admin)])
def walkover(bm_id: int, body: WalkoverIn, db: Session = Depends(get_db)):
    bm = db.get(BracketMatch, bm_id)
    if not bm:
        raise HTTPException(status_code=404, detail="Fixture match not found")
    if bm.winner:
        raise HTTPException(status_code=400, detail="Match already decided")
    winner = bm.side_a if body.winner == "a" else bm.side_b
    if not winner:
        raise HTTPException(status_code=400, detail="That side is empty")
    advance_winner(db, bm, winner, "walkover")
    db.commit()
    db.refresh(bm)
    return bm
