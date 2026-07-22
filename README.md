

# OMEDB

A full-stack plant knowledge app with a Vite frontend and a FastAPI backend.

## What you need

Before you start, install:

- Git
- Node.js 18+ and npm
- Python 3.10+ with `python` available in your terminal

## Clone the repo

```bash
git clone <your-repo-url>
cd Research
```

If you already have the repo open in VS Code, you can skip this step and continue below.

## Quick start

If you want the fastest path on Windows, run:

```powershell
.\start.ps1
```

This starts:

- the FastAPI backend on http://localhost:8000
- the Vite frontend on http://localhost:5173

## One-platform deploy

If you want one public URL with no domain, deploy the full app to Render.

Render will:

- install the frontend and backend dependencies
- build the Vite app into `dist/`
- start the FastAPI app
- serve the browser app and API from the same service URL

### Render steps

1. Create a new Web Service from this repo.
2. Let Render use the included `render.yaml` blueprint.
3. Add any required environment variables such as `GEMINI_API_KEY`, `GEMINI_MODEL`, and `ADMIN_PASSWORD`.
4. Deploy and open the generated `*.onrender.com` URL.

### What changed for deployment

The FastAPI backend now serves the built frontend from `dist/`, so one deployment can handle:

- `/` for the browser app
- `/api/*` for the backend
- `/uploads/*` for plant images

## Step-by-step setup

### 1. Install frontend dependencies

From the project root, run:

```bash
npm install
```

### 2. Create the backend virtual environment

Install the Python dependencies for the API:

```bash
npm run setup:backend
```

This creates `backend/.venv` and installs everything in `backend/requirements.txt`.

### 3. Add the plant data

On first startup, the backend builds `backend/omani_ethno.db` from a CSV file.

You have two options:

- Full dataset: copy `Oman_Ethnomedicinal_Merged.csv` into `backend/data/`
- Sample dataset: use the included `backend/data/Oman_Ethnomedicinal_Merged.sample.csv`

If you want to use a custom CSV path, set:

```powershell
$env:OMAN_ETHNO_CSV="C:\path\to\file.csv"
```

### 4. Start the backend

Open a terminal in the project root and run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
npm run dev:backend
```

Leave this terminal open. The API should appear at http://localhost:8000.

### 5. Start the frontend

Open a second terminal in the project root and run:

```bash
npm run dev
```

Then open http://localhost:5173 in your browser.

## Optional configuration

### Gemini chat

The chatbot uses the Gemini API for answer generation. Create a `.env` file in the project root and add:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

You can get a free key from [Google AI Studio](https://aistudio.google.com/apikey).

### Admin panel

The admin panel is available in the app navigation or at http://localhost:5173/admin.

Add this to `.env` if you want to enable it:

```env
ADMIN_PASSWORD=admin
```

If `ADMIN_PASSWORD` is empty, the panel stays disabled.

## How the app works

- The frontend runs in the browser on port 5173.
- The backend serves the API on port 8000.
- The frontend needs the backend to be running, or requests will fail.
- The backend creates and reads the local SQLite database used by the app.

## Common problems

### Frontend shows `Failed to fetch`

The backend is probably not running. Start `npm run dev:backend` or use `.\start.ps1`.

### PowerShell blocks the startup script

Run this in the current terminal before starting the app:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
```

### Backend cannot find the CSV

Make sure a CSV exists in `backend/data/`, or set `OMAN_ETHNO_CSV` to the full file path.

### Render deploy fails because the frontend build is missing

Render must run the build command before startup. The included `render.yaml` does this automatically.

## Useful links

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs

## Plant images

In Admin -> Plants, you can drag and drop an image onto the `image_url` cell or browse for a file. Uploaded images are saved in `backend/uploads/plants/` and shown on plant profile pages.
  
