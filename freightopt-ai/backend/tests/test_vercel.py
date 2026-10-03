"""Exercise the exact packaged deployment without importing the source backend."""
from pathlib import Path
import os
import subprocess
import sys

PROJECT = Path(__file__).resolve().parents[2]


def test_release_bundle_matches_source():
    subprocess.run([sys.executable, str(PROJECT / "backend/scripts/package_vercel.py"), "--check"], check=True)


def test_serverless_entrypoint_in_fresh_process(tmp_path):
    code = '''
import runpy
from fastapi.testclient import TestClient
namespace = runpy.run_path(ENTRY)
app = namespace["app"]
client = TestClient(app)  # Deliberately no lifespan context: matches any adapter.
health = client.get("/api/health").json()
assert health["model_ready"] and health["hosting"] == "vercel", health
for path in ["/api/config", "/api/dashboard", "/api/ports", "/api/vessels", "/api/routes", "/api/market/history", "/api/market/overview", "/api/market/forecast", "/api/alerts", "/api/model/metrics", "/openapi.json"]:
    response = client.get(path)
    assert response.status_code == 200, (path, response.text)
base = {"cargo_quantity": 70000, "start_date": "2026-09-20"}
result = client.post("/api/optimize", json=base)
assert result.status_code == 200, result.text
assert result.json()["recommended_vessel"] == "Panamax"
assert result.json()["id"] > 0
low = client.post("/api/simulate", json={**base, "fuel_price_usd":500, "baltic_index":1400, "destination_congestion":20}).json()
high = client.post("/api/simulate", json={**base, "fuel_price_usd":1000, "baltic_index":2600, "destination_congestion":90}).json()
assert high["estimated_total_cost"] > low["estimated_total_cost"]
assert client.post("/api/optimize", json={"cargo_quantity":-1}).status_code == 422
assert client.get("/api/not-found").status_code == 404
print("Packaged API: all read routes, optimizer, simulation, validation passed")
'''
    env = {**os.environ, "VERCEL": "1", "TMPDIR": str(tmp_path)}
    env.pop("DATABASE_URL", None)
    env.pop("PYTHONPATH", None)
    subprocess.run([sys.executable, "-c", f"ENTRY = {str(PROJECT / 'frontend/api/index.py')!r}\n" + code], cwd=tmp_path, env=env, check=True, timeout=40)
