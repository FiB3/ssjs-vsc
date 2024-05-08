# Change Log

All notable changes to the "ssjs-vsc" extension will be documented in this file.

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