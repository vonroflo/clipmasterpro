// ClipMaster Pro - Payment Integration with ExtensionPay
// Handles premium subscriptions and feature gating

class ClipMasterPayment {
  constructor() {
    this.extensionPay = null;
    this.isPremium = false;
    this.subscriptionStatus = 'free';
    this.trialEndDate = null;
    this.premiumFeatures = [
      'unlimited_history',
      'advanced_search',
      'cloud_sync',
      'premium_templates',
      'analytics_dashboard',
      'bulk_operations',
      'export_import',
      'priority_support'
    ];
    
    this.init();
  }

  async init() {
    try {
      // For now, initialize in local mode (no external dependencies)
      console.log('ClipMaster Payment: Initializing local payment system');
      
      // Load subscription status from local storage
      await this.loadSubscriptionStatus();
      
      // Setup demo trial for testing
      this.setupDemoTrial();
      
      console.log('Payment system initialized:', this.subscriptionStatus);
    } catch (error) {
      console.error('Error initializing payment system:', error);
      // Fallback to free mode
      this.subscriptionStatus = 'free';
      this.isPremium = false;
    }
  }

  /**
   * Setup demo trial for testing purposes
   * In production, this would integrate with ExtensionPay
   */
  setupDemoTrial() {
    // For demo purposes, allow users to try premium features
    const now = Date.now();
    const trialDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    if (!this.trialEndDate) {
      // Start trial
      this.trialEndDate = now + trialDuration;
      chrome.storage.local.set({ trialEndDate: this.trialEndDate });
      console.log('Demo trial started - 7 days of premium features');
    }
    
    // Check if trial is still active
    if (now < this.trialEndDate) {
      this.isPremium = true;
      this.subscriptionStatus = 'trial';
    }
  }

  /**
   * Open payment/upgrade modal
   * In production, this would integrate with payment processor
   */
  async openPaymentModal() {
    try {
      // For demo purposes, show upgrade information
      const userChoice = confirm(
        'Upgrade to ClipMaster Pro Premium!\n\n' +
        '✅ Unlimited clipboard history (1000+ items)\n' +
        '✅ Cloud sync across all devices\n' +
        '✅ Advanced analytics dashboard\n' +
        '✅ Unlimited templates with variables\n' +
        '✅ Advanced search filters\n' +
        '✅ Export/import capabilities\n\n' +
        'Pricing:\n' +
        '• Monthly: $2.99/month\n' +
        '• Yearly: $24.99/year (30% savings)\n\n' +
        'Click OK to simulate upgrade, or Cancel to continue with free features.'
      );
      
      if (userChoice) {
        // Simulate successful payment for demo
        this.isPremium = true;
        this.subscriptionStatus = 'premium';
        await chrome.storage.local.set({ 
          premiumStatus: 'premium',
          subscriptionDate: Date.now()
        });
        
        // Notify UI of status change
        if (window.clipMasterPopup) {
          window.clipMasterPopup.showToast('🎉 Upgraded to Premium! All features unlocked.', 'success');
          window.clipMasterPopup.updatePremiumUI();
        }
        
        console.log('Demo upgrade successful - Premium features enabled');
      }
    } catch (error) {
      console.error('Error in payment flow:', error);
      throw error;
    }
  }

  async loadSubscriptionStatus() {
    try {
      // Check local storage first for offline capability
      const stored = await chrome.storage.local.get(['premiumStatus', 'trialEndDate']);
      
      if (stored.trialEndDate) {
        this.trialEndDate = new Date(stored.trialEndDate);
      }

      // Verify with ExtensionPay
      if (this.extensionPay) {
        const user = await this.extensionPay.getUser();
        
        if (user.paid) {
          this.isPremium = true;
          this.subscriptionStatus = 'premium';
        } else if (this.isInTrial()) {
          this.subscriptionStatus = 'trial';
        } else {
          this.subscriptionStatus = 'free';
        }
      }

      // Save status locally
      await this.saveSubscriptionStatus();
      
    } catch (error) {
      console.error('Error loading subscription status:', error);
      this.subscriptionStatus = 'free';
    }
  }

  async saveSubscriptionStatus() {
    try {
      await chrome.storage.local.set({
        premiumStatus: {
          isPremium: this.isPremium,
          subscriptionStatus: this.subscriptionStatus,
          lastChecked: new Date().toISOString()
        },
        trialEndDate: this.trialEndDate?.toISOString()
      });
    } catch (error) {
      console.error('Error saving subscription status:', error);
    }
  }

  setupPaymentListeners() {
    if (this.extensionPay) {
      this.extensionPay.onPaid.addListener(() => {
        console.log('Payment successful!');
        this.isPremium = true;
        this.subscriptionStatus = 'premium';
        this.saveSubscriptionStatus();
        this.showPaymentSuccess();
      });
    }
  }

  isInTrial() {
    if (!this.trialEndDate) {
      // Start 7-day trial for new users
      this.trialEndDate = new Date();
      this.trialEndDate.setDate(this.trialEndDate.getDate() + 7);
      return true;
    }
    
    return new Date() < this.trialEndDate;
  }

