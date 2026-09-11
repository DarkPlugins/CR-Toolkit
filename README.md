# CR-Toolkit

CR-Toolkit is a browser extension for Crunchyroll that offers various features to enhance your anime-watching experience.

## Features

### Resizable Cinema Mode

Expand the video player into a cinema-style layout without entering fullscreen mode. This allows you to continue accessing browser tabs, extensions, and other controls while watching.

### Automatic Intro & Outro Skipping

Automatically skip opening and ending sequences to streamline episode playback.

### Customizable Header Visibility

Control whether the Crunchyroll header is displayed during video playback for a cleaner viewing experience.

### Header Appearance Customization

Modify the appearance of the Crunchyroll header to better match your preferences.

## Installation

### Manual Installation

1. Download the latest release files from the project's Releases page.
2. Install the extension using your preferred browser extension platform.  Drag & Drop the .crx file into the extension page or extract the .zip file, enable developer-mode and "load unpacked files".
3. Refresh any open Crunchyroll tabs.
4. Open Crunchyroll and configure the toolkit settings to your liking using the pop-up.

## Compatibility

* Chromium-based browsers (Google Chrome, Microsoft Edge, Brave, Opera)
* Mozilla Firefox (depending on the installed extension platform)

## Usage

After installation, simply open Crunchyroll. The extension will automatically apply your configured enhancements and provide additional controls where applicable.
You can adjust the settings in the pop-up. Simply click the extension icon, and the pop-up will open.

## Development and tests

The extension runs directly from the source files; no build step is required.
Install Node.js 22 or newer, then run:

```sh
npm install
npx playwright install chromium
npm test
```

The tests cover cache handling and browser behavior using local fixtures and mocked
extension storage. They do not contact Crunchyroll or require an account. To use an
existing Chromium browser, set `CR_TOOLKIT_BROWSER` to its executable path.

After changing the extension, reload it on the browser's extensions page and refresh
open Crunchyroll tabs. Live playback and site selector compatibility still need a
manual check against Crunchyroll.

## Disclaimer

CR-Toolkit is an independent project and is not affiliated with, endorsed by, sponsored by, or associated with Crunchyroll, LLC.
Crunchyroll® is a trademark of Crunchyroll, LLC. All trademarks, service marks, logos, and copyrights are the property of their respective owners.
