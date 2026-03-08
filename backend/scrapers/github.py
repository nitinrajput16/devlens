"""
M2 — GitHub Scraper
Scraped via: PyGitHub library + GitHub REST API v3.
Extracts: repos, languages (recency-weighted), frameworks (dependency files),
          commit streak, test ratio, stars, topics.
"""

import os
import asyncio
from datetime import datetime, timezone
from github import Github, GithubException

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# Dependency file → {substring_to_match: canonical_framework_name}
_FRAMEWORK_PATTERNS = {
    "package.json": {
        # ── Frontend frameworks / libraries ──
        '"react"': "React", '"react-dom"': "React", '"vue"': "Vue.js",
        '"@angular/core"': "Angular", '"svelte"': "Svelte",
        '"next"': "Next.js", '"nuxt"': "Nuxt.js", '"gatsby"': "Gatsby",
        '"remix"': "Remix", '"astro"': "Astro", '"solid-js"': "Solid.js",
        # ── State management ──
        '"redux"': "Redux", '"@reduxjs/toolkit"': "Redux",
        '"zustand"': "Zustand", '"mobx"': "MobX", '"recoil"': "Recoil",
        '"pinia"': "Pinia", '"vuex"': "Vuex",
        # ── CSS / styling ──
        '"tailwindcss"': "Tailwind CSS", '"@tailwindcss"': "Tailwind CSS",
        '"styled-components"': "Styled Components", '"@emotion/react"': "Emotion",
        '"sass"': "Sass", '"less"': "Less",
        '"@mui/material"': "Material UI", '"antd"': "Ant Design",
        '"@chakra-ui/react"': "Chakra UI", '"bootstrap"': "Bootstrap",
        '"framer-motion"': "Framer Motion",
        # ── Backend / runtime ──
        '"express"': "Express.js", '"fastify"': "Fastify", '"koa"': "Koa",
        '"@nestjs/core"': "NestJS", '"hapi"': "Hapi",
        # ── Build / tooling ──
        '"typescript"': "TypeScript", '"vite"': "Vite",
        '"webpack"': "Webpack", '"esbuild"': "esbuild", '"rollup"': "Rollup",
        '"babel"': "Babel", '"@babel/core"': "Babel",
        '"eslint"': "ESLint", '"prettier"': "Prettier",
        # ── Testing ──
        '"jest"': "Jest", '"mocha"': "Mocha", '"vitest"': "Vitest",
        '"cypress"': "Cypress", '"playwright"': "Playwright",
        '"@testing-library/react"': "React Testing Library",
        '"chai"': "Chai", '"sinon"': "Sinon",
        # ── Database / ORM ──
        '"mongoose"': "MongoDB", '"sequelize"': "Sequelize",
        '"prisma"': "Prisma", '"typeorm"': "TypeORM", '"knex"': "Knex.js",
        '"pg"': "PostgreSQL", '"mysql2"': "MySQL", '"redis"': "Redis",
        '"ioredis"': "Redis", '"@supabase/supabase-js"': "Supabase",
        '"firebase"': "Firebase",
        # ── API / realtime ──
        '"graphql"': "GraphQL", '"@apollo/client"': "GraphQL",
        '"socket.io"': "Socket.IO", '"axios"': "REST APIs",
        '"trpc"': "tRPC", '"@trpc/server"': "tRPC",
        # ── Auth ──
        '"passport"': "Passport.js", '"jsonwebtoken"': "JWT",
        '"next-auth"': "NextAuth.js",
        # ── DevOps / infra packages ──
        '"aws-sdk"': "AWS", '"@aws-sdk"': "AWS",
        '"@azure"': "Azure", '"@google-cloud"': "Google Cloud",
        '"docker-compose"': "Docker",
    },
    "requirements.txt": {
        # ── Web frameworks ──
        "django": "Django", "flask": "Flask", "fastapi": "FastAPI",
        "tornado": "Tornado", "sanic": "Sanic", "starlette": "Starlette",
        "aiohttp": "aiohttp", "bottle": "Bottle",
        # ── ORM / DB ──
        "sqlalchemy": "SQLAlchemy", "django-rest-framework": "Django REST Framework",
        "psycopg2": "PostgreSQL", "pymongo": "MongoDB", "motor": "MongoDB",
        "redis": "Redis", "celery": "Celery", "alembic": "Alembic",
        "peewee": "Peewee",
        # ── Data / ML / AI ──
        "pandas": "pandas", "numpy": "NumPy", "scipy": "SciPy",
        "matplotlib": "matplotlib", "seaborn": "seaborn", "plotly": "Plotly",
        "tensorflow": "TensorFlow", "torch": "PyTorch",
        "scikit-learn": "scikit-learn", "keras": "Keras",
        "transformers": "Hugging Face", "langchain": "LangChain",
        "openai": "OpenAI API", "ollama": "Ollama",
        "opencv-python": "Computer Vision", "pillow": "Pillow",
        "spacy": "spaCy", "nltk": "NLP",
        "xgboost": "XGBoost", "lightgbm": "LightGBM",
        "statsmodels": "statsmodels",
        # ── Testing ──
        "pytest": "pytest", "unittest": "unittest",
        "hypothesis": "Hypothesis",
        # ── DevOps / infra ──
        "boto3": "AWS", "google-cloud": "Google Cloud",
        "docker": "Docker",
        # ── Serialisation / validation ──
        "pydantic": "Pydantic", "marshmallow": "Marshmallow",
        # ── Async / networking ──
        "httpx": "httpx", "requests": "Requests",
        "websockets": "WebSockets", "grpcio": "gRPC",
    },
    "Pipfile": {
        "django": "Django", "flask": "Flask", "fastapi": "FastAPI",
        "pandas": "pandas", "numpy": "NumPy", "tensorflow": "TensorFlow",
        "torch": "PyTorch", "scikit-learn": "scikit-learn",
        "celery": "Celery", "sqlalchemy": "SQLAlchemy",
        "pytest": "pytest", "boto3": "AWS",
    },
    "pyproject.toml": {
        "django": "Django", "flask": "Flask", "fastapi": "FastAPI",
        "pandas": "pandas", "numpy": "NumPy", "tensorflow": "TensorFlow",
        "torch": "PyTorch", "scikit-learn": "scikit-learn",
        "sqlalchemy": "SQLAlchemy", "pydantic": "Pydantic",
        "pytest": "pytest", "poetry": "Poetry",
    },
    "pom.xml": {
        "spring-boot": "Spring Boot", "spring-core": "Spring",
        "spring-web": "Spring", "spring-security": "Spring Security",
        "hibernate": "Hibernate", "junit": "JUnit", "mockito": "Mockito",
        "jackson": "Jackson", "lombok": "Lombok",
        "maven-compiler": "Maven",
        "mybatis": "MyBatis", "thymeleaf": "Thymeleaf",
    },
    "build.gradle": {
        "spring-boot": "Spring Boot", "spring": "Spring",
        "hibernate": "Hibernate", "junit": "JUnit", "mockito": "Mockito",
        "kotlin": "Kotlin", "android": "Android",
        "retrofit": "Retrofit", "room": "Android Room",
        "compose": "Jetpack Compose", "dagger": "Dagger", "hilt": "Hilt",
        "ktor": "Ktor",
    },
    "go.mod": {
        "gin-gonic/gin": "Gin", "gorilla/mux": "Gorilla Mux",
        "gofiber/fiber": "Fiber", "labstack/echo": "Echo",
        "gorm.io": "GORM", "go-redis": "Redis",
        "aws-sdk-go": "AWS", "grpc": "gRPC",
        "prometheus": "Prometheus", "zap": "Zap Logger",
        "cobra": "Cobra CLI", "viper": "Viper",
    },
    "Cargo.toml": {
        "actix-web": "Actix Web", "rocket": "Rocket",
        "tokio": "Tokio", "serde": "Serde",
        "diesel": "Diesel ORM", "sqlx": "SQLx",
        "reqwest": "Reqwest", "warp": "Warp",
        "axum": "Axum", "tonic": "gRPC",
        "clap": "Clap CLI",
    },
    "Gemfile": {
        "rails": "Ruby on Rails", "sinatra": "Sinatra",
        "sidekiq": "Sidekiq", "rspec": "RSpec",
        "devise": "Devise", "activerecord": "ActiveRecord",
        "pg": "PostgreSQL", "redis": "Redis",
    },
    "composer.json": {
        "laravel": "Laravel", "symfony": "Symfony",
        "slim": "Slim", "phpunit": "PHPUnit",
        "doctrine": "Doctrine", "guzzle": "Guzzle",
    },
    "pubspec.yaml": {
        "flutter": "Flutter", "dart": "Dart",
        "firebase": "Firebase", "bloc": "BLoC",
        "provider": "Provider", "riverpod": "Riverpod",
        "dio": "Dio",
    },
}


