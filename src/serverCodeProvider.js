const vscode = require('vscode');
var path = require('path');

const BaseCodeProvider = require('./baseCodeProvider');
const Config = require('./config');

const { app } = require('./proxy');
const { template } = require('./template');
const file = require('./auxi/file');

const DEPLOYMENT_TEMPLATE = './templates/deployment.ssjs';
const DEPLOYED_NAME = 'deployment.ssjs';
const USABLE_EXT = [ `.ssjs`, `.html`, `.amp` ];

module.exports = class ServerCodeProvider extends BaseCodeProvider {

	constructor(config) {
		super(config);
	}

	async init() {

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
		let deployPath = path.join(this.config.getUserWorkspacePath(), DEPLOYED_NAME);
		file.save(deployPath, deployScript);
		vscode.workspace.openTextDocument(deployPath).then((doc) =>
			vscode.window.showTextDocument(doc, {
			})
		);
	}

	async startServer() {
		// vscode.window.showWarningMessage(`Code Providers switched off!`);
		const configData = this.config.loadConfig();

		// The code you place here will be executed every time your command is executed
		if (!app.running) {
			app.build(configData);
			// Display a message box to the user
			vscode.window.showInformationMessage(`SSJS Server started on: ${app.host}:${app.port}`);
		} else {
			vscode.window.showInformationMessage(`SSJS Server already running: ${app.host}:${app.port}`);
		}
		// statusBar.setStart(`${app.host}:${app.port}`);
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
		// statusBar.setDeactivated();
	}

	async getDevUrl() {
		const activeTextEditor = vscode.window.activeTextEditor;

		if (activeTextEditor) {
			// Get the URI (Uniform Resource Identifier) of the currently open file
			const fileUri = activeTextEditor.document.uri;
			// Convert the URI to a file path
			const filePath = fileUri.fsPath;
			// TODO: file type check:
			if (USABLE_EXT.includes(path.extname(filePath))) {
				let pth = path.relative(this.config.getUserWorkspacePath(), filePath);

				let tkn = this.config.getDevPageToken();
				let u = tkn ? `?token=${tkn}&path=${pth}` : `?path=${pth}`;
				vscode.env.clipboard.writeText(u);
			} else {
				vscode.window.showWarningMessage(`File *${path.extname(filePath)} is not allowed for deployment!`);
			}
		} else {
			vscode.window.showErrorMessage('No file is currently open.');
		}
	}
}