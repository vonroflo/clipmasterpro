// ClipMaster Pro - User Onboarding System
// Provides guided introduction for new users

class ClipMasterOnboarding {
  constructor() {
    this.currentStep = 0;
    this.totalSteps = 5;
    this.hasSeenOnboarding = false;
    this.tourElements = [];
    
    this.init();
  }

  async init() {
    // Check if user has already seen onboarding
    const result = await chrome.storage.local.get(['hasSeenOnboarding']);
    this.hasSeenOnboarding = result.hasSeenOnboarding || false;
    
    // Show onboarding for new users
    if (!this.hasSeenOnboarding) {
      setTimeout(() => this.startOnboarding(), 1000);
    }
  }

  startOnboarding() {
    this.createOnboardingOverlay();
    this.showStep(0);
  }

  createOnboardingOverlay() {
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-backdrop"></div>
      <div class="onboarding-tooltip">
        <div class="tooltip-content">
          <div class="tooltip-header">
            <h3 id="onboarding-title">Welcome to ClipMaster Pro!</h3>
            <button id="onboarding-skip" class="skip-button">Skip Tour</button>
          </div>
          <div class="tooltip-body">
            <p id="onboarding-description">Let's take a quick tour of your new productivity superpower.</p>
          </div>
          <div class="tooltip-footer">
            <div class="progress-indicator">
              <span id="onboarding-progress">1 of 5</span>
              <div class="progress-bar">
                <div id="progress-fill" class="progress-fill"></div>
              </div>
            </div>
            <div class="navigation-buttons">
              <button id="onboarding-prev" class="nav-button" disabled>Previous</button>
              <button id="onboarding-next" class="nav-button primary">Next</button>
            </div>
          </div>
        </div>
        <div class="tooltip-arrow"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.setupOnboardingEvents();
  }

  setupOnboardingEvents() {
    document.getElementById('onboarding-skip').addEventListener('click', () => {
      this.completeOnboarding();
    });

    document.getElementById('onboarding-next').addEventListener('click', () => {
      if (this.currentStep < this.totalSteps - 1) {
        this.showStep(this.currentStep + 1);
      } else {
        this.completeOnboarding();
      }
    });

    document.getElementById('onboarding-prev').addEventListener('click', () => {
      if (this.currentStep > 0) {
        this.showStep(this.currentStep - 1);
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.completeOnboarding();
      }
    });
  }

  showStep(stepIndex) {
    this.currentStep = stepIndex;
    
    const steps = [
      {
        title: "Welcome to ClipMaster Pro! 👋",
        description: "Your new clipboard superpower! ClipMaster Pro automatically saves everything you copy and lets you access it instantly.",
        target: '.header-title',
        position: 'bottom'
      },
      {
        title: "Automatic Clipboard History 📋",
        description: "Everything you copy is automatically saved here. Click any item to copy it back to your clipboard instantly.",
        target: '#clipboard-list',
        position: 'right'
      },
      {
        title: "Smart Search & Filters 🔍",
        description: "Find anything instantly with our powerful search. Premium users get advanced filters like date ranges and content types.",
        target: '#search-input',
        position: 'bottom'
      },
      {
        title: "Text Templates ⚡",
        description: "Create reusable text templates with variables. Perfect for emails, responses, and frequently used text.",
        target: '[data-tab="templates"]',
        position: 'bottom'
      },
      {
        title: "Ready to Boost Productivity! 🚀",
        description: "You're all set! Start copying text and watch ClipMaster Pro work its magic. Upgrade to Premium for unlimited history and advanced features.",
        target: '.clipmaster-container',
        position: 'center'
      }
    ];

    const step = steps[stepIndex];
    this.updateTooltipContent(step);
    this.positionTooltip(step);
    this.updateProgress();
    this.highlightElement(step.target);
  }

