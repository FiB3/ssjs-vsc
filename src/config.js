const generator = require('generate-password');

const Preferences = require('./config/preferences');
const ContextHolder = require('./config/contextHolder');
const checks = require('./checks');
const logger = require('./auxi/logger');
const Pathy = require('./auxi/pathy');

module.exports = class Config extends Preferences {

	constructor() {
		super();
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
		return Config.validateConfigValue(this.config?.['live-preview']?.['port'], 4000);
	}

	getPublicPath() {
		let publicPathConf = typeof this.config['dev-folder-path'] === 'string' && (this.config['dev-folder-path'].trim().length > 0)
				? this.config['dev-folder-path']
				: './';

		let publicPath = publicPathConf.trim();
		publicPath = !publicPath.startsWith('\/') ? Pathy.joinToRoot(publicPath) : publicPath;
		logger.log('PARSE CONFIG:',  publicPathConf, ' => ', publicPath);
		
		return publicPath;
	}

	/**
	 * Get Mustache template tokens.
	 * @param {string} env - `dev`, `prod` or `live-preview` (dev is default)
	 * @returns {object}
	 */
	getTemplatingView(env = 'dev') {
		let tokensKey = {
			dev: 'dev-tokens',
			prod: 'prod-tokens',
			'live-preview': 'live-preview-tokens'
		}[env];
		tokensKey = tokensKey || 'dev-tokens';

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
	 * @returns {object} with keys: authEnabled, serverUrl, authUser, authPassword
	 */
	getServerInfo() {
		const authEnabled = Config.validateConfigValue(this.config?.['live-preview']?.['auth-enabled']);
		const port = this.getHostPort();
		const authUser = authEnabled ? Config.validateConfigValue(this.config?.['live-preview']?.['auth-username']) : '';
		const authPassword = authEnabled ? Config.validateConfigValue(this.config?.['live-preview']?.['auth-password']) : '';

		return {
			authEnabled,
			serverUrl: `http://127.0.0.1:${port}`,
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
		let clientSecret = await ContextHolder.getContext().secrets.get(SECRET_NAME);
		
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
		await ContextHolder.getContext().secrets.store(`ssjs-vsc.${clientId}`, clientSecret);
		logger.log(`Credentials stored.`);
	}

	createConfigFile(subdomain, clientId, mid) {
		this.deployConfigFile(true);
		this.config['sfmc-domain'] = subdomain;
		this.config['sfmc-client-id'] = clientId;
		this.config['sfmc-mid'] = mid;

		this.config['live-preview']['auth-username'] = 'user';
		this.config['live-preview']['auth-password'] = generator.generate({ length: 16, numbers: true });
		this.config['extension-version'] = Config.getExtensionVersion();
		this.saveConfigFile(true);
	}

	setSfmcCredentials(subdomain, clientId, mid) {
		// update values:
		this.config["sfmc-domain"] = subdomain;
		this.config["sfmc-client-id"] = clientId;
		this.config["sfmc-mid"] = mid;

		this.saveConfigFile();
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
	 * Set Live Preview Server.
	 * @param {number} port
	 * @param {string} username
	 * @param {string} password
	 */
	setLivePreviewServer(port = 4000, username = 'user', password = generator.generate({ length: 16, numbers: true })) {
		if (!this.config['live-preview']) {
			this.config['live-preview'] = {
				"port": port,
				"auth-username": username,
				"auth-password": password
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
	 * @param {object} prodViews
	 * @param {object} devViews
	 * @param {object} livePreviewTokens
	 * @param {boolean} plainReplace - if true, the views will replace the existing ones, otherwise they will be merged
	 */
	setTemplatingView(prodViews = {}, devViews = {}, livePreviewTokens = {}, plainReplace = false) {
		if (plainReplace) {
			this.config['prod-tokens'] = prodViews;
			this.config['dev-tokens'] = devViews;
			this.config['live-preview-tokens'] = livePreviewTokens;
		} else {
			this.config['prod-tokens'] = {
				...this.config['prod-tokens'],
				...prodViews
			};
			this.config['dev-tokens'] = {
				...this.config['dev-tokens'],
				...devViews
			};
			this.config['live-preview-tokens'] = {
				...this.config['live-preview-tokens'],
				...livePreviewTokens
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

	migrateToV0_6_0() {
		// move hooks:
		this.config['hooks'] = this.config['hooks'] || { 'on-save': {} };
		this.config['extension-version'] = Config.getExtensionVersion();
		logger.info(`Migrated Config (0.6.0):`, this.config);
		this.saveConfigFile();
	}

	migrateToV0_7_0() {
		// move live preview server:
		this.config['live-preview-tokens'] = this.config['dev-tokens'] || { 'IS_PROD': 'false' };
		this.config['live-preview'] = {
			"port": this.config['proxy-any-file']?.['port'] || 4000,
			"dev-folder-path": this.config['dev-folder-path'] || './',
			"auth-enabled": false,
			"auth-username": this.config['proxy-any-file']?.['auth-username'] || 'user',
			"auth-password": this.config['proxy-any-file']?.['auth-password'] || generator.generate({ length: 16, numbers: true })
		};
		delete this.config['dev-folder-path'];
		delete this.config['proxy-any-file'];
		this.config['extension-version'] = Config.getExtensionVersion();
		logger.info(`Migrated Config (0.7.0):`, this.config);
		this.saveConfigFile();
	}
}