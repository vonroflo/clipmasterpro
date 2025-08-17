// ClipMaster Pro - Productivity Tool Integrations
// Enhances clipboard functionality with popular productivity tools

class ProductivityIntegrations {
  constructor() {
    this.supportedTools = {
      'docs.google.com': {
        name: 'Google Docs',
        icon: '📄',
        features: ['smart-paste', 'format-detection', 'auto-templates']
      },
      'notion.so': {
        name: 'Notion',
        icon: '🗒️',
        features: ['block-detection', 'markdown-conversion', 'template-suggestions']
      },
      'slack.com': {
        name: 'Slack',
        icon: '💬',
        features: ['message-templates', 'emoji-enhancement', 'thread-context']
      },
      'github.com': {
        name: 'GitHub',
        icon: '🐙',
        features: ['code-formatting', 'commit-templates', 'issue-templates']
      },
      'figma.com': {
        name: 'Figma',
        icon: '🎨',
        features: ['color-extraction', 'text-styles', 'component-copying']
      },
      'trello.com': {
        name: 'Trello',
        icon: '📋',
        features: ['card-templates', 'checklist-formatting', 'due-date-parsing']
      }
    };
    
    this.currentTool = null;
    this.enhancedFeatures = [];
    
    this.init();
  }

  async init() {
    // Detect current page and enable integrations
    this.detectCurrentTool();
    this.setupToolSpecificFeatures();
  }

  /**
   * Detect which productivity tool is currently active
   */
  detectCurrentTool() {
    if (typeof window === 'undefined') return;
    
    const currentDomain = window.location?.hostname;
    if (!currentDomain) return;
    
    // Find matching tool
    for (const [domain, toolInfo] of Object.entries(this.supportedTools)) {
      if (currentDomain.includes(domain) || currentDomain.endsWith(domain)) {
        this.currentTool = { domain, ...toolInfo };
        console.log(`ClipMaster Pro: Detected ${toolInfo.name} integration`);
        break;
      }
    }
  }

  /**
   * Setup tool-specific enhanced features
   */
  setupToolSpecificFeatures() {
    if (!this.currentTool) return;
    
    switch (this.currentTool.domain) {
      case 'docs.google.com':
        this.setupGoogleDocsIntegration();
        break;
      case 'notion.so':
        this.setupNotionIntegration();
        break;
      case 'slack.com':
        this.setupSlackIntegration();
        break;
      case 'github.com':
        this.setupGitHubIntegration();
        break;
      case 'figma.com':
        this.setupFigmaIntegration();
        break;
      case 'trello.com':
        this.setupTrelloIntegration();
        break;
    }
  }

