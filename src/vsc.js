const vscode = require('vscode');

module.exports = {

	/**
	 * Check if there is an active editor tab window and get URL of active file.
	 * @returns {string|boolean} path to file or false
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