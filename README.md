# SSJS Manager

Simplifies & speeds up Server Side JavaScript and AMPscript development in Salesforce Marketing Cloud.
From syntax highlight to rapid testing and deployment.

## Features

- Support rapid code development of SSJS scripts via SFMC's Cloud Pages.
- Syntax highlight.
- SSJS Snippets.
- Mustache templating of scripts and pages to ensure your env security when using repositories.

![SSJS Manager](https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/ssjs-vsc-demo1.2.gif)

### [Complete Guide](https://fibworks.com/ssjs-vsc)
[Issue Reporting on GitHub](https://github.com/FiB3/ssjs-vsc/issues)

## Settings

### Extension Settings

Generic extension settings is available in Preferences.  
Project wide settings is done per project via `./vscode/ssjs-setup.json` file which is automatically generated on project setup (`Create Config` command).

### Project Setup

You can start using this extension for basic features right away. However in order to use support for rapid Cloud-page development, you must install connection to SFMC. This connection consists of Installed Package, Cloud Page & Text Resource.

You can see a guide using the new `SSJS: Show Config` command for interactive config or `SSJS: Show Setup Walkthrough` command for setup guide.

## Development

Once your SSJS is Active and Cloud Page published, all you need to do is to open it.  
`SSJS: Get Dev Path` command will give you the details.

## Commands

To be run using `Ctrl` + `Shift` + `P` (Win) / `CMD` + `Shift` + `P` (Mac) / F1.

- `SSJS: Show Config` - Shows an UI guide which lets you set the extension.
- `SSJS: Show Setup Walkthrough` - Shows a guide on how to setup the extension.
- `SSJS: Production deployment` - Uploads the script to given SFMC resource - currently to Clipboard only.
- `SSJS: Upload Script to Dev` - Uploads the script on Asset Provider. After first upload (per script) is run automatically on file save.
- `SSJS: Get Dev Path` - Get URL to test your script.
- `SSJS: Start`: Starts DEV Server (Server Code Provider only).
- `SSJS: Stop`: Stops DEV Server (Server Code Provider only).
- `SSJS: Create Config`: Setup your project - must be run before starting server.
- `SSJS: Update API Credentials`: Update API Credentials of your SFMC instance.
- `SSJS: Install Dev Page`: This will help you deploy a Cloud Page that simplifies SSJS Dev.
- `SSJS: Update Dev Page`: This will help you deploy a Cloud Page that simplifies SSJS Dev.

## Sponsors

I would like to thank my sponsors:

[![bluez.io](https://bluez.io/wp-content/uploads/2021/10/cropped-bluezio-symbol-60x60.png "bluez.io")](https://bluez.io/)  
bluez.io

Sponsoring coming soon! For now please enjoy and share!

## Telemetry

This extension is collecting some telemetry in order to allow for future improvements and bugfixes.  
No personal information, API Keys nor script content is collected.

## Known Issues

Work in progress - some errors may appear.  
In such case, let me know on my [GitHub here!](https://github.com/fib3/ssjs-vsc/issues)

- Upcoming improvements to security of development Cloud Pages.
- Client Secret not loading when VSCode is not up to date. Update your VSCode to fix.
- Multi-root workspaces are not supported.