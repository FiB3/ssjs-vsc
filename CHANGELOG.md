# Change Log

All notable changes to the "ssjs-vsc" extension will be documented in this file.

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