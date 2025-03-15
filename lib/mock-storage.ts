// lib/mock-storage.ts
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Create uploads directory if it doesn't exist
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Generate a simple unique ID without uuid dependency
 */
function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Mock implementation of Vercel's put function for local development
 */
export async function put(
  filename: string, 
  data: any, 
  options?: { access?: 'public' | 'private' }
): Promise<{ url: string, pathname: string, contentType: string }> {
  // Create a unique filename to avoid collisions
  const uniqueFilename = `${generateId()}-${filename}`;
  const filePath = path.join(UPLOAD_DIR, uniqueFilename);

  // Determine content type (simplified version)
  const contentType = getContentType(filename);

  // Write file to disk
  if (typeof data === 'string') {
    fs.writeFileSync(filePath, data);
  } else {
    fs.writeFileSync(filePath, Buffer.from(data));
  }

  // Return mock response similar to Vercel Blob
  return {
    url: `/uploads/${uniqueFilename}`,
    pathname: uniqueFilename,
    contentType,
  };
}

/**
 * Simple helper to determine content type based on file extension
 */
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  
  const contentTypeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
  };

  return contentTypeMap[ext] || 'application/octet-stream';
}