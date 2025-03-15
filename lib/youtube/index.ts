// lib/youtube/index.ts
export * from './base-tool';
export * from './transcript-tool';
export * from './video-tool';
export * from './discovery-tool';
export * from './download-tool';

import { youtubeTranscriptTool } from './transcript-tool';
import { youtubeVideoTool } from './video-tool';
import { youtubeDiscoveryTool } from './discovery-tool';
import { youtubeDownloadTool } from './download-tool';

/**
 * Object containing all YouTube tools
 */
export const youtubeTools = {
  youtubeTranscript: youtubeTranscriptTool,
  youtubeVideoInfo: youtubeVideoTool,
  youtubeDiscovery: youtubeDiscoveryTool,
  youtubeDownload: youtubeDownloadTool
};

/**
 * Array of all YouTube tools
 */
export const youtubeToolsArray = [
  youtubeTranscriptTool,
  youtubeVideoTool,
  youtubeDiscoveryTool,
  youtubeDownloadTool
];