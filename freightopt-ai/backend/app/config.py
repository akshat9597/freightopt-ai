from pathlib import Path
import os
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT.parent / ".env")
DATA = ROOT / "data"
ARTIFACTS = DATA / "artifacts"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA / 'freightopt.db'}")
USD_INR = float(os.getenv("DEMO_USD_INR", "83.5"))
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
DEMO_DATE = os.getenv("DEMO_DATE", "2026-09-13")
DISCLAIMER = "Demo environment: Freight, port, congestion and market values shown in this prototype may include synthetic or representative data. Production deployment should integrate validated data from approved maritime, port and market-data providers."
PORT_DISCLAIMER = (
    "Demonstration data — replace with official port authority data for production."
)
