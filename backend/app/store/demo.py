"""Deterministic in-memory demo store.

Implements the same interface a Supabase store would (see supabase_store.py).
All domain logic — clustering attachment, incident lifecycle, verification,
complaint drafting — lives here so the persistence layer stays swappable.
"""
from __future__ import annotations

import hashlib
from datetime import datetime
from threading import Lock

from app import config, seed
from app.schemas import (
    ActivityItem,
    AnalyzeOut,
    ComplaintOut,
    ImpactOut,
    IncidentDetail,
    IncidentSummary,
    MatchCandidateOut,
    MatchOut,
    MeOut,
    NotificationOut,
    ObservationOut,
    ReportOut,
    ResolutionOut,
    SamplePhotoOut,
    StatsOverview,
    TimelineEventOut,
    VerificationOut,
    WhyFactor,
)
from app.services import clustering, images, routing, verification as vsvc, vision
from app.services.embeddings import embed

STATUS_LABELS = {
    "reported": "Reported",
    "verified": "Verified",
    "in_progress": "In progress",
    "assigned": "Awaiting repair",
    "resolved": "Resolved",
    "resolution_verified": "Resolution verified",
}
ACTIVE_STATUSES = {"reported", "verified", "in_progress", "assigned"}
PRIORITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}
PREFIX = {
    "roads": "RD", "garbage": "GR", "water": "WL",
    "streetlights": "ST", "drainage": "DR", "accessibility": "AC",
}
_SEVERITY_PHRASE = {
    "critical": "Critical — immediate hazard",
    "high": "High — significant damage affecting daily movement",
    "medium": "Medium — visible defect affecting regular use",
    "low": "Low — minor but recurring defect",
}


class DemoStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self.users: dict = {}
        self.observations: dict = {}
        self.incidents: dict = {}
        self.links: list = []
        self.timeline: list = []
        self.resolutions: dict = {}
        self.verifications: dict = {}
        self.complaints: dict = {}
        self.notifications: list = []
        self.activity: list = []
        self._seq = {
            "observation": 500, "incident": 3001, "event": 900,
            "resolution": 10, "verification": 10, "complaint": 10,
            "notification": 100, "activity": 100,
        }
        seed.build(self)

    # --- internals ---------------------------------------------------------

    def _now(self) -> datetime:
        return datetime(2026, 9, 20, 9, 30)

    def _demo_user_id(self) -> str:
        return config.DEMO_USER_ID

    def _user(self, uid: str) -> dict:
        return self.users.get(uid) or {
            "id": uid, "name": "Citizen", "first_name": "Citizen",
            "email": "", "area": "", "initials": "CI", "avatar_uri": None,
        }

    def _obs_ids(self, inc_id: str) -> list[str]:
        return [l["observation_id"] for l in self.links if l["incident_id"] == inc_id]

    def _observation_out(self, o: dict) -> ObservationOut:
        return ObservationOut(
            id=o["id"], user_id=o["user_id"],
            user_name=self._user(o["user_id"])["name"],
            user_avatar_uri=self._user(o["user_id"]).get("avatar_uri"),
            image_uri=o["image_uri"], latitude=o["latitude"],
            longitude=o["longitude"], timestamp=o["timestamp"],
            issue_type=o["issue_type"], confidence=o["confidence"],
            severity=o["severity"], description=o["description"],
            location_label=o["location_label"],
        )

    def _incident_summary(self, inc: dict, lat=None, lng=None) -> IncidentSummary:
        obs = [self.observations[o] for o in self._obs_ids(inc["id"])]
        distance = None
        if lat is not None and lng is not None:
            distance = round(clustering.haversine_m((lat, lng), (inc["latitude"], inc["longitude"])))
        thumbnail = images.photo_uri(
            inc["issue_type"], inc["id"]
        ) if obs else None
        return IncidentSummary(
            id=inc["id"], title=inc["title"], issue_type=inc["issue_type"],
            latitude=inc["latitude"], longitude=inc["longitude"],
            location_label=inc["location_label"], severity=inc["severity"],
            priority=inc["priority"], status=inc["status"],
            status_label=STATUS_LABELS[inc["status"]],
            first_seen=inc["first_seen"], last_seen=inc["last_seen"],
            observation_count=len(obs),
            contributor_count=len({o["user_id"] for o in obs}),
            image_count=sum(1 for o in obs if o["image_uri"]),
            department=inc["department"], summary=inc["summary"],
            thumbnail_uri=thumbnail,
            distance_m=distance,
        )

    def _timeline_out(self, inc_id: str) -> list[TimelineEventOut]:
        events = [e for e in self.timeline if e["incident_id"] == inc_id]
        events.sort(key=lambda e: e["timestamp"])
        return [TimelineEventOut(**e) for e in events]

    def _why(self, inc: dict) -> list[WhyFactor]:
        obs = [self.observations[o] for o in self._obs_ids(inc["id"])]
        n, c = len(obs), len({o["user_id"] for o in obs})
        days = max((inc["last_seen"] - inc["first_seen"]).days, 1)
        factors = vision.build_why(inc["issue_type"], inc["severity"], inc["location_label"])
        factors.append(WhyFactor(
            label="Repeated observations",
            detail=f"{n} observations from {c} contributors over {days} days — independently confirmed.",
        ))
        if inc.get("worsening"):
            factors.append(WhyFactor(
                label="Condition appears to be worsening",
                detail="Observation severity and frequency have increased over recent weeks.",
            ))
        return factors

    def _detail(self, inc: dict, lat=None, lng=None) -> IncidentDetail:
        summary = self._incident_summary(inc, lat, lng)
        obs_ids = self._obs_ids(inc["id"])
        observations = sorted(
            (self.observations[o] for o in obs_ids), key=lambda o: o["timestamp"]
        )
        resolution = next(
            (r for r in self.resolutions.values() if r["incident_id"] == inc["id"]), None
        )
        verification = None
        if resolution:
            verification = next(
                (v for v in self.verifications.values() if v["resolution_id"] == resolution["id"]),
                None,
            )
        complaint = next(
            (c for c in self.complaints.values() if c["incident_id"] == inc["id"]), None
        )
        return IncidentDetail(
            **summary.model_dump(),
            why_factors=self._why(inc),
            observations=[self._observation_out(o) for o in observations],
            timeline=self._timeline_out(inc["id"]),
            resolution=ResolutionOut(**resolution) if resolution else None,
            verification=VerificationOut(**verification) if verification else None,
            complaint=ComplaintOut(**complaint) if complaint else None,
        )

    def _add_timeline(self, inc_id: str, event_type: str, label: str, actor: str, detail: str,
                      when: datetime | None = None) -> None:
        self._seq["event"] += 1
        self.timeline.append({
            "id": f"t-{self._seq['event']}", "incident_id": inc_id,
            "event_type": event_type, "label": label, "detail": detail,
            "timestamp": when or self._now(), "actor": actor,
        })

    def _notify(self, ntype: str, title: str, body: str, inc_id: str | None) -> None:
        self._seq["notification"] += 1
        self.notifications.append({
            "id": f"n-{self._seq['notification']}", "type": ntype, "title": title,
            "body": body, "incident_id": inc_id, "timestamp": self._now(), "read": False,
        })

    def _log_activity(self, kind: str, text: str, inc_id: str | None) -> None:
        self._seq["activity"] += 1
        self.activity.append({
            "id": f"a-{self._seq['activity']}", "kind": kind, "text": text,
            "incident_id": inc_id, "timestamp": self._now(),
        })

    # --- core queries --------------------------------------------------------

    def me(self) -> MeOut:
        u = self.users[config.DEMO_USER_ID]
        return MeOut(
            user=u, demo_mode=True,
            live_ai=bool(config.OPENAI_API_KEY),
            today=self._now().strftime("%A, %d %B %Y"),
        )

    def overview(self) -> StatsOverview:
        lat, lng = config.USER_LOCATION
        active = [i for i in self.incidents.values() if i["status"] in ACTIVE_STATUSES]
        nearby = sum(
            1 for i in active
            if clustering.haversine_m((lat, lng), (i["latitude"], i["longitude"])) <= 2500
        )
        my_obs = [o for o in self.observations.values() if o["user_id"] == config.DEMO_USER_ID]
        resolved = set()
        for l in self.links:
            o = self.observations[l["observation_id"]]
            if o["user_id"] == config.DEMO_USER_ID:
                inc = self.incidents[l["incident_id"]]
                if inc["status"] in ("resolved", "resolution_verified"):
                    resolved.add(inc["id"])
        unread = sum(1 for n in self.notifications if not n["read"])
        return StatsOverview(
            nearby_issues=nearby, my_reports=len(my_obs),
            resolved=len(resolved), active_alerts=unread, nearby_radius_m=2500,
        )

    def list_incidents(self, types=None, priorities=None, statuses=None, q=None,
                       lat=None, lng=None, radius=None) -> list[IncidentSummary]:
        lat = config.USER_LOCATION[0] if lat is None else lat
        lng = config.USER_LOCATION[1] if lng is None else lng
        ql = (q or "").lower().strip()
        out: list[IncidentSummary] = []
        for inc in self.incidents.values():
            if types and inc["issue_type"] not in types:
                continue
            if priorities and inc["priority"] not in priorities:
                continue
            if statuses and inc["status"] not in statuses:
                continue
            if ql and ql not in f"{inc['id']} {inc['title']} {inc['location_label']} {inc['summary']}".lower():
                continue
            s = self._incident_summary(inc, lat, lng)
            if radius and s.distance_m is not None and s.distance_m > radius:
                continue
            out.append(s)
        out.sort(key=lambda s: (
            s.distance_m if s.distance_m is not None else 1e9,
            PRIORITY_RANK.get(s.priority, 9),
        ))
        return out

    def incident_detail(self, inc_id: str, lat=None, lng=None) -> IncidentDetail | None:
        inc = self.incidents.get(inc_id)
        if not inc:
            return None
        return self._detail(inc, lat, lng)

    # --- report flow -------------------------------------------------------------

    def analyze(self, sample_id=None, image_bytes=None, mime="image/jpeg",
                latitude: float = 0.0, longitude: float = 0.0, description: str = "",
                override_type: str | None = None) -> AnalyzeOut:
        sample = seed.SAMPLE_BY_ID.get(sample_id or "")
        base = vision.analyze(image_bytes, mime, sample)
        if override_type in seed.POOLS:  # citizen corrected the category
            base["issue_type"] = override_type
            base["issue_label"] = routing.label(override_type)
        if description:
            base["description"] = description
        loc = seed.nearest_area(latitude, longitude)
        why = [WhyFactor(**f) for f in vision.build_why(base["issue_type"], base["severity"], loc)]
        if sample:
            image_ref = sample["issue_type"]
        elif image_bytes:
            image_ref = "up-" + hashlib.sha256(image_bytes).hexdigest()[:16]
        else:
            image_ref = ""
        emb = embed(base["description"], base["issue_type"], base["severity"], image_ref)
        return AnalyzeOut(
            issue_type=base["issue_type"], issue_label=base["issue_label"],
            confidence=base["confidence"], severity=base["severity"],
            description=base["description"], evidence_quality=base["evidence_quality"],
            mode=base["mode"], why=why, location_label=loc, embedding=emb,
            latitude=latitude, longitude=longitude,
        )

    def match(self, analysis: AnalyzeOut) -> MatchOut:
        when = self._now()
        candidates_pool = [
            i for i in self.incidents.values() if i["status"] in ACTIVE_STATUSES
        ]
        decision, cands = clustering.find_matches(
            candidates_pool, (analysis.latitude, analysis.longitude),
            when, analysis.embedding, analysis.issue_type,
        )
        out = []
        for c in cands:
            inc = c["incident"]
            out.append(MatchCandidateOut(
                incident=self._incident_summary(inc, analysis.latitude, analysis.longitude),
                similarity=c["similarity"], reasons=c["reasons"],
            ))
        if out and out[0].incident.issue_type == analysis.issue_type:
            n = out[0].incident.observation_count
            analysis.why = list(analysis.why) + [WhyFactor(
                label="Repeated nearby observations",
                detail=f"{n} observations already recorded at this spot — your report strengthens the signal.",
            )]
        return MatchOut(
            decision=decision,
            best_similarity=out[0].similarity if out else 0.0,
            candidates=out, analysis=analysis,
        )

    def report(self, r) -> ReportOut:
        from app.schemas import ReportIn

        assert isinstance(r, ReportIn)
        with self._lock:
            when = self._now()
            user = self._user(self._demo_user_id())
            sample = seed.SAMPLE_BY_ID.get(r.sample_id or "")
            if r.image_data:
                image_uri = r.image_data
            elif sample:
                image_uri = sample["image_uri"]
            else:
                image_uri = None
            image_ref = (
                sample["issue_type"] if sample
                else ("up-" + hashlib.sha256((r.image_data or "").encode()).hexdigest()[:16]
                      if r.image_data else "")
            )
            emb = r.embedding or embed(r.description, r.issue_type, r.severity, image_ref)
            obs_id = f"o-{self._seq['observation']}"
            self._seq["observation"] += 1
            obs = {
                "id": obs_id, "user_id": user["id"], "image_uri": image_uri,
                "latitude": r.latitude, "longitude": r.longitude,
                "timestamp": when, "issue_type": r.issue_type,
                "confidence": r.confidence, "severity": r.severity,
                "description": r.description,
                "location_label": seed.nearest_area(r.latitude, r.longitude),
                "embedding": emb,
            }
            self.observations[obs_id] = obs

            attach = (
                r.match_decision == "attach"
                and r.attach_incident_id in self.incidents
            )
            similarity = None
            if attach:
                inc = self.incidents[r.attach_incident_id]
                res = clustering.score_incident(
                    inc, (r.latitude, r.longitude), when, emb, r.issue_type
                )
                similarity = res["score"]
                self.links.append({
                    "incident_id": inc["id"], "observation_id": obs_id,
                    "similarity": similarity,
                })
                inc["last_seen"] = max(inc["last_seen"], when)
                n = len(self._obs_ids(inc["id"]))
                self._add_timeline(
                    inc["id"], "observation", f"{n}th observation added",
                    user["name"], r.description or "New geo-tagged observation added to the cluster.",
                )
                self._notify(
                    "report", f"Your report was added to incident {inc['id']}",
                    f"Your {routing.label(r.issue_type).lower()} observation joined {n - 1} others "
                    f"at {inc['location_label']}.",
                    inc["id"],
                )
                self._log_activity(
                    "report", f"Your {routing.label(r.issue_type).lower()} report was added to incident {inc['id']}.",
                    inc["id"],
                )
            else:
                prefix = PREFIX.get(r.issue_type, "CI")
                inc_id = f"HYD-{prefix}-{self._seq['incident']}"
                self._seq["incident"] += 7
                rec = routing.recommend(r.issue_type, r.severity)
                title = routing.label(r.issue_type)
                inc = {
                    "id": inc_id, "title": title, "issue_type": r.issue_type,
                    "latitude": r.latitude, "longitude": r.longitude,
                    "location_label": obs["location_label"],
                    "severity": r.severity,
                    "priority": "high" if r.severity in ("high", "critical") else (
                        "medium" if r.severity == "medium" else "low"),
                    "status": "reported", "department": rec["department"],
                    "summary": r.description or title,
                    "first_seen": when, "last_seen": when,
                    "worsening": False,
                    "embedding": embed(
                        f"{title} {r.description} {obs['location_label']}",
                        r.issue_type, r.severity, image_ref=r.issue_type,
                    ),
                }
                self.incidents[inc_id] = inc
                self.links.append({"incident_id": inc_id, "observation_id": obs_id, "similarity": 1.0})
                self._add_timeline(
                    inc_id, "observation", "First observation reported", user["name"],
                    r.description or "First geo-tagged observation at this location.",
                )
                self._notify(
                    "report", f"New incident {inc_id} created",
                    f"Your report started a new incident at {obs['location_label']}. "
                    "We'll notify you as similar observations arrive.",
                    inc_id,
                )
                self._log_activity(
                    "report", f"New incident {inc_id} created from your report.",
                    inc_id,
                )
            return ReportOut(
                observation=self._observation_out(obs),
                incident=self._incident_summary(inc),
                attached=bool(attach), similarity=similarity,
            )

    def mine(self) -> list[dict]:
        uid = self._demo_user_id()
        items = []
        for l in self.links:
            o = self.observations[l["observation_id"]]
            if o["user_id"] != uid:
                continue
            inc = self.incidents[l["incident_id"]]
            events = [e for e in self.timeline if e["incident_id"] == inc["id"]]
            events.sort(key=lambda e: e["timestamp"])
            latest = events[-1]["label"] if events else STATUS_LABELS[inc["status"]]
            items.append({
                "observation": self._observation_out(o),
                "incident": self._incident_summary(inc),
                "latest_update": latest,
            })
        items.sort(key=lambda it: it["observation"].timestamp, reverse=True)
        return items

    # --- lifecycle (ops) -------------------------------------------------------------

    def assign(self, inc_id: str, department: str):
        inc = self.incidents.get(inc_id)
        if not inc:
            return None
        with self._lock:
            inc["status"] = "assigned"
            inc["department"] = department
            self._add_timeline(inc_id, "assigned", "Assigned for repair", "Operations (demo)",
                               f"Routed to {department}.")
            self._notify("assignment", f"{inc_id} was assigned for repair",
                         f"Routed to {department} — awaiting repair.", inc_id)
            self._log_activity("assignment", f"{inc_id} was assigned to {department}.", inc_id)
        return self.incident_detail(inc_id)

    def resolve(self, inc_id: str, notes: str = "", evidence: str = "auto"):
        inc = self.incidents.get(inc_id)
        if not inc:
            return None
        with self._lock:
            kind = "after"
            res_id = f"res-{self._seq['resolution']}"
            self._seq["resolution"] += 1
            obs_ids = self._obs_ids(inc_id)
            before = next(
                (self.observations[o] for o in obs_ids if self.observations[o]["image_uri"]),
                self.observations[obs_ids[0]],
            )
            self.resolutions[res_id] = {
                "id": res_id, "incident_id": inc_id,
                "resolved_at": self._now(), "resolved_by": "Operations (demo)",
                "notes": notes or "Repair completed by the assigned department.",
                "evidence_uri": images.frame(kind, res_id),
                "before_observation_id": before["id"],
                "before_image_uri": before["image_uri"],
            }
            inc["status"] = "resolved"
            self._add_timeline(inc_id, "resolved", "Marked resolved", "Operations (demo)",
                               self.resolutions[res_id]["notes"])
            self._notify(
                "resolution", f"{inc_id} was marked resolved — verify it",
                "The assigned department marked this incident resolved. Open the incident "
                "to verify the repair with a fresh capture.",
                inc_id,
            )
            self._log_activity("resolution", f"{inc_id} was marked resolved — awaiting citizen verification.", inc_id)
        return self.incident_detail(inc_id)

    # --- verification ------------------------------------------------------------------

    def resolution(self, resolution_id: str) -> ResolutionOut | None:
        r = self.resolutions.get(resolution_id)
        return ResolutionOut(**r) if r else None

    def after_samples(self, resolution_id: str) -> list[dict]:
        res = self.resolutions.get(resolution_id)
        if not res:
            return []
        inc = self.incidents[res["incident_id"]]
        defs = seed.AFTER_SAMPLES.get(inc["issue_type"]) or seed.AFTER_SAMPLES["roads"]
        return [
            {"id": d["id"], "label": d["label"], "image_uri": d["image_uri"], "hint": d["outcome"]}
            for d in defs
        ]

    def verify(self, resolution_id: str, v) -> VerificationOut | None:
        from app.schemas import VerifyIn

        assert isinstance(v, VerifyIn)
        res = self.resolutions.get(resolution_id)
        if not res:
            return None
        with self._lock:
            inc = self.incidents[res["incident_id"]]
            before_emb = None
            if res["before_observation_id"]:
                before_emb = self.observations[res["before_observation_id"]]["embedding"]
            after_emb, after_uri = None, ""
            if v.sample_id:
                entry = next(
                    (d for d in seed.AFTER_SAMPLES.get(inc["issue_type"], [])
                     if d["id"] == v.sample_id), None,
                )
                if entry:
                    after_emb = embed(entry["desc"], inc["issue_type"], "medium", entry["id"])
                    after_uri = entry["image_uri"]
            elif v.after_image_data:
                sha = hashlib.sha256(v.after_image_data.encode()).hexdigest()[:16]
                after_emb = embed("", inc["issue_type"], "medium", "up-" + sha)
                after_uri = v.after_image_data
            distance = None
            if v.latitude is not None and v.longitude is not None:
                distance = clustering.haversine_m(
                    (v.latitude, v.longitude), (inc["latitude"], inc["longitude"])
                )
            ev = vsvc.evaluate(before_emb, after_emb, v.sample_id, distance)
            self._seq["verification"] += 1
            ver = {
                "id": f"ver-{self._seq['verification']}", "resolution_id": resolution_id,
                "after_image_uri": after_uri or images.photo_uri("after", resolution_id),
                "result": ev["result"], "location_match": ev["location_match"],
                "visual_match": ev["visual_match"], "rationale": ev["rationale"],
                "created_at": self._now(), "verified_by": self._user(self._demo_user_id())["name"],
            }
            self.verifications[ver["id"]] = ver
            label = {
                "verified": "Repair verified by citizen",
                "issue_present": "Verification flagged the issue as still present",
                "needs_review": "Verification inconclusive — additional capture requested",
            }[ev["result"]]
            self._add_timeline(res["incident_id"], "verification", label,
                               ver["verified_by"], ev["rationale"][0])
            if ev["result"] == "verified":
                inc["status"] = "resolution_verified"
                self._notify("verification", f"Repair verified — {inc['id']}",
                             "Your verification was recorded. The incident is now marked "
                             "resolution verified.", inc["id"])
                self._log_activity("verification", f"Repair verified by you for {inc['id']}.", inc["id"])
            elif ev["result"] == "issue_present":
                inc["status"] = "in_progress"
                self._notify("resolution", f"Verification flagged {inc['id']} as not fixed",
                             "Your after-capture shows the issue still present. The incident "
                             "was reopened and sent back to the department.", inc["id"])
                self._log_activity("resolution", f"Verification flagged {inc['id']} as still present — reopened.", inc["id"])
            else:
                self._log_activity("verification", f"Verification for {inc['id']} was inconclusive.", inc["id"])
            return VerificationOut(**ver)

    # --- complaints ----------------------------------------------------------------------

    def _complaint_body(self, inc: dict, refs: list[str]) -> str:
        first = inc["first_seen"].strftime("%d %B %Y")
        last = inc["last_seen"].strftime("%d %B %Y")
        n = len(self._obs_ids(inc["id"]))
        c = len({self.observations[o]["user_id"] for o in self._obs_ids(inc["id"])})
        imgs = sum(1 for o in self._obs_ids(inc["id"]) if self.observations[o]["image_uri"])
        return (
            f"To: The Zonal Commissioner, Greater Hyderabad Municipal Corporation\n\n"
            f"Subject: {inc['title']} at {inc['location_label']} — Incident {inc['id']}\n\n"
            f"Respected Sir/Madam,\n\n"
            f"Citizens have reported {inc['title'].lower()} at {inc['location_label']} "
            f"(approx. {inc['latitude']:.4f}, {inc['longitude']:.4f}). The issue was first "
            f"observed on {first} and has since been recorded {n} times by {c} distinct "
            f"contributors, most recently on {last}.\n\n"
            f"Severity assessment: {_SEVERITY_PHRASE[inc['severity']]}.\n"
            f"Current status: {STATUS_LABELS[inc['status']]}.\n"
            f"Recommended department: {inc['department']}.\n\n"
            f"Evidence: {imgs} geo-tagged photographs ({', '.join(refs)}) with a verified "
            f"observation timeline are attached to incident {inc['id']} on the CIVICOS platform.\n\n"
            f"Requested action: Kindly schedule a field inspection and initiate remediation at "
            f"the noted location. We request status updates against reference {inc['id']}.\n\n"
            f"Sincerely,\nTanisha Rao\n"
            f"On behalf of contributing citizens — via CIVICOS (prototype platform)"
        )

    def complaint_create(self, inc_id: str) -> ComplaintOut | None:
        inc = self.incidents.get(inc_id)
        if not inc:
            return None
        with self._lock:
            existing = next(
                (c for c in self.complaints.values() if c["incident_id"] == inc_id), None
            )
            if existing:
                return ComplaintOut(**existing)
            obs_ids = self._obs_ids(inc_id)
            refs = [o for o in obs_ids if self.observations[o]["image_uri"]][:5] or obs_ids[:5]
            body = self._complaint_body(inc, refs)
            # Optional live polish; template is the deterministic fallback.
            polished = self._maybe_polish(body)
            cid = f"cpl-{self._seq['complaint']}"
            self._seq["complaint"] += 1
            c = {
                "id": cid, "incident_id": inc_id, "issue": inc["title"],
                "location": inc["location_label"],
                "description": polished or body,
                "severity_context": (
                    f"{inc['severity'].title()} severity — {len(obs_ids)} observations from "
                    f"{len({self.observations[o]['user_id'] for o in obs_ids})} contributors "
                    f"between {inc['first_seen'].strftime('%d %b')} and {inc['last_seen'].strftime('%d %b %Y')}"
                ),
                "evidence_refs": refs, "department": inc["department"],
                "status": "draft", "demo_reference": None, "created_at": self._now(),
            }
            self.complaints[cid] = c
            return ComplaintOut(**c)

    def _maybe_polish(self, body: str) -> str | None:
        from app.services import llm

        return llm.chat([
            {"role": "system", "content": "You polish formal civic complaint letters. Keep every fact, number and name exactly as given. Return only the letter."},
            {"role": "user", "content": body},
        ])

    def complaint_submit(self, cid: str):
        c = self.complaints.get(cid)
        if not c:
            return None
        with self._lock:
            c["status"] = "submitted_demo"
            digest = int(hashlib.md5(c["incident_id"].encode()).hexdigest()[:4], 16)
            c["demo_reference"] = f"GHMC-DEMO-{20500 + digest % 4999}"
            self._add_timeline(
                c["incident_id"], "complaint", "Complaint submitted (demo connector)",
                self._user(self._demo_user_id())["name"],
                f"Prototype submission created — demo reference {c['demo_reference']}. "
                "No official GHMC integration yet.",
            )
            self._notify(
                "complaint", f"Prototype submission created for {c['incident_id']}",
                f"Demo reference {c['demo_reference']}. This is a simulated submission — "
                "the GHMC connector is not live yet.",
                c["incident_id"],
            )
            self._log_activity(
                "complaint", f"Complaint submitted (demo) for {c['incident_id']} — reference {c['demo_reference']}.",
                c["incident_id"],
            )
            return ComplaintOut(**c)

    # --- notifications / activity / impact ---------------------------------------------

    def list_notifications(self) -> list[NotificationOut]:
        items = sorted(self.notifications, key=lambda n: n["timestamp"], reverse=True)
        return [NotificationOut(**n) for n in items]

    def mark_read(self, nid: str) -> None:
        for n in self.notifications:
            if n["id"] == nid:
                n["read"] = True

    def mark_all_read(self) -> None:
        for n in self.notifications:
            n["read"] = True

    def list_activity(self) -> list[ActivityItem]:
        items = sorted(self.activity, key=lambda a: a["timestamp"], reverse=True)
        return [ActivityItem(**a) for a in items]

    def impact(self) -> ImpactOut:
        uid = self._demo_user_id()
        my_obs = [o for o in self.observations.values() if o["user_id"] == uid]
        inc_ids: list[str] = []
        for l in self.links:
            o = self.observations[l["observation_id"]]
            if o["user_id"] == uid and l["incident_id"] not in inc_ids:
                inc_ids.append(l["incident_id"])
        incs = [self.incidents[i] for i in inc_ids]
        verified = [i for i in incs if i["status"] != "reported"]
        resolved = [i for i in incs if i["status"] in ("resolved", "resolution_verified")]
        areas: dict[str, int] = {}
        for o in my_obs:
            label = seed.nearest_area(o["latitude"], o["longitude"])
            top = label.split(",")[-1].strip()
            areas[top] = areas.get(top, 0) + 1
        area_list = [
            {"area": k, "count": v} for k, v in sorted(areas.items(), key=lambda kv: -kv[1])
        ]
        return ImpactOut(
            observations=len(my_obs),
            verified_contributions=len(verified),
            incidents_resolved=len(resolved),
            areas_count=len(area_list),
            headline=f"Your observations helped confirm {len(verified)} civic incidents.",
            subline=(
                f"{len(resolved)} have since been resolved. Your reports span {len(area_list)} "
                f"area{'s' if len(area_list) != 1 else ''} of the city."
            ),
            areas=area_list,
            contributions=[self._incident_summary(i) for i in incs],
        )

    # --- demo sample photos -------------------------------------------------------------

    def sample_photos(self) -> list[SamplePhotoOut]:
        return [
            SamplePhotoOut(
                id=s["id"], label=s["label"], issue_type=s["issue_type"],
                latitude=s["latitude"], longitude=s["longitude"],
                image_uri=s["image_uri"], hint=None,
            )
            for s in seed.SAMPLES
        ]


store = DemoStore()


def get_store() -> DemoStore:
    return store
