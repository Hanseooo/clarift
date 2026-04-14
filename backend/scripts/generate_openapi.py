#!/usr/bin/env python3
"""
Generate OpenAPI schema for the FastAPI backend.
"""

import json
import sys
from pathlib import Path

# Add the parent directory to sys.path so we can import the app
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app


def main():
    """Generate OpenAPI schema and write to openapi.json."""
    schema = app.openapi()
    output_path = Path(__file__).parent.parent / "openapi.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)
    print(f"OpenAPI schema written to {output_path}")
    print(f"   Total paths: {len(schema.get('paths', {}))}")


if __name__ == "__main__":
    main()
