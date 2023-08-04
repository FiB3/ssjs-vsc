// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Mustache = require('mustache');

const { app } = require('./src/proxy');
const jsonHandler = require('./src/auxi/json');
const json = require('./src/auxi/json');
const file = require('./src/auxi/file');
const folder = require('./src/auxi/folder');
const mcClient = require('./src/sfmc/mcClient');

const statusBar = require('./src/statusBar');

const SETUP_TEMPLATE = './templates/setup.example.json';
const DEPLOYMENT_TEMPLATE = './templates/deployment.ssjs';
const SETUP_FOLDER_NAME = '.vscode';
const SETUP_FILE_NAME = 'ssjs-setup.json';

// let myStatusBarItem;
Mustache.escape = function(text) {return text;};

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	console.log('Congratulations, your extension "ssjs-vsc" is now active!');
	// Start server:
	let serverStart = vscode.commands.registerCommand('ssjs-vsc.start', startServer);
	// Stop server:
	let serverStop = vscode.commands.registerCommand('ssjs-vsc.stop', stopServer);
	
	// Create setup file:
	let createSetup = vscode.commands.registerCommand('ssjs-vsc.create-config', async () => {
		await createConfig(context);
	});

	let updateSetup = vscode.commands.registerCommand('ssjs-vsc.update-config', async () => {
		await createConfig(context, true);
	});

	let deployAnyPath = vscode.commands.registerCommand('ssjs-vsc.deploy-any-path', async () => {
		// TODO: deploy a Cloud Page to Any Path
		await deployAnyPathPage(context);
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

	statusBar.create(context);

	context.subscriptions.push(serverStart);
	context.subscriptions.push(serverStop);
	context.subscriptions.push(createSetup);
	context.subscriptions.push(updateSetup);
	context.subscriptions.push(deployAnyPath);
}

const deployAnyPathPage = async function (context) {
	// check setup file (existence, public-domain and it's setup, dev-token):
	let config = [];
	try {
		config = loadConfig();
	} catch (err) {
		vscode.window.showErrorMessage(`Setup file not found or incorrect. Please, check it and create it using "SSJS: Create Config".`);
	}
	if (config['public-domain'] || config['proxy-any-file']?.['main-path']) {
		vscode.window.showWarningMessage(`Some project stup is not filled - check your .vscode/ssjs-setup.json file.`);
	}

	const packageJsonFile = path.join(__dirname, 'package.json');
	let packageJson = json.load(packageJsonFile);
	console.log(packageJson);

	// load script from "templates/deployment.ssjs"
	const templatePath = path.join(__dirname, DEPLOYMENT_TEMPLATE);
	let deploymentTemplate = file.load(templatePath);

	// template page, version, proxy-any-file.main-path, public-domain
	var deployScript = Mustache.render(deploymentTemplate, {
		"page": packageJson['repository']['url'], // TODO: get from package file (VSCode Url)
		"version": packageJson['version'], // TODO: get from package file
		"proxy-any-file_main-path": config['proxy-any-file']['main-path'], // TODO: get from project ssjs-setup.json (is it possible to keep ".")
		"public-domain": config['public-domain']  // TODO: get from project ssjs-setup.json
	});

	// save into active editor (root) and open:
	let deployPath = path.join(getUserWorkspacePath(), 'deployment.ssjs');
	console.log('deployPath:', deployPath);
	file.save(deployPath, deployScript);
	vscode.workspace.openTextDocument(deployPath).then((doc) =>
		vscode.window.showTextDocument(doc, {
		})
	);
}

const createConfig = async function(context, update) {
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
				storeSfmcClientSecret(context, clientId, clientSecret);

				if (update) {
					// update setup file:
					updateConfigFile(subdomain, clientId, mid);
				} else {
					// create setup file:
					createConfigFile(subdomain, clientId, mid, "{{your-publically-accessible-domain}}");
				}
				
				// TODO: Open the setup  file:
				vscode.workspace.openTextDocument(getUserConfigPath()).then((doc) =>
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

const createConfigFile = function (subdomain, clientId, mid, publicDomain) {
	// TODO: create a setup file from a ./files
	// maybe use some confirming dialog??
	// const configPath = getUserWorkspacePath();
	const templatePath = path.join(__dirname, SETUP_TEMPLATE);

	let configTemplate = json.load(templatePath);
	console.log(configTemplate);
	configTemplate["sfmc-domain"] = subdomain;
	configTemplate["sfmc-client-id"] = clientId;
	configTemplate["sfmc-mid"] = mid;
	configTemplate["public-domain"] = publicDomain;
	configTemplate["proxy-any-file"]["dev-token"] = uuidv4();
	
	const setupFolder = path.join(getUserWorkspacePath(), SETUP_FOLDER_NAME);
	folder.create(setupFolder);

	json.save(getUserConfigPath(), configTemplate);
	
	vscode.workspace.openTextDocument(getUserConfigPath());
}

const updateConfigFile = function (subdomain, clientId, mid) {
	// get current setup:
	let configTemplate = json.load(getUserConfigPath()); // TODO: handle non-existing file
	console.log(configTemplate);
	// update values:
	configTemplate["sfmc-domain"] = subdomain;
	configTemplate["sfmc-client-id"] = clientId;
	configTemplate["sfmc-mid"] = mid;
	// save:
	json.save(getUserConfigPath(), configTemplate);
	
	vscode.workspace.openTextDocument(getUserConfigPath());
}

const startServer = function () {
	const config = loadConfig();

	// The code you place here will be executed every time your command is executed
	if (!app.running) {
		app.build(config);
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

async function getSfmcInstanceData(context) {
	const config = loadConfig();

	const subdomain = config['sfmc-domain'];
	const clientId = config['sfmc-client-id'];
	const mid = config['sfmc-mid'];
	let clientSecret = await context.secrets.get(`ssjs-vsc.${clientId}`);
	return {
		subdomain,
		clientId,
		mid,
		clientSecret
	};
}

async function storeSfmcClientSecret(context, clientId, clientSecret) {
	await context.secrets.store(`ssjs-vsc.${clientId}`, clientSecret);
	console.log(`Credentials stored.`);
}

function loadConfig() {
	const configPath = getUserConfigPath();
	const config = jsonHandler.load(configPath);
	// TODO: error if config is not yet deployed!
	config.projectPath = getUserWorkspacePath();
	return config;
}

const getUserConfigPath = function () {
	const pth = path.join(getUserWorkspacePath(), SETUP_FOLDER_NAME, SETUP_FILE_NAME);
	return pth;
}

const getUserWorkspacePath = function () {
	// TODO: improve with e.g.: workspace.workspaceFolders
	return vscode.workspace.rootPath;
}

module.exports = {
	activate,
	deactivate
}