const vscode = require('vscode');

const LanguageFormatter = require("./src/languageFormatters");
const Config = require('./src/config');

const BaseCodeProvider = require('./src/baseCodeProvider');
const AssetCodeProvider = require('./src/assetCodeProvider');
const ServerCodeProvider = require('./src/serverCodeProvider');

const statusBar = require('./src/statusBar');
const McClient = require('./src/sfmc/mcClient');
const dialogs = require('./src/dialogs');

let provider;
let config;

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	console.log(`ssjs-vsc @ ${Config.getExtensionVersion()} is starting!`);
	
	statusBar.create(context, config);

	watchForConfigurationChanges();
	await loadConfiguration(context);

	registerCommands(context, [
		// NOTE: provider methods need to be called as shown to use changes in the provider reference
		{ name: 'ssjs-vsc.upload-to-prod', callback: async () => await provider.uploadToProduction() },
		{ name: 'ssjs-vsc.upload-script', callback: async () => await provider.uploadScript() },
		{ name: 'ssjs-vsc.start', callback: async () => await provider.startServer() },
		{ name: 'ssjs-vsc.stop', callback: async () => await provider.stopServer() },
		{ name: 'ssjs-vsc.create-config', callback: () => createConfig },
		{ name: 'ssjs-vsc.update-config', callback: () => createConfig(true) },
		{ name: 'ssjs-vsc.deploy-any-path', callback: async () => await provider.deployAnyScript() },
		{ name: 'ssjs-vsc.update-any-path', callback: async () => await provider.updateAnyScript() },
		{ name: 'ssjs-vsc.getUrl', callback: async () => await provider.getDevUrl() },
		{ name: 'ssjs-vsc.showWalkthrough', callback: showWalkthrough }
	]);

	registerFileActions(context);
	registerFormatters(context);
}

function watchForConfigurationChanges() {
	vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('ssjs-vsc.editor.codeProvider')) {
					pickCodeProvider();
			}
	});
}

async function loadConfiguration(context) {
	config = new Config(context, __dirname);

	if (!Config.configFileExists()) {
		console.log(`Setup file does not exists.`);
		deactivateProviders({}, statusBar);
		vscode.window.showInformationMessage(`No setup file found. Run 'Create Config' command to create it.`);
	} else {
		config.loadConfig();
		await checkSetup();
		pickCodeProvider(true);
	}
}

function registerCommands(context, commands) {
	commands.forEach(({ name, callback }) => {
		const command = vscode.commands.registerCommand(name, callback);
		context.subscriptions.push(command);
	});
}

function registerFileActions(context) {
	const onSaveFile = vscode.workspace.onDidSaveTextDocument(async (textDocument) => {
		if (Config.isConfigFile(textDocument.uri.fsPath)) {
				config.loadConfig();
		} else if (Config.isAutoSaveEnabled()) {
				await provider.uploadScript(true);
		}
	});
	context.subscriptions.push(onSaveFile);
}

function registerFormatters(context) {
	const formatters = new LanguageFormatter();
	const formatterRegistrations = vscode.languages.registerDocumentFormattingEditProvider(
			formatters.getSelectors(),
			formatters
	);
	vscode.Disposable.from(formatterRegistrations);
}

function showWalkthrough() {
	vscode.commands.executeCommand('workbench.action.openWalkthrough', { category: 'FiB.ssjs-vsc#setup-ssjs-manager' }, false);
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

const createConfig = async function(update = false) {
	const { subdomain, clientId, clientSecret, mid } = await dialogs.api.getCredentials(update);
	
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
					config.createConfigFile(subdomain, clientId, mid);
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

const checkSetup = async function() {
	const minVersion = '0.3.0';
	const currentVersion = config.config['extension-version'] || 'v0.0.0';

	if (Config.parseVersion(currentVersion) >= Config.parseVersion(minVersion)) {
		console.log(`Setup file is up to date. Version: ${currentVersion}.`);
		return;
	}
	console.log(`Migrate setup file from version: ${currentVersion} to ${minVersion}.`);
	// migrate setup:
	config.migrateSetup();
	// show a warning message:
	vscode.window.showWarningMessage(`Please, run 'SSJS: Install Dev Page' command to finish update. This is one time action.`);
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