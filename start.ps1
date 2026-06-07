# OmaniEthnoDBKG — start backend + frontend (Windows)
$ErrorActionPreference = "Stop"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Host "Creating Python virtual environment in backend/.venv ..."
    python -m venv (Join-Path $Backend ".venv")
    & $VenvPython -m pip install -r (Join-Path $Backend "requirements.txt")
}

Write-Host "  RAG chat uses Gemini API (set GEMINI_API_KEY in .env)"
Write-Host "==> Starting FastAPI backend on http://localhost:8000 ..."
Start-Process -FilePath $VenvPython -ArgumentList "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload" -WorkingDirectory $Backend

Write-Host "==> Starting Vite frontend on http://localhost:5173 ..."
Set-Location $Root
npm run dev
