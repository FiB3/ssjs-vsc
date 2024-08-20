const path = require('path');
const vscode = require('vscode');
const { exec } = require('child_process');

const SnippetHandler = require('./snippetHandler');
const vsc = require('./vsc');
const logger = require('./auxi/logger');

module.exports = class Hooks {

	constructor(config) {
		this.config = config;
		this.snippets = new SnippetHandler(this.config);
	}

	/**
	 * Run hook on save.
	 * @return {boolean} success
	 * true on success,
	 * null if not run - but upload can continue,
	 * false on fail (no upload to do)
	 */ 
	async runSave(filePath, autoUpload = false) {
		if (!filePath) {
			logger.error('Hook or filePath not provided.');
			return false;
		}

		let hook = this.config.getHooks(`on-save`, getFileExtension(filePath));		
		if (!hook.enabled) { // not enabled or config not found
			logger.debug(`Hook not enabled or not found for ${getFileExtension(filePath)}.`);
			return null;
		}

		if (hook['success-handling' === 'incorrect']) {
			vscode.window.showErrorMessage(`Incorrect hook configuration (success-handling).`);
			return false;
		}
		
		if (this.snippets.snippetExists(filePath) || !autoUpload) {
			let execOk = await execute(hook.command);
			if (!execOk) {
				return false;
			}
			// on OK:
			if (hook['success-handling' === 'none'] || hook['success-handling' === 'upload-self']) {
				return true;
			} else if (hook['success-handling' === 'upload-output']) {
				let newPath;
				if (!hook['output-file']) {
					vscode.window.showErrorMessage(`Missing hook configuration: 'output-file'.`);
					return false;
				}
				try {
					newPath = getOutputFilePath(hook['output-file'], filePath);
				} catch (e) {
					vscode.window.showErrorMessage(`Error on getting hook 'output-file' path: ${e.message}`);
					return false;
				}
				return newPath;
			}
		} else {
			vscode.window.showInformationMessage(`Run 'SSJS: Upload Script to Dev' command to deploy any script for the first time.`);
			return null;
		}
	}
}

/**
 * Execute a command for a hook.
 * @param {string} command 
 * @returns {Promise<string>} stdout or stderr
 */
async function execute(command) {
	if (!command) {
		logger.error('No command provided.');
		return;
	}

	let cmdOk = false;
	// TODO: make it look more like terminal (user / timestamp)
	await runCommand(command)
			.then((result) => {
				vsc.debug.info(result);
				cmdOk = true;
			})
			.catch((error) => {
				vsc.debug.error(error);
			});

	return cmdOk;
}

function runCommand(command) {
	logger.debug(`Running command: ${command}, typeof:${typeof(command)}.`);
	return new Promise((resolve, reject) => {
			exec(command, (error, stdout, stderr) => {
					if (error) {
							reject(`Error: ${error.message}`);
					} else if (stderr) {
							reject(`Stderr: ${stderr}`);
					} else {
							resolve(stdout);
					}
			});
	});
}

function getOutputFilePath(outputTemplate, filePath) {
	// output template: "./dist/{{name}}.ssjs" + "./src/fileName.js" => "./dist/fileName.ssjs"
	let fileName = getFileName(filePath, true);
	let outputFilePath = outputTemplate.replace('{{name}}', fileName);
	// if (!path.isValid(outputFilePath)) {
	// 	throw new Error(`Invalid path: ${outputFilePath}`);
	// }
	return outputFilePath;
}

function getFileName(filePath, removeSuffix = true) {
	if (removeSuffix) {
		return path.basename(filePath, path.extname(filePath));
	}
	return path.basename(filePath);
}

function getFileExtension(filePath) {
	return path.extname(filePath);
}