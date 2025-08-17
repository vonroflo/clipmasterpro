// ClipMaster Pro - Popup Interface Logic
// Handles UI interactions, clipboard operations, and data display

class ClipMasterPopup {
  constructor() {
    this.clipboardHistory = [];
    this.filteredHistory = [];
    this.templates = [];
    this.currentTab = 'recent';
    this.currentFilter = '';
    this.advancedFilters = {
      type: '',
      date: '',
      source: '',
      length: '',
      dateFrom: '',
      dateTo: ''
    };
    this.isAdvancedFiltersVisible = false;
    this.currentTemplate = null;
    this.paymentManager = null;
    this.settings = {
      maxItems: 100,
      autoCategorize: true,
      showPreviews: true,
      soundNotifications: false,
      theme: 'auto'
    };

    // Performance optimization properties
    this.virtualScrolling = {
      itemHeight: 80, // Average height per item
      visibleItems: 0,
      scrollTop: 0,
      startIndex: 0,
      endIndex: 0,
      bufferSize: 5 // Extra items to render for smooth scrolling
    };
    this.domCache = new Map(); // Cache DOM elements for reuse
    this.renderQueue = []; // Queue for batched DOM updates
    this.isRendering = false;

    // Bulk operations state
    this.bulkMode = false;
    this.selectedItems = new Set();
    this.bulkExportFormats = ['txt', 'csv', 'json'];

    this.init();
  }

  async init() {
    // Initialize payment manager
    this.initializePaymentManager();
    
    // Load settings and clipboard history
    await this.loadSettings();
    await this.loadClipboardHistory();
    await this.loadTemplates();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initialize UI
    this.initializeUI();
    
    // Apply feature limits and premium UI
    await this.applyFeatureLimits();
    
    // Load current clipboard content if available
    this.loadCurrentClipboard();
  }

  /**
   * Initialize payment management system for premium features
   */
  initializePaymentManager() {
    // Wait for payment script to load
    if (typeof clipMasterPayment !== 'undefined' && clipMasterPayment) {
      this.paymentManager = clipMasterPayment;
    } else {
      // Fallback to free mode if payment system not available
      console.warn('Payment system not available, running in free mode');
      this.paymentManager = {
        hasFeature: () => false,
        getCurrentLimit: (type) => this.getFreeLimits()[type] || 0,
        showUpgradePrompt: (feature) => this.showUpgradeModal(feature)
      };
    }
  }

  /**
   * Get the limitations for free tier users
   * @returns {Object} Object containing limit values for each feature
   */
  getFreeLimits() {
    return {
      clipboardHistory: 20,
      templates: 3,
      searchFilters: 2,
      analytics: false,
      cloudSync: false,
      bulkOperations: false,
      advancedExport: false
    };
  }

  /**
   * Apply feature limitations based on subscription status
   */
  async applyFeatureLimits() {
    // Limit clipboard history
    const maxClipboardItems = this.paymentManager.getCurrentLimit('clipboardHistory');
    if (this.clipboardHistory.length > maxClipboardItems) {
      this.clipboardHistory = this.clipboardHistory.slice(0, maxClipboardItems);
      await this.saveClipboardHistory();
    }

    // Limit templates
    const maxTemplates = this.paymentManager.getCurrentLimit('templates');
    if (this.templates.length > maxTemplates) {
      this.templates = this.templates.slice(0, maxTemplates);
      await this.saveTemplates();
    }

    // Show premium badges and locks
    this.updatePremiumUI();
  }

  /**
   * Update UI to reflect premium status and feature availability
   * Shows premium badges, locks premium features for free users,
   * and updates subscription status indicators throughout the interface
   */
  updatePremiumUI() {
    // Add premium badge to title if user is premium
    const titleElement = document.querySelector('.header-title h1');
    if (this.paymentManager.hasFeature('unlimited_history')) {
      if (!titleElement.querySelector('.premium-badge')) {
        const badge = document.createElement('span');
        badge.className = 'premium-badge';
        badge.textContent = 'PRO';
        titleElement.appendChild(badge);
      }
    }

    // Lock premium features
    this.lockPremiumFeatures();
    
    // Update footer with subscription status
    this.updateSubscriptionStatus();
  }

