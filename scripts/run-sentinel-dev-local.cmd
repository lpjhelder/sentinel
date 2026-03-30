@echo off
setlocal EnableExtensions
title Sentinel Launcher

cd /d "%~dp0.."
set "REPO_DIR=%cd%"

echo [Sentinel] Preparing startup from %REPO_DIR%
echo [Sentinel] Cleaning previous Sentinel dev processes...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kill-sentinel-dev.ps1" -RepoDir "%REPO_DIR%"

echo [Sentinel] Starting v2.0.2...
corepack pnpm dev:local
echo.
echo [Sentinel] Exited with code %ERRORLEVEL%
pause
