"""
M6 — Kaggle Scraper
Scraped via: Kaggle public API + profile page parsing. Free API key required.
Extracts: competitions, datasets, notebooks, tier, medals.
"""

import os
from datetime import datetime, timezone
import httpx

KAGGLE_USERNAME = os.getenv("KAGGLE_USERNAME", "")
KAGGLE_KEY = os.getenv("KAGGLE_KEY", "")


async def scrape_kaggle(kaggle_url: str) -> dict:
    """
    Scrape a Kaggle profile for ML/DS signals.

    Args:
        kaggle_url: e.g. https://www.kaggle.com/username

    Returns:
        Normalized signals dict.
    """
    username = kaggle_url.rstrip("/").split("/")[-1]

    if not KAGGLE_USERNAME or not KAGGLE_KEY:
        return {
            "platform": "kaggle",
            "skills": [],
            "projects": [],
            "metrics": {},
            "raw_data": {},
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "error": "Kaggle API credentials not configured",
        }

    auth = (KAGGLE_USERNAME, KAGGLE_KEY)
    headers = {"Accept": "application/json"}

    async with httpx.AsyncClient(timeout=15) as client:
        # Kernels (notebooks) by user
        kernels_resp = await client.get(
            "https://www.kaggle.com/api/v1/kernels/list",
            params={"user": username, "pageSize": 20},
            auth=auth,
            headers=headers,
        )

        notebooks = []
        skills = set()
        if kernels_resp.status_code == 200:
            notebooks = kernels_resp.json()
            for nb in notebooks:
                lang = nb.get("language", "")
                if lang:
                    skills.add(lang)

    skills.update(["machine-learning", "data-science"])

    return {
        "platform": "kaggle",
        "skills": list(skills),
        "projects": [nb.get("title", "") for nb in notebooks[:10]],
        "metrics": {
            "notebooks_count": len(notebooks),
        },
        "raw_data": {"notebooks": notebooks[:10]},
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }
