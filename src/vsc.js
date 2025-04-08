const vscode = require('vscode');
const path = require('path');
const logger = require('./auxi/logger');
const debug = require('./ui/debugConsole');
const Pathy = require('./auxi/pathy');

/**
* Check if there is an active editor tab window and get URL of active file.
* @returns {string|boolean} path to file or false
*/
function getActiveEditor(relativePath = false) {
	const activeTextEditor = vscode.window.activeTextEditor;
	if (activeTextEditor) {
			const fileUri = activeTextEditor.document.uri;
			if (relativePath) {
				return path.relative(Pathy.getWorkspacePath(), fileUri.fsPath);
			}
			return fileUri.fsPath;
	} else {
		logger.error('No file is currently open: vsc.getActiveEditor().');
		vscode.window.showErrorMessage('No file is currently open.');
	}
}

module.exports = {
	getActiveEditor,
	debug
}