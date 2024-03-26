const vscode = require('vscode');

const LanguageFormatter = require("./src/languageFormatters");
const Config = require('./src/config');
const telemetry = require('./src/telemetry');

const dialogs = require('./src/ui/dialogs');
const { showConfigPanel, isConfigPanelNeeded } = require('./src/ui/configPanel');

let ext = require('./src/extensionHandler');

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	console.log(`ssjs-vsc @ ${Config.getExtensionVersion()} is starting!`);
	ext.attachContext(context);

	telemetry.init(context);

	await launchConfigPanel(context);
	await loadConfiguration(context);
	watchForConfigurationChanges();

	registerCommands(context, [
		{ name: 'ssjs-vsc.upload-to-prod', callback: async () => await ext.provider.uploadToProduction() },
		{ name: 'ssjs-vsc.upload-script', callback: async () => await ext.provider.uploadScript() },
		{ name: 'ssjs-vsc.start', callback: async () => await ext.provider.startServer() },
		{ name: 'ssjs-vsc.stop', callback: async () => await ext.provider.stopServer() },
		{ name: 'ssjs-vsc.create-config', callback: () => createConfig() },
		{ name: 'ssjs-vsc.update-config', callback: () => createConfig(true) },
		{ name: 'ssjs-vsc.deploy-any-path', callback: async () => await ext.provider.deployAnyScript() },
		{ name: 'ssjs-vsc.update-any-path', callback: async () => await ext.provider.updateAnyScript() },
		{ name: 'ssjs-vsc.getUrl', callback: async () => await ext.provider.getDevUrl() },
		{ name: 'ssjs-vsc.showWalkthrough', callback: showWalkthrough },
		{ name: 'ssjs-vsc.show-config', callback: async () => await showConfigPanel(context) }
	]);

	registerFileActions(context);
	registerFormatters();
}

async function launchConfigPanel(context) {
	const showPanel = await isConfigPanelNeeded();
	if (showPanel) {
		await showConfigPanel(context);
	}
}

function watchForConfigurationChanges() {
	vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('ssjs-vsc.editor.codeProvider')) {
			ext.pickCodeProvider();
			telemetry.log(`changeCodeProvider`, { codeProvider: Config.getCodeProvider() });
		}
	});
}

async function loadConfiguration(context) {
	ext.config = new Config(context);

	if (!Config.configFileExists()) {
		console.log(`Setup file does not exists.`);
		ext.deactivateProviders({});
		vscode.window.showInformationMessage(`No setup file found. Run 'Create Config' command to create it.`);
	} else {
		ext.config.loadConfig();
		await checkSetup();
		await ext.pickCodeProvider(true, true);
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
			ext.deactivateProviders({});
			telemetry.log(`noWorkspace`);
			return;
		}
		
		if (Config.isConfigFile(filePath)) {
			ext.config.loadConfig();
		} else if (Config.isAutoSaveEnabled() && Config.isFileInWorkspace(filePath)) {
			await ext.provider.uploadScript(true);
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

const createConfig = async function(update = false) {
	try {
		const creds = await dialogs.api.getCredentials(update);
		
		let r = await ext.handleNewSfmcCreds(creds, update);
		if (!r.ok) {
			vscode.window.showErrorMessage(r.message);
			return;
		} else {
			vscode.window.showInformationMessage(r.message);
		}
	}	catch (e) {
		telemetry.error('createConfig', { error: e.message });
	}
}

const checkSetup = async function() {
	const minVersion = '0.3.0';
	const currentVersion = ext.config.getSetupFileVersion();

	if (Config.parseVersion(currentVersion) >= Config.parseVersion(minVersion)) {
		console.log(`Setup file is up to date. Version: ${currentVersion}.`);
		return;
	}
	console.log(`Migrate setup file from version: ${currentVersion} to ${minVersion}.`);
	// migrate setup:
	ext.config.migrateSetup();
	// show a warning message:
	vscode.window.showWarningMessage(`Please, run 'SSJS: Install Dev Page' command to finish update. This is one time action.`);
}

const checkDevPageVersion = async function() {
	const minVersion = '0.3.12';
	const currentVersion = ext.config.getSetupFileVersion();

	if (Config.parseVersion(currentVersion) >= Config.parseVersion(minVersion)) {
		console.log(`Dev Page is up to date. Version: ${currentVersion}.`);
		return;
	}
	console.log(`Update Dev Page from version: ${currentVersion} to ${minVersion}.`);
	// update Dev Page:
	ext.provider.updateAnyScript(true);
	ext.config.setSetupFileVersion();
}

// This method is called when your extension is deactivated
function deactivate() {
	console.log(`Deactivating extension!`);
	ext.provider.deactivate();
	telemetry.dispose();
}

module.exports = {
	activate,
	deactivate
}