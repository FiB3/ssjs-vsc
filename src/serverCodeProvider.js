const vscode = require('vscode');

const BaseCodeProvider = require('./baseCodeProvider');

module.exports = class ServerCodeProvider extends BaseCodeProvider {

	constructor(config) {
		super(config);
	}

	async init() {

	}

	async deployAnyScript() {
		vscode.window.showWarningMessage(`Code Providers switched off!`);
	}

	async startServer() {
		vscode.window.showWarningMessage(`Code Providers switched off!`);
	}

	async stopServer() {
		vscode.window.showWarningMessage(`Code Providers switched off!`);
	}
}