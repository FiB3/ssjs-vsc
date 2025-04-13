const vscode = require('vscode');

const Config = require('../config');
const ContextHolder = require('../config/contextHolder');

module.exports = {

	create() {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
		ContextHolder.getContext().subscriptions.push(this.statusBarItem);
		this.setDeactivated();
	},

	setMessage(text, tooltip) {
		this.statusBarItem.text = text ? text : `SSJS Manager`;
		this.statusBarItem.tooltip = tooltip ? tooltip : ``;
		this.statusBarItem.show();
	},

	setEmpty() {
	},

	setEnabled(isNoneProvider = false) {
		if (!isNoneProvider && Config.isAssetProvider()) {
			this.setMessage(`SSJS Connected`, `Script upload enabled.`);
		} else {
			this.setMessage(`SSJS file`, `SSJS Supported File.`);
		}
		this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.debuggingBackground');
		this.statusBarItem.show();
	},

	setStart(fqdn) {
		if (Config.isAssetProvider()) {
			this.setMessage(`SSJS Connected`, `Script upload enabled.`);
		} else {
			this.setMessage(`SSJS file`, `SSJS Supported File.`);
		}
		this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.debuggingBackground');
		this.statusBarItem.show();
	},

	setDeactivated() {
		if (Config.isAssetProvider()) {
			this.setMessage(`SSJS Not Active`, `Not possible to deploy.`);
		} else {
			this.setMessage(`SSJS Inactive`, `No Code Provider Selected.`);
		}
		this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.offlineBackground');
	},

	setError(error) {
		this.statusBarItem.text = `SSJS Error`;
		this.statusBarItem.tooltip = error;
		this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
		this.statusBarItem.show();
	}
};