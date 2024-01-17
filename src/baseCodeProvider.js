const vscode = require('vscode');
var path = require('path');

const Config = require('./config');
const mcClient = require('./sfmc/mcClient');
const { template } = require('./template');

const USABLE_EXT = [ `.ssjs`, `.html`, `.amp` ];

module.exports = class BaseCodeProvider {

	constructor(config, statusBar) {
		this.config = config;
		this.statusBar = statusBar;

		this.mc = null;
	}

	async init(initMcClient = false, testConnection = false) {
		this.statusBar.setEnabled();
		if (initMcClient) {
			let c = await this.config.getSfmcInstanceData();
			if (!c) {
				vscode.window.showWarningMessage(`We could not obtain your API Client Secret. If you have set your credentials already, try updating VSCode and the extension. You can also try disable and enable the extension.`);
			}
			this.mc = new mcClient(c.subdomain, c.clientId, c.clientSecret, c.mid);
			// TODO: validate token:
			if (testConnection === true) {
				this.mc.validateApiKeys()
						.then(() => {
							console.log(`API Keys OK.`);
						})
						.catch((err) => {
							console.error('TEST SFMC-Connection ERR:', err);
							let m = this.mc.parseRestError(err);
							vscode.window.showErrorMessage(`SFMC API Credentials issue: \n${m}`);
						});
			}
		}
	}

	async deactivate() {
	}

	async deployAnyScript() {
		this._checkCommand();		
	}

	async uploadToProduction() {
		// base provider will only be able to build to clipboard
		// other providers will need to have more checks.
		let scriptText = this.buildScriptText(false);
		if (scriptText) {
			vscode.env.clipboard.writeText(scriptText);
		} else {
			// script was not uploaded:
			vscode.window.showWarningMessage(`Script cannot be built for Production! Maybe it's the file format?`);
		}
	}

	async uploadScript(autoUpload) {
		if (!autoUpload) {
			this._checkCommand();
		}
	}

	async startServer() {
		this._checkCommand();
	}

	async stopServer() {
		this._checkCommand();
	}

	async getDevUrl() {
		this._checkCommand();
	}

	buildScriptText(isDev) {
		const activeTextEditor = vscode.window.activeTextEditor;

		if (activeTextEditor) {
			// Get the URI (Uniform Resource Identifier) of the currently open file
			const fileUri = activeTextEditor.document.uri;
			// Convert the URI to a file path
			const filePath = fileUri.fsPath;

			if (!USABLE_EXT.includes(path.extname(filePath))) {
				return false;
			}
			let fileText = template.runScriptFile(filePath, this.config, isDev);
			return fileText;

		} else {
			console.log('No file is currently open.');
			// vscode.window.showErrorMessage('No file is currently open.');
			return false;
		}
	}

	_checkCommand() {
		if (Config.isNoneProvider()) {
			vscode.window.showWarningMessage(`Code Providers switched off!`);
		} else {
			vscode.window.showWarningMessage(`Command not supported with ${Config.getCodeProvider()} Provider.`);
		}
	}
}