from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth import hash_password
from .config import ADMIN_PASSWORD, ADMIN_USERNAME, CATEGORIES
from .database import Base, SessionLocal, engine
from .models import User
from .routers import auth_routes, fixtures, matches, players


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == ADMIN_USERNAME).first():
            db.add(
                User(
                    username=ADMIN_USERNAME,
                    password_hash=hash_password(ADMIN_PASSWORD),
                    role="admin",
                )
            )
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(title="SmashPoint API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(players.router)
app.include_router(fixtures.router)
app.include_router(matches.router)


@app.get("/api/categories")
def categories():
    return CATEGORIES


@app.get("/api/health")
def health():
    return {"status": "ok"}
