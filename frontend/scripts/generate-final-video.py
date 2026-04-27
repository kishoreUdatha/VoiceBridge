import asyncio
import edge_tts
import os
import subprocess
import json

BASE_DIR = os.path.dirname(__file__)
SCREENSHOTS_DIR = os.path.join(BASE_DIR, '..', 'public', 'video-screenshots')
OUTPUT_DIR = os.path.join(BASE_DIR, '..', 'public', 'videos')
AUDIO_DIR = os.path.join(OUTPUT_DIR, 'audio-segments')
TEMP_DIR = os.path.join(BASE_DIR, '..', 'temp-video')

FFMPEG = r'C:\Users\Lekhana\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin\ffmpeg.exe'

VOICE = "en-IN-NeerjaNeural"
RATE = "-5%"
FRAME_DURATION = 4  # seconds per slide

# Narrations for all 30 captured pages
NARRATIONS = [
    ("00-login", "Welcome to MyLeadX, your AI-powered CRM solution. Let's explore all the powerful features."),
    ("01-dashboard", "This is your dashboard. Get a complete overview of sales performance, leads, calls, and team activity at a glance."),
    ("02-leads-list", "The leads management page. Filter, search, and take bulk actions on all your leads from one central location."),
    ("03-create-lead", "Easily create new leads with custom fields. Capture all the information you need for effective follow-up."),
    ("04-pipeline-kanban", "Visualize your sales pipeline with our Kanban board. Drag and drop leads through different stages."),
    ("05-voice-agents", "Meet our Voice AI Agents. These intelligent agents can call leads automatically in multiple languages."),
    ("06-new-agent-type", "Choose your agent type. Create AI voice bots, conversational agents, or IVR systems."),
    ("07-agent-builder", "The Voice Agent Builder. Design your agent's conversation flow, voice, and language settings."),
    ("08-conversational-ai", "Our Conversational AI wizard. Create natural-sounding AI agents that can qualify leads and book meetings."),
    ("09-outbound-calls", "The outbound calls dashboard. Launch and monitor AI calling campaigns in real-time."),
    ("10-make-call", "Make single calls directly from the platform. Enter a number and let AI handle the conversation."),
    ("11-create-campaign", "Create calling campaigns. Upload lead lists, set schedules, and let AI agents make thousands of calls."),
    ("12-telecaller-app", "The Telecaller dashboard. Your human agents get scripts, click-to-call, and instant lead updates."),
    ("13-telecaller-queue", "The call queue. Telecallers see their assigned leads and can start calling with one click."),
    ("14-call-history", "Complete call history. Every call is recorded, transcribed, and analyzed automatically."),
    ("15-call-monitoring", "Live call monitoring. Listen to ongoing calls and provide real-time coaching to your team."),
    ("16-analytics", "The analytics dashboard. Track conversion rates, revenue, call metrics, and team performance."),
    ("17-advanced-analytics", "Advanced analytics with AI insights. Identify patterns, predict outcomes, and optimize your process."),
    ("18-conversion-funnel", "Your conversion funnel. See exactly where leads drop off and identify optimization opportunities."),
    ("19-agent-performance", "AI agent performance metrics. See how each voice agent is performing across campaigns."),
    ("20-telecaller-analytics", "Telecaller performance analytics. Track calls made, conversions, and average call duration."),
    ("21-reports", "The reports section. Generate detailed reports on every aspect of your sales operations."),
    ("22-user-performance", "User performance reports. See individual team member metrics and identify top performers."),
    ("23-ai-usage", "AI usage reports. Track your voice minutes, AI calls, and usage across features."),
    ("24-ai-scoring", "AI Lead Scoring. Our AI analyzes leads and assigns priority scores based on conversion likelihood."),
    ("25-customer-journey", "The customer journey view. See every interaction a lead has had with your business."),
    ("26-predictive", "Predictive analytics. AI forecasts revenue, identifies at-risk deals, and recommends actions."),
    ("27-campaigns", "Campaign management. Create and track marketing campaigns across multiple channels."),
    ("28-workflows", "The workflow builder. Automate repetitive tasks with visual drag-and-drop workflows."),
    ("29-settings", "Settings and configuration. Customize MyLeadX to match your business processes perfectly."),
]

async def generate_audio_segment(id, text, index, total):
    output_file = os.path.join(AUDIO_DIR, f"{id}.mp3")
    print(f"[{index + 1}/{total}] Generating: {id}")

    try:
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
        await communicate.save(output_file)
        print(f"  [OK] Generated")
        return output_file
    except Exception as e:
        print(f"  [FAIL] {str(e)[:50]}")
        return None

async def generate_all_audio():
    print("\n" + "=" * 50)
    print("GENERATING AUDIO NARRATION")
    print("=" * 50 + "\n")

    os.makedirs(AUDIO_DIR, exist_ok=True)

    audio_files = []
    for i, (id, text) in enumerate(NARRATIONS):
        result = await generate_audio_segment(id, text, i, len(NARRATIONS))
        if result:
            audio_files.append((id, result))

    return audio_files

