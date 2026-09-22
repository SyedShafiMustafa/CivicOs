"""Lightweight deterministic embeddings for demo mode.

A 64-dim feature-hashing vector with a category block, severity block,
text-token block and optional image block. Same inputs -> same vector, so
similarity scores are reproducible. In production this interface swaps for a
real CLIP/text embedding model without touching callers.
"""
from __future__ import annotations

import hashlib
import math
import re

DIM = 64
_CATS = ["roads", "garbage", "water", "streetlights", "drainage", "accessibility", "other"]
_SEVS = ["low", "medium", "high", "critical"]
_TOKEN_DIMS = 44  # dims 12..55
_IMG_DIMS = 8     # dims 56..63


def _h(s: str) -> int:
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


def embed(text: str, issue_type: str, severity: str, image_ref: str = "") -> list[float]:
    v = [0.0] * DIM
    if issue_type in _CATS:
        v[_CATS.index(issue_type)] = 3.0
    if severity in _SEVS:
        v[8 + _SEVS.index(severity)] = 1.2
    tokens = set(re.findall(r"[a-z0-9]+", (text or "").lower()))
    tokens.add(issue_type)
    for t in tokens:
        if t:
            v[12 + (_h(t) % _TOKEN_DIMS)] += 1.0
    if image_ref:
        v[56 + (_h(image_ref) % _IMG_DIMS)] += 1.0
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [round(x / n, 6) for x in v]


def cosine(a: list[float] | None, b: list[float] | None) -> float:
    if not a or not b:
        return 0.0
    n = min(len(a), len(b))
    dot = sum(a[i] * b[i] for i in range(n))
    na = math.sqrt(sum(x * x for x in a[:n])) or 1.0
    nb = math.sqrt(sum(x * x for x in b[:n])) or 1.0
    return max(0.0, min(1.0, dot / (na * nb)))
