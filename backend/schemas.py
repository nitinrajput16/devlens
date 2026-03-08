from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


# ── Request Models ──


class AnalyseRequest(BaseModel):
    github_url: Optional[str] = None
    leetcode_url: Optional[str] = None
    codeforces_url: Optional[str] = None
    stackoverflow_url: Optional[str] = None
    kaggle_url: Optional[str] = None
    devto_url: Optional[str] = None
    npm_url: Optional[str] = None
    pypi_url: Optional[str] = None
    custom_urls: list[str] = []
    resume_id: Optional[str] = None
    target_role: Optional[str] = None


# ── Response Models ──


class AnalyseResponse(BaseModel):
    session_id: str
    status: str = "pending"


class StatusResponse(BaseModel):
    session_id: str
    status: str  # pending | scraping | analysing | complete | error
    progress: dict = {}
    error: Optional[str] = None


# ── Internal / DB Models ──


class PlatformSignals(BaseModel):
    platform: str
    skills: list[str] = []
    projects: list[str] = []
    metrics: dict = {}
    raw_data: dict = {}
    scraped_at: datetime = datetime.utcnow()


class UnifiedSkill(BaseModel):
    name: str
    confidence: float  # 0-100
    sources: list[str] = []
    last_evidence: Optional[datetime] = None
    is_stale: bool = False


class UnifiedDeveloperProfile(BaseModel):
    skills: list[UnifiedSkill] = []
    total_projects: int = 0
    platforms_scraped: list[str] = []
    leetcode_summary: Optional[dict] = None
    codeforces_rating: Optional[int] = None
    stackoverflow_reputation: Optional[int] = None
    published_packages: list[str] = []


class GapReport(BaseModel):
    readiness_score: int
    skills_present: list[str] = []
    skills_missing: list[str] = []
    stale_skills: list[str] = []
    strengths: list[str] = []
    estimated_weeks: int = 0
    honest_assessment: str = ""


class RoadmapWeek(BaseModel):
    week: int
    focus: str
    daily_hours: int = 2
    tasks: list[str] = []
    resources: list[str] = []
    project_idea: str = ""
    milestone: str = ""


class Roadmap(BaseModel):
    weeks: list[RoadmapWeek] = []


class JobMatch(BaseModel):
    title: str
    company: str = ""
    location: str = ""
    match_score: float = 0.0
    explanation: str = ""
    apply_url: str = ""


class GapRerunRequest(BaseModel):
    target_role: str


class SessionDocument(BaseModel):
    session_id: str
    status: str = "pending"
    input_urls: dict = {}
    target_role: Optional[str] = None
    progress: dict = {}
    platform_signals: list[PlatformSignals] = []
    unified_profile: Optional[UnifiedDeveloperProfile] = None
    job_matches: list[JobMatch] = []
    gap_report: Optional[GapReport] = None
    roadmap: Optional[Roadmap] = None
    created_at: datetime = datetime.utcnow()
    completed_at: Optional[datetime] = None
    errors: list[str] = []
