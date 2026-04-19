@echo off

echo ==============================
echo Installing Python requirements...
pip install -r requirements.txt

echo ==============================
echo Starting Python server...
start cmd /k python server.py

timeout /t 1 >nul

echo ==============================
echo Starting React app...
start cmd /k "cd src && if not exist node_modules npm install && npm run dev"

timeout /t 4 >nul

echo Opening browser...
echo ==============================
start chrome http://localhost:5173

echo Done!
echo ==============================
pause