---
name: yt-audio
description: >
  Generate yt-dlp commands to download YouTube videos as MP3 audio files. Use this skill whenever the user wants to download audio from YouTube, convert YouTube videos to MP3, or batch download multiple YouTube links as audio. Trigger on any mention of YouTube audio download, "yt-dlp", "YouTube to MP3", or when the user pastes YouTube URLs and wants audio files. Also trigger when the user pastes multiple YouTube links separated by slashes, commas, spaces, or newlines — even without explicitly saying "download" — because the intent is almost always to download them.
---

# YouTube Audio Downloader

This skill helps users download YouTube videos as MP3 audio files by generating ready-to-run `yt-dlp` terminal commands.

## Why this skill exists

Downloading audio from YouTube is a common task, but the commands can be fiddly — URLs need cleaning (removing playlist parameters, timestamps, tracking params), multiple URLs need proper quoting, and the right flags need to be combined. This skill handles all of that so the user can just paste links and get a command to copy-paste into their terminal.

## Prerequisites

The user needs these installed on their machine:

- `yt-dlp` — install via `brew install yt-dlp` or `pip install yt-dlp`
- `ffmpeg` — install via `brew install ffmpeg` (needed for MP3 conversion)

If the user hasn't installed these yet, provide the install commands first.

## How to generate the download command

### 1. Extract and clean URLs

When the user provides YouTube URLs, they often come with extra parameters. Clean each URL down to just the video ID:

- Keep only the `v=VIDEO_ID` parameter
- Remove: `list=`, `index=`, `t=`, `pp=`, `si=`, `feature=` and any other tracking/playlist params
- Final format: `https://www.youtube.com/watch?v=VIDEO_ID`

For example:
- Input: `https://www.youtube.com/watch?v=abc123&list=PLxyz&index=3&t=120s&pp=iAQB`
- Clean: `https://www.youtube.com/watch?v=abc123`

URLs may be separated by `/`, commas, spaces, newlines, or just listed one per line. Handle all these formats.

### 2. Generate the command

**Single URL:**
```bash
yt-dlp -x --audio-format mp3 "https://www.youtube.com/watch?v=VIDEO_ID"
```

**Multiple URLs:**
```bash
yt-dlp -x --audio-format mp3 "https://www.youtube.com/watch?v=ID1" "https://www.youtube.com/watch?v=ID2" "https://www.youtube.com/watch?v=ID3"
```

### 3. Flags reference

- `-x` — extract audio only (no video)
- `--audio-format mp3` — convert to MP3
- `--audio-quality 0` — best quality (optional, mention if user asks for high quality)

### Response style

Keep responses concise. The user just wants the command — don't over-explain. A typical response:

> 终端运行：
> ```bash
> yt-dlp -x --audio-format mp3 "url1" "url2"
> ```

If it's the user's first time, briefly mention the install prerequisites. After that, just give the command.

## Important notes

- The Cowork environment cannot directly access YouTube (proxy restrictions), so always provide commands for the user to run in their own terminal
- Files download to whatever directory the user's terminal is currently in
- If the user wants to specify a download location, add `-o "~/Downloads/%(title)s.%(ext)s"` to the command
