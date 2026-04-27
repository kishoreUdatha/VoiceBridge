import asyncio
import edge_tts
import os
import subprocess
import json

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'videos')
AUDIO_DIR = os.path.join(OUTPUT_DIR, 'audio-segments')
SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'video-screenshots')

# FFmpeg path
FFMPEG = r'C:\Users\Lekhana\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin\ffmpeg.exe'

# Voice settings
VOICE = "en-IN-NeerjaNeural"  # Indian English female voice
RATE = "-5%"  # Slightly slower for clarity

# Narrations
NARRATIONS = [
    ("00-login", "Welcome to MyLeadX, your AI-powered CRM solution. Let's take a tour of the platform."),
    ("01-dashboard", "This is the dashboard. It gives you a complete overview of your sales performance, leads, and team activity at a glance."),
    ("02-leads", "Here you can manage all your leads in one place. Filter, search, and take bulk actions with our powerful lead management system."),
    ("03-pipeline", "Visualize your sales pipeline with our Kanban-style board. Drag and drop leads through different stages of your sales process."),
    ("04-analytics", "Get deep insights with our analytics dashboard. Track conversion rates, revenue trends, and team performance metrics."),
    ("05-users", "Manage user accounts and team members. Add new users, assign roles, and control access permissions."),
    ("06-roles", "Define custom roles with specific permissions. Control who can access different features and data."),
    ("07-voice-ai", "Meet our AI Voice Agents. They can make calls in 10 plus Indian languages, qualify leads, and book meetings automatically."),
    ("08-outbound-calls", "Launch outbound calling campaigns with AI or human agents. Track every call in real-time with detailed analytics."),
    ("09-telecaller-app", "Your telecallers get a dedicated app with click-to-call, scripts, and instant lead updates."),
    ("10-call-history", "Access complete call history with recordings, AI transcripts, and automatically generated call summaries."),
    ("11-campaigns", "Create and manage marketing campaigns across multiple channels from one unified dashboard."),
    ("12-reports", "Generate detailed reports on every aspect of your sales operations. Export to various formats for analysis."),
    ("13-settings", "Customize MyLeadX to fit your business needs with comprehensive settings for all features."),
    ("14-subscription", "Manage your subscription and billing. Upgrade, add users, or change plans anytime."),
    ("15-api-keys", "Integrate MyLeadX with your existing tools using our powerful REST API and webhooks."),
]

async def generate_audio_segment(id, text, index, total):
    """Generate a single audio segment"""
    output_file = os.path.join(AUDIO_DIR, f"{id}.mp3")

    print(f"[{index + 1}/{total}] Generating: {id}")

    try:
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
        await communicate.save(output_file)
        print(f"  [OK] Generated: {id}.mp3")
        return output_file
    except Exception as e:
        print(f"  [FAIL] Failed: {str(e)}")
        return None

async def generate_all_audio():
    """Generate all audio segments"""
    print("Generating audio narration using Microsoft Edge TTS...\n")

    # Create output directory
    os.makedirs(AUDIO_DIR, exist_ok=True)

    audio_files = []
    for i, (id, text) in enumerate(NARRATIONS):
        result = await generate_audio_segment(id, text, i, len(NARRATIONS))
        if result:
            audio_files.append(result)

    return audio_files

def pad_audio_to_duration(input_file, output_file, target_duration=4.0):
    """Pad audio file with silence to reach target duration"""
    # Get current duration
    cmd = f'"{FFMPEG}" -i "{input_file}" -f null -'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

    # Create padded version
    cmd = f'"{FFMPEG}" -y -i "{input_file}" -af "apad=whole_dur={target_duration}" -c:a libmp3lame -q:a 2 "{output_file}"'
    subprocess.run(cmd, shell=True, capture_output=True)

def combine_audio_files(audio_files, output_file):
    """Combine all audio files into one"""
    print("\nCombining audio segments...")

    padded_dir = os.path.join(AUDIO_DIR, 'padded')
    os.makedirs(padded_dir, exist_ok=True)

    # Pad each audio file to 4 seconds
    padded_files = []
    for audio_file in audio_files:
        base_name = os.path.basename(audio_file)
        padded_file = os.path.join(padded_dir, base_name)
        pad_audio_to_duration(audio_file, padded_file, 4.0)
        padded_files.append(padded_file)

    # Create concat list
    list_file = os.path.join(AUDIO_DIR, 'concat_list.txt')
    with open(list_file, 'w') as f:
        for pf in padded_files:
            f.write(f"file '{pf.replace(chr(92), '/')}'\n")

    # Combine
    cmd = f'"{FFMPEG}" -y -f concat -safe 0 -i "{list_file}" -c:a libmp3lame -q:a 2 "{output_file}"'
    subprocess.run(cmd, shell=True)

    print(f"[OK] Combined audio saved: {output_file}")
    return output_file

def merge_video_audio(video_file, audio_file, output_file):
    """Merge video and audio"""
    print("\nMerging video and audio...")

    cmd = f'"{FFMPEG}" -y -i "{video_file}" -i "{audio_file}" -c:v copy -c:a aac -shortest "{output_file}"'
    subprocess.run(cmd, shell=True)

    print(f"[OK] Final video created: {output_file}")

async def main():
    print("=" * 50)
    print("MyLeadX Demo Video - Audio Generator")
    print("=" * 50 + "\n")

    # Generate all audio segments
    audio_files = await generate_all_audio()

    if not audio_files:
        print("No audio files generated!")
        return

    # Combine all audio
    combined_audio = os.path.join(OUTPUT_DIR, 'narration.mp3')
    combine_audio_files(audio_files, combined_audio)

    # Merge with video
    video_file = os.path.join(OUTPUT_DIR, 'myleadx-demo.mp4')
    final_video = os.path.join(OUTPUT_DIR, 'myleadx-demo-final.mp4')

    if os.path.exists(video_file):
        merge_video_audio(video_file, combined_audio, final_video)

    print("\n" + "=" * 50)
    print("AUDIO GENERATION COMPLETE!")
    print("=" * 50)
    print(f"Audio segments: {AUDIO_DIR}")
    print(f"Combined narration: {combined_audio}")
    print(f"Final video with audio: {final_video}")
    print("=" * 50 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
