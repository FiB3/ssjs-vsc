# SSJS Manager for VS Code

This extension streamlines Server Side JavaScript (and AMPscript) development in Salesforce Marketing Cloud.
From syntax highlight to easier testing  and deployment.

## Features

- Run local Server that can be accessed from SFMC's Cloud Pages.
- Help with deployment of resources for development.
- Syntax highlight.
- SSJS Snippets.

## Settings

### Extension Settings

Settings is currently done per project via `./vscode/ssjs-setup.json` file.

### Project Setup

You can start using this extension for basic features right away. However, if you want to use more advanced features, you should do following...

Prerequisites:
- Server-to-Server API Integration Installed package. This will later provide access to automations and assets.
- Tunneling tool (NGROK, Expose, Cloudflare tunnels/Loophole) to allow SFMC to access your local computer - don't forget to get a publically accessible URL. BEWARE: some of the services (including NGROK) cannot be used freely for commercial purposes.
Some of these even have VS Code extensions.
- Project is always created in a new folder.

1) Open your project folder.
2) Run `Create Config` command to create your setup file and store API credentials (these are kept safe in Keychain)
3) Finish setting up your setup file. `public domain` sets your.
4) Run `Deploy Dev Page` command that will help you to deploy your Dev environment in Cloud Page.
5) `Start` command enables your local environment.
6) Make your environmet accessible from internet (start your tunneling tool).

## Development

Once your SSJS is Active and Cloud Page published, all you need to do is to open it. Do not forget to add two query parameters:
- `token`: ("dev-token" from setup file)
- `path`: relative path to your file from root of your project (use forward slashed to indicate folders)

## Commands

- `SSJS: Start`: Start DEV Server
- `SSJS: Stop`: Stop DEV Server
- `SSJS: Create Config`: Setup your project - must be run before starting server. Have your SFMC Server-to-Servre credentials ready.
- `SSJS: Update API Credentials`: Update API Credentials of your SFMC instance.
- `SSJS: Deploy Dev Page`: This will help you deploy a Cloud Page that simplifies SSJS Dev.
 
## Known Issues

Development still in progress.

## Release Notes

### 0.1.0
Initial version: Any path secured by Dev token, some snippets and sytax highlight.