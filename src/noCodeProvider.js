const vscode = require('vscode');

const Config = require('./config');

module.exports = class NoCodeProvider {

	constructor(config, statusBar) {
		this.config = config;
		this.statusBar = statusBar;
	}

	async init() {
		this.statusBar.setEnabled(true);
		/* needs to be set in each provider since provider from config might be different from the activated one
		 *e.g.: if the extension is not set up correctly
		 */
		vscode.commands.executeCommand('setContext', 'ssjs-vsc.codeProvider', 'None');
		Config.updateAllowedFileTypesInVsCodeContext();
	}

	async deactivate() {
		this.statusBarsetDeactivated();
	}

	async updateAnyScript() {
		this._checkCommand();
	}

	async uploadToProduction() {
		this._checkCommand();
	}

	/**
	 * Upload to dev.
	 * @param {*} autoUpload true if this was triggered automatically by a file save, false when triggered by a command.
	 */
	async uploadScript(autoUpload) {
		if (!autoUpload) {
			this._checkCommand();
		}
	}

	async getDevUrl() {
		this._checkCommand();
	}

	async getStandaloneScript() {
		this._checkCommand();
	}

	async startServer() {
		this._checkCommand();
	}

	async stopServer() {
		this._checkCommand();
	}

	async getLivePreviewUrl() {
		this._checkCommand();
	}

	_checkCommand() {
		if (Config.isNoneProvider()) {
			vscode.window.showWarningMessage(`Code Providers switched off!`);
		} else if (!this.config?.isSetupValid()) {
			vscode.window.showWarningMessage(`SSJS Manager is not configured.`);
		} else {
			vscode.window.showWarningMessage(`Command not supported with ${Config.getCodeProvider()} Provider.`);
		}
	}
}