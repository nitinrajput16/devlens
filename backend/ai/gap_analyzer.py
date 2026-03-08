"""
M12 — Gap Analysis Engine (Mode 2)
Uses Ollama (llama3.2) to compare the unified profile against a target role
and produce a structured gap report.
Validates the response against a required schema; retries up to 3 times on
invalid JSON or schema mismatch before falling back to an empty report.
"""

import os
import json
from ollama import Client

from schemas import UnifiedDeveloperProfile, GapReport

# Expected keys and their required Python types
_REQUIRED_SCHEMA: dict[str, type] = {
    "readiness_score": (int, float),
    "skills_present": list,
    "skills_missing": list,
    "stale_skills": list,
    "strengths": list,
    "estimated_weeks": (int, float),
    "honest_assessment": str,
}


def _validate(data: dict) -> bool:
    """Return True only when all required keys exist with the correct types."""
    for key, expected in _REQUIRED_SCHEMA.items():
        if key not in data:
            return False
        if not isinstance(data[key], expected):
            return False
    return True

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "https://ollama.com")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:20b-cloud")

_ollama = Client(
    host=OLLAMA_HOST,
    headers={"Authorization": "Bearer " + OLLAMA_API_KEY} if OLLAMA_API_KEY else {},
    timeout=60,
)

GAP_SYSTEM_PROMPT = (
    "You are a senior engineering career advisor with deep knowledge of tech job requirements. "
    "You analyse developer profiles and provide honest, specific gap assessments. "
    "Always respond with valid JSON only. No explanation, no markdown, no extra text."
)

GAP_USER_TEMPLATE = """Analyse this developer profile against their target role.

DEVELOPER PROFILE:
- Confirmed skills (with confidence 0-100): {skills_with_scores}
- Stale skills (not used in 12+ months): {stale_skills}
- LeetCode: {leetcode_summary}
- Codeforces rating: {cf_rating}
- Stack Overflow reputation: {so_reputation}
- Published packages: {packages}

TARGET ROLE: {target_role}

CRITICAL RULES:
1. "skills_present" must ONLY contain skills from the confirmed skills list above that are relevant to the target role.
2. "skills_missing" must ONLY contain skills that are NOT present anywhere in the confirmed skills list above. Never list a skill as missing if it already appears in the developer's confirmed skills.
3. "stale_skills" must ONLY contain skills from the confirmed stale skills list above.

Return this exact JSON structure:
{{
  "readiness_score": <integer 0-100>,
  "skills_present": ["skills from their confirmed list that match this role"],
  "skills_missing": ["skills needed for this role that do NOT appear anywhere in their confirmed skills list"],
  "stale_skills": ["skills from their stale skills list relevant to this role"],
  "strengths": ["2-3 specific strengths for this role"],
  "estimated_weeks": <integer weeks to close gaps with 10hrs/week>,
  "honest_assessment": "2-3 sentence honest summary"
}}"""


def analyse_gap(
    profile: UnifiedDeveloperProfile,
    target_role: str,
    max_retries: int = 3,
) -> GapReport:
    """
    Use Ollama to produce a gap analysis between the profile and target role.
    Retries up to `max_retries` times if the response fails schema validation.

    Returns:
        GapReport with readiness score, present/missing skills, and assessment.
    """
    skills_with_scores = {s.name: s.confidence for s in profile.skills}
    stale = [s.name for s in profile.skills if s.is_stale]

    prompt = GAP_USER_TEMPLATE.format(
        skills_with_scores=json.dumps(skills_with_scores),
        stale_skills=json.dumps(stale),
        leetcode_summary=json.dumps(profile.leetcode_summary or {}),
        cf_rating=profile.codeforces_rating or "N/A",
        so_reputation=profile.stackoverflow_reputation or "N/A",
        packages=json.dumps(profile.published_packages),
        target_role=target_role,
    )

    messages = [
        {"role": "system", "content": GAP_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    result: dict = {}
    for attempt in range(max_retries):
        try:
            response = _ollama.chat(
                model=OLLAMA_MODEL,
                format="json",
                messages=messages,
            )
            parsed = json.loads(response["message"]["content"])
            if _validate(parsed):
                result = parsed
                break
            # Schema invalid — tell the model what went wrong and retry
            missing = [k for k in _REQUIRED_SCHEMA if k not in parsed]
            messages = messages + [
                {"role": "assistant", "content": response["message"]["content"]},
                {"role": "user", "content": (
                    f"Your response was missing required keys: {missing}. "
                    "Please return the complete JSON structure as specified."
                )},
            ]
        except (json.JSONDecodeError, KeyError):
            pass
    # Build a normalised set of skill names the developer actually has
    known_skill_names: set[str] = set()
    for s in profile.skills:
        raw = s.name.strip().lower()
        known_skill_names.add(raw)
        # Common aliases: "Express.js" → "express", "Node.js" → "node", etc.
        if raw.endswith(".js"):
            known_skill_names.add(raw[:-3])          # "express"
        if raw.endswith("js") and not raw.endswith(".js"):
            known_skill_names.add(raw[:-2])           # "reactjs" → "react"
        # Strip known suffixes/prefixes to catch "REST APIs" ↔ "REST"
        no_suffix = raw.replace(" api", "").replace(" apis", "")
        known_skill_names.add(no_suffix)

    def _is_known(skill_str: str) -> bool:
        """Return True if the skill string matches any known developer skill."""
        low = skill_str.strip().lower()
        if low in known_skill_names:
            return True
        # Normalise the candidate the same way
        if low.endswith(".js"):
            if low[:-3] in known_skill_names:
                return True
        if low.endswith("js") and not low.endswith(".js"):
            if low[:-2] in known_skill_names:
                return True
        no_suffix = low.replace(" api", "").replace(" apis", "")
        if no_suffix in known_skill_names:
            return True
        # Check if any known skill name is contained in the candidate or vice-versa
        for known in known_skill_names:
            if len(known) >= 3 and (known in low or low in known):
                return True
        return False

    raw_missing: list[str] = result.get("skills_missing", [])
    # Filter out any skill the LLM hallucinated as missing when developer already has it
    filtered_missing = [s for s in raw_missing if not _is_known(s)]

    return GapReport(
        readiness_score=int(result.get("readiness_score", 0)),
        skills_present=result.get("skills_present", []),
        skills_missing=filtered_missing,
        stale_skills=result.get("stale_skills", []),
        strengths=result.get("strengths", []),
        estimated_weeks=int(result.get("estimated_weeks", 0)),
        honest_assessment=result.get("honest_assessment", ""),
    )
