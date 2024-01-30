const vscode = require('vscode');

const LanguageFormatter = require("./src/languageFormatters");
const Config = require('./src/config');

const BaseCodeProvider = require('./src/baseCodeProvider');
const AssetCodeProvider = require('./src/assetCodeProvider');
const ServerCodeProvider = require('./src/serverCodeProvider');

const statusBar = require('./src/statusBar');
const McClient = require('./src/sfmc/mcClient');

let provider;
let config;

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	console.log('"ssjs-vsc" is starting!');
	
	statusBar.create(context, config);

	// Watch for changes in settings
	vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('ssjs-vsc.editor.codeProvider')) {
			pickCodeProvider();
		}
	});

	config = new Config(context, __dirname);

	if (!Config.configFileExists()) {
		console.log(`Setup file does not exists.`);
		deactivateProviders({}, statusBar);
		vscode.window.showInformationMessage(`No setup file found. Run 'Create Config' command to create it.`);
	} else {
		config.loadConfig();
		pickCodeProvider(true);
	}

	// update PROD script:
	let scriptProdUpload = vscode.commands.registerCommand('ssjs-vsc.upload-to-prod', async () => {
		await provider.uploadToProduction();
	});

	// update dev script:
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
	
	let getScriptUrl = vscode.commands.registerCommand('ssjs-vsc.getUrl', async () => {
		await provider.getDevUrl();
	});

	let showGuide = vscode.commands.registerCommand('ssjs-vsc.showWalkthrough', ()=>{
		// vscode.commands.executeCommand('workbench.action.openWalkthrough', 'FiB.ssjs-vsc#xxx', false);
		vscode.commands.executeCommand('workbench.action.openWalkthrough', { category: 'FiB.ssjs-vsc#setup-ssjs-manager' }, false);
	});

	let onSaveFile = vscode.workspace.onDidSaveTextDocument(async (textDocument) => {
		if (Config.isConfigFile(textDocument.uri.fsPath)) {
			config.loadConfig();
		} else if (Config.isAutoSaveEnabled()) {
			await provider.uploadScript(true);
		}
	});

	const formatters = new LanguageFormatter();
	const formatterRegistrations = vscode.languages.registerDocumentFormattingEditProvider(
		formatters.getSelectors(),
    formatters
	);
	vscode.Disposable.from(formatterRegistrations);

	context.subscriptions.push(scriptProdUpload);
	context.subscriptions.push(scriptUpload);
	context.subscriptions.push(onSaveFile);

	context.subscriptions.push(serverStart);
	context.subscriptions.push(serverStop);
	context.subscriptions.push(createSetup);
	context.subscriptions.push(updateSetup);
	context.subscriptions.push(deployAnyPath);
	context.subscriptions.push(getScriptUrl);
	context.subscriptions.push(showGuide);
}

const activateAssetProvider = async function(testApiKeys) {
	provider = new AssetCodeProvider(config, statusBar);
	await provider.init(testApiKeys);
}

const activateServerProvider = async function() {
	provider = new ServerCodeProvider(config, statusBar);
	await provider.init();
}

const deactivateProviders = async function() {
	provider = new BaseCodeProvider(config, statusBar);
	await provider.init();
}

const pickCodeProvider = async function(testApiKeys) {
	// Handle the setting change here
	const codeProvider = Config.getCodeProvider();
	await deactivateProviders();

	if (codeProvider === 'Asset') {
		vscode.window.showInformationMessage(`Switched to: Asset Code Provider.`);
		activateAssetProvider(testApiKeys);
	} else if (codeProvider === 'Server') {
		vscode.window.showInformationMessage(`Switched to: Server Code Provider.`);
		activateServerProvider();
	} else {
		vscode.window.showWarningMessage(`Code Providers switched off!`);
	}
}

const createConfig = async function(update) {
	let title = update ? `Update SFMC Environment` : `Set up SFMC Environment`;
	let subdomain = await vscode.window.showInputBox({
		title: title,
		prompt: `Enter SFMC Auth domain:`,
		ignoreFocusOut: true
	});
	// ensure that FQDN can be used too
	subdomain = McClient.extractSubdomain(subdomain);
	if (!subdomain) {
		vscode.window.showErrorMessage(`Use valid subdomain or Auth domain.`);
		return;
	}
	console.log(`Subdomain: ${subdomain}.`);

	const clientId = await vscode.window.showInputBox({
		title: title,
		prompt: `Server-to-server Client ID:`,
		ignoreFocusOut: true
	});
	if (!clientId) { return; }

	const clientSecret = await vscode.window.showInputBox({
		title: title,
		prompt: `Server-to-server Client Secret:`,
		ignoreFocusOut: true,
		password: true
	});
	if (!clientSecret) { return; }

	const mid = await vscode.window.showInputBox({
		title: title,
		prompt: `Business Unit MID:`,
		ignoreFocusOut: true
	});
	
	let mc = new McClient(subdomain, clientId, clientSecret, mid);

	await mc._get(`/platform/v1/configcontext`)
			.then((data) => {
				console.log('DATA', data);
				vscode.window.showInformationMessage(`API Credentials validated!`);
				// store credentials:
				config.storeSfmcClientSecret(clientId, clientSecret);

				if (update) {
					// update setup file:
					config.updateConfigFile(subdomain, clientId, mid);
					config.loadConfig();
				} else {
					// create setup file:
					// maybe use some confirming dialog??
					config.createConfigFile(subdomain, clientId, mid, "{{your-publicly-accessible-domain}}");
				}
				// add userId from request data:
				config.setSfmcUserId(data.body?.user?.id);
				
				// Open the setup  file:
				vscode.workspace.openTextDocument(Config.getUserConfigPath()).then((doc) =>
					vscode.window.showTextDocument(doc, {
					})
				);
				// Show message that hints the create any-file Cloud Page:
				vscode.window.showInformationMessage(`Setup created: ./vscode/ssjs-setup.json.`);

				pickCodeProvider();
			})
			.catch((err) => {
				console.log('ERR', err);
				// Show error message:
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