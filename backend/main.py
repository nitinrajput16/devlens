import asyncio
import os
import uuid
from datetime import datetime
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()  # Must be before any module that reads env vars

from fastapi import Depends, FastAPI, BackgroundTasks, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from database import db, sessions_collection, users_collection, resumes_collection, ping_db
from schemas import AnalyseRequest, AnalyseResponse, StatusResponse, GapRerunRequest, UnifiedDeveloperProfile
from auth import (
    RegisterRequest, LoginRequest, GoogleTokenRequest, GitHubCodeRequest, AuthResponse,
    register_email, login_email, login_google, login_github,
    get_current_user, require_user,
)

from scrapers.github import scrape_github
from scrapers.leetcode import scrape_leetcode
from scrapers.codeforces import scrape_codeforces
from scrapers.stackoverflow import scrape_stackoverflow
from scrapers.kaggle import scrape_kaggle
from scrapers.devto import scrape_devto
from scrapers.npm_pypi import scrape_npm, scrape_pypi
from scrapers.custom_url import scrape_custom_url, scrape_resume_bytes
from core.fusion import fuse_profiles
from ai.job_matcher import fetch_jobs, match_jobs
from ai.gap_analyzer import analyse_gap
from ai.roadmap_generator import generate_roadmap


# ── Lifespan ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify DB connection
    try:
        await ping_db()
        print("✅ Connected to MongoDB Atlas")
    except Exception as e:
        print(f"⚠️  MongoDB connection failed: {e}")
    yield
    # Shutdown
    print("Shutting down DevLens API")


