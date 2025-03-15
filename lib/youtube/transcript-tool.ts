// lib/youtube/transcript-tool.ts
import { z } from 'zod';
import { createYouTubeTool, extractVideoId, formatNumber } from './base-tool';

// Simple in-memory cache for transcript data
const transcriptCache = new Map<string, any>();
const TRANSCRIPT_CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

/**
 * Fetches a transcript for a YouTube video
 * @param videoId YouTube video ID
 * @param language Optional language code
 * @returns Transcript data or error
 */
async function fetchTranscript(videoId: string, language?: string): Promise<any> {
  try {
    // Create cache key
    const cacheKey = `${videoId}${language ? `_${language}` : ''}`;
    
    // Check cache first
    const cachedResult = transcriptCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp) < TRANSCRIPT_CACHE_TTL) {
      return cachedResult.data;
    }
    
    // Fallback to API call
    // We're using the official YouTube API v3 through a proxy endpoint
    // The exact implementation depends on your backend API
    const endpoint = language 
      ? `/api/youtube/transcript?videoId=${videoId}&language=${language}`
      : `/api/youtube/transcript?videoId=${videoId}`;
      
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transcript: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Process transcript data
    const processed = processTranscript(data, videoId, language);
    
    // Cache the result
    transcriptCache.set(cacheKey, {
      data: processed,
      timestamp: Date.now()
    });
    
    return processed;
  } catch (error) {
    console.error("Error fetching transcript:", error);
    throw error;
  }
}

/**
 * Process raw transcript data into a more usable format
 */
function processTranscript(transcriptData: TranscriptSegment[], videoId: string, language?: string): any {
  if (!transcriptData || transcriptData.length === 0) {
    return {
      error: "No transcript available for this video",
      videoId
    };
  }
  
  // Process transcript into full text
  let fullText = transcriptData.map(segment => segment.text).join(" ");
  
  // Clean up text
  fullText = fullText.replace(/\s+/g, ' '); // Remove multiple spaces
  fullText = fullText.replace(/\[.*?\]/g, ''); // Remove [Music], [Applause], etc.
  fullText = fullText.replace(/\s([.,;!?])/g, '$1'); // Normalize punctuation spacing
  
  // Create a truncated version for preview
  const summary = fullText.split(" ").slice(0, 100).join(" ") + (fullText.split(" ").length > 100 ? "..." : "");
  
  // Format with timestamps
  const formattedTranscript = formatTranscriptWithTimestamps(transcriptData);
  
  return {
    videoId,
    transcript: fullText,
    formattedTranscript,
    language: language || "auto",
    length: fullText.length,
    wordCount: fullText.split(" ").length,
    summary
  };
}

/**
 * Format transcript with timestamps for display
 */
function formatTranscriptWithTimestamps(segments: TranscriptSegment[]): string {
  const lines: string[] = [];
  let currentMinute = -1;
  
  for (const segment of segments) {
    const seconds = Math.floor(segment.start);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > currentMinute) {
      currentMinute = minutes;
      lines.push(`\n[${minutes}:${remainingSeconds.toString().padStart(2, '0')}]`);
    }
    
    lines.push(segment.text);
  }
  
  // Join with spaces, clean up formatting issues
  let result = lines.join(" ");
  result = result.replace(/\s+/g, ' '); // Remove multiple spaces
  result = result.replace(/\[(\d+:\d+)\]\s+/g, '\n[$1] '); // Fix timestamp formatting
  result = result.replace(/\s([.,;:!?])/g, '$1'); // Fix punctuation spacing
  
  return result.trim();
}

/**
 * YouTube Transcript Tool for retrieving video transcripts
 */
export const youtubeTranscriptTool = createYouTubeTool({
  name: "youtube_transcript",
  description: `
    Retrieve the transcript (spoken content) of a YouTube video.
    Input should be a YouTube video ID or URL.
    For non-English videos, specify a language code: "video_url|language_code"
  `,
  schema: z.string().describe("YouTube video URL or ID, optionally with a language code"),
  execute: async (input: string) => {
    try {
      // Parse language if specified
      const parts = input.split('|', 2);
      const videoInput = parts[0].trim();
      const language = parts.length > 1 ? parts[1].trim() : undefined;
      
      // Extract video ID
      const videoId = extractVideoId(videoInput);
      
      // Fetch transcript
      return await fetchTranscript(videoId, language);
    } catch (error) {
      if (error instanceof Error) {
        return {
          error: error.message,
          type: "transcript_error",
          details: "This video likely does not have available transcripts or subtitles."
        };
      }
      
      return {
        error: "An unexpected error occurred while fetching the transcript",
        type: "system_error"
      };
    }
  }
});