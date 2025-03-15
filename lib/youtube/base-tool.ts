// lib/youtube/base-tool.ts
import { z } from 'zod';
import { tool } from 'ai';

/**
 * Base class for all YouTube tools.
 * Provides common functionality and interface that all tools must implement.
 */
export interface YouTubeToolConfig {
  name: string;
  description: string;
  schema: z.ZodType<any, any>;
  execute: (args: any) => Promise<any>;
}

/**
 * Create a tool for YouTube operations
 * @param config Tool configuration
 * @returns An AI SDK tool
 */
export const createYouTubeTool = (config: YouTubeToolConfig) => {
  return tool({
    name: config.name,
    description: config.description,
    parameters: config.schema,
    execute: config.execute
  });
};

/**
 * Extract video ID from various YouTube URL formats.
 * @param videoInput YouTube URL or ID
 * @returns Extracted video ID
 */
export function extractVideoId(videoInput: string): string {
  // Handle various YouTube URL formats
  const youtube_pattern = (
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|watch\?(?:\S*&)?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  
  const match = youtube_pattern.exec(videoInput);
  if (match) {
    return match[1];
  }
  
  // If input is exactly 11 characters and only contains valid YouTube ID chars
  if (/^[a-zA-Z0-9_-]{11}$/.test(videoInput)) {
    return videoInput;
  }
    
  throw new Error(`Could not extract valid YouTube video ID from: ${videoInput}`);
}

/**
 * Format large numbers for readability
 * @param num Number to format
 * @returns Formatted string
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  } else {
    return num.toString();
  }
}

/**
 * Format duration in seconds to a readable time string
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number | undefined | null): string {
  if (seconds === undefined || seconds === null) {
    return "Unknown";
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Format date string from YYYYMMDD format
 * @param dateStr Date string in YYYYMMDD format
 * @returns Formatted date string
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr || dateStr.length !== 8) {
    return "Unknown";
  }
  
  try {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    return `${year}-${month}-${day}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Format file size from bytes to human-readable format
 * @param sizeBytes File size in bytes
 * @returns Formatted file size string
 */
export function formatFilesize(sizeBytes: number | undefined | null): string {
  if (sizeBytes === undefined || sizeBytes === null) {
    return "Unknown";
  }
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = sizeBytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}