// ClipMaster Pro - Background Service Worker
// Handles clipboard monitoring, storage management, and context menus

class ClipMasterBackground {
  constructor() {
    this.clipboardHistory = [];
    this.maxHistoryItems = 100;
    this.isMonitoring = false;
    this.lastClipboardContent = '';
    
    this.init();
  }

  async init() {
    // Load existing clipboard history
    await this.loadClipboardHistory();
    
    // Setup context menus
    this.setupContextMenus();
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Start clipboard monitoring
    this.startClipboardMonitoring();
  }

  async loadClipboardHistory() {
    try {
      const result = await chrome.storage.local.get(['clipboardHistory']);
      this.clipboardHistory = result.clipboardHistory || [];
      console.log('Loaded clipboard history:', this.clipboardHistory.length, 'items');
    } catch (error) {
      console.error('Error loading clipboard history:', error);
      this.clipboardHistory = [];
    }
  }

  async saveClipboardHistory() {
    try {
      await chrome.storage.local.set({ clipboardHistory: this.clipboardHistory });
      console.log('Saved clipboard history:', this.clipboardHistory.length, 'items');
    } catch (error) {
      console.error('Error saving clipboard history:', error);
    }
  }

  setupContextMenus() {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'clipmaster-paste-recent',
        title: 'ClipMaster Pro - Paste Recent',
        contexts: ['editable']
      });

      chrome.contextMenus.create({
        id: 'clipmaster-copy-smart',
        title: 'ClipMaster Pro - Smart Copy',
        contexts: ['selection']
      });
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });
  }

  setupKeyboardShortcuts() {
    chrome.commands.onCommand.addListener((command) => {
      if (command === 'open-clipmaster') {
        chrome.action.openPopup();
      }
    });
  }

  startClipboardMonitoring() {
    // Note: Direct clipboard monitoring in service worker is limited
    // We'll implement this through content script coordination
    this.isMonitoring = true;
    console.log('Clipboard monitoring started');
  }

  async addClipboardItem(content, source = 'unknown') {
    if (!content || content === this.lastClipboardContent) {
      return; // Avoid duplicates
    }

    const clipboardItem = {
      id: Date.now(),
      content: content.trim(),
      type: this.categorizeContent(content),
      source: this.processSourceInfo(source),
      timestamp: new Date().toISOString(),
      favorite: false,
      tags: this.generateTags(content),
      preview: this.generatePreview(content)
    };

    // Add to beginning of array
    this.clipboardHistory.unshift(clipboardItem);

    // Maintain maximum history size
    if (this.clipboardHistory.length > this.maxHistoryItems) {
      this.clipboardHistory = this.clipboardHistory.slice(0, this.maxHistoryItems);
    }

    // Save to storage
    await this.saveClipboardHistory();

    this.lastClipboardContent = content;
    console.log('Added clipboard item:', clipboardItem.type, clipboardItem.preview);
  }

  categorizeContent(content) {
    const text = content.trim();
    
    // URL detection
    const urlPattern = /^https?:\/\/[^\s]+$/i;
    if (urlPattern.test(text)) {
      return 'url';
    }

    // Email detection
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(text)) {
      return 'email';
    }

    // Code detection (basic patterns)
    const codePatterns = [
      /^[\s]*<[^>]+>/, // HTML tags
      /^[\s]*\{[\s\S]*\}[\s]*$/, // JSON-like
      /^[\s]*function\s+\w+/, // JavaScript function
      /^[\s]*def\s+\w+/, // Python function
      /^[\s]*class\s+\w+/, // Class definition
      /^[\s]*#include/, // C/C++ include
      /^[\s]*import\s+/, // Import statements
      /^[\s]*SELECT\s+.*FROM/i, // SQL
      /^[\s]*\$\w+/, // Shell variables
      /^[\s]*git\s+/, // Git commands
    ];

    for (const pattern of codePatterns) {
      if (pattern.test(text)) {
        return 'code';
      }
    }

    // Phone number detection
    const phonePattern = /^[\+]?[\d\s\-\(\)]+$/;
    if (phonePattern.test(text) && text.replace(/\D/g, '').length >= 10) {
      return 'phone';
    }

    // Default to text
    return 'text';
  }

  generateTags(content) {
    const tags = [];
    const type = this.categorizeContent(content);
    tags.push(type);

    // Add length-based tags
    if (content.length > 500) {
      tags.push('long');
    } else if (content.length < 50) {
      tags.push('short');
    }

    // Add content-based tags
    if (content.includes('password') || content.includes('token')) {
      tags.push('sensitive');
    }

    if (/\d{4}[-\/]\d{2}[-\/]\d{2}/.test(content)) {
      tags.push('date');
    }

    return tags;
  }

  generatePreview(content) {
    const maxLength = 100;
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }

  processSourceInfo(source) {
    // If source is already an object with detailed info, use it
    if (typeof source === 'object' && source !== null) {
      return {
        type: source.type || 'unknown',
        url: source.url || '',
        hostname: source.hostname || this.extractHostname(source.url || ''),
        title: source.title || '',
        timestamp: source.timestamp || new Date().toISOString()
      };
    }

    // If source is a URL string, extract hostname
    if (typeof source === 'string' && source.startsWith('http')) {
      return {
        type: 'web',
        url: source,
        hostname: this.extractHostname(source),
        title: '',
        timestamp: new Date().toISOString()
      };
    }

    // Default source info
    return {
      type: typeof source === 'string' ? source : 'unknown',
      url: '',
      hostname: '',
      title: '',
      timestamp: new Date().toISOString()
    };
  }

  extractHostname(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  async handleContextMenuClick(info, tab) {
    switch (info.menuItemId) {
      case 'clipmaster-paste-recent':
        await this.pasteRecentItem(tab);
        break;
      case 'clipmaster-copy-smart':
        await this.smartCopy(info, tab);
        break;
    }
  }

  async pasteRecentItem(tab) {
    if (this.clipboardHistory.length === 0) {
      return;
    }

    const mostRecent = this.clipboardHistory[0];
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'paste-text',
        text: mostRecent.content
      });
    } catch (error) {
      console.error('Error pasting recent item:', error);
    }
  }

  async smartCopy(info, tab) {
    const selectedText = info.selectionText;
    if (selectedText) {
      await this.addClipboardItem(selectedText, tab.url);
      
      // Copy to system clipboard
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'copy-to-clipboard',
          text: selectedText
        });
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  }

  // Message handling from content scripts and popup
  async handleMessage(message, sender) {
    switch (message.action) {
      case 'add-clipboard-item':
        await this.addClipboardItem(message.content, message.source);
        return { success: true };
        
      case 'get-clipboard-history':
        return { history: this.clipboardHistory };
        
      case 'delete-clipboard-item':
        this.clipboardHistory = this.clipboardHistory.filter(item => item.id !== message.id);
        await this.saveClipboardHistory();
        return { success: true };
        
      case 'toggle-favorite':
        const item = this.clipboardHistory.find(item => item.id === message.id);
        if (item) {
          item.favorite = !item.favorite;
          await this.saveClipboardHistory();
        }
        return { success: true };
        
      case 'clear-history':
        this.clipboardHistory = [];
        await this.saveClipboardHistory();
        return { success: true };
        
      default:
        return { error: 'Unknown action' };
    }
  }
}

// Initialize background script
const clipMaster = new ClipMasterBackground();

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  clipMaster.handleMessage(message, sender).then(sendResponse);
  return true; // Indicates we will send a response asynchronously
});

// Installation handler with proper initialization
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('ClipMaster Pro installation event:', details.reason);
  
  if (details.reason === 'install') {
    console.log('ClipMaster Pro installed successfully');
    
    // Initialize default settings
    await chrome.storage.local.set({
      clipmasterSettings: {
        maxItems: 100,
        autoCategorize: true,
        showPreviews: true,
        soundNotifications: false,
        theme: 'auto'
      },
      clipboardHistory: [],
      clipmasterTemplates: []
    });
    
    // Initialize clipboard monitoring
    clipMaster.startClipboardMonitoring();
    
  } else if (details.reason === 'update') {
    console.log('ClipMaster Pro updated from version:', details.previousVersion);
    
    // Handle any migration logic here if needed
    // For now, just ensure clipboard monitoring is active
    clipMaster.startClipboardMonitoring();
  }
});
