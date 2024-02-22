const vscode = require('vscode');
const path = require('path');

/**
 * Get the path to the root of the workspace.
 * @returns {string} path to the workspace
 */
function getUserWorkspacePath() {
	// TODO: improve with e.g.: workspace.workspaceFolders
	return vscode.workspace.rootPath;
}

/**
* Check if there is an active editor tab window and get URL of active file.
* @returns {string|boolean} path to file or false
*/
function getActiveEditor(relativePath = false) {
	const activeTextEditor = vscode.window.activeTextEditor;
	if (activeTextEditor) {
			const fileUri = activeTextEditor.document.uri;
			if (relativePath) {
				return path.relative(getUserWorkspacePath(), fileUri.fsPath);
			}
			return fileUri.fsPath;
	} else {
		console.log('No file is currently open: vsc.getActiveEditor().');
		vscode.window.showErrorMessage('No file is currently open.');
	}
}

module.exports = {
	getUserWorkspacePath,
	getActiveEditor
}