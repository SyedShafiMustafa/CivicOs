"""CIVICOS API entrypoint.

Runs in demo mode by default: deterministic in-memory store + heuristic AI.
Configure SUPABASE_URL/SUPABASE_SERVICE_KEY for the future persistence
adapter, or OPENAI_API_KEY for live vision/LLM calls.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.routers import complaints, core, incidents, notifications, ops, reports, verify

logging.basicConfig(level=logging.INFO)

app = FastAPI(title=config.API_TITLE, version=config.API_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (core.router, incidents.router, reports.router, verify.router,
               complaints.router, notifications.router, ops.router):
    app.include_router(router, prefix="/api")
