// app/(chat)/api/youtube/transcript/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { extractVideoId } from '@/lib/youtube/base-tool';
import { auth } from '@/app/(auth)/auth';
import { any } from 'zod';

/**
 * API endpoint for fetching YouTube transcripts
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
    const language = searchParams.get('language') as string ;
    
    if (!videoInput) {
      return NextResponse.json(
        { error: 'Missing videoId parameter' },
        { status: 400 }
      );
    }
    
    // Extract video ID
    const videoId = extractVideoId(videoInput);
    
    // Get transcript using native fetch API
    const transcriptData = await fetchTranscriptDirectly(videoId, language);
    
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
 * Fetch transcript directly using the native fetch API
 */
async function fetchTranscriptDirectly(videoId: string, language?: string |undefined) {
  try {
    // First, we need to get the transcript list
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    // Extract captions data from the HTML
    const captionsMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!captionsMatch) {
      return { error: 'No transcript available for this video', videoId };
    }
    
    // Parse the captions data
    const captionsData = JSON.parse(captionsMatch[1]);
    
    // Find the right language track
    let captionTrack = captionsData[0]; // Default to first track
    if (language) {
      const langTrack = captionsData.find((track: any) => 
        track.languageCode === language || 
        track.name.simpleText === language
      );
      if (langTrack) captionTrack = langTrack;
    }
    
    if (!captionTrack || !captionTrack.baseUrl) {
      return { error: 'No transcript found for specified language', videoId };
    }
    
    // Fetch the transcript XML
    const transcriptResponse = await fetch(captionTrack.baseUrl);
    const transcriptXml = await transcriptResponse.text();
    
    // Parse XML to extract text and timestamps
    const transcript = parseTranscriptXml(transcriptXml);
    
    return {
      videoId,
      transcript: transcript.map(item => item.text).join(' '),
      formattedTranscript: formatTranscriptWithTimestamps(transcript),
      language: captionTrack.languageCode || 'auto',
      length: transcript.map(item => item.text).join(' ').length,
      wordCount: transcript.map(item => item.text).join(' ').split(/\s+/).length,
      summary: transcript.map(item => item.text).join(' ').split(/\s+/).slice(0, 100).join(' ') + '...'
    };
  } catch (error) {
    console.error('Error in direct transcript fetch:', error);
    return { error: 'Failed to retrieve transcript', videoId };
  }
}

/**
 * Parse transcript XML to extract text and timestamps
 */
function parseTranscriptXml(xml: string) {
  const regex = /<text start="([\d\.]+)" dur="([\d\.]+)"[^>]*>(.*?)<\/text>/g;
  const transcript = [];
  let match;
  
  while ((match = regex.exec(xml)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    const text = match[3].replace(/&amp;/g, '&')
                          .replace(/&lt;/g, '<')
                          .replace(/&gt;/g, '>')
                          .replace(/&quot;/g, '"')
                          .replace(/&#39;/g, "'");
    
    transcript.push({ start, duration, text });
  }
  
  return transcript;
}

/**
 * Format transcript with timestamps
 */
function formatTranscriptWithTimestamps(transcript: Array<{start: number, duration: number, text: string}>) {
  let formattedText = '';
  let currentMinute = -1;
  
  for (const item of transcript) {
    const seconds = Math.floor(item.start);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > currentMinute) {
      currentMinute = minutes;
      formattedText += `\n[${minutes}:${remainingSeconds.toString().padStart(2, '0')}] `;
    }
    
    formattedText += item.text + ' ';
  }
  
  return formattedText.trim();
}