  updateTooltipContent(step) {
    document.getElementById('onboarding-title').textContent = step.title;
    document.getElementById('onboarding-description').textContent = step.description;
    
    // Update navigation buttons
    const prevButton = document.getElementById('onboarding-prev');
    const nextButton = document.getElementById('onboarding-next');
    
    prevButton.disabled = this.currentStep === 0;
    nextButton.textContent = this.currentStep === this.totalSteps - 1 ? 'Get Started' : 'Next';
  }

  positionTooltip(step) {
    const tooltip = document.querySelector('.onboarding-tooltip');
    const targetElement = document.querySelector(step.target);
    
    if (!targetElement || step.position === 'center') {
      // Center positioning
      tooltip.style.position = 'fixed';
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top, left;

    switch (step.position) {
      case 'bottom':
        top = targetRect.bottom + 10;
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.right + 10;
        break;
      case 'top':
        top = targetRect.top - tooltipRect.height - 10;
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.left - tooltipRect.width - 10;
        break;
    }

    // Ensure tooltip stays within viewport
    const margin = 10;
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));

    tooltip.style.position = 'fixed';
    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
    tooltip.style.transform = 'none';
  }

  highlightElement(selector) {
    // Remove previous highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    // Add highlight to current element
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('onboarding-highlight');
    }
  }

  updateProgress() {
    const progressText = document.getElementById('onboarding-progress');
    const progressFill = document.getElementById('progress-fill');
    
    progressText.textContent = `${this.currentStep + 1} of ${this.totalSteps}`;
    progressFill.style.width = `${((this.currentStep + 1) / this.totalSteps) * 100}%`;
  }

  async completeOnboarding() {
    // Remove overlay
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
      overlay.remove();
    }

    // Remove highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    // Mark as completed
    await chrome.storage.local.set({ hasSeenOnboarding: true });
    
    // Show welcome message
    if (window.clipMasterPopup) {
      window.clipMasterPopup.showToast('Welcome to ClipMaster Pro! Start copying to see the magic ✨', 'success');
    }
  }

  // Allow manual restart of onboarding
  async restartOnboarding() {
    this.hasSeenOnboarding = false;
    this.currentStep = 0;
    await chrome.storage.local.set({ hasSeenOnboarding: false });
    this.startOnboarding();
  }
}

// CSS for onboarding (injected dynamically)
const onboardingCSS = `
#onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  pointer-events: none;
}

.onboarding-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  pointer-events: auto;
}

.onboarding-tooltip {
  position: absolute;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  max-width: 320px;
  pointer-events: auto;
  animation: fadeInScale 0.3s ease;
}

.dark-theme .onboarding-tooltip {
  background: #1e293b;
  color: #f8fafc;
}

.tooltip-content {
  padding: 20px;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tooltip-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.dark-theme .tooltip-header h3 {
  color: #f8fafc;
}

.skip-button {
  background: none;
  border: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.skip-button:hover {
  background: #f1f5f9;
}

.dark-theme .skip-button:hover {
  background: #334155;
}

.tooltip-body p {
  margin: 0;
  color: #64748b;
  line-height: 1.5;
  font-size: 14px;
}

.dark-theme .tooltip-body p {
  color: #cbd5e1;
}

.tooltip-footer {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
}

.progress-bar {
  width: 80px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #2563eb;
  transition: width 0.3s ease;
}

.navigation-buttons {
  display: flex;
  gap: 8px;
}

.nav-button {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #374151;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button:hover {
  background: #f9fafb;
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-button.primary {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.nav-button.primary:hover {
  background: #1d4ed8;
}

.onboarding-highlight {
  position: relative;
  z-index: 9999;
  box-shadow: 0 0 0 4px #2563eb, 0 0 0 8px rgba(37, 99, 235, 0.3) !important;
  border-radius: 8px !important;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = onboardingCSS;
document.head.appendChild(style);

// Initialize onboarding
window.clipMasterOnboarding = new ClipMasterOnboarding();
