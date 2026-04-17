const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const audioFile = process.argv[2] || path.join(__dirname, '../uploads/recordings/telecall-1776177576053-242752936.m4a');

console.log('Analyzing audio file:', audioFile);
console.log('');

// Check if file exists
if (!fs.existsSync(audioFile)) {
  console.error('File not found:', audioFile);
  process.exit(1);
}

// Get detailed audio analysis using ffmpeg
ffmpeg.ffprobe(audioFile, (err, metadata) => {
  if (err) {
    console.error('Error:', err.message);
    return;
  }

  const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
  const duration = metadata.format.duration;

  console.log('=== AUDIO FILE INFO ===');
  console.log('Duration:', duration, 'seconds');
  console.log('Channels:', audioStream?.channels);
  console.log('Sample rate:', audioStream?.sample_rate, 'Hz');
  console.log('');

  // Now analyze volume levels using volumedetect filter
  console.log('=== ANALYZING VOLUME LEVELS ===');
  console.log('(This checks if audio has good levels for transcription)');
  console.log('');

  ffmpeg(audioFile)
    .audioFilters('volumedetect')
    .format('null')
    .output('-')
    .on('start', () => {
      console.log('Running volume analysis...');
    })
    .on('stderr', (line) => {
      // Parse volumedetect output
      if (line.includes('mean_volume') || line.includes('max_volume') || line.includes('n_samples')) {
        console.log(line.trim());
      }
    })
    .on('end', () => {
      console.log('');
      console.log('=== ANALYSIS COMPLETE ===');
      console.log('');
      console.log('If mean_volume is below -40 dB, the audio may be too quiet.');
      console.log('If there is a big difference between max and mean, voices may be at different levels.');
      console.log('');
      console.log('To test transcription, you can play the file and listen for both voices.');
    })
    .on('error', (err) => {
      console.error('Volume analysis error:', err.message);
    })
    .run();
});
