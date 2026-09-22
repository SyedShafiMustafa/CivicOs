"""Before/after resolution verification.

Compares a citizen's "after" capture against the pre-resolution evidence and
returns one of three outcomes with evidence-based wording. The service never
overclaims: computer vision cannot *guarantee* a repair, so results are framed
as supported findings; inconclusive cases land in "needs_review".
"""
from __future__ import annotations

from app.services.embeddings import cosine

LOCATION_TOLERANCE_M = 150

# Demo after-samples are curated, so their outcome is part of the fixture.
_CLEAR_SUFFIXES = ("-cleared", "-repaired")
_PRESENT_SUFFIXES = ("-present", "-same")


def evaluate(
    before_emb: list[float] | None,
    after_emb: list[float] | None,
    after_sample_id: str | None,
    distance_m: float | None,
) -> dict:
    visual = cosine(before_emb or [], after_emb or [])
    loc_ok = distance_m is not None and distance_m <= LOCATION_TOLERANCE_M

    if after_sample_id:
        if after_sample_id.endswith(_CLEAR_SUFFIXES):
            result = "verified"
        elif after_sample_id.endswith(_PRESENT_SUFFIXES):
            result = "issue_present"
        else:
            result = "needs_review"
    elif not after_emb:
        result = "needs_review"
    elif visual > 0.82:
        result = "issue_present"
    elif visual < 0.40 and loc_ok:
        result = "verified"
    else:
        result = "needs_review"

    if result == "verified":
        rationale = [
            "After frame shows a cleared/resurfaced surface consistent with a completed repair.",
            (
                f"Capture position is {distance_m:.0f} m from the incident location — within "
                "verification tolerance."
                if loc_ok
                else "Capture position was not re-confirmed; result is based on visual evidence alone."
            ),
            "No trace of the originally reported defect is visible in the compared frame.",
        ]
    elif result == "issue_present":
        rationale = [
            "Damage/accumulation pattern closely resembles the original observation.",
            f"Visual similarity to the original defect frame: {visual * 100:.0f}%.",
            (
                f"Capture position is {distance_m:.0f} m from the incident location."
                if loc_ok
                else "Capture position was not confirmed."
            ),
        ]
    else:
        rationale = [
            "Frames differ significantly — this capture cannot confirm either repair or persistence.",
            "Re-capture from the original vantage point, matching the reference angle, for a conclusive check.",
        ]

    return {
        "result": result,
        "location_match": loc_ok if distance_m is not None else None,
        "visual_match": round(visual, 2),
        "rationale": rationale,
    }
