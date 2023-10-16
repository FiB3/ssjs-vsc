// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const Mustache = require('mustache');

// const { app } = require('./src/proxy');
const mcClient = require('./src/sfmc/mcClient');
const Config = require('./src/config');

const BaseCodeProvider = require('./src/baseCodeProvider');
const AssetCodeProvider = require('./src/assetCodeProvider');
const ServerCodeProvider = require('./src/serverCodeProvider');

const statusBar = require('./src/statusBar');

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
	
	statusBar.create(context, config);

	// Watch for changes in settings
	vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('ssjs-vsc.codeProvider')) {
			pickCodeProvider();
		}
	});

	config = new Config(context, __dirname);

	pickCodeProvider();

	// update script:
	let scriptUpload = vscode.commands.registerCommand('ssjs-vsc.upload-script', async () => {
		await provider.uploadScript();
	});

	// Start server:
	let serverStart = vscode.commands.registerCommand('ssjs-vsc.start', async () => {
		await provider.startServer();
	});
	// Stop server:
	let serverStop = vscode.commands.registerCommand('ssjs-vsc.stop', async () => {
		await provider.stopServer();
	});
	
	// Create setup file:
	let createSetup = vscode.commands.registerCommand('ssjs-vsc.create-config', async () => {
		await createConfig();
	});

	let updateSetup = vscode.commands.registerCommand('ssjs-vsc.update-config', async () => {
		await createConfig(true);
	});

	let deployAnyPath = vscode.commands.registerCommand('ssjs-vsc.deploy-any-path', async () => {
		await provider.deployAnyScript();
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

	context.subscriptions.push(scriptUpload);
	context.subscriptions.push(serverStart);
	context.subscriptions.push(serverStop);
	context.subscriptions.push(createSetup);
	context.subscriptions.push(updateSetup);
	context.subscriptions.push(deployAnyPath);
}

const activateAssetProvider = async function() {
	provider = new AssetCodeProvider(config, statusBar);
	await provider.init();
}

const activateServerProvider = async function() {
	provider = new ServerCodeProvider(config, statusBar);
	await provider.init();
}

const deactivateProviders = async function() {
	provider = new BaseCodeProvider(config, statusBar);
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

// This method is called when your extension is deactivated
function deactivate() {
	console.log(`Deactivating extension!`);
	provider.deactivate();
}

module.exports = {
	activate,
	deactivate
}