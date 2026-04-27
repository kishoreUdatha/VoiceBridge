const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../public/videos');
const AUDIO_DIR = path.join(OUTPUT_DIR, 'audio-segments');

// Narration segments with timing
const NARRATIONS = [
  { id: '00-login', text: 'Welcome to MyLeadX, your AI-powered CRM solution. Start by logging in with your credentials.' },
  { id: '01-dashboard', text: 'The dashboard gives you a complete overview of your sales performance, leads, and team activity at a glance.' },
  { id: '02-leads', text: 'Manage all your leads in one place. Filter, search, and take action on leads with our powerful lead management system.' },
  { id: '03-pipeline', text: 'Visualize your sales pipeline with our Kanban-style board. Drag and drop leads through different stages.' },
  { id: '04-analytics', text: 'Get deep insights with our analytics dashboard. Track conversion rates, revenue, and team performance.' },
  { id: '05-team-management', text: 'Manage your sales team effectively. Assign leads, track performance, and optimize workloads.' },
  { id: '06-voice-ai', text: 'Meet our AI Voice Agents. They can make calls in 10 plus Indian languages, qualify leads, and book meetings automatically.' },
  { id: '07-outbound-calls', text: 'Launch outbound calling campaigns with AI or human agents. Track every call in real-time.' },
  { id: '08-telecaller-app', text: 'Your telecallers get a dedicated app with click-to-call, scripts, and instant lead updates.' },
  { id: '09-call-history', text: 'Access complete call history with recordings, transcripts, and AI-generated summaries.' },
  { id: '10-campaigns', text: 'Create and manage marketing campaigns across multiple channels from one dashboard.' },
  { id: '11-forms', text: 'Build custom lead capture forms with our drag-and-drop form builder.' },
  { id: '12-templates', text: 'Create and manage templates for emails, SMS, and WhatsApp messages.' },
  { id: '13-conversations', text: 'View all customer conversations across channels in one unified inbox.' },
  { id: '14-unified-inbox', text: 'Never miss a message. Our unified inbox brings together WhatsApp, SMS, email, and more.' },
  { id: '15-whatsapp-bulk', text: 'Send bulk WhatsApp messages to your leads with templates and personalization.' },
  { id: '16-reports', text: 'Generate detailed reports on every aspect of your sales operations.' },
  { id: '17-advanced-analytics', text: 'Advanced analytics with AI-powered insights and predictions.' },
  { id: '18-conversion-funnel', text: 'Analyze your conversion funnel to identify bottlenecks and optimize your sales process.' },
  { id: '19-settings', text: 'Customize MyLeadX to fit your business needs with comprehensive settings.' },
  { id: '20-pipeline-settings', text: 'Configure your sales pipeline stages and automations.' },
  { id: '21-workflows', text: 'Automate repetitive tasks with our powerful workflow builder.' },
  { id: '22-qualified-leads', text: 'Focus on qualified leads that are ready to convert.' },
  { id: '23-lead-distribution', text: 'Automatically distribute leads to the right team members based on rules.' },
  { id: '24-users', text: 'Manage user accounts, permissions, and access levels.' },
  { id: '25-roles', text: 'Define custom roles with specific permissions for different team members.' },
  { id: '26-api-keys', text: 'Integrate MyLeadX with your existing tools using our powerful API.' },
  { id: '27-integrations', text: 'Connect with popular tools like WhatsApp, Facebook, Google, and more.' },
  { id: '28-subscription', text: 'Manage your subscription and billing details.' },
  { id: '29-payments', text: 'Track all payment transactions and revenue in one place.' },
];

