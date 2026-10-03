"""Same-origin FastAPI entrypoint; no requests are forwarded to Render."""
import hashlib
import os
from pathlib import Path
import sys
import tempfile
from zipfile import ZipFile

# Only the trusted, allowlisted release archive is extracted. /tmp is writable
# on Vercel; the deployed application directory is read-only.
archive = Path(__file__).resolve().parents[1] / "server/backend.zip"
release = hashlib.sha256(archive.read_bytes()).hexdigest()[:16]
runtime = Path(tempfile.gettempdir()) / f"freightopt-{release}"
if not (runtime / ".ready").exists():
    runtime.mkdir(parents=True, exist_ok=True)
    with ZipFile(archive) as package:
        for name in package.namelist():
            target = (runtime / name).resolve()
            if not target.is_relative_to(runtime.resolve()):
                raise RuntimeError("Invalid runtime bundle path")
        package.extractall(runtime)
    (runtime / ".ready").touch()

os.environ.setdefault("DATABASE_URL", f"sqlite:///{runtime / 'freightopt.db'}")
os.environ["FREIGHTOPT_HOSTED"] = "true"
# Prevent native numerical libraries from starting excessive worker threads.
for name in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ.setdefault(name, "1")
sys.path.insert(0, str(runtime))
from app.main import app, initialize

# Initialize once per warm worker even on ASGI adapters without lifespan support.
initialize(app)