def create_video():
    print("\n" + "=" * 50)
    print("CREATING VIDEO FROM SCREENSHOTS")
    print("=" * 50 + "\n")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(TEMP_DIR, exist_ok=True)

    # Read metadata
    metadata_path = os.path.join(SCREENSHOTS_DIR, 'metadata.json')
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)

    pages = metadata['pages']
    print(f"Found {len(pages)} screenshots\n")

    # Create file list for ffmpeg
    file_list_path = os.path.join(TEMP_DIR, 'files.txt')
    with open(file_list_path, 'w') as f:
        for page in pages:
            screenshot = os.path.join(SCREENSHOTS_DIR, f"{page['name']}.png")
            if os.path.exists(screenshot):
                f.write(f"file '{screenshot.replace(chr(92), '/')}'\n")
                f.write(f"duration {FRAME_DURATION}\n")

        # Add last image again
        last_screenshot = os.path.join(SCREENSHOTS_DIR, f"{pages[-1]['name']}.png")
        f.write(f"file '{last_screenshot.replace(chr(92), '/')}'\n")

    # Create video
    output_video = os.path.join(OUTPUT_DIR, 'myleadx-demo.mp4')
    print("Creating video from screenshots...")

    cmd = f'"{FFMPEG}" -y -f concat -safe 0 -i "{file_list_path}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -c:v libx264 -preset medium -crf 23 -r 30 "{output_video}"'
    subprocess.run(cmd, shell=True, capture_output=True)

    print(f"[OK] Video created: {output_video}")
    return output_video

def combine_audio_files(audio_files):
    print("\n" + "=" * 50)
    print("COMBINING AUDIO WITH PADDING")
    print("=" * 50 + "\n")

    padded_dir = os.path.join(AUDIO_DIR, 'padded')
    os.makedirs(padded_dir, exist_ok=True)

    # Create silence file
    silence_file = os.path.join(AUDIO_DIR, 'silence_1s.mp3')
    cmd = f'"{FFMPEG}" -y -f lavfi -i anullsrc=r=24000:cl=mono -t 1 -c:a libmp3lame -q:a 9 "{silence_file}"'
    subprocess.run(cmd, shell=True, capture_output=True)

    # Pad each audio to FRAME_DURATION seconds
    padded_files = []
    for id, audio_file in audio_files:
        padded_file = os.path.join(padded_dir, f"{id}.mp3")
        cmd = f'"{FFMPEG}" -y -i "{audio_file}" -af "apad=whole_dur={FRAME_DURATION}" -c:a libmp3lame -q:a 2 "{padded_file}"'
        subprocess.run(cmd, shell=True, capture_output=True)
        padded_files.append(padded_file)
        print(f"  Padded: {id}")

    # Combine all padded files
    concat_list = os.path.join(AUDIO_DIR, 'concat_list.txt')
    with open(concat_list, 'w') as f:
        for pf in padded_files:
            f.write(f"file '{pf.replace(chr(92), '/')}'\n")

    combined_audio = os.path.join(OUTPUT_DIR, 'narration.mp3')
    cmd = f'"{FFMPEG}" -y -f concat -safe 0 -i "{concat_list}" -c:a libmp3lame -q:a 2 "{combined_audio}"'
    subprocess.run(cmd, shell=True, capture_output=True)

    print(f"\n[OK] Combined audio: {combined_audio}")
    return combined_audio

def merge_video_audio(video_file, audio_file):
    print("\n" + "=" * 50)
    print("MERGING VIDEO AND AUDIO")
    print("=" * 50 + "\n")

    final_video = os.path.join(OUTPUT_DIR, 'myleadx-demo-final.mp4')
    cmd = f'"{FFMPEG}" -y -i "{video_file}" -i "{audio_file}" -c:v copy -c:a aac -shortest "{final_video}"'
    subprocess.run(cmd, shell=True)

    print(f"[OK] Final video: {final_video}")
    return final_video

def create_subtitles():
    print("\nCreating subtitles...")
    srt_path = os.path.join(OUTPUT_DIR, 'subtitles.srt')

    with open(srt_path, 'w') as f:
        time_offset = 0
        for i, (id, text) in enumerate(NARRATIONS):
            start = format_time(time_offset)
            end = format_time(time_offset + FRAME_DURATION - 0.5)
            f.write(f"{i + 1}\n{start} --> {end}\n{text}\n\n")
            time_offset += FRAME_DURATION

    print(f"[OK] Subtitles: {srt_path}")

def format_time(seconds):
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"

async def main():
    print("=" * 60)
    print("MYLEADX DEMO VIDEO GENERATOR")
    print("=" * 60)

    # Step 1: Generate audio
    audio_files = await generate_all_audio()

    if not audio_files:
        print("No audio generated!")
        return

    # Step 2: Create video from screenshots
    video_file = create_video()

    # Step 3: Combine audio with padding
    combined_audio = combine_audio_files(audio_files)

    # Step 4: Merge video and audio
    final_video = merge_video_audio(video_file, combined_audio)

    # Step 5: Create subtitles
    create_subtitles()

    # Summary
    print("\n" + "=" * 60)
    print("VIDEO CREATION COMPLETE!")
    print("=" * 60)
    print(f"Screenshots: {len(NARRATIONS)}")
    print(f"Duration: ~{len(NARRATIONS) * FRAME_DURATION} seconds")
    print(f"Final Video: {final_video}")
    print(f"Audio: {combined_audio}")
    print(f"Subtitles: {os.path.join(OUTPUT_DIR, 'subtitles.srt')}")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
