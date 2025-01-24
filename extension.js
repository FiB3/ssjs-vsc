const vscode = require('vscode');

const LanguageFormatter = require("./src/languageFormatters");
const Config = require('./src/config');
const logger = require('./src/auxi/logger');
const telemetry = require('./src/telemetry');
const stats = require('./src/auxi/stats');

const dialogs = require('./src/ui/dialogs');
const { showConfigPanel } = require('./src/ui/configPanel');

let ext = require('./src/extensionHandler');

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	logger.setup(context.extensionMode === vscode.ExtensionMode.Production ? 'INFO' : 'DEBUG');
	logger.info(`ssjs-vsc @ ${Config.getExtensionVersion()} is starting!`);
	ext.attachContext(context);

	telemetry.init(context);
	stats.init(context);

	registerFormatters();

	registerCommands(context, [
		{ name: 'ssjs-vsc.upload-to-prod', callback: async () => await ext.provider.uploadToProduction() },
		{ name: 'ssjs-vsc.upload-script', callback: async () => await ext.uploadScript() },
		{ name: 'ssjs-vsc.get-standalone-script', callback: async () => await ext.provider.getStandaloneScript() },
		{ name: 'ssjs-vsc.change-script-options', callback: async () => await ext.provider.changeScriptMetadata() },
		{ name: 'ssjs-vsc.start', callback: async () => await ext.provider.startServer() },
		{ name: 'ssjs-vsc.stop', callback: async () => await ext.provider.stopServer() },
		{ name: 'ssjs-vsc.create-config', callback: () => createConfig() },
		{ name: 'ssjs-vsc.update-config', callback: () => createConfig(true) },
		{ name: 'ssjs-vsc.deploy-any-path', callback: async () => await ext.provider.deployAnyScript() },
		{ name: 'ssjs-vsc.update-any-path', callback: async () => await ext.provider.updateAnyScript() },
		{ name: 'ssjs-vsc.get-url', callback: async () => await ext.provider.getDevUrl(true) },
		{ name: 'ssjs-vsc.run', callback: async () => await ext.provider.getDevUrl() },
		{ name: 'ssjs-vsc.show-walkthrough', callback: showWalkthrough },
		{ name: 'ssjs-vsc.show-config', callback: async () => await showConfigPanel(context) },
		{ name: 'ssjs-vsc.check-any-path', callback: async () => await checkDeployedDevAssets()	}
	]);

	let workspaceOk = await ext.workspaceOk();
	logger.debug(`Workspace is ok: ${workspaceOk}.`);
	if (!workspaceOk) {
		await launchConfigPanel(context);
		return;
	}
	// IF WORKSPACE EXISTS:
	let configOk = await ext.loadConfiguration(context);
	if (!configOk) {
		await launchConfigPanel(context);
	}
	
	await ext.pickCodeProvider(true, true);
	if (configOk) {
		await ext.checkDevPageVersion();
		telemetry.log(`extensionActivated`, { codeProvider: Config.getCodeProvider(), allSet: true });
	}

	watchForConfigurationChanges();
	registerFileActions(context);
}

async function launchConfigPanel(context) {
	if (Config.showPanelAutomatically()) {
		await showConfigPanel(context);
	}
}

async function checkDeployedDevAssets() { 
	let r = await ext.checkDeployedDevAssets();
	if (r.ok) {
		vscode.window.showInformationMessage(r.message);
	} else {
		vscode.window.showErrorMessage(r.message);
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

function registerCommands(context, commands) {
	commands.forEach(({ name, callback }) => {
		const command = vscode.commands.registerCommand(name, callback);
		context.subscriptions.push(command);
	});
}

async function registerFileActions(context) {
	const onSaveFile = vscode.workspace.onDidSaveTextDocument(async (textDocument) => {
		let filePath = textDocument.uri.fsPath;

		if (!Config.isWorkspaceSet()) {
			vscode.window.showWarningMessage(`It seems you are not using workspaces! To use full potential of this extension, please, open a folder and run command: "SSJS: Show Setup Walkthrough".`);
			ext.deactivateProviders({});
			telemetry.log(`noWorkspace`);
			return;
		}
		
		if (Config.isConfigFile(filePath)) {
			ext.config.loadConfig();
		} else if (Config.isAutoSaveEnabled() && Config.isFileInWorkspace(filePath)) {
			await ext.uploadScript(true);
		} else {
			if (!filePath.endsWith('settings.json')) {
				logger.info(`registerFileActions() called for: ${filePath}, autosave: ${Config.isAutoSaveEnabled()} && within Workspace: ${Config.isFileInWorkspace(filePath)}.`);
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
		if (!creds) {
			logger.warn(`createConfig(): No creds provided.`);
			return;
		}
		
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

// This method is called when your extension is deactivated
function deactivate() {
	logger.debug(`Deactivating extension!`);
	ext.provider.deactivate();
	telemetry.dispose();
}

module.exports = {
	activate,
	deactivate
}