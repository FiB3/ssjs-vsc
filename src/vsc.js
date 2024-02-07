const vscode = require('vscode');

module.exports = {

	/**
	 * Check if there is an active editor tab window and get URL from it.
	 * @returns {string|boolean} URL or false
	 
	 */
	getActiveEditor: () => {
		const activeTextEditor = vscode.window.activeTextEditor;
		if (activeTextEditor) {
			const fileUri = activeTextEditor.document.uri;
			return fileUri.fsPath;
		} else {
			vscode.window.showErrorMessage('No file is currently open.');
		}
	}
}