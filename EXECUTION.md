# How to Run & Execute DevLens

Follow this step-by-step guide to run the DevLens application locally on your machine.

---

## 1. Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Node.js & npm** (v18+ recommended)
- **Python** (v3.10+ recommended)
- **Git**
- **Ollama** (for local LLM execution: [Download here](https://ollama.com/download))

---

## 2. Infrastructure Setup

### A. Start Ollama Local AI
DevLens relies on a local instance of Ollama running the Llama 3.2 model for gap analysis and roadmap generation.
1. Open a terminal and pull the required model:
   ```bash
   ollama pull llama3.2:3b
   ```
2. Start the Ollama server:
   ```bash
   ollama serve
   ```
   *(Keep this terminal open in the background).*

### B. Database (MongoDB Atlas)
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/) and create a free account.
2. Deploy a free cluster (M0 Sandbox).
3. Under **Database Access**, create a user and password.
4. Under **Network Access**, add the IP address `0.0.0.0/0` (allows connection from anywhere for local dev).
5. Click **Connect -> Drivers -> Python** to get your connection string. It will look like: 
   `mongodb+srv://<username>:<password>@cluster.mongodb.net/devlens`

### C. Configure `.env`
Open `backend/.env` and paste your connection string and API keys:

```dotenv
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/devlens
GITHUB_TOKEN=your_github_personal_access_token
JSEARCH_API_KEY=your_rapidapi_jsearch_key
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
# Add other optional API keys as desired...
```
*Note: A GitHub PAT (Personal Access Token) is highly recommended to avoid rate limits.*

---

## 3. Start the Backend (FastAPI)

Open a new terminal session and navigate to the project directory:

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create a virtual environment
python -m venv venv

# 3. Activate the virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Start the FastAPI server
uvicorn main:app --reload --port 8000
```
*The backend should now be running at `http://localhost:8000`. Keep this terminal open.*

---

## 4. Start the Frontend (React + Vite)

Open another new terminal session and navigate to the project directory:

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install NPM dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

*The frontend should now be running at `http://localhost:5173`. Keep this terminal open.*

---

## 5. How to Use DevLens

1. Open your browser and navigate to [http://localhost:5173](http://localhost:5173).
2. You will see the **URL Input Form**.
3. Paste in your public profile URLs (e.g., `https://github.com/your-username`).
4. *(Optional Focus)* Enter a Target Role (e.g., "Senior Backend Developer"). If left blank, it will default to **Auto Job Suggestion (Mode 1)**. If populated, it triggers **Gap Analysis (Mode 2)**.
5. Click **"Analyse My Profiles"**.
6. The app will transition to a **Loading Screen** where you can watch the scrapers run in parallel.
7. Finally, you will be redirected to the **Results Dashboard** showing your Skill Radar, Job Matches, or a personalized Learning Roadmap!

---

## Troubleshooting

- **Ollama connection error:** Double check that `ollama serve` is running in its own terminal window.
- **MongoDB error:** Ensure you swapped `<username>` and `<password>` exactly as they exist in Atlas, and that your IP is whitelisted.
- **Scraper Errors (Rate Limiting):** If GitHub or StackOverflow scrapers fail easily, ensure you provided actual API keys in the `backend/.env` file.

---

## 6. Deploying to Render.com (Production)

DevLens ships with a `render.yaml` blueprint. Two steps:

### A. One-click deploy
1. Push the repo to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New → Blueprint** → connect your repo.
3. Render will detect `render.yaml` and create two services:
   - `devlens-api` — FastAPI web service
   - `devlens-web` — React/Vite static site

### B. Set environment variables
After the services are created, open each service → **Environment** and fill in all `sync: false` values from `backend/.env.example`.

Key values to update:
| Variable | Where | Notes |
|---|---|---|
| `ALLOWED_ORIGINS` | `devlens-api` env | Set to your Render static site URL, e.g. `https://devlens-web.onrender.com` |
| `VITE_API_URL` | `devlens-web` env | Set to your Render API URL, e.g. `https://devlens-api.onrender.com` |
| `JWT_SECRET` | `devlens-api` env | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `MONGODB_URI` | `devlens-api` env | Atlas connection string |
| `GOOGLE_CLIENT_ID/SECRET` | `devlens-api` env | Add `https://devlens-api.onrender.com` as an authorised redirect URI in Google Console |
| `GITHUB_CLIENT_ID/SECRET` | `devlens-api` env | Add `https://devlens-api.onrender.com/auth/github/callback` in GitHub OAuth App settings |

### C. Redeploy
After saving environment variables, trigger a manual deploy on both services. The frontend static site will rebuild with the correct `VITE_API_URL` baked in.

### Local vs Production behaviour
| | Dev | Production |
|---|---|---|
| Frontend API calls | Vite proxy `/api` → `localhost:8000` | Direct to `VITE_API_URL/api` |
| CORS | `localhost:5173` allowed | `ALLOWED_ORIGINS` env var |
| LLM | Local Ollama or cloud | Cloud (`OLLAMA_HOST=https://ollama.com`) |
