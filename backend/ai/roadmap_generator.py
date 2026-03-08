"""
M13 — Roadmap Generator
Uses Ollama (llama3.2) to generate a 4-week personalised learning roadmap
based on skill gaps from the gap analysis.
"""

import os
import json
from ollama import Client

from schemas import Roadmap, RoadmapWeek

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "https://ollama.com")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:20b-cloud")

_ollama = Client(
    host=OLLAMA_HOST,
    headers={"Authorization": "Bearer " + OLLAMA_API_KEY} if OLLAMA_API_KEY else {},
    timeout=60,
)

ROADMAP_SYSTEM_PROMPT = (
    "You are a technical learning advisor. You create specific, actionable learning plans. "
    "Always respond with valid JSON only. No explanation, no markdown, no extra text."
)

ROADMAP_USER_TEMPLATE = """Create a 4-week learning roadmap to address these skill gaps for a developer
targeting the role: {target_role}

GAPS TO ADDRESS:
Missing skills: {skills_missing}
Stale skills to refresh: {stale_skills}

Return this exact JSON structure:
{{
  "weeks": [
    {{
      "week": 1,
      "focus": "main topic for this week",
      "daily_hours": 2,
      "tasks": ["specific task 1", "specific task 2", "specific task 3"],
      "resources": ["specific resource name and URL or platform"],
      "project_idea": "small project to build this week to practice the skill",
      "milestone": "what you should be able to do by end of week"
    }}
  ]
}}"""


def generate_roadmap(target_role: str, skills_missing: list[str], stale_skills: list[str]) -> Roadmap:
    """
    Use Ollama to generate a 4-week learning roadmap.

    Returns:
        Roadmap with weekly plans.
    """
    prompt = ROADMAP_USER_TEMPLATE.format(
        target_role=target_role,
        skills_missing=json.dumps(skills_missing),
        stale_skills=json.dumps(stale_skills),
    )

    response = _ollama.chat(
        model=OLLAMA_MODEL,
        format="json",
        messages=[
            {"role": "system", "content": ROADMAP_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )

    result = json.loads(response["message"]["content"])

    weeks = []
    for w in result.get("weeks", []):
        weeks.append(RoadmapWeek(
            week=w.get("week", 0),
            focus=w.get("focus", ""),
            daily_hours=w.get("daily_hours", 2),
            tasks=w.get("tasks", []),
            resources=w.get("resources", []),
            project_idea=w.get("project_idea", ""),
            milestone=w.get("milestone", ""),
        ))

    return Roadmap(weeks=weeks)
