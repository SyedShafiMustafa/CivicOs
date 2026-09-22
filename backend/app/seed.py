"""Hand-crafted deterministic seed: a believable slice of Hyderabad.

Everything is a fixed fixture (no randomness) so the demo is reproducible:
same incidents, timestamps, similarity scores and outcomes on every run.
The seed is written into the store by ``build(store)``.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from app.services import images
from app.services.embeddings import embed
from app.services.routing import DEPARTMENTS

D = datetime
DEMO_USER = "u-tanisha"

# --- People ---------------------------------------------------------------------

_USERS: dict[str, tuple[str, str]] = {
    "u-tanisha": ("Tanisha Rao", "Road No. 12, Banjara Hills"),
    "u-rahul": ("Rahul Mehta", "Banjara Hills"),
    "u-priya": ("Priya Nair", "Banjara Hills"),
    "u-arjun": ("Arjun Reddy", "Banjara Hills"),
    "u-meghana": ("Meghana Iyer", "Banjara Hills"),
    "u-farhan": ("Farhan Ahmed", "Banjara Hills"),
    "u-sneha": ("Sneha Kulkarni", "Banjara Hills"),
    "u-vikram": ("Vikram Shah", "Banjara Hills"),
    "u-divya": ("Divya Menon", "Jubilee Hills"),
    "u-karthik": ("Karthik Varma", "Jubilee Hills"),
    "u-ananya": ("Ananya Das", "Jubilee Hills"),
    "u-rohit": ("Rohit Yadav", "Jubilee Hills"),
    "u-imran": ("Imran Sheikh", "Jubilee Hills"),
    "u-lakshmi": ("Lakshmi Prasad", "Jubilee Hills"),
    "u-nikhil": ("Nikhil Chowdhury", "Madhapur"),
    "u-sara": ("Sara Thomas", "Madhapur"),
    "u-deepak": ("Deepak Rao", "Kondapur"),
    "u-swathi": ("Swathi Reddy", "Gachibowli"),
}
ALL_OTHERS = [u for u in _USERS if u != DEMO_USER]

# --- Areas (for nearest-area labelling) -------------------------------------------

AREAS: list[tuple[str, float, float]] = [
    ("Road No. 12, Banjara Hills", 17.4142, 78.4336),
    ("Road No. 11, Banjara Hills", 17.4138, 78.4308),
    ("Road No. 5, Banjara Hills", 17.4102, 78.4401),
    ("Road No. 2, Banjara Hills", 17.4098, 78.4362),
    ("Road No. 36, Banjara Hills", 17.4089, 78.4290),
    ("Road No. 71, Jubilee Hills", 17.4150, 78.4310),
    ("Road No. 45, Jubilee Hills", 17.4239, 78.4128),
    ("Road No. 70, Jubilee Hills", 17.4191, 78.4244),
    ("Ayyappa Society, Madhapur", 17.4483, 78.3930),
    ("100-ft Road, Madhapur", 17.4496, 78.3917),
    ("Kondapur Main Road", 17.4615, 78.3639),
    ("Gachibowli Service Road", 17.4456, 78.3497),
    ("Hitec City MMTS Approach", 17.4441, 78.3788),
    ("Jubilee Enclave Road", 17.4489, 78.3860),
    ("Banjara Hills", 17.4126, 78.4382),
    ("Jubilee Hills", 17.4239, 78.4108),
    ("Madhapur", 17.4483, 78.3915),
    ("Kondapur", 17.4615, 78.3639),
    ("Gachibowli", 17.4401, 78.3489),
    ("Hitec City", 17.4441, 78.3788),
]


def nearest_area(lat: float, lng: float) -> str:
    from app.services.clustering import haversine_m

    return min(AREAS, key=lambda a: haversine_m((lat, lng), (a[1], a[2])))[0]


# --- Observation description pool ---------------------------------------------------

POOLS: dict[str, list[str]] = {
    "roads": [
        "Deep pothole cluster near the junction; vehicles swerve into the opposing lane to avoid it.",
        "Cracked and sunken patch after recent cable-laying work; widening every week.",
        "Pothole filled loosely with gravel — washing away in every rain.",
        "Fissures spreading across half the carriageway near the manhole.",
        "Edge of the road caved in near the drain; two-wheelers skidding.",
        "Speed breaker washed away leaving a deep rut across the lane.",
    ],
    "garbage": [
        "Overflowing garbage point; waste spilling onto the footpath.",
        "Household waste dumped overnight despite daily pickup claims.",
        "Construction debris left on the roadside for over a week.",
        "Bins missing; black spots forming at the corner.",
        "Waste scattered across 30 m around the transfer point.",
        "Foul smell and stray-dog activity around uncollected waste.",
    ],
    "water": [
        "Continuous leakage from the valve chamber flooding half the carriageway.",
        "Sewage overflow mixing with water pooling near the gate.",
        "Pipe joint leaking with steady flow; silt deposit on the road.",
        "Water supply line burst near the kerb; pressure loss reported by residents.",
        "Standing water stagnant for days; mosquito breeding risk.",
        "Leak has formed a large puddle beside a fresh pothole; slippery surface.",
    ],
    "streetlights": [
        "Pole not lighting for the third consecutive night.",
        "Lamp flickering and cutting out every few minutes.",
        "Entire stretch dark after the recent cable fault.",
        "Fixture hanging loose at an angle after the storm.",
        "Pole LB-0442 dark; visibility poor near the turning.",
        "Light out since the last power fluctuation.",
    ],
    "drainage": [
        "Storm-water drain overflowing across the service lane.",
        "Drain grate blocked with silt and plastic; water backing up.",
        "Overflow near the manhole spreading into the junction.",
        "Open drain edge broken; silt spilling back onto the road.",
        "Nallah overflow after light rain; flooding the cycle track.",
        "Blocked drain causing waterlogging at the low point.",
    ],
    "accessibility": [
        "Broken sidewalk slabs and a ramp blocked by a parked two-wheeler.",
        "Footpath edge broken; wheelchair users forced onto the carriageway.",
        "Tactile paving damaged near the station approach.",
        "Temporary barricade left blocking the dropped kerb for weeks.",
        "Utility trench across the footpath with no ramp plate.",
        "Utility pole standing in the middle of the footpath.",
    ],
}

# --- Curated sample photos (report flow) -------------------------------------------

SAMPLES: list[dict] = [
    {
        "id": "s-pothole", "label": "Deep pothole", "issue_type": "roads",
        "latitude": 17.4140, "longitude": 78.4334,
        "severity": "high", "confidence": 0.96,
        "description": "Deep pothole near the junction; water collecting inside and vehicles swerving into the opposite lane.",
    },
    {
        "id": "s-road-crack", "label": "Cracked carriageway", "issue_type": "roads",
        "latitude": 17.4489, "longitude": 78.3861,
        "severity": "medium", "confidence": 0.91,
        "description": "Wide cracks and a sunken patch across the lane after cable-laying work.",
    },
    {
        "id": "s-garbage", "label": "Overflowing garbage point", "issue_type": "garbage",
        "latitude": 17.4149, "longitude": 78.4309,
        "severity": "medium", "confidence": 0.94,
        "description": "Garbage overflowing from the collection point onto the roadside.",
    },
    {
        "id": "s-streetlight", "label": "Streetlight outage", "issue_type": "streetlights",
        "latitude": 17.4103, "longitude": 78.4400,
        "severity": "low", "confidence": 0.89,
        "description": "Streetlight pole dark; the stretch is unlit at night.",
    },
    {
        "id": "s-water", "label": "Water leakage", "issue_type": "water",
        "latitude": 17.4241, "longitude": 78.4126,
        "severity": "medium", "confidence": 0.92,
        "description": "Water leaking onto the carriageway from a valve chamber.",
    },
    {
        "id": "s-drainage", "label": "Blocked drain", "issue_type": "drainage",
        "latitude": 17.4614, "longitude": 78.3641,
        "severity": "high", "confidence": 0.93,
        "description": "Storm-water drain overflowing across the service lane.",
    },
    {
        "id": "s-accessibility", "label": "Broken footpath", "issue_type": "accessibility",
        "latitude": 17.4442, "longitude": 78.3789,
        "severity": "medium", "confidence": 0.90,
        "description": "Sidewalk slabs broken; ramp blocked near the station approach.",
    },
]
for _s in SAMPLES:
    _s["image_uri"] = images.frame_data_uri(_s["issue_type"], _s["id"])
SAMPLE_BY_ID = {s["id"]: s for s in SAMPLES}

# --- Curated "after" samples (verification flow) --------------------------------------

_AFTER_DEFS: dict[str, list[dict]] = {
    "garbage": [
        {"id": "after-garbage-cleared", "label": "Clear pavement after cleanup", "outcome": "cleared",
         "desc": "Clean pavement with new bins installed after sanitation pickup."},
        {"id": "after-garbage-present", "label": "Same angle — waste still present", "outcome": "present",
         "desc": "Waste still scattered at the same point; bins not cleared."},
        {"id": "after-garbage-angle", "label": "Different angle", "outcome": "neutral",
         "desc": "Capture from a different angle; the original vantage is not matched."},
    ],
    "water": [
        {"id": "after-water-cleared", "label": "Surface dried after repair", "outcome": "cleared",
         "desc": "Carriageway surface restored and dried after the valve repair."},
        {"id": "after-water-present", "label": "Same angle — leak still active", "outcome": "present",
         "desc": "Standing water still spreading at the same point."},
        {"id": "after-water-angle", "label": "Different angle", "outcome": "neutral",
         "desc": "Capture from a different angle; the original vantage is not matched."},
    ],
}
_AFTER_FALLBACK = [
    {"id": "after-{cat}-repaired", "label": "Repaired surface", "outcome": "cleared",
     "desc": "Surface restored after the repair work."},
    {"id": "after-{cat}-present", "label": "Same angle — defect still visible", "outcome": "present",
     "desc": "The defect is still visible at the same location."},
    {"id": "after-{cat}-angle", "label": "Different angle", "outcome": "neutral",
     "desc": "Capture from a different angle; the original vantage is not matched."},
]

AFTER_SAMPLES: dict[str, list[dict]] = {}
for _cat in ["roads", "garbage", "water", "streetlights", "drainage", "accessibility", "other"]:
    defs = _AFTER_DEFS.get(_cat)
    if defs is None:
        defs = [
            {**d, "id": d["id"].format(cat=_cat), "desc": d["desc"]} for d in _AFTER_FALLBACK
        ]
    for d in defs:
        if d["outcome"] == "cleared":
            kind = "after"
        else:
            kind = _cat
        d["image_uri"] = images.frame_data_uri(kind, d["id"])
    AFTER_SAMPLES[_cat] = defs

# --- Incident definitions ---------------------------------------------------------------

_INCIDENT_DEFS: list[dict] = [
    {
        "id": "HYD-RD-2048", "issue": "roads", "title": "Road Damage",
        "latitude": 17.4142, "longitude": 78.4336,
        "location": "Road No. 12, Banjara Hills",
        "severity": "high", "priority": "high", "status": "assigned",
        "department": DEPARTMENTS["roads"]["name"],
        "summary": "Deep pothole cluster on Road No. 12 near the GVK One junction; damage widening since June.",
        "first": D(2026, 6, 14, 8, 41), "last": D(2026, 9, 20, 9, 12),
        "contributors": [DEMO_USER] + ALL_OTHERS[:16],
        "images": [0, 2, 4, 7, 9, 12, 15, 18, 20],
        "her": {0: D(2026, 6, 14, 8, 41), 22: D(2026, 9, 20, 9, 12)},
        "worsening": True,
        "timeline": [
            ("observation", D(2026, 6, 14, 8, 41), "First observation reported", "Tanisha Rao",
             "Road-surface damage reported near the GVK One junction."),
            ("verified", D(2026, 6, 16, 10, 5), "Marked verified", "CIVICOS verification",
             "5 independent observations within 300 m confirmed the same defect."),
            ("severity", D(2026, 8, 18, 7, 30), "Severity increased to high", "CIVICOS triage",
             "New observations showed the damaged patch widening toward the lane edge."),
            ("observation", D(2026, 9, 12, 18, 20), "5 additional observations in 48 hours", "CIVICOS triage",
             "Cluster growth pushed this incident to the top of the nearby priority list."),
            ("assigned", D(2026, 9, 18, 15, 42), "Assigned for repair", "Operations",
             "Routed to GHMC Roads & Transportation — works reference W-4417."),
            ("observation", D(2026, 9, 20, 9, 12), "Latest observation added", "Tanisha Rao",
             "23rd observation; damage remains unaddressed."),
        ],
    },
    {
        "id": "HYD-RD-2155", "issue": "roads", "title": "Road Damage",
        "latitude": 17.4138, "longitude": 78.4308,
        "location": "Road No. 11, Banjara Hills",
        "severity": "high", "priority": "high", "status": "verified",
        "department": DEPARTMENTS["roads"]["name"],
        "summary": "Sunken cracked patch on Road No. 11 near the park gate; worsening after rains.",
        "first": D(2026, 8, 8, 7, 55), "last": D(2026, 9, 19, 18, 30),
        "contributors": ["u-priya", "u-rahul", "u-vikram", "u-meghana", "u-imran", "u-deepak"],
        "images": [0, 3, 6], "her": {}, "worsening": True,
        "timeline": [
            ("observation", D(2026, 8, 8, 7, 55), "First observation reported", "Priya Nair",
             "Sunken patch noticed near the park gate."),
            ("verified", D(2026, 8, 11, 9, 10), "Marked verified", "CIVICOS verification",
             "4 observations within 200 m confirmed the defect."),
            ("severity", D(2026, 9, 6, 8, 0), "Severity increased to high", "CIVICOS triage",
             "Patch sinking further after sustained rain."),
            ("observation", D(2026, 9, 19, 18, 30), "Latest observation added", "Vikram Shah",
             "9th observation on this incident."),
        ],
    },
    {
        "id": "HYD-GR-3050", "issue": "garbage", "title": "Garbage Accumulation",
        "latitude": 17.4098, "longitude": 78.4362,
        "location": "Road No. 2, Banjara Hills",
        "severity": "medium", "priority": "medium", "status": "verified",
        "department": DEPARTMENTS["garbage"]["name"],
        "summary": "Overflowing community bin on Road No. 2; collection missed twice this week.",
        "first": D(2026, 9, 1, 6, 40), "last": D(2026, 9, 19, 8, 15),
        "contributors": ["u-sneha", "u-farhan", "u-swathi", "u-rohit", DEMO_USER],
        "images": [1, 3], "her": {2: D(2026, 9, 10, 8, 30)}, "worsening": False,
        "timeline": [
            ("observation", D(2026, 9, 1, 6, 40), "First observation reported", "Sneha Kulkarni",
             "Community bin overflowing near the market stretch."),
            ("verified", D(2026, 9, 3, 11, 25), "Marked verified", "CIVICOS verification",
             "3 observations confirmed the missed collections."),
            ("observation", D(2026, 9, 19, 8, 15), "Latest observation added", "Farhan Ahmed",
             "5th observation on this incident."),
        ],
    },
    {
        "id": "HYD-ST-1120", "issue": "streetlights", "title": "Broken Streetlight",
        "latitude": 17.4156, "longitude": 78.4351,
        "location": "Road No. 12, Banjara Hills",
        "severity": "low", "priority": "low", "status": "reported",
        "department": DEPARTMENTS["streetlights"]["name"],
        "summary": "Two poles dark near the Road No. 12 park stretch; unlit footpath after sunset.",
        "first": D(2026, 9, 15, 19, 20), "last": D(2026, 9, 19, 19, 40),
        "contributors": ["u-deepak", "u-swathi"],
        "images": [], "her": {}, "worsening": False,
        "timeline": [
            ("observation", D(2026, 9, 15, 19, 20), "First observation reported", "Deepak Rao",
             "Two consecutive poles dark near the park."),
            ("observation", D(2026, 9, 19, 19, 40), "Latest observation added", "Swathi Reddy",
             "2nd observation confirming the outage."),
        ],
    },
    {
        "id": "HYD-GR-3107", "issue": "garbage", "title": "Garbage Accumulation",
        "latitude": 17.4150, "longitude": 78.4310,
        "location": "Road No. 71, Jubilee Hills",
        "severity": "medium", "priority": "medium", "status": "verified",
        "department": DEPARTMENTS["garbage"]["name"],
        "summary": "Unattended waste point on Road No. 71; overflow recurring between collections.",
        "first": D(2026, 8, 11, 7, 30), "last": D(2026, 9, 19, 19, 5),
        "contributors": ["u-priya", DEMO_USER, "u-vikram", "u-ananya", "u-imran", "u-sara"],
        "images": [1, 4], "her": {1: D(2026, 8, 14, 8, 5)},
        "worsening": False,
        "timeline": [
            ("observation", D(2026, 8, 11, 7, 30), "First observation reported", "Priya Nair",
             "Waste point overflowing near the community hall."),
            ("verified", D(2026, 8, 13, 10, 45), "Marked verified", "CIVICOS verification",
             "3 observations within 250 m confirmed the recurring overflow."),
            ("observation", D(2026, 9, 17, 19, 25), "Latest observation added", "Tanisha Rao",
             "6th observation; overflow continues between pickups."),
        ],
    },
    {
        "id": "HYD-ST-1093", "issue": "streetlights", "title": "Broken Streetlight",
        "latitude": 17.4102, "longitude": 78.4401,
        "location": "Road No. 5, Banjara Hills",
        "severity": "low", "priority": "low", "status": "resolution_verified",
        "department": DEPARTMENTS["streetlights"]["name"],
        "summary": "Streetlight pole LB-0442 dark for a 40 m stretch on Road No. 5, Banjara Hills.",
        "first": D(2026, 9, 8, 7, 15), "last": D(2026, 9, 12, 19, 30),
        "contributors": ["u-farhan", DEMO_USER, "u-sneha"],
        "images": [0],
        "her": {1: D(2026, 9, 8, 20, 45)},
        "worsening": False,
        "timeline": [
            ("observation", D(2026, 9, 8, 7, 15), "First observation reported", "Farhan Ahmed",
             "Pole LB-0442 not lighting the stretch."),
            ("verified", D(2026, 9, 9, 9, 0), "Marked verified", "CIVICOS verification",
             "3 observations confirmed the outage."),
            ("assigned", D(2026, 9, 10, 12, 10), "Assigned to Electric Wing", "Operations",
             "Routed to GHMC Electric Wing — ticket EL-3321."),
            ("resolved", D(2026, 9, 18, 16, 30), "Marked resolved", "GHMC Electric Wing",
             "Lamp replaced and circuit repaired on pole LB-0442."),
            ("verification", D(2026, 9, 19, 20, 15), "Repair verified by citizen", "Tanisha Rao",
             "Verified after dark — pole fully lit."),
        ],
        "resolution": {
            "id": "res-1", "resolved_at": D(2026, 9, 18, 16, 30),
            "resolved_by": "GHMC Electric Wing",
            "notes": "Lamp replaced and circuit repaired on pole LB-0442.",
            "before_index": 0,
            "evidence_kind": "streetlight",
        },
        "verification": {
            "id": "ver-1", "resolution_id": "res-1", "created_at": D(2026, 9, 19, 20, 15),
            "verified_by": "Tanisha Rao", "result": "verified",
            "after_image": None, "after_sample_id": "after-streetlights-repaired",
            "location_match": True, "visual_match": 0.31,
            "rationale": [
                "After frame shows the pole fully lit against the same skyline landmarks.",
                "Capture position is 35 m from the incident location — within verification tolerance.",
                "No dark-stretch pattern remains in the compared frame.",
            ],
        },
    },
    {
        "id": "HYD-GR-2604", "issue": "garbage", "title": "Garbage Accumulation",
        "latitude": 17.4089, "longitude": 78.4290,
        "location": "Road No. 36, Banjara Hills",
        "severity": "medium", "priority": "medium", "status": "resolved",
        "department": DEPARTMENTS["garbage"]["name"],
        "summary": "Unattended household waste point on Road No. 36; recurring overflow between pickups.",
        "first": D(2026, 7, 30, 7, 50), "last": D(2026, 9, 17, 9, 10),
        "contributors": ["u-rahul", "u-priya", DEMO_USER, "u-arjun", "u-sneha", "u-deepak"],
        "images": [0, 2, 4, 6],
        "her": {2: D(2026, 9, 3, 18, 40)},
        "worsening": False,
        "timeline": [
            ("observation", D(2026, 7, 30, 7, 50), "First observation reported", "Rahul Mehta",
             "Household waste piling up at the community corner."),
            ("verified", D(2026, 8, 1, 9, 30), "Marked verified", "CIVICOS verification",
             "4 observations confirmed the recurring waste point."),
            ("observation", D(2026, 9, 3, 18, 40), "Observation added", "Tanisha Rao",
             "Overflow continues between weekly pickups."),
            ("resolved", D(2026, 9, 18, 17, 5), "Marked resolved", "GHMC Solid Waste Management",
             "Sanitation crew cleared the point; two bins installed; weekly pickup scheduled (route SW-77)."),
        ],
        "resolution": {
            "id": "res-3", "resolved_at": D(2026, 9, 18, 17, 5),
            "resolved_by": "GHMC Solid Waste Management",
            "notes": "Sanitation crew cleared the point; two bins installed; weekly pickup scheduled (route SW-77).",
            "before_index": 0,
            "evidence_kind": "garbage_cleared",
        },
    },
    {
        "id": "HYD-WL-3812", "issue": "water", "title": "Water Leakage",
        "latitude": 17.4239, "longitude": 78.4128,
        "location": "Road No. 45, Jubilee Hills",
        "severity": "medium", "priority": "medium", "status": "resolved",
        "department": DEPARTMENTS["water"]["name"],
        "summary": "Continuous leakage from a valve chamber flooding half the carriageway on Road No. 45.",
        "first": D(2026, 7, 21, 6, 20), "last": D(2026, 9, 10, 20, 40),
        "contributors": ["u-divya", "u-karthik", DEMO_USER, "u-ananya", "u-rohit", "u-lakshmi", "u-nikhil", "u-swathi"],
        "images": [0, 3, 5, 8],
        "her": {3: D(2026, 8, 25, 8, 20), 8: D(2026, 9, 6, 21, 10)},
        "worsening": False,
        "timeline": [
            ("observation", D(2026, 7, 21, 6, 20), "First observation reported", "Divya Menon",
             "Steady leak flooding the carriageway near the valve chamber."),
            ("verified", D(2026, 7, 23, 9, 45), "Marked verified", "CIVICOS verification",
             "5 observations confirmed the continuous leak."),
            ("observation", D(2026, 8, 25, 8, 20), "Observation added", "Tanisha Rao",
             "Leak continues; silt spreading across the lane."),
            ("assigned", D(2026, 9, 2, 11, 30), "Assigned to Water Board", "Operations",
             "Valve replacement scheduled — ticket WL-8871."),
            ("resolved", D(2026, 9, 16, 14, 40), "Marked resolved", "HMWSSB Water Board",
             "Valve chamber replaced; carriageway restored (ticket WL-8871)."),
        ],
        "resolution": {
            "id": "res-4", "resolved_at": D(2026, 9, 16, 14, 40),
            "resolved_by": "HMWSSB Water Board",
            "notes": "Valve chamber replaced; carriageway restored (ticket WL-8871).",
            "before_index": 3,
            "evidence_kind": "roads_repaired",
        },
    },
    {
        "id": "HYD-DR-1176", "issue": "drainage", "title": "Drainage Overflow",
        "latitude": 17.4615, "longitude": 78.3639,
        "location": "Kondapur Main Road",
        "severity": "high", "priority": "high", "status": "verified",
        "department": DEPARTMENTS["drainage"]["name"],
        "summary": "Storm-water drain overflow across the Kondapur main road service lane; spreading toward the junction.",
        "first": D(2026, 8, 30, 7, 10), "last": D(2026, 9, 19, 21, 4),
        "contributors": ["u-meghana", "u-farhan", "u-vikram", "u-divya", "u-karthik",
                         "u-ananya", "u-rohit", "u-imran", "u-lakshmi", "u-nikhil"],
        "images": [1, 3, 5, 7, 9, 11], "her": {}, "worsening": True,
        "timeline": [
            ("observation", D(2026, 8, 30, 7, 10), "First observation reported", "Meghana Iyer",
             "Drain overflow across the service lane after overnight rain."),
            ("verified", D(2026, 8, 31, 9, 40), "Marked verified", "CIVICOS verification",
             "4 observations within 300 m confirmed the overflow."),
            ("observation", D(2026, 9, 12, 18, 0), "5 additional observations in 48 hours", "CIVICOS triage",
             "Cluster growth flagged this incident for review."),
            ("severity", D(2026, 9, 18, 8, 15), "Severity increased to high", "CIVICOS triage",
             "Overflow spreading toward the junction after weekend rain."),
            ("observation", D(2026, 9, 19, 21, 4), "Latest observation added", "Rohit Yadav",
             "14th observation; awaiting department assignment."),
        ],
    },
    {
        "id": "HYD-DR-1190", "issue": "drainage", "title": "Drainage Overflow",
        "latitude": 17.4247, "longitude": 78.4136,
        "location": "Road No. 45, Jubilee Hills",
        "severity": "high", "priority": "high", "status": "assigned",
        "department": DEPARTMENTS["drainage"]["name"],
        "summary": "Storm drain overflowing at the Road No. 45 low point; waterlogging the junction.",
        "first": D(2026, 8, 26, 8, 5), "last": D(2026, 9, 19, 7, 45),
        "contributors": ["u-rohit", "u-imran", "u-sara", "u-divya", "u-meghana", "u-nikhil"],
        "images": [1, 4, 7], "her": {}, "worsening": True,
        "timeline": [
            ("observation", D(2026, 8, 26, 8, 5), "First observation reported", "Rohit Yadav",
             "Drain backing up at the junction low point."),
            ("verified", D(2026, 8, 28, 10, 20), "Marked verified", "CIVICOS verification",
             "3 observations confirmed the overflow."),
            ("assigned", D(2026, 9, 10, 14, 0), "Assigned for desilting", "Operations",
             "Desilting crew scheduled — work order SW-5541."),
            ("observation", D(2026, 9, 19, 7, 45), "Latest observation added", "Imran Sheikh",
             "8th observation; waterlogging persists."),
        ],
    },
    {
        "id": "HYD-WL-3877", "issue": "water", "title": "Water Leakage",
        "latitude": 17.4191, "longitude": 78.4244,
        "location": "Road No. 70, Jubilee Hills",
        "severity": "medium", "priority": "medium", "status": "verified",
        "department": DEPARTMENTS["water"]["name"],
        "summary": "Leak at the Road No. 70 junction; steady pooling since Friday.",
        "first": D(2026, 9, 4, 7, 35), "last": D(2026, 9, 19, 8, 50),
        "contributors": ["u-ananya", "u-karthik", "u-lakshmi"],
        "images": [0, 2], "her": {}, "worsening": False,
        "timeline": [
            ("observation", D(2026, 9, 4, 7, 35), "First observation reported", "Ananya Das",
             "Steady pooling at the junction since Friday morning."),
            ("verified", D(2026, 9, 6, 9, 15), "Marked verified", "CIVICOS verification",
             "3 observations confirmed the leak."),
            ("observation", D(2026, 9, 19, 8, 50), "Latest observation added", "Karthik Varma",
             "4th observation; pooling continues."),
        ],
    },
    {
        "id": "HYD-PW-1712", "issue": "roads", "title": "Road Damage",
        "latitude": 17.4456, "longitude": 78.3497,
        "location": "Gachibowli Service Road",
        "severity": "medium", "priority": "medium", "status": "resolution_verified",
        "department": DEPARTMENTS["roads"]["name"],
        "summary": "Pothole cluster on the Gachibowli service road near the IIIT junction — repaired and citizen-verified.",
        "first": D(2026, 6, 28, 8, 30), "last": D(2026, 8, 30, 10, 0),
        "contributors": ["u-meghana", "u-nikhil", "u-sara", "u-swathi"],
        "images": [0, 2, 4],
        "her": {},
        "worsening": False,
        "timeline": [
            ("observation", D(2026, 6, 28, 8, 30), "First observation reported", "Meghana Iyer",
             "Pothole cluster near the IIIT junction."),
            ("verified", D(2026, 6, 30, 10, 30), "Marked verified", "CIVICOS verification",
             "4 observations confirmed the potholes."),
            ("resolved", D(2026, 9, 2, 11, 20), "Marked resolved", "GHMC Roads & Transportation",
             "Cold-mix patch applied by Roads & Transportation (work order R-9912)."),
            ("verification", D(2026, 9, 5, 18, 30), "Repair verified by citizens", "3 contributing citizens",
             "After captures from 3 contributors show a durable repair."),
        ],
        "resolution": {
            "id": "res-2", "resolved_at": D(2026, 9, 2, 11, 20),
            "resolved_by": "GHMC Roads & Transportation",
            "notes": "Cold-mix patch applied by Roads & Transportation (work order R-9912).",
            "before_index": 0,
            "evidence_kind": "roads_repaired",
        },
        "verification": {
            "id": "ver-2", "resolution_id": "res-2", "created_at": D(2026, 9, 5, 18, 30),
            "verified_by": "3 contributing citizens", "result": "verified",
            "after_image": None, "after_sample_id": "after-roads-repaired",
            "location_match": True, "visual_match": 0.28,
            "rationale": [
                "After frames show a resurfaced patch across the repaired section.",
                "Capture positions within 60 m of the incident location.",
                "No pothole pattern remains in any of the compared frames.",
            ],
        },
    },
    {
        "id": "HYD-AC-1445", "issue": "accessibility", "title": "Accessibility Hazard",
        "latitude": 17.4441, "longitude": 78.3788,
        "location": "Hitec City MMTS Approach",
        "severity": "medium", "priority": "low", "status": "reported",
        "department": DEPARTMENTS["accessibility"]["name"],
        "summary": "Broken sidewalk slabs and a blocked ramp at the Hitec City MMTS station approach.",
        "first": D(2026, 9, 10, 9, 5), "last": D(2026, 9, 19, 18, 55),
        "contributors": ["u-divya", "u-karthik", "u-ananya", "u-rohit"],
        "images": [1], "her": {}, "worsening": False,
        "timeline": [
            ("observation", D(2026, 9, 10, 9, 5), "First observation reported", "Divya Menon",
             "Broken slabs and blocked ramp at the station approach."),
            ("observation", D(2026, 9, 19, 18, 55), "Latest observation added", "Rohit Yadav",
             "4th observation; still obstructing wheelchair movement."),
        ],
    },
    {
        "id": "HYD-RD-2277", "issue": "roads", "title": "Road Damage",
        "latitude": 17.4489, "longitude": 78.3860,
        "location": "Jubilee Enclave Road",
        "severity": "high", "priority": "high", "status": "reported",
        "department": DEPARTMENTS["roads"]["name"],
        "summary": "Road surface sinking after cable-laying work on Jubilee Enclave Road.",
        "first": D(2026, 9, 14, 8, 25), "last": D(2026, 9, 19, 19, 20),
        "contributors": ["u-meghana", "u-farhan", "u-vikram", "u-swathi"],
        "images": [0, 2], "her": {}, "worsening": True,
        "timeline": [
            ("observation", D(2026, 9, 14, 8, 25), "First observation reported", "Meghana Iyer",
             "Surface sinking along the cable-laying trench."),
            ("observation", D(2026, 9, 19, 19, 20), "Latest observation added", "Vikram Shah",
             "Surface sinking further after rain."),
        ],
    },
    {
        "id": "HYD-ST-1155", "issue": "streetlights", "title": "Broken Streetlight",
        "latitude": 17.4496, "longitude": 78.3917,
        "location": "100-ft Road, Madhapur",
        "severity": "low", "priority": "low", "status": "in_progress",
        "department": DEPARTMENTS["streetlights"]["name"],
        "summary": "Three consecutive streetlight outages along 100-ft Road, Madhapur.",
        "first": D(2026, 8, 25, 19, 45), "last": D(2026, 9, 17, 20, 10),
        "contributors": ["u-imran", "u-lakshmi", "u-nikhil", "u-sara", "u-deepak"],
        "images": [2, 5], "her": {}, "worsening": False,
        "timeline": [
            ("observation", D(2026, 8, 25, 19, 45), "First observation reported", "Imran Sheikh",
             "Three poles dark near the commercial stretch."),
            ("verified", D(2026, 8, 28, 9, 0), "Marked verified", "CIVICOS verification",
             "4 observations confirmed the outages."),
            ("assigned", D(2026, 9, 5, 11, 40), "Assigned to Electric Wing", "Operations",
             "Routed to GHMC Electric Wing — ticket EL-3350."),
            ("in_progress", D(2026, 9, 10, 10, 30), "Repair in progress", "GHMC Electric Wing",
             "Materials procured — replacement scheduled this week."),
        ],
    },
    {
        "id": "HYD-GR-2941", "issue": "garbage", "title": "Garbage Accumulation",
        "latitude": 17.4483, "longitude": 78.3930,
        "location": "Ayyappa Society, Madhapur",
        "severity": "medium", "priority": "medium", "status": "in_progress",
        "department": DEPARTMENTS["garbage"]["name"],
        "summary": "Overflowing garbage transfer point near Ayyappa Society metro pillar 1247.",
        "first": D(2026, 8, 2, 7, 25), "last": D(2026, 9, 19, 9, 30),
        "contributors": ["u-rahul", "u-divya", "u-karthik", "u-meghana", "u-farhan"],
        "images": [0, 3, 5], "her": {}, "worsening": False,
        "timeline": [
            ("observation", D(2026, 8, 2, 7, 25), "First observation reported", "Rahul Mehta",
             "Transfer point overflowing near metro pillar 1247."),
            ("verified", D(2026, 8, 6, 10, 20), "Marked verified", "CIVICOS verification",
             "3 observations confirmed the overflow."),
            ("assigned", D(2026, 9, 8, 12, 0), "Assigned for clearance", "Operations",
             "Route clearance scheduled — service request SR-2213."),
            ("in_progress", D(2026, 9, 15, 9, 0), "Clearance in progress", "GHMC Solid Waste Management",
             "Crew assigned; additional bin requested for the point."),
        ],
    },
]

# --- Notifications & activity (demo user) ------------------------------------------------

_NOTIFICATIONS = [
    ("n-1", "report", "Your report was added to incident HYD-RD-2048",
     "Your road damage observation joined 22 others on Road No. 12. The incident is awaiting repair.",
     "HYD-RD-2048", D(2026, 9, 20, 9, 13), False),
    ("n-2", "activity", "4 new observations were added to an incident near you",
     "Storm-drain overflow on Kondapur Main Road (HYD-DR-1176) now has 14 observations.",
     "HYD-DR-1176", D(2026, 9, 19, 21, 4), False),
    ("n-3", "resolution", "The garbage point you reported was cleared — verify it",
     "HYD-GR-2604 was marked resolved by Solid Waste Management. Open the incident to verify the cleanup.",
     "HYD-GR-2604", D(2026, 9, 18, 17, 10), False),
    ("n-4", "verification", "Your verification was recorded — HYD-ST-1093",
     "Repair verified: the streetlight you reported is working again.",
     "HYD-ST-1093", D(2026, 9, 19, 20, 16), True),
    ("n-5", "assignment", "HYD-RD-2048 was assigned for repair",
     "Routed to GHMC Roads & Transportation — awaiting repair.",
     "HYD-RD-2048", D(2026, 9, 18, 15, 45), True),
    ("n-6", "verification", "Repair verified by citizens — HYD-PW-1712",
     "Three contributors confirmed the pothole repair on the Gachibowli service road.",
     "HYD-PW-1712", D(2026, 9, 5, 18, 31), True),
]

_ACTIVITY = [
    ("a-1", "report", "Your road damage report was added to incident HYD-RD-2048.",
     "HYD-RD-2048", D(2026, 9, 20, 9, 12)),
    ("a-2", "observation", "4 new observations were added to an incident near you (HYD-DR-1176).",
     "HYD-DR-1176", D(2026, 9, 19, 21, 4)),
    ("a-3", "resolution", "The streetlight you reported (HYD-ST-1093) was marked resolved.",
     "HYD-ST-1093", D(2026, 9, 18, 16, 30)),
    ("a-4", "resolution", "HYD-GR-2604 was resolved — cleanup awaiting citizen verification.",
     "HYD-GR-2604", D(2026, 9, 18, 17, 5)),
    ("a-5", "verification", "Repair verified by 3 contributors for HYD-PW-1712.",
     "HYD-PW-1712", D(2026, 9, 5, 18, 30)),
    ("a-6", "observation", "Your water leakage observation joined incident HYD-WL-3812.",
     "HYD-WL-3812", D(2026, 9, 6, 21, 10)),
]


def _spread(first: datetime, last: datetime, n: int) -> list[datetime]:
    if n == 1:
        return [first]
    span = (last - first).total_seconds()
    return [first + timedelta(seconds=span * i / (n - 1)) for i in range(n)]


def build(store) -> None:
    """Populate an empty DemoStore with the deterministic world."""
    for uid, (name, area) in _USERS.items():
        first = name.split()[0]
        store.users[uid] = {
            "id": uid, "name": name, "first_name": first,
            "email": f"{first.lower()}.{name.split()[-1].lower()}@example.com",
            "area": area, "initials": "".join(w[0] for w in name.split()[:2]).upper(),
        }

    obs_seq = 1
    for d in _INCIDENT_DEFS:
        n_obs = d.get("obs_count") or _DEFAULT_COUNTS.get(d["id"], 4)
        times = _spread(d["first"], d["last"], n_obs)
        others = [u for u in d["contributors"] if u != DEMO_USER]
        obs_ids: list[str] = []
        oi = 0
        for i, ts in enumerate(times):
            if i in d["her"]:
                ts, uid = d["her"][i], DEMO_USER
            else:
                uid = others[oi % len(others)]
                oi += 1
            sev = d["severity"]
            if d.get("worsening") and i < len(times) // 3 and sev == "high":
                sev = "medium"
            desc = POOLS[d["issue"]][i % len(POOLS[d["issue"]])]
            oid = f"o-{obs_seq}"
            obs_seq += 1
            lat = d["latitude"] + (((i * 37) % 17) - 8) * 0.00018
            lng = d["longitude"] + (((i * 53) % 23) - 11) * 0.00019
            img = images.frame_data_uri(d["issue"], oid) if i in d.get("images", []) else None
            store.observations[oid] = {
                "id": oid, "user_id": uid, "image_uri": img,
                "latitude": round(lat, 6), "longitude": round(lng, 6),
                "timestamp": ts, "issue_type": d["issue"],
                "confidence": 0.86 + ((i * 13) % 12) / 100.0,
                "severity": sev, "description": desc,
                "location_label": d["location"],
                "embedding": embed(desc, d["issue"], sev, image_ref=oid if img else ""),
            }
            obs_ids.append(oid)

        inc = {
            "id": d["id"], "title": d["title"], "issue_type": d["issue"],
            "latitude": d["latitude"], "longitude": d["longitude"],
            "location_label": d["location"], "severity": d["severity"],
            "priority": d["priority"], "status": d["status"],
            "department": d["department"], "summary": d["summary"],
            "first_seen": d["first"], "last_seen": d["last"],
            "worsening": d.get("worsening", False),
            "embedding": embed(
                f"{d['title']} {d['summary']} {d['location']}",
                d["issue"], d["severity"], image_ref=d["issue"],
            ),
        }
        store.incidents[d["id"]] = inc
        for i, oid in enumerate(obs_ids):
            store.links.append({
                "incident_id": d["id"], "observation_id": oid,
                "similarity": 1.0 if i == 0 else 0.9 + ((i * 37) % 9) / 100.0,
            })
        ev_seq = 1
        for (etype, ts, label, actor, detail) in d["timeline"]:
            store.timeline.append({
                "id": f"t-{d['id']}-{ev_seq}", "incident_id": d["id"],
                "event_type": etype, "label": label, "detail": detail,
                "timestamp": ts, "actor": actor,
            })
            ev_seq += 1
        if "resolution" in d:
            r = d["resolution"]
            before_oid = obs_ids[r["before_index"]]
            store.resolutions[r["id"]] = {
                "id": r["id"], "incident_id": d["id"], "resolved_at": r["resolved_at"],
                "resolved_by": r["resolved_by"], "notes": r["notes"],
                "evidence_uri": images.frame_data_uri(r["evidence_kind"], r["id"]),
                "before_observation_id": before_oid,
                "before_image_uri": store.observations[before_oid]["image_uri"],
            }
        if "verification" in d:
            v = d["verification"]
            after_uri = v["after_image"] or images.frame_data_uri(
                "after", v["after_sample_id"] or inc_id
            )
            store.verifications[v["id"]] = {
                "id": v["id"], "resolution_id": v["resolution_id"],
                "after_image_uri": after_uri, "result": v["result"],
                "location_match": v["location_match"], "visual_match": v["visual_match"],
                "rationale": v["rationale"], "created_at": v["created_at"],
                "verified_by": v["verified_by"],
            }

    for (nid, ntype, title, body, inc_id, ts, read) in _NOTIFICATIONS:
        store.notifications.append({
            "id": nid, "type": ntype, "title": title, "body": body,
            "incident_id": inc_id, "timestamp": ts, "read": read,
        })
    for (aid, kind, text, inc_id, ts) in _ACTIVITY:
        store.activity.append({
            "id": aid, "kind": kind, "text": text,
            "incident_id": inc_id, "timestamp": ts,
        })


# Observation counts per incident (explicit, matches the narrative numbers).
_DEFAULT_COUNTS = {
    "HYD-RD-2048": 23,
    "HYD-RD-2155": 9,
    "HYD-GR-3050": 5,
    "HYD-ST-1120": 2,
    "HYD-GR-3107": 7,
    "HYD-ST-1093": 3,
    "HYD-GR-2604": 9,
    "HYD-WL-3812": 11,
    "HYD-DR-1176": 14,
    "HYD-DR-1190": 8,
    "HYD-WL-3877": 4,
    "HYD-PW-1712": 6,
    "HYD-AC-1445": 4,
    "HYD-RD-2277": 5,
    "HYD-ST-1155": 6,
    "HYD-GR-2941": 7,
}
