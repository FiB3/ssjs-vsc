const vscode = require('vscode');

const LanguageFormatter = require("./src/languageFormatters");
const Config = require('./src/config');
const telemetry = require('./src/telemetry');

const BaseCodeProvider = require('./src/baseCodeProvider');
const AssetCodeProvider = require('./src/assetCodeProvider');
const ServerCodeProvider = require('./src/serverCodeProvider');

const statusBar = require('./src/statusBar');
const McClient = require('./src/sfmc/mcClient');
const dialogs = require('./src/dialogs');
const { showConfigPanel } = require('./src/configPanel/configPanel');

let provider;
let config;

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	console.log(`ssjs-vsc @ ${Config.getExtensionVersion()} is starting!`);

	telemetry.init(context);

	statusBar.create(context, config);

	await launchConfigPanel(context);
	await loadConfiguration(context);
	watchForConfigurationChanges();

	registerCommands(context, [
		// NOTE: provider methods need to be called as shown to use changes in the provider reference
		{ name: 'ssjs-vsc.upload-to-prod', callback: async () => await provider.uploadToProduction() },
		{ name: 'ssjs-vsc.upload-script', callback: async () => await provider.uploadScript() },
		{ name: 'ssjs-vsc.start', callback: async () => await provider.startServer() },
		{ name: 'ssjs-vsc.stop', callback: async () => await provider.stopServer() },
		{ name: 'ssjs-vsc.create-config', callback: () => createConfig() },
		{ name: 'ssjs-vsc.update-config', callback: () => createConfig(true) },
		{ name: 'ssjs-vsc.deploy-any-path', callback: async () => await provider.deployAnyScript() },
		{ name: 'ssjs-vsc.update-any-path', callback: async () => await provider.updateAnyScript() },
		{ name: 'ssjs-vsc.getUrl', callback: async () => await provider.getDevUrl() },
		{ name: 'ssjs-vsc.showWalkthrough', callback: showWalkthrough },
		{ name: 'ssjs-vsc.show-config', callback: () => showConfigPanel(context) }
	]);

	registerFileActions(context);
	registerFormatters();
}

async function launchConfigPanel(context) {
	const showPanelAutomatically = Config.showPanelAutomatically();
	const workspaceSet = Config.isWorkspaceSet();
	const configFileExists = Config.configFileExists();
	const showChangelog = false; // for future use

	console.log(`Launch Config Panel: ${showPanelAutomatically} && Workspace Set: ${workspaceSet} && Config File Does not Exists: ${!configFileExists}.`);
	if (showPanelAutomatically && (!workspaceSet || !configFileExists || showChangelog)) {
		showConfigPanel(context, {
			workspaceSet,
			configFileExists,
			showChangelog
		});
	}
}

function watchForConfigurationChanges() {
	vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('ssjs-vsc.editor.codeProvider')) {
			pickCodeProvider();
			telemetry.log(`changeCodeProvider`, { codeProvider: Config.getCodeProvider() });
		}
	});
}

async function loadConfiguration(context) {
	config = new Config(context);

	if (!Config.configFileExists()) {
		console.log(`Setup file does not exists.`);
		deactivateProviders({}, statusBar);
		vscode.window.showInformationMessage(`No setup file found. Run 'Create Config' command to create it.`);
	} else {
		config.loadConfig();
		await checkSetup();
		await pickCodeProvider(true, true);
		await checkDevPageVersion();
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
		let filePath = textDocument.uri.fsPath;

		if (!Config.getUserWorkspacePath()) {
			vscode.window.showWarningMessage(`It seems you are not using workspaces! To use full potential of this extension, please, open a folder and run command: "SSJS: Show Setup Walkthrough".`);
			deactivateProviders({}, statusBar);
			telemetry.log(`noWorkspace`);
			return;
		}
		
		if (Config.isConfigFile(filePath)) {
			config.loadConfig();
		} else if (Config.isAutoSaveEnabled() && Config.isFileInWorkspace(filePath)) {
			await provider.uploadScript(true);
		} else {
			if (!filePath.endsWith('settings.json')) {
				console.log(`registerFileActions() called for: ${filePath}, autosave: ${Config.isAutoSaveEnabled()} && within Workspace: ${Config.isFileInWorkspace(filePath)}.`);
			}
		}
	});
	context.subscriptions.push(onSaveFile);
}

function registerFormatters() {
	const formatters = new LanguageFormatter();
	const formatterRegistrations = vscode.languages.registerDocumentFormattingEditProvider(
			formatters.getSelectors(),
			formatters
	);
	vscode.Disposable.from(formatterRegistrations);
}

function showWalkthrough() {
	telemetry.log('showWalkthrough');
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

const pickCodeProvider = async function(testApiKeys, silent = false) {
	// Handle the setting change here
	const codeProvider = Config.getCodeProvider();
	await deactivateProviders();

	if (codeProvider === 'Asset') {
		if (!silent) {
			vscode.window.showInformationMessage(`Switched to: Asset Code Provider.`)
		};
		await activateAssetProvider(testApiKeys);
	} else if (codeProvider === 'Server') {
		if (!silent) {
			vscode.window.showInformationMessage(`Switched to: Server Code Provider.`);
		};
		await activateServerProvider();
	} else {
		vscode.window.showWarningMessage(`Code Providers switched off!`);
	}
}

const createConfig = async function(update = false) {
	try {
		const { subdomain, clientId, clientSecret, mid } = await dialogs.api.getCredentials(update);
		
		let mc = new McClient(subdomain, clientId, clientSecret, mid);

		mc.validateApi()
				.then((data) => {
					if (!data.ok) {
						vscode.window.showErrorMessage(data.message);
						return;
					}
					console.log('createConfig() - API Response:', data);

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
					telemetry.error('createConfig', { error: err });
					// Show error message:
					vscode.window.showErrorMessage(`API Credentials invalid! Try again, please.`);
				});
	}	catch (e) {
		telemetry.error('createConfig', { error: e.message });
	}
}

const checkSetup = async function() {
	const minVersion = '0.3.0';
	const currentVersion = config.getSetupFileVersion();

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

const checkDevPageVersion = async function() {
	const minVersion = '0.3.12';
	const currentVersion = config.getSetupFileVersion();

	if (Config.parseVersion(currentVersion) >= Config.parseVersion(minVersion)) {
		console.log(`Dev Page is up to date. Version: ${currentVersion}.`);
		return;
	}
	console.log(`Update Dev Page from version: ${currentVersion} to ${minVersion}.`);
	// update Dev Page:
	provider.updateAnyScript(true);
	config.setSetupFileVersion();
}

// This method is called when your extension is deactivated
function deactivate() {
	console.log(`Deactivating extension!`);
	provider.deactivate();
	telemetry.dispose();
}

module.exports = {
	activate,
	deactivate
}