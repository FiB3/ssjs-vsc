# SSJS Manager

Simplifies & speeds up Server Side JavaScript (and AMPscript) development in Salesforce Marketing Cloud.
From syntax highlight to rapid testing and deployment.

## Features

- Support rapid development of SSJS scripts via SFMC's Cloud Pages.
- Syntax highlight.
- SSJS Snippets.

![SSJS Manager](https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/ssjs-vsc-demo1.2.gif)

### [Complete Guide](https://fib3.github.io/ssjs-vsc/)
[Issue Reporting on GitHub](https://github.com/FiB3/ssjs-vsc/issues)

## Settings

### Extension Settings

Base extension settings is done in Preferences.  
Project wide settings is currently done per project via `./vscode/ssjs-setup.json` file which is automatically pre-generated on project setup.

### Project Setup

You can start using this extension for basic features right away. However in order to use support for rapid Cloud-page development, you need to set a Code Provider.

- Asset Provider (default): uses API to deploy your script on demand or save.
- Server Provider: uses local web server that provides your scripts via HTTPS. Reverse tunneling tool required (NGROK, Expose...).
- None: disable code integration.

**Setup Cheatsheet:**
1) Run `Create Config` command withing VSCode to create your setup file (and store SFMC Credentials safely).
2) Finish setting up your setup file.
3) Run `Deploy Dev Page` command that will help you to deploy your Dev environment in Cloud Page.

On Asset Provider, the dev asset folder is created on the first script deployment.

For server provider:

1) `Start` command enables your local environment.
2) Make your environment accessible from internet (start your tunneling tool).

## Development

Once your SSJS is Active and Cloud Page published, all you need to do is to open it. Open your Cloud Page or Text Resources.  
Then append query parameters you get by running `Get Dev PATH` command.

## Commands

To be run using `Ctrl` + `Shift` + `P`.

- `SSJS: Upload Script` - Uploads the script on Asset Provider. Can be run automatically, but first upload needs to be done manually.
- `SSJS: Get Dev PATH` - get query parameters to run your script.
- `SSJS: Start`: Start DEV Server
- `SSJS: Stop`: Stop DEV Server
- `SSJS: Create Config`: Setup your project - must be run before starting server.
- `SSJS: Update API Credentials`: Update API Credentials of your SFMC instance.
- `SSJS: Deploy Dev Page`: This will help you deploy a Cloud Page that simplifies SSJS Dev.

## Known Issues

Alpha release - some errors may appear.  
In such case, let me know on my GitHub! (issues page).

- Format Document upcoming.
- No check of Content Folder existence.
- Some API failures won't return the problem.
- Asset provider automatically deploys any `.ssjs`, `.html`, `.amp` file.
- Client Secret not loading when VSCode is not up to date. Update your VSCode to fix.