const vscode = require('vscode');

const Config = require('./config');

module.exports = {

	create(context) {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
		context.subscriptions.push(this.statusBarItem);
		this.setDeactivated();
	},

	setMessage(text, tooltip) {
		this.statusBarItem.text = text ? text : `SSJS Manager`;
		this.statusBarItem.tooltip = tooltip ? tooltip : ``;
		this.statusBarItem.show();
	},

	setEmpty() {
	},

	setStart(fqdn) {
		this.fqdn = fqdn;
		this.setMessage(`SSJS Active`, `SSJS Server running on: ${fqdn}`);
		this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.debuggingBackground');
		this.statusBarItem.show();
	},

	setDeactivated() {
		if (Config.isServerProvider()) {
			this.setMessage(`SSJS Not Running`, `SSJS Server not running.`);
		} else if (Config.isAssetProvider()) {
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