# ClipMaster Pro - Testing Guide

This guide will help you test all the features of ClipMaster Pro to ensure everything works correctly.

## 🚀 Installation Testing

### Step 1: Load Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `ClipMaster Pro` folder
5. ✅ Verify: Extension appears in list with no errors

### Step 2: Initial Setup
1. ✅ Check: ClipMaster Pro icon appears in toolbar
2. ✅ Check: No error messages in extension details
3. ✅ Check: Extension shows as "Enabled"

## 📋 Core Functionality Testing

### Clipboard Capture Testing

#### Test 1: Basic Text Copying
1. Copy some text from any webpage (Ctrl+C)
2. Click the ClipMaster Pro icon
3. ✅ Verify: Text appears in Recent tab
4. ✅ Verify: Item shows correct content and timestamp

#### Test 2: URL Copying
1. Copy a URL from address bar
2. Open ClipMaster Pro
3. ✅ Verify: URL is categorized as "url" with 🔗 icon
4. ✅ Verify: URL appears properly formatted

#### Test 3: Email Address Copying
1. Copy an email address (e.g., user@example.com)
2. Open ClipMaster Pro
3. ✅ Verify: Email is categorized as "email" with 📧 icon

#### Test 4: Code Snippet Copying
1. Copy some JavaScript code:
   ```javascript
   function hello() {
       console.log("Hello World");
   }
   ```
2. Open ClipMaster Pro
3. ✅ Verify: Code is categorized as "code" with 💻 icon

### User Interface Testing

#### Test 5: Tab Navigation
1. Open ClipMaster Pro
2. Click "Favorites" tab
3. ✅ Verify: Tab switches correctly
4. Click "Categories" tab
5. ✅ Verify: Categories grid appears
6. Test keyboard shortcuts (1, 2, 3)
7. ✅ Verify: Tabs switch with keyboard

#### Test 6: Search Functionality
1. Add several different clipboard items
2. Type in search box
3. ✅ Verify: Items filter in real-time
4. Clear search
5. ✅ Verify: All items return

#### Test 7: Theme Toggle
1. Click theme toggle button (🌙/☀️)
2. ✅ Verify: Interface switches between light/dark themes
3. ✅ Verify: Theme persists after closing/reopening

### Advanced Features Testing

#### Test 8: Favorites System
1. Click star icon on a clipboard item
2. ✅ Verify: Star turns yellow/active
3. Go to Favorites tab
4. ✅ Verify: Item appears in favorites
5. Click star again to unfavorite
6. ✅ Verify: Item removed from favorites

#### Test 9: Item Management
1. Click copy button on an item
2. ✅ Verify: Toast notification appears
3. ✅ Verify: Item moves to top of recent list
4. Click delete button on an item
5. ✅ Verify: Confirmation and item removal

#### Test 10: Categories View
1. Add items of different types (text, URL, code, email)
2. Go to Categories tab
3. ✅ Verify: Category counts are correct
4. Click on a category card
5. ✅ Verify: Filtered items appear below

## ⌨️ Keyboard Shortcuts Testing

#### Test 11: Extension Hotkey
1. Press Ctrl+Shift+V (Cmd+Shift+V on Mac)
2. ✅ Verify: ClipMaster Pro popup opens
3. Press Escape
4. ✅ Verify: Popup closes

#### Test 12: In-Popup Shortcuts
1. Open ClipMaster Pro
2. Press Ctrl+F
3. ✅ Verify: Search input gets focus
4. Press numbers 1, 2, 3
5. ✅ Verify: Tabs switch accordingly

## 🔧 Settings Testing

#### Test 13: Settings Modal
1. Click settings gear icon
2. ✅ Verify: Settings modal opens
3. Change max items setting
4. Toggle various checkboxes
5. Click "Save Settings"
6. ✅ Verify: Settings persist after reopening

#### Test 14: Export Functionality
1. Add several clipboard items
2. Click "Export" in footer
3. ✅ Verify: JSON file downloads
4. ✅ Verify: File contains clipboard data

## 🌐 Content Script Testing

