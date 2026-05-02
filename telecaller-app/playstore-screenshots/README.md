# Play Store Screenshots

This folder contains screenshots for Google Play Store submission.

## Requirements

| Asset | Size | Quantity | Format |
|-------|------|----------|--------|
| Phone screenshots | 1080 x 1920 px (9:16) | 2-8 | PNG/JPEG |
| Feature graphic | 1024 x 500 px | 1 | PNG/JPEG |
| App icon | 512 x 512 px | 1 | PNG |

## Screenshots to Capture

1. **01-login.png** - Login screen
2. **02-dashboard.png** - Dashboard/Home screen
3. **03-leads.png** - Leads list
4. **04-call-screen.png** - Call interface
5. **05-call-history.png** - Call history
6. **06-profile.png** - Profile screen

## How to Capture

### Option 1: Interactive Script (Recommended)

```bash
cd telecaller-app
node scripts/capture-playstore-screenshots.js
```

Navigate to each screen manually, press Enter to capture.

### Option 2: Quick Capture (Windows)

```cmd
cd telecaller-app\scripts

# Navigate to screen in app, then run:
capture-screenshot.bat 01-login
capture-screenshot.bat 02-dashboard
# ... etc
```

### Option 3: Manual with ADB

```bash
# Capture current screen
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ./01-login.png
adb shell rm /sdcard/screenshot.png
```

## Prerequisites

- Android emulator running OR device connected via USB
- USB debugging enabled on device
- ADB installed and in PATH
- App installed on device

## Tips for Good Screenshots

1. Use a clean emulator/device (no notifications)
2. Make sure battery is full in status bar
3. Set time to something nice like 9:41 AM
4. Use realistic sample data
5. Hide the navigation bar if possible

## After Capturing

Upload screenshots to Google Play Console:
1. Go to Play Console > Your App > Store presence > Main store listing
2. Scroll to "Phone screenshots"
3. Upload 2-8 screenshots
4. Add Feature graphic (1024x500)
