"""One-shot fetcher for CIVICOS demo assets.

Evidence photos: real photographs sourced from Wikimedia Commons (CC-licensed,
keyless API) for each civic issue category, downloaded at 640px into
`public/evidence/`.

Profile avatars: AI-generated portraits from xsgames.co/randomusers (a freely
hosted set of GAN-generated faces — no real person is depicted), downloaded
into `public/avatars/` keyed by seed user id.

Re-running is safe: files already present are left alone (deterministic set).
"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
EV = PUBLIC / "evidence"
AV = PUBLIC / "avatars"

UA = {"User-Agent": "CIVICOS-demo-asset-fetcher/1.0 (prototype; contact: local)"}

# category -> list of (search query, how many photos we want); tried in order
EVIDENCE = {
    "roads":        [("pothole damaged road asphalt", 4)],
    "roads-2":      [("cracked road surface asphalt", 2)],
    "garbage":      [("garbage litter street India", 4), ("garbage pile street", 2)],
    "water":        [("water pipe leak street", 3), ("leaking water pipe road", 2), ("burst water pipe", 2)],
    "streetlights": [("street lamp pole night", 3)],
    "drainage":     [("open street drain water India", 3)],
    "accessibility": [("broken sidewalk pavement slabs", 3), ("cracked pavement footpath", 3), ("uneven sidewalk", 2)],
    "after":        [("fresh asphalt patch repaired road", 3), ("road repair asphalt patch", 3), ("asphalt paving", 2)],
    "after-clean":  [("clean pavement street India", 2), ("clean street sidewalk", 2)],
}

# uid -> (gender folder, avatar index) — AI-generated faces, deterministic picks
AVATARS = {
    "u-tanisha":  ("female", 21), "u-rahul":    ("male", 12),
    "u-priya":    ("female", 33), "u-arjun":    ("male", 25),
    "u-meghana":  ("female", 45), "u-farhan":   ("male", 38),
    "u-sneha":    ("female", 52), "u-vikram":   ("male", 47),
    "u-divya":    ("female", 61), "u-karthik":  ("male", 56),
    "u-ananya":   ("female", 68), "u-rohit":    ("male", 63),
    "u-imran":    ("male", 71),   "u-lakshmi":  ("female", 76),
    "u-nikhil":   ("male", 82),   "u-sara":     ("female", 85),
    "u-deepak":   ("male", 88),   "u-swathi":   ("female", 92),
}


def _get(url: str, timeout: int = 30) -> bytes | None:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except Exception as e:  # noqa: BLE001 — prototype fetcher, log and continue
        print(f"  !! {type(e).__name__}: {url[:110]}")
        return None


def _is_jpeg(b: bytes) -> bool:
    return len(b) > 12_000 and b[:3] == b"\xff\xd8\xff"


def commons_search(query: str, want: int) -> list[str]:
    """Return up to `want` jpeg thumb URLs from Wikimedia Commons."""
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}",
        "gsrnamespace": "6",
        "gsrlimit": "24",
        "prop": "imageinfo",
        "iiprop": "url|mime|size",
        "iiurlwidth": "640",
        "format": "json",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    raw = _get(url)
    if not raw:
        return []
    try:
        pages = json.loads(raw).get("query", {}).get("pages", {})
    except json.JSONDecodeError:
        return []
    urls: list[str] = []
    for p in sorted(pages.values(), key=lambda x: x.get("index", 99)):
        infos = p.get("imageinfo") or []
        if not infos:
            continue
        info = infos[0]
        if info.get("mime") not in ("image/jpeg",):
            continue
        if (info.get("width") or 0) < 500 or (info.get("height") or 0) < 320:
            continue
        thumb = info.get("thumburl") or info.get("url")
        if thumb:
            urls.append(thumb)
        if len(urls) >= want:
            break
    return urls


def fetch_evidence() -> None:
    EV.mkdir(parents=True, exist_ok=True)
    for cat, plans in EVIDENCE.items():
        want_total = sum(w for _, w in plans)
        got = sum(1 for i in range(want_total) if (EV / f"{cat}-{i + 1}.jpg").exists())
        if got >= want_total:
            print(f"evidence/{cat}: already complete ({got}/{want_total})")
            continue
        for query, want in plans:
            print(f"evidence/{cat}: searching '{query}' (have {got}/{want_total})")
            for i, url in enumerate(commons_search(query, want)):
                name = EV / f"{cat}-{got + 1}.jpg"
                blob = _get(url)
                if blob and _is_jpeg(blob):
                    name.write_bytes(blob)
                    got += 1
                    print(f"  ok {name.name} ({len(blob) // 1024} KB)")
                if got >= want_total:
                    break
            if got >= want_total:
                break
        print(f"  -> {got}/{want_total}")


def fetch_avatars() -> None:
    AV.mkdir(parents=True, exist_ok=True)
    import time
    for uid, (gender, idx) in AVATARS.items():
        name = AV / f"{uid}.jpg"
        if name.exists():
            continue
        urls = [
            f"https://xsgames.co/randomusers/assets/avatars/{gender}/{idx}.jpg",
            f"https://xsgames.co/randomusers/assets/avatars/{gender}/{(idx * 7 + 3) % 99}.jpg",
            f"https://i.pravatar.cc/300?img={idx % 70 + 1}",
        ]
        for url in urls:
            blob = _get(url)
            if blob and _is_jpeg(blob):
                name.write_bytes(blob)
                print(f"  ok {name.name} <- {url.split('/')[2]} ({len(blob) // 1024} KB)")
                break
            time.sleep(0.6)
        else:
            print(f"  !! skipped {uid}")


if __name__ == "__main__":
    fetch_avatars()
    fetch_evidence()
    print("done.")
