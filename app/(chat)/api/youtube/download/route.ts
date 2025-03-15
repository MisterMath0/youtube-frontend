// app/(chat)/api/youtube/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { extractVideoId } from '@/lib/youtube/base-tool';
import ytdlp from 'yt-dlp-exec';
import { auth } from '@/app/(auth)/auth';

/**
 * API endpoint for fetching YouTube video download information
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
    const mode = searchParams.get('mode') || 'metadata_only';
    
    if (!videoInput) {
      return NextResponse.json(
        { error: 'Missing videoId parameter' },
        { status: 400 }
      );
    }
    
    // Extract video ID
    const videoId = extractVideoId(videoInput);
    
    // Get video download info
    let downloadData;
    if (mode === 'metadata_only') {
      downloadData = await getBasicVideoInfo(videoId);
    } else if (mode === 'audio_info') {
      downloadData = await getAudioInfo(videoId);
    } else if (mode === 'formats') {
      downloadData = await getFormatInfo(videoId);
    } else {
      return NextResponse.json(
        { error: 'Invalid mode parameter', videoId },
        { status: 400 }
      );
    }
    
    if ('error' in downloadData) {
      return NextResponse.json(
        { error: downloadData.error, videoId },
        { status: 404 }
      );
    }
    
    return NextResponse.json(downloadData);
  } catch (error) {
    console.error('Error fetching download info:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message, type: 'download_error' },
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
 * Get basic video information
 */
async function getBasicVideoInfo(videoId: string) {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Use yt-dlp to get video metadata
    const result = await ytdlp(url, {
      dumpSingleJson: true,
      noPlaylist: true,
      noWarnings: true,
      preferFreeFormats: true,
      skipDownload: true,
    });
    
    return {
      videoId,
      title: result.title,
      description: result.description,
      channelId: result.channel_id,
      channelTitle: result.channel,
      viewCount: result.view_count,
      likeCount: result.like_count,
      duration: result.duration,
      uploadDate: result.upload_date,
      thumbnail: result.thumbnail,
      categories: result.categories,
      tags: result.tags,
      url: result.webpage_url
    };
  } catch (error) {
    console.error('Error getting basic video info:', error);
    
    if (error instanceof Error) {
      return { error: error.message, videoId };
    }
    
    return { error: 'Failed to retrieve video information', videoId };
  }
}

/**
 * Get audio stream information
 */
async function getAudioInfo(videoId: string) {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Use yt-dlp to get audio formats
    const result = await ytdlp(url, {
      dumpSingleJson: true,
      noPlaylist: true,
      noWarnings: true,
      preferFreeFormats: true,
      skipDownload: true,
    });
    
    // Filter for audio-only formats
    const audioStreams = result.formats.filter(
      (format: any) => format.resolution === 'audio only'
    ).map((format: any) => ({
      formatId: format.format_id,
      ext: format.ext,
      acodec: format.acodec,
      abr: format.abr,
      asr: format.asr,
      filesize: format.filesize,
      url: format.url
    }));
    
    return {
      videoId,
      title: result.title,
      channelTitle: result.channel,
      audioStreams,
      duration: result.duration
    };
  } catch (error) {
    console.error('Error getting audio info:', error);
    
    if (error instanceof Error) {
      return { error: error.message, videoId };
    }
    
    return { error: 'Failed to retrieve audio information', videoId };
  }
}

/**
 * Get detailed format information
 */
async function getFormatInfo(videoId: string) {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Use yt-dlp to get all formats
    const result = await ytdlp(url, {
      dumpSingleJson: true,
      noPlaylist: true,
      noWarnings: true,
      preferFreeFormats: true,
      skipDownload: true,
    });
    
    // Categorize formats
    const formats = {
      combined: [],  // Audio and video in one stream
      videoOnly: [], // Video only
      audioOnly: []  // Audio only
    };
    
    // Process formats
    for (const format of result.formats) {
      const formatInfo = {
        formatId: format.format_id,
        ext: format.ext,
        resolution: format.resolution,
        fps: format.fps,
        vcodec: format.vcodec,
        acodec: format.acodec,
        abr: format.abr,
        vbr: format.vbr,
        filesize: format.filesize,
        formatNote: format.format_note
      };
      
      if (format.resolution === 'audio only') {
        formats.audioOnly.push(formatInfo);
      } else if (format.acodec === 'none') {
        formats.videoOnly.push(formatInfo);
      } else {
        formats.combined.push(formatInfo);
      }
    }
    
    // Find best quality options
    const bestQuality = {
      best: result.formats.find((f: any) => f.format_id === result.format_id),
      bestVideo: result.formats.find((f: any) => 
        f.vcodec !== 'none' && 
        f.acodec !== 'none' && 
        f.format_id === result.format_id
      ),
      bestAudio: result.formats
        .filter((f: any) => f.resolution === 'audio only')
        .sort((a: any, b: any) => (b.abr || 0) - (a.abr || 0))[0]
    };
    
    return {
      videoId,
      title: result.title,
      duration: result.duration,
      formats,
      bestQuality
    };
  } catch (error) {
    console.error('Error getting format info:', error);
    
    if (error instanceof Error) {
      return { error: error.message, videoId };
    }
    
    return { error: 'Failed to retrieve format information', videoId };
  }
}