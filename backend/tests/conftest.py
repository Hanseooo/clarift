from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))


@pytest.fixture
def test_user_id() -> str:
    return "00000000-0000-0000-0000-000000000001"
