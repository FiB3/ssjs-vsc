const vscode = require('vscode');
const path = require('path');

const generator = require('generate-password');

const jsonHandler = require('./auxi/json'); // TODO: change to `json` only
const file = require('./auxi/file');
const folder = require('./auxi/folder');

const SETUP_TEMPLATE = './templates/setup.example.json';
const SETUP_FOLDER_NAME = '.vscode';
const SETUP_FILE_NAME = '.vscode/ssjs-setup.json';

const USABLE_LANG_IDS = ['ssjs', 'html', 'ampscript'];
const USABLE_EXT = [ `.ssjs`, `.html`, `.amp` ];

module.exports = class Config {

	constructor(context, sourcePath) {
		this.context = context;

		this.config = {};
		this.sourcePath = sourcePath;
	}

	getHostPort() {
		return this.config.port || 4000;
	}

	anyPathEnabled() {
		return this.config['proxy-any-file']?.enabled ? this.config['proxy-any-file'].enabled : false;
	}

	getAnyMainPath() {
		return this.config['proxy-any-file']['main-path'];
	}

	getPublicPath() {
		let publicPath = this.config['dev-folder-path'] ? this.config['dev-folder-path'] : './';
		console.log('PARSE CONFIG:',  publicPath.startsWith('\/'), '?', publicPath, ',', this.getUserWorkspacePath(), ',', publicPath);
		
		publicPath = publicPath.startsWith('\/')
				? publicPath
				: path.join(this.getUserWorkspacePath(), publicPath);
		
		console.log(`PUBLIC PATH: "${publicPath}".`);
		
		return publicPath;
	}

	getTokens(isDev = true) {
		console.log(this.config);
		let tokensKey = isDev ? 'dev-tokens' : 'prod-tokens';
		return Object.keys(this.config[tokensKey]) ? this.config[tokensKey] : {};
	}

	getDevPageToken() {
		if (Config.isServerProvider()) {
			if (this.config?.['proxy-any-file']?.['use-token'] && this.config?.['proxy-any-file']?.['dev-token']) {
				return this.config['proxy-any-file']['dev-token'] || false;
			} else {
				return false;
			}
		} else if (Config.isAssetProvider()) {
			if (this.config?.['asset-provider']?.['use-token'] && this.config?.['asset-provider']?.['dev-token']) {
				return this.config['asset-provider']['dev-token'] || false;
			} else {
				return false;
			}
		} else {
			return false;
		}
	}

	getBasicAuth() {
		return {
			anyUser: this.config['proxy-any-file']['auth-username'],
			anyPassword: this.config['proxy-any-file']['auth-password']
		};
	}

	async getSfmcInstanceData() {
		const config = this.loadConfig();
	
		const subdomain = config['sfmc-domain'];
		const clientId = config['sfmc-client-id'];
		const mid = config['sfmc-mid'];
		let clientSecret = await this.context.secrets.get(`ssjs-vsc.${clientId}`);
		if (!clientSecret) {
			console.log(`Loading secret failed for: "${`ssjs-vsc.${clientId}`}".`);
			return false;
		}

		return {
			subdomain,
			clientId,
			mid,
			clientSecret
		};
	}

	async storeSfmcClientSecret(clientId, clientSecret) {
		await this.context.secrets.store(`ssjs-vsc.${clientId}`, clientSecret);
		console.log(`Credentials stored.`);
	}

	createConfigFile(subdomain, clientId, mid, publicDomain) {
		const templatePath = path.join(this.sourcePath, SETUP_TEMPLATE);
	
		let configTemplate = jsonHandler.load(templatePath);
		console.log(configTemplate);
		configTemplate["sfmc-domain"] = subdomain;
		configTemplate["sfmc-client-id"] = clientId;
		configTemplate["sfmc-mid"] = mid;
		configTemplate["public-domain"] = publicDomain;
		// security:
		console.log(`createConfigFile():`, configTemplate);
		configTemplate["proxy-any-file"]["auth-username"] = "user";
		configTemplate["proxy-any-file"]["auth-password"] = generator.generate({ length: 16, numbers: true });
		configTemplate["proxy-any-file"]["dev-token"] = generator.generate({ length: 36, numbers: true, uppercase: false });

		configTemplate["asset-provider"]["dev-token"] = generator.generate({ length: 36, numbers: true, uppercase: false });

		configTemplate["extension-version"] = this.getPackageJsonData().version;
		
		const setupFolder = path.join(this.getUserWorkspacePath(), SETUP_FOLDER_NAME);
		folder.create(setupFolder);
	
		jsonHandler.save(this.getUserConfigPath(), configTemplate);
		
		vscode.workspace.openTextDocument(this.getUserConfigPath());
	}

	updateConfigFile(subdomain, clientId, mid) {
		// get current setup:
		let configTemplate = jsonHandler.load(this.getUserConfigPath()); // TODO: handle non-existing file
		console.log(configTemplate);
		// update values:
		configTemplate["sfmc-domain"] = subdomain;
		configTemplate["sfmc-client-id"] = clientId;
		configTemplate["sfmc-mid"] = mid;

		configTemplate["extension-version"] = this.getPackageJsonData().version;
		// save:
		jsonHandler.save(this.getUserConfigPath(), configTemplate);
		
		vscode.workspace.openTextDocument(this.getUserConfigPath());
	}

	getAssetFolderId() {
		console.log(`FOLDER ID: ${this.config?.['asset-provider']?.['folder-id']}.`);
		return this.config?.['asset-provider']?.['folder-id'] ? this.config?.['asset-provider']?.['folder-id'] : false;
	}

	setAssetFolderId(id, folderName) {
		if (!this.config['asset-provider']) this.config['asset-provider'] = {};
		this.config['asset-provider']['folder-id'] = id;
		this.config['asset-provider']['folder'] = folderName;
		// get current setup:
		jsonHandler.save(this.getUserConfigPath(), this.config);
		vscode.workspace.openTextDocument(this.getUserConfigPath());
	}
	
	loadConfig() {
		const configPath = this.getUserConfigPath();
		const config = jsonHandler.load(configPath);
		// TODO: error if config is not yet deployed!
		if (config.error) {
			console.log(`Config.loadCofig()`, config);
			throw `No SSJS Setup File found. Use "create-config" command to create the ${SETUP_FILE_NAME} file.`;
		} else {
			console.log(`Config Reloaded.`);
		}
		this.config = config;

		return config;
	}
	
	getUserConfigPath() {
		let pth;
		try {
			pth = path.join(this.getUserWorkspacePath(), SETUP_FILE_NAME);
		} catch (err) {
			console.log(`PATH NOT SET! Data:`, this.getUserWorkspacePath(), SETUP_FILE_NAME);
		}
		return pth;
	}
	
	getUserWorkspacePath () {
		// TODO: improve with e.g.: workspace.workspaceFolders
		return vscode.workspace.rootPath;
	}

	static configFileExists() {
		return file.exists(Config.getUserConfigPathStatic());
	}

	static getUserConfigPathStatic() {
		let pth;
		try {
			pth = path.join(Config.getUserWorkspacePathStatic(), SETUP_FILE_NAME);
		} catch (err) {
			console.log(`PATH NOT SET! Data:`, Config.getUserWorkspacePathStatic(), SETUP_FILE_NAME);
		}
		return pth;
	}

	static getUserWorkspacePathStatic () {
		// TODO: improve with e.g.: workspace.workspaceFolders
		return vscode.workspace.rootPath;
	}

	/**
	 * Is passed language ID allowed?
	 */
	static isLanguageAllowed(langId) {
		console.log(`LanguageID: "${langId}".`);
		return USABLE_LANG_IDS.includes(langId);
	}

	static isFileTypeAllowed(filePath) {
		console.log(`File extname: "${path.extname(filePath)}".`);
		return USABLE_EXT.includes(path.extname(filePath));
	}

	static isAssetProvider() {
		return Config.getCodeProvider() === 'Asset';
	}

	static isServerProvider() {
		return Config.getCodeProvider() === 'Server';
	}

	static isNoneProvider() {
		return Config.getCodeProvider() === 'None';
	}

	static getCodeProvider() {
		return vscode.workspace.getConfiguration('ssjs-vsc').get('codeProvider');
	}

	static isAutoSaveEnabled() {
		return vscode.workspace.getConfiguration('ssjs-vsc').get('autoSave') ?? false;
	}

	getPackageJsonData() {
		const packageJsonFile = path.join(this.sourcePath, './package.json');
		let packageJson = jsonHandler.load(packageJsonFile);

		return {
			"repository": packageJson?.['repository']?.['url'] ? packageJson['repository']['url'] : 'https://github.com/FiB3',
			"version": packageJson?.['version'] ? packageJson['version'] : 'v?.?.?'
		};
	}

	static isConfigFile(fileName) {
		return fileName.endsWith(SETUP_FILE_NAME);		
	}
}