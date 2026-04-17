const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const audioFile = process.argv[2] || path.join(__dirname, '../uploads/recordings/telecall-1776177576053-242752936.m4a');

console.log('Analyzing audio file:', audioFile);
console.log('');

ffmpeg.ffprobe(audioFile, (err, metadata) => {
  if (err) {
    console.error('Error:', err.message);
    return;
  }

  const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

  console.log('=== AUDIO FILE INFO ===');
  console.log('Duration:', metadata.format.duration, 'seconds');
  console.log('File size:', metadata.format.size, 'bytes');
  console.log('Bit rate:', metadata.format.bit_rate, 'bps');
  console.log('');

  if (audioStream) {
    console.log('=== AUDIO STREAM ===');
    console.log('Codec:', audioStream.codec_name);
    console.log('Channels:', audioStream.channels);
    console.log('Channel layout:', audioStream.channel_layout || 'N/A');
    console.log('Sample rate:', audioStream.sample_rate, 'Hz');
    console.log('Bits per sample:', audioStream.bits_per_sample || 'N/A');
  }

  console.log('');
  console.log('=== ANALYSIS ===');
  if (audioStream && audioStream.channels === 1) {
    console.log('⚠️  MONO recording - both speakers mixed into single channel');
    console.log('   Speaker diarization needed to separate voices');
  } else if (audioStream && audioStream.channels === 2) {
    console.log('✅ STEREO recording - may have speakers on separate channels');
    console.log('   Can potentially split channels for each speaker');
  }
});
