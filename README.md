# ClientCollect Chrome Extension

A Chrome extension that extracts email addresses, phone numbers, names, and departments from web pages and allows you to export the data.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select this directory (the folder containing manifest.json)
5. The extension should now appear in your extensions list

## Usage

1. Navigate to any webpage
2. Click the ClientCollect extension icon in your Chrome toolbar
3. The popup will display any contact information found on the page
4. Use the export buttons to download the data as PDF or text file


## Files

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup interface
- `popup.js` - Popup functionality and export features
- `content.js` - Content script that runs on web pages
- `style.css` - Styling for the popup
- `clientconnect-icon.png` - Extension icon

## Troubleshooting

If you get an error when loading the extension:
1. Make sure all files are in the same directory
2. Check that manifest.json is valid JSON
3. Ensure the extension has the necessary permissions
4. Try reloading the extension from chrome://extensions/ 