// Using Edge TTS (free, no API key needed)
async function generateWithEdgeTTS() {
  console.log('Generating audio using Edge TTS...\n');

  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }

  // Check if edge-tts is installed
  try {
    execSync('edge-tts --version', { stdio: 'pipe' });
  } catch {
    console.log('Installing edge-tts...');
    execSync('pip install edge-tts', { stdio: 'inherit' });
  }

  const audioFiles = [];

  for (let i = 0; i < NARRATIONS.length; i++) {
    const narration = NARRATIONS[i];
    const outputFile = path.join(AUDIO_DIR, `${narration.id}.mp3`);

    console.log(`[${i + 1}/${NARRATIONS.length}] Generating: ${narration.id}`);

    try {
      // Using Indian English voice
      const cmd = `edge-tts --voice "en-IN-NeerjaNeural" --text "${narration.text.replace(/"/g, '\\"')}" --write-media "${outputFile}"`;
      execSync(cmd, { stdio: 'pipe' });
      audioFiles.push(outputFile);
      console.log(`  ✓ Generated: ${narration.id}.mp3`);
    } catch (error) {
      console.log(`  ✗ Failed: ${narration.id} - ${error.message}`);
    }
  }

  // Combine all audio files
  if (audioFiles.length > 0) {
    console.log('\nCombining audio segments...');

    const listFile = path.join(AUDIO_DIR, 'audio-list.txt');
    let listContent = '';

    // Add silence between segments to match video timing (4 seconds per slide)
    for (const file of audioFiles) {
      listContent += `file '${file.replace(/\\/g, '/')}'\n`;
    }

    fs.writeFileSync(listFile, listContent);

    const finalAudio = path.join(OUTPUT_DIR, 'narration.mp3');

    try {
      // First, create silence file (1 second)
      const silenceFile = path.join(AUDIO_DIR, 'silence.mp3');
      execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 1 -q:a 9 "${silenceFile}"`, { stdio: 'pipe' });

      // Create concat list with silence padding
      let concatList = '';
      for (let i = 0; i < audioFiles.length; i++) {
        concatList += `file '${audioFiles[i].replace(/\\/g, '/')}'\n`;
        // Add silence to pad to 4 seconds (audio + silence = 4s)
        concatList += `file '${silenceFile.replace(/\\/g, '/')}'\n`;
        concatList += `file '${silenceFile.replace(/\\/g, '/')}'\n`;
      }
      fs.writeFileSync(listFile, concatList);

      execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:a libmp3lame -q:a 2 "${finalAudio}"`, { stdio: 'pipe' });
      console.log(`✓ Combined audio saved: ${finalAudio}`);
    } catch (error) {
      console.log('Error combining audio:', error.message);
    }
  }

  // Merge with video
  const videoPath = path.join(OUTPUT_DIR, 'myleadx-demo.mp4');
  const audioPath = path.join(OUTPUT_DIR, 'narration.mp3');
  const finalVideo = path.join(OUTPUT_DIR, 'myleadx-demo-final.mp4');

  if (fs.existsSync(videoPath) && fs.existsSync(audioPath)) {
    console.log('\nMerging audio with video...');
    try {
      execSync(`ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${finalVideo}"`, { stdio: 'inherit' });
      console.log(`\n✓ Final video with audio: ${finalVideo}`);
    } catch (error) {
      console.log('Error merging:', error.message);
    }
  }

  console.log('\n========================================');
  console.log('AUDIO GENERATION COMPLETE!');
  console.log('========================================');
  console.log(`Audio segments: ${AUDIO_DIR}`);
  console.log(`Combined narration: ${path.join(OUTPUT_DIR, 'narration.mp3')}`);
  console.log(`Final video: ${finalVideo}`);
  console.log('========================================\n');
}

