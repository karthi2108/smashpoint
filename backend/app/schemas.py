from typing import Literal, Optional

from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class EntriesIn(BaseModel):
    category: str
    names: list[str]


class EntryOut(BaseModel):
    id: int
    category: str
    name: str

    class Config:
        from_attributes = True


class RenameIn(BaseModel):
    side: Literal["a", "b"]
    name: str = Field(min_length=1, max_length=200)


class WalkoverIn(BaseModel):
    winner: Literal["a", "b"]


class BracketMatchOut(BaseModel):
    id: int
    category: str
    round_idx: int
    slot_idx: int
    side_a: Optional[str]
    side_b: Optional[str]
    winner: Optional[str]
    score_text: Optional[str]

    class Config:
        from_attributes = True


class MatchCreate(BaseModel):
    bracket_match_id: Optional[int] = None
    side_a: Optional[str] = None
    side_b: Optional[str] = None
    target: Literal[11, 21, 30] = 21
    best_of: Literal[1, 3] = 3
    match_type: Literal["singles", "doubles"] = "singles"


class PointIn(BaseModel):
    side: Literal["a", "b"]


class MatchOut(BaseModel):
    id: int
    bracket_match_id: Optional[int]
    category: Optional[str]
    side_a: str
    side_b: str
    config: dict
    state: dict
    finished: bool

    class Config:
        from_attributes = True
