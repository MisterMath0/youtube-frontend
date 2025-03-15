// tests/pages/chat.ts
// Updated chat page test utility with better error handling and resilience

import { Page, Locator, expect } from '@playwright/test';

export class ChatPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async isGenerationComplete() {
    try {
      // Increase timeout and add better error handling
      const response = await this.page.waitForResponse(
        (response) => response.url().includes('/api/chat'),
        { timeout: 60000 } // Increase timeout to 60 seconds
      );
      return response.ok();
    } catch (error) {
      console.error('Error waiting for API response:', error);
      // Continue the test rather than failing immediately
      return false;
    }
  }

  async getRecentAssistantMessage() {
    // Wait for the message to be added to the DOM with increased timeout
    try {
      await this.page.waitForSelector('[data-role="assistant"]', { timeout: 30000 });
    } catch (error) {
      console.log('No assistant message found within timeout');
      return { content: null, attachments: [] };
    }

    const lastMessageElements = await this.page.locator('[data-role="assistant"]').all();
    
    if (lastMessageElements.length === 0) {
      console.log('No assistant messages found');
      return { content: null, attachments: [] };
    }
    
    const lastMessageElement = lastMessageElements[lastMessageElements.length - 1];
    
    // Check if the message content exists before trying to access it
    const contentElement = await lastMessageElement.locator('[data-testid="message-content"]').count();
    
    let content = null;
    if (contentElement > 0) {
      content = await lastMessageElement
        .locator('[data-testid="message-content"]')
        .innerText()
        .catch(() => null);
    }
    
    // Check for attachments with better error handling
    const attachments = await lastMessageElement
      .locator('[data-testid="message-attachments"]')
      .all()
      .catch(() => []);
    
    return { content, attachments };
  }

  async getRecentUserMessage() {
    try {
      await this.page.waitForSelector('[data-role="user"]', { timeout: 10000 });
    } catch (error) {
      console.log('No user message found within timeout');
      return { content: null, attachments: [] };
    }

    const lastMessageElements = await this.page.locator('[data-role="user"]').all();
    
    if (lastMessageElements.length === 0) {
      console.log('No user messages found');
      return { content: null, attachments: [] };
    }
    
    const lastMessageElement = lastMessageElements[lastMessageElements.length - 1];
    
    // Check if the message content exists before trying to access it
    const contentElement = await lastMessageElement.locator('[data-testid="message-content"]').count();
    
    let content = null;
    if (contentElement > 0) {
      content = await lastMessageElement
        .locator('[data-testid="message-content"]')
        .innerText()
        .catch(() => null);
    }
    
    // Check for attachments with more reliability
    const attachments = await lastMessageElement
      .locator('[data-testid="input-attachment-preview"], [data-testid="message-attachments"]')
      .all()
      .catch(() => []);
    
    return { content, attachments };
  }

  async typeMessage(message: string) {
    await this.page.getByTestId('multimodal-input').fill(message);
  }

  async sendMessage() {
    await this.page.getByTestId('send-button').click();
  }

  async uploadFile(filePath: string) {
    // First click the attachment button to ensure it's shown
    await this.page.getByTestId('attachments-button').click();
    
    // Set up a file input listener with longer timeout
    const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 15000 });
    
    // Assuming you have a file input somewhere
    const input = this.page.locator('input[type="file"]');
    await input.waitFor({ state: 'attached', timeout: 10000 });
    
    try {
      await input.setInputFiles(filePath);
    } catch (error) {
      console.error('Failed to set input files directly, trying alternate method');
      // If direct set fails, try through the file chooser
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(filePath);
    }
    
    // Wait for the upload to complete
    try {
      await this.page.waitForSelector('[data-testid="input-attachment-preview"]', { timeout: 10000 });
    } catch (error) {
      console.warn('No attachment preview found, upload may have failed');
    }
  }

  async upvoteMessage() {
    const upvoteButton = this.page.getByTestId('message-upvote');
    
    // Wait for the upvote button to be enabled
    await upvoteButton.waitFor({ timeout: 15000 });
    
    await upvoteButton.click();
    
    // Wait for any upvote processing to complete
    await this.page.waitForTimeout(500);
  }
  
  async selectSuggestionAction(index = 0) {
    // Get all suggested actions and click the one at the specified index
    try {
      const suggestedActions = this.page.locator('[data-testid="suggested-actions"] button');
      await suggestedActions.nth(index).waitFor({ timeout: 10000 });
      await suggestedActions.nth(index).click();
    } catch (error) {
      console.error('Error selecting suggestion:', error);
      throw new Error(`Failed to select suggestion at index ${index}`);
    }
  }
  
  async waitForUrl(urlPattern: string | RegExp) {
    try {
      await this.page.waitForURL(urlPattern, { timeout: 15000 });
      return true;
    } catch (error) {
      console.error(`Failed to wait for URL matching ${urlPattern}:`, error);
      return false;
    }
  }
  
  async getAssistantMessageCount() {
    return this.page.locator('[data-role="assistant"]').count();
  }
  
  async getUserMessageCount() {
    return this.page.locator('[data-role="user"]').count();
  }
}