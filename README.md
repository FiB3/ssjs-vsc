# SSJS Manager

Simplify & speed up Server Side JavaScript and AMPscript development in Salesforce Marketing Cloud.
From syntax highlight through rapid testing and preview in VS Code and Cursor.

![SSJS Manager Preview](https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/ssjs-vsc-demo2.0.gif)

## Features

- Support rapid code development of SSJS scripts via SFMC's Cloud Pages.
- Preview within VSCode / Cursor - with a WYSIWYG for Cloud Pages and more information rich preview for scripts.
- SSJS Snippets.
- Mustache templating of scripts and pages to ensure your env security when using repositories.
- Live Previvew feature for pure HTML files that includes templating.
- Configuration Wizard UI.

Syntax highlighting, IntelliSense, diagnostics and formatting for `.ssjs`, `.amp` and `.ampscript` are provided by the required [SFMC Language Service](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-language) extension (see [Language Support](#language-support) below).

Start saving time now...

### [Complete Guide](https://fibworks.com/ssjs-vsc)
[Issue Reporting on GitHub](https://github.com/FiB3/ssjs-vsc/issues)

## Language Support

SSJS Manager **requires** the [SFMC Language Service](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-language) extension (`joernberkefeld.sfmc-language`), which is installed automatically as an extension dependency. It provides all language intelligence for `.ssjs`, `.amp` and `.ampscript` files:

- Syntax highlighting (grammars).
- IntelliSense (completions, hover, signature help).
- Diagnostics (SSJS + AMPscript linting).
- Formatting.

SSJS Manager's previously bundled SSJS ESLint linter and `beauty-amp-core2` formatter (together with its own grammars and language ids) have been **removed** in favor of the SFMC Language Service, so there is a single provider of language intelligence and no duplicate/conflicting diagnostics. SSJS Manager keeps its own snippets, deploy, run, live-preview and configuration features.

On activation, SSJS Manager sets the SFMC Language Service's `sfmcLanguageServer.ssjsFileMode` setting to `sfmc` (Workspace scope). Because SSJS Manager's `.ssjs` files are HTML that wrap their code in `<script runat="server">...</script>`, every `.ssjs` file is treated as SFMC content — so the embedded SSJS is linted (and AMPscript/HTML handled) correctly — with no per-file content scan.

SSJS Manager historically formatted AMPscript keywords in **UPPERCASE**, while the SFMC Language Service's formatter defaults to lowercase. To keep migrating users' casing, on activation SSJS Manager adds `"ampscriptKeywordCase": "upper"` to the workspace Prettier config (the SFMC Language Service supplies `prettier-plugin-sfmc` itself, so no `plugins` entry is needed). JSON configs are updated silently or created if missing; JS/YAML/TOML configs get a one-time hint with the line to add. An explicit `ampscriptKeywordCase` you already set is never changed, and if you had turned uppercase off nothing is written.

If you also have the separate `FiB.beautyAmp` extension installed, it is independent of SSJS Manager; you may disable it to avoid a duplicate AMPscript formatter (the SFMC Language Service surfaces a coexistence prompt when both claim AMPscript formatting).

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

### Linting & Formatting

Finding mistakes and typos in your SSJS and AMPscript code, syntax highlighting and formatting are provided by the required [SFMC Language Service](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-language) extension - see [Language Support](#language-support). SSJS Manager no longer bundles its own linter or formatter.

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

This extension is collecting some telemetry (basic usage stats and errors) in order to allow for future improvements and bugfixes.

No personal information, API Keys nor script content is collected. VSCode / Cursor telemetry opt-out is honored.

## Sponsors

Looking for sponsors: Let me know, if you would like to sponsor this extension.

## Known Issues

Work in progress - some errors may appear.  
In such case, let me know on my [GitHub here!](https://github.com/fib3/ssjs-vsc/issues)