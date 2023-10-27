# SSJS Manager

This extension streamlines Server Side JavaScript (and AMPscript) development in Salesforce Marketing Cloud.
From syntax highlight to easier testing  and deployment.

## Features

- Support rapid development of SSJS scripts via SFMC's Cloud Pages.
- Syntax highlight.
- SSJS Snippets.

## Settings

### Extension Settings

Base extension settings is done in Preferences.  
Project wide settings is currently done per project via `./vscode/ssjs-setup.json` file which is automatically pre-generated on project setup.

### Project Setup

You can start using this extension for basic features right away. However in order to use support for rapid Cloud-page development, you need to pick a Code provider:

- Asset Provider (default): uses API to deploy your script on demand or save. More secure but requires an Installed Package.
- Server Provider: uses local server that provides your scripts via HTTPS. Reverse tunneling tool required (NGROK, Expose...). Less secure, but fast. Script runs only when you need it. Installed package needed only for the setup.
- None.

1) Open your project folder.
2) Run `Create Config` command to create your setup file and store API credentials (these are kept safe in Keychain)
3) Finish setting up your setup file.
4) Run `Deploy Dev Page` command that will help you to deploy your Dev environment in Cloud Page.

On Asset Provider, the dev asset folder is created on the first script deployment.

For server provider:

5) `Start` command enables your local environment.
6) Make your environment accessible from internet (start your tunneling tool).

## Development

Once your SSJS is Active and Cloud Page published, all you need to do is to open it. Open your Cloud Page (Resources will work too) and append query parameters you get by running `Get Dev PATH` command.

## Commands

- `SSJS: Upload Script` - Uploads the script on Asset Provider. Can be run automatically.
- `SSJS: Get Dev PATH` - get query parameters to run your script.
- `SSJS: Start`: Start DEV Server
- `SSJS: Stop`: Stop DEV Server
- `SSJS: Create Config`: Setup your project - must be run before starting server. Have your SFMC Server-to-Serve credentials ready.
- `SSJS: Update API Credentials`: Update API Credentials of your SFMC instance.
- `SSJS: Deploy Dev Page`: This will help you deploy a Cloud Page that simplifies SSJS Dev.

## Known Issues

Alpha release.

- Format Document upcoming.
- No check of Content Folder existence.
- Generic error message on API calls.

## Release Notes

### 0.1.0
Initial version: Asset and Server providers, some snippets and syntax highlight.