  /**
   * Lock premium features for free users
   */
  lockPremiumFeatures() {
    // Lock analytics tab if not premium
    if (!this.paymentManager.hasFeature('analytics_dashboard')) {
      const analyticsTab = document.querySelector('[data-tab="analytics"]');
      if (analyticsTab) {
        analyticsTab.classList.add('premium-feature');
        analyticsTab.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.showUpgradeModal('analytics');
        });
      }
    }

    // Lock advanced filters if not premium
    if (!this.paymentManager.hasFeature('advanced_search')) {
      const advancedFiltersToggle = document.getElementById('advanced-filters-toggle');
      if (advancedFiltersToggle) {
        advancedFiltersToggle.classList.add('premium-feature');
        advancedFiltersToggle.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.showUpgradeModal('advanced_search');
        });
      }
    }
  }

  /**
   * Update footer to show subscription status
   */
  updateSubscriptionStatus() {
    const footerStats = document.querySelector('.footer-stats');
    if (footerStats) {
      // Add subscription indicator
      let subscriptionSpan = footerStats.querySelector('.subscription-status');
      if (!subscriptionSpan) {
        subscriptionSpan = document.createElement('span');
        subscriptionSpan.className = 'subscription-status';
        footerStats.appendChild(document.createElement('span')).textContent = ' • ';
        footerStats.appendChild(subscriptionSpan);
      }

      if (this.paymentManager.hasFeature('unlimited_history')) {
        subscriptionSpan.textContent = 'Premium';
        subscriptionSpan.className = 'subscription-status premium';
      } else {
        subscriptionSpan.textContent = 'Free';
        subscriptionSpan.className = 'subscription-status free';
      }
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['clipmasterSettings']);
      if (result.clipmasterSettings) {
        this.settings = { ...this.settings, ...result.clipmasterSettings };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({ clipmasterSettings: this.settings });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Load clipboard history with comprehensive error handling
   * Handles various failure scenarios gracefully
   */
  async loadClipboardHistory() {
    try {
      // Check if background script is available
      if (!chrome.runtime) {
        throw new Error('Chrome runtime not available');
      }

      const response = await chrome.runtime.sendMessage({ action: 'get-clipboard-history' });
      
      // Validate response structure
      if (!response) {
        throw new Error('No response from background script');
      }

      // Ensure we have valid array data
      if (Array.isArray(response.history)) {
        this.clipboardHistory = response.history;
      } else if (response.error) {
        throw new Error(response.error);
      } else {
        // Fallback to empty array if no valid history
        this.clipboardHistory = [];
      }

      this.filteredHistory = [...this.clipboardHistory];
      this.updateUI();

    } catch (error) {
      console.error('Error loading clipboard history:', error);
      
      // Try to load from local storage as fallback
      try {
        const fallback = await chrome.storage.local.get(['clipboardHistory']);
        this.clipboardHistory = fallback.clipboardHistory || [];
        this.filteredHistory = [...this.clipboardHistory];
        
        if (this.clipboardHistory.length > 0) {
          this.showToast('Loaded clipboard history from backup', 'warning');
        }
      } catch (fallbackError) {
        console.error('Fallback loading failed:', fallbackError);
        this.clipboardHistory = [];
        this.showToast('Unable to load clipboard history', 'error');
      }

      this.updateUI();
    }
  }

  async loadTemplates() {
    try {
      const result = await chrome.storage.local.get(['clipmasterTemplates']);
      this.templates = result.clipmasterTemplates || [];
      if (this.templates.length === 0) {
        this.createDefaultTemplates();
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      this.templates = [];
    }
  }

  async saveTemplates() {
    try {
      await chrome.storage.local.set({ clipmasterTemplates: this.templates });
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  }

  createDefaultTemplates() {
    this.templates = [
      {
        id: Date.now(),
        name: 'Email Reply',
        description: 'Professional email response template',
        content: 'Hi {{name}},\n\nThank you for your email. I\'ll review this and get back to you by {{date}}.\n\nBest regards,\n{{myname}}',
        shortcut: '',
        created: new Date().toISOString(),
        usageCount: 0
      },
      {
        id: Date.now() + 1,
        name: 'Meeting Request',
        description: 'Schedule a meeting with someone',
        content: 'Hi {{name}},\n\nI\'d like to schedule a meeting to discuss {{topic}}. Are you available on {{date}} at {{time}}?\n\nPlease let me know if this works for you.\n\nBest regards,\n{{myname}}',
        shortcut: '',
        created: new Date().toISOString(),
        usageCount: 0
      }
    ];
    this.saveTemplates();
  }

  async loadCurrentClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && !this.clipboardHistory.find(item => item.content === text)) {
        await chrome.runtime.sendMessage({
          action: 'add-clipboard-item',
          content: text,
          source: 'manual'
        });
        await this.loadClipboardHistory();
      }
    } catch (error) {
      // Clipboard access may be denied, which is fine
      console.log('Could not access current clipboard:', error.message);
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      this.filterItems(e.target.value);
    });

    document.getElementById('search-clear').addEventListener('click', () => {
      searchInput.value = '';
      this.filterItems('');
    });

    // Advanced filters
    document.getElementById('advanced-filters-toggle').addEventListener('click', () => {
      this.toggleAdvancedFilters();
    });

    document.getElementById('apply-filters').addEventListener('click', () => {
      this.applyAdvancedFilters();
    });

    document.getElementById('clear-filters').addEventListener('click', () => {
      this.clearAdvancedFilters();
    });

    document.getElementById('filter-date').addEventListener('change', (e) => {
      const customRange = document.getElementById('custom-date-range');
      if (e.target.value === 'custom') {
        customRange.style.display = 'flex';
      } else {
        customRange.style.display = 'none';
      }
    });

    // Auto-update filters on change
    ['filter-type', 'filter-source', 'filter-length', 'date-from', 'date-to'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        if (this.isAdvancedFiltersVisible) {
          this.applyAdvancedFilters();
        }
      });
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Settings
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.openSettings();
    });

    document.getElementById('settings-close').addEventListener('click', () => {
      this.closeSettings();
    });

    document.getElementById('settings-save').addEventListener('click', () => {
      this.saveSettingsFromModal();
    });

    document.getElementById('settings-cancel').addEventListener('click', () => {
      this.closeSettings();
    });

    // Clear all
    document.getElementById('clear-all').addEventListener('click', () => {
      this.clearAllItems();
    });

    // Bulk operations event listeners
    this.setupBulkOperationListeners();

    // Category cards
    document.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', (e) => {
        this.filterByCategory(e.currentTarget.dataset.category);
      });
    });

    // Paste current clipboard
    document.getElementById('paste-current').addEventListener('click', () => {
      this.pasteCurrentClipboard();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // Footer actions
    document.getElementById('export-data').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('help-btn').addEventListener('click', () => {
      this.showHelp();
    });

    // Template system
    document.getElementById('add-template').addEventListener('click', () => {
      this.openTemplateModal();
    });

    document.getElementById('template-close').addEventListener('click', () => {
      this.closeTemplateModal();
    });

    document.getElementById('template-save').addEventListener('click', () => {
      this.saveTemplate();
    });

    document.getElementById('template-cancel').addEventListener('click', () => {
      this.closeTemplateModal();
    });

    document.getElementById('template-delete').addEventListener('click', () => {
      this.deleteTemplate();
    });

    // Variable buttons
    document.querySelectorAll('.var-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.insertVariable(e.target.dataset.var);
      });
    });

    // Template content preview
    document.getElementById('template-content').addEventListener('input', () => {
      this.updateTemplatePreview();
    });

    // Variable modal
    document.getElementById('variable-close').addEventListener('click', () => {
      this.closeVariableModal();
    });

    document.getElementById('variable-apply').addEventListener('click', () => {
      this.applyTemplate();
    });

    document.getElementById('variable-cancel').addEventListener('click', () => {
      this.closeVariableModal();
    });

    // Premium upgrade modal
    document.getElementById('premium-close').addEventListener('click', () => {
      this.closePremiumModal();
    });

    document.getElementById('premium-upgrade').addEventListener('click', () => {
      this.handleUpgradeClick();
    });

    document.getElementById('premium-cancel').addEventListener('click', () => {
      this.closePremiumModal();
    });

    // Limit notification handlers
    document.getElementById('limit-upgrade').addEventListener('click', () => {
      this.showUpgradeModal('limit_reached');
    });

    document.getElementById('limit-dismiss').addEventListener('click', () => {
      this.hideLimitNotification();
    });

    // Settings and cloud sync handlers
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.openCloudSyncModal();
    });

    document.getElementById('cloud-sync-close').addEventListener('click', () => {
      this.closeCloudSyncModal();
    });

    document.getElementById('cloud-sync-cancel').addEventListener('click', () => {
      this.closeCloudSyncModal();
    });

    document.getElementById('cloud-sync-save').addEventListener('click', () => {
      this.saveCloudSyncSettings();
    });

    document.getElementById('cloud-sync-toggle').addEventListener('change', (e) => {
      this.handleCloudSyncToggle(e.target.checked);
    });

    document.getElementById('manual-sync-btn').addEventListener('click', () => {
      this.triggerManualSync();
    });

    document.getElementById('clear-cloud-data-btn').addEventListener('click', () => {
      this.clearCloudData();
    });
  }

  initializeUI() {
    this.applyTheme();
    this.updateCategoryCounts();
    this.updateFooterStats();
    
    if (this.clipboardHistory.length === 0) {
      this.showEmptyState();
    } else {
      this.hideEmptyState();
    }
  }

  switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    this.currentTab = tabName;
    this.updateTabContent();
  }

  updateTabContent() {
    switch (this.currentTab) {
      case 'recent':
        this.renderClipboardList(this.filteredHistory, 'clipboard-list');
        break;
      case 'favorites':
        const favorites = this.filteredHistory.filter(item => item.favorite);
        this.renderClipboardList(favorites, 'favorites-list');
        document.getElementById('favorites-count').textContent = `${favorites.length} items`;
        break;
      case 'categories':
        this.updateCategoryCounts();
        break;
      case 'templates':
        this.renderTemplatesList();
        break;
      case 'analytics':
        this.renderAnalyticsDashboard();
        break;
    }
  }

  /**
   * Optimized rendering with virtual scrolling for 100+ items
   */
  renderClipboardList(items, containerId) {
    const container = document.getElementById(containerId);
    
    if (items.length === 0) {
      container.textContent = '';
      const noItemsDiv = document.createElement('div');
      noItemsDiv.className = 'no-items';
      noItemsDiv.textContent = 'No items found';
      container.appendChild(noItemsDiv);
      return;
    }

    // Use virtual scrolling for large datasets (100+ items)
    if (items.length > 50) {
      this.setupVirtualScrolling(container, items);
    } else {
      // Use regular rendering for smaller datasets
      this.renderAllItems(container, items);
    }
  }

  /**
   * Setup virtual scrolling container and render visible items only
   */
  setupVirtualScrolling(container, items) {
    // Clear and setup virtual scroll container
    container.textContent = '';
    container.style.position = 'relative';
    container.style.height = '400px'; // Fixed height for scrolling
    container.style.overflowY = 'auto';

    // Create virtual content container
    const virtualContainer = document.createElement('div');
    virtualContainer.style.height = `${items.length * this.virtualScrolling.itemHeight}px`;
    virtualContainer.style.position = 'relative';
    
    // Create visible items container
    const visibleContainer = document.createElement('div');
    visibleContainer.className = 'virtual-items-container';
    visibleContainer.style.position = 'absolute';
    visibleContainer.style.top = '0';
    visibleContainer.style.width = '100%';
    
    virtualContainer.appendChild(visibleContainer);
    container.appendChild(virtualContainer);

    // Calculate visible items
    this.virtualScrolling.visibleItems = Math.ceil(container.clientHeight / this.virtualScrolling.itemHeight);
    
    // Setup scroll listener for virtual scrolling
    container.addEventListener('scroll', () => {
      this.throttle(() => this.updateVirtualScroll(container, visibleContainer, items), 16);
    });

    // Initial render
    this.updateVirtualScroll(container, visibleContainer, items);
  }

  /**
   * Update virtual scroll - render only visible items
   */
  updateVirtualScroll(container, visibleContainer, items) {
    if (this.isRendering) return;
    this.isRendering = true;

    requestAnimationFrame(() => {
      const scrollTop = container.scrollTop;
      const startIndex = Math.floor(scrollTop / this.virtualScrolling.itemHeight);
      const endIndex = Math.min(
        startIndex + this.virtualScrolling.visibleItems + this.virtualScrolling.bufferSize,
        items.length
      );

      // Clear visible container
      visibleContainer.textContent = '';
      
      // Set position offset
      visibleContainer.style.transform = `translateY(${startIndex * this.virtualScrolling.itemHeight}px)`;

      // Render visible items
      for (let i = startIndex; i < endIndex; i++) {
        const item = items[i];
        if (item) {
          const element = this.createOptimizedItemElement(item, i);
          visibleContainer.appendChild(element);
          this.addClipboardItemListeners(element);
        }
      }

      this.isRendering = false;
    });
  }

  /**
   * Render all items for smaller datasets (< 50 items)
   */
  renderAllItems(container, items) {
    // Clear container safely
    container.textContent = '';
    container.style.height = 'auto';
    container.style.position = 'static';

    // Batch DOM updates for better performance
    const fragment = document.createDocumentFragment();
    
    items.forEach(item => {
      const element = this.createClipboardItemElement(item);
      fragment.appendChild(element);
    });
    
    container.appendChild(fragment);

    // Add event listeners after all elements are in DOM
    items.forEach((item, index) => {
      const element = container.children[index];
      if (element) {
        this.addClipboardItemListeners(element);
      }
    });
  }

  /**
   * Create optimized item element for virtual scrolling
   */
  createOptimizedItemElement(item, index) {
    // Check cache first
    const cacheKey = `${item.id}-${item.timestamp}`;
    if (this.domCache.has(cacheKey)) {
      return this.domCache.get(cacheKey).cloneNode(true);
    }

    const element = this.createClipboardItemElement(item);
    
    // Cache the element (limit cache size)
    if (this.domCache.size < 100) {
      this.domCache.set(cacheKey, element.cloneNode(true));
    }

    return element;
  }

  /**
   * Throttle function for performance optimization
   */
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }

  createClipboardItemElement(item) {
    const typeIcon = this.getTypeIcon(item.type);
    const timeAgo = this.getTimeAgo(item.timestamp);
    const preview = this.settings.showPreviews ? item.preview : item.content.substring(0, 50) + '...';
    
    // Create main container
    const clipboardItem = document.createElement('div');
    clipboardItem.className = 'clipboard-item';
    clipboardItem.dataset.id = item.id;

    // Create header
    const header = document.createElement('div');
    header.className = 'item-header';
    
    const itemType = document.createElement('span');
    itemType.className = 'item-type';
    
    const typeIconSpan = document.createElement('span');
    typeIconSpan.className = 'type-icon';
    typeIconSpan.textContent = typeIcon;
    
    const typeLabel = document.createElement('span');
    typeLabel.className = 'type-label';
    typeLabel.textContent = item.type;
    
    itemType.appendChild(typeIconSpan);
    itemType.appendChild(typeLabel);
    
    const itemActions = document.createElement('div');
    itemActions.className = 'item-actions';
    
    // Create action buttons
    const favoriteBtn = this.createActionButton('favorite-btn', '⭐', 'Toggle Favorite', item.favorite);
    const formatBtn = this.createActionButton('format-btn', '🎨', 'Format Text');
    const copyBtn = this.createActionButton('copy-btn', '📋', 'Copy to Clipboard');
    const deleteBtn = this.createActionButton('delete-btn', '🗑️', 'Delete Item');
    
    itemActions.appendChild(favoriteBtn);
    itemActions.appendChild(formatBtn);
    itemActions.appendChild(copyBtn);
    itemActions.appendChild(deleteBtn);
    
    header.appendChild(itemType);
    header.appendChild(itemActions);

    // Create content
    const content = document.createElement('div');
    content.className = 'item-content';
    
    const contentPreview = document.createElement('div');
    contentPreview.className = 'content-preview';
    contentPreview.textContent = preview;
    
    const contentFull = document.createElement('div');
    contentFull.className = 'content-full hidden';
    contentFull.textContent = item.content;
    
    content.appendChild(contentPreview);
    content.appendChild(contentFull);

    // Create footer
    const footer = document.createElement('div');
    footer.className = 'item-footer';
    
    const itemTime = document.createElement('span');
    itemTime.className = 'item-time';
    itemTime.textContent = timeAgo;
    
    const itemTags = document.createElement('div');
    itemTags.className = 'item-tags';
    
    item.tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'tag';
      tagSpan.textContent = tag;
      itemTags.appendChild(tagSpan);
    });
    
    footer.appendChild(itemTime);
    footer.appendChild(itemTags);

    // Assemble the element
    clipboardItem.appendChild(header);
    clipboardItem.appendChild(content);
    clipboardItem.appendChild(footer);

    return clipboardItem;
  }

  createActionButton(className, icon, title, isActive = false) {
    const button = document.createElement('button');
    button.className = `action-btn ${className}${isActive ? ' active' : ''}`;
    button.title = title;
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    iconSpan.textContent = icon;
    
    button.appendChild(iconSpan);
    return button;
  }

  addClipboardItemListeners(element) {
    const itemId = parseInt(element.dataset.id);
    
    // Copy button
    element.querySelector('.copy-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.copyToClipboard(itemId);
    });

    // Favorite button
    element.querySelector('.favorite-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFavorite(itemId);
    });

    // Format button
    element.querySelector('.format-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openFormatModal(itemId);
    });

    // Delete button
    element.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteItem(itemId);
    });

    // Click to copy
    element.addEventListener('click', () => {
      this.copyToClipboard(itemId);
    });

    // Double-click to expand
    element.addEventListener('dblclick', () => {
      this.toggleItemExpansion(element);
    });
  }

  /**
   * Copy clipboard item to system clipboard with comprehensive error handling
   * Includes fallback methods and user feedback
   */
  async copyToClipboard(itemId) {
    const item = this.clipboardHistory.find(item => item.id === itemId);
    if (!item) {
      this.showToast('Clipboard item not found', 'error');
      return;
    }

    try {
      // Check if Clipboard API is available
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }

      // Validate content before copying
      if (!item.content || typeof item.content !== 'string') {
        throw new Error('Invalid clipboard content');
      }

      await navigator.clipboard.writeText(item.content);
      
      // Add visual feedback
      const itemElement = document.querySelector(`[data-id="${itemId}"]`);
      if (itemElement) {
        itemElement.classList.add('copying');
        setTimeout(() => itemElement.classList.remove('copying'), 600);
      }
      
      this.showToast('Copied to clipboard!', 'success');
      
      // Update usage statistics
      item.lastUsed = new Date().toISOString();
      item.usageCount = (item.usageCount || 0) + 1;
      
      // Move item to top of recent list
      this.clipboardHistory = this.clipboardHistory.filter(i => i.id !== itemId);
      this.clipboardHistory.unshift(item);
      this.filteredHistory = [...this.clipboardHistory];
      
      // Save updated history
      await this.saveClipboardHistory();
      this.updateUI();

    } catch (error) {
      console.error('Error copying to clipboard:', error);
      
      // Try fallback method
      try {
        await this.fallbackCopyToClipboard(item.content);
        this.showToast('Copied to clipboard (fallback method)', 'success');
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
        
        // Show helpful error message based on error type
        let errorMessage = 'Failed to copy to clipboard';
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Clipboard access denied. Please check browser permissions.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Clipboard not available. Try right-clicking to copy.';
        }
        
        this.showToast(errorMessage, 'error');
      }
    }
  }

  /**
   * Fallback clipboard copy method for browsers without Clipboard API
   */
  async fallbackCopyToClipboard(text) {
    return new Promise((resolve, reject) => {
      try {
        // Create temporary textarea
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        textarea.style.opacity = '0';
        
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        // Try document.execCommand as fallback
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (successful) {
          resolve();
        } else {
          reject(new Error('execCommand copy failed'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Save clipboard history with error handling and retry logic
   */
  async saveClipboardHistory() {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Validate data before saving
        if (!Array.isArray(this.clipboardHistory)) {
          throw new Error('Invalid clipboard history data');
        }

        // Check storage quota before saving
        const estimate = await navigator.storage?.estimate?.();
        if (estimate && estimate.usage > estimate.quota * 0.9) {
          throw new Error('Storage quota exceeded');
        }

        await chrome.storage.local.set({ clipboardHistory: this.clipboardHistory });
        return; // Success, exit retry loop

      } catch (error) {
        retryCount++;
        console.error(`Save attempt ${retryCount} failed:`, error);

        if (retryCount >= maxRetries) {
          // Handle specific error types
          if (error.message.includes('quota')) {
            this.handleStorageQuotaExceeded();
          } else {
            this.showToast('Failed to save clipboard history', 'error');
          }
          throw error;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
      }
    }
  }

  /**
   * Handle storage quota exceeded scenario
   */
  handleStorageQuotaExceeded() {
    // Remove oldest items to free up space
    const itemsToRemove = Math.floor(this.clipboardHistory.length * 0.3);
    this.clipboardHistory = this.clipboardHistory.slice(0, -itemsToRemove);
    
    this.showToast(`Storage full. Removed ${itemsToRemove} old items.`, 'warning');
    
    // Try to save again
    this.saveClipboardHistory().catch(error => {
      console.error('Failed to save after cleanup:', error);
      this.showToast('Critical: Unable to save clipboard data', 'error');
    });
  }

  async toggleFavorite(itemId) {
    try {
      await chrome.runtime.sendMessage({
        action: 'toggle-favorite',
        id: itemId
      });
      
      const item = this.clipboardHistory.find(item => item.id === itemId);
      if (item) {
        item.favorite = !item.favorite;
        
        // Add visual feedback
        const itemElement = document.querySelector(`[data-id="${itemId}"]`);
        if (itemElement && item.favorite) {
          itemElement.classList.add('favorited');
          setTimeout(() => itemElement.classList.remove('favorited'), 500);
        }
        
        this.updateUI();
        this.showToast(item.favorite ? 'Added to favorites' : 'Removed from favorites', 'info');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }

  async deleteItem(itemId) {
    try {
      await chrome.runtime.sendMessage({
        action: 'delete-clipboard-item',
        id: itemId
      });
      
      this.clipboardHistory = this.clipboardHistory.filter(item => item.id !== itemId);
      this.filteredHistory = this.filteredHistory.filter(item => item.id !== itemId);
      
      this.updateUI();
      this.showToast('Item deleted', 'info');
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }

  toggleItemExpansion(element) {
    const preview = element.querySelector('.content-preview');
    const full = element.querySelector('.content-full');
    
    if (full.classList.contains('hidden')) {
      preview.classList.add('hidden');
      full.classList.remove('hidden');
    } else {
      preview.classList.remove('hidden');
      full.classList.add('hidden');
    }
  }

  filterItems(query) {
    this.currentFilter = query.toLowerCase();
    this.applyAllFilters();
  }

  applyAllFilters() {
    let filtered = [...this.clipboardHistory];

    // Apply text search filter
    if (this.currentFilter) {
      filtered = filtered.filter(item => 
        item.content.toLowerCase().includes(this.currentFilter) ||
        item.type.toLowerCase().includes(this.currentFilter) ||
        item.tags.some(tag => tag.toLowerCase().includes(this.currentFilter))
      );
    }

    // Apply advanced filters
    filtered = this.applyAdvancedFiltersToItems(filtered);

    this.filteredHistory = filtered;
    this.updateTabContent();
    this.updateFilterResultsCount();
  }

  applyAdvancedFiltersToItems(items) {
    let filtered = items;

    // Type filter
    if (this.advancedFilters.type) {
      filtered = filtered.filter(item => item.type === this.advancedFilters.type);
    }

    // Date filter
    if (this.advancedFilters.date) {
      filtered = this.applyDateFilter(filtered, this.advancedFilters.date);
    }

    // Custom date range filter
    if (this.advancedFilters.dateFrom || this.advancedFilters.dateTo) {
      filtered = this.applyCustomDateFilter(filtered);
    }

    // Source filter
    if (this.advancedFilters.source) {
      filtered = filtered.filter(item => {
        const source = item.source;
        if (typeof source === 'string') return source.includes(this.advancedFilters.source);
        if (typeof source === 'object' && source.hostname) {
          return source.hostname.includes(this.advancedFilters.source);
        }
        return false;
      });
    }

    // Length filter
    if (this.advancedFilters.length) {
      filtered = this.applyLengthFilter(filtered, this.advancedFilters.length);
    }

    return filtered;
  }

  applyDateFilter(items, dateFilter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return items.filter(item => {
      const itemDate = new Date(item.timestamp);
      
      switch (dateFilter) {
        case 'today':
          return itemDate >= today;
        case 'yesterday':
          return itemDate >= yesterday && itemDate < today;
        case 'week':
          return itemDate >= weekAgo;
        case 'month':
          return itemDate >= monthAgo;
        default:
          return true;
      }
    });
  }

  applyCustomDateFilter(items) {
    const fromDate = this.advancedFilters.dateFrom ? new Date(this.advancedFilters.dateFrom) : null;
    const toDate = this.advancedFilters.dateTo ? new Date(this.advancedFilters.dateTo + 'T23:59:59') : null;

    return items.filter(item => {
      const itemDate = new Date(item.timestamp);
      
      if (fromDate && itemDate < fromDate) return false;
      if (toDate && itemDate > toDate) return false;
      
      return true;
    });
  }

  applyLengthFilter(items, lengthFilter) {
    return items.filter(item => {
      const length = item.content.length;
      
      switch (lengthFilter) {
        case 'short':
          return length < 50;
        case 'medium':
          return length >= 50 && length <= 200;
        case 'long':
          return length > 200;
        default:
          return true;
      }
    });
  }

  filterByCategory(category) {
    this.switchTab('categories');
    this.filteredHistory = this.clipboardHistory.filter(item => item.type === category);
    this.renderClipboardList(this.filteredHistory, 'category-items');
  }

  updateCategoryCounts() {
    const counts = {
      text: 0,
      url: 0,
      code: 0,
      email: 0
    };

    this.clipboardHistory.forEach(item => {
      if (counts.hasOwnProperty(item.type)) {
        counts[item.type]++;
      }
    });

    Object.keys(counts).forEach(type => {
      const element = document.getElementById(`${type}-count`);
      if (element) {
        element.textContent = counts[type];
      }
    });
  }

  updateFooterStats() {
    document.getElementById('total-items').textContent = `${this.clipboardHistory.length} items`;
    
    // Calculate storage usage (rough estimate)
    const totalBytes = JSON.stringify(this.clipboardHistory).length;
    const maxBytes = 5 * 1024 * 1024; // 5MB rough estimate for storage quota
    const usagePercent = Math.round((totalBytes / maxBytes) * 100);
    document.getElementById('storage-usage').textContent = `${usagePercent}% used`;
  }

  async clearAllItems() {
    if (confirm('Are you sure you want to clear all clipboard history?')) {
      try {
        await chrome.runtime.sendMessage({ action: 'clear-history' });
        this.clipboardHistory = [];
        this.filteredHistory = [];
        this.updateUI();
        this.showEmptyState();
        this.showToast('Clipboard history cleared', 'info');
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    }
  }

  async pasteCurrentClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        await chrome.runtime.sendMessage({
          action: 'add-clipboard-item',
          content: text,
          source: 'manual'
        });
        await this.loadClipboardHistory();
        this.showToast('Current clipboard content added', 'success');
      }
    } catch (error) {
      console.error('Error accessing clipboard:', error);
      this.showToast('Could not access clipboard', 'error');
    }
  }

  toggleTheme() {
    const body = document.body;
    const currentTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.classList.remove('light-theme', 'dark-theme');
    body.classList.add(`${newTheme}-theme`);
    
    this.settings.theme = newTheme;
    this.saveSettings();
    
    const themeIcon = document.querySelector('#theme-toggle .icon');
    themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  }

  applyTheme() {
    const body = document.body;
    let theme = this.settings.theme;
    
    if (theme === 'auto') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    body.classList.remove('light-theme', 'dark-theme');
    body.classList.add(`${theme}-theme`);
    
    const themeIcon = document.querySelector('#theme-toggle .icon');
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  openSettings() {
    const modal = document.getElementById('settings-modal');
    modal.classList.remove('hidden');
    
    // Populate settings form
    document.getElementById('max-items-setting').value = this.settings.maxItems;
    document.getElementById('auto-categorize').checked = this.settings.autoCategorize;
    document.getElementById('show-previews').checked = this.settings.showPreviews;
    document.getElementById('sound-notifications').checked = this.settings.soundNotifications;
  }

  closeSettings() {
    const modal = document.getElementById('settings-modal');
    modal.classList.add('hidden');
  }

  saveSettingsFromModal() {
    this.settings.maxItems = parseInt(document.getElementById('max-items-setting').value);
    this.settings.autoCategorize = document.getElementById('auto-categorize').checked;
    this.settings.showPreviews = document.getElementById('show-previews').checked;
    this.settings.soundNotifications = document.getElementById('sound-notifications').checked;
    
    this.saveSettings();
    this.closeSettings();
    this.showToast('Settings saved', 'success');
  }

  handleKeyboardShortcuts(e) {
    // Escape to close modals
    if (e.key === 'Escape') {
      this.closeSettings();
    }
    
    // Number keys to switch tabs
    if (e.key >= '1' && e.key <= '3') {
      const tabs = ['recent', 'favorites', 'categories'];
      this.switchTab(tabs[parseInt(e.key) - 1]);
    }
    
    // Ctrl+F to focus search
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search-input').focus();
    }
  }

  exportData() {
    const data = {
      history: this.clipboardHistory,
      settings: this.settings,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `clipmaster-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showToast('Data exported successfully', 'success');
  }

  showHelp() {
    // Use the existing help system - just open it
    this.showToast('Help documentation is available in the comprehensive help system. Click Help in the footer for detailed guides.', 'info');
  }

  showEmptyState() {
    document.getElementById('empty-state').classList.remove('hidden');
    document.querySelector('.clipmaster-main').classList.add('hidden');
  }

  hideEmptyState() {
    document.getElementById('empty-state').classList.add('hidden');
    document.querySelector('.clipmaster-main').classList.remove('hidden');
  }

  toggleAdvancedFilters() {
    const panel = document.getElementById('advanced-filters');
    const toggle = document.getElementById('advanced-filters-toggle');
    
    this.isAdvancedFiltersVisible = !this.isAdvancedFiltersVisible;
    
    if (this.isAdvancedFiltersVisible) {
      panel.classList.remove('hidden');
      toggle.classList.add('active');
      this.populateSourceFilter();
      this.updateFilterResultsCount();
    } else {
      panel.classList.add('hidden');
      toggle.classList.remove('active');
    }
  }

  applyAdvancedFilters() {
    // Collect filter values
    this.advancedFilters.type = document.getElementById('filter-type').value;
    this.advancedFilters.date = document.getElementById('filter-date').value;
    this.advancedFilters.source = document.getElementById('filter-source').value;
    this.advancedFilters.length = document.getElementById('filter-length').value;
    this.advancedFilters.dateFrom = document.getElementById('date-from').value;
    this.advancedFilters.dateTo = document.getElementById('date-to').value;

    // Apply all filters
    this.applyAllFilters();
  }

  clearAdvancedFilters() {
    // Reset filter values
    this.advancedFilters = {
      type: '',
      date: '',
      source: '',
      length: '',
      dateFrom: '',
      dateTo: ''
    };

    // Clear UI elements
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-source').value = '';
    document.getElementById('filter-length').value = '';
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    document.getElementById('custom-date-range').style.display = 'none';

    // Clear text search too
    document.getElementById('search-input').value = '';
    this.currentFilter = '';

    // Reapply filters (which will show all items)
    this.applyAllFilters();

    this.showToast('Filters cleared', 'info');
  }

  populateSourceFilter() {
    const sourceSelect = document.getElementById('filter-source');
    const sources = new Set();

    // Collect unique sources
    this.clipboardHistory.forEach(item => {
      if (item.source) {
        if (typeof item.source === 'string') {
          sources.add(item.source);
        } else if (typeof item.source === 'object' && item.source.hostname) {
          sources.add(item.source.hostname);
        }
      }
    });

    // Clear existing options (except first one)
    while (sourceSelect.children.length > 1) {
      sourceSelect.removeChild(sourceSelect.lastChild);
    }

    // Add source options
    Array.from(sources).sort().forEach(source => {
      const option = document.createElement('option');
      option.value = source;
      option.textContent = source;
      sourceSelect.appendChild(option);
    });
  }

  updateFilterResultsCount() {
    const count = this.filteredHistory.length;
    const total = this.clipboardHistory.length;
    const countElement = document.getElementById('filter-results-count');
    
    if (count === total) {
      countElement.textContent = `${count} items`;
    } else {
      countElement.textContent = `${count} of ${total} items match`;
    }
  }

  renderTemplatesList() {
    const container = document.getElementById('templates-list');
    
    // Clear container safely
    container.textContent = '';
    
    if (this.templates.length === 0) {
      const noItemsDiv = document.createElement('div');
      noItemsDiv.className = 'no-items';
      noItemsDiv.textContent = 'No templates yet. Create your first template!';
      container.appendChild(noItemsDiv);
      return;
    }

    // Create elements safely without innerHTML
    this.templates.forEach(template => {
      const element = this.createTemplateItemElement(template);
      container.appendChild(element);
      this.addTemplateItemListeners(element);
    });
  }

  createTemplateItemElement(template) {
    const preview = template.content.substring(0, 100) + (template.content.length > 100 ? '...' : '');
    const usageText = template.usageCount === 1 ? '1 use' : `${template.usageCount} uses`;
    
    // Create main container
    const templateItem = document.createElement('div');
    templateItem.className = 'template-item';
    templateItem.dataset.id = template.id;

    // Create header
    const header = document.createElement('div');
    header.className = 'template-header';
    
    const templateName = document.createElement('div');
    templateName.className = 'template-name';
    templateName.textContent = template.name;
    
    const templateActions = document.createElement('div');
    templateActions.className = 'template-actions';
    
    // Create action buttons
    const useBtn = this.createActionButton('use-template-btn', '▶️', 'Use Template');
    const editBtn = this.createActionButton('edit-template-btn', '✏️', 'Edit Template');
    const deleteBtn = this.createActionButton('delete-template-btn', '🗑️', 'Delete Template');
    
    templateActions.appendChild(useBtn);
    templateActions.appendChild(editBtn);
    templateActions.appendChild(deleteBtn);
    
    header.appendChild(templateName);
    header.appendChild(templateActions);
    
    templateItem.appendChild(header);

    // Add description if exists
    if (template.description) {
      const description = document.createElement('div');
      description.className = 'template-description';
      description.textContent = template.description;
      templateItem.appendChild(description);
    }

    // Create preview
    const previewDiv = document.createElement('div');
    previewDiv.className = 'template-preview';
    previewDiv.textContent = preview;
    templateItem.appendChild(previewDiv);

    // Create footer
    const footer = document.createElement('div');
    footer.className = 'item-footer';
    
    const itemTime = document.createElement('span');
    itemTime.className = 'item-time';
    itemTime.textContent = usageText;
    footer.appendChild(itemTime);
    
    if (template.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.className = 'template-shortcut';
      shortcut.textContent = template.shortcut;
      footer.appendChild(shortcut);
    }
    
    templateItem.appendChild(footer);

    return templateItem;
  }

  addTemplateItemListeners(element) {
    const templateId = parseInt(element.dataset.id);
    
    // Use template button
    element.querySelector('.use-template-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.useTemplate(templateId);
    });

    // Edit template button
    element.querySelector('.edit-template-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.editTemplate(templateId);
    });

    // Delete template button
    element.querySelector('.delete-template-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.confirmDeleteTemplate(templateId);
    });

    // Click to use template
    element.addEventListener('click', () => {
      this.useTemplate(templateId);
    });
  }

  openTemplateModal(template = null) {
    const modal = document.getElementById('template-modal');
    const title = document.getElementById('template-modal-title');
    const deleteBtn = document.getElementById('template-delete');
    
    this.currentTemplate = template;
    
    if (template) {
      title.textContent = 'Edit Template';
      deleteBtn.classList.remove('hidden');
      this.populateTemplateForm(template);
    } else {
      title.textContent = 'Create New Template';
      deleteBtn.classList.add('hidden');
      this.clearTemplateForm();
    }
    
    modal.classList.remove('hidden');
    document.getElementById('template-name').focus();
  }

  closeTemplateModal() {
    const modal = document.getElementById('template-modal');
    modal.classList.add('hidden');
    this.currentTemplate = null;
  }

  populateTemplateForm(template) {
    document.getElementById('template-name').value = template.name;
    document.getElementById('template-description').value = template.description || '';
    document.getElementById('template-content').value = template.content;
    document.getElementById('template-shortcut').value = template.shortcut || '';
    this.updateTemplatePreview();
  }

  clearTemplateForm() {
    document.getElementById('template-name').value = '';
    document.getElementById('template-description').value = '';
    document.getElementById('template-content').value = '';
    document.getElementById('template-shortcut').value = '';
    document.getElementById('template-preview-content').textContent = 'Enter template content to see preview...';
  }

  async saveTemplate() {
    const name = document.getElementById('template-name').value.trim();
    const description = document.getElementById('template-description').value.trim();
    const content = document.getElementById('template-content').value.trim();
    const shortcut = document.getElementById('template-shortcut').value.trim();

    if (!name || !content) {
      this.showToast('Please enter template name and content', 'error');
      return;
    }

    if (this.currentTemplate) {
      // Edit existing template
      const template = this.templates.find(t => t.id === this.currentTemplate.id);
      if (template) {
        template.name = name;
        template.description = description;
        template.content = content;
        template.shortcut = shortcut;
        template.modified = new Date().toISOString();
      }
    } else {
      // Create new template - check limits first
      if (!this.checkTemplateLimit()) {
        return; // Limit reached, show upgrade prompt
      }

      const newTemplate = {
        id: Date.now(),
        name: name,
        description: description,
        content: content,
        shortcut: shortcut,
        created: new Date().toISOString(),
        usageCount: 0
      };
      this.templates.push(newTemplate);
    }

    await this.saveTemplates();
    this.closeTemplateModal();
    this.updateTabContent();
    this.showToast('Template saved successfully', 'success');
  }

  /**
   * Check if adding a new template would exceed limits
   */
  checkTemplateLimit() {
    const maxTemplates = this.paymentManager.getCurrentLimit('templates');
    if (this.templates.length >= maxTemplates) {
      this.showLimitNotification(
        'Template Limit Reached',
        `Free accounts are limited to ${maxTemplates} templates. Upgrade to Premium for unlimited templates.`
      );
      return false;
    }
    return true;
  }

  /**
   * Show premium upgrade modal with specific feature context
   */
  showUpgradeModal(feature) {
    const modal = document.getElementById('premium-modal');
    const featureTitle = document.getElementById('premium-feature-title');
    const featureDescription = document.getElementById('premium-feature-description');

    // Customize modal content based on feature
    const featureMessages = {
      'analytics': {
        title: 'Unlock Analytics Dashboard',
        description: 'Get detailed insights into your clipboard usage patterns and productivity metrics'
      },
      'advanced_search': {
        title: 'Unlock Advanced Search',
        description: 'Use powerful filters, date ranges, and regex search to find exactly what you need'
      },
      'unlimited_templates': {
        title: 'Unlimited Templates',
        description: 'Create as many text templates as you need for maximum productivity'
      },
      'limit_reached': {
        title: 'Upgrade to Premium',
        description: 'Remove all limits and unlock the full power of ClipMaster Pro'
      }
    };

    const message = featureMessages[feature] || featureMessages['limit_reached'];
    featureTitle.textContent = message.title;
    featureDescription.textContent = message.description;

    // Update trial info if applicable
    this.updateTrialInfo();

    modal.classList.remove('hidden');
  }

  /**
   * Close premium upgrade modal
   */
  closePremiumModal() {
    const modal = document.getElementById('premium-modal');
    modal.classList.add('hidden');
  }

  /**
   * Handle upgrade button click
   */
  async handleUpgradeClick() {
    try {
      if (this.paymentManager && this.paymentManager.openPaymentModal) {
        await this.paymentManager.openPaymentModal();
      } else {
        // Fallback - show external link or error
        this.showToast('Payment system unavailable. Please try again later.', 'error');
      }
    } catch (error) {
      console.error('Error opening payment modal:', error);
      this.showToast('Error opening payment page', 'error');
    }
  }

  /**
   * Show limit notification
   */
  showLimitNotification(title, description) {
    const notification = document.getElementById('limit-notification');
    const titleElement = document.getElementById('limit-title');
    const descriptionElement = document.getElementById('limit-description');

    titleElement.textContent = title;
    descriptionElement.textContent = description;

    notification.classList.remove('hidden');

    // Auto-hide after 10 seconds
    setTimeout(() => {
      this.hideLimitNotification();
    }, 10000);
  }

  /**
   * Hide limit notification
   */
  hideLimitNotification() {
    const notification = document.getElementById('limit-notification');
    notification.classList.add('hidden');
  }

  /**
   * Update trial information in premium modal
   */
  updateTrialInfo() {
    const trialInfo = document.getElementById('premium-trial-info');
    const trialDays = document.getElementById('trial-days');

    if (this.paymentManager && this.paymentManager.getTrialInfo) {
      const trial = this.paymentManager.getTrialInfo();
      
      if (trial.isInTrial) {
        trialDays.textContent = trial.daysRemaining;
        trialInfo.classList.remove('hidden');
      } else {
        trialInfo.classList.add('hidden');
      }
    } else {
      trialInfo.classList.add('hidden');
    }
  }

  /**
   * Open cloud sync settings modal
   */
  openCloudSyncModal() {
    const modal = document.getElementById('cloud-sync-modal');
    this.updateCloudSyncUI();
    modal.classList.remove('hidden');
  }

  /**
   * Close cloud sync settings modal
   */
  closeCloudSyncModal() {
    const modal = document.getElementById('cloud-sync-modal');
    modal.classList.add('hidden');
  }

  /**
   * Update cloud sync UI with current status
   */
  async updateCloudSyncUI() {
    const cloudSync = window.clipMasterCloudSync;
    const isPremium = this.paymentManager?.hasFeature('cloud_sync') || false;
    
    // Update toggle availability
    const toggle = document.getElementById('cloud-sync-toggle');
    const manualSyncBtn = document.getElementById('manual-sync-btn');
    const clearDataBtn = document.getElementById('clear-cloud-data-btn');
    
    toggle.disabled = !isPremium;
    
    if (!isPremium) {
      // Show premium required state
      document.getElementById('sync-status-title').textContent = 'Premium Required';
      document.getElementById('sync-status-description').textContent = 'Upgrade to Premium to sync across devices';
      document.getElementById('sync-status-icon').textContent = '🔒';
      toggle.checked = false;
      manualSyncBtn.disabled = true;
      clearDataBtn.disabled = true;
      document.getElementById('sync-info-section').style.display = 'none';
      return;
    }

    // Get sync status
    const syncStatus = cloudSync.getSyncStatus();
    
    // Update toggle state
    toggle.checked = syncStatus.enabled;
    
    // Update status display
    if (syncStatus.enabled) {
      document.getElementById('sync-status-title').textContent = 'Cloud Sync Enabled';
      document.getElementById('sync-status-description').textContent = 'Your clipboard syncs across all devices';
      document.getElementById('sync-status-icon').textContent = '✅';
      document.getElementById('sync-info-section').style.display = 'block';
      manualSyncBtn.disabled = false;
      clearDataBtn.disabled = false;
      
      // Update sync info
      const lastSync = syncStatus.lastSync;
      document.getElementById('last-sync-time').textContent = lastSync 
        ? this.formatRelativeTime(lastSync) 
        : 'Never';
      
      document.getElementById('device-count').textContent = await cloudSync.getConnectedDeviceCount();
      document.getElementById('device-id-display').textContent = syncStatus.deviceId.substring(0, 12) + '...';
      
    } else {
      document.getElementById('sync-status-title').textContent = 'Cloud Sync Disabled';
      document.getElementById('sync-status-description').textContent = 'Your clipboard data is stored locally only';
      document.getElementById('sync-status-icon').textContent = '☁️';
      document.getElementById('sync-info-section').style.display = 'none';
      manualSyncBtn.disabled = true;
      clearDataBtn.disabled = true;
    }
  }

  /**
   * Handle cloud sync toggle change
   */
  async handleCloudSyncToggle(enabled) {
    const cloudSync = window.clipMasterCloudSync;
    
    try {
      if (enabled) {
        await cloudSync.enableCloudSync();
      } else {
        await cloudSync.disableCloudSync();
      }
      
      // Update UI after change
      await this.updateCloudSyncUI();
      
    } catch (error) {
      console.error('Cloud sync toggle failed:', error);
      this.showToast('Failed to update cloud sync: ' + error.message, 'error');
      
      // Revert toggle state
      document.getElementById('cloud-sync-toggle').checked = !enabled;
    }
  }

  /**
   * Save cloud sync settings
   */
  async saveCloudSyncSettings() {
    // Settings are automatically saved when toggle changes
    this.closeCloudSyncModal();
    this.showToast('Settings saved successfully', 'success');
  }

  /**
   * Trigger manual sync
   */
  async triggerManualSync() {
    const cloudSync = window.clipMasterCloudSync;
    const manualSyncBtn = document.getElementById('manual-sync-btn');
    
    // Show loading state
    const originalText = manualSyncBtn.textContent;
    manualSyncBtn.textContent = '⏳ Syncing...';
    manualSyncBtn.disabled = true;
    
    try {
      await cloudSync.manualSync();
      await this.updateCloudSyncUI();
      await this.loadClipboardHistory(); // Refresh UI with synced data
      
    } catch (error) {
      console.error('Manual sync failed:', error);
      this.showToast('Sync failed: ' + error.message, 'error');
    } finally {
      // Restore button state
      manualSyncBtn.textContent = originalText;
      manualSyncBtn.disabled = false;
    }
  }

  /**
   * Clear cloud data with confirmation
   */
  async clearCloudData() {
    const confirmed = confirm(
      'Are you sure you want to delete all your clipboard data from the cloud?\n\n' +
      'This action cannot be undone and will affect all your connected devices.'
    );
    
    if (!confirmed) return;
    
    const cloudSync = window.clipMasterCloudSync;
    const clearDataBtn = document.getElementById('clear-cloud-data-btn');
    
    // Show loading state
    const originalText = clearDataBtn.textContent;
    clearDataBtn.textContent = '⏳ Clearing...';
    clearDataBtn.disabled = true;
    
    try {
      await cloudSync.clearCloudData();
      await this.updateCloudSyncUI();
      this.showToast('Cloud data cleared successfully', 'success');
      
    } catch (error) {
      console.error('Clear cloud data failed:', error);
      this.showToast('Failed to clear cloud data: ' + error.message, 'error');
    } finally {
      // Restore button state
      clearDataBtn.textContent = originalText;
      clearDataBtn.disabled = false;
    }
  }

  /**
   * Format relative time for last sync display
   */
  formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }

  async deleteTemplate() {
    if (!this.currentTemplate) return;

    if (confirm(`Are you sure you want to delete the template "${this.currentTemplate.name}"?`)) {
      this.templates = this.templates.filter(t => t.id !== this.currentTemplate.id);
      await this.saveTemplates();
      this.closeTemplateModal();
      this.updateTabContent();
      this.showToast('Template deleted', 'info');
    }
  }

  confirmDeleteTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    if (confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      this.templates = this.templates.filter(t => t.id !== templateId);
      this.saveTemplates();
      this.updateTabContent();
      this.showToast('Template deleted', 'info');
    }
  }

  editTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (template) {
      this.openTemplateModal(template);
    }
  }

  useTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    const variables = this.extractVariables(template.content);
    
    if (variables.length > 0) {
      this.openVariableModal(template, variables);
    } else {
      this.copyTemplateToClipboard(template.content);
      this.incrementTemplateUsage(templateId);
    }
  }

  extractVariables(content) {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = new Set();
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1]);
    }
    
    return Array.from(variables);
  }

  openVariableModal(template, variables) {
    const modal = document.getElementById('variable-modal');
    const container = document.getElementById('variable-inputs');
    
    // Store current template for processing
    this.currentTemplate = template;
    
    // Clear container safely
    container.textContent = '';
    
    // Generate input fields for variables safely
    variables.forEach(variable => {
      const inputGroup = document.createElement('div');
      inputGroup.className = 'variable-input-group';
      
      const label = document.createElement('label');
      label.setAttribute('for', `var-${variable}`);
      label.textContent = `${this.formatVariableName(variable)}:`;
      
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `var-${variable}`;
      input.placeholder = `Enter ${variable}...`;
      input.value = this.getVariableDefault(variable);
      
      inputGroup.appendChild(label);
      inputGroup.appendChild(input);
      container.appendChild(inputGroup);
    });
    
    modal.classList.remove('hidden');
    
    // Focus first input
    const firstInput = container.querySelector('input');
    if (firstInput) firstInput.focus();
  }

  closeVariableModal() {
    const modal = document.getElementById('variable-modal');
    modal.classList.add('hidden');
  }

  formatVariableName(variable) {
    return variable.charAt(0).toUpperCase() + variable.slice(1);
  }

  getVariableDefault(variable) {
    const defaults = {
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      myname: 'Your Name'
    };
    return defaults[variable] || '';
  }

  async applyTemplate() {
    if (!this.currentTemplate) return;

    let content = this.currentTemplate.content;
    const inputs = document.querySelectorAll('#variable-inputs input');
    
    inputs.forEach(input => {
      const variable = input.id.replace('var-', '');
      const value = input.value || this.getVariableDefault(variable);
      content = content.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
    });

    await this.copyTemplateToClipboard(content);
    this.incrementTemplateUsage(this.currentTemplate.id);
    this.closeVariableModal();
  }

  async copyTemplateToClipboard(content) {
    try {
      await navigator.clipboard.writeText(content);
      this.showToast('Template copied to clipboard!', 'success');
      
      // Add to clipboard history
      await chrome.runtime.sendMessage({
        action: 'add-clipboard-item',
        content: content,
        source: 'template'
      });
      
      await this.loadClipboardHistory();
    } catch (error) {
      console.error('Error copying template to clipboard:', error);
      this.showToast('Failed to copy template', 'error');
    }
  }

  incrementTemplateUsage(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (template) {
      template.usageCount++;
      template.lastUsed = new Date().toISOString();
      this.saveTemplates();
      this.updateTabContent();
    }
  }

  insertVariable(variable) {
    const textarea = document.getElementById('template-content');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    textarea.value = text.substring(0, start) + variable + text.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    textarea.focus();
    
    this.updateTemplatePreview();
  }

  updateTemplatePreview() {
    const content = document.getElementById('template-content').value;
    const preview = document.getElementById('template-preview-content');
    
    if (!content.trim()) {
      preview.textContent = 'Enter template content to see preview...';
      return;
    }

    // Replace variables with sample values for preview
    let previewContent = content;
    const sampleValues = {
      name: 'John Doe',
      email: 'john@example.com',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      company: 'Acme Corp',
      myname: 'Your Name',
      topic: 'Project Discussion'
    };

    Object.keys(sampleValues).forEach(key => {
      previewContent = previewContent.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        sampleValues[key]
      );
    });

    preview.textContent = previewContent;
  }

  updateUI() {
    this.updateTabContent();
    this.updateCategoryCounts();
    this.updateFooterStats();
    this.updateFilterResultsCount();
    
    if (this.clipboardHistory.length === 0) {
      this.showEmptyState();
    } else {
      this.hideEmptyState();
    }
  }

  /**
   * Enhanced notification system with multiple types and sound feedback
   */
  showToast(message, type = 'info', options = {}) {
    const {
      duration = 3000,
      sound = this.settings.soundNotifications,
      persistent = false,
      actions = []
    } = options;

    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Create toast content
    const toastContent = document.createElement('div');
    toastContent.className = 'toast-content';
    
    // Add icon based on type
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = this.getToastIcon(type);
    
    // Add message
    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;
    
    toastContent.appendChild(icon);
    toastContent.appendChild(messageSpan);
    
    // Add action buttons if provided
    if (actions.length > 0) {
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'toast-actions';
      
      actions.forEach(action => {
        const button = document.createElement('button');
        button.className = 'toast-action-btn';
        button.textContent = action.text;
        button.addEventListener('click', () => {
          action.handler();
          this.dismissToast(toast);
        });
        actionsContainer.appendChild(button);
      });
      
      toastContent.appendChild(actionsContainer);
    }
    
    // Add close button for persistent toasts
    if (persistent) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => this.dismissToast(toast));
      toastContent.appendChild(closeBtn);
    }
    
    toast.appendChild(toastContent);
    container.appendChild(toast);
    
    // Play sound notification if enabled
    if (sound) {
      this.playNotificationSound(type);
    }
    
    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Auto-dismiss non-persistent toasts
    if (!persistent) {
      setTimeout(() => {
        this.dismissToast(toast);
      }, duration);
    }
    
    // Return toast element for manual control
    return toast;
  }

  /**
   * Dismiss a toast notification
   */
  dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Get icon for toast type
   */
  getToastIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      loading: '⏳'
    };
    return icons[type] || 'ℹ️';
  }

  /**
   * Play notification sound based on type
   */
  playNotificationSound(type) {
    if (!this.settings.soundNotifications) return;
    
    try {
      // Create audio context for Web Audio API
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Different frequencies for different notification types
      const frequencies = {
        success: [523.25, 659.25], // C5, E5
        error: [220, 185], // A3, F#3
        warning: [440, 554.37], // A4, C#5
        info: [392, 523.25], // G4, C5
        loading: [329.63] // E4
      };
      
      const noteFreqs = frequencies[type] || frequencies.info;
      this.playTones(noteFreqs);
      
    } catch (error) {
      console.warn('Audio notification failed:', error);
    }
  }

  /**
   * Play sequence of tones for notification
   */
  playTones(frequencies) {
    if (!this.audioContext) return;
    
    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
      oscillator.type = 'sine';
      
      // Set volume and duration
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
      
      // Start and stop the tone
      const startTime = this.audioContext.currentTime + (index * 0.1);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    });
  }

  /**
   * Show loading notification with progress
   */
  showLoadingToast(message, progressCallback) {
    const toast = this.showToast(message, 'loading', { persistent: true });
    
    // Add progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'toast-progress';
    const progressFill = document.createElement('div');
    progressFill.className = 'toast-progress-fill';
    progressBar.appendChild(progressFill);
    
    toast.querySelector('.toast-content').appendChild(progressBar);
    
    // Return update function
    return {
      updateProgress: (percent) => {
        progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      },
      updateMessage: (newMessage) => {
        toast.querySelector('.toast-message').textContent = newMessage;
      },
      complete: (successMessage) => {
        this.dismissToast(toast);
        if (successMessage) {
          this.showToast(successMessage, 'success');
        }
      },
      error: (errorMessage) => {
        this.dismissToast(toast);
        this.showToast(errorMessage, 'error');
      }
    };
  }

  /**
   * Show confirmation dialog as toast
   */
  showConfirmToast(message, onConfirm, onCancel) {
    return this.showToast(message, 'warning', {
      persistent: true,
      actions: [
        {
          text: 'Yes',
          handler: () => {
            if (onConfirm) onConfirm();
          }
        },
        {
          text: 'No',
          handler: () => {
            if (onCancel) onCancel();
          }
        }
      ]
    });
  }

  getTypeIcon(type) {
    const icons = {
      text: '📝',
      url: '🔗',
      code: '💻',
      email: '📧',
      phone: '📞'
    };
    return icons[type] || '📄';
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Setup bulk operations event listeners
   */
  setupBulkOperationListeners() {
    // Select all checkboxes
    ['select-all-items', 'select-all-favorites'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', (e) => {
          this.toggleSelectAll(e.target.checked, id.includes('favorites'));
        });
      }
    });

    // Bulk action buttons
    const bulkActions = [
      { id: 'bulk-delete', handler: () => this.bulkDelete() },
      { id: 'bulk-favorite', handler: () => this.bulkToggleFavorite(true) },
      { id: 'bulk-unfavorite', handler: () => this.bulkToggleFavorite(false) },
      { id: 'bulk-export', handler: () => this.bulkExport() },
      { id: 'bulk-delete-favorites', handler: () => this.bulkDelete() },
      { id: 'bulk-export-favorites', handler: () => this.bulkExport() }
    ];

    bulkActions.forEach(({ id, handler }) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', handler);
      }
    });
  }

  /**
   * Toggle bulk selection mode
   */
  toggleBulkMode(enabled = !this.bulkMode) {
    this.bulkMode = enabled;
    this.selectedItems.clear();
    
    // Show/hide bulk operations bars
    const bulkBars = ['bulk-operations', 'bulk-operations-favorites'];
    bulkBars.forEach(id => {
      const bar = document.getElementById(id);
      if (bar) {
        bar.style.display = enabled ? 'flex' : 'none';
      }
    });

    // Update clipboard items to show checkboxes
    document.querySelectorAll('.clipboard-item').forEach(item => {
      if (enabled) {
        item.classList.add('bulk-mode');
        this.addCheckboxToItem(item);
      } else {
        item.classList.remove('bulk-mode', 'selected');
        const checkbox = item.querySelector('.clipboard-item-checkbox');
        if (checkbox) checkbox.remove();
      }
    });

    this.updateBulkSelectionCounts();
  }

  /**
   * Add checkbox to clipboard item
   */
  addCheckboxToItem(itemElement) {
    if (itemElement.querySelector('.clipboard-item-checkbox')) return;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'clipboard-item-checkbox';
    checkbox.addEventListener('change', (e) => {
      this.toggleItemSelection(itemElement.dataset.id, e.target.checked);
    });

    itemElement.style.position = 'relative';
    itemElement.insertBefore(checkbox, itemElement.firstChild);
  }

  /**
   * Toggle item selection
   */
  toggleItemSelection(itemId, selected) {
    if (selected) {
      this.selectedItems.add(itemId);
    } else {
      this.selectedItems.delete(itemId);
    }

    const itemElement = document.querySelector(`[data-id="${itemId}"]`);
    if (itemElement) {
      itemElement.classList.toggle('selected', selected);
    }

    this.updateBulkSelectionCounts();
  }

  /**
   * Toggle select all items
   */
  toggleSelectAll(selectAll, isFavorites = false) {
    const items = isFavorites ? 
      this.clipboardHistory.filter(item => item.favorite) : 
      this.filteredHistory;

    items.forEach(item => {
      this.toggleItemSelection(item.id, selectAll);
      const checkbox = document.querySelector(`[data-id="${item.id}"] .clipboard-item-checkbox`);
      if (checkbox) {
        checkbox.checked = selectAll;
      }
    });

    this.updateBulkSelectionCounts();
  }

  /**
   * Update bulk selection counts
   */
  updateBulkSelectionCounts() {
    const totalSelected = this.selectedItems.size;
    
    ['selected-count', 'selected-favorites-count'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = totalSelected;
      }
    });

    // Auto-hide bulk bar if no items selected
    if (totalSelected === 0 && this.bulkMode) {
      this.toggleBulkMode(false);
    } else if (totalSelected > 0 && !this.bulkMode) {
      this.toggleBulkMode(true);
    }
  }

  /**
   * Bulk delete selected items
   */
  async bulkDelete() {
    if (this.selectedItems.size === 0) return;

    // Check premium feature limit
    if (!this.paymentManager.hasFeature('bulkOperations')) {
      this.showUpgradeModal('bulk operations');
      return;
    }

    const confirmed = confirm(`Delete ${this.selectedItems.size} selected items?`);
    if (!confirmed) return;

    try {
      // Remove selected items from history
      this.clipboardHistory = this.clipboardHistory.filter(
        item => !this.selectedItems.has(item.id)
      );

      await this.saveClipboardHistory();
      this.selectedItems.clear();
      this.toggleBulkMode(false);
      this.updateTabContent();
      
      this.showToast(`${this.selectedItems.size} items deleted`, 'success');
    } catch (error) {
      console.error('Bulk delete error:', error);
      this.showToast('Failed to delete items', 'error');
    }
  }

  /**
   * Bulk toggle favorite status
   */
  async bulkToggleFavorite(favorite = true) {
    if (this.selectedItems.size === 0) return;

    // Check premium feature limit
    if (!this.paymentManager.hasFeature('bulkOperations')) {
      this.showUpgradeModal('bulk operations');
      return;
    }

    try {
      this.selectedItems.forEach(itemId => {
        const item = this.clipboardHistory.find(h => h.id === itemId);
        if (item) {
          item.favorite = favorite;
        }
      });

      await this.saveClipboardHistory();
      this.selectedItems.clear();
      this.toggleBulkMode(false);
      this.updateTabContent();

      const action = favorite ? 'added to' : 'removed from';
      this.showToast(`${this.selectedItems.size} items ${action} favorites`, 'success');
    } catch (error) {
      console.error('Bulk favorite error:', error);
      this.showToast('Failed to update favorites', 'error');
    }
  }

  /**
   * Bulk export selected items
   */
  async bulkExport() {
    if (this.selectedItems.size === 0) return;

    // Check premium feature limit
    if (!this.paymentManager.hasFeature('advancedExport')) {
      this.showUpgradeModal('export functionality');
      return;
    }

    // Get selected items
    const selectedData = this.clipboardHistory.filter(
      item => this.selectedItems.has(item.id)
    );

    // Show export format modal
    this.showExportModal(selectedData);
  }

  /**
   * Show export format selection modal
   */
  showExportModal(data) {
    // Create modal dynamically
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal export-modal">
        <div class="modal-header">
          <h3>Export ${data.length} Items</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="export-options">
            <label class="export-option">
              <input type="radio" name="format" value="txt" checked>
              <span>Plain Text (.txt)</span>
            </label>
            <label class="export-option">
              <input type="radio" name="format" value="csv">
              <span>CSV Spreadsheet (.csv)</span>
            </label>
            <label class="export-option">
              <input type="radio" name="format" value="json">
              <span>JSON Data (.json)</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary modal-cancel">Cancel</button>
          <button class="btn-primary modal-export">Export</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.querySelector('.modal-cancel').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('.modal-export').addEventListener('click', () => {
      const format = modal.querySelector('input[name="format"]:checked').value;
      this.exportData(data, format);
      document.body.removeChild(modal);
    });
  }

  /**
   * Export data in specified format
   */
  exportData(data, format) {
    let content = '';
    let filename = '';
    let mimeType = '';

    const timestamp = new Date().toISOString().slice(0, 10);

    switch (format) {
      case 'txt':
        content = data.map(item => 
          `[${new Date(item.timestamp).toLocaleString()}] ${item.type.toUpperCase()}\n${item.content}\n${'-'.repeat(50)}`
        ).join('\n\n');
        filename = `clipmaster-export-${timestamp}.txt`;
        mimeType = 'text/plain';
        break;

      case 'csv':
        const csvHeaders = 'Timestamp,Type,Content,Source,Favorite';
        const csvRows = data.map(item => 
          `"${item.timestamp}","${item.type}","${item.content.replace(/"/g, '""')}","${item.source || ''}","${item.favorite || false}"`
        );
        content = [csvHeaders, ...csvRows].join('\n');
        filename = `clipmaster-export-${timestamp}.csv`;
        mimeType = 'text/csv';
        break;

      case 'json':
        content = JSON.stringify(data, null, 2);
        filename = `clipmaster-export-${timestamp}.json`;
        mimeType = 'application/json';
        break;
    }

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    this.showToast(`Exported ${data.length} items as ${format.toUpperCase()}`, 'success');
  }

  /**
   * Open text formatting modal
   */
  openFormatModal(itemId) {
    const item = this.clipboardHistory.find(h => h.id === itemId);
    if (!item) return;

    this.currentFormatItem = item;
    this.originalText = item.content;
    this.currentFormattedText = item.content;

    // Setup modal
    const modal = document.getElementById('format-modal');
    const previewText = document.getElementById('format-preview-text');
    
    previewText.value = this.currentFormattedText;
    modal.classList.remove('hidden');

    // Setup event listeners
    this.setupFormatModalListeners();
  }

  /**
   * Setup formatting modal event listeners
   */
  setupFormatModalListeners() {
    // Format buttons
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        this.applyTextFormatting(action);
      });
    });

    // Modal controls
    document.getElementById('format-close').addEventListener('click', () => {
      this.closeFormatModal();
    });

    document.getElementById('format-reset').addEventListener('click', () => {
      this.resetFormatting();
    });

    document.getElementById('format-copy').addEventListener('click', () => {
      this.copyFormattedText();
    });

    document.getElementById('format-apply').addEventListener('click', () => {
      this.applyFormatting();
    });
  }

  /**
   * Apply text formatting transformation
   */
  applyTextFormatting(action) {
    let text = this.currentFormattedText;

    switch (action) {
      case 'uppercase':
        text = text.toUpperCase();
        break;
      case 'lowercase':
        text = text.toLowerCase();
        break;
      case 'titlecase':
        text = text.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        break;
      case 'sentencecase':
        text = text.toLowerCase().replace(/(^\w|\.\s+\w)/g, l => l.toUpperCase());
        break;
      case 'trim':
        text = text.trim();
        break;
      case 'removeextraspaces':
        text = text.replace(/\s+/g, ' ').trim();
        break;
      case 'removelinebreaks':
        text = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
        break;
      case 'normalizelinebreaks':
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        break;
      case 'reverse':
        text = text.split('').reverse().join('');
        break;
      case 'sort-lines':
        text = text.split('\n').sort().join('\n');
        break;
      case 'remove-duplicates':
        const lines = text.split('\n');
        text = [...new Set(lines)].join('\n');
        break;
      case 'add-line-numbers':
        const numberedLines = text.split('\n').map((line, index) => `${index + 1}. ${line}`);
        text = numberedLines.join('\n');
        break;
      case 'escape-html':
        text = this.escapeHTML(text);
        break;
      case 'unescape-html':
        text = text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        break;
      case 'encode-url':
        text = encodeURIComponent(text);
        break;
      case 'decode-url':
        try {
          text = decodeURIComponent(text);
        } catch (e) {
          this.showToast('Invalid URL encoding', 'error');
          return;
        }
        break;
    }

    this.currentFormattedText = text;
    document.getElementById('format-preview-text').value = text;

    // Highlight the active button temporarily
    const button = document.querySelector(`[data-action="${action}"]`);
    if (button) {
      button.classList.add('active');
      setTimeout(() => button.classList.remove('active'), 300);
    }
  }

  /**
   * Reset formatting to original text
   */
  resetFormatting() {
    this.currentFormattedText = this.originalText;
    document.getElementById('format-preview-text').value = this.currentFormattedText;
  }

  /**
   * Copy formatted text to clipboard without saving
   */
  async copyFormattedText() {
    try {
      await navigator.clipboard.writeText(this.currentFormattedText);
      this.showToast('Formatted text copied to clipboard', 'success');
      this.closeFormatModal();
    } catch (error) {
      console.error('Copy error:', error);
      this.showToast('Failed to copy formatted text', 'error');
    }
  }

  /**
   * Apply formatting and save to clipboard history
   */
  async applyFormatting() {
    if (!this.currentFormatItem) return;

    try {
      // Update the item content
      this.currentFormatItem.content = this.currentFormattedText;
      this.currentFormatItem.preview = this.currentFormattedText.substring(0, 100) + '...';
      this.currentFormatItem.timestamp = new Date().toISOString();

      // Save to storage
      await this.saveClipboardHistory();
      
      // Update UI
      this.updateTabContent();
      
      this.showToast('Text formatting applied and saved', 'success');
      this.closeFormatModal();
    } catch (error) {
      console.error('Apply formatting error:', error);
      this.showToast('Failed to apply formatting', 'error');
    }
  }

  /**
   * Close formatting modal
   */
  closeFormatModal() {
    document.getElementById('format-modal').classList.add('hidden');
    this.currentFormatItem = null;
    this.originalText = '';
    this.currentFormattedText = '';

    // Remove event listeners to prevent memory leaks
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.replaceWith(btn.cloneNode(true));
    });
  }

  /**
   * Render comprehensive analytics dashboard
   */
  renderAnalyticsDashboard() {
    // Check if user has premium analytics access
    if (!this.paymentManager.hasFeature('analytics')) {
      this.showAnalyticsUpgrade();
      return;
    }

    const analytics = this.generateAnalytics();
    this.updateAnalyticsOverview(analytics);
    this.renderTypeDistributionChart(analytics.typeDistribution);
    this.renderActivityChart(analytics.dailyActivity);
    this.renderSourceStats(analytics.sourceStats);
    this.renderTemplateUsageStats(analytics.templateStats);
    this.renderProductivityInsights(analytics.insights);
  }

  /**
   * Show analytics upgrade prompt for free users
   */
  showAnalyticsUpgrade() {
    const dashboard = document.querySelector('.analytics-dashboard');
    dashboard.innerHTML = `
      <div class="premium-feature-prompt">
        <div class="premium-icon">📊</div>
        <h3>Premium Analytics Dashboard</h3>
        <p>Get detailed insights into your clipboard usage patterns, productivity metrics, and optimization recommendations.</p>
        <div class="feature-preview">
          <div class="preview-item">📈 Daily activity trends</div>
          <div class="preview-item">📋 Content type analysis</div>
          <div class="preview-item">🔍 Source website tracking</div>
          <div class="preview-item">⚡ Productivity insights</div>
          <div class="preview-item">📊 Template usage statistics</div>
        </div>
        <button class="btn-primary upgrade-btn" onclick="window.clipMasterPopup.showUpgradeModal('analytics')">
          Upgrade to Premium
        </button>
      </div>
    `;
  }

  /**
   * Generate comprehensive analytics data
   */
  generateAnalytics() {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Basic stats
    const totalClips = this.clipboardHistory.length;
    const clipsToday = this.clipboardHistory.filter(item => 
      new Date(item.timestamp).toDateString() === now.toDateString()
    ).length;
    
    const clipsLast7Days = this.clipboardHistory.filter(item => 
      new Date(item.timestamp) >= last7Days
    ).length;

    // Type distribution
    const typeDistribution = {};
    this.clipboardHistory.forEach(item => {
      typeDistribution[item.type] = (typeDistribution[item.type] || 0) + 1;
    });

    // Daily activity (last 7 days)
    const dailyActivity = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toDateString();
      dailyActivity[dateStr] = this.clipboardHistory.filter(item =>
        new Date(item.timestamp).toDateString() === dateStr
      ).length;
    }

    // Source statistics
    const sourceStats = {};
    this.clipboardHistory.forEach(item => {
      if (item.source) {
        const source = typeof item.source === 'string' ? item.source : item.source.hostname || item.source.title || 'Unknown';
        sourceStats[source] = (sourceStats[source] || 0) + 1;
      }
    });

    // Template usage stats
    const templateStats = this.templates.map(template => ({
      name: template.name,
      usageCount: template.usageCount || 0,
      lastUsed: template.lastUsed || template.createdAt
    })).sort((a, b) => b.usageCount - a.usageCount);

    // Generate insights
    const insights = this.generateProductivityInsights({
      totalClips,
      clipsToday,
      clipsLast7Days,
      typeDistribution,
      sourceStats,
      templateStats
    });

    return {
      totalClips,
      clipsToday,
      avgDaily: Math.round(clipsLast7Days / 7),
      mostUsedType: Object.keys(typeDistribution).reduce((a, b) => 
        typeDistribution[a] > typeDistribution[b] ? a : b, 'text'
      ),
      typeDistribution,
      dailyActivity,
      sourceStats,
      templateStats,
      insights
    };
  }

  /**
   * Update analytics overview cards
   */
  updateAnalyticsOverview(analytics) {
    document.getElementById('total-clips').textContent = analytics.totalClips;
    document.getElementById('clips-today').textContent = analytics.clipsToday;
    document.getElementById('avg-daily').textContent = analytics.avgDaily;
    document.getElementById('most-used-type').textContent = 
      analytics.mostUsedType.charAt(0).toUpperCase() + analytics.mostUsedType.slice(1);
  }

  /**
   * Render type distribution chart
   */
  renderTypeDistributionChart(typeDistribution) {
    const chartContainer = document.getElementById('type-chart');
    chartContainer.innerHTML = '';

    const total = Object.values(typeDistribution).reduce((sum, count) => sum + count, 0);
    
    Object.entries(typeDistribution).forEach(([type, count]) => {
      const percentage = total > 0 ? (count / total * 100) : 0;
      
      const barContainer = document.createElement('div');
      barContainer.className = 'chart-bar-container';
      
      const label = document.createElement('div');
      label.className = 'chart-label';
      label.textContent = `${type} (${count})`;
      
      const barWrapper = document.createElement('div');
      barWrapper.className = 'chart-bar-wrapper';
      
      const bar = document.createElement('div');
      bar.className = `chart-bar chart-bar-${type}`;
      bar.style.width = `${percentage}%`;
      bar.title = `${type}: ${count} items (${percentage.toFixed(1)}%)`;
      
      const percentageLabel = document.createElement('span');
      percentageLabel.className = 'chart-percentage';
      percentageLabel.textContent = `${percentage.toFixed(1)}%`;
      
      barWrapper.appendChild(bar);
      barWrapper.appendChild(percentageLabel);
      barContainer.appendChild(label);
      barContainer.appendChild(barWrapper);
      chartContainer.appendChild(barContainer);
    });
  }

  /**
   * Render daily activity chart
   */
  renderActivityChart(dailyActivity) {
    const chartContainer = document.getElementById('activity-chart');
    chartContainer.innerHTML = '';

    const maxActivity = Math.max(...Object.values(dailyActivity), 1);
    
    Object.entries(dailyActivity).forEach(([date, count]) => {
      const dayName = new Date(date).toLocaleDateString('en', { weekday: 'short' });
      const height = (count / maxActivity) * 100;
      
      const barContainer = document.createElement('div');
      barContainer.className = 'activity-bar-container';
      
      const bar = document.createElement('div');
      bar.className = 'activity-bar';
      bar.style.height = `${height}%`;
      bar.title = `${dayName}: ${count} clips`;
      
      const label = document.createElement('div');
      label.className = 'activity-label';
      label.textContent = dayName;
      
      const count_label = document.createElement('div');
      count_label.className = 'activity-count';
      count_label.textContent = count;
      
      barContainer.appendChild(count_label);
      barContainer.appendChild(bar);
      barContainer.appendChild(label);
      chartContainer.appendChild(barContainer);
    });
  }

  /**
   * Render source statistics
   */
  renderSourceStats(sourceStats) {
    const container = document.getElementById('source-stats');
    container.innerHTML = '';

    const sortedSources = Object.entries(sourceStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10); // Top 10 sources

    if (sortedSources.length === 0) {
      container.innerHTML = '<div class="no-stats">No source data available</div>';
      return;
    }

    sortedSources.forEach(([source, count]) => {
      const sourceItem = document.createElement('div');
      sourceItem.className = 'source-item';
      
      const sourceName = document.createElement('div');
      sourceName.className = 'source-name';
      sourceName.textContent = source;
      
      const sourceCount = document.createElement('div');
      sourceCount.className = 'source-count';
      sourceCount.textContent = count;
      
      sourceItem.appendChild(sourceName);
      sourceItem.appendChild(sourceCount);
      container.appendChild(sourceItem);
    });
  }

  /**
   * Render template usage statistics
   */
  renderTemplateUsageStats(templateStats) {
    const container = document.getElementById('template-usage-stats');
    container.innerHTML = '';

    if (templateStats.length === 0) {
      container.innerHTML = '<div class="no-stats">No templates created yet</div>';
      return;
    }

    templateStats.slice(0, 5).forEach(template => {
      const templateItem = document.createElement('div');
      templateItem.className = 'template-stat-item';
      
      const templateInfo = document.createElement('div');
      templateInfo.className = 'template-info';
      
      const templateName = document.createElement('div');
      templateName.className = 'template-name';
      templateName.textContent = template.name;
      
      const templateMeta = document.createElement('div');
      templateMeta.className = 'template-meta';
      templateMeta.textContent = `Used ${template.usageCount} times`;
      
      templateInfo.appendChild(templateName);
      templateInfo.appendChild(templateMeta);
      
      const usageBar = document.createElement('div');
      usageBar.className = 'template-usage-bar';
      const maxUsage = Math.max(...templateStats.map(t => t.usageCount), 1);
      const width = (template.usageCount / maxUsage) * 100;
      usageBar.style.width = `${width}%`;
      
      templateItem.appendChild(templateInfo);
      templateItem.appendChild(usageBar);
      container.appendChild(templateItem);
    });
  }

  /**
   * Generate AI-powered productivity insights
   */
  generateProductivityInsights(data) {
    const insights = [];
    
    // Activity patterns
    if (data.avgDaily < 5) {
      insights.push({
        type: 'tip',
        title: 'Low Usage Detected',
        message: 'You could benefit from using ClipMaster more frequently. Try setting up keyboard shortcuts for faster access.'
      });
    } else if (data.avgDaily > 50) {
      insights.push({
        type: 'warning',
        title: 'High Activity',
        message: 'Consider organizing your clips with favorites and templates for better efficiency.'
      });
    }

    // Type distribution insights
    const { typeDistribution } = data;
    const urlPercentage = (typeDistribution.url || 0) / data.totalClips * 100;
    if (urlPercentage > 40) {
      insights.push({
        type: 'suggestion',
        title: 'URL Heavy Usage',
        message: 'You copy many URLs. Consider using bookmark management for better organization.'
      });
    }

    // Template insights
    if (data.templateStats.length === 0) {
      insights.push({
        type: 'feature',
        title: 'Templates Opportunity',
        message: 'Create templates for frequently used text to save time and ensure consistency.'
      });
    } else if (data.templateStats.length > 0 && data.templateStats[0].usageCount === 0) {
      insights.push({
        type: 'reminder',
        title: 'Unused Templates',
        message: 'You have templates that haven\'t been used. Consider deleting unused ones or promoting their usage.'
      });
    }

    // Source diversity
    const sourceCount = Object.keys(data.sourceStats).length;
    if (sourceCount > 20) {
      insights.push({
        type: 'insight',
        title: 'Diverse Sources',
        message: `You copy from ${sourceCount} different sources. This shows good research habits!`
      });
    }

    // Time-based insights
    if (data.clipsToday === 0 && data.totalClips > 10) {
      insights.push({
        type: 'engagement',
        title: 'No Activity Today',
        message: 'Start your productive day by copying something useful to your clipboard!'
      });
    }

    return insights;
  }

  /**
   * Render productivity insights
   */
  renderProductivityInsights(insights) {
    const container = document.getElementById('productivity-insights');
    container.innerHTML = '';

    if (insights.length === 0) {
      container.innerHTML = '<div class="no-insights">Looking good! Check back later for more insights.</div>';
      return;
    }

    insights.forEach(insight => {
      const insightItem = document.createElement('div');
      insightItem.className = `insight-item insight-${insight.type}`;
      
      const insightIcon = document.createElement('div');
      insightIcon.className = 'insight-icon';
      insightIcon.textContent = this.getInsightIcon(insight.type);
      
      const insightContent = document.createElement('div');
      insightContent.className = 'insight-content';
      
      const insightTitle = document.createElement('div');
      insightTitle.className = 'insight-title';
      insightTitle.textContent = insight.title;
      
      const insightMessage = document.createElement('div');
      insightMessage.className = 'insight-message';
      insightMessage.textContent = insight.message;
      
      insightContent.appendChild(insightTitle);
      insightContent.appendChild(insightMessage);
      insightItem.appendChild(insightIcon);
      insightItem.appendChild(insightContent);
      container.appendChild(insightItem);
    });
  }

  /**
   * Get icon for insight type
   */
  getInsightIcon(type) {
    const icons = {
      tip: '💡',
      warning: '⚠️',
      suggestion: '🎯',
      feature: '✨',
      reminder: '🔔',
      insight: '🧠',
      engagement: '🚀'
    };
    return icons[type] || '📊';
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.clipMasterPopup = new ClipMasterPopup();
});
