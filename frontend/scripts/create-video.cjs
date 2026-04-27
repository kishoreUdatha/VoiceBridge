const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '../public/video-screenshots');
const OUTPUT_DIR = path.join(__dirname, '../public/videos');
const TEMP_DIR = path.join(__dirname, '../temp-video');

// FFmpeg path after winget install
const FFMPEG = 'C:\\Users\\Lekhana\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1-full_build\\bin\\ffmpeg.exe';

// Video settings
const FRAME_DURATION = 4; // seconds per screenshot

// Narrations for each screen
const NARRATIONS = {
  '00-login': 'Welcome to MyLeadX, your AI-powered CRM solution.',
  '01-dashboard': 'The dashboard gives you a complete overview of your sales performance.',
  '02-leads': 'Manage all your leads with powerful filtering and bulk actions.',
  '03-pipeline': 'Visualize your sales pipeline with drag and drop stages.',
  '04-analytics': 'Get deep insights with our analytics dashboard.',
  '05-users': 'Manage user accounts and team members.',
  '06-roles': 'Define custom roles with specific permissions.',
  '07-voice-ai': 'Meet our AI Voice Agents that call leads in 10 plus languages.',
  '08-outbound-calls': 'Launch outbound calling campaigns with AI agents.',
  '09-telecaller-app': 'Telecallers get a dedicated app for making calls.',
  '10-call-history': 'Access complete call history with recordings and transcripts.',
  '11-campaigns': 'Create and manage marketing campaigns.',
  '12-reports': 'Generate detailed reports on sales operations.',
  '13-settings': 'Customize MyLeadX to fit your business needs.',
  '14-subscription': 'Manage your subscription and billing.',
  '15-api-keys': 'Integrate with your tools using our API.',
};

function formatSrtTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

async function createVideo() {
  console.log('Creating video from screenshots...\n');

  // Create directories
  [OUTPUT_DIR, TEMP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // Read metadata
  const metadataPath = path.join(SCREENSHOTS_DIR, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error('Error: Run capture-key-screens.cjs first');
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  console.log(`Found ${metadata.pages.length} screenshots\n`);

  // Create file list for ffmpeg
  const fileListPath = path.join(TEMP_DIR, 'files.txt');
  let fileListContent = '';

  for (const page of metadata.pages) {
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${page.name}.png`);
    if (fs.existsSync(screenshotPath)) {
      fileListContent += `file '${screenshotPath.replace(/\\/g, '/')}'\n`;
      fileListContent += `duration ${FRAME_DURATION}\n`;
    }
  }

  // Add last image again
  const lastPage = metadata.pages[metadata.pages.length - 1];
  const lastScreenshot = path.join(SCREENSHOTS_DIR, `${lastPage.name}.png`);
  if (fs.existsSync(lastScreenshot)) {
    fileListContent += `file '${lastScreenshot.replace(/\\/g, '/')}'\n`;
  }

  fs.writeFileSync(fileListPath, fileListContent);

  // Create SRT subtitles
  const srtPath = path.join(TEMP_DIR, 'subtitles.srt');
  let srtContent = '';
  let timeOffset = 0;

  for (let i = 0; i < metadata.pages.length; i++) {
    const page = metadata.pages[i];
    const narration = NARRATIONS[page.name] || page.title;
    const startTime = formatSrtTime(timeOffset);
    const endTime = formatSrtTime(timeOffset + FRAME_DURATION - 0.5);

    srtContent += `${i + 1}\n${startTime} --> ${endTime}\n${narration}\n\n`;
    timeOffset += FRAME_DURATION;
  }

  fs.writeFileSync(srtPath, srtContent);
  console.log('Created subtitles file\n');

  const outputPath = path.join(OUTPUT_DIR, 'myleadx-demo.mp4');

  console.log('Generating video...');
  try {
    // Create video from images
    const cmd = `"${FFMPEG}" -y -f concat -safe 0 -i "${fileListPath.replace(/\\/g, '/')}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -c:v libx264 -preset medium -crf 23 -r 30 "${outputPath.replace(/\\/g, '/')}"`;

    execSync(cmd, { stdio: 'inherit' });
    console.log(`\n✓ Video created: ${outputPath}`);
  } catch (error) {
    console.error('Error creating video:', error.message);
    process.exit(1);
  }

  // Try to add subtitles (burned in)
  const outputWithSubs = path.join(OUTPUT_DIR, 'myleadx-demo-with-subs.mp4');
  console.log('\nAdding subtitles...');

  try {
    // Using drawtext instead of subtitles filter for reliability
    let filterComplex = '';
    let timeOffset2 = 0;

    for (let i = 0; i < metadata.pages.length; i++) {
      const page = metadata.pages[i];
      const text = (NARRATIONS[page.name] || page.title).replace(/'/g, "\\'").replace(/:/g, "\\:");
      const startTime = timeOffset2;
      const endTime = timeOffset2 + FRAME_DURATION;

      if (i > 0) filterComplex += ',';
      filterComplex += `drawtext=text='${text}':fontcolor=white:fontsize=36:box=1:boxcolor=black@0.7:boxborderw=10:x=(w-text_w)/2:y=h-100:enable='between(t,${startTime},${endTime})'`;
      timeOffset2 += FRAME_DURATION;
    }

    const subsCmd = `"${FFMPEG}" -y -i "${outputPath.replace(/\\/g, '/')}" -vf "${filterComplex}" -c:v libx264 -preset medium -crf 23 "${outputWithSubs.replace(/\\/g, '/')}"`;
    execSync(subsCmd, { stdio: 'inherit' });
    console.log(`✓ Video with subtitles: ${outputWithSubs}`);
  } catch (error) {
    console.log('Subtitle burning skipped (complex filter)');
    // Copy original as final
    fs.copyFileSync(outputPath, outputWithSubs);
  }

  // Create narration script
  const narrationScript = path.join(OUTPUT_DIR, 'narration-script.txt');
  let scriptContent = 'MyLeadX Demo Video - Narration Script\n=====================================\n\n';

  for (const page of metadata.pages) {
    const narration = NARRATIONS[page.name] || page.title;
    scriptContent += `[${page.title}] (${FRAME_DURATION}s)\n${narration}\n\n`;
  }

  fs.writeFileSync(narrationScript, scriptContent);

  // Create SRT in output folder too
  fs.copyFileSync(srtPath, path.join(OUTPUT_DIR, 'subtitles.srt'));

  console.log('\n========================================');
  console.log('VIDEO CREATION COMPLETE!');
  console.log('========================================');
  console.log(`Video: ${outputPath}`);
  console.log(`Video with subs: ${outputWithSubs}`);
  console.log(`Subtitles: ${path.join(OUTPUT_DIR, 'subtitles.srt')}`);
  console.log(`Narration script: ${narrationScript}`);
  console.log(`Duration: ~${metadata.pages.length * FRAME_DURATION} seconds`);
  console.log('========================================\n');
}

createVideo();