def _recency_weight(pushed_at: datetime | None) -> int:
    """3x for repos active ≤6 months, 2x for ≤12 months, 1x older."""
    if pushed_at is None:
        return 1
    if pushed_at.tzinfo is None:
        pushed_at = pushed_at.replace(tzinfo=timezone.utc)
    age_days = (datetime.now(timezone.utc) - pushed_at).days
    if age_days <= 180:
        return 3
    if age_days <= 365:
        return 2
    return 1


def _detect_frameworks(repo) -> list[str]:
    """Scan dependency files in a repo for known framework names.
    Also infers Node.js when package.json contains server-side signals.
    """
    found: set[str] = set()
    pkg_json_raw: str | None = None

    for filename, patterns in _FRAMEWORK_PATTERNS.items():
        try:
            raw = repo.get_contents(filename).decoded_content.decode("utf-8", errors="ignore").lower()
            if filename == "package.json":
                pkg_json_raw = raw
            for key, canonical in patterns.items():
                if key.lower() in raw:
                    found.add(canonical)
        except Exception:
            pass

    # ── Node.js inference from package.json ───────────────────────────────
    if pkg_json_raw is not None:
        _NODEJS_SIGNALS = [
            '"express"', '"fastify"', '"koa"', '"hapi"', '"restify"',
            '"@nestjs/core"', '"socket.io"', '"ws"',
            '"dotenv"', '"nodemon"', '"ts-node"', '"@types/node"',
            '"cors"', '"helmet"', '"morgan"', '"body-parser"',
            '"mongoose"', '"sequelize"', '"prisma"', '"typeorm"',
            '"pg"', '"mysql2"', '"redis"', '"ioredis"',
            '"jsonwebtoken"', '"passport"', '"bcrypt"', '"bcryptjs"',
            '"multer"', '"sharp"', '"nodemailer"', '"bull"', '"agenda"',
            '"main"', '"bin"', '"engines"',
        ]
        if any(sig in pkg_json_raw for sig in _NODEJS_SIGNALS):
            found.add("Node.js")

    return list(found)


