@echo off
rem Starts the local web server for Display Map Editor and opens it in Microsoft Edge.
rem The server runs in a separate minimized window; close that window to stop it.

setlocal
set PORT=8765
set URL=http://localhost:%PORT%/index.html
cd /d "%~dp0"

rem Server already running? Just open the browser.
curl -s -o nul "%URL%" && goto browser

rem Pick a Python interpreter (python on PATH, or the py launcher)
set PY=
where python >nul 2>nul && set PY=python
if not defined PY where py >nul 2>nul && set PY=py
if not defined PY (
  echo Python was not found. Install it from https://www.python.org/ and try again.
  pause
  exit /b 1
)

start "Display Map Editor server (close to stop)" /min %PY% -m http.server %PORT% --bind 127.0.0.1

rem Wait up to ~10 s for the server to answer
for /l %%i in (1,1,10) do (
  curl -s -o nul "%URL%" && goto browser
  timeout /t 1 /nobreak >nul
)
echo The server did not start on port %PORT%. Check the server window for errors.
pause
exit /b 1

:browser
start "" msedge "%URL%"
endlocal
