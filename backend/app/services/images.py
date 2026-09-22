"""Deterministic photographic-style SVG "evidence frames" for demo photos.

The prototype runs offline, so seeded observations use generated images instead
of real photographs. Each frame is a pure function of (kind, seed) — same inputs
always produce the same image, keeping demo mode deterministic. Scenes are drawn
in perspective (sky → buildings → road) with layered textures and film grain so
they read as plausible phone photos of Hyderabad streets. In production these
would be Supabase Storage objects.
"""
from __future__ import annotations

import base64
import hashlib

W, H = 640, 400
HORIZON = 235

TITLES = {
    "roads": ("ROAD DAMAGE", "Deep fissure · carriageway"),
    "garbage": ("GARBAGE ACCUMULATION", "Kerb-side waste pile"),
    "water": ("WATER LEAKAGE", "Burst supply line"),
    "streetlights": ("BROKEN STREETLIGHT", "Pole ST-3310 · daytime"),
    "drainage": ("DRAINAGE OVERFLOW", "Slit drain backing up"),
    "accessibility": ("DAMAGED FOOTPATH", "Tilped kerb blocks"),
    "after": ("AFTER — REPAIR DONE", "Site condition post-repair"),
}

_BUILDING = ["#e7e4dd", "#d9d4c9", "#dcd9d4", "#cfc9bd", "#e3ded2"]


def _rng(seed: str):
    """Small deterministic pseudo-random generator (xorshift over md5 bytes)."""
    state = int.from_bytes(hashlib.md5(seed.encode()).digest()[:4], "little") or 1

    def nxt():
        nonlocal state
        state ^= (state << 13) & 0xFFFFFFFF
        state ^= state >> 17
        state ^= (state << 5) & 0xFFFFFFFF
        return state / 0xFFFFFFFF

    return nxt


def _grain(r) -> str:
    """Sparse dark specks + a couple of faint dust smears — phone-photo feel."""
    out = ['<g opacity="0.16" fill="#2a2a2a">']
    for _ in range(260):
        x, y = r() * W, r() * H
        s = 0.8 + r() * 1.6
        out.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{s:.1f}" height="{s:.1f}"/>')
    out.append("</g>")
    out.append(
        f'<ellipse cx="{W * 0.25:.0f}" cy="{H * 0.3:.0f}" rx="150" ry="60" '
        f'fill="#8a7a5c" opacity="0.05"/>'
    )
    return "".join(out)


def _sky(r) -> str:
    top, bot = "#c9d5de", "#e4e4dc"
    clouds = ['<g fill="#ffffff" opacity="0.55">']
    for _ in range(5):
        cx, cy = 60 + r() * 520, 30 + r() * 110
        cr = 26 + r() * 36
        clouds.append(
            f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{cr * 1.9:.0f}" ry="{cr * 0.5:.0f}"/>'
        )
    clouds.append("</g>")
    return (
        f'<rect width="{W}" height="{HORIZON}" fill="url(#sk)"/>'
        f'<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bot}"/>'
        f"</linearGradient></defs>" + "".join(clouds)
    )


def _buildings(r) -> str:
    """Two slabs of parallax block-buildings sitting on the horizon."""
    out = ['<g>']
    # far row — hazy
    x = -40.0
    while x < W + 60:
        w = 70 + r() * 90
        h = 60 + r() * 95
        c = _BUILDING[int(r() * len(_BUILDING))]
        out.append(
            f'<rect x="{x:.0f}" y="{HORIZON - h:.0f}" width="{w:.0f}" height="{h:.0f}" '
            f'fill="{c}" opacity="0.55"/>'
        )
        # a few windows
        for wy in range(int(HORIZON - h) + 8, HORIZON - 8, 16):
            for wx in range(int(x) + 6, int(x + w) - 8, 18):
                if r() < 0.28:
                    out.append(
                        f'<rect x="{wx}" y="{wy}" width="6" height="8" fill="#b9b2a2" opacity="0.5"/>'
                    )
        x += w + 8
    out.append('<rect y="150" width="%d" height="85" fill="#e9e7e1" opacity="0.35"/>' % W)  # haze band
    out.append("</g>")
    return "".join(out)


