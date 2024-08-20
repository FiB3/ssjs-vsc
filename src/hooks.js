const path = require('path');
const vscode = require('vscode');
const { exec } = require('child_process');

const BaseConfig = require('./config/baseConfig');
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
	 * @return {number or string} success
	 * string: output file path to upload
	 * 2 hook not run - but upload can continue,
	 * 1 on success (continue upload),
	 * 0 don't upload (upload disabled in hook),
	 * -1 false on fail (no upload to do)
	 */ 
	async runSave(filePath, autoUpload = false) {
		if (!filePath) {
			logger.error('Hook or filePath not provided.');
			return -1;
		}

		let hook = this.config.getHooks(`on-save`, getFileExtension(filePath));		
		if (!hook.enabled) { // not enabled or config not found
			logger.debug(`Hook not enabled or not found for ${getFileExtension(filePath)}.`);
			return 2;
		}

		if (hook['success-handling' === 'incorrect']) {
			vscode.window.showErrorMessage(`Incorrect hook configuration (success-handling).`);
			return -1;
		}
		
		let snippetExists = this.snippets.snippetExists(filePath);
		if (snippetExists || !autoUpload) {
			let execOk = await execute(hook.command);
			if (!execOk) {
				return -1;
			}
			// on OK:
			logger.info(`Hook executed successfully - handling: ${hook['success-handling']}.`);
			if (hook['success-handling'] === 'none') {
				// success-handling
				return 0;
			} else if(hook['success-handling'] === 'upload-self') {
				return 1;
			} else if (hook['success-handling'] === 'upload-output') {
				let newPath;
				if (!hook['output-file']) {
					vscode.window.showErrorMessage(`Missing hook configuration: 'output-file'.`);
					return -1;
				}
				try {
					newPath = getOutputFilePath(hook['output-file'], filePath);
				} catch (e) {
					vscode.window.showErrorMessage(`Error on getting hook 'output-file' path: ${e.message}`);
					return -1;
				}
				// create Metadata if needed - linkMetadata
				if (!snippetExists) {
					await this.snippets.saveLinkMetadata(filePath, newPath);
				}
				// cannot use path from root, but absolute path from workspace root
				newPath = path.join(BaseConfig.getUserWorkspacePath(), newPath);
				return newPath;
			} else {
				vscode.window.showErrorMessage(`Hook configuration incorrect or not found (success-handling).`);
				return -1;
			}
		} else {
			vscode.window.showInformationMessage(`Run 'SSJS: Upload Script to Dev' command to deploy any script for the first time.`);
			return 0;
		}
	}
}

/**
 * Execute a command for a hook.
 * @param {string} command 
 * @returns {Promise<string>} stdout or stderr
 */
async function execute(command) {
	function printCmdRes(data, isOk = true, cmd, pth) {
		let d = new Date();
		let p = pth; //path.dirname(pth);
		let text = `[ ${p} ] $ ${command}

${data}
-----${isOk ? `--- OK ---` : ` FAILED `}-----
----- ${addZero(d.getHours())}:${addZero(d.getMinutes())}:${addZero(d.getSeconds())} -----`;

		vsc.debug.clear();
		if (isOk) {
			vsc.debug.info(text);
		} else {
			vsc.debug.error(text);
		}
	}

	if (!command) {
		logger.error('No command provided.');
		return;
	}

	let usePath = BaseConfig.getUserWorkspacePath();
	let cmd = `cd ${usePath}; ${command}`;

	let cmdOk = false;
	await runCommand(cmd)
			.then((result) => {
				printCmdRes(result, true, command, usePath);
				cmdOk = true;
			})
			.catch((error) => {
				printCmdRes(result, false, command, usePath);
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
	logger.debug(`Output file path: ${outputTemplate} + ${filePath} => ${outputFilePath}.`);
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

function addZero(i) {
	if (i < 10) {
		i = "0" + i;
	}
	return i;
}