const vscode = require('vscode');
const path = require('path');

const Config = require('../config');
const file = require('../auxi/file');
const Pathy = require('../auxi/pathy');
const vsc = require('../vsc');
// const logger = require('../auxi/logger');

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
}

module.exports = SourceCode;