// lib/youtube/download-tool.ts
import { z } from 'zod';
import { createYouTubeTool, extractVideoId, formatNumber, formatDuration, formatDate, formatFilesize } from './base-tool';

// Simple in-memory cache for download data
const downloadCache = new Map<string, any>();
const DOWNLOAD_CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

// Types of information that can be retrieved
type DownloadMode = 'metadata_only' | 'audio_info' | 'formats';

/**
 * Parse input to extract video ID and mode
 * @param input Raw input string
 * @returns Video ID and mode
 */
function parseInput(input: string): { videoId: string, mode: DownloadMode } {
  const parts = input.split('|', 2);
  const videoInput = parts[0].trim();
  
  // Default mode is metadata only
  let mode: DownloadMode = 'metadata_only';
  
  // Parse additional parameters if provided
  if (parts.length > 1) {
    const param = parts[1].trim().toLowerCase();
    if (param === 'audio_info' || param === 'formats') {
      mode = param;
    }
  }
  
  // Extract video ID
  const videoId = extractVideoId(videoInput);
  
  return { videoId, mode };
}

/**
 * Get comprehensive video metadata
 * @param videoId YouTube video ID
 * @param mode Type of information to retrieve
 * @returns Video information based on mode
 */
async function getVideoInfo(videoId: string, mode: DownloadMode): Promise<any> {
  try {
    // Generate cache key
    const cacheKey = `${videoId}_${mode}`;
    
    // Check cache first
    const cachedResult = downloadCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp) < DOWNLOAD_CACHE_TTL) {
      return cachedResult.data;
    }
    
    // Build query for the API
    const endpoint = `/api/youtube/download?videoId=${videoId}&mode=${mode}`;
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`Failed to get video information: ${response.statusText}`);
    }
    
    let data = await response.json();
    
    // Process data based on mode
    if (mode === 'metadata_only') {
      data = processVideoMetadata(data);
    } else if (mode === 'audio_info') {
      data = processAudioStreams(data);
    } else if (mode === 'formats') {
      data = processFormats(data);
    }
    
    // Cache the result
    downloadCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error(`Error getting video info (${mode}):`, error);
    throw error;
  }
}

/**
 * Process comprehensive video metadata
 */
function processVideoMetadata(data: any): any {
  if (!data || data.error) {
    return {
      error: data?.error || "Failed to retrieve video metadata",
      videoId: data?.videoId
    };
  }
  
  // Format numbers for readability
  if (data.viewCount) {
    data.viewCountFormatted = formatNumber(data.viewCount);
  }
  
  if (data.likeCount) {
    data.likeCountFormatted = formatNumber(data.likeCount);
  }
  
  // Format duration
  if (data.duration) {
    data.durationFormatted = formatDuration(data.duration);
  }
  
  // Format upload date
  if (data.uploadDate) {
    data.uploadDateFormatted = formatDate(data.uploadDate);
  }
  
  return data;
}

/**
 * Process audio stream information
 */
function processAudioStreams(data: any): any {
  if (!data || data.error) {
    return {
      error: data?.error || "Failed to retrieve audio information",
      videoId: data?.videoId
    };
  }
  
  // Format audio streams info
  if (data.audioStreams) {
    for (const stream of data.audioStreams) {
      if (stream.filesize) {
        stream.filesizeFormatted = formatFilesize(stream.filesize);
      }
    }
  }
  
  return data;
}

/**
 * Process available video/audio format information
 */
function processFormats(data: any): any {
  if (!data || data.error) {
    return {
      error: data?.error || "Failed to retrieve format information",
      videoId: data?.videoId
    };
  }
  
  // Format info for each format category
  const formatCategories = ['combined', 'videoOnly', 'audioOnly'];
  
  if (data.formats) {
    for (const category of formatCategories) {
      if (data.formats[category]) {
        for (const format of data.formats[category]) {
          if (format.filesize) {
            format.filesizeFormatted = formatFilesize(format.filesize);
          }
        }
      }
    }
  }
  
  // Format best quality options
  if (data.bestQuality) {
    for (const [key, value] of Object.entries(data.bestQuality)) {
      if (value && typeof value === 'object' && 'filesize' in value) {
        (value as any).filesizeFormatted = formatFilesize((value as any).filesize);
      }
    }
  }
  
  return data;
}

/**
 * YouTube Download Tool for accessing detailed video information
 */
export const youtubeDownloadTool = createYouTubeTool({
  name: "youtube_download",
  description: `
    Get comprehensive details about a YouTube video.
    Input format: "video_url | mode" where mode can be:
    - "metadata_only" (default): Get complete video metadata
    - "audio_info": Get audio stream information
    - "formats": Get available video/audio format details
    This tool provides the most detailed information, including audio/video quality options.
  `,
  schema: z.string().describe("YouTube video URL or ID with optional mode parameter"),
  execute: async (input: string) => {
    try {
      // Parse input
      const { videoId, mode } = parseInput(input);
      
      // Get video information based on mode
      return await getVideoInfo(videoId, mode);
    } catch (error) {
      if (error instanceof Error) {
        return {
          error: error.message,
          videoId: input.length === 11 ? input : undefined,
          type: "download_error"
        };
      }
      
      return {
        error: "An unexpected error occurred while processing video information",
        type: "system_error"
      };
    }
  }
});