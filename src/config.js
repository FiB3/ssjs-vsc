const generator = require('generate-password');

const Preferences = require('./config/preferences');
const checks = require('./checks');
const logger = require('./auxi/logger');
const Pathy = require('./auxi/pathy');

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

	getPublicPath() {
		let publicPath = this.config['dev-folder-path'] ? this.config['dev-folder-path'] : './';
		logger.log('PARSE CONFIG:',  publicPath.startsWith('\/'), '?', publicPath, ',', Pathy.getWorkspacePath(), ',', publicPath);
		logger.log(`Config: PUBLIC PATH: "${publicPath}".`);
		publicPath = Pathy.joinToRoot(publicPath);
		
		logger.log(`PUBLIC PATH: "${publicPath}".`);
		
		return publicPath;
	}

	/**
	 * Get Mustache template tokens.
	 * @param {boolean} isDev
	 * @returns {object}
	 */
	getTemplatingView(isDev = true) {
		logger.log(this.config);
		let tokensKey = isDev ? 'dev-tokens' : 'prod-tokens';
		return this.config?.[tokensKey] && Object.keys(this.config[tokensKey])
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
	 * Get Server Provider data.
	 * @returns {object} with keys: mainPath, authUser, authPassword
	 */
	getServerProvider() {
		const authUser = Config.validateConfigValue(this.config?.['proxy-any-file']?.['auth-username']);
		const authPassword = Config.validateConfigValue(this.config?.['proxy-any-file']?.['auth-password']);

		return {
			// TODO: makes sense to have this here?
			serverUrl: `https://${authUser}:${authPassword}@127.0.0.1:4000`,
			authUser,
			authPassword
		};
	}

	async getSfmcInstanceData() {
		const subdomain = Config.validateConfigValue(this.config['sfmc-domain']);
		const clientId = Config.validateConfigValue(this.config['sfmc-client-id']);
		const mid = Config.validateConfigValue(this.config['sfmc-mid'], '');

		if (!subdomain || !clientId) {
			logger.log(`No SFMC data found in config - getSfmcInstanceData().`);
			return false;
		}

		let SECRET_NAME = `ssjs-vsc.${clientId}`;
		let clientSecret = await this.context.secrets.get(SECRET_NAME);
		
		SECRET_NAME = SECRET_NAME.substring(0, 13) + '...';
		if (!clientSecret) {
			logger.log(`Loading secret failed for: "${SECRET_NAME}`);
			return false;
		}
		logger.log(`Loaded secret for: "${SECRET_NAME}"`);

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

	getMid() {
		return Config.validateConfigValue(this.config['sfmc-mid']);
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
		let valid = Boolean(subdomain && clientId && clientSecret);
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
		let sfmcValid = Boolean(Config.validateConfigValue(this.config['sfmc-domain'])) && Boolean(Config.validateConfigValue(this.config['sfmc-client-id']));
		const assetFolderValid = Boolean(this.config['asset-folder-id']);

		let devContextsValid = this.isDevPageSet() || this.isDevResourceSet();

		let valid = sfmcValid && assetFolderValid && devContextsValid;
		logger.log(`isSetupValid(): ${valid} =>` , sfmcValid, assetFolderValid, devContextsValid);
		return valid;
	}

	/**
	 * Check if the manual steps are confirmed.
	 * @returns {boolean}
	 */
	isManualConfigValid() {
		let c = this.getManualConfigSteps();
		return c.anyScriptsDeployed;
		// c.devRead is not longer needed for the setup to be valid.
	}

	/**
	 * Store SFMC Client Secret to VSCode key vault.
	 */
	async storeSfmcClientSecret(clientId, clientSecret) {
		await this.context.secrets.store(`ssjs-vsc.${clientId}`, clientSecret);
		logger.log(`Credentials stored.`);
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
		logger.log(`FOLDER ID: ${folderId}.`);
		return folderId;
	}

	getAssetFolder() {
		return {
			id: this.config['asset-folder-id'],
			folderPath: this.config['asset-folder']
		};
	}

	getAssetFolderNames() {
		let folderPath = this.config['asset-folder'];
		let folderNames = folderPath.split('>');
		if (folderNames.length < 2) {
			return {
				parent: false,
				folder: false
			}
		}
		return {
			parent: folderNames[0].trim(),
			folder: folderNames[1].trim()
		}
	}

	/**
	 * Sets params for Dev Page/Resource. 
	 */
	setDevPageInfo(pageContext = 'page', authOption, pageUrl, snippetId) {
		let contextKey = pageContext == 'page' ? 'dev-page' : 'dev-resource';

		if (!this.config[contextKey]) {
			this.config[contextKey] = {};
		}
		
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
			logger.log(`generateDevTokens(): No Auth used.`);
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
				logger.log(`generateDevTokens(): Unknown Auth used.`);
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
	setServerProvider(publicDomain = 'https://127.0.0.1') {
		if (!this.config['proxy-any-file']) {
			this.config['proxy-any-file'] = {
				"port": 4000,
				"auth-username": "user",
				"auth-password": generator.generate({ length: 16, numbers: true })
			};
		}
		this.saveConfigFile();
	}

	setSfmcUserId(userId, mid = false) {
		this.config['sfmc-user-id'] = userId || 0;
		if (mid) {
			this.config['sfmc-mid'] = mid;
		}
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
	 * Set Mustache template tokens - both dev and prod.
	 * @param {object} views
	 */
	setTemplatingView(devViews = {}, prodViews = {}, plainReplace = false) {
		if (plainReplace) {
			this.config['dev-tokens'] = devViews;
			this.config['prod-tokens'] = prodViews;
		} else {
			this.config['dev-tokens'] = {
				...this.config['dev-tokens'],
				...devViews
			};
			this.config['prod-tokens'] = {
				...this.config['prod-tokens'],
				...prodViews
			};
		}
		this.saveConfigFile();
	}

	/**
	 * Get hooks for specific action and extension.
	 * @param {string} [action="on-save"] - e.g.: `on-save`
	 * @param {string} [extension=".js"] - including the `.`, e.g.: `.js`
	 * @returns {object}
	 * @example in `./templates/setup.example.json`
	 */
	getHooks(action = `on-save`, extension = `.js`) {
		let hook = this.config['hooks']?.[action]?.[extension] || { enabled: false };
		if (hook['success-handling'] && !['upload-self', 'upload-output'].includes(hook['success-handling'])) {
			hook['success-handling'] = 'incorrect';	
		}
		return hook;
	}

	/**
	 * Validate if the file is supported for deployment via hooks.
	 * @param {string} filePath
	 * @returns {boolean}
	 */
	hookExists(filePath) {
		// get file extension:
		let ext = Pathy.extname(filePath);
		let h = this.getHooks('on-save', ext);
		return h.enabled;
	}

	/**
	 * Migrate setup file to new version - currently to v0.3.0+.
	 */
	migrateToV0_3_0() {	
		let newConfig = {
			'sfmc-domain': this.config['sfmc-domain'],
			'sfmc-client-id': this.config['sfmc-client-id'],
			'sfmc-mid': this.confgi['sfmc-mid'],
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
		newConfig['asset-folder-id'] = Config.validateConfigValue(
				Config.validateConfigValue(this.config['asset-provider']?.['folder-id'], this.config['asset-folder-id']),
			newConfig['asset-folder-id']);
		newConfig['asset-folder'] = Config.validateConfigValue(
				Config.validateConfigValue(this.config['asset-provider']?.['folder'], this.config['asset-folder']),
			newConfig['asset-folder']);

		// serverProvider:
		newConfig['proxy-any-file'] = {
			'port': Config.validateConfigValue(this.config['port'], 4000),
			'auth-username': Config.validateConfigValue(this.config['proxy-any-file']?.['auth-username'], 'user'),
			'auth-password': Config.validateConfigValue(this.config['proxy-any-file']?.['auth-password'], generator.generate({ length: 16, numbers: true }))
		};

		// save setup file
		this.config = newConfig;
		logger.info(`Migrated Config:`, newConfig);
		this.saveConfigFile();
	}

	migrateToV0_6_0() {
		// move hooks:
		this.config['hooks'] = this.config['hooks'] || { 'on-save': {} };
		this.config['extension-version'] = Config.getExtensionVersion();
		logger.info(`Migrated Config:`, this.config);
		this.saveConfigFile();
	}
}