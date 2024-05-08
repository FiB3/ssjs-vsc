const vscode = require('vscode');

const BaseCodeProvider = require('./baseCodeProvider');

const { app, generateBasicAuthHeader } = require('./proxy');
const dialogs = require('./ui/dialogs');
const vsc = require('./vsc');
const checks = require('./checks');
const telemetry = require('./telemetry');

const DEPLOYMENT_TOKEN_TEMPLATE = './templates/serverProvider/tokenDeployment.ssjs';
const DEPLOYMENT_BASIC_AUTH_TEMPLATE = './templates/serverProvider/formAuthDeployment.ssjs';

module.exports = class ServerCodeProvider extends BaseCodeProvider {

	constructor(config, statusBar, context) {
		super(config, statusBar, context);
		vscode.commands.executeCommand('setContext', 'ssjs-vsc.codeProvider', 'Server');
	}

	async init(testConnection = false) {
		await super.init(true, testConnection);
	}

	async deployAnyScript() {

		// add viewSpecifics to deployments:
		let serverData = this.config.getServerProvider();
		// TODO: check the setup, show setup warning, if something is missing:
		if (!serverData.serverUrl) {
			let d = await dialogs.getTunnelPublicDomain();
			if (d) {
				// set public domain
				this.config.setServerProvider(d);
				// load data again:
				serverData = this.config.getServerProvider();
			}
			if (!d || !serverData.serverUrl) {
				vscode.window.showWarningMessage(`Server Provider setup is missing data. Please check your settings.`);
				return;
			}
		}

		let prepResult = await this.prepareAnyScriptDeployment();
		if (!prepResult) {
			return;
		}

		let deployments = this._getContextInfoForDeployment(prepResult, DEPLOYMENT_TOKEN_TEMPLATE, DEPLOYMENT_BASIC_AUTH_TEMPLATE);
		deployments.forEach((d) => {
			d.viewSpecifics = {
				'server-url': serverData.serverUrl,
				'public-domain': serverData.publicDomain,
				'main-path': serverData.mainPath,
				'basic-encrypted-secret': generateBasicAuthHeader(serverData.authUser, serverData.authPassword)
			}			
		});
		// run deployments:
		await this.runAnyScriptDeployments(deployments);
		telemetry.log('deployAnyScript', { codeProvider: 'Server' });
	}

	async updateAnyScript(silenced = false) {
		let contexts = [];
		this.config.isDevPageSet() ? contexts.push('page') : null;
		this.config.isDevResourceSet() ? contexts.push('text') : null;

		let serverData = this.config.getServerProvider();
		if (!serverData.serverUrl) {
			vscode.window.showWarningMessage(`Server Provider setup is missing data. Please check your settings.`);
			return;
		}

		let deployments = this._getContextInfoForDeployment(contexts, DEPLOYMENT_TOKEN_TEMPLATE, DEPLOYMENT_BASIC_AUTH_TEMPLATE);
		deployments.forEach((d) => {
			d.viewSpecifics = {
				'server-url': serverData.serverUrl,
				'public-domain': serverData.publicDomain,
				'main-path': serverData.mainPath,
				'basic-encrypted-secret': generateBasicAuthHeader(serverData.authUser, serverData.authPassword)
			}			
		});
		await this.runAnyScriptDeployments(deployments, silenced);
	}

	async startServer() {
		if (!app.running) {
			app.build(this.config);
			// Display a message box to the user
			vscode.window.showInformationMessage(`SSJS Server started on: ${app.host}:${app.port}`);
		} else {
			vscode.window.showInformationMessage(`SSJS Server already running: ${app.host}:${app.port}`);
		}
		this.statusBar.setStart(`${app.host}:${app.port}`);
	}

	async stopServer() {
		// vscode.window.showWarningMessage(`Code Providers switched off!`);
		console.log(`Attempting to stop the SSJS Server.`);
		if (app.running) {
			app.close();
			vscode.window.showInformationMessage(`SSJS Server stopped.`);
		} else {
			vscode.window.showInformationMessage(`SSJS Server not active.`);
		}
		this.statusBar.setDeactivated();
	}

	async getDevUrl() {
		const pageDetails = await this._getContextForGetUrl();

		if (pageDetails) {
			const url = this._getDevUrl(pageDetails.devPageContext, pageDetails.filePath);
			this._getOpenUrlCommand(url, 'Server');
		} else {
			vscode.window.showErrorMessage('File not deployed. Run `Upload Script to Dev` command first.');
		}
	}

	/**
	 * Validates if the current file is supported for deployment and returns the Dev Page Contexts.
	 * @returns {Object|false} Object with filePath, asset metadata and devPageContext. False if something is wrong.
	 */
	async _getContextForGetUrl() {
		// TODO: pick asset also based on asset file
		const filePath = vsc.getActiveEditor(true);
		if (filePath && checks.isFileSupported(filePath)) {
			// let metadata = json.load(this.snippets.getMetadataFileName(filePath));

			let devPageContext;
			if (this.config.isDevPageSet() && this.config.isDevResourceSet()) {
				devPageContext = await dialogs.pickDevPageContext();
			} else if (this.config.isDevPageSet()) {
				devPageContext = 'page';
			} else if (this.config.isDevResourceSet()) {
				devPageContext = 'text';
			} else {
				vscode.window.showErrorMessage('No Dev Page or Resource is set.');
				return false;
			}
			return {
				filePath,
				metadata: false,
				devPageContext
			};
		}
		console.log(`Path not supported? ${filePath}?`);
		return false;
	}

	_getDevUrl(devPageContext, filePath) {
		let tokenConfig = this.config.getDevPageAuth(devPageContext);
		let tkn;
		let res = {
			msg: `URL ready.`,
			visible: false
		};

		if (tokenConfig.useAuth && tokenConfig.authType == 'basic') {
			// TODO: this is not perfect, but good enough for now:
			res.msg = `Authentication details - user: ${tokenConfig.username}, password: ${tokenConfig.password}`;
		} else if (tokenConfig.useAuth && tokenConfig.authType == 'token') {
			tkn = tokenConfig.token;
		}

		let url = this.config.getDevPageInfo(devPageContext).devPageUrl || '';
		res.url = tkn ? `${url}?token=${tkn}&path=${filePath}` : `${url}?path=${filePath}`;
		return res;
	}
}