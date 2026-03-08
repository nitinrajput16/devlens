"""
M3 — LeetCode Scraper
Scraped via: LeetCode unofficial GraphQL API (public endpoint).
Extracts: problems solved by difficulty, tag categories, top tags.
"""

from datetime import datetime, timezone
import httpx

LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql"

# Maps LeetCode raw tag slugs → standardised algorithm category names
_TAG_TO_CATEGORY: dict[str, str] = {
    # Arrays & Hashing
    "array": "Arrays & Hashing",
    "hash-table": "Arrays & Hashing",
    "string": "Arrays & Hashing",
    # Two Pointers / Sliding Window
    "two-pointers": "Two Pointers",
    "sliding-window": "Sliding Window",
    # Stack & Queue
    "stack": "Stack",
    "queue": "Queue",
    "monotonic-stack": "Stack",
    "design": "Design",
    # Binary Search
    "binary-search": "Binary Search",
    "divide-and-conquer": "Binary Search",
    # Linked List
    "linked-list": "Linked List",
    # Trees & Graphs
    "tree": "Trees",
    "binary-tree": "Trees",
    "binary-search-tree": "Trees",
    "depth-first-search": "Graphs",
    "breadth-first-search": "Graphs",
    "graph": "Graphs",
    "topological-sort": "Graphs",
    "union-find": "Graphs",
    "trie": "Trie",
    # Heap / Priority Queue
    "heap-priority-queue": "Heap / Priority Queue",
    "heap": "Heap / Priority Queue",
    # Dynamic Programming
    "dynamic-programming": "Dynamic Programming",
    "memoization": "Dynamic Programming",
    # Greedy
    "greedy": "Greedy",
    # Backtracking
    "backtracking": "Backtracking",
    "recursion": "Backtracking",
    # Bit Manipulation
    "bit-manipulation": "Bit Manipulation",
    # Math
    "math": "Math",
    "geometry": "Math",
    "number-theory": "Math",
    # Sorting
    "sorting": "Sorting",
    "counting-sort": "Sorting",
    "merge-sort": "Sorting",
    # Matrix
    "matrix": "Matrix",
    # Intervals
    "intervals": "Intervals",
    # Advanced DS
    "segment-tree": "Advanced Data Structures",
    "binary-indexed-tree": "Advanced Data Structures",
    "suffix-array": "Advanced Data Structures",
    # String algorithms
    "string-matching": "String Algorithms",
    "rolling-hash": "String Algorithms",
    "shortest-path": "Graphs",
    # Miscellaneous
    "simulation": "Simulation",
    "game-theory": "Math",
    "brainteaser": "Math",
}


def _map_tag_to_category(tag_name: str) -> str:
    """Return standardised algorithm category for a LeetCode tag slug."""
    slug = tag_name.lower().replace(" ", "-")
    return _TAG_TO_CATEGORY.get(slug, tag_name)  # fall back to raw name


async def scrape_leetcode(leetcode_url: str) -> dict:
    """
    Scrape a LeetCode profile via their public GraphQL API.

    Args:
        leetcode_url: e.g. https://leetcode.com/username

    Returns:
        Normalized signals dict.
    """
    username = leetcode_url.rstrip("/").split("/")[-1]

    query = """
    query getUserProfile($username: String!) {
        matchedUser(username: $username) {
            username
            submitStatsGlobal {
                acSubmissionNum {
                    difficulty
                    count
                }
            }
            profile {
                ranking
                reputation
            }
            tagProblemCounts {
                advanced { tagName problemsSolved }
                intermediate { tagName problemsSolved }
                fundamental { tagName problemsSolved }
            }
        }
    }
    """

    headers = {
        "Content-Type": "application/json",
        "Referer": "https://leetcode.com",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            LEETCODE_GRAPHQL_URL,
            json={"query": query, "variables": {"username": username}},
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()

    user_data = data.get("data", {}).get("matchedUser")
    if not user_data:
        return {
            "platform": "leetcode",
            "skills": [],
            "projects": [],
            "metrics": {},
            "raw_data": {},
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "error": f"User '{username}' not found or profile is private",
        }

    # Parse submission stats
    submissions = user_data.get("submitStatsGlobal", {}).get("acSubmissionNum", [])
    solved = {s["difficulty"]: s["count"] for s in submissions}

    # Parse top tags across all levels and map to standardised categories
    tag_counts = user_data.get("tagProblemCounts", {})
    all_tags = []
    for level in ["fundamental", "intermediate", "advanced"]:
        for t in tag_counts.get(level, []):
            all_tags.append(t)
    top_tags = sorted(all_tags, key=lambda x: x["problemsSolved"], reverse=True)[:10]

    # Map each tag to its canonical algorithm category; aggregate counts per category
    topics: dict[str, int] = {}
    for t in top_tags:
        category = _map_tag_to_category(t["tagName"])
        topics[category] = topics.get(category, 0) + t["problemsSolved"]

    skills = list(topics.keys())

    profile = user_data.get("profile", {})

    return {
        "platform": "leetcode",
        "skills": skills,
        "projects": [],
        "metrics": {
            "total_solved": solved.get("All", 0),
            "easy_solved": solved.get("Easy", 0),
            "medium_solved": solved.get("Medium", 0),
            "hard_solved": solved.get("Hard", 0),
            "ranking": profile.get("ranking"),
            "topics": topics,
        },
        "raw_data": {"submissions": solved, "top_tags": top_tags},
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }
