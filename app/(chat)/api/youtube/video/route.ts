// app/(chat)/api/youtube/video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { extractVideoId } from '@/lib/youtube/base-tool';
import { google } from 'googleapis';
import { auth } from '@/app/(auth)/auth';

// Initialize YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

/**
 * API endpoint for fetching YouTube video metadata
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const videoInput = searchParams.get('videoId');
    
    if (!videoInput) {
      return NextResponse.json(
        { error: 'Missing videoId parameter' },
        { status: 400 }
      );
    }
    
    // Extract video ID
    const videoId = extractVideoId(videoInput);
    
    // Get video details
    const videoData = await getVideoMetadata(videoId);
    
    if ('error' in videoData) {
      return NextResponse.json(
        { error: videoData.error, videoId },
        { status: 404 }
      );
    }
    
    return NextResponse.json(videoData);
  } catch (error) {
    console.error('Error fetching video info:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message, type: 'video_info_error' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred', type: 'system_error' },
      { status: 500 }
    );
  }
}

/**
 * Get detailed metadata for a YouTube video
 */
async function getVideoMetadata(videoId: string) {
  try {
    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: [videoId]
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      return { error: 'Video not found', videoId };
    }
    
    const videoDetails = response.data.items[0];
    const snippet = videoDetails.snippet;
    const statistics = videoDetails.statistics;
    const contentDetails = videoDetails.contentDetails;
    
    // Parse duration in ISO 8601 format to seconds
    const duration = parseDuration(contentDetails?.duration || 'PT0S');
    
    // Format upload date from ISO to YYYYMMDD
    const uploadDate = formatUploadDate(snippet?.publishedAt || '');
    
    return {
      videoId,
      title: snippet?.title,
      description: snippet?.description,
      channelId: snippet?.channelId,
      channelTitle: snippet?.channelTitle,
      views: parseInt(statistics?.viewCount || '0'),
      likes: parseInt(statistics?.likeCount || '0'),
      duration,
      uploadDate,
      thumbnail: snippet?.thumbnails?.high?.url || snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url,
      tags: snippet?.tags || [],
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  } catch (error) {
    console.error('Error in YouTube API call:', error);
    
    if (error instanceof Error) {
      return { error: error.message, videoId };
    }
    
    return { error: 'Failed to retrieve video details', videoId };
  }
}

/**
 * Parse ISO 8601 duration to seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const [, hours, minutes, seconds] = match;
  return (parseInt(hours || '0') * 3600) + 
         (parseInt(minutes || '0') * 60) + 
         parseInt(seconds || '0');
}

/**
 * Format ISO date to YYYYMMDD
 */
function formatUploadDate(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}