#### Test 15: Enhanced Copy/Paste
1. Right-click on selected text
2. ✅ Verify: "ClipMaster Pro" options appear in context menu
3. Select "Smart Copy"
4. ✅ Verify: Text is added to clipboard history

#### Test 16: Page Integration
1. Copy text from different websites
2. ✅ Verify: All content is captured
3. ✅ Verify: Source information is recorded

## 📱 Responsive Testing

#### Test 17: Window Resizing
1. Change Chrome window size
2. Open ClipMaster Pro
3. ✅ Verify: Interface adapts properly
4. ✅ Verify: All elements remain accessible

## 🔄 Persistence Testing

#### Test 18: Browser Restart
1. Add several clipboard items
2. Close Chrome completely
3. Restart Chrome
4. Open ClipMaster Pro
5. ✅ Verify: All clipboard items are still there

#### Test 19: Extension Reload
1. Add clipboard items
2. Go to `chrome://extensions/`
3. Click reload button on ClipMaster Pro
4. Open extension
5. ✅ Verify: Data persists after reload

## 🚨 Error Handling Testing

#### Test 20: Clipboard Permission Denied
1. Try copying in an incognito window
2. ✅ Verify: Extension handles gracefully
3. ✅ Verify: Appropriate error messages shown

#### Test 21: Storage Limits
1. Add many large clipboard items
2. ✅ Verify: Extension maintains performance
3. ✅ Verify: Storage usage indicator updates

## 📊 Performance Testing

#### Test 22: Large History Performance
1. Add 50+ clipboard items
2. ✅ Verify: Search remains fast (<1 second)
3. ✅ Verify: Scrolling is smooth
4. ✅ Verify: No memory leaks or slowdowns

#### Test 23: Content Processing
1. Copy very long text (>1000 characters)
2. ✅ Verify: Preview truncation works
3. ✅ Verify: Full content is preserved
4. Double-click to expand
5. ✅ Verify: Full content displays correctly

## 🔍 Edge Cases Testing

#### Test 24: Empty Clipboard
1. Clear all clipboard items
2. ✅ Verify: Empty state appears
3. ✅ Verify: "Paste Current Clipboard" button works

#### Test 25: Special Characters
1. Copy text with emojis, Unicode, symbols
2. ✅ Verify: Special characters preserved
3. ✅ Verify: Display renders correctly

#### Test 26: Very Long URLs
1. Copy a very long URL (>200 characters)
2. ✅ Verify: URL categorization works
3. ✅ Verify: Preview truncation applied

## 📝 Manual Test Checklist

### Basic Functionality ✅
- [ ] Extension loads without errors
- [ ] Clipboard capture works automatically
- [ ] Popup interface opens correctly
- [ ] Search functionality works
- [ ] Theme toggle works
- [ ] All tabs accessible

### Advanced Features ✅
- [ ] Favorites system works
- [ ] Categories display correctly
- [ ] Item management (copy/delete) works
- [ ] Settings save and load
- [ ] Export functionality works
- [ ] Keyboard shortcuts work

### Integration ✅
- [ ] Context menus appear
- [ ] Content script integration works
- [ ] Cross-tab clipboard sync
- [ ] Persistence across sessions
- [ ] Performance with large datasets

### Error Handling ✅
- [ ] Graceful permission denial handling
- [ ] Storage limit management
- [ ] Network independence
- [ ] Malformed content handling

## 🎯 Test Results Summary

After completing all tests, document:

### Passed Tests: ___/26
### Failed Tests: ___/26
### Critical Issues: ___
### Minor Issues: ___

### Notes:
_Document any issues found during testing_

---

## 🚀 Next Steps After Testing

1. **Fix Critical Issues**: Address any blocking problems
2. **Performance Optimization**: Improve any slow operations
3. **UI/UX Polish**: Refine interface based on testing feedback
4. **Chrome Web Store Preparation**: Prepare for submission
5. **Documentation Updates**: Update README with any changes

Remember to test in different scenarios:
- Different websites and content types
- Various Chrome versions
- Different screen sizes and resolutions
- Multiple tabs and windows open
- Both keyboard and mouse interactions
