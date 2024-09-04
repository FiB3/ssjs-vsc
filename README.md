# SSJS Manager

Simplifies & speeds up Server Side JavaScript and AMPscript development in Salesforce Marketing Cloud.
From syntax highlight to rapid testing and deployment.

![SSJS Manager Preview](https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/ssjs-vsc-demo2.0.gif)

## Features

- Support rapid code development of SSJS scripts via SFMC's Cloud Pages.
- Preview within VSCode.
- Syntax highlight.
- SSJS Snippets.
- Mustache templating of scripts and pages to ensure your env security when using repositories.

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

![SSJS Manager](https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/ssjs-vsc-demo1.2.gif)

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

## Hooks

This option allows setting `on-save` hooks for files so you can run specific commands on save (and before sending scripts to SFMC). E.g.:
```json
// .vscode/ssjs-setup.json:
{
	// ...
	"hooks": {
		"on-save": {
			".js": {
				"enabled": true, 											// is hook enabled?
				"command": "npm run build", 					// command to run
				"success-handling": "upload-self",		// "upload-self", "upload-output", "none"
				"output-file": "./dist/{{name}}.ssjs" // path to deploy, from workspace root
			}
		}
	}
}
```

## Sponsors

I would like to thank my sponsors:

[![FLO](https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/flo.png "FLO Logo")](https://www.weareflo.com/)  
(former bluez.io)

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
- Preview panel does not support clipboard nor search.