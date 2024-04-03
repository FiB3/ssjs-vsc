const path = require('path');

const generator = require('generate-password');

const Preferences = require('./config/preferences');
const checks = require('./checks');

module.exports = class Config extends Preferences {

	constructor(context) {
		super();
		this.context = context;
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
			devSnippetId: Config.validateConfigValue(this.config?.[contextKey]?.['snippet-id']),
			devAuth: Config.validateConfigValue(this.config?.[contextKey]?.['auth-type'])
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
		console.log(`Config: PUBLIC PATH: "${publicPath}".`);
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
	getTemplatingView(isDev = true) {
		console.log(this.config);
		let tokensKey = isDev ? 'dev-tokens' : 'prod-tokens';
		return Object.keys(this.config[tokensKey])
				? Object.assign({}, this.config[tokensKey])
				: {};
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
		const subdomain = Config.validateConfigValue(this.config['sfmc-domain']);
		const clientId = Config.validateConfigValue(this.config['sfmc-client-id']);
		const mid = Config.validateConfigValue(this.config['sfmc-mid'], '');

		let SECRET_NAME = `ssjs-vsc.${clientId}`;
		let clientSecret = await this.context.secrets.get(SECRET_NAME);
		
		SECRET_NAME = SECRET_NAME.substring(0, 13) + '...';
		if (!clientSecret) {
			console.log(`Loading secret failed for: "${SECRET_NAME}`);
			return false;
		}
		console.log(`Loaded secret for: "${SECRET_NAME}"`);

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
	 * Get Setup File Version.
	 * @returns {string}
	 */
	getSetupFileVersion() {
		return this.config['extension-version'] || '0.0.0';
	}

	/**
	 * Get Data about Config steps, that have to be done manually.
	 * @returns {object}
	 */
	getManualConfigSteps() {
		return {
			'anyScriptsDeployed': Config.validateConfigValue(this.config?.['config-view']?.['any-script-deployed']),
			'devRead': Config.validateConfigValue(this.config?.['config-view']?.['dev-read']),
		}
	}

	/**
	 * Check if SFMC data is valid.
	 * @returns {Promise<boolean>}
	 * @async
	 */
	async isSfmcValid() {
		const { subdomain, clientId, clientSecret } = await this.getSfmcInstanceData();
		let valid = checks.isUrl(subdomain) && clientId && clientSecret;
		return valid;
	}

	isDevPageSet() {
		const urlValid = checks.isUrl(this.config['dev-page']?.['url']);
		const snippetIdValid = Config.validateConfigValue(this.config['dev-page']?.['snippet-id']) ? true : false;
		return urlValid && snippetIdValid;
	}

	isDevResourceSet() {
		const urlValid = checks.isUrl(this.config['dev-resource']?.['url']);
		const snippetIdValid = Config.validateConfigValue(this.config['dev-resource']?.['snippet-id']) ? true : false;
		return urlValid && snippetIdValid;
	}

	/**
	 * Run a quick check, if the setup seems valid.
	 * @returns {boolean}
	 */
	isSetupValid() {
		let sfmcValid = Config.validateConfigValue(this.config['sfmc-domain']) && Config.validateConfigValue(this.config['sfmc-client-id']);
		let serverProviderValid = true;
		if (Config.isServerProvider()) {
			serverProviderValid = Boolean(this.config['proxy-any-file']?.['public-domain']);
		}
		const assetFolderValid = Boolean(this.config['asset-folder-id']);

		let devContextsValid = this.isDevPageSet() || this.isDevResourceSet();

		let valid = sfmcValid && serverProviderValid && assetFolderValid && devContextsValid;
		console.log(`isSetupValid(): ${valid} =>` , sfmcValid, serverProviderValid, assetFolderValid, devContextsValid);
		return valid;
	}

	/**
	 * Check if the manual steps are confirmed.
	 * @returns {boolean}
	 */
	isManualConfigValid() {
		let c = this.getManualConfigSteps();
		return c.anyScriptsDeployed && c.devRead;
	}

	/**
	 * Store SFMC Client Secret to VSCode key vault.
	 */
	async storeSfmcClientSecret(clientId, clientSecret) {
		await this.context.secrets.store(`ssjs-vsc.${clientId}`, clientSecret);
		console.log(`Credentials stored.`);
	}

	createConfigFile(subdomain, clientId, mid) {
		this.deployConfigFile(true);
		this.config['sfmc-domain'] = subdomain;
		this.config['sfmc-client-id'] = clientId;
		this.config['sfmc-mid'] = mid;

		this.config['proxy-any-file']['auth-username'] = 'user';
		this.config['proxy-any-file']['auth-password'] = generator.generate({ length: 16, numbers: true });
		this.config['extension-version'] = Config.getExtensionVersion();
		this.saveConfigFile(true);
	}

	// TODO: rename
	// This is actually not an update of the whole file, but only of the SFMC data.
	updateConfigFile(subdomain, clientId, mid) {
		// update values:
		this.config["sfmc-domain"] = subdomain;
		this.config["sfmc-client-id"] = clientId;
		this.config["sfmc-mid"] = mid;

		this.saveConfigFile(true);
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

	getAssetFolder() {
		return {
			id: this.config['asset-folder-id'],
			folderPath: this.config['asset-folder']
		};
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
		this.saveConfigFile();
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
		this.saveConfigFile();
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
		this.saveConfigFile();
	}

	/**
	 * Set version within setup file.
	 * @param {string} version
	 */
	setSetupFileVersion(version) {
		this.config['extension-version'] = version || Preferences.getExtensionVersion();
		this.saveConfigFile();
	}

	/**
	 * Set data about config steps, that have to be done manually.
	 * @param {boolean|undefined} anyScriptsDeployed new value, doesn't change if undefined
	 * @param {boolean|undefined} devRead new value, doesn't change if undefined
	 */
	setManualConfigSteps(anyScriptsDeployed, devRead) {
		if (!this.config['config-view']) {
			this.config['config-view'] = {};
		}
		if (anyScriptsDeployed !== undefined) {
			this.config['config-view']['any-script-deployed'] = anyScriptsDeployed;
		}
		if (devRead !== undefined) {
			this.config['config-view']['dev-read'] = devRead;
		}
		
		this.saveConfigFile();
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
			'config-view': {},
			'extension-version': Config.getExtensionVersion()
		};

		// move asset folder IDs:
		newConfig['asset-folder-id'] = Config.validateConfigValue(this.config['asset-provider']?.['folder-id'], newConfig['asset-folder-id']);
		newConfig['asset-folder'] = Config.validateConfigValue(this.config['asset-provider']?.['folder'], newConfig['asset-folder']);

		// serverProvider:
		newConfig['proxy-any-file'] = {
			'public-domain': Config.validateConfigValue(this.config['public-domain'], '<< publicly accessible domain, e.g. NGROK forwarding domain >>'),
			'port': Config.validateConfigValue(this.config['port'], 4000),
			'main-path': Config.validateConfigValue(this.config['proxy-any-file']?.['main-path'], '/all-in-dev'),
			'auth-username': Config.validateConfigValue(this.config['proxy-any-file']?.['auth-username'], 'user'),
			'auth-password': Config.validateConfigValue(this.config['proxy-any-file']?.['auth-password'], generator.generate({ length: 16, numbers: true }))
		};

		// save setup file
		this.config = newConfig;
		console.log(`Migrated Config:`, newConfig);
		this.saveConfigFile();
	}
}