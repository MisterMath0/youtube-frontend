// lib/youtube/discovery-tool.ts
import { z } from 'zod';
import { createYouTubeTool, formatNumber } from './base-tool';

// Cache for search results
const searchCache = new Map<string, any>();
const SEARCH_CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

// Define params schema for search queries
const searchParamsSchema = z.object({
  count: z.number().optional().default(5),
  recent: z.boolean().optional().default(false),
  sort: z.enum(['relevance', 'date', 'views', 'rating']).optional().default('relevance'),
  minViews: z.number().optional().default(0),
  duration: z.enum(['short', 'medium', 'long']).nullable().optional()
});

type SearchParams = z.infer<typeof searchParamsSchema>;

/**
 * Parse input string to extract search parameters
 * @param input Search query with optional parameters
 * @returns Parsed query and parameters
 */
function parseInput(input: string): { query: string, params: SearchParams } {
  const parts = input.split('|', 2);
  const query = parts[0].trim();
  
  // Default parameters
  const params: SearchParams = {
    count: 5,
    sort: 'relevance',
    recent: false,
    minViews: 0,
    duration: null
  };
  
  // Parse additional parameters if provided
  if (parts.length > 1) {
    const paramParts = parts[1].includes(',') 
      ? parts[1].split(',') 
      : parts[1].split('|');
    
    for (const param of paramParts) {
      const trimmed = param.trim();
      if (trimmed.includes('=')) {
        const [key, value] = trimmed.split('=', 2).map(part => part.trim().toLowerCase());
        
        if (key === 'count') {
          const count = parseInt(value);
          if (!isNaN(count)) {
            params.count = Math.min(count, 20); // Max 20 results
          }
        } else if (key === 'sort' && ['relevance', 'date', 'views', 'rating'].includes(value)) {
          params.sort = value as 'relevance' | 'date' | 'views' | 'rating';
        } else if (key === 'recent' && ['true', 'yes', '1'].includes(value)) {
          params.recent = true;
        } else if (key === 'min_views') {
          const minViews = parseInt(value);
          if (!isNaN(minViews)) {
            params.minViews = minViews;
          }
        } else if (key === 'duration' && ['short', 'medium', 'long'].includes(value)) {
          params.duration = value as 'short' | 'medium' | 'long';
        }
      }
    }
  }
  
  return { query, params };
}

/**
 * Search for YouTube videos
 * @param query Search query
 * @param params Search parameters
 * @returns Search results
 */
async function searchVideos(query: string, params: SearchParams): Promise<any> {
  try {
    // Generate cache key
    const cacheKey = `${query}_${JSON.stringify(params)}`;
    
    // Check cache first
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp) < SEARCH_CACHE_TTL) {
      return cachedResult.data;
    }
    
    // Build query parameters for API
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);
    queryParams.append('count', params.count.toString());
    queryParams.append('sort', params.sort);
    
    if (params.recent) {
      queryParams.append('recent', 'true');
    }
    
    if (params.minViews > 0) {
      queryParams.append('minViews', params.minViews.toString());
    }
    
    if (params.duration) {
      queryParams.append('duration', params.duration);
    }
    
    // Type of search (regular, channel, playlist)
    let searchType = 'search';
    if (query.startsWith('channel:')) {
      searchType = 'channel';
      queryParams.append('channelId', query.substring(8).trim());
    } else if (query.startsWith('playlist:')) {
      searchType = 'playlist';
      queryParams.append('playlistId', query.substring(9).trim());
    }
    
    queryParams.append('type', searchType);
    
    // Fetch search results
    const endpoint = `/api/youtube/search?${queryParams.toString()}`;
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Process search results
    const processed = processSearchResults(data, query, params);
    
    // Cache the result
    searchCache.set(cacheKey, {
      data: processed,
      timestamp: Date.now()
    });
    
    return processed;
  } catch (error) {
    console.error("Error searching videos:", error);
    throw error;
  }
}

/**
 * Process raw search results
 */
function processSearchResults(results: any, query: string, params: SearchParams): any {
  if (!results || results.error) {
    return {
      error: results?.error || "Failed to perform search",
      query
    };
  }
  
  // Add formatted view counts
  if (results.results) {
    for (const result of results.results) {
      if (result.views) {
        result.viewsFormatted = formatNumber(result.views);
      }
    }
  }
  
  // Add search metadata
  return {
    ...results,
    query,
    searchParams: params,
    resultCount: results.results?.length || 0
  };
}

/**
 * YouTube Discovery Tool for searching videos
 */
export const youtubeDiscoveryTool = createYouTubeTool({
  name: "youtube_discovery",
  description: `
    Search for YouTube videos by keyword or topic.
    Input format options:
    1. Simple search: "machine learning tutorials"
    2. With parameters: "machine learning tutorials | count=10 | recent=true | sort=views"
    3. Channel search: "channel:TensorFlow | count=5"
    4. Playlist videos: "playlist:PLFs4vir_WsTzcfD7ZJ-5Nm00cPHVGy3ss"
    
    Parameters:
    - count: Number of results (default: 5, max: 20)
    - recent: Only videos less than 2 years old (true/false)
    - sort: Sort results by (relevance, date, views, rating)
    - min_views: Minimum view count (e.g., 10000)
    - duration: Video duration (short, medium, long)
  `,
  schema: z.string().describe("Search query with optional parameters"),
  execute: async (input: string) => {
    try {
      // Parse input to extract query and parameters
      const { query, params } = parseInput(input);
      
      if (!query) {
        return {
          error: "Please provide a search query",
          type: "search_error"
        };
      }
      
      // Perform search
      return await searchVideos(query, params);
    } catch (error) {
      if (error instanceof Error) {
        return {
          error: error.message,
          query: input,
          type: "search_error"
        };
      }
      
      return {
        error: "An unexpected error occurred while searching",
        type: "system_error"
      };
    }
  }
});