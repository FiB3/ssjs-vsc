const vscode = require('vscode');

module.exports = {

	create(context) {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
		context.subscriptions.push(this.statusBarItem);
		this.setDeactivated();
	},

	setMessage(text, tooltip) {
	this.statusBarItem.text = text ? text : `SSJS Server`;
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
		this.setMessage(`SSJS Not Active`, `SSJS Server not running.`);
		this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.offlineBackground');
	},

	setError(error) {
		this.statusBarItem.text = `SSJS Error`;
		this.statusBarItem.tooltip = error;
		this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
		this.statusBarItem.show();
	},
};