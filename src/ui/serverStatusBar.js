const vscode = require('vscode');

const ContextHolder = require('../config/contextHolder');
const logger = require('../auxi/logger');

class ServerStatusBar {
	constructor() {
		this.statusBar = null;
	}

	create() {
		this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		ContextHolder.getContext().subscriptions.push(this.statusBar);
		this.hide(); // Initially hidden
	}

	show(port) {
		if (!this.statusBar) {
			logger.error('Server status bar not initialized');
			return;
		}
		this.statusBar.text = `$(radio-tower) SSJS: ${port}`;
		this.statusBar.tooltip = `SSJS Live Preview Server running on port ${port}`;
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