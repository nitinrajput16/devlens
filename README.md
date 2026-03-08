# DevLens: AI Developer Career Intelligence Platform

"Show us your links. We'll show you your future."

## Overview
DevLens is an AI-powered developer career intelligence platform that bypasses traditional, self-reported resumes. It gathers signals from a developer's actual public activity across multiple coding platforms to build an honest, evidence-based unified skill profile.

## Key Operating Modes
1. **Auto Job Suggestion (Mode 1):** Scrapes your profiles, builds a unified skill profile, fetches live job listings (via JSearch), and returns the top 5 roles you are best suited for using TF-IDF cosine similarity.
2. **Target Role Gap Analysis (Mode 2):** Compares your extracted profile against a specific desired job role. Powered by a local LLM (Ollama), it calculates a 0-100 readiness score, identifies missing or stale skills, and generates a personalized week-by-week learning roadmap to close the gaps.

## Supported Data Sources
- **GitHub** (Core signal)
- **LeetCode & Codeforces** (DSA & Problem Solving)
- **Stack Overflow** (Community Expertise)
- **Kaggle** (ML/Data Science)
- **Dev.to / Hashnode** (Technical Writing)
- **npm / PyPI** (Published Packages)
- **Custom URLs** (Freeform AI extraction)

## System Architecture
DevLens operates via a clean 5-layer pipeline:
1. **Input & Validation:** React UI takes URLs, validates via FastAPI, and starts a MongoDB session.
2. **Scraping (Parallel):** Concurrent asynchronous scrapers extract signals from all provided platforms.
3. **Profile Fusion:** Deduplicates, normalizes, and confidence-scores skills into a Unified Developer Profile.
4. **AI Analysis Engine:** Processes the profile for job matching or strict JSON gap reports using `llama3.2`.
5. **Results Dashboard:** Visualizes results using React (Radar Charts, Gap Heatmaps, Readiness Gauges, roadmaps).

## Tech Stack
- **Backend:** Python, FastAPI, Motor (Async MongoDB), Asyncio
- **Frontend:** React (Vite), Tailwind CSS, Recharts
- **AI/LLM:** Local Ollama (`llama3.2:3b`)
- **Database:** MongoDB Atlas
- **External APIs:** JSearch (RapidAPI)