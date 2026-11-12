@echo off
chcp 65001 > nul
title Eve イントロクイズ サーバー
echo ========================================================
echo    Eve イントロクイズ を起動しています...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
