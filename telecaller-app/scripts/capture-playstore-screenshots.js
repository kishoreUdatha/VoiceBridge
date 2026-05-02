/**
 * Play Store Screenshot Capture Script
 *
 * This script captures screenshots from the MyLeadX telecaller app
 * for Google Play Store submission.
 *
 * Prerequisites:
 * - Android emulator running OR device connected via USB
 * - ADB installed and in PATH
 * - App installed on device/emulator
 *
 * Usage:
 *   node scripts/capture-playstore-screenshots.js
 *
 * Play Store Requirements:
 * - Phone screenshots: 1080 x 1920 px (or 9:16 ratio)
 * - Min 2, Max 8 screenshots
 * - PNG or JPEG, max 8MB each
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '../playstore-screenshots'),
  packageName: 'com.myleadx.telecaller',
  screenshotDelay: 2000, // ms to wait before capturing
  navigationDelay: 1500, // ms to wait after navigation
};

// Screenshot definitions
const SCREENSHOTS = [
  {
    name: '01-login',
    description: 'Login Screen',
    instructions: 'Make sure app is on login screen',
  },
  {
    name: '02-dashboard',
    description: 'Dashboard/Home',
    instructions: 'Login and wait for dashboard to load',
  },
  {
    name: '03-leads',
    description: 'Leads List',
    instructions: 'Navigate to leads tab',
  },
  {
    name: '04-call-screen',
    description: 'Call Screen',
    instructions: 'Open a lead and show call interface',
  },
  {
    name: '05-call-history',
    description: 'Call History',
    instructions: 'Navigate to call history tab',
  },
  {
    name: '06-profile',
    description: 'Profile Screen',
    instructions: 'Navigate to profile tab',
  },
];

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runAdb = (command) => {
  try {
    return execSync(`adb ${command}`, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    console.error(`ADB Error: ${error.message}`);
    return null;
  }
};

const checkAdbConnection = () => {
  const devices = runAdb('devices');
  if (!devices || !devices.includes('device')) {
    console.error('\n❌ No Android device/emulator connected!');
    console.log('\nPlease either:');
    console.log('  1. Start an Android emulator');
    console.log('  2. Connect a device via USB with debugging enabled\n');
    process.exit(1);
  }
  console.log('✅ Android device connected');
  return true;
};

const getDeviceResolution = () => {
  const output = runAdb('shell wm size');
  if (output) {
    const match = output.match(/(\d+)x(\d+)/);
    if (match) {
      return { width: parseInt(match[1]), height: parseInt(match[2]) };
    }
  }
  return { width: 1080, height: 1920 };
};

const captureScreenshot = async (filename) => {
  const devicePath = `/sdcard/${filename}.png`;
  const localPath = path.join(CONFIG.outputDir, `${filename}.png`);

  // Capture on device
  runAdb(`shell screencap -p ${devicePath}`);

  // Pull to local
  runAdb(`pull ${devicePath} "${localPath}"`);

  // Clean up device
  runAdb(`shell rm ${devicePath}`);

  if (fs.existsSync(localPath)) {
    const stats = fs.statSync(localPath);
    console.log(`   📸 Saved: ${filename}.png (${(stats.size / 1024).toFixed(1)} KB)`);
    return true;
  }
  return false;
};

const launchApp = () => {
  console.log('\n🚀 Launching MyLeadX app...');
  runAdb(`shell am start -n ${CONFIG.packageName}/.MainActivity`);
};

const pressBack = () => {
  runAdb('shell input keyevent KEYCODE_BACK');
};

const pressHome = () => {
  runAdb('shell input keyevent KEYCODE_HOME');
};

const tap = (x, y) => {
  runAdb(`shell input tap ${x} ${y}`);
};

const swipe = (x1, y1, x2, y2, duration = 300) => {
  runAdb(`shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`);
};

const inputText = (text) => {
  // Escape special characters for adb shell
  const escaped = text.replace(/[&;|<>$`\\!"']/g, '\\$&');
  runAdb(`shell input text "${escaped}"`);
};

// Interactive mode
const readline = require('readline');

const askQuestion = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
};

const interactiveCapture = async () => {
  console.log('\n📱 Interactive Screenshot Capture Mode');
  console.log('=====================================\n');
  console.log('Navigate to each screen manually, then press Enter to capture.\n');

  for (const screenshot of SCREENSHOTS) {
    console.log(`\n📍 Screenshot ${screenshot.name}: ${screenshot.description}`);
    console.log(`   Instructions: ${screenshot.instructions}`);

    const answer = await askQuestion('   Press Enter to capture (or "s" to skip): ');

    if (answer === 's') {
      console.log('   ⏭️  Skipped');
      continue;
    }

    await sleep(CONFIG.screenshotDelay);
    await captureScreenshot(screenshot.name);
  }
};

// Automated mode (basic - may need customization based on app UI)
const automatedCapture = async () => {
  const resolution = getDeviceResolution();
  const centerX = resolution.width / 2;
  const bottomTabY = resolution.height - 80;

  console.log(`\n📱 Device resolution: ${resolution.width}x${resolution.height}`);
  console.log('\n🤖 Automated Screenshot Capture Mode');
  console.log('=====================================\n');

  // Launch app fresh
  runAdb(`shell am force-stop ${CONFIG.packageName}`);
  await sleep(1000);
  launchApp();
  await sleep(3000);

  // 1. Login screen (assuming app opens to login if not logged in)
  console.log('📍 Capturing login screen...');
  await captureScreenshot('01-login');

  console.log('\n⚠️  Automated login not implemented.');
  console.log('   Please login manually, then press Enter to continue...');
  await askQuestion('   Press Enter when on dashboard: ');

  // 2. Dashboard
  console.log('📍 Capturing dashboard...');
  await sleep(CONFIG.screenshotDelay);
  await captureScreenshot('02-dashboard');

  // 3. Navigate to different tabs (assuming bottom tab bar)
  // Tab positions (approximate for 1080px width with 3-5 tabs)
  const tabPositions = {
    home: centerX * 0.4,
    leads: centerX * 0.8,
    history: centerX * 1.2,
    profile: centerX * 1.6,
  };

  // Leads tab
  console.log('📍 Navigating to leads...');
  tap(tabPositions.leads, bottomTabY);
  await sleep(CONFIG.navigationDelay);
  await captureScreenshot('03-leads');

  // Call history tab
  console.log('📍 Navigating to call history...');
  tap(tabPositions.history, bottomTabY);
  await sleep(CONFIG.navigationDelay);
  await captureScreenshot('05-call-history');

  // Profile tab
  console.log('📍 Navigating to profile...');
  tap(tabPositions.profile, bottomTabY);
  await sleep(CONFIG.navigationDelay);
  await captureScreenshot('06-profile');

  // Call screen (need to go back and tap on a lead)
  console.log('\n⚠️  Call screen capture requires manual navigation.');
  console.log('   Please open a lead to show the call interface...');
  await askQuestion('   Press Enter when on call screen: ');
  await captureScreenshot('04-call-screen');
};

// Main function
const main = async () => {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     MyLeadX Play Store Screenshot Capture Tool     ║');
  console.log('╚════════════════════════════════════════════════════╝');

  // Check ADB connection
  checkAdbConnection();

  // Create output directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  console.log(`📁 Screenshots will be saved to: ${CONFIG.outputDir}`);

  // Get device info
  const resolution = getDeviceResolution();
  console.log(`📱 Device resolution: ${resolution.width}x${resolution.height}`);

  // Ask for mode
  console.log('\nCapture modes:');
  console.log('  1. Interactive (recommended) - Navigate manually, capture on command');
  console.log('  2. Semi-automated - Script navigates, you handle login');

  const mode = await askQuestion('\nSelect mode (1 or 2): ');

  if (mode === '2') {
    await automatedCapture();
  } else {
    await interactiveCapture();
  }

  // Summary
  console.log('\n════════════════════════════════════════════════════');
  console.log('📊 Screenshot Capture Complete!\n');

  const files = fs.readdirSync(CONFIG.outputDir).filter(f => f.endsWith('.png'));
  console.log(`Total screenshots: ${files.length}`);
  files.forEach(f => {
    const stats = fs.statSync(path.join(CONFIG.outputDir, f));
    console.log(`  ✅ ${f} (${(stats.size / 1024).toFixed(1)} KB)`);
  });

  console.log(`\n📁 Location: ${CONFIG.outputDir}`);
  console.log('\n📋 Play Store Requirements:');
  console.log('   - Minimum 2 screenshots required');
  console.log('   - Maximum 8 screenshots allowed');
  console.log('   - Size: 1080x1920 (or 9:16 ratio)');
  console.log('   - Format: PNG or JPEG');
  console.log('   - Max file size: 8MB each\n');
};

// Run
main().catch(console.error);
