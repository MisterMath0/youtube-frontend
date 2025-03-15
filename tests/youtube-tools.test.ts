// tests/youtube-tools.test.ts
import { test, expect } from '@playwright/test';

test.describe('YouTube Tools Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and log in
    await page.goto('/');
    
    // Check if we're already logged in, if not, log in
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
      await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'password123');
      await page.click('button[type="submit"]');
      
      // Wait for login to complete
      await page.waitForURL('/');
    }
  });

  test('should fetch and display video information', async ({ page }) => {
    // Type a message asking for YouTube video info
    await page.fill('[data-testid="multimodal-input"]', 'Get information about this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.press('[data-testid="multimodal-input"]', 'Enter');
    
    // Wait for the response
    await page.waitForSelector('text=Loading YouTube content...', { state: 'visible' });
    
    // Wait for the actual response to appear (may take some time)
    await page.waitForSelector('text=Loading YouTube content...', { state: 'hidden', timeout: 30000 });
    
    // Check if video information is displayed
    const videoTitle = await page.textContent('h3.font-medium a');
    expect(videoTitle).not.toBeNull();
    
    // Check if there's a link to watch on YouTube
    const watchButton = await page.textContent('text=Watch on YouTube');
    expect(watchButton).not.toBeNull();
  });

  test('should search for YouTube videos', async ({ page }) => {
    // Type a message asking to search YouTube
    await page.fill('[data-testid="multimodal-input"]', 'Search for YouTube videos about web development');
    await page.press('[data-testid="multimodal-input"]', 'Enter');
    
    // Wait for the response
    await page.waitForSelector('text=Loading YouTube content...', { state: 'visible' });
    
    // Wait for the actual response to appear (may take some time)
    await page.waitForSelector('text=Loading YouTube content...', { state: 'hidden', timeout: 30000 });
    
    // Check if search results are displayed
    const searchHeading = await page.textContent('text=Search Results for:');
    expect(searchHeading).not.toBeNull();
    
    // Check if there are search results
    const resultCount = await page.$$eval('div.flex.gap-3', (elements) => elements.length);
    expect(resultCount).toBeGreaterThan(0);
  });

  test('should fetch video transcript', async ({ page }) => {
    // Type a message asking for a video transcript
    await page.fill('[data-testid="multimodal-input"]', 'Get the transcript for this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.press('[data-testid="multimodal-input"]', 'Enter');
    
    // Wait for the response
    await page.waitForSelector('text=Loading YouTube content...', { state: 'visible' });
    
    // Wait for the actual response to appear (may take some time)
    await page.waitForSelector('text=Loading YouTube content...', { state: 'hidden', timeout: 30000 });
    
    // Check if transcript information is displayed
    const transcriptHeading = await page.textContent('text=Transcript for Video ID:');
    
    // Some videos might not have transcripts available
    if (transcriptHeading) {
      // If transcript is available, check for Show More button
      const showMoreButton = await page.textContent('text=Show More');
      expect(showMoreButton).not.toBeNull();
    } else {
      // If transcript is not available, check for error message
      const errorMessage = await page.textContent('text=No transcript available for this video');
      expect(errorMessage).not.toBeNull();
    }
  });

  test('should get download information', async ({ page }) => {
    // Type a message asking for download information
    await page.fill('[data-testid="multimodal-input"]', 'What are the available formats for this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ | formats');
    await page.press('[data-testid="multimodal-input"]', 'Enter');
    
    // Wait for the response
    await page.waitForSelector('text=Loading YouTube content...', { state: 'visible' });
    
    // Wait for the actual response to appear (may take some time)
    await page.waitForSelector('text=Loading YouTube content...', { state: 'hidden', timeout: 30000 });
    
    // Check if format information is displayed
    const formatsHeading = await page.textContent('text=Available Video Formats');
    expect(formatsHeading).not.toBeNull();
    
    // Check for format information - either the formats are displayed or a button to show them
    const showFormatsButton = await page.textContent('text=Show formats');
    expect(showFormatsButton).not.toBeNull();
  });
});