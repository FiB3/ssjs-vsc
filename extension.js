// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Mustache = require('mustache');
const generator = require('generate-password');

const { app } = require('./src/proxy');
const mcClient = require('./src/sfmc/mcClient');
const Config = require('./src/config');

const BaseCodeProvider = require('./src/baseCodeProvider');
const AssetCodeProvider = require('./src/assetCodeProvider');
const ServerCodeProvider = require('./src/serverCodeProvider');

const jsonHandler = require('./src/auxi/json');
const file = require('./src/auxi/file');

const statusBar = require('./src/statusBar');

const DEPLOYMENT_TEMPLATE = './templates/deployment.ssjs';

// let myStatusBarItem;
Mustache.escape = function(text) {return text;};

let provider;
let config;

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	console.log('Congratulations, your extension "ssjs-vsc" is now active!');

	// Watch for changes in settings
	vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('ssjs-vsc.codeProvider')) {
			pickCodeProvider();
		}
	});

	config = new Config(context);

	pickCodeProvider();

	// update script:
	let scriptUpload = vscode.commands.registerCommand('ssjs-vsc.upload-script', async () => {
		// uploadScript();
		await provider.uploadScript();
	});

	// Start server:
	let serverStart = vscode.commands.registerCommand('ssjs-vsc.start', async () => {
		await startServer();
		// await provider.startServer();
	});
	// Stop server:
	let serverStop = vscode.commands.registerCommand('ssjs-vsc.stop', async () => {
		await stopServer();
		// await provider.stopServer();
	});
	
	// Create setup file:
	let createSetup = vscode.commands.registerCommand('ssjs-vsc.create-config', async () => {
		await createConfig();
	});

	let updateSetup = vscode.commands.registerCommand('ssjs-vsc.update-config', async () => {
		await createConfig(true);
	});

	let deployAnyPath = vscode.commands.registerCommand('ssjs-vsc.deploy-any-path', async () => {
		// TODO: deploy a Cloud Page to Any Path
		await deployAnyPathPage();
		// await provider.deployAnyScript();
	});

	vscode.languages.registerDocumentFormattingEditProvider("ssjs", {
		/**
		 * Provide formatting edits for a whole document.
		 *
		 * @param document The document in which the command was invoked.
		 * @param options Options controlling formatting.
		 * @param token A cancellation token.
		 * @return A set of text edits or a thenable that resolves to such. The lack of a result can be
		 * signaled by returning `undefined`, `null`, or an empty array.
		 */
		provideDocumentFormattingEdits(document, formattingOptions) {
			console.log("SSJS Beautifying running.");
		},
	});

	statusBar.create(context, config);

	context.subscriptions.push(scriptUpload);
	context.subscriptions.push(serverStart);
	context.subscriptions.push(serverStop);
	context.subscriptions.push(createSetup);
	context.subscriptions.push(updateSetup);
	context.subscriptions.push(deployAnyPath);
}

const activateAssetProvider = async function() {
	provider = new AssetCodeProvider(config);
	await provider.init();
}

const activateServerProvider = async function() {
	provider = new ServerCodeProvider(config);
	await provider.init();
}

const deactivateProviders = async function() {
	provider = new BaseCodeProvider(config);
	// stop server
	// stopServer();
}

const pickCodeProvider = async function() {
	// Handle the setting change here
	const codeProvider = Config.getCodeProvider();
	await deactivateProviders();

	if (codeProvider === 'Asset') {
		vscode.window.showInformationMessage(`Switched to: Asset Code Provider.`);
		activateAssetProvider();
	} else if (codeProvider === 'Server') {
		vscode.window.showInformationMessage(`Switched to: Server Code Provider.`);
		activateServerProvider();
	} else {
		vscode.window.showWarningMessage(`Code Providers switched off!`);
	}
}

const deployAnyPathPage = async function () {
	function generateBasicAuthHeader(username, password) {
		const credentials = `${username}:${password}`;
		const encodedCredentials = Buffer.from(credentials, 'utf-8').toString('base64');
		return `Basic ${encodedCredentials}`;
	}
	// check setup file (existence, public-domain and it's setup, dev-token):
	let configData = [];
	try {
		configData = config.loadConfig();
	} catch (err) {
		vscode.window.showErrorMessage(`Setup file not found or incorrect. Please, check it and create it using "SSJS: Create Config".`);
	}
	if (configData['public-domain'] || configData['proxy-any-file']?.['main-path']) {
		vscode.window.showWarningMessage(`Some project setup is not filled - check your .vscode/ssjs-setup.json file.`);
	}

	const packageJsonFile = path.join(__dirname, 'package.json');
	let packageJson = jsonHandler.load(packageJsonFile);
	console.log(packageJson);

	// load script from "templates/deployment.ssjs"
	const templatePath = path.join(__dirname, DEPLOYMENT_TEMPLATE);
	let deploymentTemplate = file.load(templatePath);

	// template page, version, proxy-any-file.main-path, public-domain
	var deployScript = Mustache.render(deploymentTemplate, {
		"page": packageJson['repository']['url'], // TODO: get from package file (VSCode Url)
		"version": packageJson['version'], // TODO: get from package file
		"proxy-any-file_main-path": configData['proxy-any-file']['main-path'], // TODO: get from project ssjs-setup.json (is it possible to keep ".")
		"public-domain": configData['public-domain'],  // TODO: get from project ssjs-setup.json,
		"basic-encrypted-secret": generateBasicAuthHeader(configData['proxy-any-file']['auth-username'], configData['proxy-any-file']['auth-password'])
	});

	// save into active editor (root) and open:
	let deployPath = path.join(config.getUserWorkspacePath(), 'deployment.ssjs');
	console.log('deployPath:', deployPath);
	file.save(deployPath, deployScript);
	vscode.workspace.openTextDocument(deployPath).then((doc) =>
		vscode.window.showTextDocument(doc, {
		})
	);
}

