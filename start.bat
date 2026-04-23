@echo off
echo =========================================
echo    Starting Photo Converter Application
echo =========================================
echo.

echo [1/3] Starting Backend Server (Port 5000)...
start "Photo Converter Backend" cmd /k "cd backend && python -m uvicorn main:app --reload --port 5000"

echo [2/3] Starting Frontend Server (Port 5173)...
start "Photo Converter Frontend" cmd /k "cd frontend && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 5 /nobreak > nul

echo Opening Web Interface in your default browser...
start http://localhost:5173

echo.
echo Application started! 
echo (Leave the two new command prompt windows open while using the app)
echo.
pause
