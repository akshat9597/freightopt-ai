"""Optional Render build step: validate or rebuild artifacts before serving traffic."""
import logging
from app.config import DATA
from app.ml.predict import ForecastService


def prepare():
    logging.basicConfig(level=logging.INFO)
    if not (DATA / "freight_history.csv").exists() or not (DATA / "routes.csv").exists():
        from scripts.generate_dataset import generate_dataset
        generate_dataset()
    try:
        ForecastService()
    except (FileNotFoundError, ValueError, OSError, EOFError, KeyError, ImportError):
        from app.ml.train import train
        train()
    logging.info("Deployment model validated; no runtime training needed")


if __name__ == "__main__":
    prepare()
