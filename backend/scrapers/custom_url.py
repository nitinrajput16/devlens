"""
M9 — Custom URL Scraper
Scraped via: Trafilatura (text extraction) + Ollama LLM (skill identification).
Works on any public webpage or PDF URL.
"""

import io
import os
import json
from datetime import datetime, timezone

import fitz  # PyMuPDF
import httpx
import trafilatura
from ollama import Client

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "https://ollama.com")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:20b-cloud")

_ollama = Client(
    host=OLLAMA_HOST,
    headers={"Authorization": "Bearer " + OLLAMA_API_KEY} if OLLAMA_API_KEY else {},
)

SKILL_EXTRACTION_SYSTEM_PROMPT = (
    "You are a technical skill extractor. You read developer-related text and extract "
    "structured information. Always respond with valid JSON only. No explanation, no markdown."
)

SKILL_EXTRACTION_USER_TEMPLATE = """Read the following text from a developer's page and extract all relevant information.

TEXT:
{extracted_text}

Return this exact JSON structure:
{{
  "skills": ["list of technologies, languages, frameworks, tools found"],
  "projects": ["list of project names or descriptions found"],
  "experience_level": "junior|mid|senior based on context clues",
  "summary": "2 sentence summary of this developer based on the text"
}}"""


def _extract_pdf_text(raw_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using PyMuPDF."""
    text_parts = []
    with fitz.open(stream=io.BytesIO(raw_bytes), filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text())
    return "\n".join(text_parts)


def _is_pdf_url(url: str) -> bool:
    """Detect PDF by URL suffix or content-type header."""
    return url.lower().split("?")[0].endswith(".pdf")


async def scrape_resume_bytes(pdf_bytes: bytes, filename: str = "resume.pdf") -> dict:
    """
    Extract skills from an uploaded PDF resume.

    Args:
        pdf_bytes: Raw bytes of the uploaded PDF file.
        filename:  Original filename (for raw_data reference).

    Returns:
        Normalized signals dict compatible with the fusion pipeline.
    """
    try:
        extracted_text = _extract_pdf_text(pdf_bytes)
    except Exception:
        extracted_text = ""

    if not extracted_text.strip():
        return {
            "platform": "resume",
            "skills": [],
            "projects": [],
            "metrics": {},
            "raw_data": {"filename": filename, "error": "No readable text extracted from PDF"},
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }

    extracted_text = extracted_text[:4000]  # slightly larger budget for resumes

    try:
        response = _ollama.chat(
            model=OLLAMA_MODEL,
            format="json",
            messages=[
                {"role": "system", "content": SKILL_EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": SKILL_EXTRACTION_USER_TEMPLATE.format(extracted_text=extracted_text)},
            ],
        )
        result = json.loads(response["message"]["content"])
    except Exception:
        result = {"skills": [], "projects": [], "experience_level": "unknown", "summary": ""}

    return {
        "platform": "resume",
        "skills": result.get("skills", []),
        "projects": result.get("projects", []),
        "metrics": {
            "experience_level": result.get("experience_level", "unknown"),
        },
        "raw_data": {
            "filename": filename,
            "summary": result.get("summary", ""),
            "extracted_text_preview": extracted_text[:500],
        },
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }


async def scrape_custom_url(url: str) -> dict:
    """
    Extract text from any public URL or PDF, then use Ollama to identify skills.

    Args:
        url: Any public webpage URL or direct .pdf link.

    Returns:
        Normalized signals dict.
    """
    # Step 1: Fetch raw bytes
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        content_type = resp.headers.get("content-type", "").lower()
        raw_bytes = resp.content

    # Step 2: Determine extraction strategy
    is_pdf = _is_pdf_url(url) or "pdf" in content_type
    if is_pdf:
        try:
            extracted_text = _extract_pdf_text(raw_bytes)
        except Exception as e:
            extracted_text = ""
    else:
        extracted_text = trafilatura.extract(raw_bytes.decode("utf-8", errors="ignore")) or ""

    if not extracted_text.strip():
        return {
            "platform": "custom",
            "skills": [],
            "projects": [],
            "metrics": {},
            "raw_data": {"url": url, "error": "No readable text extracted"},
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }

    # Truncate to avoid overly long prompts
    extracted_text = extracted_text[:3000]

    # Step 2: Send to Ollama for structured extraction
    try:
        response = _ollama.chat(
            model=OLLAMA_MODEL,
            format="json",
            messages=[
                {"role": "system", "content": SKILL_EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": SKILL_EXTRACTION_USER_TEMPLATE.format(extracted_text=extracted_text)},
            ],
        )
        result = json.loads(response["message"]["content"])
    except Exception:
        result = {"skills": [], "projects": [], "experience_level": "unknown", "summary": ""}

    return {
        "platform": "custom",
        "skills": result.get("skills", []),
        "projects": result.get("projects", []),
        "metrics": {
            "experience_level": result.get("experience_level", "unknown"),
        },
        "raw_data": {
            "url": url,
            "summary": result.get("summary", ""),
            "extracted_text_preview": extracted_text[:500],
        },
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }
