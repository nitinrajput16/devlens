"""
M5 — Stack Overflow Scraper
Scraped via: Official Stack Exchange API v2.3. Free, 10k requests/day.
Extracts: reputation, top tags, badge counts, answer count.
"""

import os
from datetime import datetime, timezone
import httpx

SO_API = "https://api.stackexchange.com/2.3"
SO_KEY = os.getenv("STACKOVERFLOW_KEY", "")


async def scrape_stackoverflow(stackoverflow_url: str) -> dict:
    """
    Scrape a Stack Overflow profile via the Stack Exchange API.

    Args:
        stackoverflow_url: e.g. https://stackoverflow.com/users/12345/username

    Returns:
        Normalized signals dict.
    """
    # Extract user ID from URL — format: /users/{id}/display-name
    parts = stackoverflow_url.rstrip("/").split("/")
    user_id = None
    for i, part in enumerate(parts):
        if part == "users" and i + 1 < len(parts):
            user_id = parts[i + 1]
            break

    if not user_id:
        return {
            "platform": "stackoverflow",
            "skills": [],
            "projects": [],
            "metrics": {},
            "raw_data": {},
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "error": "Could not extract user ID from URL",
        }

    params = {"site": "stackoverflow", "filter": "!nNPvSNdWme"}
    if SO_KEY:
        params["key"] = SO_KEY

    async with httpx.AsyncClient(timeout=15) as client:
        # User profile
        user_resp = await client.get(f"{SO_API}/users/{user_id}", params=params)
        user_resp.raise_for_status()
        user_data = user_resp.json()

        if not user_data.get("items"):
            return {
                "platform": "stackoverflow",
                "skills": [],
                "projects": [],
                "metrics": {},
                "raw_data": {},
                "scraped_at": datetime.now(timezone.utc).isoformat(),
                "error": f"User ID '{user_id}' not found",
            }

        user_info = user_data["items"][0]

        # Top tags
        tags_resp = await client.get(
            f"{SO_API}/users/{user_id}/top-answer-tags",
            params={**params, "pagesize": 15},
        )
        tags_resp.raise_for_status()
        tags_data = tags_resp.json()

    top_tags = [t["tag_name"] for t in tags_data.get("items", [])]
    badges = user_info.get("badge_counts", {})

    return {
        "platform": "stackoverflow",
        "skills": top_tags,
        "projects": [],
        "metrics": {
            "reputation": user_info.get("reputation", 0),
            "answer_count": user_info.get("answer_count", 0),
            "question_count": user_info.get("question_count", 0),
            "gold_badges": badges.get("gold", 0),
            "silver_badges": badges.get("silver", 0),
            "bronze_badges": badges.get("bronze", 0),
        },
        "raw_data": {"top_tags": tags_data.get("items", [])},
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }
