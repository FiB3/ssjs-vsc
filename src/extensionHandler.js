const vscode = require('vscode');

const Config = require('./config');
const BaseCodeProvider = require('./baseCodeProvider');
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
		this.provider = new AssetCodeProvider(this.config, this.statusBar);
		await this.provider.init(testApiKeys);
	}
	
	async activateServerProvider() {
		this.provider = new ServerCodeProvider(this.config, this.statusBar);
		await this.provider.init();
	}
	
	async deactivateProviders() {
		this.provider = new BaseCodeProvider(this.config, this.statusBar);
		await this.provider.init();
	}
	
	async pickCodeProvider(testApiKeys, silent = false) {
		// Handle the setting change here
		const codeProvider = Config.getCodeProvider();
		await this.deactivateProviders();
	
		if (codeProvider === 'Asset') {
			if (!silent) {
				vscode.window.showInformationMessage(`Switched to: Asset Code Provider.`)
			};
			await this.activateAssetProvider(testApiKeys);
		} else if (codeProvider === 'Server') {
			if (!silent) {
				vscode.window.showInformationMessage(`Switched to: Server Code Provider.`);
			};
			await this.activateServerProvider();
		} else {
			vscode.window.showWarningMessage(`Code Providers switched off!`);
		}
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
					if (update) {
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
}

module.exports = new ExtensionHandler();