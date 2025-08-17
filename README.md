# ClipMaster Pro - Advanced Clipboard Manager

A powerful Chrome extension that revolutionizes clipboard management with smart categorization, instant search, and persistent history.

## 🚀 Features

### Core Functionality
- **Advanced Clipboard History**: Store up to 100 clipboard items with persistence across browser sessions
- **Smart Categorization**: Automatically categorize content as text, URLs, code, emails, or phone numbers
- **Instant Search**: Full-text search across all clipboard history with real-time filtering
- **Keyboard Shortcuts**: Quick access with Ctrl+Shift+V (Cmd+Shift+V on Mac)
- **Context Menu Integration**: Enhanced right-click copy/paste options

### User Interface
- **Modern Design**: Clean, intuitive interface with Material Design 3 principles
- **Dark/Light Theme**: Automatic theme detection with manual toggle option
- **Tabbed Interface**: Organized views for Recent, Favorites, and Categories
- **Visual Indicators**: Icons and tags for different content types
- **Responsive Layout**: Optimized for various screen sizes

### Productivity Features
- **Favorites System**: Pin frequently used clips for quick access
- **Export/Import**: Backup and restore clipboard data
- **Usage Analytics**: Track clipboard usage patterns
- **Format Preservation**: Maintain original formatting or paste as plain text
- **Bulk Operations**: Manage multiple clipboard items simultaneously

## 📥 Installation (Developer Mode)

Since this extension is in development, you'll need to install it in Chrome Developer Mode:

### Step 1: Enable Developer Mode
1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle on "Developer mode" in the top-right corner

### Step 2: Load the Extension
1. Click "Load unpacked" button
2. Navigate to the `ClipMaster Pro` folder
3. Select the folder and click "Open"

### Step 3: Verify Installation
1. The ClipMaster Pro icon should appear in your Chrome toolbar
2. You should see the extension listed in `chrome://extensions/`
3. Test the keyboard shortcut: `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)

## 🎯 How to Use

### Basic Usage
1. **Copy any text**: The extension automatically captures clipboard content
2. **Access history**: Click the ClipMaster Pro icon or use `Ctrl+Shift+V`
3. **Search clips**: Type in the search bar to find specific content
4. **Click to copy**: Click any clipboard item to copy it back to clipboard

### Advanced Features
- **Favorites**: Click the star icon to mark items as favorites
- **Categories**: Use the Categories tab to filter by content type
- **Settings**: Click the gear icon to customize behavior
- **Export Data**: Use the footer "Export" button to backup your data

### Keyboard Shortcuts
- `Ctrl+Shift+V` (or `Cmd+Shift+V`): Open ClipMaster Pro
- `1`, `2`, `3`: Switch between tabs when popup is open
- `Ctrl+F`: Focus search bar when popup is open
- `Escape`: Close modals and dialogs

## 🛠️ Development

### File Structure
```
ClipMaster Pro/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker for clipboard monitoring
├── popup.html             # Main interface
├── popup.js              # UI logic and clipboard operations
├── content.js            # Content script for page integration
├── styles.css            # Modern styling with theme support
├── icons/                # Extension icons (16, 32, 48, 128px)
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
├── create_icons.html     # Icon generator utility
└── README.md             # This file
```

### Core Components

#### Background Script (`background.js`)
- Clipboard monitoring and storage management
- Context menu creation and handling
- Message routing between components
- Smart content categorization

#### Popup Interface (`popup.js`)
- User interface logic and interactions
- Search and filtering functionality
- Theme management
- Settings and preferences

#### Content Script (`content.js`)
- Page-level clipboard monitoring
- Enhanced copy/paste operations
- Context menu integration
- Keyboard shortcut handling

### Data Structure
```javascript
ClipboardItem = {
  id: timestamp,
  content: string,
  type: 'text' | 'url' | 'code' | 'email' | 'phone',
  source: string,
  timestamp: ISO_string,
  favorite: boolean,
  tags: string[],
  preview: string
}
```

## 🔧 Customization

### Settings Options
- **Maximum History Items**: Configure storage limits (20-100+ items)
- **Auto-categorization**: Enable/disable smart content categorization
- **Show Previews**: Toggle content preview display
- **Sound Notifications**: Enable audio feedback for actions
- **Theme**: Choose between light, dark, or auto (system) theme

### Permissions Explained
- `clipboardRead`: Read clipboard content for monitoring
- `clipboardWrite`: Write content back to clipboard
- `storage`: Store clipboard history locally
- `contextMenus`: Add enhanced copy/paste options
- `activeTab`: Access current tab for content script functionality

## 🚀 Roadmap

### Phase 1: Foundation ✅
- [x] Basic clipboard capture and storage
- [x] Modern popup interface
- [x] Search and categorization
- [x] Theme support

### Phase 2: Enhancement (In Progress)
- [ ] Advanced search filters (date, type, source)
- [ ] Template system for frequent text
- [ ] Cloud sync (premium feature)
- [ ] Advanced analytics dashboard

### Phase 3: Premium Features
- [ ] Unlimited clipboard history
- [ ] Cross-device synchronization
- [ ] Team collaboration features
- [ ] Custom keyboard shortcuts

## 📊 Performance

### Optimization Features
- **Lazy Loading**: Efficiently handle large clipboard histories
- **Memory Management**: Automatic cleanup of old items
- **Fast Search**: Optimized text search algorithms
- **Minimal Footprint**: <2MB total extension size

### Browser Support
- **Primary**: Chrome 88+ (Manifest V3 support)
- **Compatible**: Chromium-based browsers (Edge, Brave, Opera)
- **Future**: Firefox and Safari versions planned

## 🔒 Privacy & Security

### Local-First Approach
- All data stored locally using Chrome's storage API
- No external servers or cloud dependencies
- No personal data collection or tracking
- User-controlled data export and deletion

### Security Features
- Secure clipboard API usage
- Permission-based access control
- Optional content encryption for sensitive data
- Regular security updates and patches

## 🐛 Troubleshooting

### Common Issues

**Extension not capturing clipboard:**
- Ensure you've granted clipboard permissions
- Check that the extension is enabled in `chrome://extensions/`
- Try refreshing the current tab

**Keyboard shortcut not working:**
- Verify the shortcut in Chrome settings: `chrome://extensions/shortcuts`
- Check for conflicts with other extensions
- Ensure ClipMaster Pro is active and enabled

**Search not finding items:**
- Check spelling and try partial matches
- Clear search filters and try again
- Verify items are actually stored in history

### Debug Mode
Enable debug logging by opening Chrome DevTools:
1. Right-click the extension icon → "Inspect popup"
2. Check the Console tab for debug messages
3. Report any errors in the GitHub issues

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

## 📞 Support

- **Email**: support@clipmasterpro.com
- **Documentation**: Full help available in extension popup
- **Issues**: Report bugs via GitHub issues
- **Feature Requests**: Submit enhancement ideas

---

**ClipMaster Pro** - Revolutionizing clipboard management for Chrome users worldwide! 🚀