const createConfig = async function(update) {
	let title = update ? `Update SFMC Environment` : `Set up SFMC Environment`;
	const subdomain = await vscode.window.showInputBox({
		title: title,
		prompt: `Enter SFMC Subdomain:`,
		ignoreFocusOut: true
	});
	// TODO: ensure that FQDN can be used too

	const clientId = await vscode.window.showInputBox({
		title: title,
		prompt: `Server-to-server Client ID:`,
		ignoreFocusOut: true
	});

	const clientSecret = await vscode.window.showInputBox({
		title: title,
		prompt: `Server-to-server Client Secret:`,
		ignoreFocusOut: true,
		password: true
	});

	const mid = await vscode.window.showInputBox({
		title: title,
		prompt: `Business Unit MID (optional):`,
		ignoreFocusOut: true
	});
	
	// TODO: test login
	let mc = new mcClient(subdomain, clientId, clientSecret, mid);

	await mc._get(`/platform/v1/configcontext`)
			.then((data) => {
				console.log('DATA', data);
				vscode.window.showInformationMessage(`API Credentials validated!`);
				// store credentials:
				config.storeSfmcClientSecret(clientId, clientSecret);

				if (update) {
					// update setup file:
					config.updateConfigFile(subdomain, clientId, mid);
				} else {
					// create setup file:
					// maybe use some confirming dialog??
					config.createConfigFile(subdomain, clientId, mid, "{{your-publically-accessible-domain}}");
				}
				
				// TODO: Open the setup  file:
				vscode.workspace.openTextDocument(config.getUserConfigPath()).then((doc) =>
					vscode.window.showTextDocument(doc, {
					})
				);
				// TODO: Show message that hints the create any-file Cloud Page:
				vscode.window.showInformationMessage(`Setup created: ./vscode/ssjs-setup.json.`);
			})
			.catch((err) => {
				console.log('ERR', err);
				// TODO: show error message:
				vscode.window.showErrorMessage(`API Credentials invalid! Try again, please.`);
			});
}
461061
// const uploadScript = async function () {
// 	// if (Config.isAssetProvider()) {
// 		const activeTextEditor = vscode.window.activeTextEditor;

// 		if (activeTextEditor) {
// 			// Get the URI (Uniform Resource Identifier) of the currently open file
// 			const fileUri = activeTextEditor.document.uri;
// 			// Convert the URI to a file path
// 			const filePath = fileUri.fsPath;

// 			// TODO: try to get folder ID:
// 			// if not existing, run dialog:
// 			if (!config.getAssetFolderId()) {
// 				console.log(`No Folder ID`);
// 				const assetProviderTitle = `Asset Provider Folder`;
// 				const folderName = await vscode.window.showInputBox({
// 					title: assetProviderTitle,
// 					prompt: `Enter Folder Name for Dev Assets:`,
// 					ignoreFocusOut: true
// 				});

// 				const parentFolderName = await vscode.window.showInputBox({
// 					title: assetProviderTitle,
// 					prompt: `Enter Parent Folder Name for Dev Assets:`,
// 					ignoreFocusOut: true
// 				});

// 				let f = await provider.createFolder(folderName, parentFolderName);

// 				if (!f) {
// 					vscode.window.showWarningMessage(`Error when creating Folder for Dev Assets!`);
// 				} else {
// 					vscode.window.showInformationMessage(`Folder for Dev Assets created!`);
// 					console.log(f);
// 					config.setAssetFolderId(f.body.id);
// 				}
// 			} else {
// 				console.log(`Found Folder ID`);
// 			}

// 			if (provider.assetExists(filePath)) {
// 				let r = await provider.updateCode(filePath);
// 				console.log(r);
// 				vscode.window.showInformationMessage(`Asset uploaded.`);
// 			} else {
// 				let r = await provider.createNewBlock(filePath);
// 				console.log(r);
// 				vscode.window.showInformationMessage(`Asset created.`);
// 			}
// 		} else {
// 			vscode.window.showErrorMessage('No file is currently open.');
// 		}
// 	// } else {
// 	// 	vscode.window.showWarningMessage(`Code Providers switched off!`);
// 	// }
// }

const startServer = function () {
	const configData = config.loadConfig();

	// The code you place here will be executed every time your command is executed
	if (!app.running) {
		app.build(configData);
		// Display a message box to the user
		vscode.window.showInformationMessage(`SSJS Server started on: ${app.host}:${app.port}`);
	} else {
		vscode.window.showInformationMessage(`SSJS Server already running: ${app.host}:${app.port}`);
	}
	statusBar.setStart(`${app.host}:${app.port}`);
};

const stopServer = function () {
	console.log(`Attempting to stop the SSJS Server.`);
	if (app.running) {
		app.close();
		vscode.window.showInformationMessage(`SSJS Server stopped.`);
	} else {
		vscode.window.showInformationMessage(`SSJS Server not active.`);
	}
	statusBar.setDeactivated();
};

// This method is called when your extension is deactivated
function deactivate() {
	console.log(`Deactivating extension!`);
	stopServer();
}

module.exports = {
	activate,
	deactivate
}