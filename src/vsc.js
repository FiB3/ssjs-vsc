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
		return false;
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
 * Flash the current editor tab based on the status.
 * @param {string} status - 'ok', 'warn' or 'error'
 */
function flashEditorTab(status = 'ok') {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		logger.warn('No active editor found for flashing');
		return;
	}

	// Define colors with proper alpha channel
	const colors = {
		ok: 'rgba(0, 255, 0, 0.3)',    // Light green
		warn: 'rgba(255, 255, 0, 0.3)', // Light yellow
		error: 'rgba(255, 0, 0, 0.3)'   // Light red
	};

	const backgroundColor = colors[status] || colors.ok;
	let decorationType = null;
	let lastDecorationType = null; 
	let currentOpacity = 0.15;
	let maxOpacity = 0.2;
	const fadeStep = 0.0125;
	const intervalMs = 50;

	// Create the full document range
	const firstLine = editor.document.lineAt(0);
	const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
	const fullRange = new vscode.Range(firstLine.range.start, lastLine.range.end);

	function updateDecoration(opacity) {
		if (decorationType) {
			lastDecorationType = decorationType;
		}

		// Create new decoration with current opacity
		const color = backgroundColor.replace(/[\d.]+\)$/, `${opacity})`);
		decorationType = vscode.window.createTextEditorDecorationType({
			isWholeLine: true,
			backgroundColor: color
		});

		editor.setDecorations(decorationType, [fullRange]);
		lastDecorationType?.dispose();
	}

	// Initial flash
	updateDecoration(currentOpacity);
	// Fade out animation
	const fadeInterval = setInterval(() => {
		currentOpacity = currentOpacity >= maxOpacity ? currentOpacity + fadeStep : currentOpacity - fadeStep;
		
		if (currentOpacity <= 0) {
			// Animation complete - cleanup
			clearInterval(fadeInterval);
			if (decorationType) {
				decorationType.dispose();
				decorationType = null;
			}
			logger.log('Editor tab flash animation completed');
		} else {
			updateDecoration(currentOpacity);
		}
	}, intervalMs);
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
	flashEditorTab,
	openTextDocument,
	openInBrowser,
	copyToClipboard,
	debug
}