@echo off
echo ===========================================
echo    Smart Bus Pi Client - Quick Start       
echo ===========================================

cd /d "%~dp0"

:: Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Python is not installed or not in PATH. Please install it first.
    pause
    exit /b 1
)

:: Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate virtual environment
call venv\Scripts\activate.bat

:: Install dependencies
echo Checking dependencies...
pip install -r requirements.txt

:: Run the client in interactive mode
echo.
echo Starting Smart Bus Client in interactive mode...
echo.
python smart_bus_client.py -i

pause