  getTrialDaysRemaining() {
    if (!this.trialEndDate) return 0;
    const now = new Date();
    const diffTime = this.trialEndDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  hasFeature(featureName) {
    // Premium users have all features
    if (this.isPremium) return true;
    
    // Trial users have all features
    if (this.subscriptionStatus === 'trial') return true;
    
    // Free users have limited features
    const freeFeatures = [
      'basic_clipboard',
      'basic_search',
      'basic_templates',
      'basic_categories'
    ];
    
    return freeFeatures.includes(featureName);
  }

  getFreeLimit(limitType) {
    const freeLimits = {
      clipboardHistory: 20,
      templates: 3,
      searchFilters: 2,
      exportFormat: 'txt'
    };
    
    return freeLimits[limitType] || 0;
  }

  getPremiumLimit(limitType) {
    const premiumLimits = {
      clipboardHistory: 1000,
      templates: 100,
      searchFilters: 10,
      exportFormat: 'all'
    };
    
    return premiumLimits[limitType] || Infinity;
  }

  getCurrentLimit(limitType) {
    if (this.isPremium || this.subscriptionStatus === 'trial') {
      return this.getPremiumLimit(limitType);
    }
    return this.getFreeLimit(limitType);
  }

  async openPaymentModal(feature = null) {
    try {
      if (!this.extensionPay) {
        throw new Error('Payment system not initialized');
      }

      // Track upgrade attempt
      await this.trackEvent('upgrade_attempt', { feature });

      // Open ExtensionPay popup
      await this.extensionPay.openPaymentPage();
      
    } catch (error) {
      console.error('Error opening payment modal:', error);
      this.showPaymentError('Unable to open payment page. Please try again.');
    }
  }

  showUpgradePrompt(feature, description) {
    return {
      type: 'upgrade',
      feature,
      description,
      benefits: this.getPremiumBenefits(),
      pricing: this.getPricingInfo(),
      trialInfo: this.getTrialInfo()
    };
  }

  getPremiumBenefits() {
    return [
      {
        icon: '∞',
        title: 'Unlimited Clipboard History',
        description: 'Store 1000+ clipboard items vs 20 in free version'
      },
      {
        icon: '🔍',
        title: 'Advanced Search & Filters',
        description: 'Date ranges, content types, source filtering, regex support'
      },
      {
        icon: '📋',
        title: 'Unlimited Templates',
        description: 'Create 100+ text templates vs 3 in free version'
      },
      {
        icon: '☁️',
        title: 'Cloud Sync',
        description: 'Sync clipboard across all your devices'
      },
      {
        icon: '📊',
        title: 'Analytics Dashboard',
        description: 'Detailed usage insights and productivity metrics'
      },
      {
        icon: '📤',
        title: 'Export & Import',
        description: 'Backup data in multiple formats (JSON, CSV, TXT)'
      },
      {
        icon: '🚀',
        title: 'Priority Support',
        description: '24-hour response time and feature requests'
      }
    ];
  }

  getPricingInfo() {
    return {
      monthly: {
        price: '$2.99',
        period: 'month',
        savings: null
      },
      yearly: {
        price: '$24.99',
        period: 'year',
        savings: '30%'
      }
    };
  }

  getTrialInfo() {
    const daysRemaining = this.getTrialDaysRemaining();
    
    return {
      isInTrial: this.subscriptionStatus === 'trial',
      daysRemaining,
      hasTrialExpired: this.trialEndDate && new Date() > this.trialEndDate
    };
  }

  async trackEvent(eventName, data = {}) {
    try {
      // Anonymous usage analytics for business intelligence
      const eventData = {
        event: eventName,
        timestamp: new Date().toISOString(),
        subscriptionStatus: this.subscriptionStatus,
        ...data
      };
      
      // Store locally for now, could send to analytics service later
      const events = await chrome.storage.local.get(['analyticsEvents']) || { analyticsEvents: [] };
      events.analyticsEvents = events.analyticsEvents || [];
      events.analyticsEvents.push(eventData);
      
      // Keep only last 100 events
      if (events.analyticsEvents.length > 100) {
        events.analyticsEvents = events.analyticsEvents.slice(-100);
      }
      
      await chrome.storage.local.set(events);
      
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  showPaymentSuccess() {
    // Show success message and refresh features
    chrome.runtime.sendMessage({
      action: 'payment-success',
      message: 'Welcome to ClipMaster Pro Premium! All features are now unlocked.'
    });
  }

  showPaymentError(message) {
    chrome.runtime.sendMessage({
      action: 'payment-error',
      message: message || 'Payment failed. Please try again.'
    });
  }

  // Revenue optimization methods
  getConversionRate() {
    // Calculate free-to-premium conversion rate
    // This would be used for business analytics
  }

  getAverageRevenuePerUser() {
    // Calculate ARPU for business metrics
  }

  getPredictedRevenue() {
    // Predict monthly revenue based on current users and conversion rates
  }
}

// Global payment manager instance
let clipMasterPayment = null;

// Initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
  clipMasterPayment = new ClipMasterPayment();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClipMasterPayment;
}
