const vscode = require('vscode');
var path = require('path');

const BaseCodeProvider = require('./baseCodeProvider');
const Config = require('./config');

const { app } = require('./proxy');
const { template } = require('./template');
const file = require('./auxi/file');
const dialogs = require('./dialogs');

const DEPLOYMENT_TOKEN_TEMPLATE = './templates/serverProvider/tokenDeployment.ssjs';
const DEPLOYMENT_BASIC_AUTH_TEMPLATE = './templates/serverProvider/formAuthDeployment.ssjs';

module.exports = class ServerCodeProvider extends BaseCodeProvider {

	constructor(config, statusBar) {
		super(config, statusBar);
	}

	async init(testConnection = false) {
		super.init(true, testConnection);
	}

	async deployAnyScript() {
		function generateBasicAuthHeader(username, password) {
			const credentials = `${username}:${password}`;
			const encodedCredentials = Buffer.from(credentials, 'utf-8').toString('base64');
			return `Basic ${encodedCredentials}`;
		}

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
	}

	// async updateAnyScript(silenced = false) {
	// 	// TODO:
	// }

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
		// TODO:
		const filePath = vsc.getActiveEditor();

		if (filePath) {
			// file type check:
			if (!checks.isFileSupported(filePath, !autoUpload)) {
				return;
			}
			
			let pth = path.relative(Config.getUserWorkspacePath(), filePath);

			let tkn = this.config.getDevPageToken();
			let u = tkn ? `?token=${tkn}&path=${pth}` : `?path=${pth}`;
			vscode.env.clipboard.writeText(u);
		}
	}
}