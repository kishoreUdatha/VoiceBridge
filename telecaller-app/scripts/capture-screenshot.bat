@echo off
REM Quick Screenshot Capture for Play Store
REM Usage: capture-screenshot.bat [screenshot-name]
REM Example: capture-screenshot.bat 01-login

setlocal

set OUTPUT_DIR=%~dp0..\playstore-screenshots
set SCREENSHOT_NAME=%1

if "%SCREENSHOT_NAME%"=="" (
    echo.
    echo ========================================
    echo   MyLeadX Play Store Screenshot Tool
    echo ========================================
    echo.
    echo Usage: capture-screenshot.bat [name]
    echo.
    echo Examples:
    echo   capture-screenshot.bat 01-login
    echo   capture-screenshot.bat 02-dashboard
    echo   capture-screenshot.bat 03-leads
    echo   capture-screenshot.bat 04-call-screen
    echo   capture-screenshot.bat 05-call-history
    echo   capture-screenshot.bat 06-profile
    echo.
    echo Screenshots will be saved to:
    echo   %OUTPUT_DIR%
    echo.
    exit /b 1
)

REM Create output directory if it doesn't exist
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM Check ADB connection
adb devices | findstr /r "device$" >nul
if errorlevel 1 (
    echo.
    echo ERROR: No Android device connected!
    echo Please connect a device or start an emulator.
    echo.
    exit /b 1
)

echo.
echo Capturing screenshot: %SCREENSHOT_NAME%

REM Capture screenshot on device
adb shell screencap -p /sdcard/screenshot.png

REM Pull to local machine
adb pull /sdcard/screenshot.png "%OUTPUT_DIR%\%SCREENSHOT_NAME%.png"

REM Clean up device
adb shell rm /sdcard/screenshot.png

echo.
echo Screenshot saved to: %OUTPUT_DIR%\%SCREENSHOT_NAME%.png
echo.

endlocal
