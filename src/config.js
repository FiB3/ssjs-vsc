const vscode = require('vscode');
const path = require('path');

const generator = require('generate-password');

const jsonHandler = require('./auxi/json'); // TODO: change to `json` only
const file = require('./auxi/file');
const folder = require('./auxi/folder');
const checks = require('./checks');

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

	/**
	 * Get Server Provider server PORT.
	 */
	getHostPort() {
		return Config.validateConfigValue(this.config?.['proxy-any-file']?.['port'], 4000);
	}

	/**
	 * Returns main path for Server Provider.
	 * @returns {string}
	 */
	getAnyMainPath() {
		return this.config['proxy-any-file']?.['main-path'] || '/all-in-dev';
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

	/**
	 * Get Mustache template tokens.
	 * @param {boolean} isDev
	 * @returns {object}
	 */
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

	/**
	 * Get Basic Auth data for Server Provider.
	 * @returns {object} with keys: anyUser, anyPassword
	 */
	getServerProviderBasicAuth() {
		return {
			anyUser: this.config['proxy-any-file']['auth-username'],
			anyPassword: this.config['proxy-any-file']['auth-password']
		};
	}

	/**
	 * Get Server Provider data.
	 * @returns {object} with keys: serverUrl, publicDomain, mainPath, authUser, authPassword
	 */
	getServerProvider() {
		const publicDomain = Config.validateConfigValue(this.config?.['proxy-any-file']?.['public-domain']);
		const mainPath = Config.validateConfigValue(this.config?.['proxy-any-file']?.['main-path']);
		const authUser = Config.validateConfigValue(this.config?.['proxy-any-file']?.['auth-username']);
		const authPassword = Config.validateConfigValue(this.config?.['proxy-any-file']?.['auth-password']);
		const serverUrl = checks.isUrl(publicDomain) && mainPath ? Config.createUrl(publicDomain, mainPath) : false;

		return {
			serverUrl: serverUrl,
			publicDomain,
			mainPath,
			authUser,
			authPassword
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

	/**
	 * Run a quick check, if the setup seems valid.
	 * @returns {boolean}
	 */
	isSetupValid() {
		let sfmcValid = this.config['sfmc-domain'] && this.config['sfmc-client-id'] ? true : false;
		let serverProviderValid = true;
		if (Config.isServerProvider()) {
			serverProviderValid = Boolean(this.config['proxy-any-file']?.['public-domain']);
		}
		const assetFolderValid = Boolean(this.config['asset-folder-id']);

		let devContextsValid = this.isDevPageSet()
				? Boolean(this.config['dev-page']?.['url'] && this.config['dev-page']?.['snippet-id'])
				: true;

		if (this.isDevResourceSet()) {
			devContextsValid = devContextsValid && Boolean(this.config['dev-resource']?.['url'] && this.config['dev-resource']?.['snippet-id']);
		}
		let valid = sfmcValid && serverProviderValid && assetFolderValid && devContextsValid;
		console.log(`isSetupValid(): ${valid} =>` , sfmcValid, serverProviderValid, assetFolderValid, devContextsValid);
		return valid;	
	}

	isDevPageSet() {
		return this.config['dev-page']?.['snippet-id'] ? true : false;
	}

	isDevResourceSet() {
		return this.config['dev-resource']?.['snippet-id']  ? true : false;
	}

	/**
	 * Store SFMC Client Secret to VSCode key vault.
	 */
	async storeSfmcClientSecret(clientId, clientSecret) {
		await this.context.secrets.store(`ssjs-vsc.${clientId}`, clientSecret);
		console.log(`Credentials stored.`);
	}

	createConfigFile(subdomain, clientId, mid) {
		// TODO: rework
		const templatePath = path.join(this.sourcePath, SETUP_TEMPLATE);
	
		let configTemplate = jsonHandler.load(templatePath);
		console.log(configTemplate);
		configTemplate["sfmc-domain"] = subdomain;
		configTemplate["sfmc-client-id"] = clientId;
		configTemplate["sfmc-mid"] = mid;

		// security:
		console.log(`createConfigFile():`, configTemplate);
		configTemplate["proxy-any-file"]["auth-username"] = "user";
		configTemplate["proxy-any-file"]["auth-password"] = generator.generate({ length: 16, numbers: true });

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

		// configTemplate["extension-version"] = this.getPackageJsonData().version;
		// save:
		jsonHandler.save(Config.getUserConfigPath(), configTemplate);
		
		vscode.workspace.openTextDocument(Config.getUserConfigPath());
	}

	/**
	 * Get Asset Folder ID.
	 * @returns {number|false}
	 */
	getAssetFolderId() {
		const folderId = Config.validateConfigValue(this.config?.['asset-folder-id'], false);
		console.log(`FOLDER ID: ${folderId}.`);
		return folderId;
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

	/**
	 * Set Asset Folder ID.
	 * @param {number} id
	 * @param {string} folderName - path to folder
	 */
	setAssetFolderId(id = 0, folderName = '<< asset-folder >>') {
		this.config['asset-folder-id'] = id;
		this.config['asset-folder'] = folderName;
		this.saveConfigFile(); // no open file
	}

	/**
	 * Set Server Provider.
	 * @param {string} publicDomain
	 * @param {string} mainPath
	 */
	setServerProvider(publicDomain = 'https://127.0.0.1', mainPath = '/all-in-dev') {
		if (!this.config['proxy-any-file']) {
			this.config['proxy-any-file'] = {
				"public-domain": publicDomain,
				"port": 4000,
				"main-path": mainPath,
				"auth-username": "user",
				"auth-password": generator.generate({ length: 16, numbers: true })
			};
		}
		this.saveConfigFile();
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

	/**
	 * Migrate setup file to new version - currently to v0.3.0+.
	 */
	migrateSetup() {	
		let newConfig = {
			'sfmc-domain': this.config['sfmc-domain'],
			'sfmc-client-id': this.config['sfmc-client-id'],
			'sfmc-mid': this.config['sfmc-mid'],
			'sfmc-user-id': this.config['sfmc-user-id'] || 0,
			'dev-folder-path': this.config['dev-folder-path'],
			'dev-tokens': this.config['dev-tokens'] || {},
			'prod-tokens': this.config['prod-tokens'] || {},
			'asset-folder-id': 0,
			'asset-folder': '<< asset-folder >>',
			'dev-page': {},
			'dev-resource': {},
			'proxy-any-file': {},
			'extension-version': this.getPackageJsonData().version || '0.0.0'
		};

		// move asset folder IDs:
		newConfig['asset-folder-id'] = Config.validateConfigValue(this.config['asset-provider']?.['folder-id'], newConfig['asset-folder-id']);
		newConfig['asset-folder'] = Config.validateConfigValue(this.config['asset-provider']?.['folder'], newConfig['asset-folder']);

		// serverProvider:
		newConfig['proxy-any-file'] = {
			'public-domain': Config.validateConfigValue(this.config['public-domain'], '<< publicly accessible domain, e.g. NGROK forwarding domain >>'),
			'port': Config.validateConfigValue(this.config['port'], 4000),
			'main-path': Config.validateConfigValue(this.config['proxy-any-file']['main-path'], '/all-in-dev'),
			'auth-username': Config.validateConfigValue(this.config['proxy-any-file']['auth-username'], 'user'),
			'auth-password': Config.validateConfigValue(this.config['proxy-any-file']['auth-password'], generator.generate({ length: 16, numbers: true }))
		};

		// save setup file
		this.config = newConfig;
		console.log(`Migrated Config:`, newConfig);
		this.saveConfigFile();
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

	// Move to `vsc` module
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

	// TODO: make static
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

	static getExtensionVersion() {
		const packageJsonFile = path.join(__dirname, '../package.json');
		let packageJson = jsonHandler.load(packageJsonFile);

		return packageJson?.['version'] ? `v${packageJson['version']}` : 'v?.?.?';
	}

	static isConfigFile(fileName) {
		return fileName.endsWith(SETUP_FILE_NAME);		
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