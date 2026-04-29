import inspect

import pytest


@pytest.mark.asyncio
async def test_sse_poll_interval_is_half_second():
    """Poll interval should be 0.5s for responsive updates."""
    from src.api.routers.jobs import stream_job_progress

    source = inspect.getsource(stream_job_progress)
    assert "poll_interval = 0.5" in source or "await asyncio.sleep(0.5)" in source
