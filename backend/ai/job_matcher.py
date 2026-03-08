"""
M11 — Job Matching Engine (Mode 1)
Uses TF-IDF vectorisation + cosine similarity to match the developer's
unified skill profile against live job listings from JSearch API.
Fetches up to 30 jobs per query (3 pages × ~10 results), caches results
in MongoDB (24-hour TTL) to avoid redundant API calls.
"""

import os
import httpx
from datetime import datetime, timezone, timedelta
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from database import jobs_collection
from schemas import UnifiedDeveloperProfile, JobMatch

JSEARCH_URL = "https://jsearch.p.rapidapi.com/search"
CACHE_TTL_HOURS = 24


async def _get_cached_jobs(query: str) -> list[dict] | None:
    """Return cached jobs for this query if still fresh (< 24 h)."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)
    doc = await jobs_collection.find_one(
        {"query": query, "cached_at": {"$gte": cutoff}}
    )
    return doc["jobs"] if doc else None


async def _cache_jobs(query: str, jobs: list[dict]) -> None:
    """Upsert job results for this query into MongoDB with a timestamp."""
    await jobs_collection.update_one(
        {"query": query},
        {"$set": {"jobs": jobs, "cached_at": datetime.now(timezone.utc)}},
        upsert=True,
    )


async def fetch_jobs(query: str, num_pages: int = 3) -> list[dict]:
    """
    Fetch ~30 job listings from JSearch API for a query.
    Returns cached results (24 h TTL) when available.
    """
    cached = await _get_cached_jobs(query)
    if cached is not None:
        return cached

    api_key = os.getenv("JSEARCH_API_KEY", "")
    if not api_key:
        return []

    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }
    params = {"query": query, "num_pages": str(num_pages)}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(JSEARCH_URL, headers=headers, params=params)
        resp.raise_for_status()
        data = resp.json()

    jobs = data.get("data", [])
    if jobs:
        await _cache_jobs(query, jobs)
    return jobs


def match_jobs(profile: UnifiedDeveloperProfile, jobs: list[dict]) -> list[JobMatch]:
    """
    Compare the developer profile against jobs using TF-IDF cosine similarity.

    Returns top 5 matches sorted by score.
    """
    if not jobs:
        return []

    # Build developer document from skills
    dev_skills_text = " ".join(s.name for s in profile.skills)

    # Build job documents from title + description
    job_texts = []
    for job in jobs:
        text = f"{job.get('job_title', '')} {job.get('job_description', '')}"
        job_texts.append(text[:2000])  # Cap length

    # TF-IDF + cosine similarity
    all_docs = [dev_skills_text] + job_texts
    vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
    tfidf_matrix = vectorizer.fit_transform(all_docs)

    dev_vector = tfidf_matrix[0:1]
    job_vectors = tfidf_matrix[1:]
    similarities = cosine_similarity(dev_vector, job_vectors).flatten()

    # Pair jobs with scores, sort descending
    scored_jobs = sorted(zip(jobs, similarities), key=lambda x: x[1], reverse=True)

    top_matches = []
    for job, score in scored_jobs[:5]:
        top_matches.append(JobMatch(
            title=job.get("job_title", "Unknown"),
            company=job.get("employer_name", ""),
            location=job.get("job_city", "") or job.get("job_country", ""),
            match_score=round(float(score) * 100, 1),
            explanation=f"Matched on skills: {dev_skills_text[:100]}",
            apply_url=job.get("job_apply_link", ""),
        ))

    return top_matches
