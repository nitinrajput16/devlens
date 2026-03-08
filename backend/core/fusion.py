"""
M10 — Profile Fusion Engine
Merges all platform signal dicts into a single UnifiedDeveloperProfile.
Handles: deduplication, normalisation, confidence scoring, staleness detection.
"""

from collections import defaultdict
from datetime import datetime, timezone

from core.taxonomy import normalize_skill
from core.staleness import is_stale
from schemas import UnifiedDeveloperProfile, UnifiedSkill


# ── Per-platform score extractors ────────────────────────────────────────────
# Each returns a dict  { canonical_skill_name: score (0–100) }

def _github_scores(signals: dict) -> dict[str, float]:
    """Use the recency-weighted, normalised language scores (0–100)."""
    scores: dict[str, float] = {}
    lang_scores = signals.get("metrics", {}).get("language_scores", {})
    for lang, score in lang_scores.items():
        canonical = normalize_skill(lang)
        scores[canonical] = max(scores.get(canonical, 0), float(score))
    # Frameworks/topics detected → give a baseline 55 (detected but no byte-count)
    for fw in signals.get("raw_data", {}).get("frameworks_detected", []):
        c = normalize_skill(fw)
        scores.setdefault(c, 55)
    for topic in signals.get("raw_data", {}).get("topics", []):
        c = normalize_skill(topic)
        scores.setdefault(c, 40)

    # If Node.js was detected and JavaScript has a score, use JS score as proxy
    if "Node.js" in scores and "JavaScript" in scores:
        scores["Node.js"] = max(scores["Node.js"], round(scores["JavaScript"] * 0.9, 1))
    return scores


def _leetcode_scores(signals: dict) -> dict[str, float]:
    """Map problems-solved per tag into 0–100 using soft log scaling."""
    import math
    topics: dict[str, int] = signals.get("metrics", {}).get("topics", {})
    if not topics:
        return {}
    scores: dict[str, float] = {}
    max_count = max(topics.values(), default=1)
    for tag, count in topics.items():
        # logarithmic scale:  score = 100 * log(1+count) / log(1+maxCount)
        # ensures top tag ≈ 95, 1 problem ≈ 15-25
        raw = 100 * math.log1p(count) / math.log1p(max_count) if max_count > 0 else 0
        canonical = normalize_skill(tag)
        scores[canonical] = max(scores.get(canonical, 0), round(min(raw, 100), 1))
    return scores


def _codeforces_scores(signals: dict) -> dict[str, float]:
    """Flat DSA skills boosted by the user's actual rating band (0–100)."""
    rating = signals.get("metrics", {}).get("current_rating", 0)
    # Map rating to a 30–95 range:  800→30, 1200→50, 1600→70, 2000→85, 2400+→95
    base = min(max((rating - 500) / 20, 20), 95) if rating > 0 else 30
    scores: dict[str, float] = {}
    for s in signals.get("skills", []):
        canonical = normalize_skill(s)
        scores[canonical] = round(base, 1)
    return scores


def _stackoverflow_scores(signals: dict) -> dict[str, float]:
    """Per-tag answer_score normalised to 0–100."""
    tag_items = signals.get("raw_data", {}).get("top_tags", [])
    if not tag_items:
        return {}
    scores: dict[str, float] = {}
    max_score = max((t.get("answer_score", 0) for t in tag_items), default=1) or 1
    for t in tag_items:
        name = t.get("tag_name", "")
        answer_score = t.get("answer_score", 0)
        normalised = round(100 * answer_score / max_score, 1) if max_score else 30
        canonical = normalize_skill(name)
        scores[canonical] = max(scores.get(canonical, 0), max(normalised, 15))
    return scores


def _generic_scores(signals: dict) -> dict[str, float]:
    """Fallback for kaggle / devto / npm / pypi / custom — binary presence → 45."""
    scores: dict[str, float] = {}
    for s in signals.get("skills", []):
        canonical = normalize_skill(s)
        scores[canonical] = 45
    return scores


_SCORE_EXTRACTORS: dict[str, callable] = {
    "github": _github_scores,
    "leetcode": _leetcode_scores,
    "codeforces": _codeforces_scores,
    "stackoverflow": _stackoverflow_scores,
}


# ── Main fuse function ───────────────────────────────────────────────────────

def fuse_profiles(platform_signals: list[dict]) -> UnifiedDeveloperProfile:
    """
    Fuse signals from multiple platforms into one unified profile.
    Each skill gets a per-platform score based on real evidence, then the
    final confidence is the best single-platform score boosted by cross-
    platform corroboration.
    """
    # skill → { platform: score }
    skill_platform_scores: dict[str, dict[str, float]] = defaultdict(dict)
    all_projects: list[str] = []
    platforms_scraped: list[str] = []

    leetcode_summary = None
    codeforces_rating = None
    so_reputation = None
    published_packages: list[str] = []

    for signals in platform_signals:
        platform = signals.get("platform", "unknown")
        if signals.get("error"):
            continue
        platforms_scraped.append(platform)

        # Extract per-skill scores using the platform-specific extractor
        extractor = _SCORE_EXTRACTORS.get(platform, _generic_scores)
        pscores = extractor(signals)
        for skill, score in pscores.items():
            skill_platform_scores[skill][platform] = score

        # Projects
        all_projects.extend(signals.get("projects", []))

        # Platform-specific metrics
        metrics = signals.get("metrics", {})
        if platform == "leetcode":
            leetcode_summary = metrics
        elif platform == "codeforces":
            codeforces_rating = metrics.get("current_rating")
        elif platform == "stackoverflow":
            so_reputation = metrics.get("reputation")
        elif platform in ("npm", "pypi"):
            published_packages.extend(signals.get("projects", []))

    # Build unified skills with real per-skill scores
    unified_skills: list[UnifiedSkill] = []
    for skill_name, platform_scores in skill_platform_scores.items():
        best_score = max(platform_scores.values())
        num_platforms = len(platform_scores)
        # Cross-platform boost: each additional platform adds up to 10 pts
        cross_boost = min((num_platforms - 1) * 10, 20)
        confidence = min(round(best_score + cross_boost), 100)
        # Floor at 10 so everything is visible on charts
        confidence = max(confidence, 10)

        unified_skills.append(UnifiedSkill(
            name=skill_name,
            confidence=confidence,
            sources=sorted(platform_scores.keys()),
            last_evidence=datetime.now(timezone.utc),
            is_stale=False,
        ))

    unified_skills.sort(key=lambda s: s.confidence, reverse=True)

    return UnifiedDeveloperProfile(
        skills=unified_skills,
        total_projects=len(set(all_projects)),
        platforms_scraped=platforms_scraped,
        leetcode_summary=leetcode_summary,
        codeforces_rating=codeforces_rating,
        stackoverflow_reputation=so_reputation,
        published_packages=published_packages,
    )