def _road(r) -> str:
    """Perspective asphalt with center dashes, kerb and pavement."""
    lx, rx = 30, W - 30          # near edge
    fx, fy = W * 0.30, HORIZON   # far-left of carriageway
    out = ['<g>']
    # pavement strip behind kerb
    out.append(
        f'<polygon points="0,{HORIZON} {fx - 70:.0f},{HORIZON} {lx},400 0,400" fill="#c8c4b8"/>'
    )
    out.append(
        f'<polygon points="{fx - 70:.0f},{HORIZON} {fx - 46:.0f},{HORIZON} {lx - 60},400 {lx},400" '
        f'fill="#b9b4a6"/>'
    )
    # asphalt
    out.append(
        f'<polygon points="{fx},{HORIZON} {W - fx + 60:.0f},{HORIZON} {rx},400 {lx},400" '
        f'fill="url(#as)"/>'
    )
    out.append(
        '<defs><linearGradient id="as" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#9a9c99"/><stop offset="1" stop-color="#5f6360"/>'
        "</linearGradient></defs>"
    )
    # center dashed line (fan perspective)
    y0, y1 = HORIZON + 4, 396
    n = 7
    for i in range(n):
        t0, t1 = i / n + 0.5 / n * 0.9, (i + 0.6) / n
        a0, a1 = fx + 90 + (lx + 6 - fx - 90) * (t0 - HORIZON / 400) , 0  # placeholder, replaced below
    # simpler: draw dashes by interpolating near/far trapezoid
    def lerp(ax, ay, bx, by, t):
        return ax + (bx - ax) * t, ay + (by - ay) * t
    # center line from far point (fx+90, HORIZON) to near (cx= W*0.52, 400)
    cxn = W * 0.52
    for i in range(7):
        t0 = 0.18 + i * 0.115
        t1 = t0 + 0.055
        x0, y0 = lerp(fx + 90, HORIZON + 2, cxn, 400, t0)
        x1, y1 = lerp(fx + 90, HORIZON + 2, cxn, 400, t1)
        w0, w1 = 2 + 7 * t0, 2 + 7 * t1
        out.append(
            f'<polygon points="{x0 - w0:.1f},{y0:.0f} {x0 + w0:.1f},{y0:.0f} '
            f'{x1 + w1:.1f},{y1:.0f} {x1 - w1:.1f},{y1:.0f}" fill="#e8e6de" opacity="0.85"/>'
        )
    # kerb line near left edge of asphalt
    kx0, kx1 = fx - 46, lx - 60
    out.append(
        f'<line x1="{kx0}" y1="{HORIZON}" x2="{kx1}" y2="400" stroke="#d8d4c8" stroke-width="3" opacity="0.9"/>'
    )
    # road-edge wear patches
    for _ in range(6):
        t = 0.3 + r() * 0.65
        px, py = lerp(fx, HORIZON, lx, 400, t)
        spread = 20 + 140 * t
        out.append(
            f'<ellipse cx="{px + (r() - 0.5) * spread:.0f}" cy="{py:.0f}" '
            f'rx="{8 + 26 * t:.0f}" ry="{3 + 7 * t:.1f}" fill="#4b4e4c" opacity="0.30"/>'
        )
    out.append("</g>")
    return "".join(out)


def _crack(r, cx, cy, scale, color="#2e2a24") -> str:
    """Branching crack: main jagged path plus 1-2 arms."""
    out = ['<g stroke="%s" fill="none" stroke-linecap="round">' % color]
    segs = 7
    px, py = cx, cy
    main = [f'<path d="M {px:.0f} {py:.0f}']
    arm1: list[str] = []
    arm2: list[str] = []
    for i in range(segs):
        t = i / segs
        px += (r() - 0.35) * 60 * scale
        py += 55 * scale * (0.6 + 0.8 * t)
        w = 3.4 * scale * (1.25 - t)
        main.append(f" L {px:.0f} {py:.0f}")
        if i == 2:
            arm1 = [f'<path d="M {px:.0f} {py:.0f}',
                    f' L {px + 55 * scale:.0f} {py + 34 * scale:.0f}',
                    f' L {px + 95 * scale:.0f} {py + 44 * scale:.0f}']
            arm2 = [f'<path d="M {px:.0f} {py:.0f}',
                    f' L {px - 48 * scale:.0f} {py + 26 * scale:.0f}']
        if i == 4 and r() < 0.6:
            arm2.append(f' L {px - 30 * scale:.0f} {py + 55 * scale:.0f}')
    main.append('" stroke-width="%0.1f"/>' % (4.6 * scale))
    out.extend(main)
    if arm1:
        out.append("".join(arm1) + '" stroke-width="%0.1f"/>' % (3.1 * scale))
    if arm2:
        out.append("".join(arm2) + '" stroke-width="%0.1f"/>' % (2.6 * scale))
    out.append("</g>")
    # crumbled asphalt shoulder around crack
    crumbs = ['<g fill="#6a655c" opacity="0.5">']
    bx, by = cx, cy
    for i in range(9):
        bx += (r() - 0.3) * 46 * scale
        by += 48 * scale
        crumbs.append(
            f'<ellipse cx="{bx:.0f}" cy="{by:.0f}" rx="{(4 + r() * 9) * scale:.1f}" '
            f'ry="{(3 + r() * 5) * scale:.1f}"/>'
        )
    crumbs.append("</g>")
    return "".join(out) + "".join(crumbs)


def _pothole(r, cx, cy, scale) -> str:
    """Water-stained asphalt cavity with ragged rim and depth shading."""
    rx, ry = 66 * scale, 30 * scale
    return (
        f'<g transform="translate({cx},{cy})">'
        f'<ellipse rx="{rx}" ry="{ry}" fill="#26221d"/>'
        f'<ellipse rx="{rx}" ry="{ry}" fill="url(#ph)"/>'
        f'<defs><radialGradient id="ph"><stop offset="55%" stop-color="#100e0b"/>'
        f'<stop offset="100%" stop-color="#3a332a" stop-opacity="0"/></radialGradient></defs>'
        f'<ellipse rx="{rx + 5}" ry="{ry + 3}" fill="none" stroke="#7c7466" '
        f'stroke-width="{4 * scale:.1f}" stroke-dasharray="14 9" opacity="0.75"/>'
        f'<ellipse cx="{-rx * 0.3:.0f}" cy="{ry * 0.2:.0f}" rx="{rx * 0.55:.0f}" ry="{ry * 0.45:.0f}" '
        f'fill="#3f4a52" opacity="0.55"/>'  # standing water
        f'<ellipse cx="{rx * 0.35:.0f}" cy="{-ry * 0.25:.0f}" rx="{rx * 0.3:.0f}" ry="{ry * 0.3:.0f}" '
        f'fill="#4a4034" opacity="0.6"/>'
        "</g>"
    )


def _waste(r, cx, base_y, scale) -> str:
    """Kerb-side garbage heap: sack, cardboard, scattered litter, flies excluded."""
    out = [f'<g transform="translate({cx},{base_y})">']
    # main mound
    out.append(
        f'<path d="M {-120 * scale:.0f} 0 Q {-60 * scale:.0f} {-58 * scale:.0f} '
        f'{-8 * scale:.0f} {-52 * scale:.0f} Q {66 * scale:.0f} {-46 * scale:.0f} '
        f'{118 * scale:.0f} 0 Z" fill="#4f5a42"/>'
    )
    # darker inner shading
    out.append(
        f'<path d="M {-70 * scale:.0f} {-6} Q {-24 * scale:.0f} {-40 * scale:.0f} '
        f'{52 * scale:.0f} {-12}" stroke="#3a4230" stroke-width="{10 * scale:.0f}" '
        'fill="none" opacity="0.6" stroke-linecap="round"/>'
    )
    # black sack peeking out
    out.append(
        f'<ellipse cx="{-46 * scale:.0f}" cy="{-40 * scale:.0f}" rx="{30 * scale:.0f}" '
        f'ry="{20 * scale:.0f}" fill="#22251f"/>'
        f'<ellipse cx="{-40 * scale:.0f}" cy="{-46 * scale:.0f}" rx="{12 * scale:.0f}" '
        f'ry="{7 * scale:.0f}" fill="#3a3d33" opacity="0.7"/>'
    )
    # cardboard flap
    out.append(
        f'<rect x="{18 * scale:.0f}" y="{-50 * scale:.0f}" width="{52 * scale:.0f}" '
        f'height="{34 * scale:.0f}" fill="#a9855a" transform="rotate(-14 {44 * scale:.0f} {-33 * scale:.0f})"/>'
    )
    # light litter flecks
    for _ in range(14):
        lx = (r() - 0.5) * 240 * scale
        ly = -r() * 50 * scale
        out.append(
            f'<circle cx="{lx:.0f}" cy="{ly:.0f}" r="{(1.5 + r() * 3) * scale:.1f}" '
            f'fill="#d8d4c8" opacity="{0.5 + r() * 0.4:.2f}"/>'
        )
    # scatter trail toward the road
    for _ in range(9):
        lx = 120 * scale + r() * 190 * scale
        ly = r() * 26
        out.append(
            f'<ellipse cx="{lx:.0f}" cy="{ly:.0f}" rx="{(3 + r() * 6) * scale:.1f}" '
            f'ry="{(2 + r() * 3) * scale:.1f}" fill="#5c5344" opacity="0.55"/>'
        )
    out.append("</g>")
    return "".join(out)


