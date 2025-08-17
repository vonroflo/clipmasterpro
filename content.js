// ClipMaster Pro - Content Script
// Handles clipboard monitoring and context menu integration on web pages

class ClipMasterContent {
  constructor() {
    this.isMonitoring = false;
    this.lastClipboardContent = '';
    this.clipboardCheckInterval = null;
    
    this.init();
  }

  init() {
    // Initialize productivity integrations
    this.loadProductivityIntegrations();
    
    // Start clipboard monitoring after page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.startMonitoring();
        this.initializeIntegrations();
      });
    } else {
      this.startMonitoring();
      this.initializeIntegrations();
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Indicates we will send a response asynchronously
    });

    // Enhanced copy/paste event listeners
    this.setupEnhancedCopyPaste();
  }

  /**
   * Load productivity integrations script dynamically
   * This enables enhanced clipboard functionality for supported tools
   * like Google Docs, Notion, Slack, GitHub, Figma, and Trello
   */
  loadProductivityIntegrations() {
    // Load productivity integrations script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('productivity-integrations.js');
    script.onload = () => {
      console.log('ClipMaster Pro: Productivity integrations loaded');
    };
    (document.head || document.documentElement).appendChild(script);
  }

  /**
   * Initialize productivity tool integrations after page load
   * Detects supported tools and shows enhancement indicator to user
   * Integrations provide context-aware clipboard enhancements
   */
  initializeIntegrations() {
    // Wait for integrations to load and initialize
    setTimeout(() => {
      if (window.clipMasterIntegrations) {
        const status = window.clipMasterIntegrations.getIntegrationStatus();
        if (status.isActive) {
          console.log(`ClipMaster Pro: Enhanced for ${status.currentTool.name}`);
          this.showIntegrationIndicator(status.currentTool);
        }
      }
    }, 1000);
  }

  showIntegrationIndicator(tool) {
    // Create subtle indicator that ClipMaster Pro is enhanced for this tool
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(37, 99, 235, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      opacity: 1;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    indicator.textContent = `${tool.icon} ClipMaster Pro Enhanced`;
    
    document.body.appendChild(indicator);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }, 3000);
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('ClipMaster: Started clipboard monitoring on', window.location.hostname);

    // Monitor keyboard shortcuts for copy operations
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardEvent(e);
    });

    // Monitor copy events
    document.addEventListener('copy', (e) => {
      this.handleCopyEvent(e);
    });

    // Monitor paste events
    document.addEventListener('paste', (e) => {
      this.handlePasteEvent(e);
    });

    // Periodic clipboard check (as fallback)
    this.startPeriodicClipboardCheck();
  }

  setupEnhancedCopyPaste() {
    // Add enhanced context menu for selected text
    document.addEventListener('mouseup', (e) => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        this.handleTextSelection(selection.toString(), e);
      }
    });

    // Monitor for right-click context menus
    document.addEventListener('contextmenu', (e) => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        // Text is selected, context menu will show ClipMaster options
        this.prepareContextMenuData(selection.toString(), e.target);
      }
    });
  }

  handleKeyboardEvent(e) {
    // Detect copy operations (Ctrl+C, Cmd+C)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      setTimeout(() => {
        this.checkAndCaptureClipboard('keyboard-copy');
      }, 100);
    }

    // Detect ClipMaster shortcut (Ctrl+Shift+V)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
      e.preventDefault();
      this.openClipMaster();
    }
  }

  async handleCopyEvent(e) {
    try {
      // Get the copied text from the clipboard data
      const clipboardData = e.clipboardData;
      if (clipboardData) {
        const text = clipboardData.getData('text/plain');
        if (text && text.trim()) {
          await this.addToClipboardHistory(text, 'copy-event');
        }
      }
    } catch (error) {
      console.error('ClipMaster: Error handling copy event:', error);
    }
  }

  handlePasteEvent(e) {
    // Log paste events for analytics (without capturing content)
    console.log('ClipMaster: Paste event detected');
  }

  async checkAndCaptureClipboard(source) {
    try {
      // Note: Reading clipboard in content script has limitations
      // This is mainly for detecting when clipboard changes
      const text = await navigator.clipboard.readText();
      if (text && text !== this.lastClipboardContent) {
        await this.addToClipboardHistory(text, source);
        this.lastClipboardContent = text;
      }
    } catch (error) {
      // Clipboard access may be denied, which is normal
      console.log('ClipMaster: Clipboard access not available:', error.message);
    }
  }

  async addToClipboardHistory(content, source) {
    if (!content || content.trim().length === 0) return;

    try {
      // Enhance with productivity tool integrations
      let enhancedData = {
        content: content.trim(),
        source: this.getSourceInfo(source)
      };
      
      // Apply productivity tool enhancements if available
      if (window.clipMasterIntegrations) {
        enhancedData = window.clipMasterIntegrations.enhanceClipboardData(enhancedData);
      }

      const response = await chrome.runtime.sendMessage({
        action: 'add-clipboard-item',
        ...enhancedData
      });

      if (response && response.success) {
        console.log('ClipMaster: Added clipboard item from', source);
        this.showQuickNotification('Saved to ClipMaster');
      }
    } catch (error) {
      console.error('ClipMaster: Error adding clipboard item:', error);
    }
  }

  getSourceInfo(source) {
    return {
      type: source,
      url: window.location.href,
      hostname: window.location.hostname,
      title: document.title,
      timestamp: new Date().toISOString()
    };
  }

  handleTextSelection(text, event) {
    // Store selection for potential context menu actions
    this.lastSelection = {
      text: text,
      x: event.pageX,
      y: event.pageY,
      element: event.target
    };
  }

  prepareContextMenuData(text, element) {
    // Prepare data for context menu actions
    this.contextMenuData = {
      selectedText: text,
      element: element,
      url: window.location.href,
      title: document.title
    };
  }

  startPeriodicClipboardCheck() {
    // Check clipboard every 2 seconds as fallback
    this.clipboardCheckInterval = setInterval(() => {
      this.checkAndCaptureClipboard('periodic-check');
    }, 2000);
  }

  stopPeriodicClipboardCheck() {
    if (this.clipboardCheckInterval) {
      clearInterval(this.clipboardCheckInterval);
      this.clipboardCheckInterval = null;
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'paste-text':
          await this.pasteTextAtCursor(message.text);
          sendResponse({ success: true });
          break;

        case 'copy-to-clipboard':
          await this.copyToClipboard(message.text);
          sendResponse({ success: true });
          break;

        case 'get-page-info':
          sendResponse({
            url: window.location.href,
            title: document.title,
            hostname: window.location.hostname
          });
          break;

        case 'get-selected-text':
          const selection = window.getSelection();
          sendResponse({
            text: selection ? selection.toString() : '',
            hasSelection: selection && selection.toString().trim().length > 0
          });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('ClipMaster: Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async pasteTextAtCursor(text) {
    const activeElement = document.activeElement;
    
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      // Handle input and textarea elements
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const currentValue = activeElement.value;
      
      const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
      activeElement.value = newValue;
      
      // Set cursor position after inserted text
      const newCursorPos = start + text.length;
      activeElement.setSelectionRange(newCursorPos, newCursorPos);
      
      // Trigger input event
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      
    } else if (activeElement && activeElement.contentEditable === 'true') {
      // Handle contentEditable elements
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      // Fallback: copy to clipboard
      await this.copyToClipboard(text);
      this.showQuickNotification('Copied to clipboard - paste with Ctrl+V');
    }
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showQuickNotification('Copied to clipboard');
    } catch (error) {
      console.error('ClipMaster: Error copying to clipboard:', error);
      // Fallback method
      this.fallbackCopyToClipboard(text);
    }
  }

  fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showQuickNotification('Copied to clipboard');
    } catch (error) {
      console.error('ClipMaster: Fallback copy failed:', error);
    }
    
    document.body.removeChild(textArea);
  }

  openClipMaster() {
    // Send message to background script to open popup
    chrome.runtime.sendMessage({ action: 'open-popup' });
  }

  showQuickNotification(message) {
    // Create a subtle notification that doesn't interfere with the page
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2563eb;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      animation: clipmaster-slide-in 0.3s ease, clipmaster-fade-out 0.3s ease 2.7s;
      pointer-events: none;
    `;

    // Add animation styles if not already present
    if (!document.getElementById('clipmaster-styles')) {
      const style = document.createElement('style');
      style.id = 'clipmaster-styles';
      style.textContent = `
        @keyframes clipmaster-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes clipmaster-fade-out {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Remove notification after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // Enhanced text processing for better categorization
  analyzeSelectedText(text) {
    const analysis = {
      text: text,
      length: text.length,
      type: 'text',
      isCode: false,
      isUrl: false,
      isEmail: false,
      language: null
    };

    // URL detection
    const urlPattern = /^https?:\/\/[^\s]+$/i;
    if (urlPattern.test(text.trim())) {
      analysis.type = 'url';
      analysis.isUrl = true;
    }

    // Email detection
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(text.trim())) {
      analysis.type = 'email';
      analysis.isEmail = true;
    }

    // Code detection
    const codeIndicators = [
      /function\s+\w+\s*\(/,  // JavaScript function
      /class\s+\w+/,         // Class definition
      /import\s+.*from/,     // Import statement
      /^\s*<\w+.*>/,         // HTML tag
      /^\s*\{[\s\S]*\}$/,    // JSON-like
      /^\s*SELECT\s+.*FROM/i, // SQL
      /^\s*#include/,        // C/C++
      /^\s*def\s+\w+/,       // Python function
    ];

    for (const pattern of codeIndicators) {
      if (pattern.test(text)) {
        analysis.type = 'code';
        analysis.isCode = true;
        break;
      }
    }

    return analysis;
  }

  // Cleanup when page unloads
  cleanup() {
    this.stopPeriodicClipboardCheck();
    this.isMonitoring = false;
  }
}

// Initialize content script
const clipMasterContent = new ClipMasterContent();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  clipMasterContent.cleanup();
});

// Re-initialize if the page content changes significantly (SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Page navigation detected, reinitialize if needed
    console.log('ClipMaster: Page navigation detected, updating monitoring');
  }
}).observe(document, { subtree: true, childList: true });
