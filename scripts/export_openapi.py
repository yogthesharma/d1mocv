"""Print the FastAPI OpenAPI schema as JSON. Used to generate the frontend API types."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.main import app  # noqa: E402

json.dump(app.openapi(), sys.stdout, indent=2)
