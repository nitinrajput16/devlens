"""
Authentication module — JWT tokens, password hashing, OAuth helpers.
"""

import asyncio
import os
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from typing import Optional

from database import users_collection

# ── Config ──────────────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("JWT_SECRET", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")

# ── Password hashing ───────────────────────────────────────────────────────

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

# ── JWT helpers ─────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

# ── FastAPI dependency: extract current user from Bearer token ──────────────

bearer_scheme = HTTPBearer(auto_error=False)

async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    if creds is None:
        return None
    try:
        payload = decode_token(creds.credentials)
        email: str = payload.get("sub")
        if not email:
            return None
        user = await users_collection.find_one({"email": email})
        return user
    except JWTError:
        return None

async def require_user(user=Depends(get_current_user)):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user

# ── Pydantic models ────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleTokenRequest(BaseModel):
    credential: str          # Google ID token (from Google Sign-In)

class GitHubCodeRequest(BaseModel):
    code: str                # GitHub OAuth authorization code

class AuthResponse(BaseModel):
    token: str
    user: dict

# ── Email register / login ─────────────────────────────────────────────────

async def register_email(req: RegisterRequest) -> AuthResponse:
    existing = await users_collection.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    pw_hash = await asyncio.get_event_loop().run_in_executor(None, hash_password, req.password)
    user_doc = {
        "name": req.name,
        "email": req.email,
        "password_hash": pw_hash,
        "provider": "email",
        "created_at": datetime.now(timezone.utc),
    }
    await users_collection.insert_one(user_doc)
    token = create_access_token({"sub": req.email, "name": req.name})
    return AuthResponse(token=token, user={"name": req.name, "email": req.email, "provider": "email"})

async def login_email(req: LoginRequest) -> AuthResponse:
    user = await users_collection.find_one({"email": req.email})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    valid = await asyncio.get_event_loop().run_in_executor(None, verify_password, req.password, user["password_hash"])
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user["email"], "name": user["name"]})
    return AuthResponse(token=token, user={"name": user["name"], "email": user["email"], "provider": user.get("provider", "email")})

# ── Google OAuth ────────────────────────────────────────────────────────────

GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"

async def login_google(req: GoogleTokenRequest) -> AuthResponse:
    # Verify the Google ID token via Google's tokeninfo endpoint
    async with httpx.AsyncClient() as client:
        resp = await client.get(GOOGLE_TOKEN_INFO_URL, params={"id_token": req.credential})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    info = resp.json()

    if GOOGLE_CLIENT_ID and info.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Google token audience mismatch")

    email = info.get("email")
    name = info.get("name", email.split("@")[0] if email else "User")

    # Upsert user
    user = await users_collection.find_one({"email": email})
    if not user:
        user_doc = {
            "name": name,
            "email": email,
            "provider": "google",
            "avatar": info.get("picture"),
            "created_at": datetime.now(timezone.utc),
        }
        await users_collection.insert_one(user_doc)
    else:
        name = user.get("name", name)

    token = create_access_token({"sub": email, "name": name})
    return AuthResponse(token=token, user={"name": name, "email": email, "provider": "google"})

# ── GitHub OAuth ────────────────────────────────────────────────────────────

GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"

async def login_github(req: GitHubCodeRequest) -> AuthResponse:
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            json={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": req.code,
            },
            headers={"Accept": "application/json"},
        )
    if token_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="GitHub token exchange failed")
    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail=token_data.get("error_description", "GitHub auth failed"))

    # Fetch user profile
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(GITHUB_USER_URL, headers=headers)
        email_resp = await client.get(GITHUB_EMAILS_URL, headers=headers)

    if user_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Could not fetch GitHub user")

    gh_user = user_resp.json()
    name = gh_user.get("name") or gh_user.get("login", "GitHub User")

    # Get primary email
    email = gh_user.get("email")
    if not email and email_resp.status_code == 200:
        emails = email_resp.json()
        primary = next((e for e in emails if e.get("primary")), None)
        email = primary["email"] if primary else (emails[0]["email"] if emails else None)
    if not email:
        raise HTTPException(status_code=400, detail="No email associated with GitHub account")

    # Upsert user
    user = await users_collection.find_one({"email": email})
    if not user:
        user_doc = {
            "name": name,
            "email": email,
            "provider": "github",
            "github_login": gh_user.get("login"),
            "avatar": gh_user.get("avatar_url"),
            "created_at": datetime.now(timezone.utc),
        }
        await users_collection.insert_one(user_doc)
    else:
        name = user.get("name", name)

    token = create_access_token({"sub": email, "name": name})
    return AuthResponse(token=token, user={"name": name, "email": email, "provider": "github"})
