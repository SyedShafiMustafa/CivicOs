"""CIVICOS backend configuration.

All values are environment-driven; the prototype defaults to demo mode
(deterministic in-memory store + heuristic AI) when credentials are absent.
"""
from __future__ import annotations

import os

# --- Runtime -----------------------------------------------------------------
API_TITLE = "CIVICOS API"
API_VERSION = "0.1.0"

FRONTEND_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "FRONTEND_ORIGINS",
        # :3000 desktop app · :3001 iOS prototype · :3002 field-survey prototype
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001,"
        "http://localhost:3002,http://127.0.0.1:3002",
    ).split(",")
    if o.strip()
]

# The prototype has no auth; a single demo citizen is assumed.
DEMO_USER_ID = "u-tanisha"

# Origin that serves public/evidence and public/avatars for the demo imagery.
# Defaults to the local desktop host; on Vercel set this to the deployment URL
# (or any host serving the frontend's public/ directory).
ASSET_ORIGIN = os.getenv("ASSET_ORIGIN", "http://localhost:3000").rstrip("/")

# Demo user's approximate home location (Banjara Hills, Hyderabad).
USER_LOCATION = (17.4127, 78.4350)

# --- Supabase (future; demo store used when unset) ----------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", os.getenv("SUPABASE_KEY", ""))
SUPABASE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "civicos-evidence")

# --- Live AI providers (optional) ---------------------------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_VISION_MODEL = os.getenv("OPENAI_VISION_MODEL", "gpt-4o-mini")
OPENAI_TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")

# Demo-mode invariants: the "current day" of the seeded world is fixed so the
# demo is deterministic regardless of when it is run.
DEMO_TODAY = (2026, 9, 20)
