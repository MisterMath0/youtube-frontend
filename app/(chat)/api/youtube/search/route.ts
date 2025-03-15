// app/(chat)/api/youtube/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import ytsr from 'ytsr';
import { auth } from '@/app/(auth)/auth';

// Initialize YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

/**
 * API endpoint for searching YouTube videos
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const count = parseInt(searchParams.get('count') || '5');
    const sort = searchParams.get('sort') || 'relevance';
    const recent = searchParams.get('recent') === 'true';
    const minViews = parseInt(searchParams.get('minViews') || '0');
    const duration = searchParams.get('duration') || null;
    const type = searchParams.get('type') || 'search';
    
    if (!query && type === 'search') {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      );
    }
    
    // Get search results
    let searchResults;
    if (type === 'channel') {
      const channelId = searchParams.get('channelId');
      if (!channelId) {
        return NextResponse.json(
          { error: 'Missing channelId parameter for channel search' },
          { status: 400 }
        );
      }
      searchResults = await searchChannelVideos(channelId, count, sort);
    } else if (type === 'playlist') {
      const playlistId = searchParams.get('playlistId');
      if (!playlistId) {
        return NextResponse.json(
          { error: 'Missing playlistId parameter for playlist search' },
          { status: 400 }
        );
      }
      searchResults = await getPlaylistVideos(playlistId, count);
    } else {
      // Regular search
      searchResults = await searchVideos(query as string, {
        count,
        sort: sort as any,
        recent,
        minViews,
        duration: duration as any
      });
    }
    
    if ('error' in searchResults) {
      return NextResponse.json(
        { error: searchResults.error, query },
        { status: 404 }
      );
    }
    
    return NextResponse.json(searchResults);
  } catch (error) {
    console.error('Error in search:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message, type: 'search_error' },
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
 * Search for YouTube videos using ytsr (more flexible than YouTube API)
 */
async function searchVideos(query: string, options: {
  count: number;
  sort: 'relevance' | 'date' | 'views' | 'rating';
  recent: boolean;
  minViews: number;
  duration: 'short' | 'medium' | 'long' | null;
}) {
  try {
    // Create filter options
    const filters: any = {};
    
    // Apply filters
    if (options.duration) {
      filters.duration = options.duration;
    }
    
    // First get search results
    const searchResults = await ytsr(query, { limit: options.count * 2 });
    
    // Filter items by type 'video'
    let videos = searchResults.items.filter(item => item.type === 'video');
    
    // Apply additional filters that ytsr doesn't support directly
    if (options.recent) {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      videos = videos.filter(video => {
        if (!video.uploadedAt) return true;
        const uploadDate = new Date(video.uploadedAt);
        return uploadDate > twoYearsAgo;
      });
    }
    
    if (options.minViews > 0) {
      videos = videos.filter(video => {
        if (!video.views) return false;
        // Extract number from view count string
        const viewCount = parseInt(video.views.toString().replace(/[^0-9]/g, ''));
        return !isNaN(viewCount) && viewCount >= options.minViews;
      });
    }
    
    // Apply sorting
    if (options.sort === 'date') {
      videos.sort((a, b) => {
        if (!a.uploadedAt || !b.uploadedAt) return 0;
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      });
    } else if (options.sort === 'views') {
      videos.sort((a, b) => {
        if (!a.views || !b.views) return 0;
        const aViews = parseInt(a.views.toString().replace(/[^0-9]/g, ''));
        const bViews = parseInt(b.views.toString().replace(/[^0-9]/g, ''));
        return bViews - aViews;
      });
    }
    
    // Format results
    const results = videos.slice(0, options.count).map(video => ({
      videoId: video.id,
      title: video.title,
      description: video.description,
      channelId: video.author?.channelID,
      channelTitle: video.author?.name,
      views: parseInt(video.views?.toString().replace(/[^0-9]/g, '') || '0'),
      duration: video.duration,
      uploadedAt: video.uploadedAt,
      thumbnail: video.thumbnails?.[0]?.url,
      url: video.url
    }));
    
    return {
      query,
      results,
      totalResults: videos.length
    };
  } catch (error) {
    console.error('Error searching videos:', error);
    
    if (error instanceof Error) {
      return { error: error.message, query };
    }
    
    return { error: 'Failed to search videos', query };
  }
}

/**
 * Search for videos from a specific channel
 */
async function searchChannelVideos(channelId: string, count: number, sort: string) {
  try {
    const response = await youtube.search.list({
      part: ['snippet'],
      channelId,
      maxResults: count,
      order: sort as any,
      type: ['video']
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      return { error: 'No videos found for this channel', channelId };
    }
    
    // Format results
    const results = response.data.items.map(item => ({
      videoId: item.id?.videoId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      channelId: item.snippet?.channelId,
      channelTitle: item.snippet?.channelTitle,
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
      url: `https://www.youtube.com/watch?v=${item.id?.videoId}`
    }));
    
    return {
      channelId,
      results,
      totalResults: results.length
    };
  } catch (error) {
    console.error('Error searching channel videos:', error);
    
    if (error instanceof Error) {
      return { error: error.message, channelId };
    }
    
    return { error: 'Failed to search channel videos', channelId };
  }
}

/**
 * Get videos from a specific playlist
 */
async function getPlaylistVideos(playlistId: string, count: number) {
  try {
    const response = await youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId,
      maxResults: count
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      return { error: 'No videos found in this playlist', playlistId };
    }
    
    // Format results
    const results = response.data.items.map(item => ({
      videoId: item.contentDetails?.videoId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      channelId: item.snippet?.channelId,
      channelTitle: item.snippet?.channelTitle,
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
      position: item.snippet?.position,
      url: `https://www.youtube.com/watch?v=${item.contentDetails?.videoId}`
    }));
    
    return {
      playlistId,
      results,
      totalResults: results.length
    };
  } catch (error) {
    console.error('Error getting playlist videos:', error);
    
    if (error instanceof Error) {
      return { error: error.message, playlistId };
    }
    
    return { error: 'Failed to get playlist videos', playlistId };
  }
}