const vscode = require('vscode');
const axios = require('axios');
let md5 = require('md5');

const Config = require('./config');
const ContextHolder = require('./config/contextHolder');
const Pathy = require('./auxi/pathy');
const NoCodeProvider = require('./noCodeProvider');
const AssetCodeProvider = require('./assetCodeProvider');
const vsc = require('./vsc');
const Hooks = require('./hooks');

const statusBar = require('./ui/statusBar');
const serverStatusBar = require('./ui/serverStatusBar');
const McClient = require('./sfmc/mcClient');
const logger = require('./auxi/logger');
const telemetry = require('./telemetry');

class ExtensionHandler {
	constructor() {
		this.provider;
		this.config; // set in loadConfiguration()
		this.hooks;
	}

	init() {
		this.statusBar = statusBar;
		this.statusBar.create(this.config);
		serverStatusBar.create(this.config);
	}

	async activateAssetProvider(testApiKeys) {
		logger.log(`Activating Asset Provider...`);
		this.provider = new AssetCodeProvider(this.config, this.statusBar);
		await this.provider.init(testApiKeys);
	}
	
	async deactivateProviders() {
		logger.log(`Deactivating Providers...`);
		this.provider = new NoCodeProvider(this.config, this.statusBar);
		logger.log(`Provider:`, this.provider);
		await this.provider.init();
	}
	
	async pickCodeProvider(testApiKeys, silent = false) {
		await this.deactivateProviders();
		
		logger.log(`pickCodeProvider => workspace: ${Config.isWorkspaceSet()}, config exists: ${Config.configFileExists()}, sfmc valid: ${await this.config?.isSfmcValid()}`);
		if (!Config.isWorkspaceSet() || !Config.configFileExists() || !await this.config?.isSfmcValid()) {
			logger.log(`No valid setup found. Code Providers switched off!`);
		} else if (Config.isAssetProvider()) {
			if (!silent) {
				vscode.window.showInformationMessage(`Switched to: Asset Code Provider.`);
			};
			await this.activateAssetProvider(testApiKeys);
		} else {
			if (!silent) {
				vscode.window.showWarningMessage(`Code Providers switched off!`);
			} else {
				logger.log(`Code Providers switched off!`);
			}
		}
	}

	async workspaceOk() {
		if (!Config.isWorkspaceSet()) {
			logger.log(`Workspace is not set.`);
			vscode.window.showInformationMessage(`No workspace found. Use "Open Folder" to set it.`);
			telemetry.log(`noWorkspace`);
			await this.deactivateProviders();
			return false;
		}
		return true;
	}

	async loadConfiguration() {
		this.config = new Config();

		if (!Config.configFileExists()) {
			logger.log(`Setup file does not exists - creating empty.`);
			this.config.deployConfigFile();
			return false;
		}

		this.config.loadConfig();
		if (!this.config.isSfmcValid()) {
			logger.log(`SFMC Setup is invalid.`);
			// might need to add all basic empty props from the setup file template & re-load config
			return false;
		}

		if (!this.config.isSetupValid()) {
			logger.log(`Setup file is invalid.`);
			// might need to add all basic empty props from the setup file template & re-load config
			return false;
		}

		if (!this.config.isManualConfigValid()) {
			logger.log(`Manual setup is invalid.`);
			return false;
		}
	
		logger.log(`Setup file is (at least mostly) valid.`);
		this.checkSetup();
		this.hooks = new Hooks(this.config);
		return true;
	}

	async uploadScript(autoUpload = false) {
		const filePath = vsc.getActiveEditor();
		if (!filePath) {
			logger.warn(`Upload Script: ${filePath} - not found!`);
			return;
		}
		this.validateHookReadiness();

		let hookResult;
		try {
			hookResult = await this.hooks.runSave(filePath, autoUpload);
		} catch (err) {
			telemetry.error('upload-script', { 'location': 'extensionHandler.uploadScript - hooks.runSave()', 'error': err });
		}
		logger.info(`Hook result: ${hookResult} - ${this.hooks.getHookResult(hookResult)}.`);

		if (hookResult === -1 || hookResult === 0) {
			return;
		} else if (hookResult === 1 || hookResult === 2) {
			await this.provider.uploadScript(autoUpload);
		} else if (typeof hookResult === 'string') {
			logger.debug(`Hook result for other file upload: $${hookResult}.`);
			// upload the output file - autoUpload to false (to force creation)
			await this.provider.uploadScript(false, hookResult);
		} else {
			logger.warn(`Hook result unknown: ${hookResult}.`);
			telemetry.error('upload-script', { 'location': 'extensionHandler.uploadScript', 'hookResult': hookResult });
		}
	}

	/**
	 * Handle new SFMC credentials - test & save.
	 * @param {Object} creds 
	 * @param {Boolean} [update=false] update existing setup file / create new
	 * @param {Boolean} [openConfig=true] open the setup file after saving
	 * @return {Object} result: { ok: Boolean, message: String }
	 */
	async handleNewSfmcCreds(creds, update = false, openConfig = true) {
		const { subdomain, clientId, clientSecret, mid } = creds;
		let mc = new McClient(subdomain, clientId, clientSecret, mid);
		let res = {
			ok: false,
			message: `Unknown Error! Try again, please.`
		};

		await mc.validateApi()
				.then((data) => {
					if (!data.ok) {
						res.message = data.message
						return;
					}
					logger.log('createConfig() - API Response:', data);
					// store credentials:
					this.config.storeSfmcClientSecret(clientId, clientSecret);
					// TODO: automate the "update" parameter (based on config file existance)
					if (update || Config.configFileExists()) {
						// update setup file:
						this.config.updateConfigFile(subdomain, clientId, mid);
						this.config.loadConfig();
					} else {
						// create setup file:
						this.config.createConfigFile(subdomain, clientId, mid);
					}
					// add userId from request data:
					this.config.setSfmcUserId(data.userId, data.mid);
					
					// Open the setup  file:
					vsc.openTextDocument(Config.getUserConfigPath(), openConfig);
					
					this.pickCodeProvider();
					res.ok = true;
					res.message = `API Credentials valid. Setup at: ./vscode/ssjs-setup.json.`;
				})
				.catch((err) => {
					telemetry.error('sfmcCredsError', { error: err });
					res.ok = false;
					res.message = `API Credentials invalid! Try again, please.`;
				});
		return res;
	}

	async createContentBuilderFolder(parentFolderName, folderName) {
		if (!folderName) {
			return { ok: false, message: `Folder name is required.` };
		}
		if (this.isProviderInactive()) {
			return { ok: false, message: `Missing Configuration for Folder creation.` };
		}
		return await this.provider.snippets.createAssetFolderUi(parentFolderName, folderName);
	}

	setDevPageData(devPageContexts) {
		for (let page of devPageContexts) {
			this.config.setDevPageInfo(page.devPageContext, page.authOption, page.url);
			this.config.generateDevTokens(page.devPageContext);
		}
	}

	async createDevAssets(devPageContexts) {
		if (this.isProviderInactive()) {
			return { ok: false, message: `Extension is missing configuration.` };
		}
		let contexts = devPageContexts.map((page) => page.devPageContext);
		logger.log(`createDevAssets: `, contexts);
		return await this.provider.deployAnyScriptUi(contexts);
	}

	async checkSfmcCredentials() {
		if (this.isProviderInactive()) {
			return { ok: false, message: `Extension is missing configuration.` };
		}
		return await this.provider.validateApiKeys();
	}

	/**
	 * Get the MC Client instance.
	 */
	getMcClient() {
		if (this.isProviderInactive() || !this.provider?.mc) {
			return { ok: false, message: `Extension is missing configuration.` };
		}
		return this.provider.mc;
	}

	async checkDeployedDevAssets() {
		if (this.isProviderInactive()) {
			return { ok: false, message: `Extension is missing configuration.` };
		}

		let devPageInfo = this.config.getDevPageInfo('page');
		let devResourceInfo = this.config.getDevPageInfo('resource');

		if (!devPageInfo?.devPageUrl && !devResourceInfo?.devPageUrl) {
			return { ok: false, message: `No Dev Cloud Page or Text Resource URL found in config.` };
		}

		return await Promise.all([
			axios.get(devPageInfo.devPageUrl),
			axios.get(devResourceInfo.devPageUrl)
		])
				.then((responses) => {
					let pageOk = responses[0]?.status === 200
							&& !!responses[0]?.headers?.['ssjs-http-status']
							&& md5(this.config.getMid() + '') === responses[0]?.headers?.['ssjs-origin'];
					let resourceOk = responses[1]?.status === 200
							&& !!responses[1]?.headers?.['ssjs-http-status']
							&& md5(this.config.getMid() + '') === responses[1]?.headers?.['ssjs-origin'];

					// let dm = `Dev Page OK: ${pageOk}, Dev Resource OK: ${resourceOk}.`
					// dm += `(${responses[0]?.status} && ${responses[0]?.headers?.['ssjs-http-status']} && ${responses[0]?.headers?.['ssjs-origin']} === page:${md5(this.config.getMid() + '')} (${this.config.getMid()})),`;
					// dm += `(${responses[1]?.status} && ${responses[1]?.headers?.['ssjs-http-status']} && ${responses[1]?.headers?.['ssjs-origin']} === resource:${md5(this.config.getMid() + '')} (${this.config.getMid()}))`;
					// logger.log(dm);

					if (pageOk && resourceOk) {
						telemetry.log(`devAssetsChecked`, { pageOk, resourceOk });
						return { ok: true, message: `Dev Assets are deployed correctly.` };
					} else {
						telemetry.log(`devAssetsChecked`, { pageOk, resourceOk });
						return { ok: false, message: `Dev Page or Resource are not deployed correctly. Check if both have correct code saved and published.` };
					}
				})
				.catch((errors) => {
					if (errors.status) {
						let failedUrl = errors.config.url;

						let failedType = failedUrl === devPageInfo.devPageUrl ? 'page' : 'any';
						failedType = failedUrl === devResourceInfo.devPageUrl ? 'resource' : failedType;
						let msg = failedType == 'page' ? `Dev Page` : `Dev Page or Resource`;
						msg = failedType == 'resource' ? `Dev Resource` : msg;
						
						telemetry.log(`devAssetsChecked`, { "failed": failedType, "status": errors.status });
						msg = errors.status === 404 ? msg + ` not found.` : msg + ` has an error, try to deploy it  and check the provided URLs.`;
						msg += ` Details: ${errors.status} - ${failedUrl}`;
						return { ok: false, message: msg };
					}
				});
	}

	/**
	 * Update Config file to the latest version, if needed.
	 */
	async checkSetup() {
		const currentVersion = this.config.getSetupFileVersion();

		let migrations = [{
			minVersion: '0.6.0',
			action: () => {
				this.config.migrateToV0_6_0();
			}
		}, {
			minVersion: '0.7.0',
			action: () => {
				this.config.migrateToV0_7_0();
			}
		}];

		for (let migration of migrations) {
			if (Config.parseVersion(currentVersion) < Config.parseVersion(migration.minVersion)) {
				migration.action();
				// logger.info(`Config Migration to version: ${migration.minVersion} done.`);
			} else {
				logger.info(`Config Migration to version: ${migration.minVersion} not needed.`);
			}
		}
	}
	
	/**
	 * Check if the Dev Page is up to date, if not - update it.
	 */
	async checkDevPageVersion() {
		const minVersion = '0.6.8';
		const currentVersion = this.config.getSetupFileVersion();
	
		if (Config.parseVersion(currentVersion) >= Config.parseVersion(minVersion)) {
			logger.log(`Dev Page is up to date. Version: ${currentVersion}.`);
			return;
		}
		logger.log(`Update Dev Page from version: ${currentVersion} to ${minVersion}.`);
		vscode.window.showInformationMessage(`Updating Dev Pages to the newest version: ${minVersion}.`);
		// update Dev Page:
		this.provider.updateAnyScript(true);
		this.config.setSetupFileVersion();
	}
	
	isProviderInactive() {
		logger.log(`isProviderInactive - provider active: ${!this.provider} || instance of no code provider ${this.provider?.constructor === NoCodeProvider}`);
		return !this.provider || this.provider?.constructor === NoCodeProvider;
	}

	validateHookReadiness() {
		if (!this.hooks?.runSave) {
			logger.warn(`Hooks not ready! Reloading...`);
			this.hooks = new Hooks(this.config);
		}
	}
}

module.exports = new ExtensionHandler();