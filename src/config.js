const vscode = require('vscode');
const path = require('path');

const generator = require('generate-password');

const jsonHandler = require('./auxi/json'); // TODO: change to `json` only
const file = require('./auxi/file');
const folder = require('./auxi/folder');

const SETUP_TEMPLATE = './templates/setup.example.json';
const SETUP_FOLDER_NAME = '.vscode';
const SETUP_FILE_NAME = '.vscode/ssjs-setup.json';
const REPO_DEFAULT = 'https://github.com/FiB3';

const USABLE_LANG_IDS = ['ssjs', 'html', 'ampscript'];
const USABLE_EXT = [ `.ssjs`, `.html`, `.amp` ];

module.exports = class Config {

	constructor(context, sourcePath) {
		this.context = context;

		this.config = {};
		this.sourcePath = sourcePath;
	}

	/**
	 * Get info about Dev Page/Resource.
	 * @param {string} pageContext page/text
	 * @returns {object}
	 */
	getDevPageInfo(pageContext = 'page') {
		let contextKey = pageContext == 'page' ? 'dev-page' : 'dev-resource';

		return {
			devPageUrl: Config.validateConfigValue(this.config?.[contextKey]?.['url']),
			devSnippetId: Config.validateConfigValue(this.config?.[contextKey]?.['snippet-id'])
		};
	}

	getHostPort() {
		return this.config.port || 4000;
	}

	anyPathEnabled() {
		// TODO: check and refactor
		return this.config['proxy-any-file']?.enabled ? this.config['proxy-any-file'].enabled : false;
	}

	getAnyMainPath() {
		return this.config['proxy-any-file']['main-path'];
	}

	getPublicPath() {
		let publicPath = this.config['dev-folder-path'] ? this.config['dev-folder-path'] : './';
		console.log('PARSE CONFIG:',  publicPath.startsWith('\/'), '?', publicPath, ',', Config.getUserWorkspacePath(), ',', publicPath);
		
		publicPath = publicPath.startsWith('\/')
				? publicPath
				: path.join(Config.getUserWorkspacePath(), publicPath);
		
		console.log(`PUBLIC PATH: "${publicPath}".`);
		
		return publicPath;
	}

	getTokens(isDev = true) {
		console.log(this.config);
		let tokensKey = isDev ? 'dev-tokens' : 'prod-tokens';
		return Object.keys(this.config[tokensKey]) ? this.config[tokensKey] : {};
	}

	/**
	 * Get Authentication data for Dev Page/Resource.
	 * @param {string} pageContext page/text
	 * @returns {object} with keys: useAuth, token, username, password
	 */
	getDevPageAuth(pageContext = 'page') {
		let contextKey = pageContext == 'page' ? 'dev-page' : 'dev-resource';
		let res = {
			'useAuth': this.config?.[contextKey]?.['use-auth'] || false,
			'authType': this.config?.[contextKey]?.['auth-type'] || 'none'
		};

		if (res.useAuth) {
			if (this.config?.[contextKey]?.['auth-type'] === 'token') {
				// Could use Config.validateConfigValue()
				res.token = this.config?.[contextKey]?.['dev-token'] || '';
				res.username = '';
				res.password = '';
				return res;
			} else if (this.config?.[contextKey]?.['auth-type'] === 'basic') {
				res.token = '';
				res.username = this.config?.[contextKey]?.['dev-username'] || '';
				res.password = this.config?.[contextKey]?.['dev-password'] || '';
				return res;
			}
		}
		res.token = '';
		res.username = '';
		res.password = '';
		return res;
	}

	getDevPageAuthType(pageContext = 'page') {
		let contextKey = pageContext == 'page' ? 'dev-page' : 'dev-resource';
		return this.config?.[contextKey]?.['auth-type'] || 'none';
	}

	getDevPageToken(pageContext = 'page', authType = 'token') {
		// TODO: update and use authType
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

	getSfmcUserId() {
		return Config.validateConfigValue(this.config['sfmc-user-id']);
	}

	isDevPageSet() {
		return this.config['dev-page']?.['snippet-id'] ? true : false;
	}

	isDevResourceSet() {
		return this.config['dev-resource']?.['snippet-id']  ? true : false;
	}

	async storeSfmcClientSecret(clientId, clientSecret) {
		await this.context.secrets.store(`ssjs-vsc.${clientId}`, clientSecret);
		console.log(`Credentials stored.`);
	}

	createConfigFile(subdomain, clientId, mid, publicDomain) {
		// TODO: rework
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
		
		const setupFolder = path.join(Config.getUserWorkspacePath(), SETUP_FOLDER_NAME);
		folder.create(setupFolder);
	
		jsonHandler.save(Config.getUserConfigPath(), configTemplate);
		
		vscode.workspace.openTextDocument(Config.getUserConfigPath());
	}

	updateConfigFile(subdomain, clientId, mid) {
		// get current setup:
		let configTemplate = jsonHandler.load(Config.getUserConfigPath()); // TODO: handle non-existing file
		console.log(configTemplate);
		// update values:
		configTemplate["sfmc-domain"] = subdomain;
		configTemplate["sfmc-client-id"] = clientId;
		configTemplate["sfmc-mid"] = mid;

		configTemplate["extension-version"] = this.getPackageJsonData().version;
		// save:
		jsonHandler.save(Config.getUserConfigPath(), configTemplate);
		
		vscode.workspace.openTextDocument(Config.getUserConfigPath());
	}

	getAssetFolderId() {
		// TODO: change to correct object
		console.log(`FOLDER ID: ${this.config?.['asset-provider']?.['folder-id']}.`);
		return this.config?.['asset-provider']?.['folder-id'] ? this.config?.['asset-provider']?.['folder-id'] : false;
	}

	/**
	 * Sets params for Dev Page/Resource. 
	 */
	setDevPageInfo(pageContext = 'page', authOption, pageUrl, snippetId) {
		let contextKey = pageContext == 'page' ? 'dev-page' : 'dev-resource';
		
		if (authOption) {
			this.config[contextKey]['use-auth'] = authOption !== 'none' ? true : false;
			this.config[contextKey]['auth-type'] = authOption;
		}
		if (pageUrl) {
			this.config[contextKey]['url'] = pageUrl;
		}
		if (snippetId) {
			this.config[contextKey]['snippet-id'] = snippetId;
		}
		jsonHandler.save(Config.getUserConfigPath(), this.config);
	}

	/**
	 * Sets (or generates) auth secrets for Dev Page/Resource.
	 * @param {text} pageContext 
	 */
	generateDevTokens(pageContext = 'page') {
		// TODO: add optional args for token, username & password
		let contextKey = pageContext == 'page' ? 'dev-page' : 'dev-resource';
		if (!this.config[contextKey]['use-auth']) {
			console.log(`generateDevTokens(): No Auth used.`);
		} else {
			if (this.config[contextKey]['auth-type'] === 'token') {
				this.config[contextKey]["dev-token"] = generator.generate({ length: 36, numbers: true, uppercase: false });
				delete this.config[contextKey]["dev-username"];
				delete this.config[contextKey]["dev-password"];
			} else if (this.config[contextKey]['auth-type'] === 'basic') {
				this.config[contextKey]["dev-username"] = "user";
				this.config[contextKey]["dev-password"] = generator.generate({ length: 16, numbers: true });
				delete this.config[contextKey]["dev-token"];
			} else {
				console.log(`generateDevTokens(): Unknown Auth used.`);
			}
		}
		this.saveConfigFile();
	}

	setAssetFolderId(id, folderName) {
		// TODO: change to first level only
		if (!this.config['asset-provider']) this.config['asset-provider'] = {};
		this.config['asset-provider']['folder-id'] = id;
		this.config['asset-provider']['folder'] = folderName;
		// get current setup:
		jsonHandler.save(Config.getUserConfigPath(), this.config);
		vscode.workspace.openTextDocument(Config.getUserConfigPath());
	}

	setSfmcUserId(userId) {
		this.config['sfmc-user-id'] = userId || 0;
		jsonHandler.save(Config.getUserConfigPath(), this.config);
	}
	
	loadConfig() {
		const configPath = Config.getUserConfigPath();
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

	saveConfigFile(withFileOpen = false) {
		jsonHandler.save(Config.getUserConfigPath(), this.config);
		if (withFileOpen) {
			vscode.workspace.openTextDocument(Config.getUserConfigPath());
		}
	}

	static configFileExists() {
		return file.exists(Config.getUserConfigPath());
	}

	static getUserConfigPath() {
		let pth;
		try {
			pth = path.join(Config.getUserWorkspacePath(), SETUP_FILE_NAME);
		} catch (err) {
			console.log(`PATH NOT SET! Data:`, Config.getUserWorkspacePath(), SETUP_FILE_NAME);
		}
		return pth;
	}

	static getUserWorkspacePath() {
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
		return vscode.workspace.getConfiguration('ssjs-vsc.editor').get('codeProvider');
	}

	static isAutoSaveEnabled() {
		return vscode.workspace.getConfiguration('ssjs-vsc.editor').get('autoSave') ?? false;
	}

	static getTemplatingTags() {
		let stp = vscode.workspace.getConfiguration('ssjs-vsc.editor').get('templatingTags') ?? '{{,}}';
		return stp.split(',');
	}

	static getBeautyfierSetup() {
		const settings = vscode.workspace.getConfiguration("ssjs-vsc.language.ampscript");
		console.log(`Settings`, settings);
		const s = {
			capitalizeSet: settings.get('capitalizeKeywords'),
			capitalizeVar: settings.get('capitalizeKeywords'),
			capitalizeIfFor: settings.get('capitalizeKeywords'),
			capitalizeAndOrNot: settings.get('capitalizeAndOrNot'),
			maxParametersPerLine: settings.get('maxParametersPerLine')
		};
		return s;
	}

	getPackageJsonData() {
		const packageJsonFile = path.join(this.sourcePath, './package.json');
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

	static isConfigFile(fileName) {
		return fileName.endsWith(SETUP_FILE_NAME);		
	}

	/**
	 * Test value from Config if it's set. Include test for `<<*>>` and undefined, null, or 0 value.
	 * @param {*} value Value from Config file.
	 * @returns {*|false} Value or false if not set.
	 */
	static validateConfigValue(value) {
		return value === undefined || value === null
				|| value === 0 || value === ''
				|| (typeof(value) == 'string' && value?.startsWith('<<'))
			? false
			: value;
	}
}