"""Chronological train/validation/test evaluation, then production refit."""

import json
import logging
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.inspection import permutation_importance
from app.config import DATA, ARTIFACTS
from app.ml.features import engineer, CATEGORICAL, NUMERIC, FEATURES

logger = logging.getLogger(__name__)


def metrics(y, p):
    return {
        "mae": round(float(mean_absolute_error(y, p)), 3),
        "rmse": round(float(np.sqrt(mean_squared_error(y, p))), 3),
        "r2": round(float(r2_score(y, p)), 4),
    }


def train():
    ARTIFACTS.mkdir(exist_ok=True, parents=True)
    raw = pd.read_csv(DATA / "freight_history.csv").drop_duplicates()
    raw["freight_rate_usd_per_tonne"] = pd.to_numeric(
        raw.freight_rate_usd_per_tonne, errors="coerce"
    )
    raw = raw.dropna(subset=["date", "freight_rate_usd_per_tonne"]).sort_values("date")
    df = engineer(raw, raw).sort_values("date")
    dates = df.date.unique()
    val_date = dates[int(len(dates) * 0.70)]
    test_date = dates[int(len(dates) * 0.85)]
    training = df[df.date < val_date]
    validation = df[(df.date >= val_date) & (df.date < test_date)]
    testing = df[df.date >= test_date]

    def make_pipeline(model):
        preprocessing = ColumnTransformer(
            [
                (
                    "numeric",
                    Pipeline(
                        [
                            ("impute", SimpleImputer(strategy="median")),
                            ("scale", StandardScaler()),
                        ]
                    ),
                    NUMERIC,
                ),
                (
                    "category",
                    Pipeline(
                        [
                            ("impute", SimpleImputer(strategy="most_frequent")),
                            (
                                "encode",
                                OneHotEncoder(
                                    handle_unknown="ignore", sparse_output=False
                                ),
                            ),
                        ]
                    ),
                    CATEGORICAL,
                ),
            ]
        )
        return Pipeline([("preprocessing", preprocessing), ("model", model)])

    candidates = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(
            n_estimators=100,
            min_samples_leaf=3,
            max_depth=18,
            n_jobs=-1,
            random_state=26006,
        ),
        "Gradient Boosting": GradientBoostingRegressor(
            n_estimators=180,
            max_depth=4,
            learning_rate=0.075,
            loss="huber",
            random_state=26006,
        ),
    }
    fitted = {}
    scores = []
    for name, estimator in candidates.items():
        logger.info("Training %s on %s records", name, len(training))
        pipeline = make_pipeline(estimator).fit(
            training[FEATURES], training.freight_rate_usd_per_tonne
        )
        fitted[name] = pipeline
        scores.append(
            {
                "model": name,
                "validation": metrics(
                    validation.freight_rate_usd_per_tonne,
                    pipeline.predict(validation[FEATURES]),
                ),
                "test": metrics(
                    testing.freight_rate_usd_per_tonne,
                    pipeline.predict(testing[FEATURES]),
                ),
            }
        )
    selected = min(scores, key=lambda s: s["validation"]["rmse"])["model"]
    pipeline = fitted[selected]
    residual = validation.freight_rate_usd_per_tonne - pipeline.predict(
        validation[FEATURES]
    )
    importance = permutation_importance(
        pipeline,
        validation[FEATURES],
        validation.freight_rate_usd_per_tonne,
        n_repeats=2,
        random_state=26006,
        scoring="neg_mean_absolute_error",
    )
    values = np.maximum(importance.importances_mean, 0)
    total = max(float(values.sum()), 1e-9)
    test_predictions = pipeline.predict(testing[FEATURES])
    sample = testing.assign(predicted=test_predictions).iloc[
        :: max(1, len(testing) // 60)
    ]
    report = {
        "selected_model": selected,
        "training_records": len(training),
        "validation_records": len(validation),
        "testing_records": len(testing),
        "production_training_records": len(df),
        "metrics": next(s["test"] for s in scores if s["model"] == selected),
        "models": scores,
        "residual_std": float(np.std(residual)),
        "feature_importance": sorted(
            [
                {"feature": name, "importance": round(float(value / total * 100), 2)}
                for name, value in zip(FEATURES, values)
            ],
            key=lambda a: -a["importance"],
        ),
        "predictions": [
            {
                "date": r.date.date().isoformat(),
                "actual": round(r.freight_rate_usd_per_tonne, 2),
                "predicted": round(r.predicted, 2),
            }
            for r in sample.itertuples()
        ],
        "train_end": str(pd.Timestamp(val_date).date()),
        "test_start": str(pd.Timestamp(test_date).date()),
        "data_start": str(df.date.min().date()),
        "data_end": str(df.date.max().date()),
        "evaluation_note": "Models selected by chronological validation RMSE; test metrics are held out. These are conditional one-step estimates using observed exogenous inputs, not verified 90-day market forecasting accuracy. Production model is subsequently refit on all synthetic records. Bands use validation residual spread plus horizon expansion; they are heuristic, not calibrated probabilities.",
    }
    pipeline.fit(df[FEATURES], df.freight_rate_usd_per_tonne)
    joblib.dump(pipeline, ARTIFACTS / "model.joblib")
    joblib.dump(
        pipeline.named_steps["preprocessing"], ARTIFACTS / "preprocessing.joblib"
    )
    (ARTIFACTS / "metrics.json").write_text(json.dumps(report, indent=2))
    logger.info("Selected %s; held-out metrics: %s", selected, report["metrics"])
    return report


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train()
