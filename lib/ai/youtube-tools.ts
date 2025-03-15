// lib/ai/youtube-tools.ts
import { youtubeTools } from '@/lib/youtube';

/**
 * Add YouTube tools to the AI SDK
 * This function should be called in the application's AI configuration
 */
export const addYouTubeTools = (tools = {}) => {
  return {
    ...tools,
    ...youtubeTools
  };
};

// Example usage in tools configuration:
/*
import { addYouTubeTools } from '@/lib/ai/youtube-tools';

const tools = {
  getWeather,
  createDocument,
  updateDocument,
  requestSuggestions,
  ...addYouTubeTools()
};
*/