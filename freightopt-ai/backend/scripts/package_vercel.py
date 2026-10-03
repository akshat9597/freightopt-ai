"""Reproducible, allowlisted runtime bundle for the existing frontend-root deployment.

Run after backend edits; --check fails if the committed bundle is out of date.
Training source and tools remain in backend/; the Vercel bundle contains no secrets,
local databases, virtual environments, or development dependencies.
"""
import io
from pathlib import Path
import sys
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

BACKEND = Path(__file__).resolve().parents[1]
TARGET = BACKEND.parent / "frontend/server/backend.zip"


def bundle():
    paths = sorted((BACKEND / "app").rglob("*.py"))
    paths += [BACKEND / "data" / name for name in [
        "freight_history.csv", "routes.csv", "artifacts/model.joblib",
        "artifacts/preprocessing.joblib", "artifacts/metrics.json",
    ]]
    output = io.BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        for path in sorted(paths):
            if path.name == "train.py":
                continue
            info = ZipInfo(path.relative_to(BACKEND).as_posix(), (2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())
    return output.getvalue()


if __name__ == "__main__":
    content = bundle()
    if "--check" in sys.argv:
        if not TARGET.exists() or TARGET.read_bytes() != content:
            raise SystemExit("Backend bundle is stale: run python backend/scripts/package_vercel.py")
        print("Backend deployment bundle matches source")
    else:
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        TARGET.write_bytes(content)
        print(f"Packaged {len(content):,} bytes into {TARGET}")
