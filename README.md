# SSJS Manager

Simplify & speed up Server Side JavaScript and AMPscript development in Salesforce Marketing Cloud.
From syntax highlight through rapid testing and preview in VS Code and Cursor.

![SSJS Manager Preview](https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/ssjs-vsc-demo2.0.gif)

## Features

- Support rapid code development of SSJS scripts via SFMC's Cloud Pages.
- Preview within VSCode / Cursor - with a WYSIWYG for Cloud Pages and more information rich preview for scripts.
- Syntax highlight & formatting.
- SSJS Linting - finding syntax issues.
- SSJS Snippets.
- Mustache templating of scripts and pages to ensure your env security when using repositories.
- Live Previvew feature for pure HTML files that includes templating.
- Configuration Wizard UI.

All baked in for your convenience - no additional installs needed!

Start saving time now...

### [Complete Guide](https://fibworks.com/ssjs-vsc)
[Issue Reporting on GitHub](https://github.com/FiB3/ssjs-vsc/issues)

## Settings

### Extension Settings

__Generic__ extension settings is available in VSCode Preferences.  
__Project wide__ settings is done per your project (a.k.a. Workspace). One project works for one Busines Unit in SFMC.  
It is managed via `SSJS: Show Config` command and stored in the `.vscode/ssjs-setup.json` file.

### Project Setup

You can start using this extension for basic features right away. However in order to use support for rapid Cloud-page development, you must install connection to SFMC. This connection consists of Installed Package, Cloud Page & Text Resource.

You can see a guide using the new `SSJS: Show Config` command for interactive wizard. It is really easy!

## Development

Once your SSJS Manager is Active and Cloud Page published, all you need to do is to create script and upload it to Marketing Cloud:
- First time upload is done via `SSJS: Upload Script to Dev` or cloud icon in top right corner of editor tab.
- `SSJS: Run` lets your preview your script or opens the script in the browser (depending on your Prefereces).
- `SSJS: Get Dev Path` command will give you the deployed URL.

![SSJS Manager](https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/ssjs-vsc-demo1.2.gif)

### Commands

To be run using `Ctrl` + `Shift` + `P` (Win) / `CMD` + `Shift` + `P` (Mac) / F1.
The list of all commands can be seen in the `Extensions > SSJS Manager > Features > Comnands`.

### Linting

Finding mistakes and typos in your SSJS code has never been easier!  

SSJS files are auto-checked automatically on save, if you wish so.  
Control this via VSCode Preference: `SSJS: Lint on save`.

Use `SSJS: Lint Current SSJS File` to lint SSJS within `AMPscript` and `HTML` files.  
The linter also supports `JavaScript` files (without ssjs script tags). To enable this, add `.js` to `Additional file types ` in SSJS Manager Preferences. Then lint via command.

### Live Preview

Sometimes you might want to develop your page locally, without SFMC Engagement and might need templating.
Enter Live Preview.

![SSJS Manager Live Preview](https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/live-preview-demo.gif)

### Hooks

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

## Telemetry

This extension is collecting some telemetry in order to allow for future improvements and bugfixes.  

## Sponsors

I would like to thank my sponsors:

[![FLO](https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/flo.png "FLO Logo")](https://www.weareflo.com/)  
(former bluez.io)

Let me know, if you would like to sponsor me.

No personal information, API Keys nor script content is collected and VSCode overall telemetry opt-out is honored.

## Known Issues

Work in progress - some errors may appear.  
In such case, let me know on my [GitHub here!](https://github.com/fib3/ssjs-vsc/issues)

- Upcoming improvements to security of development Cloud Pages.
- Multi-root workspaces are not supported.