"""
Stale skill detection — flags any skill whose last-evidence timestamp
is older than 12 months.
"""

from datetime import datetime, timezone, timedelta

STALENESS_THRESHOLD = timedelta(days=365)


def is_stale(last_evidence: datetime | None) -> bool:
    """Return True if the skill hasn't been evidenced in over 12 months."""
    if last_evidence is None:
        return False
    now = datetime.now(timezone.utc)
    if last_evidence.tzinfo is None:
        last_evidence = last_evidence.replace(tzinfo=timezone.utc)
    return (now - last_evidence) > STALENESS_THRESHOLD