def _water(r, cx, cy, scale) -> str:
    """Leak: dark wet spread across the road with ribbed flow lines."""
    out = ['<g>']
    # large irregular wet patch
    out.append(
        f'<path d="M {cx - 190 * scale:.0f} {cy:.0f} '
        f'Q {cx - 150 * scale:.0f} {cy + 58 * scale:.0f} {cx - 40 * scale:.0f} {cy + 66 * scale:.0f} '
        f'Q {cx + 80 * scale:.0f} {cy + 74 * scale:.0f} {cx + 150 * scale:.0f} {cy + 30 * scale:.0f} '
        f'Q {cx + 190 * scale:.0f} {cy - 6:.0f} {cx + 90 * scale:.0f} {cy - 22 * scale:.0f} '
        f'Q {cx - 40 * scale:.0f} {cy - 34 * scale:.0f} {cx - 190 * scale:.0f} {cy:.0f} Z" '
        'fill="#4b5a66" opacity="0.85"/>'
    )
    # darker core
    out.append(
        f'<ellipse cx="{cx:.0f}" cy="{cy + 14 * scale:.0f}" rx="{110 * scale:.0f}" '
        f'ry="{30 * scale:.0f}" fill="#39454f" opacity="0.8"/>'
    )
    # flow ribs
    for i in range(4):
        ry = cy + (12 + i * 14) * scale
        out.append(
            f'<path d="M {cx - 140 * scale + i * 14:.0f} {ry:.0f} '
            f'Q {cx:.0f} {ry + 12:.0f} {cx + 140 * scale - i * 12:.0f} {ry - 4:.0f}" '
            f'stroke="#5d7280" stroke-width="{2.2 * scale:.1f}" fill="none" opacity="0.7"/>'
        )
    # trickle from a kerb crack
    out.append(
        f'<path d="M {cx - 120 * scale:.0f} {cy - 60 * scale:.0f} '
        f'q 12 30 4 58" stroke="#4e6272" stroke-width="{3.4 * scale:.1f}" fill="none" opacity="0.85"/>'
    )
    out.append("</g>")
    return "".join(out)