  /**
   * Google Docs integration
   */
  setupGoogleDocsIntegration() {
    this.enhancedFeatures.push({
      name: 'Smart Formatting Detection',
      description: 'Automatically preserve Google Docs formatting when copying',
      enabled: true
    });

    // Enhance clipboard data with Google Docs specific information
    this.addClipboardEnhancer('google-docs', (clipboardData) => {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();
        
        return {
          ...clipboardData,
          source: 'Google Docs',
          formatting: this.extractGoogleDocsFormatting(fragment),
          wordCount: this.countWords(clipboardData.content),
          suggestedTemplates: this.suggestTemplatesForContent(clipboardData.content)
        };
      }
      return clipboardData;
    });
  }

  /**
   * Notion integration
   */
  setupNotionIntegration() {
    this.enhancedFeatures.push({
      name: 'Block Type Detection',
      description: 'Detect and preserve Notion block types and structure',
      enabled: true
    });

    this.addClipboardEnhancer('notion', (clipboardData) => {
      const blockType = this.detectNotionBlockType(clipboardData.content);
      
      return {
        ...clipboardData,
        source: 'Notion',
        blockType: blockType,
        markdown: this.convertToMarkdown(clipboardData.content),
        suggestedActions: this.getNotionSuggestedActions(blockType)
      };
    });
  }

  /**
   * Slack integration
   */
  setupSlackIntegration() {
    this.enhancedFeatures.push({
      name: 'Message Enhancement',
      description: 'Smart emoji suggestions and thread context preservation',
      enabled: true
    });

    this.addClipboardEnhancer('slack', (clipboardData) => {
      return {
        ...clipboardData,
        source: 'Slack',
        messageType: this.detectSlackMessageType(clipboardData.content),
        emojiSuggestions: this.suggestEmojis(clipboardData.content),
        threadContext: this.extractSlackThreadContext()
      };
    });
  }

  /**
   * GitHub integration
   */
  setupGitHubIntegration() {
    this.enhancedFeatures.push({
      name: 'Code Context Detection',
      description: 'Automatic language detection and syntax highlighting preservation',
      enabled: true
    });

    this.addClipboardEnhancer('github', (clipboardData) => {
      const language = this.detectProgrammingLanguage(clipboardData.content);
      
      return {
        ...clipboardData,
        source: 'GitHub',
        language: language,
        codeContext: this.extractGitHubCodeContext(),
        formattedCode: this.formatCodeForClipboard(clipboardData.content, language)
      };
    });
  }

  /**
   * Figma integration
   */
  setupFigmaIntegration() {
    this.enhancedFeatures.push({
      name: 'Design Asset Enhancement',
      description: 'Extract colors, fonts, and design tokens from copied content',
      enabled: true
    });

    this.addClipboardEnhancer('figma', (clipboardData) => {
      return {
        ...clipboardData,
        source: 'Figma',
        designTokens: this.extractFigmaDesignTokens(clipboardData.content),
        colorPalette: this.extractColors(clipboardData.content),
        textStyles: this.extractTextStyles(clipboardData.content)
      };
    });
  }

  /**
   * Trello integration
   */
  setupTrelloIntegration() {
    this.enhancedFeatures.push({
      name: 'Card Structure Detection',
      description: 'Preserve Trello card formatting and extract due dates',
      enabled: true
    });

    this.addClipboardEnhancer('trello', (clipboardData) => {
      return {
        ...clipboardData,
        source: 'Trello',
        cardStructure: this.parseTrelloCardStructure(clipboardData.content),
        dueDate: this.extractDueDate(clipboardData.content),
        checklist: this.extractChecklist(clipboardData.content)
      };
    });
  }

  /**
   * Add clipboard enhancer for specific tool
   */
  addClipboardEnhancer(toolId, enhancerFunction) {
    // Store enhancer for use when copying
    this.enhancers = this.enhancers || {};
    this.enhancers[toolId] = enhancerFunction;
  }

  /**
   * Process clipboard data with tool-specific enhancements
   */
  enhanceClipboardData(clipboardData) {
    if (!this.currentTool || !this.enhancers) {
      return clipboardData;
    }

    const toolId = this.currentTool.domain.replace('.com', '').replace('.', '-');
    const enhancer = this.enhancers[toolId];
    
    if (enhancer) {
      try {
        return enhancer(clipboardData);
      } catch (error) {
        console.error('Clipboard enhancement failed:', error);
        return clipboardData;
      }
    }
    
    return clipboardData;
  }

  /**
   * Extract Google Docs formatting information
   */
  extractGoogleDocsFormatting(fragment) {
    const formatting = {
      bold: fragment.querySelector('b, strong') !== null,
      italic: fragment.querySelector('i, em') !== null,
      underline: fragment.querySelector('u') !== null,
      fontSize: this.extractFontSize(fragment),
      fontFamily: this.extractFontFamily(fragment),
      textAlign: this.extractTextAlign(fragment)
    };
    
    return formatting;
  }

  /**
   * Detect Notion block type
   */
  detectNotionBlockType(content) {
    if (content.startsWith('# ')) return 'heading1';
    if (content.startsWith('## ')) return 'heading2';
    if (content.startsWith('### ')) return 'heading3';
    if (content.startsWith('- ') || content.startsWith('* ')) return 'bullet-list';
    if (content.match(/^\d+\. /)) return 'numbered-list';
    if (content.startsWith('> ')) return 'quote';
    if (content.startsWith('```')) return 'code-block';
    if (content.includes('TODO:') || content.includes('☐')) return 'todo';
    
    return 'paragraph';
  }

  /**
   * Convert content to Markdown
   */
  convertToMarkdown(content) {
    // Basic HTML to Markdown conversion
    return content
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<h1>(.*?)<\/h1>/g, '# $1')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1');
  }

  /**
   * Get suggested actions for Notion blocks
   */
  getNotionSuggestedActions(blockType) {
    const actions = {
      'heading1': ['Convert to template', 'Create page outline'],
      'code-block': ['Format for GitHub', 'Add syntax highlighting'],
      'todo': ['Create project template', 'Export to task manager'],
      'quote': ['Create citation template', 'Format for social media']
    };
    
    return actions[blockType] || ['Create template', 'Share'];
  }

  /**
   * Detect Slack message type
   */
  detectSlackMessageType(content) {
    if (content.includes('@channel') || content.includes('@here')) return 'announcement';
    if (content.includes('🧵') || content.includes('thread')) return 'thread-reply';
    if (content.match(/:\w+:/g)) return 'emoji-rich';
    if (content.includes('```')) return 'code-snippet';
    if (content.includes('http')) return 'link-share';
    
    return 'regular-message';
  }

  /**
   * Suggest emojis based on content
   */
  suggestEmojis(content) {
    const emojiMap = {
      'thanks': ['🙏', '👍', '❤️'],
      'great': ['🎉', '👏', '🔥'],
      'done': ['✅', '✔️', '💯'],
      'working': ['⚡', '🔨', '💪'],
      'meeting': ['📅', '🤝', '👥'],
      'urgent': ['🚨', '⚠️', '🔥'],
      'question': ['❓', '🤔', '💭']
    };
    
    const suggestions = [];
    const lowercaseContent = content.toLowerCase();
    
    for (const [keyword, emojis] of Object.entries(emojiMap)) {
      if (lowercaseContent.includes(keyword)) {
        suggestions.push(...emojis);
      }
    }
    
    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Extract Slack thread context
   */
  extractSlackThreadContext() {
    // In a real implementation, this would extract thread information
    // from the current Slack page context
    return {
      threadStarter: null,
      participantCount: 0,
      lastUpdate: null
    };
  }

  /**
   * Detect programming language
   */
  detectProgrammingLanguage(content) {
    // Simple language detection based on syntax patterns
    if (content.includes('function') && content.includes('{')) return 'javascript';
    if (content.includes('def ') && content.includes(':')) return 'python';
    if (content.includes('class') && content.includes('public')) return 'java';
    if (content.includes('const') && content.includes('=>')) return 'typescript';
    if (content.includes('#include') || content.includes('int main')) return 'cpp';
    if (content.includes('package') && content.includes('import')) return 'go';
    if (content.includes('SELECT') || content.includes('FROM')) return 'sql';
    
    return 'text';
  }

  /**
   * Extract GitHub code context
   */
  extractGitHubCodeContext() {
    // Extract repository, file, and line information from GitHub page
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length >= 3) {
      return {
        repository: `${pathParts[1]}/${pathParts[2]}`,
        file: pathParts.slice(5).join('/'),
        branch: pathParts[4] || 'main'
      };
    }
    return null;
  }

  /**
   * Format code for clipboard with metadata
   */
  formatCodeForClipboard(content, language) {
    return {
      raw: content,
      formatted: `\`\`\`${language}\n${content}\n\`\`\``,
      language: language,
      lineCount: content.split('\n').length
    };
  }

  /**
   * Extract design tokens from Figma content
   */
  extractFigmaDesignTokens(content) {
    // Parse Figma-specific design information
    return {
      spacing: this.extractSpacingTokens(content),
      typography: this.extractTypographyTokens(content),
      colors: this.extractColorTokens(content),
      borderRadius: this.extractBorderRadius(content)
    };
  }

  /**
   * Extract colors from content
   */
  extractColors(content) {
    const colorRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})|rgb\([^)]+\)|rgba\([^)]+\)/g;
    const colors = content.match(colorRegex) || [];
    return [...new Set(colors)];
  }

  /**
   * Extract text styles
   */
  extractTextStyles(content) {
    // Extract font family, size, weight information
    return {
      fontFamily: this.extractFontFamily(content),
      fontSize: this.extractFontSize(content),
      fontWeight: this.extractFontWeight(content),
      lineHeight: this.extractLineHeight(content)
    };
  }

  /**
   * Parse Trello card structure
   */
  parseTrelloCardStructure(content) {
    return {
      title: this.extractCardTitle(content),
      description: this.extractCardDescription(content),
      labels: this.extractCardLabels(content),
      members: this.extractCardMembers(content),
      attachments: this.extractCardAttachments(content)
    };
  }

  /**
   * Extract due date from content
   */
  extractDueDate(content) {
    const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|due\s+\w+\s+\d{1,2})/gi;
    const matches = content.match(dateRegex);
    return matches ? matches[0] : null;
  }

  /**
   * Extract checklist from content
   */
  extractChecklist(content) {
    const checklistRegex = /^\s*[-*☐☑✓]\s+(.+)$/gm;
    const items = [];
    let match;
    
    while ((match = checklistRegex.exec(content)) !== null) {
      items.push({
        text: match[1],
        completed: match[0].includes('☑') || match[0].includes('✓')
      });
    }
    
    return items;
  }

  /**
   * Count words in content
   */
  countWords(content) {
    return content.trim().split(/\s+/).length;
  }

  /**
   * Suggest templates based on content
   */
  suggestTemplatesForContent(content) {
    const suggestions = [];
    
    if (content.includes('meeting') || content.includes('agenda')) {
      suggestions.push('Meeting Notes Template', 'Agenda Template');
    }
    
    if (content.includes('email') || content.includes('@')) {
      suggestions.push('Email Template', 'Contact Information');
    }
    
    if (content.includes('project') || content.includes('task')) {
      suggestions.push('Project Template', 'Task List Template');
    }
    
    return suggestions;
  }

  /**
   * Helper methods for style extraction
   */
  extractFontSize(element) {
    const style = window.getComputedStyle(element);
    return style.fontSize || null;
  }

  extractFontFamily(element) {
    const style = window.getComputedStyle(element);
    return style.fontFamily || null;
  }

  extractFontWeight(element) {
    const style = window.getComputedStyle(element);
    return style.fontWeight || null;
  }

  extractLineHeight(element) {
    const style = window.getComputedStyle(element);
    return style.lineHeight || null;
  }

  extractTextAlign(element) {
    const style = window.getComputedStyle(element);
    return style.textAlign || null;
  }

  // Placeholder methods for complex extractions
  extractSpacingTokens(content) { return {}; }
  extractTypographyTokens(content) { return {}; }
  extractColorTokens(content) { return {}; }
  extractBorderRadius(content) { return null; }
  extractCardTitle(content) { return content.split('\n')[0] || ''; }
  extractCardDescription(content) { return content.split('\n').slice(1).join('\n') || ''; }
  extractCardLabels(content) { return []; }
  extractCardMembers(content) { return []; }
  extractCardAttachments(content) { return []; }

  /**
   * Get integration status
   */
  getIntegrationStatus() {
    return {
      currentTool: this.currentTool,
      enhancedFeatures: this.enhancedFeatures,
      isActive: this.currentTool !== null
    };
  }

  /**
   * Enable/disable specific integration features
   */
  toggleFeature(featureName, enabled) {
    const feature = this.enhancedFeatures.find(f => f.name === featureName);
    if (feature) {
      feature.enabled = enabled;
    }
  }
}

// Initialize productivity integrations
window.clipMasterIntegrations = new ProductivityIntegrations();
