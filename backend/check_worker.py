#!/usr/bin/env python3
"""Check that run_summary_job is registered in ARQ worker."""

import sys

sys.path.insert(0, "src")

from worker import WorkerSettings

print("ARQ WorkerSettings functions:")
for f in WorkerSettings.functions:
    print(f"  - {f.name}")

# Check if run_summary_job is present
names = [f.name for f in WorkerSettings.functions]
if "run_summary_job" in names:
    print("✓ run_summary_job is registered")
    sys.exit(0)
else:
    print("✗ run_summary_job is missing")
    sys.exit(1)
