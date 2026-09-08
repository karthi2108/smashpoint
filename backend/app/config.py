import os

# PostgreSQL in production; falls back to SQLite for a zero-setup local run.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./smashpoint.db",  # e.g. postgresql+psycopg2://smash:smash@localhost:5432/smashpoint
)
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

CATEGORIES = {
    "MS": {"label": "Men's singles", "type": "singles"},
    "MD": {"label": "Men's doubles", "type": "doubles"},
    "WS": {"label": "Women's singles", "type": "singles"},
    "WD": {"label": "Women's doubles", "type": "doubles"},
    "XD": {"label": "Mixed doubles", "type": "doubles"},
}
CAPS = {11: 15, 21: 30, 30: 35}  # sudden-death cap per game target