def _commit_streak(repos: list) -> int:
    """Longest streak of consecutive days with at least one commit (across top 10 repos)."""
    commit_days: set = set()
    for repo in repos[:10]:
        if repo.size == 0:
            continue
        try:
            for i, commit in enumerate(repo.get_commits()):
                if i >= 50:
                    break
                d = commit.commit.author.date
                if d:
                    if d.tzinfo is None:
                        d = d.replace(tzinfo=timezone.utc)
                    commit_days.add(d.date())
        except Exception:
            pass

    if not commit_days:
        return 0

    sorted_days = sorted(commit_days, reverse=True)
    streak = max_streak = 1
    for i in range(1, len(sorted_days)):
        if (sorted_days[i - 1] - sorted_days[i]).days == 1:
            streak += 1
            if streak > max_streak:
                max_streak = streak
        else:
            streak = 1
    return max_streak


def _test_ratio(repos: list) -> float:
    """Ratio of test/spec files to total files across up to 5 repos."""
    total = test_count = 0
    for repo in repos[:5]:
        if repo.size == 0:
            continue
        try:
            tree = repo.get_git_tree(repo.default_branch, recursive=True)
            for item in tree.tree:
                if item.type == "blob":
                    total += 1
                    p = item.path.lower()
                    if "test" in p or "spec" in p:
                        test_count += 1
        except Exception:
            pass
    return round(test_count / total, 3) if total else 0.0


