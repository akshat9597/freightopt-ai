from contextlib import asynccontextmanager
import logging
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import DATA, CORS_ORIGINS
from app.database.seed import seed
from app.ml.train import train
from app.ml.predict import ForecastService

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting FreightOpt AI demo initialization")
    if (
        not (DATA / "freight_history.csv").exists()
        or not (DATA / "routes.csv").exists()
    ):
        from scripts.generate_dataset import generate_dataset

        generate_dataset()
    try:
        app.state.forecaster = ForecastService()
    except (
        FileNotFoundError,
        ValueError,
        OSError,
        EOFError,
        KeyError,
        json.JSONDecodeError,
        ModuleNotFoundError,
    ):
        logger.info("Model unavailable; training bundled synthetic models")
        train()
        app.state.forecaster = ForecastService()
    seed()
    logger.info("FreightOpt AI ready: data, trained model and database initialized")
    yield


app = FastAPI(
    title="FreightOpt AI",
    version="1.0.0",
    description="SIH26006 — synthetic freight forecasting and chartering intelligence",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
from app.api.routes import router

app.include_router(router, prefix="/api")
