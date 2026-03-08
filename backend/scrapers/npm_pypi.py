"""
M8 — npm + PyPI Scraper
Scraped via: npm Registry REST API + PyPI JSON API. Both free, no key needed.
Extracts: package names, descriptions, keywords, download counts, versions.
"""

from datetime import datetime, timezone
import httpx


async def scrape_npm(npm_url: str) -> dict:
    """
    Scrape an npm package page for published-package signals.

    Args:
        npm_url: e.g. https://www.npmjs.com/package/package-name
                 or https://www.npmjs.com/~username (author page)

    Returns:
        Normalized signals dict.
    """
    parts = npm_url.rstrip("/").split("/")

    # Determine if it's a package URL or author URL
    if "/~" in npm_url:
        # Author page — scrape their packages
        username = parts[-1].lstrip("~")
        search_url = f"https://registry.npmjs.org/-/v1/search?text=maintainer:{username}&size=20"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(search_url)
            resp.raise_for_status()
            data = resp.json()

        packages = data.get("objects", [])
        skills = set()
        project_names = []
        for pkg in packages:
            p = pkg.get("package", {})
            project_names.append(p.get("name", ""))
            skills.update(p.get("keywords", []))

        skills.add("javascript")
        skills.add("npm")

        return {
            "platform": "npm",
            "skills": list(skills),
            "projects": project_names,
            "metrics": {"published_packages": len(packages)},
            "raw_data": {"packages": [p.get("package", {}) for p in packages[:10]]},
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }
    else:
        # Single package URL
        package_name = "/".join(parts[parts.index("package") + 1:]) if "package" in parts else parts[-1]
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"https://registry.npmjs.org/{package_name}")
            resp.raise_for_status()
            data = resp.json()

        keywords = data.get("keywords", [])
        skills = list(set(keywords + ["javascript", "npm"]))

        return {
            "platform": "npm",
            "skills": skills,
            "projects": [data.get("name", "")],
            "metrics": {"versions_published": len(data.get("versions", {}))},
            "raw_data": {"description": data.get("description", "")},
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }


async def scrape_pypi(pypi_url: str) -> dict:
    """
    Scrape a PyPI package page for published-package signals.

    Args:
        pypi_url: e.g. https://pypi.org/project/package-name/

    Returns:
        Normalized signals dict.
    """
    package_name = pypi_url.rstrip("/").split("/")[-1]

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"https://pypi.org/pypi/{package_name}/json")
        resp.raise_for_status()
        data = resp.json()

    info = data.get("info", {})
    classifiers = info.get("classifiers", [])

    # Extract language/framework signals from classifiers
    skills = {"python", "pypi"}
    for c in classifiers:
        parts = c.split(" :: ")
        if "Framework" in c:
            skills.add(parts[-1].lower())
        if "Topic" in c:
            skills.add(parts[-1].lower())

    keywords = info.get("keywords", "") or ""
    if keywords:
        skills.update([k.strip().lower() for k in keywords.split(",") if k.strip()])

    return {
        "platform": "pypi",
        "skills": list(skills),
        "projects": [info.get("name", "")],
        "metrics": {
            "version": info.get("version", ""),
            "requires_python": info.get("requires_python", ""),
        },
        "raw_data": {
            "summary": info.get("summary", ""),
            "classifiers": classifiers[:15],
        },
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }
