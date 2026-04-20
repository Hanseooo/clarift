# Clarift Backend (FastAPI, AI, ARQ Workers)

All backend setup, testing, and deployment instructions are found in `../docs/dev/stack-setup.md`.

**Always use a Python virtual environment (`.venv`) for all dependency management, testing, and backend commands. Do not install Python packages globally.**

- Install dependencies (**always inside .venv**):
  - Recommended: Use [`uv`](https://github.com/astral-sh/uv) for best performance and reproducibility.
    ```bash
    uv venv
    source .venv/bin/activate  # Windows: .venv\Scripts\activate
    uv pip install -r requirements.txt
    ```
  - Fallback:
    ```bash
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    ```
  - **Never install Python packages globally or outside a `.venv`!**
- For migrations, always use Alembic (never Drizzle for DB schema):
  ```bash
  alembic upgrade head
  ```
- For running the API:
  ```bash
  uvicorn app.main:app --reload
  ```

**ARQ Worker Note**

> The ARQ worker now loads all environment variables from your `.env` file automatically at startup (via [python-dotenv](https://pypi.org/project/python-dotenv/)). Keep your `GEMINI_API_KEY` and all secrets in `.env` and they will be available for background processing.

See `../docs/dev/stack-setup.md` for full detail.
