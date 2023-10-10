const vscode = require('vscode');

const Config = require('./config');

module.exports = class BaseCodeProvider {

	constructor(config) {
		this.config = config;
	}

	async init() {

	}

	async deployAnyScript() {
		this._checkCommand();		
	}

	async uploadScript() {
		this._checkCommand();
	}

	async startServer() {
		this._checkCommand();
	}

	async stopServer() {
		this._checkCommand();
	}

	_checkCommand() {
		if (Config.isNoneProvider()) {
			vscode.window.showWarningMessage(`Code Providers switched off!`);
		} else {
			vscode.window.showWarningMessage(`Command not supported with ${Config.getCodeProvider()} Provider.`);
		}
	}
}