// Alternative: Generate using browser TTS (creates a script)
function generateBrowserTTSScript() {
  const htmlPath = path.join(OUTPUT_DIR, 'generate-audio.html');

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>MyLeadX Audio Generator</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a2e; color: white; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #00d4ff; }
    button { background: #00d4ff; border: none; padding: 12px 24px; color: #1a1a2e; font-size: 16px; cursor: pointer; border-radius: 8px; margin: 10px 5px; }
    button:hover { background: #00b8e6; }
    button:disabled { background: #555; cursor: not-allowed; }
    #status { margin: 20px 0; padding: 15px; background: #2a2a4e; border-radius: 8px; }
    #progress { margin: 10px 0; }
    .segment { padding: 10px; margin: 5px 0; background: #2a2a4e; border-radius: 4px; }
    .segment.done { border-left: 3px solid #00ff88; }
    .segment.current { border-left: 3px solid #00d4ff; background: #3a3a5e; }
  </style>
</head>
<body>
  <div class="container">
    <h1>MyLeadX Demo Audio Generator</h1>
    <p>This tool generates audio narration using your browser's text-to-speech.</p>

    <div>
      <button onclick="startGeneration()">Start Recording</button>
      <button onclick="stopGeneration()">Stop</button>
      <button onclick="downloadAll()">Download Audio</button>
    </div>

    <div id="status">Ready to generate audio narration.</div>
    <div id="progress"></div>
    <div id="segments"></div>
  </div>

  <script>
    const narrations = ${JSON.stringify(NARRATIONS, null, 2)};

    let currentIndex = 0;
    let isGenerating = false;
    let audioChunks = [];
    let mediaRecorder = null;

    function updateStatus(msg) {
      document.getElementById('status').textContent = msg;
    }

    function renderSegments() {
      const container = document.getElementById('segments');
      container.innerHTML = narrations.map((n, i) =>
        '<div class="segment ' + (i < currentIndex ? 'done' : i === currentIndex ? 'current' : '') + '">' +
        '<strong>' + n.id + '</strong>: ' + n.text +
        '</div>'
      ).join('');
    }

    async function startGeneration() {
      if (isGenerating) return;
      isGenerating = true;
      currentIndex = 0;

      updateStatus('Starting audio generation...');
      renderSegments();

      // Request microphone (needed for MediaRecorder with audio output)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop()); // We don't actually need mic
      } catch (e) {
        updateStatus('Microphone access needed for recording. Please allow and try again.');
        isGenerating = false;
        return;
      }

      speakNext();
    }

    function speakNext() {
      if (currentIndex >= narrations.length || !isGenerating) {
        updateStatus('Generation complete! Click Download Audio to save.');
        isGenerating = false;
        return;
      }

      const narration = narrations[currentIndex];
      updateStatus('Speaking: ' + narration.id);
      renderSegments();

      const utterance = new SpeechSynthesisUtterance(narration.text);
      utterance.voice = speechSynthesis.getVoices().find(v => v.lang.includes('en-IN')) || speechSynthesis.getVoices()[0];
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onend = () => {
        currentIndex++;
        setTimeout(speakNext, 500);
      };

      speechSynthesis.speak(utterance);
    }

    function stopGeneration() {
      isGenerating = false;
      speechSynthesis.cancel();
      updateStatus('Stopped.');
    }

    function downloadAll() {
      // Create text file with narration
      const text = narrations.map(n => n.id + ':\\n' + n.text + '\\n').join('\\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'narration-script.txt';
      a.click();

      updateStatus('Script downloaded! Use a TTS tool to generate audio from the script.');
    }

    renderSegments();
  </script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html);
  console.log(`Browser TTS tool created: ${htmlPath}`);
  console.log('Open this file in a browser to generate audio using Web Speech API.\n');
}

// Main
async function main() {
  console.log('========================================');
  console.log('MyLeadX Demo Audio Generator');
  console.log('========================================\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Create browser TTS tool as backup
  generateBrowserTTSScript();

  // Try Edge TTS (requires Python)
  try {
    await generateWithEdgeTTS();
  } catch (error) {
    console.log('Edge TTS failed. Trying alternative methods...');
    console.log('Error:', error.message);
    console.log('\nAlternative options:');
    console.log('1. Open generate-audio.html in browser');
    console.log('2. Use online TTS services (ElevenLabs, Google TTS)');
    console.log('3. Record manually using narration-script.txt');
  }
}

main();