def _scrape_github_sync(github_url: str) -> dict:
    """Synchronous GitHub scrape (PyGithub is blocking)."""
    username = github_url.rstrip("/").split("/")[-1]
    g = Github(GITHUB_TOKEN) if GITHUB_TOKEN else Github()

    try:
        user = g.get_user(username)
        _ = user.public_repos  # trigger real API call to detect missing user early
    except GithubException:
        return {
            "platform": "github",
            "skills": [], "projects": [], "metrics": {}, "raw_data": {},
            "error": f"GitHub user '{username}' not found or API limit exceeded.",
        }

    # Fetch up to 30 most-recently-updated owned repos
    all_repos: list = []
    for i, r in enumerate(user.get_repos(type="owner", sort="updated")):
        if i >= 30:
            break
        all_repos.append(r)

    non_fork = [r for r in all_repos if not r.fork]

    # ── Weighted language scoring ──────────────────────────────────────────
    weighted_scores: dict[str, float] = {}
    topics: set[str] = set()
    project_names: list[str] = []
    frameworks: list[str] = []

    for repo in non_fork:
        if repo.size == 0:
            continue
        project_names.append(repo.name)
        weight = _recency_weight(repo.pushed_at)

        try:
            for lang, byte_count in repo.get_languages().items():
                weighted_scores[lang] = weighted_scores.get(lang, 0) + byte_count * weight
        except Exception:
            pass

        try:
            topics.update(repo.get_topics())
        except Exception:
            pass

        frameworks.extend(_detect_frameworks(repo))

    # Normalise weighted scores to 0-100
    max_score = max(weighted_scores.values(), default=1)
    normalized: dict[str, float] = {
        lang: round(score / max_score * 100, 1)
        for lang, score in weighted_scores.items()
    }
    top_langs = [
        lang for lang, _ in
        sorted(normalized.items(), key=lambda x: x[1], reverse=True)[:15]
    ]

    # ── Commit streak & test ratio ─────────────────────────────────────────
    streak = _commit_streak(non_fork)
    test_ratio = _test_ratio(non_fork)

    all_skills = list(set(top_langs + list(topics) + list(set(frameworks))))

    return {
        "platform": "github",
        "skills": all_skills,
        "projects": project_names[:20],
        "metrics": {
            "public_repos": user.public_repos,
            "followers": user.followers,
            "total_stars": sum(r.stargazers_count for r in non_fork),
            "top_languages": top_langs,
            "language_scores": {lang: normalized[lang] for lang in top_langs},
            "commit_streak": streak,
            "test_ratio": test_ratio,
            "account_created": user.created_at.isoformat() if user.created_at else None,
        },
        "raw_data": {
            "weighted_language_scores": {k: round(v, 1) for k, v in weighted_scores.items()},
            "normalized_language_scores": normalized,
            "topics": list(topics),
            "frameworks_detected": list(set(frameworks)),
        },
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }


async def scrape_github(github_url: str) -> dict:
    """Async wrapper that runs the blocking PyGithub code in a thread."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _scrape_github_sync, github_url)
