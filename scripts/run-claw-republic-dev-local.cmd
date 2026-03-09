@echo off
setlocal EnableExtensions
title Claw-Republic Launcher

cd /d "%~dp0.."
set "REPO_DIR=%cd%"

echo [Claw-Republic] Preparing startup from %REPO_DIR%
echo [Claw-Republic] Cleaning previous Claw-Republic dev processes...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kill-claw-republic-dev.ps1" -RepoDir "%REPO_DIR%"

echo [Claw-Republic] Starting v2.0.2...
corepack pnpm dev:local
echo.
echo [Claw-Republic] Exited with code %ERRORLEVEL%
pause
