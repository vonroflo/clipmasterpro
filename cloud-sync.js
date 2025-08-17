// ClipMaster Pro - Cloud Sync Service
// Handles encrypted cloud synchronization for Premium users

class CloudSyncService {
  constructor() {
    this.isEnabled = false;
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.encryptionKey = null;
    this.cloudEndpoint = 'https://api.clipmasterpro.com/sync'; // Replace with actual endpoint
    this.deviceId = null;
    this.syncQueue = [];
    
    this.init();
  }

  async init() {
    // Generate or retrieve device ID
    const result = await chrome.storage.local.get(['deviceId', 'cloudSyncEnabled', 'lastSyncTime']);
    
    if (!result.deviceId) {
      this.deviceId = this.generateDeviceId();
      await chrome.storage.local.set({ deviceId: this.deviceId });
    } else {
      this.deviceId = result.deviceId;
    }
    
    this.isEnabled = result.cloudSyncEnabled || false;
    this.lastSyncTime = result.lastSyncTime || null;
    
    // Initialize encryption key for Premium users
    if (this.isEnabled) {
      await this.initializeEncryption();
    }
  }

  /**
   * Generate unique device identifier
   */
  generateDeviceId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `device_${timestamp}_${randomStr}`;
  }

  /**
   * Initialize end-to-end encryption for cloud sync
   */
  async initializeEncryption() {
    try {
      // Generate or retrieve encryption key
      const result = await chrome.storage.local.get(['encryptionKey']);
      
      if (!result.encryptionKey) {
        // Generate new encryption key for first-time setup
        this.encryptionKey = await this.generateEncryptionKey();
        await chrome.storage.local.set({ 
          encryptionKey: await this.exportKey(this.encryptionKey) 
        });
      } else {
        // Import existing key
        this.encryptionKey = await this.importKey(result.encryptionKey);
      }
    } catch (error) {
      console.error('Encryption initialization failed:', error);
      this.showError('Failed to initialize secure sync. Please try again.');
    }
  }

  /**
   * Generate encryption key using Web Crypto API
   */
  async generateEncryptionKey() {
    return await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export encryption key for storage
   */
  async exportKey(key) {
    const exported = await window.crypto.subtle.exportKey('jwk', key);
    return JSON.stringify(exported);
  }

  /**
   * Import encryption key from storage
   */
  async importKey(keyData) {
    const keyObject = JSON.parse(keyData);
    return await window.crypto.subtle.importKey(
      'jwk',
      keyObject,
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data before cloud sync
   */
  async encryptData(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.encryptionKey,
      dataBuffer
    );

    return {
      encrypted: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
    };
  }

  /**
   * Decrypt data from cloud sync
   */
  async decryptData(encryptedData) {
    const iv = new Uint8Array(encryptedData.iv);
    const encrypted = new Uint8Array(encryptedData.encrypted);
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.encryptionKey,
      encrypted
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }

  /**
   * Enable cloud sync for Premium users
   */
  async enableCloudSync() {
    try {
      // Verify premium status
      if (!this.isPremiumUser()) {
        throw new Error('Cloud sync requires Premium subscription');
      }

      await this.initializeEncryption();
      this.isEnabled = true;
      
      await chrome.storage.local.set({ 
        cloudSyncEnabled: true,
        lastSyncTime: Date.now()
      });

      // Perform initial sync
      await this.performFullSync();
      
      this.showSuccess('Cloud sync enabled! Your clipboard is now synchronized across devices.');
      
      // Start periodic sync
      this.startPeriodicSync();
      
    } catch (error) {
      console.error('Cloud sync enable failed:', error);
      this.showError('Failed to enable cloud sync: ' + error.message);
    }
  }

  /**
   * Disable cloud sync
   */
  async disableCloudSync() {
    try {
      this.isEnabled = false;
      this.stopPeriodicSync();
      
      await chrome.storage.local.set({ 
        cloudSyncEnabled: false 
      });
      
      // Optionally clear cloud data
      if (confirm('Do you want to delete your data from the cloud?')) {
        await this.clearCloudData();
      }
      
      this.showSuccess('Cloud sync disabled successfully.');
      
    } catch (error) {
      console.error('Cloud sync disable failed:', error);
      this.showError('Failed to disable cloud sync: ' + error.message);
    }
  }

  /**
   * Perform full synchronization
   */
  async performFullSync() {
    if (this.syncInProgress || !this.isEnabled) return;
    
    this.syncInProgress = true;
    
    try {
      // Get local data
      const localData = await this.getLocalSyncData();
      
      // Encrypt local data
      const encryptedData = await this.encryptData(localData);
      
      // Upload to cloud
      const cloudData = await this.uploadToCloud(encryptedData);
      
      // Download latest from cloud
      const latestCloudData = await this.downloadFromCloud();
      
      if (latestCloudData) {
        // Decrypt cloud data
        const decryptedCloudData = await this.decryptData(latestCloudData);
        
        // Merge with local data
        const mergedData = this.mergeClipboardData(localData, decryptedCloudData);
        
        // Save merged data locally
        await this.saveLocalSyncData(mergedData);
        
        // Upload merged data back to cloud
        const mergedEncrypted = await this.encryptData(mergedData);
        await this.uploadToCloud(mergedEncrypted);
      }
      
      this.lastSyncTime = Date.now();
      await chrome.storage.local.set({ lastSyncTime: this.lastSyncTime });
      
      this.showSuccess('Sync completed successfully');
      
    } catch (error) {
      console.error('Sync failed:', error);
      this.showError('Sync failed: ' + error.message);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get local data for synchronization
   */
  async getLocalSyncData() {
    const result = await chrome.storage.local.get([
      'clipboardHistory',
      'clipmasterTemplates',
      'clipmasterSettings'
    ]);
    
    return {
      clipboardHistory: result.clipboardHistory || [],
      templates: result.clipmasterTemplates || [],
      settings: result.clipmasterSettings || {},
      lastModified: Date.now(),
      deviceId: this.deviceId
    };
  }

  /**
   * Save synchronized data locally
   */
  async saveLocalSyncData(data) {
    await chrome.storage.local.set({
      clipboardHistory: data.clipboardHistory,
      clipmasterTemplates: data.templates,
      clipmasterSettings: data.settings
    });
  }

  /**
   * Upload encrypted data to cloud
   */
  async uploadToCloud(encryptedData) {
    const response = await fetch(`${this.cloudEndpoint}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`,
        'X-Device-ID': this.deviceId
      },
      body: JSON.stringify({
        data: encryptedData,
        timestamp: Date.now(),
        version: '1.0'
      })
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Download encrypted data from cloud
   */
  async downloadFromCloud() {
    const response = await fetch(`${this.cloudEndpoint}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${await this.getAuthToken()}`,
        'X-Device-ID': this.deviceId
      }
    });

    if (response.status === 404) {
      // No cloud data exists yet
      return null;
    }

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Merge local and cloud clipboard data intelligently
   */
  mergeClipboardData(localData, cloudData) {
    const mergedClipboard = new Map();
    const mergedTemplates = new Map();

    // Merge clipboard history (prefer newer items)
    [...localData.clipboardHistory, ...cloudData.clipboardHistory].forEach(item => {
      const existing = mergedClipboard.get(item.id);
      if (!existing || new Date(item.timestamp) > new Date(existing.timestamp)) {
        mergedClipboard.set(item.id, item);
      }
    });

    // Merge templates (prefer newer versions)
    [...localData.templates, ...cloudData.templates].forEach(template => {
      const existing = mergedTemplates.get(template.id);
      const templateDate = new Date(template.modified || template.created);
      const existingDate = existing ? new Date(existing.modified || existing.created) : new Date(0);
      
      if (!existing || templateDate > existingDate) {
        mergedTemplates.set(template.id, template);
      }
    });

    // Merge settings (prefer cloud settings for most fields)
    const mergedSettings = {
      ...localData.settings,
      ...cloudData.settings,
      // Keep local theme preference
      theme: localData.settings.theme || cloudData.settings.theme
    };

    return {
      clipboardHistory: Array.from(mergedClipboard.values())
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      templates: Array.from(mergedTemplates.values()),
      settings: mergedSettings,
      lastModified: Math.max(localData.lastModified, cloudData.lastModified),
      deviceId: this.deviceId
    };
  }

  /**
   * Get authentication token for cloud API
   */
  async getAuthToken() {
    // In a real implementation, this would get the token from ExtensionPay
    // For now, return a placeholder
    return 'premium_user_token_from_extensionpay';
  }

  /**
   * Check if user has premium subscription
   */
  isPremiumUser() {
    // Check with local payment manager
    if (window.clipMasterPayment) {
      return window.clipMasterPayment.isPremium && 
             window.clipMasterPayment.hasFeature('cloud_sync');
    }
    return false;
  }

  /**
   * Start periodic background sync
   */
  startPeriodicSync() {
    // Sync every 5 minutes for active users
    this.syncInterval = setInterval(() => {
      if (this.isEnabled && !this.syncInProgress) {
        this.performFullSync();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Clear all cloud data
   */
  async clearCloudData() {
    const response = await fetch(`${this.cloudEndpoint}/clear`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${await this.getAuthToken()}`,
        'X-Device-ID': this.deviceId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to clear cloud data: ${response.status}`);
    }
  }

  /**
   * Get sync status information
   */
  getSyncStatus() {
    return {
      enabled: this.isEnabled,
      inProgress: this.syncInProgress,
      lastSync: this.lastSyncTime,
      deviceId: this.deviceId,
      deviceCount: this.getConnectedDeviceCount()
    };
  }

  /**
   * Get number of connected devices (placeholder)
   */
  async getConnectedDeviceCount() {
    try {
      const response = await fetch(`${this.cloudEndpoint}/devices`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.deviceCount || 1;
      }
    } catch (error) {
      console.error('Failed to get device count:', error);
    }
    
    return 1;
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    if (window.clipMasterPopup) {
      window.clipMasterPopup.showToast(message, 'success');
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    if (window.clipMasterPopup) {
      window.clipMasterPopup.showToast(message, 'error');
    }
  }

  /**
   * Manual sync trigger for user interface
   */
  async manualSync() {
    if (!this.isEnabled) {
      this.showError('Cloud sync is not enabled');
      return;
    }
    
    if (this.syncInProgress) {
      this.showError('Sync already in progress');
      return;
    }
    
    await this.performFullSync();
  }
}

// Initialize cloud sync service
window.clipMasterCloudSync = new CloudSyncService();
