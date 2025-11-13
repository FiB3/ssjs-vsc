const vscode = require('vscode');
const path = require('path');

const Config = require('../config');
const file = require('../auxi/file');
const Pathy = require('../auxi/pathy');
const vsc = require('../vsc');
const dialogs = require('../ui/dialogs');
const logger = require('../auxi/logger');

class SourceCode {
  /**
   * Save the given script text to the given file path.
   * @param {string} filePath 
   * @param {string} snippetText 
   * @param {boolean} withFileOpen 
   * @returns {string} path of the saved file.
   */
	static save(filePath, snippetText, withFileOpen = false) {
		const scriptPath = !path.isAbsolute(filePath)
				? Pathy.joinToRoot(filePath)
				: filePath;

		// logger.log(`Code Snippet Path: ${scriptPath}`);
		file.save(scriptPath, snippetText);
		vsc.openTextDocument(scriptPath, withFileOpen);

		return scriptPath;
	}

	/**
	 * Load the given file path.
	 * @param {string|vscode.Uri} filePath - relative or absolute path of the file.
	 * @returns {string} path of the saved file.
	 */
	static load(filePath) {
		// Handle URI input
		if (filePath.fsPath) {
			filePath = filePath.fsPath;
		}

		// Convert relative path to absolute
		if (!path.isAbsolute(filePath)) {
			filePath = Pathy.joinToRoot(filePath);
		}

		return file.load(filePath);
	}

	/**
	 * Select file from the workspace or from the given path.
	 * @param {string} fileOverride to target a specific file instead of the active one.
	 * @returns {string|boolean} path to the file if exists, false otherwise.
	 */
	static selectFile(fileOverride = false) {
		let filePath = fileOverride || vsc.getActiveEditor();
		return file.exists(filePath) ? filePath : false;
	}

	/**
	 * Compare the given code with the content of the source code file.
	 * Expects that the file exists.
	 * @param {string} content to compare with the file content.
	 * @param {string} filePath path of the source code file.
	 * @param {string} assetName name of the asset.
	 * @returns {object} comparison result: { updated: boolean, sameContent: boolean }
	 */
	static async runCodeComparison(content, filePath, assetName) {
		const currentContent = SourceCode.load(filePath);

		if (content !== currentContent) {
			// Show diff comparison
			const currentUri = vscode.Uri.file(filePath);
			const tempPath = filePath + '.temp';
			
			try {
				file.save(tempPath, content);
				const newUri = vscode.Uri.file(tempPath);

				// Show diff
				await vscode.commands.executeCommand('vscode.diff', currentUri, newUri, 
					`Local ↔ Remote (${assetName})`);

				// Ask user if they want to update the file
				const update = await dialogs.yesNoConfirm(
					'Content differs from SFMC',
					`The content in SFMC differs from your local file. Do you want to update the file with the content from SFMC?`,
					'Your current changes will be overwritten.'
				);

				if (update) {
					// Update the file
					SourceCode.save(filePath, content, true);
					vscode.window.showInformationMessage(`Asset "${assetName}" saved successfully.`);
					return { updated: true, sameContent: false };
				} else {
					vscode.window.showInformationMessage('File update cancelled.');
					return { updated: false, sameContent: false };
				}
			} finally {
				// Clean up temp file
				if (file.exists(tempPath)) {
					file.delete(tempPath);
				}
			}
		} else {
			// Content is the same
			vscode.window.showInformationMessage(`Asset "${assetName}" is up to date. No changes needed.`);
			return { updated: false, sameContent: true };
		}
	}
}

module.exports = SourceCode;