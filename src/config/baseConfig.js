const vscode = require('vscode');
const path = require('path');
const file = require('../auxi/file');
const Pathy = require('../auxi/pathy');
const folder = require('../auxi/folder');
const jsonHandler = require('../auxi/json');
const logger = require('../auxi/logger');
const vsc = require('../vsc');

const SETUP_TEMPLATE = './templates/setup.example.json';
const SETUP_FOLDER_NAME = '.vscode';
const SETUP_FILE_NAME = '.vscode/ssjs-setup.json';

const REPO_DEFAULT = 'https://github.com/FiB3';

/**
 * Base class for configuration files.
 * Handles getting and setting of the configuration file, basic info etc.
 */
module.exports = class BaseConfig {

	constructor() {
		this.config = {};
	}

	/**
	 * Create a new blank configuration file.
	 * @param {boolean} [withFileOpen=false] Open the file after creation.
	 */
	deployConfigFile() {
		const templatePath = Pathy.joinToSource(SETUP_TEMPLATE);
		let configTemplate = jsonHandler.load(templatePath);

		configTemplate["extension-version"] = BaseConfig.getExtensionVersion();
		
		const setupFolder = Pathy.joinToRoot(SETUP_FOLDER_NAME);
		folder.create(setupFolder);
	
		jsonHandler.save(BaseConfig.getUserConfigPath(), configTemplate);
		this.loadConfig();
	}

	/**
	 * Load the configuration file to .config property.
	 * @returns {Object|false} Configuration object, or false if the file is not found.
	 */
	loadConfig() {
		const configPath = BaseConfig.getUserConfigPath();
		logger.log(`Loading Config File...:`, configPath);
		if (file.exists(configPath)) {
			const config = jsonHandler.load(configPath);

			if (config.error) {
				throw `No SSJS Setup File found. Use "SSJS: Show Config" command to setup the extension.`;
			} else {
				logger.log(`Config Reloaded.`);
			}
			this.config = config;
			return config;
		}
		return false;
	}

	/**
	 * Update the configuration file from .config property.
	 * @param {boolean} [withFileOpen=false] Open the file after creation.
	 */
	saveConfigFile(withFileOpen = false) {
		jsonHandler.save(BaseConfig.getUserConfigPath(), this.config);
		vsc.openTextDocument(BaseConfig.getUserConfigPath(), withFileOpen);
	}

	static configFileExists() {
		return file.exists(BaseConfig.getUserConfigPath());
	}

	static isConfigFile(fileName) {
		return fileName.endsWith(SETUP_FILE_NAME);		
	}

	/**
	 * Get the path to the configuration file.
	 * @returns {string} Path to the configuration file.
	 */
	static getUserConfigPath() {
		let pth = false;
		try {
			pth = Pathy.joinToRoot(SETUP_FILE_NAME);
		} catch (err) {
			logger.log(`PATH NOT SET! Data:`, Pathy.getWorkspacePath(), SETUP_FILE_NAME);
		}
		return pth;
	}

	/**
	 * Get the some of the package.json data.
	 * @returns {Object} Repository and version data.
	 */
	static getPackageJson() {
		const packageJsonFile = Pathy.getPackageJson();
		let packageJson = jsonHandler.load(packageJsonFile);

		return {
			"repository": packageJson?.['repository']?.['url']
					? packageJson['repository']['url'] : REPO_DEFAULT,
			"homepage": packageJson?.['homepage']
					? packageJson['homepage'] : REPO_DEFAULT,
			"version": packageJson?.['version']
					? packageJson['version'] : 'v?.?.?'
		};
	}

	/**
	 * Get the version of the extension from package.json.
	 * @returns {string} Version of the extension (e.g. "v1.2.3").
	*/
	static getExtensionVersion() {
		let packageJson = BaseConfig.getPackageJson();
		return packageJson?.['version'];
	}

	static isWorkspaceSet() {
		return Pathy.getWorkspacePath() ? true : false;
	}

	/**
	 * Check if the file is in the current workspace.
	 * @param {string} filePath Path to the file.
	 * @returns {boolean} True if the file is in the workspace. false otherwise or if the workspace or file is not set.
	 */
	static isFileInWorkspace(filePath) {
		const workspacePath = Pathy.getWorkspacePath();
		if (!workspacePath || !filePath) {
			return false;
		}
    // Normalize paths to ensure consistent format
    const absoluteFilePath = path.resolve(filePath);
    const absoluteWorkspacePath = path.resolve(workspacePath);

    return absoluteFilePath.startsWith(absoluteWorkspacePath);
	}

	/**
	 * Test value from Config if it's set. Include test for `<<*>>` and undefined, null, or 0 value.
	 * @param {*} value Value from Config file.
	 * @param {*} [defaultVal=false] Default value if not set it uses false
	 * @returns {*|false} Value or false if not set.
	 */
	static validateConfigValue(value, defaultVal = false) {
		return value === undefined || value === null
				|| value === 0
				|| (typeof(value) == 'string' && (
					value.trim() === '' || value?.startsWith('<<') || value?.startsWith('{{')))
			? defaultVal
			: value;
	}
	/**
	 * Create a URL from FQDN and path.
	 * @param {string} fqdn Fully Qualified Domain Name.
	 * @param {string} path Path.
	 * @returns {string} URL.
	 */
	static createUrl(fqdn, path) {
    const url = new URL(path, fqdn);
    return url.href;
	}

	/**
	 * Parse version string to numeric value.
	 * @param {string} version e.g. "v1.2.3" / "1.2.3"
	 * @returns {number} e.g. "v1.2.3" => 10203
	 */
	static parseVersion(version) {
		let numeric = version.replace('v', '');
		let parts = numeric.split('.');
		return Number(parts[0])*10000 +Number(parts[1]*100) + Number(parts[2])*1;
	}
}