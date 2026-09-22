# CIVICOS

**An AI-powered civic intelligence platform that turns scattered citizen observations into verified, prioritized civic incidents — and closes the loop by verifying whether reported problems were actually fixed.**

> DON'T JUST REPORT WHAT'S BROKEN.
> UNDERSTAND WHAT IS HAPPENING AROUND YOU.

This is a **prototype**: deterministic demo mode, realistic Hyderabad fixtures, simulated GHMC connector. No real government system is contacted.

---

## The pipeline

```
Citizen Observation → AI Understanding → Location + Evidence
  → Duplicate / Similarity Check → Incident Clustering → Priority Analysis
  → Department Recommendation → Incident Timeline → Resolution
  → Before / After Verification
```

Key product rules baked into the implementation:

- **Map markers are incidents, not reports.** 23 pothole complaints ≈ 1 red marker with "23 observations · 17 contributors".
- **Clustering is explainable.** Similarity = geo decay + embedding cosine + category gate + recency, with the reasons shown in the UI (≥ 0.80 attach, 0.55–0.80 confirm with the citizen, else new incident).
- **No opaque AI scores.** Priority is explained via factors: severity, repeated observations, traffic impact, worsening trend.
- **The loop closes only when citizens verify.** Resolved ≠ fixed; a before/after capture produces REPAIR VERIFIED / ISSUE STILL PRESENT / NEEDS REVIEW with evidence-based wording.
- **Demo mode is deterministic** and the UI works even when AI/API calls fail (fallback heuristics + honest "Demo vision" labeling).

## Stack & architecture

```
├── src/                     # Next.js 14 + TypeScript + Tailwind (App Router)
│   ├── app/                 # /  /map  /report  /reports  /alerts  /impact
│   │                        # /incidents/[id]  /settings  /ops
│   ├── components/          # layout · map · report · incident · ui
│   └── lib/                 # api client, types, format, color semantics
├── backend/                 # FastAPI
│   └── app/
│       ├── services/        # vision · embeddings · clustering · routing · verification · llm · images
│       ├── store/           # DemoStore (deterministic) + SupabaseStore skeleton
│       ├── seed.py          # hand-crafted Hyderabad world (16 incidents, 123 observations)
│       └── routers/         # core · incidents · reports · verify · complaints · notifications · ops
└── supabase/schema.sql      # Postgres schema: 9 tables, enums, indexes, RLS sketch
```

**Decisions & tradeoffs**

| Decision | Why |
|---|---|
| Deterministic in-memory DemoStore default | Zero-credential demo, reproducible similarity scores and timeline; Supabase adapter + schema ship ready (env-switch). |
| Hash-based demo embeddings & heuristics | Reproducible offline; same interface swaps for CLIP/text embeddings + a vision model when `OPENAI_API_KEY` is set. |
| LangGraph skipped | The pipeline is linear; explicit service functions keep it debuggable. |
| MapLibre GL + CARTO Positron | OSM-compatible tiles that match the "Google Maps × Linear" aesthetic. |
| No auth | Single demo citizen (Tanisha Rao); RLS sketch in schema covers the real design. |

## Run it

```bash
# 1. Backend (port 8000)
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000

# 2. Frontend (port 3000) — new terminal
npm install
npm run dev
```

Open **http://localhost:3000**. Optional env: copy `backend/.env.example` → `backend/.env` for live AI/Supabase; `NEXT_PUBLIC_API_URL` points the frontend at the API.

## Hero demo script (5 minutes)

1. **Overview** — the dashboard answers *what / where / how serious / what I contributed*: stat cards, large Civic Map (one marker per incident), nearby incidents with distance + priority, recent activity.
2. **Report Issue** (camera-first) → use the **"Deep pothole"** sample photo → AI detection (Road Damage, 96%, HIGH, explainable "why") → **possible existing incident found: HYD-RD-2048 at ~84%** → *Add to incident* → observation #24 joins the cluster; timeline and map update.
3. **Incident HYD-RD-2048** — why-this-matters factors, evidence grid, timeline (Jun 14 → Sep 20), status stepper.
4. **Ops console** (sidebar → Ops console, demo): pick an `Assigned` incident → **Resolve**. Contributors get notified.
5. **Back on the incident** — *Verify this repair*: guidance, before/after capture, run comparison → 🟢 **Repair verified** (marker turns green). Try the "defect still present" sample → 🔴 reopened; an ambiguous frame → 🟡 needs review.
6. **GHMC complaint** — generate draft → submit → **"Prototype submission created — GHMC-DEMO-XXXXX"** (never claims a real submission).

## Data model

`users · observations · incidents · incident_observations · timeline_events · resolutions · verifications · complaint_drafts · notifications` — full DDL with enums, indexes and an RLS sketch in [`supabase/schema.sql`](supabase/schema.sql).

## Roadmap (past the prototype)

- SupabaseStore activation (Postgres + Storage + RLS)
- Real embeddings (CLIP-style) + pgvector ANN clustering
- GHMC connector: OAuth + ticket API behind the existing `complaint_drafts.connector` seam
- Auth (phone OTP) + multi-city rollout
- Push notifications + ward-level digest emails
