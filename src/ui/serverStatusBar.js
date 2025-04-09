const vscode = require('vscode');
const logger = require('../auxi/logger');

class ServerStatusBar {
	constructor() {
		this.statusBar = null;
	}

	create(context) {
		this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		context.subscriptions.push(this.statusBar);
		this.hide(); // Initially hidden
	}

	show(port) {
		if (!this.statusBar) {
			logger.error('Server status bar not initialized');
			return;
		}
		this.statusBar.text = `$(radio-tower) SSJS: ${port}`;
		this.statusBar.tooltip = `SSJS Asset Server running on port ${port}`;
		this.statusBar.show();
	}

	hide() {
		if (!this.statusBar) {
			return;
		}
		this.statusBar.hide();
	}
}

module.exports = new ServerStatusBar();