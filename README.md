# YouTube Tools Integration

This chatbot template includes YouTube tools integration, allowing users to interact with YouTube content directly in the chat. The integration includes several tools for accessing YouTube data:

1. **YouTube Transcript Tool**: Fetches and displays video transcripts
2. **YouTube Video Info Tool**: Retrieves detailed metadata about videos
3. **YouTube Search Tool**: Searches for videos with various filtering options
4. **YouTube Download Info Tool**: Provides information about available video formats

## Setup Instructions

To use the YouTube tools, you need to set up a YouTube API key:

### 1. Create a YouTube API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Library"
4. Search for and enable the "YouTube Data API v3"
5. Go to "APIs & Services" > "Credentials"
6. Click "Create Credentials" > "API Key"
7. Copy the generated API key

### 2. Configure Environment Variables

Add the YouTube API key to your `.env.local` file:

```
YOUTUBE_API_KEY=your_api_key_here
```

### 3. Install Required Dependencies

Make sure the following dependencies are installed:

```bash
npm install googleapis youtube-transcript-api yt-dlp-exec ytsr
# or
pnpm add googleapis youtube-transcript-api yt-dlp-exec ytsr
# or
yarn add googleapis youtube-transcript-api yt-dlp-exec ytsr
```

## Usage Examples

Once set up, you can use the YouTube tools directly in the chat with the following syntax:

### Getting a Video Transcript

```
Can you get the transcript for this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### Getting Video Information

```
Tell me about this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### Searching for Videos

```
Search for YouTube videos about machine learning tutorials
```

You can also use advanced search parameters:

```
Find YouTube videos about python programming | count=10, sort=views, recent=true
```

### Getting Download Information

```
What are the available formats for this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## Limitations

- The YouTube Data API has daily quota limits. Be mindful of your usage.
- Video playback is not supported directly in the chat; links will open in a new browser tab.
- Some features require the `yt-dlp` utility to be properly installed on the server.