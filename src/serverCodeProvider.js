const vscode = require('vscode');
var path = require('path');

const BaseCodeProvider = require('./baseCodeProvider');
const Config = require('./config');

const { app } = require('./proxy');
const { template } = require('./template');
const file = require('./auxi/file');

const DEPLOYMENT_TEMPLATE = './templates/deployment.ssjs';
const DEPLOYED_NAME = 'deployment.ssjs';

module.exports = class ServerCodeProvider extends BaseCodeProvider {

	constructor(config, statusBar) {
		super(config, statusBar);
	}

	async init() {
		this.statusBar.setEnabled();
	}

	async deployAnyScript() {
		function generateBasicAuthHeader(username, password) {
			const credentials = `${username}:${password}`;
			const encodedCredentials = Buffer.from(credentials, 'utf-8').toString('base64');
			return `Basic ${encodedCredentials}`;
		}
		// check setup file (existence, public-domain and it's setup, dev-token):
		let configData = [];
		try {
			configData = this.config.loadConfig();
		} catch (err) {
			vscode.window.showErrorMessage(`Setup file not found or incorrect. Please, check it and create it using "SSJS: Create Config".`);
			console.error(`ServerProvider.deployAnyScript()`, err);
		}
		if (!configData['public-domain'] || !configData['proxy-any-file']?.['main-path']) {
			vscode.window.showWarningMessage(`Some project setup is not filled - check your .vscode/ssjs-setup.json file.`);
			return;
		}
	
		const packageData = this.config.getPackageJsonData();
	
		// load script from "templates/deployment.ssjs"
		const templatePath = path.join(this.config.sourcePath, DEPLOYMENT_TEMPLATE);
		const deployScript = template.runFile(templatePath, {
			"page": packageData['repository'],
			"version": packageData['version'],
			"proxy-any-file_main-path": configData['proxy-any-file']['main-path'], // TODO: get from project ssjs-setup.json (is it possible to keep ".")
			"public-domain": configData['public-domain'],  // TODO: get from project ssjs-setup.json,
			"basic-encrypted-secret": generateBasicAuthHeader(configData['proxy-any-file']['auth-username'], configData['proxy-any-file']['auth-password'])
		});
	
		// save into active editor (root) and open:
		let deployPath = path.join(Config.getUserWorkspacePath(), DEPLOYED_NAME);
		file.save(deployPath, deployScript);
		vscode.workspace.openTextDocument(deployPath).then((doc) =>
			vscode.window.showTextDocument(doc, {
			})
		);
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