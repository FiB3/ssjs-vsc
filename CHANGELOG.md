# Change Log

All notable changes to the "ssjs-vsc" extension will be documented here:

## [0.7.0] - 2025-04-13

### Added:
- __Live Preview__: this handy feature allows you to test frontend directly on your laptop, without upload to SFMC - Templating included. Handy for pages that use APIs to access SFMC functionality.
- Commands: `Live Preview Start`, `Stop` & `Get Live Preview URL`.
- New templating column for Live Preview.
- Automatic reload for Live Preview (on file save), with option in Preferences to enable this feature.
- New Status Bar (right bottom corner) that shows when Live Preview is active (SSJS: <PORT>). Default is still port 4000. You can change this in `.vscode/ssjs-config.json`
- `Copy Templated Code` command. It fills the Mustached content with your tags (of your env) and copies content to clipboard.
- `Refresh Config` button in Config panel.
- Automate version in your scripts by simply using `{{VERSION}}`` mustache tag. Date time is used, as biggest use for version in SFMC is to know the time of last deployment.

### Changed:
- Visual Improvements to Templating panel.
- Latest Changes (in Config panel) are now showing `Changelog`.
- Internal refactors, some unit tests.

### Fixed:
- Several bugs fixed.

### Removed:
- Poor Server Provider. But who used it anyway?
- `Start` and `Stop` commands.
- Create config commands: Create Config, Update Config, Deploy Any Path. _Config_ Panel is the way to go.

## [0.6.9] - 2025-03-19

### Added:
- Api counter shows since when it's being counted (on hover).
- New "Log" type for text preview, which automatically detects format used in Email360 SSJS Lib - let me know, if you want other formats.
- Workspace trust support.

### Fixed:
- Improved HttpRequest snippet.
- Text preview resizing and styling improvements.
- Formatting: mustache syntax will no longer get broken.
- Other smaller bugs.

## [0.6.9] - 2025-01-27

### Fixed:
- MID was not saved when missing - Dev Assets can now be checked correctly. 

## [0.6.8] - 2025-01-26

### Added:
- New `Upload Script to Dev` icon (cloud) for supported files (top right corner of editor tab) - next to `Run` icon.
- New `SSJS: Check Dev Pages` command to test configuration of your Development Cloud Page and Text Resource.
- New button with the _Check Dev Pages_ functionality replaced a checkbox in the Config's _Deploy Cloud Page & Text Resource_ section.
- New _Test Configuration_ button in the Config panel, that validates your connection to SFMC (available only when configuration appears valid). Great when you have e.g. changed the Business unit.
- Support for additional file types via new Preference: `Editor: Additional File Types`. Now you can test other files you are working on (like SSJS libraries in .js files).

### Changed:
- `Develop` section in the Config panel is no longer mandatory.
- Config's _Folder in Content Builder_ shows configured folder.
- When asset is not found in SFMC a more precise notification is shown.
- Offer script's metadata deletetion, when asset is not found in SFMC.
- Dev Pages return 3 new headers that allow for testing the Dev Pages.
- Preview will always get focused when `Run` is used.

### Fixed:
- Switch between Preview of Cloud Pages and Text Resources.

## [0.6.7] - 2025-01-20

### Added:
- New command to Change script options: `SSJS: Change Script Options`. Use to change Dev Context (e.g. to Preview type).
- Option to select the Text Preview language (JSON, HTML, Text).
- Loading wheel on Text Preview.

### Changed:
- New walkthrough.

## [0.6.5] - 2025-01-13

### Changed:
- New Preview for Text resource. It allows for full interactivity, including JSON formatting and search. Handy information about the page processing are also included in the preview.

### Added:
- New snippets (Platform Requst).

## [0.6.4] - 2025-01-09

### Added:
- Counter for SFMC API calls.
- New snippets (WS Proxy filter examples, front-end JS in SSJS).

### Changed:
- Improved error message for when deploying duplicate assets.
- Replaced obsolete NPM modules to increase security.

## [0.6.2] - 2024-10-07

### Added:
- New snippets for Subscriber.

### Fixed:
- Errors: "Cannot read properties of undefined (reading 'runSave')" & "Cannot set properties of undefined (setting 'use-auth')".

## [0.6.1] - 2024-09-29

### Added:
- On-save hooks that allow running terminal/command line commands before saving scripts to SFMC.  
This allows combining __SSJS Manager__ with tools like __generator-ssjs__.  
Now you can use other file types (like `.js`) and build those into `.ssjs`, `.amp` or `.html`.  
This feature also supports preview of code as before.  
Output of build command is shown in the debug console.
- On-save hooks supported by getting path and preview (except for the run-icon).
- New command to generate the "standalone" scripts (with TreatAsContent & ContentBlock for a current script / content block).
- Some new snippets like AMPsctipt try-catch.

### Fixes:
- minor refactors and fixes.

## [0.5.4] - 2024-08-17

### Added:
- Basic effect on refresh of the preview (using refresh button).
- New snippets: HTTP Request Property, HTTP Get & Post, Platform Data Extension & ContentBlock functions. 

### Changed:
- Removed comments from deployment scripts.
∂
### Fixed:
- Bug when retrying SFMC Connection using Config Panel reset ssjs-config.
- other minor fixes.

## [0.5.3] - 2024-05-27
### Fixed:
- multiple Fixes for formatting (dollar sign duplication, templating notation bug, AMPscript Print-tag broken fix)

## [0.5.2] - 2024-05-08

### Added
- "Report bug" button in Config panel (link to GitHub)

### Fixed:
- "Folder in Content Builder" not working ("Extension missing configuration" issue).

## [0.5.1] - 2024-05-08

### Added
- Debug Panel to preview directly in VSCode.
- New "Run" Command

### Changed
- Preference option to set the users's preffered option is now used for "Run" command and is separate for Cloud Page and Text Resources.
- "Play" button is used for "Run" command.
- "Get Dev Path" is again used purely for getting the path.

## [0.4.6] - 2024-04-23

### Changed:
- small Config Panel tweaks.

### Fixed:
- do not allow for "opening" a file, that was not yet uploaded to SFMC.
- "The client clientId is required." bug on the activation.
- Issue with templating UI (when no keys were available in ssjs-setup file).
- several bugs.

## [0.4.5] - 2024-04-09

### Added
- Templating Tab in the Config Panel now provides visual setup of the tags.
- New editor action (button above script) to open the script in the browser / copy the script's URL to the clipboard.
- New Preference option to set the users's preffered option (for Get Dev Path).

### Changed
- `SSJS: Get Dev Path` renamed to `SSJS: Get Dev Path / Open Dev Page` to better reflect the new feature.
- Commands are now shown conditionally if usable.
- All commands have been moved into the `SSJS` category, with the `SSJS:` prefix being removed from the names.

## [0.4.3] - 2024-04-03

### Added
- Custom Config Panel to enable full Setup of SSJS Manager.
- Config Panel launches on startup, if some setup is missing (this can be disabled in Preferences or in the Config panel).
- UI allows for use of existing Asset Folder.
- Config panel contains placeholders (with basic data) for Templating and Changelog data.

### Fixed:
- Minor fixes and improvements.

## [0.3.11] - 2024-03-18

### Added
- Auto update of Dev Pages on start (if needed).

### Changed
- Removed `Content-Security-Policy` header from Dev Cloud Pages as this was breaking console logging within SSJS lib (by Email360).
- Removed Notification about Code Provider on extension start.

### Fixed
- Stale Template Tokens for Libraries (inclusion of files into code was loading old file versions).
- Get Dev Path (in Asset Code Provider) was ignoring "choose every time" option for Dev Page Context.

## [0.3.11] - 2024-02-27

### Fixed
- Error thrown when no Workspace is selected. Instead, a warning notification is shown.

## [0.3.10] - 2024-02-26

### Added
- AMPscript syntax highlight.
- Preview (get dev page URL) choice can be stored (and used from) the script's metadata.

## [0.3.9] - 2024-02-23

### Fixed
- Telemetry dev mode off.

## [0.3.8] - 2024-02-23

### Added
- Check of Installed Package scopes.
- Added Telemetry to allow for better future improvements (per README).

### Fixed
- Updated Beautifiers to fix the "key-words in variables" problem.
- Fixed `SSJS: Create Config` broken by previous release.
- Fixd `No file is currently open.` warning on start of Server Provider.

## [0.3.7] - 2024-02-16

### Added
- New new authentication option for Dev Pages - Basic auth.
- Made Dev pages store authentication data in cookies.
- Option to use both Cloud Page and Text Resource in your env and pick the one needed at the moment.
- New command to Update installed Dev Pages.

### Changed
- Shortened manually deployed scripts to bare minimum.
- Moved script for dev pages to Content builder to enable automatic updates.
- Major overhaul of ssjs-setup.json file with an automatic migration.
- Names of some commands to make them more clear.
- Updated README and Walkthrough to current status.
- License tot BSD-4-clause.
- Other minor improvements.

### Fixed
- Bug on Folder creation, when folder was not created in larger Business Units.

## [0.2.4] - 2024-01-17

### Added
- New Prod build command (SSJS: Production deployment) inserting compiled scripts to Clipboard.

## [0.2.3] - 2024-01-11

### Added
- Formatting support for AMPscript, including check for BeautyAmp extension.
- Improved SFMC Code formatting.
- FILE-Tokens: support to include local libraries using Tokenization.
- On-extension activation check of API Connection (Asset-Provider only).
- Grouped extension Preferences for easier setup.

### Fixed
- Various bugfixes.

## [0.2.2] - 2023-12-04

### Fixed
- Formatting improvements to fix breaking changes to SSJS Code.

## [0.2.1] - 2023-12-03

### Fixed
- Formatting not working after publishing due to Prettier v3.0.0 issue.

## [0.2.0] - 2023-12-03

### Added
- Add Formatter for SSJS.
- New settings to set templating tag.

## [0.1.3] - 2023-11-28

### Added
- Initial walkthrough for setup.

## [0.1.2] - 2023-11-21

### Changed
- Automatic deploy in Asset Provider: first deploy needs to always be done manually. 
- Small tweaks, like removing warning on deployment of unsupported files auto-deploy.

## [0.1.1] - 2023-11-06

Tweaks.

### Added
- Tags for easier extension search,
- Warning in case the Client Secret cannot be obtained.

## [0.1.0] - 2023-11-02

Initial release.

### Added
- SSJS Language,
- Asset and Server providers,
- Key storage in OS keychain,
- syntax highlight,
- some snippet.