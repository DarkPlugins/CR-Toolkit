<div align="center">
  <img src="icon.png" alt="CR-Toolkit" width="250">
</div>

CR-Toolkit is a browser extension for Crunchyroll that offers various features to enhance your anime-watching experience.

## Features

### Better Search
Filter Crunchyroll search results by available audio and subtitle languages.
Better Search has its own settings panel on the search page, with settings to filter for audio- and subtitle-languages.

### Better Calender
Enable or disable **Better Calender** in the Crunchyroll settings panel under **General**. It is enabled by default and controls the calendar theme, localized week links, and calendar integration with Better Search. The normal search remains controlled by **Better Search**. The feature implementation is `src/js/features/betterCalender.js`.

The legacy simulcast calendar uses a dark Crunchyroll-style theme with wider, readable release cards. Site color mappings also apply to the calendar; a mapping for `#ff640a` takes priority over the shared Toolkit accent color. The existing calendar navigation, episode links and day selection remain available, and week links retain the current page language.

The Toolkit gear and the applicable Change Header options work in the legacy header too. Better Search uses the same left sidebar as the normal search without shifting the calendar content, switching to the icon at the bottom right on smaller screens. It can search titles within the displayed week and filter individual releases by audio language. Release cards show the same availability labels as search results. Select a language and enable **Only matching results** to hide other releases. Spanish and Portuguese regions are treated separately in the calendar, including availability labels.

Audio detection uses release metadata and structured episode/season IDs, independently of the page language. Legacy entries without identifiable audio metadata remain visible. Subtitle filtering uses explicit subtitle metadata when present; the calendar usually does not supply it, so unknown entries stay visible. Search results and calendar releases display `Dubbed in` / `Not dubbed in` with `Subtitles available in` / `No subtitles available in` underneath, in green/red for known language availability. With **All** selected, known language names are listed instead of generic Dubbed/Subtitles badges. Missing language data displays `No dubbing information available` or `No subtitle information available` in blue on both search and calendar cards. A generic availability flag alone never establishes availability in a particular language. Disabling Better Search restores all calendar entries.

### Resizable Cinema Mode
Expand the video player into a cinema-style layout without entering fullscreen mode. This allows you to continue accessing browser tabs, extensions, and other controls while watching.

### Automatic Intro & Outro Skipping

Automatically skip opening and ending sequences to streamline episode playback.

### Customizable Colors
Change every color on the website to a color that you want.
If you want Crunchyroll to be completely pink... go ahead!

### Customizable Header Visibility

Control whether the Crunchyroll header is displayed during video playback for a cleaner viewing experience.

### Header Appearance Customization

Modify the appearance of the Crunchyroll header to better match your preferences.

## Installation

### Manual Installation

1. Download the latest release files from the project's Releases page.
2. Install the extension using your preferred browser extension platform.  Drag & Drop the .crx file into the extension page or extract the .zip file, enable developer-mode and "load unpacked files".
3. Refresh any open Crunchyroll tabs.
4. Open Crunchyroll and use the white gear in the header actions to open the inline settings panel.

## Compatibility

* Chromium-based browsers (Google Chrome, Microsoft Edge, Brave, Opera)
* Mozilla Firefox (depending on the installed extension platform)

## Usage

After installation, simply open Crunchyroll. The extension will automatically apply your configured enhancements and add a white gear to the first position in the header actions.
Click the gear to open the glass-style settings panel directly on the Crunchyroll page. The panel contains General, Appearance, and Options sections. The Accent color option is shared with Better Search, including its settings, selectors, focus states, and checkboxes. The default and reset color is `#ff6f00`.
The extension icon opens a small info card with a link to the project repository.

## Disclaimer

CR-Toolkit is an independent project and is not affiliated with, endorsed by, sponsored by, or associated with Crunchyroll, LLC.
Crunchyroll® is a trademark of Crunchyroll, LLC. All trademarks, service marks, logos, and copyrights are the property of their respective owners.
