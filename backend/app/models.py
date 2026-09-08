from sqlalchemy import JSON, Boolean, Column, ForeignKey, Integer, String

from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False, default="viewer")  # admin | viewer


class Entry(Base):
    """A tournament entry: a player (singles) or a pair 'P1 / P2' (doubles)."""

    __tablename__ = "entries"
    id = Column(Integer, primary_key=True)
    category = Column(String(4), nullable=False, index=True)  # MS/MD/WS/WD/XD
    name = Column(String(200), nullable=False)


class BracketMatch(Base):
    """One slot in a knockout draw. round_idx 0 = first round."""

    __tablename__ = "bracket_matches"
    id = Column(Integer, primary_key=True)
    category = Column(String(4), nullable=False, index=True)
    round_idx = Column(Integer, nullable=False)
    slot_idx = Column(Integer, nullable=False)
    side_a = Column(String(200), nullable=True)
    side_b = Column(String(200), nullable=True)
    winner = Column(String(200), nullable=True)
    score_text = Column(String(200), nullable=True)


class Match(Base):
    """A live/completed scored match with full badminton state."""

    __tablename__ = "matches"
    id = Column(Integer, primary_key=True)
    bracket_match_id = Column(Integer, ForeignKey("bracket_matches.id"), nullable=True)
    category = Column(String(4), nullable=True)
    side_a = Column(String(200), nullable=False)
    side_b = Column(String(200), nullable=False)
    config = Column(JSON, nullable=False)  # {target, best_of, match_type, cap}
    state = Column(JSON, nullable=False)  # {pts, sets_won, set_log, server, note, history}
    finished = Column(Boolean, default=False, nullable=False)
