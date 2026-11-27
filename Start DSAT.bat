@echo off
title DSAT Movie and Drama
cd /d "%~dp0"
start "" http://localhost:8080
node server.js
pause
