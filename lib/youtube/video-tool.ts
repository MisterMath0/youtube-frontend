// lib/youtube/video-tool.ts
import { z } from 'zod';
import { createYouTubeTool, extractVideoId, formatNumber, formatDuration, formatDate } from './base-tool';

// Simple in-memory cache for video data
const videoCache = new Map<string, any>();
const VIDEO_CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

/**
 * Fetches metadata for a YouTube video
 * @param videoId YouTube video ID
 * @returns Video metadata or error
 */
async function fetchVideoInfo(videoId: string): Promise<any> {
  try {
    // Check cache first
    const cachedResult = videoCache.get(videoId);
    if (cachedResult && (Date.now() - cachedResult.timestamp) < VIDEO_CACHE_TTL) {
      return cachedResult.data;
    }
    
    // Fallback to API call
    const endpoint = `/api/youtube/video?videoId=${videoId}`;
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video info: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Process video data
    const processed = processVideoInfo(data);
    
    // Cache the result
    videoCache.set(videoId, {
      data: processed,
      timestamp: Date.now()
    });
    
    return processed;
  } catch (error) {
    console.error("Error fetching video info:", error);
    throw error;
  }
}

/**
 * Process raw video data into a more usable format
 */
function processVideoInfo(videoInfo: any): any {
  if (!videoInfo || videoInfo.error) {
    return {
      error: videoInfo.error || "Failed to retrieve video information",
      videoId: videoInfo.videoId
    };
  }
  
  // Clean description
  if (videoInfo.description) {
    videoInfo.description = cleanDescription(videoInfo.description);
  }
  
  // Clean title
  if (videoInfo.title) {
    videoInfo.title = cleanTitle(videoInfo.title);
  }
  
  // Format metrics for readability
  if (videoInfo.views) {
    videoInfo.viewsFormatted = formatNumber(videoInfo.views);
  }
  
  if (videoInfo.likes) {
    videoInfo.likesFormatted = formatNumber(videoInfo.likes);
  }
  
  // Format duration
  if (videoInfo.duration) {
    videoInfo.durationFormatted = formatDuration(videoInfo.duration);
  }
  
  // Format date
  if (videoInfo.uploadDate) {
    videoInfo.uploadDateFormatted = formatDate(videoInfo.uploadDate);
  }
  
  return videoInfo;
}

/**
 * Clean and normalize video description
 */
function cleanDescription(description: string): string {
  if (!description) {
    return "";
  }
  
  // Remove excessive whitespace
  description = description.replace(/\s+/g, ' ');
  
  // Remove common spam patterns and excessive hashtags
  description = description.replace(/(#\w+\s*){5,}/, '[Multiple hashtags]');
  
  // Remove excessive newlines
  description = description.replace(/\n+/g, '\n');
  
  return description.trim();
}

/**
 * Clean and normalize video title
 */
function cleanTitle(title: string): string {
  if (!title) {
    return "";
  }
  
  // Remove excessive whitespace
  title = title.replace(/\s+/g, ' ');
  
  // Remove common clickbait markers
  title = title.replace(/\((?:NOT CLICKBAIT|MUST WATCH|SHOCKING|GONE WRONG)\)/i, '');
  
  return title.trim();
}

/**
 * YouTube Video Tool for retrieving video metadata
 */
export const youtubeVideoTool = createYouTubeTool({
  name: "youtube_video_info",
  description: `
    Get detailed information about a YouTube video.
    Input should be a YouTube video ID or URL.
    Returns metadata such as title, description, channel, view count, likes, upload date, and more.
  `,
  schema: z.string().describe("YouTube video URL or ID"),
  execute: async (input: string) => {
    try {
      // Extract video ID
      const videoId = extractVideoId(input.trim());
      
      // Fetch video info
      return await fetchVideoInfo(videoId);
    } catch (error) {
      if (error instanceof Error) {
        return {
          error: error.message,
          videoId: input.length === 11 ? input : undefined,
          type: "video_info_error"
        };
      }
      
      return {
        error: "An unexpected error occurred while fetching video information",
        type: "system_error"
      };
    }
  }
});