"""
M4 — Codeforces Scraper
Scraped via: Official Codeforces API. Free, no key needed.
Extracts: rating, rank, solved problems, contest history.
"""

from datetime import datetime, timezone
import httpx

CODEFORCES_API = "https://codeforces.com/api"


async def scrape_codeforces(codeforces_url: str) -> dict:
    """
    Scrape a Codeforces profile via their official REST API.

    Args:
        codeforces_url: e.g. https://codeforces.com/profile/handle

    Returns:
        Normalized signals dict.
    """
    handle = codeforces_url.rstrip("/").split("/")[-1]

    async with httpx.AsyncClient(timeout=15) as client:
        # User info
        info_resp = await client.get(f"{CODEFORCES_API}/user.info", params={"handles": handle})
        info_resp.raise_for_status()
        info_data = info_resp.json()

        if info_data.get("status") != "OK":
            return {
                "platform": "codeforces",
                "skills": [],
                "projects": [],
                "metrics": {},
                "raw_data": {},
                "scraped_at": datetime.now(timezone.utc).isoformat(),
                "error": f"User '{handle}' not found",
            }

        user_info = info_data["result"][0]

        # Contest rating history
        rating_resp = await client.get(f"{CODEFORCES_API}/user.rating", params={"handle": handle})
        rating_resp.raise_for_status()
        rating_data = rating_resp.json()
        contests = rating_data.get("result", [])

    skills = ["competitive-programming", "algorithms", "data-structures"]

    return {
        "platform": "codeforces",
        "skills": skills,
        "projects": [],
        "metrics": {
            "current_rating": user_info.get("rating", 0),
            "max_rating": user_info.get("maxRating", 0),
            "rank": user_info.get("rank", "unrated"),
            "max_rank": user_info.get("maxRank", "unrated"),
            "contests_participated": len(contests),
        },
        "raw_data": {
            "user_info": user_info,
            "recent_contests": contests[-5:] if contests else [],
        },
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }
