const vscode = require('vscode');

const Config = require('./config');
const NoCodeProvider = require('./noCodeProvider');
const AssetCodeProvider = require('./assetCodeProvider');
const ServerCodeProvider = require('./serverCodeProvider');

const statusBar = require('./ui/statusBar');
const McClient = require('./sfmc/mcClient');
const telemetry = require('./telemetry');

class ExtensionHandler {
	constructor() {
		this.provider;
		this.config;
	}

	attachContext(context) {
		this.context = context;
		this.statusBar = statusBar;
		this.statusBar.create(context, this.config);
	}

	async activateAssetProvider(testApiKeys) {
		console.log(`Activating Asset Provider...`);
		this.provider = new AssetCodeProvider(this.config, this.statusBar, this.context);
		await this.provider.init(testApiKeys);
	}
	
	async activateServerProvider() {
		this.provider = new ServerCodeProvider(this.config, this.statusBar, this.context);
		await this.provider.init();
	}
	
	async deactivateProviders() {
		console.log(`Deactivating Providers...`);
		this.provider = new NoCodeProvider(this.config, this.statusBar);
		console.log(`Provider:`, this.provider);
		await this.provider.init();
	}
	
	async pickCodeProvider(testApiKeys, silent = false) {
		await this.deactivateProviders();
		
		console.log(`pickCodeProvider => workspace: ${Config.isWorkspaceSet()}, config exists: ${Config.configFileExists()}, sfmc valid: ${await this.config?.isSfmcValid()}`);
		if (!Config.isWorkspaceSet() || !Config.configFileExists() || !await this.config?.isSfmcValid()) {
			console.log(`No valid setup found. Code Providers switched off!`);
		} else if (Config.isAssetProvider()) {
			if (!silent) {
				vscode.window.showInformationMessage(`Switched to: Asset Code Provider.`);
			};
			await this.activateAssetProvider(testApiKeys);
		} else if (Config.isServerProvider()) {
			if (!silent) {
				vscode.window.showInformationMessage(`Switched to: Server Code Provider.`);
			};
			await this.activateServerProvider();
		} else {
			if (!silent) {
				vscode.window.showWarningMessage(`Code Providers switched off!`);
			} else {
				console.log(`Code Providers switched off!`);
			}
		}
	}

	async workspaceOk() {
		if (!Config.isWorkspaceSet()) {
			console.log(`Workspace is not set.`);
			vscode.window.showInformationMessage(`No workspace found. Use "Open Folder" to set it.`);
			telemetry.log(`noWorkspace`);
			await this.deactivateProviders();
			return false;
		}
		return true;
	}

	async loadConfiguration(context) {
		this.config = new Config(context);

		if (!Config.configFileExists()) {
			console.log(`Setup file does not exists - creating empty.`);
			this.config.deployConfigFile();
			return false;
		}

		this.config.loadConfig();
		if (!this.config.isSfmcValid()) {
			console.log(`SFMC Setup is invalid.`);
			// might need to add all basic empty props from the setup file template & re-load config
			return false;
		}

		if (!this.config.isSetupValid()) {
			console.log(`Setup file is invalid.`);
			// might need to add all basic empty props from the setup file template & re-load config
			return false;
		}

		if (!this.config.isManualConfigValid()) {
			console.log(`Manual setup is invalid.`);
			return false;
		}
	
		console.log(`Setup file is (at least mostly) valid.`);
		this.checkSetup();
		return true;
	}

	/**
	 * Handle new SFMC credentials - test & save.
	 * @param {Object} creds 
	 * @param {Boolean} [update=false] update existing setup file / create new
	 * @param {String} [caller='command'] command/ui
	 * @return {Object} result: { ok: Boolean, message: String }
	 */
	async handleNewSfmcCreds(creds, update = false, caller = 'command', openConfig = true) {
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
					console.log('createConfig() - API Response:', data);
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
					this.config.setSfmcUserId(data.userId);
					
					// Open the setup  file:
					if (openConfig) {
						vscode.workspace.openTextDocument(Config.getUserConfigPath()).then((doc) =>
							vscode.window.showTextDocument(doc, {
							})
						);
					}
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
		console.log(`createDevAssets: `, contexts);
		return await this.provider.deployAnyScriptUi(contexts);
	}

	async checkSetup() {
		const minVersion = '0.3.0';
		const currentVersion = this.config.getSetupFileVersion();
	
		if (Config.parseVersion(currentVersion) >= Config.parseVersion(minVersion)) {
			console.log(`Setup file is up to date. Version: ${currentVersion}.`);
			return;
		}
		console.log(`Migrate setup file from version: ${currentVersion} to ${minVersion}.`);
		// migrate setup:
		this.config.migrateSetup();
		// show a warning message:
		vscode.window.showWarningMessage(`Please, run 'SSJS: Install Dev Page' command to finish update. This is one time action.`);
	}
	
	async checkDevPageVersion() {
		const minVersion = '0.5.0';
		const currentVersion = this.config.getSetupFileVersion();
	
		if (Config.parseVersion(currentVersion) >= Config.parseVersion(minVersion)) {
			console.log(`Dev Page is up to date. Version: ${currentVersion}.`);
			return;
		}
		console.log(`Update Dev Page from version: ${currentVersion} to ${minVersion}.`);
		// update Dev Page:
		this.provider.updateAnyScript(true);
		this.config.setSetupFileVersion();
	}
	
	isProviderInactive() {
		console.log(`isProviderInactive - provider active: ${!this.provider} || instance of no code provider ${this.provider?.constructor === NoCodeProvider}`);
		return !this.provider || this.provider?.constructor === NoCodeProvider;
	}
}

module.exports = new ExtensionHandler();