def _drain(r, cx, cy, scale) -> str:
    """Open slit drain with overflowing sludge and floatables."""
    out = ['<g>']
    # channel
    out.append(
        f'<polygon points="{cx - 40 * scale:.0f},{cy} {cx - 12 * scale:.0f},{cy + 150 * scale:.0f} '
        f'{cx + 60 * scale:.0f},{cy + 150 * scale:.0f} {cx + 34 * scale:.0f},{cy}" '
        'fill="#2c2620"/>'
    )
    # sludge surface
    out.append(
        f'<polygon points="{cx - 36 * scale:.0f},{cy + 6:.0f} {cx - 10 * scale:.0f},{cy + 140 * scale:.0f} '
        f'{cx + 54 * scale:.0f},{cy + 140 * scale:.0f} {cx + 30 * scale:.0f},{cy + 6:.0f}" '
        'fill="#55503a"/>'
    )
    # overflow lip onto road
    out.append(
        f'<path d="M {cx - 30 * scale:.0f} {cy + 40:.0f} q -40 26 -58 66 q 30 -8 52 -22 z" '
        'fill="#4e4a38" opacity="0.8"/>'
    )
    # floatable debris
    for _ in range(6):
        fx = cx + (r() - 0.4) * 34 * scale
        fy = cy + 14 + r() * 110 * scale
        c = ["#7c8a5a", "#8a7a4e", "#66603e"][int(r() * 3)]
        out.append(
            f'<ellipse cx="{fx:.0f}" cy="{fy:.0f}" rx="{(5 + r() * 8) * scale:.1f}" '
            f'ry="{(3 + r() * 4) * scale:.1f}" fill="{c}" opacity="0.85"/>'
        )
    out.append("</g>")
    return "".join(out)


def _footpath(r, cx, cy, scale) -> str:
    """Broken pavement: tilted slabs, edge chips, a lean pole."""
    out = ['<g>']
    # tilted slab
    out.append(
        f'<g transform="rotate(-7 {cx:.0f} {cy:.0f})">'
        f'<rect x="{cx - 90 * scale:.0f}" y="{cy - 26 * scale:.0f}" width="{180 * scale:.0f}" '
        f'height="{52 * scale:.0f}" fill="#c9c4b6"/>'
        f'<rect x="{cx - 90 * scale:.0f}" y="{cy - 26 * scale:.0f}" width="{180 * scale:.0f}" '
        f'height="{10 * scale:.0f}" fill="#b5b0a2"/>'
        "</g>"
    )
    # crack gap
    out.append(
        f'<polygon points="{cx:.0f},{cy - 30 * scale:.0f} {cx + 12:.0f},{cy + 26 * scale:.0f} '
        f'{cx - 6:.0f},{cy + 26 * scale:.0f} {cx - 10:.0f},{cy - 30 * scale:.0f}" fill="#33302a"/>'
    )
    # chips
    for _ in range(8):
        px = cx + (r() - 0.5) * 190 * scale
        py = cy + (r() - 0.5) * 60 * scale
        out.append(
            f'<rect x="{px:.0f}" y="{py:.0f}" width="{(3 + r() * 6) * scale:.0f}" '
            f'height="{(2 + r() * 4) * scale:.0f}" fill="#8f8a7c" opacity="0.7"/>'
        )
    out.append("</g>")
    return "".join(out)


def _streetlight(r) -> str:
    """Utility pole with a dead luminarie in daylight; faint wire sweep."""
    px = 96 + r() * 60
    out = ['<g>']
    # pole (perspective-ish, base near kerb)
    out.append(
        f'<rect x="{px:.0f}" y="86" width="7" height="{HORIZON - 46}" fill="#6d7276"/>'
        f'<rect x="{px - 2:.0f}" y="{HORIZON - 52}" width="11" height="52" fill="#606569"/>'
    )
    # arm + dead lamp
    out.append(
        f'<rect x="{px:.0f}" y="92" width="54" height="6" fill="#6d7276"/>'
        f'<rect x="{px + 44:.0f}" y="96" width="20" height="9" rx="3" fill="#5c6165"/>'
        f'<rect x="{px + 48:.0f}" y="103" width="12" height="4" fill="#8b8f92" opacity="0.8"/>'
    )
    # access panel + faint streak of rust
    out.append(
        f'<rect x="{px + 1:.0f}" y="200" width="5" height="16" fill="#5a5f63"/>'
        f'<rect x="{px + 5:.0f}" y="150" width="2" height="70" fill="#8c5f43" opacity="0.5"/>'
    )
    # wire
    out.append(
        f'<path d="M {px + 54:.0f} 94 Q {px + 200:.0f} 70 {W} 84" stroke="#3f4448" '
        'stroke-width="1.6" fill="none" opacity="0.6"/>'
    )
    # the pole stands on the pavement left side — soften ground contact
    out.append(f'<ellipse cx="{px + 4:.0f}" cy="{HORIZON - 2}" rx="12" ry="3" fill="#4c4f52" opacity="0.4"/>')
    out.append("</g>")
    return "".join(out)