app = FastAPI(
    title="DevLens API",
    description="AI Developer Career Intelligence Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS (allow React dev server + configured prod origin) ──
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
_allow_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_origins == ["*"] else _allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Background pipeline ──

async def run_analysis_pipeline(session_id: str, request: AnalyseRequest):
    """Master background task: scrape → fuse → analyse → store results."""
    try:
        # ── Layer 2: Scrape all provided platforms in parallel ──
        await sessions_collection.update_one(
            {"session_id": session_id},
            {"$set": {"status": "scraping"}},
        )

        scrape_tasks = {}
        if request.github_url:
            scrape_tasks["github"] = scrape_github(request.github_url)
        if request.leetcode_url:
            scrape_tasks["leetcode"] = scrape_leetcode(request.leetcode_url)
        if request.codeforces_url:
            scrape_tasks["codeforces"] = scrape_codeforces(request.codeforces_url)
        if request.stackoverflow_url:
            scrape_tasks["stackoverflow"] = scrape_stackoverflow(request.stackoverflow_url)
        if request.kaggle_url:
            scrape_tasks["kaggle"] = scrape_kaggle(request.kaggle_url)
        if request.devto_url:
            scrape_tasks["devto"] = scrape_devto(request.devto_url)
        if request.npm_url:
            scrape_tasks["npm"] = scrape_npm(request.npm_url)
        if request.pypi_url:
            scrape_tasks["pypi"] = scrape_pypi(request.pypi_url)
        for url in (request.custom_urls or []):
            scrape_tasks[f"custom_{url[:30]}"] = scrape_custom_url(url)

        # ── Mark all platforms as "scraping" up-front ──
        if scrape_tasks:
            await sessions_collection.update_one(
                {"session_id": session_id},
                {"$set": {
                    f"progress.{(n.split('_')[0] if n.startswith('custom_') else n)}": "scraping"
                    for n in scrape_tasks
                }},
            )

        # ── Run all scrapers concurrently ──
        async def _run_scraper(name: str, coro):
            platform_key = name.split("_")[0] if name.startswith("custom_") else name
            try:
                result = await coro
                await sessions_collection.update_one(
                    {"session_id": session_id},
                    {"$set": {f"progress.{platform_key}": "done"}},
                )
                return result
            except Exception as e:
                await sessions_collection.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {f"progress.{platform_key}": "error"},
                        "$push": {"errors": f"{platform_key}: {e}"},
                    },
                )
                return {
                    "platform": platform_key,
                    "skills": [], "projects": [], "metrics": {}, "raw_data": {},
                    "error": str(e),
                }

        platform_signals = list(
            await asyncio.gather(
                *[_run_scraper(name, coro) for name, coro in scrape_tasks.items()]
            )
        )

        # If a pre-uploaded resume exists inject it as a platform signal
        if request.resume_id:
            stored = await resumes_collection.find_one({"resume_id": request.resume_id})
            if stored:
                signal = stored.get("signal", {})
                if signal:
                    platform_signals.append(signal)
                    await sessions_collection.update_one(
                        {"session_id": session_id},
                        {"$set": {"progress.resume": "done"}},
                    )

        # Store raw signals
        await sessions_collection.update_one(
            {"session_id": session_id},
            {"$set": {"platform_signals": platform_signals}},
        )

        # ── Layer 3: Fuse signals into UnifiedDeveloperProfile ──
        await sessions_collection.update_one(
            {"session_id": session_id},
            {"$set": {"status": "analysing", "progress.fusion": "running"}},
        )

        loop = asyncio.get_event_loop()
        unified_profile = await loop.run_in_executor(None, fuse_profiles, platform_signals)

        await sessions_collection.update_one(
            {"session_id": session_id},
            {"$set": {"unified_profile": unified_profile.model_dump(), "progress.fusion": "done"}},
        )

        # ── Layer 4: AI Analysis ──
        target_role = request.target_role

        if target_role:
            # Mode 2: Gap Analysis + Roadmap
            await sessions_collection.update_one(
                {"session_id": session_id},
                {"$set": {"progress.ai_analysis": "running"}},
            )
            try:
                loop = asyncio.get_event_loop()
                gap_report = await loop.run_in_executor(
                    None, analyse_gap, unified_profile, target_role
                )
                await sessions_collection.update_one(
                    {"session_id": session_id},
                    {"$set": {"gap_report": gap_report.model_dump()}},
                )

                roadmap = await loop.run_in_executor(
                    None, generate_roadmap,
                    target_role,
                    gap_report.skills_missing,
                    gap_report.stale_skills,
                )
                await sessions_collection.update_one(
                    {"session_id": session_id},
                    {"$set": {"roadmap": roadmap.model_dump(), "progress.ai_analysis": "done"}},
                )
            except Exception as e:
                await sessions_collection.update_one(
                    {"session_id": session_id},
                    {"$set": {"progress.ai_analysis": "error"}, "$push": {"errors": f"AI analysis: {e}"}},
                )
        else:
            # Mode 1: Job Matching
            await sessions_collection.update_one(
                {"session_id": session_id},
                {"$set": {"progress.job_matching": "running"}},
            )
            try:
                # Build multiple targeted queries from top skills
                skill_names = [s.name for s in unified_profile.skills[:5]]
                queries = []
                if skill_names:
                    # Individual skill queries (top 3)
                    for skill in skill_names[:3]:
                        queries.append(f"{skill} developer")
                else:
                    queries.append("software developer")

                # Fetch jobs from multiple queries in parallel and deduplicate
                fetched_lists = await asyncio.gather(*[fetch_jobs(q) for q in queries])
                all_jobs = []
                seen_ids = set()
                for fetched in fetched_lists:
                    for job in fetched:
                        jid = job.get("job_id") or job.get("job_title", "") + job.get("employer_name", "")
                        if jid not in seen_ids:
                            seen_ids.add(jid)
                            all_jobs.append(job)

                job_matches = match_jobs(unified_profile, all_jobs)
                await sessions_collection.update_one(
                    {"session_id": session_id},
                    {"$set": {"job_matches": [j.model_dump() for j in job_matches], "progress.job_matching": "done"}},
                )
            except Exception as e:
                await sessions_collection.update_one(
                    {"session_id": session_id},
                    {"$set": {"progress.job_matching": "error"}, "$push": {"errors": f"Job matching: {e}"}},
                )

        # ── Mark complete ──
        await sessions_collection.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "status": "complete",
                    "completed_at": datetime.utcnow(),
                }
            },
        )
    except Exception as e:
        await sessions_collection.update_one(
            {"session_id": session_id},
            {"$set": {"status": "error"}, "$push": {"errors": str(e)}},
        )


# ── Auth Routes ──

@app.post("/api/auth/register", response_model=AuthResponse)
async def api_register(req: RegisterRequest):
    return await register_email(req)

@app.post("/api/auth/login", response_model=AuthResponse)
async def api_login(req: LoginRequest):
    return await login_email(req)

@app.post("/api/auth/google", response_model=AuthResponse)
async def api_google(req: GoogleTokenRequest):
    return await login_google(req)

@app.post("/api/auth/github", response_model=AuthResponse)
async def api_github(req: GitHubCodeRequest):
    return await login_github(req)

