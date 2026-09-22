"""Supabase store — future persistence adapter (skeleton).

The DemoStore already implements the full domain surface. This adapter wires
the same interface to Supabase Postgres (schema in supabase/schema.sql) and
Supabase Storage for evidence images. It activates only when SUPABASE_URL and
SUPABASE_SERVICE_KEY are configured; otherwise main.py serves the demo store.

Intentionally not implemented in the prototype: swapping it in is a focused
follow-up (queries map 1:1 to the demo store's access patterns).
"""
from __future__ import annotations

from app import config


class SupabaseNotConfigured(RuntimeError):
    """Raised when the Supabase adapter is used without credentials."""


class SupabaseStore:
    """Same surface as DemoStore, backed by Supabase Postgres + Storage."""

    def __init__(self) -> None:
        if not (config.SUPABASE_URL and config.SUPABASE_KEY):
            raise SupabaseNotConfigured(
                "Set SUPABASE_URL and SUPABASE_SERVICE_KEY to enable the Supabase store."
            )
        # from supabase import create_client  # add `supabase` to requirements
        # self.client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
        raise NotImplementedError("Supabase adapter ships after the prototype demo.")
