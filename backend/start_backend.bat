@echo off
setlocal

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Creating the Python virtual environment...
    python -m venv .venv
    if errorlevel 1 exit /b 1
)

if not exist ".env" (
    echo Missing backend\.env. Copy backend\.env.example to backend\.env and add your API key.
    exit /b 1
)

echo Installing or updating backend dependencies...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 exit /b 1

echo Starting ResearchMate AI backend at http://localhost:5000
".venv\Scripts\python.exe" app.py