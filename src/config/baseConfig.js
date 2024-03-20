const vscode = require('vscode');
const path = require('path');
const file = require('../auxi/file');
const folder = require('../auxi/folder');
const jsonHandler = require('../auxi/json');
const telemetry = require('../telemetry');

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
		const templatePath = path.join(BaseConfig.getExtensionSourceFolder(), SETUP_TEMPLATE);
		let configTemplate = jsonHandler.load(templatePath);

		configTemplate["extension-version"] = BaseConfig.getExtensionVersion();
		
		const setupFolder = path.join(BaseConfig.getUserWorkspacePath(), SETUP_FOLDER_NAME);
		folder.create(setupFolder);
	
		jsonHandler.save(BaseConfig.getUserConfigPath(), configTemplate);
		this.loadConfig();
	}

	/**
	 * Load the configuration file to .config property.
	 * @returns {Object} Configuration object.
	 */
	loadConfig() {
		const configPath = BaseConfig.getUserConfigPath();
		console.log(`Loading Config File...:`, configPath);
		const config = jsonHandler.load(configPath);

		if (config.error) {
			throw `No SSJS Setup File found. Use "create-config" command to create the ${SETUP_FILE_NAME} file.`;
		} else {
			console.log(`Config Reloaded.`);
		}
		this.config = config;
		return config;
	}

	/**
	 * Update the configuration file from .config property.
	 * @param {boolean} [withFileOpen=false] Open the file after creation.
	 */
	saveConfigFile(withFileOpen = false) {
		jsonHandler.save(BaseConfig.getUserConfigPath(), this.config);
		if (withFileOpen) {
			vscode.workspace.openTextDocument(BaseConfig.getUserConfigPath());
		}
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
			// console.log(`PATH SET! Data:`, BaseConfig.getUserWorkspacePath(), SETUP_FILE_NAME);
			pth = path.join(BaseConfig.getUserWorkspacePath(), SETUP_FILE_NAME);
		} catch (err) {
			console.log(`PATH NOT SET! Data:`, BaseConfig.getUserWorkspacePath(), SETUP_FILE_NAME);
		}
		return pth;
	}

	/**
	 * Get the some of the package.json data.
	 * @returns {Object} Repository and version data.
	 */
	static getPackageJson() {
		const packageJsonFile = path.join(BaseConfig.getExtensionSourceFolder(), './package.json');
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
		return BaseConfig.getUserWorkspacePath() ? true : false;
	}

	/**
	 * Get the path to the workspace.
	 * @returns {string} Path to the workspace, or false if not set.
	 */
	static getUserWorkspacePath() {
		const [workspaceFolder] = vscode.workspace.workspaceFolders || [];
    if (!workspaceFolder) {
        return false;
    }

    return workspaceFolder.uri.fsPath;
	}

	/**
	 * Check if the file is in the current workspace.
	 * @param {string} filePath Path to the file.
	 * @returns {boolean} True if the file is in the workspace. false otherwise or if the workspace or file is not set.
	 */
	static isFileInWorkspace(filePath) {
		const workspacePath = BaseConfig.getUserWorkspacePath();
		if (!workspacePath || !filePath) {
			return false;
		}
    // Normalize paths to ensure consistent format
    const absoluteFilePath = path.resolve(filePath);
    const absoluteWorkspacePath = path.resolve(workspacePath);

    return absoluteFilePath.startsWith(absoluteWorkspacePath);
	}

	/**
	 * Get the main (root) folder of the extension - where the package.json/extension.js is.
	 * @note this depends on location of this script!
	 * @returns {string} Path to the main folder of the extension.
	 */
	static getExtensionSourceFolder() {
		return path.join(__dirname, '../..');
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