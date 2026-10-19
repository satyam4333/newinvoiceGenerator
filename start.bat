@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing required packages... 
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed. Make sure Node.js LTS is installed and internet is available.
    pause
    exit /b 1
  )
)
start "JERVISH Business Suite" cmd /k "npm start"
timeout /t 3 /nobreak >nul
start "" http://localhost:3000