@app.get("/api/auth/me")
async def api_me(user=Depends(require_user)):
    return {"name": user["name"], "email": user["email"], "provider": user.get("provider", "email")}


@app.put("/api/auth/me")
async def api_update_me(data: dict, user=Depends(require_user)):
    """Update authenticated user's display name."""
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    await users_collection.update_one(
        {"email": user["email"]},
        {"$set": {"name": name}},
    )
    return {"name": name, "email": user["email"], "provider": user.get("provider", "email")}


@app.get("/api/history")
async def api_history(user=Depends(require_user)):
    """Return the 50 most recent sessions belonging to the authenticated user."""
    cursor = sessions_collection.find(
        {"user_id": str(user["_id"])},
    ).sort("created_at", -1).limit(50)
    sessions = await cursor.to_list(length=50)
    result = []
    for s in sessions:
        s.pop("_id", None)
        result.append({
            "session_id": s["session_id"],
            "status": s["status"],
            "target_role": s.get("target_role"),
            "created_at": s.get("created_at"),
            "platforms": list(s.get("progress", {}).keys()),
        })
    return result


# ── Routes ──

@app.get("/")
async def root():
    return {"message": "DevLens API is running"}


@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """
    Accept a PDF resume, extract text + skills via Ollama, store result,
    and return a resume_id the client can attach to /api/analyse.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=413, detail="PDF must be smaller than 10 MB")

    signal = await scrape_resume_bytes(pdf_bytes, filename=file.filename)

    resume_id = str(uuid.uuid4())
    await resumes_collection.insert_one({
        "resume_id": resume_id,
        "signal": signal,
        "created_at": datetime.utcnow(),
    })

    return {
        "resume_id": resume_id,
        "skills": signal.get("skills", []),
        "projects": signal.get("projects", []),
        "experience_level": signal.get("metrics", {}).get("experience_level", "unknown"),
        "summary": signal.get("raw_data", {}).get("summary", ""),
    }


@app.post("/api/analyse", response_model=AnalyseResponse)
async def analyse(request: AnalyseRequest, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    """Accept profile URLs, create a session, and start background analysis."""
    session_id = str(uuid.uuid4())

    session_doc = {
        "session_id": session_id,
        "user_id": str(user["_id"]) if user else None,
        "status": "pending",
        "input_urls": request.model_dump(),
        "target_role": request.target_role,
        "progress": {},
        "platform_signals": [],
        "errors": [],
        "created_at": datetime.utcnow(),
    }
    await sessions_collection.insert_one(session_doc)

    background_tasks.add_task(run_analysis_pipeline, session_id, request)

    return AnalyseResponse(session_id=session_id, status="pending")


@app.get("/api/status/{session_id}", response_model=StatusResponse)
async def get_status(session_id: str):
    """Poll analysis progress."""
    session = await sessions_collection.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return StatusResponse(
        session_id=session["session_id"],
        status=session["status"],
        progress=session.get("progress", {}),
        error=session["errors"][-1] if session.get("errors") else None,
    )


@app.get("/api/results/{session_id}")
async def get_results(session_id: str):
    """Return full results for a completed session."""
    session = await sessions_collection.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] != "complete":
        raise HTTPException(status_code=202, detail="Analysis not yet complete")

    session.pop("_id", None)
    return session


@app.post("/api/results/{session_id}/gap")
async def rerun_gap(session_id: str, request: GapRerunRequest):
    """
    Re-run gap analysis + roadmap for an existing session using a new target role.
    Re-uses the already-stored unified_profile; no re-scraping needed.
    """
    session = await sessions_collection.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.get("unified_profile"):
        raise HTTPException(status_code=400, detail="No profile data found — complete an analysis first")

    profile = UnifiedDeveloperProfile(**session["unified_profile"])
    loop = asyncio.get_event_loop()

    gap = await loop.run_in_executor(None, analyse_gap, profile, request.target_role)
    roadmap = await loop.run_in_executor(
        None, generate_roadmap,
        request.target_role,
        gap.skills_missing,
        gap.stale_skills,
    )

    await sessions_collection.update_one(
        {"session_id": session_id},
        {"$set": {
            "gap_report": gap.model_dump(),
            "roadmap": roadmap.model_dump(),
            "target_role": request.target_role,
        }}
    )

    return {"gap_report": gap.model_dump(), "roadmap": roadmap.model_dump()}
