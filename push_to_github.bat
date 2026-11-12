@echo off
chcp 65001 > nul
title GitHub Push - Eve Intro Quiz
echo ========================================================
echo    GitHub (ocaevtakuchan/intro-quiz-eve) にプッシュします
echo ========================================================
echo.
set "GIT_PATH=%LOCALAPPDATA%\MinGit\cmd\git.exe"

if not exist "%GIT_PATH%" (
    echo Git が見つかりません。
    pause
    exit /b 1
)

echo リモートリポジトリへプッシュ中...
echo (ブラウザによるGitHub認証画面が開いた場合は、ログイン・承認してください)
echo.

"%GIT_PATH%" push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   プッシュが正常に完了しました！
    echo   https://github.com/ocaevtakuchan/intro-quiz-eve
    echo ========================================================
) else (
    echo ========================================================
    echo   プッシュに失敗しました。
    echo   認証情報（GitHubアカウント）をご確認ください。
    echo ========================================================
)
echo.
pause
