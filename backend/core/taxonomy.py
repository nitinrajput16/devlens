"""
Skill name taxonomy — normalizes variant names to a canonical form.
e.g. 'node', 'nodejs', 'Node.js' all map to 'Node.js'
"""

import json
import os

_TAXONOMY_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "skill_taxonomy.json")
_taxonomy: dict[str, str] = {}


def _load_taxonomy() -> dict[str, str]:
    global _taxonomy
    if _taxonomy:
        return _taxonomy
    try:
        with open(_TAXONOMY_PATH, "r", encoding="utf-8") as f:
            _taxonomy = json.load(f)
    except FileNotFoundError:
        _taxonomy = {}
    return _taxonomy


def normalize_skill(skill: str) -> str:
    """Normalize a skill name to its canonical form using the taxonomy."""
    taxonomy = _load_taxonomy()
    key = skill.strip().lower()
    return taxonomy.get(key, skill.strip())
