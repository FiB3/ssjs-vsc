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

/**
 * Get the language name of the active editor.
 * @returns {string} language name
 */
function getFileLanguage() {
	const activeTextEditor = vscode.window.activeTextEditor;
	if (activeTextEditor) {
		return activeTextEditor.document.languageId;
	}
	return false;
}

/**
 * Open the given file path.
 * @param {string} filePath
 * @param {boolean} [doOpen=true] open the file (just to simplify the code elsewhere)
 */
function openTextDocument(filePath, doOpen = true) {
	if (!doOpen) {
		return;
	}
	vscode.workspace.openTextDocument(filePath).then((doc) =>
		vscode.window.showTextDocument(doc, {
		})
	);
}

function openInBrowser(url) {
	vscode.env.openExternal(vscode.Uri.parse(url));
}

function copyToClipboard(text) {
	vscode.env.clipboard.writeText(text);
}

module.exports = {
	getActiveEditor,
	getFileLanguage,
	openTextDocument,
	openInBrowser,
	copyToClipboard,
	debug
}