def _ui(r, kind: str) -> str:
    """Camera chrome: frame label bar, exposure badge, timestamp — subtle."""
    title, sub = TITLES.get(kind, ("FIELD EVIDENCE", ""))
    out = ['<g font-family="Segoe UI, Arial, sans-serif">']
    out.append(
        f'<rect x="0" y="0" width="{W}" height="64" fill="#111417" opacity="0.66"/>'
        f'<rect x="0" y="62" width="{W}" height="1.5" fill="#ffffff" opacity="0.12"/>'
        f'<text x="20" y="30" font-size="15" font-weight="700" fill="#ffffff" '
        f'letter-spacing="1.5">{title}</text>'
        f'<text x="20" y="48" font-size="10.5" fill="#ffffff" opacity="0.75" '
        f'letter-spacing="0.6">{sub}</text>'
        f'<rect x="{W - 108}" y="16" width="88" height="26" rx="13" fill="#ffffff" opacity="0.14"/>'
        f'<circle cx="{W - 90}" cy="29" r="4.5" fill="#e5484d"/>'
        f'<text x="{W - 78}" y="33" font-size="10.5" fill="#ffffff" letter-spacing="1">LIVE</text>'
        f'<text x="20" y="{H - 14}" font-size="10.5" fill="#ffffff" opacity="0.85" '
        f'letter-spacing="1">CIVICOS FIELD CAPTURE · 3:26 PM</text>'
        f'<text x="{W - 20}" y="{H - 14}" font-size="10.5" fill="#ffffff" opacity="0.85" '
        'text-anchor="end">HYDERABAD</text>'
        "</g>"
    )
    return "".join(out)


def frame(kind: str, seed: str) -> str:
    """Render a photographic-style scene for an issue kind. Deterministic."""
    r = _rng(f"{kind}:{seed}")
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">',
        _sky(r),
        _buildings(r),
        _road(r),
    ]
    if kind == "roads":
        if r() < 0.5:
            parts.append(_pothole(r, W * 0.52, H * 0.78, 1.15))
            parts.append(_crack(r, W * 0.30, H * 0.70, 0.8))
        else:
            parts.append(_crack(r, W * 0.42, H * 0.66, 1.25))
            parts.append(_crack(r, W * 0.72, H * 0.80, 0.7))
    elif kind == "garbage":
        parts.append(_waste(r, W * 0.38, H * 0.86, 1.15))
        # secondary bag
        parts.append(
            f'<ellipse cx="{W * 0.66:.0f}" cy="{H * 0.90:.0f}" rx="46" ry="22" fill="#2a2d26"/>'
        )
    elif kind == "water":
        parts.append(_water(r, W * 0.5, H * 0.76, 1.0))
    elif kind == "drainage":
        parts.append(_drain(r, W * 0.30, H * 0.62, 0.95))
    elif kind == "accessibility":
        parts.append(_footpath(r, W * 0.40, H * 0.74, 1.1))
    elif kind == "streetlights":
        parts.append(_streetlight(r))
    elif kind == "after":
        # repair: fresh dark patch + clean kerb; a subtle "sealed" look
        parts.append(
            f'<g transform="translate({W * 0.52},{H * 0.76})">'
            f'<ellipse rx="120" ry="44" fill="#54575a"/>'
            f'<ellipse rx="120" ry="44" fill="none" stroke="#7c7f83" stroke-width="3" '
            'stroke-dasharray="10 7" opacity="0.6"/></g>'
        )
    else:
        parts.append(_pothole(r, W * 0.5, H * 0.76, 1.0))
    parts.append(_grain(r))
    parts.append(_ui(r, kind))
    parts.append("</svg>")
    return "".join(parts)


def frame_png(kind: str, seed: str) -> bytes:
    """PNG bytes are not available without extra deps; return encoded SVG."""
    raise NotImplementedError


def frame_data_uri(kind: str, seed: str) -> str:
    """Base64 data URI — survives JSON payloads and <img> tags cleanly."""
    svg = frame(kind, seed)
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()
