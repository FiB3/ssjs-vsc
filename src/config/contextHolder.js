const vscode = require('vscode');

/**
 * ContextHolder is a singleton class that holds the context of the extension.
 * It holds anything, that is not config, preferences but still needs to be accessible from everywhere.
 */
class ContextHolder {
	constructor() {
		this.context = null;
	}

	/**
	 * Initializes the context holder with the given context.
	 * @param {vscode.ExtensionContext} context
	 */
	init(context) {
		this.context = context;
	}

	/**
	 * Returns the context of the extension.
	 * @returns {vscode.ExtensionContext}
	 */
	getContext() {
		return this.context;
	}

	/**
	 * Returns true if the extension is running in production mode.
	 * @returns {boolean}
	 */
	isProduction() {
		return this.context.extensionMode === vscode.ExtensionMode.Production;
	}
}

module.exports = new ContextHolder();