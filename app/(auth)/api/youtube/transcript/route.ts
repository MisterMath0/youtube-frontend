// app/api/youtube/transcript/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as YoutubeTranscriptApi from 'youtube-transcript-api';
import { extractVideoId } from '@/lib/youtube/base-tool';

/**
 * API endpoint for fetching YouTube transcripts
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoInput = searchParams.get('videoId');
    const language = searchParams.get('language');
    
    if (!videoInput) {
      return NextResponse.json(
        { error: 'Missing videoId parameter' },
        { status: 400 }
      );
    }
    
    // Extract video ID
    const videoId = extractVideoId(videoInput);
    
    // Get transcript
    const transcriptData = await getTranscript(videoId, language || undefined);
    
    if ('error' in transcriptData) {
      return NextResponse.json(
        { error: transcriptData.error, videoId },
        { status: 404 }
      );
    }
    
    return NextResponse.json(transcriptData);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message, type: 'transcript_error' },
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
 * Get transcript for a YouTube video
 */
async function getTranscript(videoId: string, language?: string) {
  try {
    let transcript;
    
    if (language) {
      // Get specific language transcript
      const transcriptList = await YoutubeTranscriptApi.default.listTranscripts(videoId);
      transcript = await transcriptList.findTranscript([language]).fetch();
    } else {
      // Try default transcript
      transcript = await YoutubeTranscriptApi.default.getTranscript(videoId);
    }
    
    return transcript;
  } catch (error) {
    // Check if auto-generated transcript is available
    if (error instanceof Error && error.message.includes('No transcript')) {
      try {
        const transcriptList = await YoutubeTranscriptApi.default.listTranscripts(videoId);
        const autoTranscripts = transcriptList.transcripts.filter(t => t.isGenerated);
        
        if (autoTranscripts.length > 0) {
          return await autoTranscripts[0].fetch();
        }
      } catch (innerError) {
        // Continue to error handling
      }
    }
    
    let errorMessage = 'No transcript available for this video';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return { error: errorMessage, videoId };
  }
}