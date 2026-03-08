"""
M7 — Dev.to Scraper
Scraped via: Dev.to official API (free key).
Extracts: articles, tags, reactions, reading time.
"""

import os
from datetime import datetime, timezone
import httpx

DEVTO_API_KEY = os.getenv("DEVTO_API_KEY", "")
DEVTO_API = "https://dev.to/api"


async def scrape_devto(devto_url: str) -> dict:
    """
    Scrape a Dev.to profile for technical writing signals.

    Args:
        devto_url: e.g. https://dev.to/username

    Returns:
        Normalized signals dict.
    """
    username = devto_url.rstrip("/").split("/")[-1]

    headers = {"Accept": "application/json"}
    if DEVTO_API_KEY:
        headers["api-key"] = DEVTO_API_KEY

    async with httpx.AsyncClient(timeout=15) as client:
        articles_resp = await client.get(
            f"{DEVTO_API}/articles",
            params={"username": username, "per_page": 30},
            headers=headers,
        )
        articles_resp.raise_for_status()
        articles = articles_resp.json()

    # Collect tags from all articles
    all_tags = []
    project_titles = []
    total_reactions = 0
    total_comments = 0

    for article in articles:
        all_tags.extend(article.get("tag_list", []))
        project_titles.append(article.get("title", ""))
        total_reactions += article.get("positive_reactions_count", 0)
        total_comments += article.get("comments_count", 0)

    # Deduplicated skills from tags
    skills = list(set(all_tags))

    return {
        "platform": "devto",
        "skills": skills,
        "projects": project_titles[:10],
        "metrics": {
            "articles_count": len(articles),
            "total_reactions": total_reactions,
            "total_comments": total_comments,
        },
        "raw_data": {"articles_summary": [
            {"title": a.get("title"), "tags": a.get("tag_list"), "reactions": a.get("positive_reactions_count")}
            for a in articles[:10]
        ]},
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }
